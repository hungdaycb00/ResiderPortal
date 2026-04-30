import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name || 'Global'}] Uncaught error:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center p-8 bg-red-950/30 backdrop-blur-md rounded-2xl border border-red-500/30 text-center">
          <span className="text-4xl mb-4">⚠️</span>
          <h3 className="text-lg font-bold text-red-200 mb-2">Đã có lỗi xảy ra</h3>
          <p className="text-sm text-red-300/70 mb-4 max-w-[250px]">
            Hệ thống {this.props.name || 'game'} gặp sự cố nhỏ. Vui lòng thử lại.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Thử lại
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
