'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileSpreadsheet, AlertCircle, CheckCircle, FileText, Shield, Sparkles, Trash2, Eye, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { tripleCache, type DataCacheEntry } from '@/lib/cache-manager';
import type { ParsedData } from '@/lib/data-processor';

export interface FileValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  warnings: string[];
  suggestedFix?: string;
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  location?: string;
  suggestion?: string;
}

export interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'checking' | 'parsing' | 'analyzing' | 'completed' | 'error' | 'cached';
  progress: number;
  validationResult?: FileValidationResult;
  errorMessage?: string;
  parsedData?: ParsedData;
  cacheHit?: boolean;
}

interface FileUploaderProps {
  onFileUpload: (files: UploadFile[]) => void;
  onParseProgress?: (fileId: string, progress: number) => void;
  /** 缓存命中时的回调，用于在父组件中显示通知 */
  onCacheHit?: (fileName: string) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  className?: string;
  enableAIHealing?: boolean;
  enablePreCheck?: boolean;
}

const getErrorMessages = (t: (key: string, params?: Record<string, string | number>) => string): Record<string, { title: string; description: string }> => ({
  'invalid_extension': {
    title: t('upload.unsupportedType'),
    description: t('upload.unsupportedTypeDesc')
  },
  'file_too_large': {
    title: t('upload.fileTooLarge'),
    description: t('upload.fileTooLargeDesc')
  },
  'empty_file': {
    title: t('upload.fileEmpty'),
    description: t('upload.fileEmptyDesc')
  },
  'corrupted_file': {
    title: t('upload.fileCorrupted'),
    description: t('upload.fileCorruptedDesc')
  },
  'no_header': {
    title: t('upload.missingHeaders'),
    description: t('upload.missingHeadersDesc')
  },
  'invalid_encoding': {
    title: t('upload.encodingError'),
    description: t('upload.encodingErrorDesc')
  },
  'mixed_data_types': {
    title: t('upload.inconsistentFormat'),
    description: t('upload.inconsistentFormatDesc')
  },
  'too_many_blank_rows': {
    title: t('upload.tooManyEmptyRows'),
    description: t('upload.tooManyEmptyRowsDesc')
  },
  'merged_cells': {
    title: t('upload.mergedCells'),
    description: t('upload.mergedCellsDesc')
  },
  'unreadable_content': {
    title: t('upload.contentReadFailed'),
    description: t('upload.contentReadFailedDesc')
  }
});

export function FileUploader({
  onFileUpload,
  onParseProgress,
  onCacheHit,
  accept = '.xlsx,.xls,.csv,.txt',
  multiple = true,
  maxSize = 50,
  className,
  enableAIHealing = true,
  enablePreCheck = true
}: FileUploaderProps) {
  const { t } = useI18n();
  const ERROR_MESSAGES = getErrorMessages(t);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const filesRef = useRef<UploadFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [showPreCheckDialog, setShowPreCheckDialog] = useState(false);
  const [selectedFileForCheck, setSelectedFileForCheck] = useState<UploadFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const pendingParseRef = useRef<Map<string, (data: ParsedData) => void>>(new Map());
  // 追踪已上报的文件ID，防止重复调用 onFileUpload
  const reportedFileIdsRef = useRef<Set<string>>(new Set());
  // 使用ref保存最新的回调，避免useEffect依赖导致重复创建Worker
  const onFileUploadRef = useRef(onFileUpload);
  const onParseProgressRef = useRef(onParseProgress);
  const onCacheHitRef = useRef(onCacheHit);

  useEffect(() => {
    onFileUploadRef.current = onFileUpload;
  }, [onFileUpload]);

  useEffect(() => {
    onCacheHitRef.current = onCacheHit;
  }, [onCacheHit]);

  useEffect(() => {
    onParseProgressRef.current = onParseProgress;
  }, [onParseProgress]);

  const acceptedExtensions = ['xlsx', 'xls', 'csv', 'txt'];

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('@/lib/file-parser.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e) => {
      const { type, id, progress, result, error } = e.data;

      if (type === 'progress') {
        onParseProgressRef.current?.(id, progress);
      } else if (type === 'success') {
        console.log('[Uploader] Worker success for id:', id);
        const parsedData = result as ParsedData;
        // 直接从pendingParseRef获取文件名，不依赖filesRef（可能未同步）
        const pendingFile = files.find(f => f.id === id);
        parsedData.fileName = pendingFile?.file.name || 'unknown';
        parsedData.rowCount = parsedData.rows?.length ?? 0;
        parsedData.columnCount = parsedData.headers?.length ?? 0;

        // D-03 修复：缓存数据时同时存储文件指纹，便于下次上传同文件时在解析前命中缓存
        const fileFingerprint = pendingFile
          ? tripleCache.computeFileFingerprint(pendingFile.file.name, pendingFile.file.size, pendingFile.file.lastModified)
          : undefined;
        tripleCache.cacheData(parsedData, fileFingerprint);

        const completedFile: UploadFile = {
          ...(pendingFile || { id, file: new File([], 'unknown'), status: 'pending' as const, progress: 0 }),
          status: 'completed' as const,
          progress: 100,
          parsedData,
        };

        setFiles(prev => prev.map(f =>
          f.id === id ? completedFile : f
        ));

        // 仅对本次新完成的文件调用 onFileUpload，避免重复上报
        if (!reportedFileIdsRef.current.has(id)) {
          reportedFileIdsRef.current.add(id);
          console.log('[Uploader] Reporting completed file:', id, 'pendingFile:', !!pendingFile, 'parsedData:', !!parsedData);
          onFileUploadRef.current([completedFile]);
        } else {
          console.log('[Uploader] File already reported, skip:', id);
        }

        const resolver = pendingParseRef.current.get(id);
        if (resolver) {
          resolver(parsedData);
          pendingParseRef.current.delete(id);
        }
      } else if (type === 'error') {
        setFiles(prev => prev.map(f =>
          f.id === id ? { ...f, status: 'error', errorMessage: error } : f
        ));

        const resolver = pendingParseRef.current.get(id);
        if (resolver) {
          pendingParseRef.current.delete(id);
        }
      } else if (type === 'cancelled') {
        setFiles(prev => prev.map(f =>
          f.id === id ? { ...f, status: 'pending', progress: 0 } : f
        ));
        pendingParseRef.current.delete(id);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []); // 空依赖：Worker只创建一次，通过ref访问最新回调

  const generateId = () => `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const checkCache = (file: File): ParsedData | null => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'csv' && extension !== 'xlsx' && extension !== 'xls') {
      return null;
    }

    try {
      // D-03 修复：使用文件元信息指纹查找缓存，而非对空数据哈希
      // 之前使用 hashData({ headers: [], rows: [] }) 生成的哈希永远无法匹配真实缓存
      const fingerprint = tripleCache.computeFileFingerprint(
        file.name,
        file.size,
        file.lastModified
      );
      return tripleCache.findDataByFileFingerprint(fingerprint);
    } catch {
      return null;
    }
  };

  const preCheckFile = async (uploadFile: UploadFile): Promise<FileValidationResult> => {
    const issues: ValidationIssue[] = [];
    const warnings: string[] = [];

    try {
      const extension = uploadFile.file.name.split('.').pop()?.toLowerCase();
      if (!acceptedExtensions.includes(extension || '')) {
        issues.push({
          type: 'error',
          code: 'invalid_extension',
          message: ERROR_MESSAGES['invalid_extension'].title,
          suggestion: ERROR_MESSAGES['invalid_extension'].description
        });
      }

      if (uploadFile.file.size > maxSize * 1024 * 1024) {
        issues.push({
          type: 'error',
          code: 'file_too_large',
          message: ERROR_MESSAGES['file_too_large'].title,
          suggestion: t('upload.fileSizeExceeded', { size: (uploadFile.file.size / 1024 / 1024).toFixed(1), max: maxSize }),
        });
      }

      if (uploadFile.file.size === 0) {
        issues.push({
          type: 'error',
          code: 'empty_file',
          message: ERROR_MESSAGES['empty_file'].title,
          suggestion: t('upload.fileContentEmpty')
        });
      }

      const textExtensions = ['csv', 'txt'];
      if (textExtensions.includes(extension || '')) {
        try {
          const text = await uploadFile.file.text();
          if (!text.trim()) {
            issues.push({
              type: 'error',
              code: 'empty_file',
              message: ERROR_MESSAGES['empty_file'].title,
              suggestion: t('upload.fileContentEmpty')
            });
          } else {
            const hasSpecialChars = /[^\x00-\x7F]/.test(text);
            if (hasSpecialChars) {
              warnings.push(t('upload.specialChars'));
            }
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 2) {
              issues.push({
                type: 'warning',
                code: 'too_few_rows',
                message: t('upload.fewRows'),
                suggestion: t('upload.fewRowsDesc', { count: lines.length }),
              });
            }
          }
        } catch {
          issues.push({
            type: 'error',
            code: 'corrupted_file',
            message: ERROR_MESSAGES['corrupted_file'].title,
            suggestion: t('upload.cannotReadContent')
          });
        }
      }

      if (['xlsx', 'xls'].includes(extension || '')) {
        warnings.push(t('upload.excelMarked'));
      }

      return {
        isValid: issues.filter(i => i.type === 'error').length === 0,
        issues,
        warnings,
        suggestedFix: issues.length > 0 ? t('upload.aiFixSuggestion') : undefined
      };
    } catch {
      return {
        isValid: false,
        issues: [{
          type: 'error',
          code: 'corrupted_file',
          message: ERROR_MESSAGES['corrupted_file'].title,
          suggestion: t('upload.preCheckError')
        }],
        warnings: []
      };
    }
  };

  const updateFileStatus = (id: string, updates: Partial<UploadFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handlePreCheck = async (uploadFile: UploadFile) => {
    updateFileStatus(uploadFile.id, { status: 'checking', progress: 0 });

    for (let i = 0; i <= 100; i += 20) {
      await new Promise(resolve => setTimeout(resolve, 50));
      updateFileStatus(uploadFile.id, { progress: i });
    }

    const result = await preCheckFile(uploadFile);
    updateFileStatus(uploadFile.id, {
      status: 'checking',
      progress: 100,
      validationResult: result
    });

    return result;
  };

  const parseFileAsync = (file: File, fileId: string): Promise<ParsedData> => {
    return new Promise((resolve) => {
      pendingParseRef.current.set(fileId, resolve);
      workerRef.current?.postMessage({
        type: 'parse',
        id: fileId,
        file,
        options: { enableProgress: true }
      });
    });
  };

  const cancelParse = (fileId: string) => {
    workerRef.current?.postMessage({ type: 'cancel', id: fileId });
  };

  const processFiles = async (newFiles: File[]) => {
    console.log('[Uploader] processFiles called, count:', newFiles.length, newFiles.map(f => f.name));
    const uploadFiles: UploadFile[] = newFiles.map(file => ({
      file,
      id: generateId(),
      status: 'pending' as const,
      progress: 0
    }));
    console.log('[Uploader] Created upload entries:', uploadFiles.map(f => f.id));

    setFiles(prev => multiple ? [...prev, ...uploadFiles] : [...uploadFiles]);

    for (const uploadFile of uploadFiles) {
      if (enablePreCheck) {
        const result = await handlePreCheck(uploadFile);
        if (!result.isValid) {
          updateFileStatus(uploadFile.id, { status: 'error', errorMessage: t('upload.preCheckFailed') });
          continue;
        }
      }

      const cachedData = checkCache(uploadFile.file);
      if (cachedData) {
        console.log('[Uploader] Cache hit for file:', uploadFile.file.name, 'id:', uploadFile.id);
        cachedData.fileName = uploadFile.file.name;

        setFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, status: 'cached' as const, progress: 100, parsedData: cachedData, cacheHit: true } : f
        ));

        // D-05 修复：缓存命中时通知父组件，以便显示 toast
        onCacheHitRef.current?.(uploadFile.file.name);

        // 缓存命中也需上报，使用ref避免依赖
        if (!reportedFileIdsRef.current.has(uploadFile.id)) {
          reportedFileIdsRef.current.add(uploadFile.id);
          console.log('[Uploader] Reporting cached file:', uploadFile.id);
          onFileUploadRef.current([{ ...uploadFile, status: 'cached' as const, progress: 100, parsedData: cachedData, cacheHit: true }]);
        }
        continue;
      }

      console.log('[Uploader] Starting to parse file:', uploadFile.file.name, 'id:', uploadFile.id);
      updateFileStatus(uploadFile.id, { status: 'parsing', progress: 0 });
      await parseFileAsync(uploadFile.file, uploadFile.id);
    }
    // 不需要额外在for结束后调用onFileUpload，Worker回调中已经处理了
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    processFiles(selectedFiles);
  };

  const removeFile = (id: string) => {
    const file = filesRef.current.find(f => f.id === id);
    if (file && file.status === 'parsing') {
      cancelParse(id);
    }
    reportedFileIdsRef.current.delete(id);
    setFiles(prev => prev.filter(f => f.id !== id));
    // removeFile 不需要调用 onFileUpload，父组件只关心新增的完成文件
  };

  const openPreCheckDetails = (file: UploadFile) => {
    setSelectedFileForCheck(file);
    setShowPreCheckDialog(true);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'txt') return <FileText className="w-5 h-5 text-primary" />;
    return <FileSpreadsheet className="w-5 h-5 text-success" />;
  };

  const getStatusBadge = (status: UploadFile['status']) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      pending: { label: t('upload.statusPending'), color: 'bg-muted text-foreground' },
      checking: { label: t('upload.statusChecking'), color: 'bg-chart-4/10 text-chart-4' },
      parsing: { label: t('upload.statusParsing'), color: 'bg-primary/10 text-primary' },
      analyzing: { label: t('upload.statusAnalyzing'), color: 'bg-primary/10 text-primary' },
      completed: { label: t('upload.statusCompleted'), color: 'bg-success/10 text-success' },
      cached: { label: t('upload.cached'), color: 'bg-success/10 text-success' },
      error: { label: t('upload.statusError'), color: 'bg-destructive/10 text-destructive' }
    };
    const { label, color } = statusMap[status] || statusMap.pending;
    return <Badge className={cn('text-xs', color)}>{label}</Badge>;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getProgressText = (file: UploadFile) => {
    switch (file.status) {
      case 'checking':
        return t('upload.preChecking');
      case 'parsing':
        return t('upload.parsingFile');
      case 'analyzing':
        return t('upload.analyzingFile');
      case 'cached':
        return t('upload.cacheHit');
      default:
        return `${file.progress}%`;
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'relative border border-dashed rounded-md p-6 text-center transition-all duration-200',
          dragActive
            ? 'border-primary bg-primary/5 shadow-float'
            : 'border-border hover:border-primary hover:bg-primary/5'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="flex flex-col items-center gap-2">
          <div className={cn(
            'p-3 rounded-sm transition-all duration-200',
            dragActive ? 'bg-primary/10 scale-105' : 'bg-muted/50'
          )}>
            <Upload className={cn(
              'w-5 h-5 transition-colors',
              dragActive ? 'text-primary' : 'text-muted-foreground'
            )} />
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {dragActive ? t('upload.releaseToUpload') : t('upload.dragOrClick')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('upload.supportFormat', { max: maxSize })}
            </p>
          </div>

          {enableAIHealing && (
            <div className="flex items-center gap-1 text-xs text-primary bg-primary/5 px-2 py-1 rounded-sm">
              <Sparkles className="w-3 h-3" />
              <span>{t('upload.aiSmartFix')}</span>
            </div>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-3">
          {files.map((uploadFile) => (
            <div
              key={uploadFile.id}
              className="bg-white border border-border rounded-md p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-muted/30 rounded-md">
                    {getFileIcon(uploadFile.file.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {uploadFile.file.name}
                      </p>
                      {getStatusBadge(uploadFile.status)}
                      {uploadFile.cacheHit && (
                        <Badge className="text-xs bg-success/10 text-success border-success/20">
                          t('upload.fastLoad')
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(uploadFile.file.size)}
                      </span>
                      {uploadFile.validationResult && (
                        <span className={cn(
                          'text-xs',
                          uploadFile.validationResult.isValid ? 'text-success' : 'text-destructive'
                        )}>
                          {uploadFile.validationResult.issues.filter(i => i.type === 'error').length > 0
                            ? t('upload.issuesToProcess', { count: uploadFile.validationResult.issues.filter(i => i.type === 'error').length })
                            : t('upload.preCheckPassed')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {uploadFile.status === 'completed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openPreCheckDetails(uploadFile)}
                      className="text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      查看详情
                    </Button>
                  )}

                  {uploadFile.status === 'parsing' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(uploadFile.id)}
                      className="text-xs text-warning"
                    >
                      取消
                    </Button>
                  )}

                  <button
                    onClick={() => removeFile(uploadFile.id)}
                    className="p-1.5 hover:bg-muted rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {(uploadFile.status === 'checking' || uploadFile.status === 'parsing' || uploadFile.status === 'analyzing') && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {getProgressText(uploadFile)}
                    </span>
                    <span>{uploadFile.progress}%</span>
                  </div>
                  <Progress value={uploadFile.progress} className="h-1.5" />
                </div>
              )}

              {uploadFile.status === 'cached' && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-success mb-1">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {t('upload.loadedFromCache')}
                    </span>
                  </div>
                  <Progress value={100} className="h-1.5 bg-success/10" />
                </div>
              )}

              {uploadFile.validationResult && uploadFile.validationResult.issues.length > 0 && (
                <div className="mt-3 space-y-1">
                  {uploadFile.validationResult.issues.slice(0, 2).map((issue, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'flex items-start gap-2 text-xs p-2 rounded',
                        issue.type === 'error' ? 'bg-destructive/5 text-destructive' :
                          issue.type === 'warning' ? 'bg-warning/10 text-warning' :
                            'bg-primary/10 text-primary'
                      )}
                    >
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{issue.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {uploadFile.status === 'error' && uploadFile.errorMessage && (
                <div className="mt-3 p-2 bg-destructive/5 text-destructive text-xs rounded flex items-center gap-2">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  <span>{uploadFile.errorMessage}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={showPreCheckDialog} onOpenChange={setShowPreCheckDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              t('upload.preCheckReport')
            </DialogTitle>
            <DialogDescription>
              {selectedFileForCheck?.file.name}
            </DialogDescription>
          </DialogHeader>

          {selectedFileForCheck?.validationResult && (
            <div className="space-y-4">
              <div className={cn(
                'p-4 rounded-md flex items-center gap-3',
                selectedFileForCheck.validationResult.isValid
                  ? 'bg-success/5 border border-success/20'
                  : 'bg-destructive/5 border border-destructive/20'
              )}>
                {selectedFileForCheck.validationResult.isValid ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-success" />
                    <div>
                      <p className="font-medium text-success">{t('upload.preCheckPassed')}</p>
                      <p className="text-sm text-success">t('upload.fileCanImport')</p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-6 h-6 text-destructive" />
                    <div>
                      <p className="font-medium text-destructive">{t('upload.issuesFoundShort')}</p>
                      <p className="text-sm text-destructive">t('upload.needFixBeforeAnalysis')</p>
                    </div>
                  </>
                )}
              </div>

              {selectedFileForCheck.validationResult.issues.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">{t('upload.issueDetails')}</h4>
                  {selectedFileForCheck.validationResult.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'p-3 rounded-md border',
                        issue.type === 'error' ? 'bg-destructive/5 border-destructive/10' :
                          issue.type === 'warning' ? 'bg-warning/5 border-warning/10' :
                            'bg-primary/5 border-primary/10'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-xs font-medium',
                          issue.type === 'error' ? 'bg-destructive/10 text-destructive' :
                            issue.type === 'warning' ? 'bg-warning/10 text-warning' :
                              'bg-primary/10 text-primary'
                        )}>
                          {issue.type === 'error' ? t('common.error') : issue.type === 'warning' ? t('common.warning') : t('common.info')}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{issue.message}</p>
                          {issue.suggestion && (
                            <p className="text-xs text-foreground mt-1">{issue.suggestion}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {enableAIHealing && selectedFileForCheck.validationResult.suggestedFix && (
                <div className="p-4 rounded-md bg-primary/5 border border-primary/10">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-chart-4 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-chart-4">{t('upload.aiSmartFix')}</p>
                      <p className="text-xs text-chart-4 mt-1">
                        {selectedFileForCheck.validationResult.suggestedFix}
                      </p>
                      <Button size="sm" variant="outline" className="mt-2" disabled>
                        <Sparkles className="w-3 h-3 mr-1" />
                        t('upload.oneClickFix')
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreCheckDialog(false)}>
              关闭
            </Button>
            {selectedFileForCheck?.validationResult?.isValid && (
              <Button>
                继续上传
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
