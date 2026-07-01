import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
            <h1 className="mb-2 text-xl font-semibold text-foreground">
              Si è verificato un errore
            </h1>
            <p className="mb-4 text-sm text-muted-foreground">
              Qualcosa è andato storto. Ricarica la pagina o riprova.
            </p>
            {this.state.error && (
              <p className="mb-4 rounded bg-muted p-2 text-xs text-muted-foreground break-all">
                {this.state.error.message}
              </p>
            )}
            <div className="flex justify-center gap-2">
              <button
                onClick={this.handleReset}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 min-h-[44px] min-w-[44px]"
              >
                Riprova
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent min-h-[44px] min-w-[44px]"
              >
                Ricarica pagina
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
