import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Log Leaflet/DOM-related errors but don't crash the whole app
    if (
      error.message?.includes("removeChild") ||
      error.message?.includes("Node") ||
      error.message?.includes("Leaflet")
    ) {
      console.warn("Non-critical DOM/Leaflet error caught:", error.message);
      return { hasError: true, error };
    }
    throw error; // Re-throw critical errors
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
            <p className="font-semibold">Something went wrong with the map.</p>
            <p className="text-sm mt-2">Please refresh the page to try again.</p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
