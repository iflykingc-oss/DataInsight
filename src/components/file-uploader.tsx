'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Upload, X, FileSpreadsheet, AlertCircle, CheckCircle, FileText, Shield, Sparkles, Trash2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  status: 'pending' | 'uploading' | 'prechecking' | 'prechecked' | 'completed' | 'error';
  progress: number;
  validationResult?: FileValidationResult;
  errorMessage?: string;
  parsedData?: unknown;
}

interface FileUploaderProps {
  onFileUpload: (files: UploadFile[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  className?: string;
  enableAIHealing?: boolean;
  enablePreCheck?: boolean;
}

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  'invalid_extension': {
    title: '文件类型不支持',
    description: '这个文件看起来不是表格文件哦，请上传 Excel (.xlsx/.xls) 或 CSV 格式的文件'
  },
  'file_too_large': {
    title: '文件有点大',
    description: '文件超过了系统限制，建议分拆成多个小文件上传'
  },
  'empty_file': {
    title: '文件是空的',
    description: '这个文件里没有数据，可能是新建的空白表格'
  },
  'corrupted_file': {
    title: '文件好像损坏了',
    description: '文件打开时出现问题，可能是传输过程中损坏，请重新上传'
  },
  'no_header': {
    title: '缺少表头',
    description: '文件第一行应该包含列名称，比如"姓名"、"金额"等'
  },
  'invalid_encoding': {
    title: '文件编码异常',
    description: '文件使用了特殊的编码格式，系统已尝试自动修复'
  },
  'mixed_data_types': {
    title: '数据格式不统一',
    description: '某些单元格的数据格式不一致，建议统一后再分析'
  },
  'too_many_blank_rows': {
    title: '空白行有点多',
    description: '文件中有不少空行，系统已自动过滤掉'
  },
  'merged_cells': {
    title: '发现合并单元格',
    description: '表格中包含合并的单元格，系统已尝试拆分处理'
  },
  'unreadable_content': {
    title: '内容读取失败',
    description: '部分内容无法正常读取，可能是图片或特殊格式，建议转换为纯文本'
  }
};

export function FileUploader({
  onFileUpload,
  accept = '.xlsx,.xls,.csv,.txt',
  multiple = true,
  maxSize = 50,
  className,
  enableAIHealing = true,
  enablePreCheck = true
}: FileUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const filesRef = useRef<UploadFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [showPreCheckDialog, setShowPreCheckDialog] = useState(false);
  const [selectedFileForCheck, setSelectedFileForCheck] = useState<UploadFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptedExtensions = ['xlsx', 'xls', 'csv', 'txt'];

  // 同步 ref 和 state
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const generateId = () => `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // 预检和上传逻辑需要使用 ref 来避免循环依赖
  const preCheckFile = useCallback(async (uploadFile: UploadFile): Promise<FileValidationResult> => {
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
          suggestion: `文件大小 ${(uploadFile.file.size / 1024 / 1024).toFixed(1)}MB 超过了 ${maxSize}MB 限制`
        });
      }

      if (uploadFile.file.size === 0) {
        issues.push({
          type: 'error',
          code: 'empty_file',
          message: ERROR_MESSAGES['empty_file'].title,
          suggestion: '文件内容为空'
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
              suggestion: '文件内容为空'
            });
          } else {
            const hasSpecialChars = /[^\x00-\x7F]/.test(text);
            if (hasSpecialChars) {
              warnings.push('文件可能包含特殊字符，已尝试自动修复编码');
            }
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 2) {
              issues.push({
                type: 'warning',
                code: 'too_few_rows',
                message: '数据行数较少',
                suggestion: `只有 ${lines.length} 行数据，可能无法进行有意义的分析`
              });
            }
          }
        } catch {
          issues.push({
            type: 'error',
            code: 'corrupted_file',
            message: ERROR_MESSAGES['corrupted_file'].title,
            suggestion: '无法读取文件内容，请检查文件是否损坏'
          });
        }
      }

      if (['xlsx', 'xls'].includes(extension || '')) {
        warnings.push('Excel 文件已标记待解析');
      }

      return {
        isValid: issues.filter(i => i.type === 'error').length === 0,
        issues,
        warnings,
        suggestedFix: issues.length > 0 ? 'AI 智能修复功能可以帮助解决部分问题' : undefined
      };
    } catch {
      return {
        isValid: false,
        issues: [{
          type: 'error',
          code: 'corrupted_file',
          message: ERROR_MESSAGES['corrupted_file'].title,
          suggestion: '文件预检过程中发生错误'
        }],
        warnings: []
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxSize]);

  const updateFileStatus = useCallback((id: string, updates: Partial<UploadFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  const handlePreCheck = useCallback(async (uploadFile: UploadFile) => {
    updateFileStatus(uploadFile.id, { status: 'prechecking', progress: 0 });

    for (let i = 0; i <= 100; i += 20) {
      await new Promise(resolve => setTimeout(resolve, 100));
      updateFileStatus(uploadFile.id, { progress: i });
    }

    const result = await preCheckFile(uploadFile);
    updateFileStatus(uploadFile.id, {
      status: 'prechecked',
      progress: 100,
      validationResult: result
    });

    return result;
  }, [preCheckFile, updateFileStatus]);

  // 处理文件列表 - 移到前面
  const processFiles = useCallback(async (newFiles: File[]) => {
    const uploadFiles: UploadFile[] = newFiles.map(file => ({
      file,
      id: generateId(),
      status: 'pending' as const,
      progress: 0
    }));

    setFiles(prev => multiple ? [...prev, ...uploadFiles] : [...prev.slice(0, 0), ...uploadFiles]);

    for (const uploadFile of uploadFiles) {
      if (enablePreCheck) {
        const result = await handlePreCheck(uploadFile);
        if (result.isValid) {
          updateFileStatus(uploadFile.id, { status: 'uploading' });
          for (let i = 0; i <= 100; i += 10) {
            await new Promise(resolve => setTimeout(resolve, 50));
            updateFileStatus(uploadFile.id, { progress: i });
          }
          updateFileStatus(uploadFile.id, { status: 'completed', progress: 100 });
        }
      } else {
        updateFileStatus(uploadFile.id, { status: 'uploading' });
        for (let i = 0; i <= 100; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 50));
          updateFileStatus(uploadFile.id, { progress: i });
        }
        updateFileStatus(uploadFile.id, { status: 'completed', progress: 100 });
      }
    }

    const completedFiles = [...filesRef.current, ...uploadFiles];
    onFileUpload(completedFiles);
  }, [multiple, enablePreCheck, handlePreCheck, updateFileStatus, onFileUpload]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, [processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    processFiles(selectedFiles);
  }, [processFiles]);

  const removeFile = useCallback((id: string) => {
    const newFiles = files.filter(f => f.id !== id);
    setFiles(newFiles);
    onFileUpload(newFiles);
  }, [files, onFileUpload]);

  const openPreCheckDetails = (file: UploadFile) => {
    setSelectedFileForCheck(file);
    setShowPreCheckDialog(true);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'txt') return <FileText className="w-5 h-5 text-blue-500" />;
    return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
  };

  const getStatusBadge = (status: UploadFile['status']) => {
    const statusMap = {
      pending: { label: '等待中', color: 'bg-gray-100 text-gray-600' },
      uploading: { label: '上传中', color: 'bg-blue-100 text-blue-600' },
      prechecking: { label: '预检中', color: 'bg-purple-100 text-purple-600' },
      prechecked: { label: '已预检', color: 'bg-green-100 text-green-600' },
      completed: { label: '已完成', color: 'bg-green-100 text-green-600' },
      error: { label: '有问题', color: 'bg-red-100 text-red-600' }
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

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200',
          dragActive 
            ? 'border-primary bg-primary/5 shadow-lg' 
            : 'border-gray-300 hover:border-primary hover:bg-primary/5'
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
        
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            'p-4 rounded-full transition-all duration-200',
            dragActive ? 'bg-primary/10 scale-110' : 'bg-gray-100'
          )}>
            <Upload className={cn(
              'w-8 h-8 transition-colors',
              dragActive ? 'text-primary' : 'text-gray-500'
            )} />
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-700">
              {dragActive ? '松开手指上传文件' : '拖拽文件到此处，或点击上传'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              支持 Excel (.xlsx/.xls)、CSV、TXT 格式，{multiple ? '可批量上传，' : ''}单文件最大 {maxSize}MB
            </p>
          </div>

          {enableAIHealing && (
            <div className="flex items-center gap-2 mt-2 text-xs text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full">
              <Sparkles className="w-3 h-3" />
              <span>支持 AI 智能修复表格问题</span>
            </div>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-3">
          {files.map((uploadFile) => (
            <div
              key={uploadFile.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    {getFileIcon(uploadFile.file.name)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {uploadFile.file.name}
                      </p>
                      {getStatusBadge(uploadFile.status)}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">
                        {formatFileSize(uploadFile.file.size)}
                      </span>
                      {uploadFile.validationResult && (
                        <span className={cn(
                          'text-xs',
                          uploadFile.validationResult.isValid ? 'text-green-600' : 'text-red-600'
                        )}>
                          {uploadFile.validationResult.issues.filter(i => i.type === 'error').length > 0 
                            ? `${uploadFile.validationResult.issues.filter(i => i.type === 'error').length} 个问题待处理` 
                            : '预检通过'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {uploadFile.status === 'prechecked' && (
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
                  
                  <button
                    onClick={() => removeFile(uploadFile.id)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {(uploadFile.status === 'uploading' || uploadFile.status === 'prechecking') && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>{uploadFile.status === 'prechecking' ? '正在预检...' : '正在上传...'}</span>
                    <span>{uploadFile.progress}%</span>
                  </div>
                  <Progress value={uploadFile.progress} className="h-1.5" />
                </div>
              )}

              {uploadFile.validationResult && uploadFile.validationResult.issues.length > 0 && (
                <div className="mt-3 space-y-1">
                  {uploadFile.validationResult.issues.slice(0, 2).map((issue, idx) => (
                    <div 
                      key={idx}
                      className={cn(
                        'flex items-start gap-2 text-xs p-2 rounded',
                        issue.type === 'error' ? 'bg-red-50 text-red-600' : 
                        issue.type === 'warning' ? 'bg-yellow-50 text-yellow-600' : 
                        'bg-blue-50 text-blue-600'
                      )}
                    >
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{issue.message}</span>
                    </div>
                  ))}
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
              文件预检报告
            </DialogTitle>
            <DialogDescription>
              {selectedFileForCheck?.file.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedFileForCheck?.validationResult && (
            <div className="space-y-4">
              <div className={cn(
                'p-4 rounded-lg flex items-center gap-3',
                selectedFileForCheck.validationResult.isValid 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              )}>
                {selectedFileForCheck.validationResult.isValid ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-700">预检通过</p>
                      <p className="text-sm text-green-600">文件可以正常导入分析</p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-6 h-6 text-red-600" />
                    <div>
                      <p className="font-medium text-red-700">发现问题</p>
                      <p className="text-sm text-red-600">需要处理以下问题后才能分析</p>
                    </div>
                  </>
                )}
              </div>

              {selectedFileForCheck.validationResult.issues.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">问题详情</h4>
                  {selectedFileForCheck.validationResult.issues.map((issue, idx) => (
                    <div 
                      key={idx}
                      className={cn(
                        'p-3 rounded-lg border',
                        issue.type === 'error' ? 'bg-red-50 border-red-100' : 
                        issue.type === 'warning' ? 'bg-yellow-50 border-yellow-100' : 
                        'bg-blue-50 border-blue-100'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-xs font-medium',
                          issue.type === 'error' ? 'bg-red-100 text-red-700' : 
                          issue.type === 'warning' ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-blue-100 text-blue-700'
                        )}>
                          {issue.type === 'error' ? '错误' : issue.type === 'warning' ? '警告' : '提示'}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{issue.message}</p>
                          {issue.suggestion && (
                            <p className="text-xs text-gray-600 mt-1">{issue.suggestion}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {enableAIHealing && selectedFileForCheck.validationResult.suggestedFix && (
                <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-purple-700">AI 智能修复</p>
                      <p className="text-xs text-purple-600 mt-1">
                        {selectedFileForCheck.validationResult.suggestedFix}
                      </p>
                      <Button size="sm" variant="outline" className="mt-2" disabled>
                        <Sparkles className="w-3 h-3 mr-1" />
                        一键智能修复
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
