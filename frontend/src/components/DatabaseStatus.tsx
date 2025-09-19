/**
 * Database Status Component
 * Shows database connection status and handles disconnection scenarios
 */

import React from 'react';
import { AlertTriangle, CheckCircle, WifiOff, RefreshCw } from 'lucide-react';
import { useDatabaseHealth, databaseService } from '../services/database';
import Button from './Button';

interface DatabaseStatusProps {
  className?: string;
  showIcon?: boolean;
  showText?: boolean;
  compact?: boolean;
}

const DatabaseStatus: React.FC<DatabaseStatusProps> = ({
  className = '',
  showIcon = true,
  showText = true,
  compact = false
}) => {
  const { healthy, lastCheck, loading } = useDatabaseHealth();
  const [checking, setChecking] = React.useState(false);

  const handleRetry = async () => {
    setChecking(true);
    try {
      await databaseService.checkHealth();
    } catch (error) {
      console.error('Manual health check failed:', error);
    } finally {
      setChecking(false);
    }
  };

  const getStatusColor = () => {
    if (loading) return 'text-gray-500';
    return healthy ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = () => {
    if (loading || checking) {
      return <RefreshCw className="w-4 h-4 animate-spin" />;
    }
    return healthy ? (
      <CheckCircle className="w-4 h-4" />
    ) : (
      <WifiOff className="w-4 h-4" />
    );
  };

  const getStatusText = () => {
    if (loading) return 'Checking...';
    if (checking) return 'Reconnecting...';
    return healthy ? 'Connected' : 'Disconnected';
  };

  const getLastCheckText = () => {
    if (!lastCheck) return '';
    const timeDiff = Date.now() - lastCheck;
    const minutes = Math.floor(timeDiff / 60000);
    const seconds = Math.floor((timeDiff % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m ago`;
    }
    return `${seconds}s ago`;
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${getStatusColor()} ${className}`}>
        {showIcon && getStatusIcon()}
        {showText && (
          <span className="text-xs font-medium">
            {getStatusText()}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showIcon && (
        <div className={getStatusColor()}>
          {getStatusIcon()}
        </div>
      )}

      {showText && (
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            Database: {getStatusText()}
          </span>
          {lastCheck > 0 && (
            <span className="text-xs text-gray-500">
              Last check: {getLastCheckText()}
            </span>
          )}
        </div>
      )}

      {!healthy && !loading && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          disabled={checking}
          className="ml-2"
        >
          {checking ? 'Checking...' : 'Retry'}
        </Button>
      )}
    </div>
  );
};

export default DatabaseStatus;