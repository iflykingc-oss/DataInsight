'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  moduleName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * 全局错误边界组件
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
