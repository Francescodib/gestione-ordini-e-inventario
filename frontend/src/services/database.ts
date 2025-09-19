/**
 * Database availability service for frontend
 * Checks if the backend and database are available before allowing UI operations
 */

import axios from 'axios';
import React from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export interface DatabaseHealth {
  status: 'OK' | 'ERROR';
  database: 'connected' | 'disconnected';
  timestamp: string;
  version?: string;
  environment?: string;
  message?: string;
}

class DatabaseService {
  private static instance: DatabaseService;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isHealthy = false;
  private lastCheck = 0;
  private readonly CHECK_INTERVAL = 30000; // 30 seconds
  private readonly CACHE_DURATION = 10000; // 10 seconds
  private listeners: Array<(healthy: boolean) => void> = [];

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Check if backend and database are available
   */
  async checkHealth(): Promise<DatabaseHealth> {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`, {
        timeout: 5000,
        validateStatus: (status) => status === 200
      });

      const health: DatabaseHealth = response.data;
      this.isHealthy = health.status === 'OK' && health.database === 'connected';
      this.lastCheck = Date.now();

      // Notify listeners of health status change
      this.notifyListeners(this.isHealthy);

      return health;
    } catch (error) {
      // Silently handle health check failures to avoid console spam

      const errorHealth: DatabaseHealth = {
        status: 'ERROR',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : 'Unknown error'
      };

      this.isHealthy = false;
      this.lastCheck = Date.now();

      // Notify listeners of health status change
      this.notifyListeners(this.isHealthy);

      return errorHealth;
    }
  }

  /**
   * Get cached health status if recent, otherwise perform new check
   */
  async getCachedHealth(): Promise<{ healthy: boolean; lastCheck: number }> {
    const now = Date.now();
    const timeSinceLastCheck = now - this.lastCheck;

    if (timeSinceLastCheck > this.CACHE_DURATION) {
      await this.checkHealth();
    }

    return {
      healthy: this.isHealthy,
      lastCheck: this.lastCheck
    };
  }

  /**
   * Check if database is available and throw error if not
   * Use this before critical operations
   */
  async ensureDatabaseAvailable(): Promise<void> {
    const health = await this.checkHealth();

    if (health.status !== 'OK' || health.database !== 'connected') {
      throw new DatabaseUnavailableError(
        'Database is not available. Please check your connection and try again.',
        health
      );
    }
  }

  /**
   * Start periodic health checks
   */
  startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      return;
    }

    // Initial check
    this.checkHealth();

    // Periodic checks
    this.healthCheckInterval = setInterval(() => {
      this.checkHealth();
    }, this.CHECK_INTERVAL);
  }

  /**
   * Force an immediate health check (useful after database operations)
   */
  async forceHealthCheck(): Promise<DatabaseHealth> {
    this.lastCheck = 0; // Reset cache
    return await this.checkHealth();
  }

  /**
   * Stop periodic health checks
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Add listener for health status changes
   */
  addHealthListener(listener: (healthy: boolean) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of health status change
   */
  private notifyListeners(healthy: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener(healthy);
      } catch (error) {
        // Silently handle listener errors
      }
    });
  }

  /**
   * Get current health status without making a new request
   */
  getCurrentHealthStatus(): { healthy: boolean; lastCheck: number } {
    return {
      healthy: this.isHealthy,
      lastCheck: this.lastCheck
    };
  }
}

/**
 * Custom error for database unavailability
 */
export class DatabaseUnavailableError extends Error {
  public readonly health: DatabaseHealth;

  constructor(message: string, health: DatabaseHealth) {
    super(message);
    this.name = 'DatabaseUnavailableError';
    this.health = health;
  }
}

// Export singleton instance
export const databaseService = DatabaseService.getInstance();

/**
 * Hook for React components to monitor database health
 */
export const useDatabaseHealth = () => {
  const [healthy, setHealthy] = React.useState(false);
  const [lastCheck, setLastCheck] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Initial status
    const { healthy: currentHealthy, lastCheck: currentLastCheck } = databaseService.getCurrentHealthStatus();
    setHealthy(currentHealthy);
    setLastCheck(currentLastCheck);
    setLoading(false);

    // Listen for changes
    const unsubscribe = databaseService.addHealthListener((newHealthy) => {
      setHealthy(newHealthy);
      setLastCheck(Date.now());
    });

    // Start monitoring if not already started
    databaseService.startHealthMonitoring();

    return () => {
      unsubscribe();
    };
  }, []);

  return { healthy, lastCheck, loading };
};

// Auto-start monitoring when service is imported
databaseService.startHealthMonitoring();

export default databaseService;