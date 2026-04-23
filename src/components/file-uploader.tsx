'use client';

import React, { useCallback, useState, useMemo } from 'react';
import { Upload, X, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  onFileUpload: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // MB
  className?: string;
}

export function FileUploader({
  onFileUpload,
  accept = '.xlsx,.xls,.csv',
  multiple = true,
  maxSize = 50,
  className
}: FileUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // 验证文件的逻辑
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles: File[] = [];
    const errors: string[] = [];
    const acceptedExtensions = ['xlsx', 'xls', 'csv'];
    
    droppedFiles.forEach(file => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (!acceptedExtensions.includes(extension || '')) {
        errors.push(`${file.name} 的文件类型不支持`);
      } else if (file.size > maxSize * 1024 * 1024) {
        errors.push(`${file.name} 超过了 ${maxSize}MB 的大小限制`);
      } else {
        validFiles.push(file);
      }
    });
    
    if (errors.length > 0) {
      setError(errors.join('; '));
    }
    
    if (validFiles.length > 0) {
      setFiles(prevFiles => {
        const newFiles = multiple ? [...prevFiles, ...validFiles] : [validFiles[0]];
        onFileUpload(newFiles);
        return newFiles;
      });
    }
  }, [multiple, onFileUpload, maxSize]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (!e.target.files) return;
    
    const selectedFiles = Array.from(e.target.files);
    const validFiles: File[] = [];
    const errors: string[] = [];
    const acceptedExtensions = ['xlsx', 'xls', 'csv'];
    
    selectedFiles.forEach(file => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (!acceptedExtensions.includes(extension || '')) {
        errors.push(`${file.name} 的文件类型不支持`);
      } else if (file.size > maxSize * 1024 * 1024) {
        errors.push(`${file.name} 超过了 ${maxSize}MB 的大小限制`);
      } else {
        validFiles.push(file);
      }
    });
    
    if (errors.length > 0) {
      setError(errors.join('; '));
    }
    
    if (validFiles.length > 0) {
      setFiles(prevFiles => {
        const newFiles = multiple ? [...prevFiles, ...validFiles] : [validFiles[0]];
        onFileUpload(newFiles);
        return newFiles;
      });
    }
  }, [multiple, onFileUpload, maxSize]);

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFileUpload(newFiles);
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
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-all',
          dragActive ? 'border-primary bg-primary/5' : 'border-gray-300',
          'hover:border-primary hover:bg-primary/5'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            'p-4 rounded-full',
            dragActive ? 'bg-primary/10' : 'bg-gray-100'
          )}>
            <Upload className={cn(
              'w-8 h-8',
              dragActive ? 'text-primary' : 'text-gray-500'
            )} />
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-700">
              拖拽文件到此处，或点击上传
            </p>
            <p className="text-sm text-gray-500 mt-1">
              支持 .xlsx、.xls、.csv 格式，单文件最大 {maxSize}MB
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
