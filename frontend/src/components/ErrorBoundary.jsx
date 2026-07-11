import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{ backgroundColor: 'var(--bg-primary)', direction: 'rtl' }}
        >
          <div
            className="text-center max-w-md w-full rounded-xl p-8"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            <AlertTriangle
              size={48}
              className="mx-auto mb-4"
              style={{ color: '#ef4444' }}
            />
            <h2
              className="text-xl font-bold mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              خطایی رخ داد
            </h2>
            <p
              className="text-sm mb-6"
              style={{ color: 'var(--text-secondary)' }}
            >
              متأسفانه مشکلی پیش آمده است. لطفاً دوباره تلاش کنید.
            </p>
            {this.state.error && (
              <details className="mb-4 text-left" dir="ltr">
                <summary
                  className="text-xs cursor-pointer mb-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  جزئیات خطا
                </summary>
                <pre
                  className="text-xs p-3 rounded-lg overflow-auto max-h-32"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: '#ef4444',
                  }}
                >
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium transition-colors"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <RefreshCw size={16} />
              تلاش مجدد
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
