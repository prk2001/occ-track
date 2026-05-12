import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Optional renderer for the fallback. Defaults to a friendly recover page. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * App-level error boundary.
 *
 * Without this, one render exception in any deep component = blank white
 * screen for the rest of the session. With this, the user sees a friendly
 * "something went wrong" panel and can refresh OR click "Back to home."
 *
 * Especially critical for the Welcome Table kiosk (a tablet at the front
 * door with no console — a crash there is a 100% blocker until someone
 * notices the screen and reboots the iPad).
 *
 * In production, the componentDidCatch hook would also forward the error
 * to Sentry / Datadog / the backend audit log. For the prototype we just
 * console.error.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Single source of truth for crash diagnostics. A future Sentry/Datadog
    // wiring replaces this console.error with the SDK's captureException.
    console.error('[OCC ErrorBoundary] caught:', error);
    console.error('[OCC ErrorBoundary] component stack:', info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
    return <DefaultFallback error={this.state.error} onReset={this.reset} />;
  }
}

function DefaultFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div className="min-h-[100dvh] bg-bg-cream flex items-center justify-center px-4">
      <div className="bg-bg-card rounded-3xl shadow-card-elevated max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 mx-auto bg-sp-red-light rounded-full flex items-center justify-center mb-5">
          <AlertTriangle className="w-10 h-10 text-sp-red" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red mb-2">
          Something went wrong
        </p>
        <h1 className="font-display text-3xl text-ink leading-tight tracking-tight">
          We hit a snag.
          <span className="font-display-italic block text-sp-red mt-1">
            Try one of these.
          </span>
        </h1>
        <p className="text-sm text-ink-light italic mt-3 leading-relaxed">
          The page hit an unexpected error. Your data is safe — nothing was
          deleted. Refresh to retry, or head back to the dashboard.
        </p>
        <details className="mt-4 text-left">
          <summary className="text-[11px] font-bold uppercase tracking-wider text-ink-light cursor-pointer hover:text-ink">
            Technical details
          </summary>
          <pre className="mt-2 text-[10px] font-mono bg-bg-primary border border-border-custom rounded-lg p-3 text-ink-light overflow-x-auto">
            {error.message}
          </pre>
        </details>
        <div className="grid grid-cols-2 gap-2 mt-6">
          <button
            onClick={() => {
              onReset();
              window.location.reload();
            }}
            className="h-12 bg-sp-red text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-sp-red-dark transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
          <a
            href="#/"
            onClick={onReset}
            className="h-12 bg-bg-card border-2 border-border-custom hover:border-ink text-ink text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Home
          </a>
        </div>
        <p className="text-[10px] text-ink-light/60 italic mt-5">
          If this keeps happening, contact your Central Drop-off Leader.
        </p>
      </div>
    </div>
  );
}
