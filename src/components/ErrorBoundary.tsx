import React from 'react';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
  stack?: string;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: any) {
    return {
      hasError: true,
      message: error?.message || String(error),
    };
  }

  componentDidCatch(error: any, info: any) {
    console.error('ErrorBoundary capturou:', error);
    console.error('Component stack:', info?.componentStack);
    this.setState({ stack: info?.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen p-4 bg-white">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="font-semibold text-red-700">O app quebrou ao carregar</div>
            <div className="mt-2 text-red-700">{this.state.message}</div>

            <div className="mt-3 text-sm text-gray-700">
              Isso explica a tela branca no Android/Edge/Opera.
              <br />
              Abra o console (F12 no PC) para ver detalhes.
            </div>

            {this.state.stack && (
              <pre className="mt-3 text-xs whitespace-pre-wrap text-gray-600">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
