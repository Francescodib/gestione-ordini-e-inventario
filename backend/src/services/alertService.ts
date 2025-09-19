/**
 * Alert Service
 * Service for managing alerts, notifications, and threshold monitoring
 */

import { logger } from '../config/logger';
import { MonitoringConfig } from '../config/monitoring';
import { SystemMetrics, ApplicationMetrics, HealthCheckResult } from './systemMonitoringService';

export interface Alert {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  title: string;
  description: string;
  metric?: string;
  value?: number;
  threshold?: number;
  status: 'active' | 'acknowledged' | 'resolved';
  resolvedAt?: Date;
  metadata?: any;
}

export interface AlertRule {
  id: string;
  component: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  severity: Alert['severity'];
  cooldown: number; // minutes
  enabled: boolean;
  description: string;
}

export class AlertService {
  private config: MonitoringConfig;
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private lastAlertTimes: Map<string, Date> = new Map();
  private metrics: any;
  
  private defaultRules: AlertRule[] = [
    {
      id: 'cpu_high',
      component: 'system',
      metric: 'cpu_usage',
      operator: 'gt',
      threshold: 80,
      severity: 'high',
      cooldown: 15,
      enabled: true,
      description: 'CPU usage above 80%'
    },
    {
      id: 'memory_high',
      component: 'system',
      metric: 'memory_usage',
      operator: 'gt',
      threshold: 85,
      severity: 'high',
      cooldown: 15,
      enabled: true,
      description: 'Memory usage above 85%'
    },
    {
      id: 'disk_high',
      component: 'system',
      metric: 'disk_usage',
      operator: 'gt',
      threshold: 90,
      severity: 'critical',
      cooldown: 30,
      enabled: true,
      description: 'Disk usage above 90%'
    },
    {
      id: 'response_time_high',
      component: 'application',
      metric: 'response_time',
      operator: 'gt',
      threshold: 5000,
      severity: 'medium',
      cooldown: 10,
      enabled: true,
      description: 'Response time above 5 seconds'
    },
    {
      id: 'error_rate_high',
      component: 'application',
      metric: 'error_rate',
      operator: 'gt',
      threshold: 5,
      severity: 'high',
      cooldown: 5,
      enabled: true,
      description: 'Error rate above 5%'
    },
    {
      id: 'database_down',
      component: 'database',
      metric: 'health_status',
      operator: 'eq',
      threshold: 0,
      severity: 'critical',
      cooldown: 1,
      enabled: true,
      description: 'Database connection failed'
    }
  ];
  
  constructor(prometheusMetrics: any, config: MonitoringConfig) {
    this.metrics = prometheusMetrics;
    this.config = config;
    
    // Load thresholds from config
    this.updateRulesFromConfig();
    
    logger.info('Alert service initialized', {
      rulesCount: this.defaultRules.length,
      alertsEnabled: config.alerts.enabled
    });
  }
  
  /**
   * Update alert rules from configuration
   */
  private updateRulesFromConfig(): void {
    const thresholds = this.config.alerts.thresholds;
    
    // Update default rules with config values
    this.defaultRules.forEach(rule => {
      switch (rule.id) {
        case 'cpu_high':
          rule.threshold = thresholds.cpuUsage;
          break;
        case 'memory_high':
          rule.threshold = thresholds.memoryUsage;
          break;
        case 'disk_high':
          rule.threshold = thresholds.diskUsage;
          break;
        case 'response_time_high':
          rule.threshold = thresholds.responseTime;
          break;
        case 'error_rate_high':
          rule.threshold = thresholds.errorRate;
          break;
      }
      rule.cooldown = this.config.alerts.cooldown;
    });
  }
  
  /**
   * Evaluate system metrics against alert rules
   */
  public evaluateSystemMetrics(metrics: SystemMetrics): Alert[] {
    if (!this.config.alerts.enabled) {
      return [];
    }
    
    const triggeredAlerts: Alert[] = [];
    
    // CPU usage alert
    const cpuAlert = this.evaluateRule('cpu_high', metrics.cpu.usage);
    if (cpuAlert) {
      triggeredAlerts.push(cpuAlert);
    }
    
    // Memory usage alert
    const memoryAlert = this.evaluateRule('memory_high', metrics.memory.usagePercentage);
    if (memoryAlert) {
      triggeredAlerts.push(memoryAlert);
    }
    
    // Disk usage alert
    const diskAlert = this.evaluateRule('disk_high', metrics.disk.usagePercentage);
    if (diskAlert) {
      triggeredAlerts.push(diskAlert);
    }
    
    return triggeredAlerts;
  }
  
  /**
   * Evaluate application metrics against alert rules
   */
  public evaluateApplicationMetrics(metrics: ApplicationMetrics): Alert[] {
    if (!this.config.alerts.enabled) {
      return [];
    }
    
    const triggeredAlerts: Alert[] = [];
    
    // Error rate alert
    if (metrics.http.errorRate > 0) {
      const errorAlert = this.evaluateRule('error_rate_high', metrics.http.errorRate);
      if (errorAlert) {
        triggeredAlerts.push(errorAlert);
      }
    }
    
    // Response time alert
    if (metrics.http.averageResponseTime > 0) {
      const responseAlert = this.evaluateRule('response_time_high', metrics.http.averageResponseTime);
      if (responseAlert) {
        triggeredAlerts.push(responseAlert);
      }
    }
    
    return triggeredAlerts;
  }
  
  /**
   * Evaluate health check results
   */
  public evaluateHealthChecks(healthChecks: HealthCheckResult[]): Alert[] {
    if (!this.config.alerts.enabled) {
      return [];
    }
    
    const triggeredAlerts: Alert[] = [];
    
    healthChecks.forEach(check => {
      if (check.status === 'unhealthy') {
        const alertId = `health_${check.component}`;
        
        if (this.shouldTriggerAlert(alertId)) {
          const alert = this.createAlert({
            id: alertId,
            component: check.component,
            severity: 'critical',
            title: `${check.component} Health Check Failed`,
            description: check.message,
            metadata: {
              responseTime: check.responseTime,
              details: check.details
            }
          });
          
          triggeredAlerts.push(alert);
        }
      } else if (check.status === 'degraded') {
        const alertId = `degraded_${check.component}`;
        
        if (this.shouldTriggerAlert(alertId)) {
          const alert = this.createAlert({
            id: alertId,
            component: check.component,
            severity: 'medium',
            title: `${check.component} Performance Degraded`,
            description: check.message,
            metadata: {
              responseTime: check.responseTime,
              details: check.details
            }
          });
          
          triggeredAlerts.push(alert);
        }
      }
    });
    
    return triggeredAlerts;
  }
  
  /**
   * Evaluate a specific rule
   */
  private evaluateRule(ruleId: string, value: number): Alert | null {
    const rule = this.defaultRules.find(r => r.id === ruleId);
    if (!rule || !rule.enabled) {
      return null;
    }
    
    const shouldAlert = this.checkThreshold(value, rule.threshold, rule.operator);
    
    if (shouldAlert && this.shouldTriggerAlert(ruleId)) {
      return this.createAlert({
        id: ruleId,
        component: rule.component,
        severity: rule.severity,
        title: rule.description,
        description: `${rule.metric} is ${value}${rule.metric.includes('percentage') ? '%' : ''}, threshold: ${rule.threshold}${rule.metric.includes('percentage') ? '%' : ''}`,
        metric: rule.metric,
        value,
        threshold: rule.threshold
      });
    }
    
    return null;
  }
  
  /**
   * Check if value exceeds threshold based on operator
   */
  private checkThreshold(value: number, threshold: number, operator: AlertRule['operator']): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }
  
  /**
   * Check if alert should be triggered (considering cooldown)
   */
  private shouldTriggerAlert(alertId: string): boolean {
    const lastAlertTime = this.lastAlertTimes.get(alertId);
    if (!lastAlertTime) {
      return true;
    }
    
    const rule = this.defaultRules.find(r => r.id === alertId);
    const cooldownMs = (rule?.cooldown || this.config.alerts.cooldown) * 60 * 1000;
    
    return Date.now() - lastAlertTime.getTime() > cooldownMs;
  }
  
  /**
   * Create and register an alert
   */
  private createAlert(alertData: Partial<Alert>): Alert {
    const alert: Alert = {
      id: alertData.id || `alert_${Date.now()}`,
      timestamp: new Date(),
      severity: alertData.severity || 'medium',
      component: alertData.component || 'unknown',
      title: alertData.title || 'Alert',
      description: alertData.description || '',
      metric: alertData.metric,
      value: alertData.value,
      threshold: alertData.threshold,
      status: 'active',
      metadata: alertData.metadata
    };
    
    // Register alert
    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);
    this.lastAlertTimes.set(alert.id, alert.timestamp);
    
    // Update Prometheus metrics
    this.metrics.alertsTotal.labels(alert.severity, alert.component).inc();
    
    // Log alert
    logger.warn('Alert triggered', {
      id: alert.id,
      severity: alert.severity,
      component: alert.component,
      title: alert.title,
      value: alert.value,
      threshold: alert.threshold
    });
    
    // Send notification
    this.sendNotification(alert);
    
    return alert;
  }
  
  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }
    
    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    
    this.activeAlerts.delete(alertId);
    
    logger.info('Alert resolved', {
      id: alertId,
      duration: alert.resolvedAt.getTime() - alert.timestamp.getTime()
    });
    
    return true;
  }
  
  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }
    
    alert.status = 'acknowledged';
    
    logger.info('Alert acknowledged', { id: alertId });
    
    return true;
  }
  
  /**
   * Send alert notification
   */
  private async sendNotification(alert: Alert): Promise<void> {
    try {
      // Email notification
      if (this.config.notifications?.email) {
        await this.sendEmailNotification(alert);
      }
      
      // Webhook notification
      if (this.config.notifications?.webhook) {
        await this.sendWebhookNotification(alert);
      }
      
      // For now, just log the notification
      logger.info('Alert notification sent', {
        id: alert.id,
        severity: alert.severity,
        title: alert.title
      });
      
    } catch (error: any) {
      logger.error('Failed to send alert notification', {
        alertId: alert.id,
        error: error.message
      });
    }
  }
  
  /**
   * Send email notification
   */
  private async sendEmailNotification(alert: Alert): Promise<void> {
    // TODO: Implement actual email sending
    logger.info('Email notification would be sent', {
      to: this.config.notifications?.email,
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      alert: {
        id: alert.id,
        component: alert.component,
        description: alert.description,
        timestamp: alert.timestamp
      }
    });
  }
  
  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(alert: Alert): Promise<void> {
    // TODO: Implement webhook sending
    logger.info('Webhook notification would be sent', {
      url: this.config.notifications?.webhook,
      alert: {
        id: alert.id,
        severity: alert.severity,
        component: alert.component,
        title: alert.title,
        description: alert.description,
        timestamp: alert.timestamp,
        value: alert.value,
        threshold: alert.threshold
      }
    });
  }
  
  /**
   * Get active alerts
   */
  public getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  /**
   * Get alert history
   */
  public getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  /**
   * Get alerts by component
   */
  public getAlertsByComponent(component: string): Alert[] {
    return this.alertHistory
      .filter(alert => alert.component === component)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  /**
   * Get alerts by severity
   */
  public getAlertsBySeverity(severity: Alert['severity']): Alert[] {
    return this.alertHistory
      .filter(alert => alert.severity === severity)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  /**
   * Get alert statistics
   */
  public getAlertStatistics(): any {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const alerts24h = this.alertHistory.filter(a => a.timestamp > last24h);
    const alerts7d = this.alertHistory.filter(a => a.timestamp > last7d);
    
    const severityCounts = this.alertHistory.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const componentCounts = this.alertHistory.reduce((acc, alert) => {
      acc[alert.component] = (acc[alert.component] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: this.alertHistory.length,
      active: this.activeAlerts.size,
      last24h: alerts24h.length,
      last7d: alerts7d.length,
      bySeverity: severityCounts,
      byComponent: componentCounts,
      averageResolutionTime: this.calculateAverageResolutionTime(),
      mttr: this.calculateMTTR() // Mean Time To Resolution
    };
  }
  
  /**
   * Calculate average resolution time
   */
  private calculateAverageResolutionTime(): number {
    const resolvedAlerts = this.alertHistory.filter(a => a.resolvedAt);
    if (resolvedAlerts.length === 0) return 0;
    
    const totalTime = resolvedAlerts.reduce((sum, alert) => {
      return sum + (alert.resolvedAt!.getTime() - alert.timestamp.getTime());
    }, 0);
    
    return Math.round(totalTime / resolvedAlerts.length / 1000); // seconds
  }
  
  /**
   * Calculate Mean Time To Resolution
   */
  private calculateMTTR(): number {
    return this.calculateAverageResolutionTime() / 60; // minutes
  }
  
  /**
   * Clear old alerts from history
   */
  public clearOldAlerts(): number {
    const retentionMs = this.config.retention.alerts * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - retentionMs);
    
    const initialCount = this.alertHistory.length;
    this.alertHistory = this.alertHistory.filter(alert => alert.timestamp > cutoffDate);
    const clearedCount = initialCount - this.alertHistory.length;
    
    if (clearedCount > 0) {
      logger.info('Old alerts cleared', {
        cleared: clearedCount,
        remaining: this.alertHistory.length,
        cutoffDate
      });
    }
    
    return clearedCount;
  }
  
  /**
   * Test alert system
   */
  public createTestAlert(): Alert {
    return this.createAlert({
      id: `test_alert_${Date.now()}`,
      component: 'test',
      severity: 'low',
      title: 'Test Alert',
      description: 'This is a test alert to verify the alert system is working',
      metadata: {
        type: 'test',
        timestamp: new Date()
      }
    });
  }
}
