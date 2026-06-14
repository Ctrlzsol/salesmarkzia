import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
          return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-rose-100">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">عذراً، حدث خطأ غير متوقع</h1>
            <p className="text-sm text-slate-500 mb-6 border p-4 rounded-xl bg-slate-50 text-left font-mono overflow-auto max-h-32">
                {this.state.error?.message}
            </p>
            <button
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 w-full"
              onClick={() => this.setState({ hasError: false })}
            >
              حاول مرة أخرى
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
