import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col items-center justify-center space-y-4 text-center">
          <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/50 max-w-xl">
            <h2 className="text-xl font-black text-red-400 mb-2">エラーが発生しました</h2>
            <p className="text-xs font-mono text-slate-300 bg-slate-900 p-3 rounded-xl border border-slate-800 text-left overflow-x-auto">
              {this.state.error?.toString() || '未知のエラー'}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs hover:bg-cyan-400"
          >
            ページを再読み込み
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
