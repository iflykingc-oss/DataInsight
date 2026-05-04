/**
 * API 服务层
 * 统一管理所有后端API调用
 */

import type { ParsedData, DataAnalysis } from '@/lib/data-processor';
import type { ApiResponse } from '@/types/api';

/**
 * 文件上传并解析
 */
export async function uploadAndParse(
  file: File,
  onProgress?: (progress: number) => void
): Promise<ParsedData> {
  const formData = new FormData();
  formData.append('files', file);

  const xhr = new XMLHttpRequest();
  
  return new Promise((resolve, reject) => {
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const result = JSON.parse(xhr.responseText);
        if (result.success && result.data?.[0]) {
          resolve(result.data[0]);
        } else {
          reject(new Error(result.error || '解析失败'));
        }
      } else {
        reject(new Error(`上传失败: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('网络错误'));
    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  });
}

/**
 * 数据分析
 */
export async function analyzeData(data: ParsedData): Promise<DataAnalysis> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });

  if (!response.ok) {
    throw new Error(`分析请求失败: ${response.status}`);
  }

  const result = await response.json();
  if (result.success) {
    return result.analysis;
  }
  throw new Error(result.error || '分析失败');
}

/**
 * 通用GET请求
 */
export async function get<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`请求失败: ${response.status}`);
  }
  return response.json();
}

/**
 * 通用POST请求
 */
export async function post<T>(url: string, data: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status}`);
  }

  return response.json();
}
