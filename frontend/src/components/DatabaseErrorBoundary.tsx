/**
 * Database Error Boundary Component
 * Catches database unavailability errors and shows appropriate UI
 */

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { DatabaseUnavailableError } from '../services/database';
import Button from './Button';
import Card from './Card';

interface DatabaseErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<DatabaseErrorFallbackProps>;
}

interface DatabaseErrorFallbackProps {
  error: DatabaseUnavailableError;
  retry: () => void;
  goHome: () => void;
}

interface DatabaseErrorBoundaryState {
  hasError: boolean;
  error: DatabaseUnavailableError | null;
}

const DefaultDatabaseErrorFallback: React.FC<DatabaseErrorFallbackProps> = ({
  error,
  retry,
  goHome
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-md w-full">
        <div className="text-center p-6">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Database Unavailable
          </h1>

          <p className="text-gray-600 mb-6">
            The database connection is currently unavailable. This could be due to:
          </p>

          <ul className="text-left text-sm text-gray-600 mb-6 space-y-1">
            <li>• Server maintenance or restart</li>
            <li>• Network connectivity issues</li>
            <li>• Database server problems</li>
          </ul>

          {error.health.message && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-red-700">
                <strong>Error details:</strong> {error.health.message}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={retry}
              className="w-full"
              variant="primary"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>

            <Button
              onClick={goHome}
              variant="outline"
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Last checked: {new Date(error.health.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

class DatabaseErrorBoundary extends React.Component<
  DatabaseErrorBoundaryProps,
  DatabaseErrorBoundaryState
> {
  constructor(props: DatabaseErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): DatabaseErrorBoundaryState {
    // Check if this is a database unavailability error
    if (error instanceof DatabaseUnavailableError) {
      return {
        hasError: true,
        error: error
      };
    }

    // For other errors, don't handle them here
    return { hasError: false, error: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log database errors for debugging
    if (error instanceof DatabaseUnavailableError) {
      console.error('Database unavailable:', error, errorInfo);
    }
  }

  handleRetry = () => {
    // Reset error state to retry
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    // Reset error state and navigate to home
    this.setState({ hasError: false, error: null });

    // Navigate to dashboard
    if (window.location.pathname !== '/dashboard') {
      window.location.href = '/dashboard';
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultDatabaseErrorFallback;

      return (
        <FallbackComponent
          error={this.state.error}
          retry={this.handleRetry}
          goHome={this.handleGoHome}
        />
      );
    }

    return this.props.children;
  }
}

export default DatabaseErrorBoundary;
export type { DatabaseErrorFallbackProps };