import { Component } from "react"
import type { ErrorInfo, ReactNode } from "react"

interface Props {
  children: ReactNode
  /** Rendered in place of the children after a crash. Defaults to a full-page message. */
  fallback?: ReactNode
}

interface State {
  failed: boolean
}

/**
 * Catches render errors so one broken section shows a message instead of
 * blanking the whole page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Render error:", error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    if (this.props.fallback !== undefined) return this.props.fallback
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <p className="text-lg font-semibold text-(--color-text)">Something went wrong.</p>
          <p className="mt-2 text-sm text-(--color-muted)">
            The dashboard hit an unexpected error. Reloading usually fixes it.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 px-4 py-2 rounded-full bg-(--color-accent) text-white text-sm font-medium"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
