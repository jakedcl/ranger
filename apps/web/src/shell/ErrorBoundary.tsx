import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("RANGER UI error", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="main">
          <h1>Something went wrong</h1>
          <p className="empty">The last screen failed to render. Reload to continue.</p>
          <p>{this.state.error.message}</p>
          <button className="button" type="button" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
