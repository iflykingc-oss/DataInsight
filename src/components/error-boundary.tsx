'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, XCircle, Info } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  moduleName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo?: React.ErrorInfo;
}

interface GlobalErrorContextType {
  hasGlobalError: boolean;
  globalError: Error | null;
  setGlobalError: (error: Error | null) => void;
  errorCount: number;
  resetError: () => void;
}

const GlobalErrorContext = createContext<GlobalErrorContextType>({
  hasGlobalError: false,
  globalError: null,
  setGlobalError: () => {},
  errorCount: 0,
  resetError: () => {},
});

export function useGlobalError() {
  return useContext(GlobalErrorContext);
}

export function GlobalErrorProvider({ children }: { children: React.ReactNode }) {
  const [hasGlobalError, setHasGlobalError] = useState(false);
  const [globalError, setGlobalErrorState] = useState<Error | null>(null);
  const [errorCount, setErrorCount] = useState(0);

  const setGlobalError = useCallback((error: Error | null) => {
    if (error) {
      setErrorCount(prev => prev + 1);
      console.error('[GlobalError]', error);
    }
    setGlobalErrorState(error);
    setHasGlobalError(!!error);
  }, []);

  const resetError = useCallback(() => {
    setGlobalErrorState(null);
    setHasGlobalError(false);
  }, []);

  return (
    <GlobalErrorContext.Provider value={{ hasGlobalError, globalError, setGlobalError, errorCount, resetError }}>
      {children}
    </GlobalErrorContext.Provider>
  );
}

export function GlobalErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { t } = useI18n();

  const handleReset = useCallback(() => {
    setHasError(false);
    setError(null);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="max-w-md w-full mx-4 border-destructive/30 bg-white shadow-lg">
          <CardContent className="py-8 px-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {t('errorBoundary.componentError')}
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('errorBoundary.unknownError')}
                </p>
                {process.env.NODE_ENV === 'development' && error && (
                  <details className="mt-4 text-left">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      {t('errorBoundary.errorDetails')}
                    </summary>
                    <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto max-h-40 text-destructive">
                      {error.message}
                      {'\n\n'}
                      {error.stack}
                    </pre>
                  </details>
                )}
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <Button variant="outline" onClick={handleReset}>
                  {t('errorBoundary.retry')}
                </Button>
                <Button onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('errorBoundary.retry')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundaryBoundary onError={(err, info) => {
      setError(err);
      setHasError(true);
      console.error('[GlobalErrorBoundary]', err, info);
    }}>
      {children}
    </ErrorBoundaryBoundary>
  );
}

class ErrorBoundaryBoundary extends React.Component<{ children: React.ReactNode; onError: (error: Error, info: React.ErrorInfo) => void }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode; onError: (error: Error, info: React.ErrorInfo) => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

/**
 * 错误边界组件
 *
 * 用法：
 * <ErrorBoundary moduleName="数据表格">
 *   <DataTable />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.moduleName ? `:${this.props.moduleName}` : ''}]`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="border-destructive/30">
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-10 w-10 mx-auto text-destructive/60" />
              <div>
                <h3 className="font-semibold text-lg">
                  {this.props.moduleName ? `${this.props.moduleName}加载异常` : '组件加载异常'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {this.state.error?.message || '发生未知错误'}
                </p>
              </div>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    错误详情
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
              <Button variant="outline" onClick={this.handleRetry} className="gap-1.5">
                <RefreshCw className="h-4 w-4" />
                重新加载
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * 轻量级错误边界（行内展示）
 */
export class InlineErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[InlineErrorBoundary${this.props.moduleName ? `:${this.props.moduleName}` : ''}]`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/5 border border-destructive/20 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive/60 flex-shrink-0" />
          <span className="text-muted-foreground flex-1">
            {this.props.moduleName ? `${this.props.moduleName}: ` : ''}{this.state.error?.message || '加载异常'}
          </span>
          <Button variant="ghost" size="sm" onClick={this.handleRetry} className="h-7 text-xs">
            重试
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 错误消息提示组件
 */
export function ErrorMessage({
  error,
  onDismiss,
  className = ''
}: {
  error: string | Error;
  onDismiss?: () => void;
  className?: string;
}) {
  const message = error instanceof Error ? error.message : error;

  return (
    <div className={`flex items-center gap-2 p-3 rounded-md bg-destructive/5 border border-destructive/20 text-sm ${className}`}>
      <AlertTriangle className="h-4 w-4 text-destructive/60 flex-shrink-0" />
      <span className="text-muted-foreground flex-1">{message}</span>
      {onDismiss && (
        <Button variant="ghost" size="sm" onClick={onDismiss} className="h-7 w-7 p-0">
          <XCircle className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * 信息提示组件
 */
export function InfoMessage({
  message,
  onDismiss,
  className = ''
}: {
  message: string;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 p-3 rounded-md bg-blue-50 border border-blue-200 text-sm ${className}`}>
      <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
      <span className="text-blue-700 flex-1">{message}</span>
      {onDismiss && (
        <Button variant="ghost" size="sm" onClick={onDismiss} className="h-7 w-7 p-0">
          <XCircle className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * 加载状态组件
 */
export function LoadingState({
  message,
  className = ''
}: {
  message?: string;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={`flex flex-col items-center justify-center py-8 gap-3 ${className}`}>
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      <span className="text-sm text-muted-foreground">{message || t('errorBoundary.loading')}</span>
    </div>
  );
}

/**
 * 空数据状态组件
 */
export function EmptyState({
  title,
  description,
  icon: Icon = Info,
  action,
  className = ''
}: {
  title?: string;
  description?: string;
  icon?: React.ElementType;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={`flex flex-col items-center justify-center py-12 gap-3 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <h3 className="font-medium text-foreground">{title || t('errorBoundary.noData')}</h3>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
