import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  message: string | null;
}

/** Last-resort screen so a render exception is not a blank WKWebView. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { message: null };

  static getDerivedStateFromError(error: Error): State {
    return { message: error.message || '未知错误' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ui error', error, info.componentStack);
  }

  render() {
    if (!this.state.message) return this.props.children;
    return (
      <div className="error-screen">
        <h2>页面出错了</h2>
        <p>学习内容还在这台设备上。重新加载可以回到首页。</p>
        <pre>{this.state.message}</pre>
        <button className="primary" onClick={() => window.location.reload()}>
          重新加载
        </button>
      </div>
    );
  }
}
