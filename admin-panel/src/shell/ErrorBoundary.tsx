import * as React from "react";
import { ErrorState } from "@/admin-primitives/ErrorState";

interface State {
  error: Error | null;
}

/** Catches render errors in any descendant (plugin views, custom renderers).
 *  Keeps the shell responsive so users can navigate away from a broken view. */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[admin] render error caught by boundary", error, info);
  }

  reset = () => this.setState({ error: null });

  render(): React.ReactNode {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="p-6">
          <ErrorState
            title="This view crashed"
            description={this.state.error.message}
            onRetry={this.reset}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
