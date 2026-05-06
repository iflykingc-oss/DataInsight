/**
 * 用户反馈系统
 * 统一的加载状态、错误提示、成功提示、交互反馈
 * 提升用户体验，让每一次操作都有明确反馈
 */

// 安全导入 toast，如果不存在则提供降级方案
let toastModule: typeof import('sonner').toast | null = null;
try {
  // 使用 import() 动态导入而非 require
  import('sonner').then((sonner) => {
    toastModule = sonner.toast;
  }).catch(() => {
    // sonner 未安装，使用 console 降级
  });
} catch {
  // sonner 未安装，使用 console 降级
}

interface ToastOptions {
  description?: string;
  duration?: number;
  id?: string | number;
  action?: { label: string; onClick: () => void };
  cancel?: { label: string; onClick: () => void };
  onDismiss?: () => void;
}

interface ToastAPI {
  success: (msg: string, opts?: ToastOptions) => void;
  error: (msg: string, opts?: ToastOptions) => void;
  warning: (msg: string, opts?: ToastOptions) => void;
  info: (msg: string, opts?: ToastOptions) => void;
  loading: (msg: string, opts?: ToastOptions) => string | number;
  dismiss: (id?: string | number) => void;
}

function getToast(): ToastAPI {
  if (toastModule) {
    return toastModule as unknown as ToastAPI;
  }
  // 降级实现
  return {
    success: (msg: string, _opts?: ToastOptions) => console.log('[Success]', msg),
    error: (msg: string, _opts?: ToastOptions) => console.error('[Error]', msg),
    warning: (msg: string, _opts?: ToastOptions) => console.warn('[Warning]', msg),
    info: (msg: string, _opts?: ToastOptions) => console.info('[Info]', msg),
    loading: (msg: string, _opts?: ToastOptions) => { console.log('[Loading]', msg); return 'fallback-toast-id'; },
    dismiss: (_id?: string | number) => {},
  };
}

// ============================================================
// 加载状态管理
// ============================================================

interface LoadingTask {
  id: string;
  message: string;
  startTime: number;
}

class LoadingManager {
  private tasks = new Map<string, LoadingTask>();
  private toastId: string | number | null = null;

  start(id: string, message: string): void {
    this.tasks.set(id, { id, message, startTime: Date.now() });
    this.updateToast();
  }

  update(id: string, message: string): void {
    const task = this.tasks.get(id);
    if (task) {
      task.message = message;
      this.updateToast();
    }
  }

  end(id: string): void {
    this.tasks.delete(id);
    this.updateToast();
  }

  private updateToast(): void {
    const toast = getToast();
    if (this.tasks.size === 0) {
      if (this.toastId !== null) {
        toast.dismiss(this.toastId);
        this.toastId = null;
      }
      return;
    }

    const tasks = Array.from(this.tasks.values());
    const message = tasks.length === 1
      ? tasks[0].message
      : `正在处理 ${tasks.length} 个任务...`;

    if (this.toastId !== null) {
      toast.loading(message, { id: this.toastId });
    } else {
      this.toastId = toast.loading(message);
    }
  }

  isLoading(id: string): boolean {
    return this.tasks.has(id);
  }

  getLoadingCount(): number {
    return this.tasks.size;
  }
}

export const loadingManager = new LoadingManager();

// ============================================================
// 便捷函数
// ============================================================

export function showLoading(id: string, message: string): void {
  loadingManager.start(id, message);
}

export function updateLoading(id: string, message: string): void {
  loadingManager.update(id, message);
}

export function hideLoading(id: string): void {
  loadingManager.end(id);
}

// ============================================================
// 错误提示（自动分类）
// ============================================================

export function showError(error: unknown, fallbackMessage = '操作失败'): void {
  const toast = getToast();
  const message = error instanceof Error ? error.message : fallbackMessage;

  if (message.includes('超时') || message.includes('timeout') || message.includes('AbortError')) {
    toast.error('请求超时', {
      description: '网络连接不稳定，请检查网络后重试',
      duration: 5000,
    });
  } else if (message.includes('401') || message.includes('403') || message.includes('未登录')) {
    toast.error('登录已过期', {
      description: '请重新登录后重试',
      duration: 5000,
    });
  } else if (message.includes('500') || message.includes('502') || message.includes('503')) {
    toast.error('服务器异常', {
      description: '服务暂时不可用，请稍后重试',
      duration: 5000,
    });
  } else if (message.includes('网络') || message.includes('fetch') || message.includes('Failed to fetch')) {
    toast.error('网络错误', {
      description: '无法连接到服务器，请检查网络连接',
      duration: 5000,
    });
  } else {
    toast.error(message, { duration: 5000 });
  }
}

// ============================================================
// 成功提示
// ============================================================

export function showSuccess(title: string, description?: string): void {
  getToast().success(title, {
    description,
    duration: 3000,
  });
}

// ============================================================
// 警告提示
// ============================================================

export function showWarning(title: string, description?: string): void {
  getToast().warning(title, {
    description,
    duration: 5000,
  });
}

// ============================================================
// 信息提示
// ============================================================

export function showInfo(title: string, description?: string): void {
  getToast().info(title, {
    description,
    duration: 4000,
  });
}

// ============================================================
// 异步操作包装器（自动处理加载和错误）
// ============================================================

export interface AsyncTaskOptions {
  loadingId: string;
  loadingMessage: string;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (result: unknown) => void;
  onError?: (error: Error) => void;
}

export async function runAsyncTask<T>(
  task: () => Promise<T>,
  options: AsyncTaskOptions
): Promise<T | null> {
  const { loadingId, loadingMessage, successMessage, errorMessage, onSuccess, onError } = options;

  loadingManager.start(loadingId, loadingMessage);

  try {
    const result = await task();
    loadingManager.end(loadingId);

    if (successMessage) {
      showSuccess(successMessage);
    }

    onSuccess?.(result);
    return result;
  } catch (error) {
    loadingManager.end(loadingId);

    const err = error instanceof Error ? error : new Error(String(error));
    showError(err, errorMessage);
    onError?.(err);
    return null;
  }
}

// ============================================================
// 进度提示（用于长时间操作）
// ============================================================

export function showProgress(message: string, progress: number): void {
  const percent = Math.round(progress * 100);
  getToast().loading(`${message} (${percent}%)`, { id: 'progress-toast' });
}

export function hideProgress(): void {
  getToast().dismiss('progress-toast');
}

// ============================================================
// 确认对话框（Promise风格）
// ============================================================

export function confirmAction(
  title: string,
  description: string,
  confirmText = '确认',
  cancelText = '取消'
): Promise<boolean> {
  return new Promise((resolve) => {
    getToast().info(title, {
      description,
      duration: Infinity,
      action: {
        label: confirmText,
        onClick: () => resolve(true),
      },
      cancel: {
        label: cancelText,
        onClick: () => resolve(false),
      },
      onDismiss: () => resolve(false),
    });
  });
}
