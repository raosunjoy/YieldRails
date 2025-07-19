import { Injectable } from '@nestjs/common';
import { LoggingService } from './LoggingService';
import { RedisService } from './RedisService';
import { AnalyticsService } from './AnalyticsService';

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum AlertCategory {
  SYSTEM = 'system',
  BUSINESS = 'business',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  EXTERNAL_SERVICE = 'external_service'
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  category: AlertCategory;
  source: string;
  data?: any;
  timestamp: Date;
  resolved?: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  category: AlertCategory;
  severity: AlertSeverity;
  condition: string; // JSON condition or function name
  threshold?: number;
  enabled: boolean;
  cooldownMinutes: number; // Prevent spam
  channels: NotificationChannel[];
}

export enum NotificationChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  DISCORD = 'discord',
  WEBHOOK = 'webhook',
  SMS = 'sms',
  DASHBOARD = 'dashboard'
}

export interface NotificationConfig {
  channel: NotificationChannel;
  config: {
    email?: {
      recipients: string[];
      template?: string;
    };
    slack?: {
      webhookUrl: string;
      channel: string;
    };
    discord?: {
      webhookUrl: string;
    };
    webhook?: {
      url: string;
      headers?: Record<string, string>;
    };
    sms?: {
      numbers: string[];
      provider: 'twilio' | 'aws';
    };
  };
}

@Injectable()
export class AlertingService {
  private alertRules: Map<string, AlertRule> = new Map();
  private alertCooldowns: Map<string, Date> = new Map();
  private notifications: Map<NotificationChannel, NotificationConfig> = new Map();

  constructor(
    private loggingService: LoggingService,
    private redisService: RedisService,
    private analyticsService: AnalyticsService
  ) {
    this.initializeAlertRules();
    this.initializeNotificationChannels();
    this.startMonitoring();
  }

  private initializeAlertRules(): void {
    // System alerts
    this.addAlertRule({
      id: 'high_cpu_usage',
      name: 'High CPU Usage',
      description: 'System CPU usage above 80%',
      category: AlertCategory.SYSTEM,
      severity: AlertSeverity.WARNING,
      condition: 'cpu_usage > 80',
      threshold: 80,
      enabled: true,
      cooldownMinutes: 15,
      channels: [NotificationChannel.EMAIL, NotificationChannel.SLACK]
    });

    this.addAlertRule({
      id: 'high_memory_usage',
      name: 'High Memory Usage',
      description: 'System memory usage above 85%',
      category: AlertCategory.SYSTEM,
      severity: AlertSeverity.WARNING,
      condition: 'memory_usage > 85',
      threshold: 85,
      enabled: true,
      cooldownMinutes: 15,
      channels: [NotificationChannel.EMAIL, NotificationChannel.SLACK]
    });

    this.addAlertRule({
      id: 'high_error_rate',
      name: 'High API Error Rate',
      description: 'API error rate above 5%',
      category: AlertCategory.PERFORMANCE,
      severity: AlertSeverity.ERROR,
      condition: 'error_rate > 5',
      threshold: 5,
      enabled: true,
      cooldownMinutes: 10,
      channels: [NotificationChannel.EMAIL, NotificationChannel.SLACK, NotificationChannel.DISCORD]
    });

    this.addAlertRule({
      id: 'slow_api_response',
      name: 'Slow API Response Time',
      description: 'API response time above 2 seconds',
      category: AlertCategory.PERFORMANCE,
      severity: AlertSeverity.WARNING,
      condition: 'api_response_time > 2000',
      threshold: 2000,
      enabled: true,
      cooldownMinutes: 20,
      channels: [NotificationChannel.EMAIL, NotificationChannel.SLACK]
    });

    // Business alerts
    this.addAlertRule({
      id: 'payment_volume_drop',
      name: 'Payment Volume Drop',
      description: 'Payment volume dropped by more than 50% compared to previous day',
      category: AlertCategory.BUSINESS,
      severity: AlertSeverity.ERROR,
      condition: 'payment_volume_drop > 50',
      threshold: 50,
      enabled: true,
      cooldownMinutes: 60,
      channels: [NotificationChannel.EMAIL, NotificationChannel.SLACK]
    });

    this.addAlertRule({
      id: 'failed_payments_spike',
      name: 'Failed Payments Spike',
      description: 'Failed payment rate above 10%',
      category: AlertCategory.BUSINESS,
      severity: AlertSeverity.ERROR,
      condition: 'failed_payment_rate > 10',
      threshold: 10,
      enabled: true,
      cooldownMinutes: 30,
      channels: [NotificationChannel.EMAIL, NotificationChannel.SLACK, NotificationChannel.DISCORD]
    });

    this.addAlertRule({
      id: 'yield_performance_drop',
      name: 'Yield Performance Drop',
      description: 'Average yield rate dropped below expected threshold',
      category: AlertCategory.BUSINESS,
      severity: AlertSeverity.WARNING,
      condition: 'avg_yield_rate < 3',
      threshold: 3,
      enabled: true,
      cooldownMinutes: 45,
      channels: [NotificationChannel.EMAIL, NotificationChannel.SLACK]
    });

    // Security alerts
    this.addAlertRule({
      id: 'suspicious_login_attempts',
      name: 'Suspicious Login Attempts',
      description: 'Multiple failed login attempts from same IP',
      category: AlertCategory.SECURITY,
      severity: AlertSeverity.ERROR,
      condition: 'failed_logins_per_ip > 5',
      threshold: 5,
      enabled: true,
      cooldownMinutes: 5,
      channels: [NotificationChannel.EMAIL, NotificationChannel.SLACK, NotificationChannel.DISCORD]
    });

    this.addAlertRule({
      id: 'large_transaction_alert',
      name: 'Large Transaction Alert',
      description: 'Transaction amount above $100,000',
      category: AlertCategory.SECURITY,
      severity: AlertSeverity.INFO,
      condition: 'transaction_amount > 100000',
      threshold: 100000,
      enabled: true,
      cooldownMinutes: 0, // No cooldown for compliance alerts
      channels: [NotificationChannel.EMAIL, NotificationChannel.SLACK]
    });

    // External service alerts
    this.addAlertRule({
      id: 'external_service_down',
      name: 'External Service Down',
      description: 'External DeFi service is unavailable',
      category: AlertCategory.EXTERNAL_SERVICE,
      severity: AlertSeverity.CRITICAL,
      condition: 'external_service_status == "down"',
      enabled: true,
      cooldownMinutes: 5,
      channels: [NotificationChannel.EMAIL, NotificationChannel.SLACK, NotificationChannel.DISCORD]
    });

    this.addAlertRule({
      id: 'external_service_slow',
      name: 'External Service Slow',
      description: 'External service response time above 5 seconds',
      category: AlertCategory.EXTERNAL_SERVICE,
      severity: AlertSeverity.WARNING,
      condition: 'external_service_response_time > 5000',
      threshold: 5000,
      enabled: true,
      cooldownMinutes: 15,
      channels: [NotificationChannel.EMAIL, NotificationChannel.SLACK]
    });
  }

  private initializeNotificationChannels(): void {
    // Email configuration
    this.notifications.set(NotificationChannel.EMAIL, {
      channel: NotificationChannel.EMAIL,
      config: {
        email: {
          recipients: [
            process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || ['admin@yieldrails.com']
          ].flat(),
          template: 'alert_notification'
        }
      }
    });

    // Slack configuration
    if (process.env.SLACK_WEBHOOK_URL) {
      this.notifications.set(NotificationChannel.SLACK, {
        channel: NotificationChannel.SLACK,
        config: {
          slack: {
            webhookUrl: process.env.SLACK_WEBHOOK_URL,
            channel: process.env.SLACK_ALERT_CHANNEL || '#alerts'
          }
        }
      });
    }

    // Discord configuration
    if (process.env.DISCORD_WEBHOOK_URL) {
      this.notifications.set(NotificationChannel.DISCORD, {
        channel: NotificationChannel.DISCORD,
        config: {
          discord: {
            webhookUrl: process.env.DISCORD_WEBHOOK_URL
          }
        }
      });
    }
  }

  async triggerAlert(alert: Omit<Alert, 'id' | 'timestamp'>): Promise<void> {
    const alertId = this.generateAlertId(alert);
    
    // Check cooldown
    if (this.isInCooldown(alertId)) {
      this.loggingService.debug('Alert skipped due to cooldown', { alertId });
      return;
    }

    const fullAlert: Alert = {
      ...alert,
      id: alertId,
      timestamp: new Date()
    };

    // Store alert
    await this.storeAlert(fullAlert);

    // Find matching rules and send notifications
    const matchingRules = this.findMatchingRules(alert);
    for (const rule of matchingRules) {
      if (rule.enabled) {
        await this.sendNotifications(fullAlert, rule);
        this.setCooldown(alertId, rule.cooldownMinutes);
      }
    }

    this.loggingService.info('Alert triggered', {
      alertId: fullAlert.id,
      severity: fullAlert.severity,
      category: fullAlert.category,
      source: fullAlert.source
    });
  }

  async resolveAlert(alertId: string, resolvedBy: string): Promise<void> {
    try {
      const alertKey = `alert:${alertId}`;
      const alertData = await this.redisService.get(alertKey);
      
      if (alertData) {
        const alert: Alert = JSON.parse(alertData);
        alert.resolved = true;
        alert.resolvedAt = new Date();
        alert.resolvedBy = resolvedBy;
        
        await this.redisService.setex(alertKey, 86400, JSON.stringify(alert)); // Keep for 24 hours
        
        this.loggingService.info('Alert resolved', {
          alertId,
          resolvedBy,
          severity: alert.severity
        });
      }
    } catch (error) {
      this.loggingService.error('Failed to resolve alert', error, { alertId, resolvedBy });
    }
  }

  async getActiveAlerts(category?: AlertCategory): Promise<Alert[]> {
    try {
      const pattern = 'alert:*';
      const keys = await this.redisService.keys(pattern);
      const alerts: Alert[] = [];

      for (const key of keys) {
        const alertData = await this.redisService.get(key);
        if (alertData) {
          const alert: Alert = JSON.parse(alertData);
          if (!alert.resolved && (!category || alert.category === category)) {
            alerts.push(alert);
          }
        }
      }

      return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      this.loggingService.error('Failed to get active alerts', error);
      return [];
    }
  }

  async getAlertHistory(hours: number = 24): Promise<Alert[]> {
    try {
      const pattern = 'alert:*';
      const keys = await this.redisService.keys(pattern);
      const alerts: Alert[] = [];
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      for (const key of keys) {
        const alertData = await this.redisService.get(key);
        if (alertData) {
          const alert: Alert = JSON.parse(alertData);
          if (alert.timestamp >= cutoffTime) {
            alerts.push(alert);
          }
        }
      }

      return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      this.loggingService.error('Failed to get alert history', error);
      return [];
    }
  }

  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    this.loggingService.info('Alert rule added', { ruleId: rule.id, name: rule.name });
  }

  removeAlertRule(ruleId: string): void {
    this.alertRules.delete(ruleId);
    this.loggingService.info('Alert rule removed', { ruleId });
  }

  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): void {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      const updatedRule = { ...rule, ...updates };
      this.alertRules.set(ruleId, updatedRule);
      this.loggingService.info('Alert rule updated', { ruleId, updates });
    }
  }

  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  private async storeAlert(alert: Alert): Promise<void> {
    try {
      const key = `alert:${alert.id}`;
      await this.redisService.setex(key, 86400, JSON.stringify(alert)); // Store for 24 hours
    } catch (error) {
      this.loggingService.error('Failed to store alert', error, { alertId: alert.id });
    }
  }

  private findMatchingRules(alert: Omit<Alert, 'id' | 'timestamp'>): AlertRule[] {
    return Array.from(this.alertRules.values()).filter(rule => 
      rule.category === alert.category && rule.severity === alert.severity
    );
  }

  private async sendNotifications(alert: Alert, rule: AlertRule): Promise<void> {
    const promises = rule.channels.map(channel => this.sendNotification(alert, channel));
    await Promise.allSettled(promises);
  }

  private async sendNotification(alert: Alert, channel: NotificationChannel): Promise<void> {
    const config = this.notifications.get(channel);
    if (!config) {
      this.loggingService.warn('Notification channel not configured', { channel });
      return;
    }

    try {
      switch (channel) {
        case NotificationChannel.EMAIL:
          await this.sendEmailNotification(alert, config);
          break;
        case NotificationChannel.SLACK:
          await this.sendSlackNotification(alert, config);
          break;
        case NotificationChannel.DISCORD:
          await this.sendDiscordNotification(alert, config);
          break;
        case NotificationChannel.WEBHOOK:
          await this.sendWebhookNotification(alert, config);
          break;
        case NotificationChannel.SMS:
          await this.sendSMSNotification(alert, config);
          break;
        case NotificationChannel.DASHBOARD:
          await this.sendDashboardNotification(alert);
          break;
      }
      
      this.loggingService.info('Notification sent', {
        alertId: alert.id,
        channel,
        severity: alert.severity
      });
    } catch (error) {
      this.loggingService.error('Failed to send notification', error, {
        alertId: alert.id,
        channel
      });
    }
  }

  private async sendEmailNotification(alert: Alert, config: NotificationConfig): Promise<void> {
    // Implementation would integrate with email service (SendGrid, AWS SES, etc.)
    const emailConfig = config.config.email!;
    
    // Mock implementation
    this.loggingService.info('Email notification sent', {
      recipients: emailConfig.recipients,
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      alertId: alert.id
    });
  }

  private async sendSlackNotification(alert: Alert, config: NotificationConfig): Promise<void> {
    const slackConfig = config.config.slack!;
    
    const color = this.getSlackColor(alert.severity);
    const payload = {
      channel: slackConfig.channel,
      username: 'YieldRails Alerts',
      icon_emoji: ':warning:',
      attachments: [
        {
          color,
          title: alert.title,
          text: alert.description,
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true
            },
            {
              title: 'Category',
              value: alert.category,
              short: true
            },
            {
              title: 'Source',
              value: alert.source,
              short: true
            },
            {
              title: 'Time',
              value: alert.timestamp.toISOString(),
              short: true
            }
          ],
          footer: 'YieldRails Monitoring',
          ts: Math.floor(alert.timestamp.getTime() / 1000)
        }
      ]
    };

    // Mock implementation - would use fetch to send to Slack webhook
    this.loggingService.info('Slack notification sent', {
      webhookUrl: slackConfig.webhookUrl,
      channel: slackConfig.channel,
      alertId: alert.id
    });
  }

  private async sendDiscordNotification(alert: Alert, config: NotificationConfig): Promise<void> {
    const discordConfig = config.config.discord!;
    
    const color = this.getDiscordColor(alert.severity);
    const payload = {
      embeds: [
        {
          title: alert.title,
          description: alert.description,
          color,
          fields: [
            {
              name: 'Severity',
              value: alert.severity.toUpperCase(),
              inline: true
            },
            {
              name: 'Category',
              value: alert.category,
              inline: true
            },
            {
              name: 'Source',
              value: alert.source,
              inline: true
            }
          ],
          timestamp: alert.timestamp.toISOString(),
          footer: {
            text: 'YieldRails Monitoring'
          }
        }
      ]
    };

    // Mock implementation - would use fetch to send to Discord webhook
    this.loggingService.info('Discord notification sent', {
      webhookUrl: discordConfig.webhookUrl,
      alertId: alert.id
    });
  }

  private async sendWebhookNotification(alert: Alert, config: NotificationConfig): Promise<void> {
    // Implementation would send HTTP POST to webhook URL
    this.loggingService.info('Webhook notification sent', {
      url: config.config.webhook?.url,
      alertId: alert.id
    });
  }

  private async sendSMSNotification(alert: Alert, config: NotificationConfig): Promise<void> {
    // Implementation would integrate with SMS service (Twilio, AWS SNS, etc.)
    this.loggingService.info('SMS notification sent', {
      numbers: config.config.sms?.numbers,
      alertId: alert.id
    });
  }

  private async sendDashboardNotification(alert: Alert): Promise<void> {
    // Store alert for dashboard display
    const key = `dashboard_alert:${alert.id}`;
    await this.redisService.setex(key, 3600, JSON.stringify(alert)); // Store for 1 hour
  }

  private generateAlertId(alert: Omit<Alert, 'id' | 'timestamp'>): string {
    const hash = require('crypto')
      .createHash('md5')
      .update(`${alert.category}-${alert.source}-${alert.title}`)
      .digest('hex');
    return `${alert.category}_${hash.substring(0, 8)}`;
  }

  private isInCooldown(alertId: string): boolean {
    const cooldownEnd = this.alertCooldowns.get(alertId);
    return cooldownEnd ? cooldownEnd > new Date() : false;
  }

  private setCooldown(alertId: string, minutes: number): void {
    if (minutes > 0) {
      const cooldownEnd = new Date(Date.now() + minutes * 60 * 1000);
      this.alertCooldowns.set(alertId, cooldownEnd);
    }
  }

  private getSlackColor(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL: return 'danger';
      case AlertSeverity.ERROR: return 'warning';
      case AlertSeverity.WARNING: return '#ff9900';
      case AlertSeverity.INFO: return 'good';
      default: return '#cccccc';
    }
  }

  private getDiscordColor(severity: AlertSeverity): number {
    switch (severity) {
      case AlertSeverity.CRITICAL: return 0xff0000; // Red
      case AlertSeverity.ERROR: return 0xff9900; // Orange
      case AlertSeverity.WARNING: return 0xffff00; // Yellow
      case AlertSeverity.INFO: return 0x00ff00; // Green
      default: return 0xcccccc; // Gray
    }
  }

  private startMonitoring(): void {
    // Start periodic monitoring checks
    setInterval(async () => {
      await this.runSystemChecks();
    }, 60000); // Check every minute

    setInterval(async () => {
      await this.runBusinessChecks();
    }, 300000); // Check every 5 minutes

    setInterval(async () => {
      await this.cleanupOldAlerts();
    }, 3600000); // Cleanup every hour
  }

  private async runSystemChecks(): Promise<void> {
    try {
      const metrics = await this.analyticsService.getPerformanceMetrics();
      
      // Check CPU usage
      if (metrics.systemHealth.cpuUsage > 80) {
        await this.triggerAlert({
          title: 'High CPU Usage',
          description: `CPU usage at ${metrics.systemHealth.cpuUsage.toFixed(1)}%`,
          severity: AlertSeverity.WARNING,
          category: AlertCategory.SYSTEM,
          source: 'system_monitor',
          data: { cpuUsage: metrics.systemHealth.cpuUsage }
        });
      }

      // Check memory usage
      if (metrics.systemHealth.memoryUsage > 85) {
        await this.triggerAlert({
          title: 'High Memory Usage',
          description: `Memory usage at ${metrics.systemHealth.memoryUsage.toFixed(1)}%`,
          severity: AlertSeverity.WARNING,
          category: AlertCategory.SYSTEM,
          source: 'system_monitor',
          data: { memoryUsage: metrics.systemHealth.memoryUsage }
        });
      }

      // Check error rate
      if (metrics.errorRates.overall > 5) {
        await this.triggerAlert({
          title: 'High API Error Rate',
          description: `API error rate at ${metrics.errorRates.overall.toFixed(2)}%`,
          severity: AlertSeverity.ERROR,
          category: AlertCategory.PERFORMANCE,
          source: 'api_monitor',
          data: { errorRate: metrics.errorRates.overall }
        });
      }

      // Check response time
      if (metrics.apiResponseTime.average > 2000) {
        await this.triggerAlert({
          title: 'Slow API Response Time',
          description: `Average response time at ${metrics.apiResponseTime.average.toFixed(0)}ms`,
          severity: AlertSeverity.WARNING,
          category: AlertCategory.PERFORMANCE,
          source: 'api_monitor',
          data: { responseTime: metrics.apiResponseTime.average }
        });
      }
    } catch (error) {
      this.loggingService.error('Failed to run system checks', error);
    }
  }

  private async runBusinessChecks(): Promise<void> {
    try {
      const metrics = await this.analyticsService.getBusinessMetrics('day');
      const realTimeMetrics = await this.analyticsService.getRealTimeMetrics();
      
      // Check for failed payments spike
      // This would need actual failed payment tracking
      
      // Check yield performance
      const yieldAnalytics = await this.analyticsService.getYieldAnalytics();
      if (yieldAnalytics.averageYieldRate < 3) {
        await this.triggerAlert({
          title: 'Low Yield Performance',
          description: `Average yield rate dropped to ${yieldAnalytics.averageYieldRate.toFixed(2)}%`,
          severity: AlertSeverity.WARNING,
          category: AlertCategory.BUSINESS,
          source: 'yield_monitor',
          data: { averageYieldRate: yieldAnalytics.averageYieldRate }
        });
      }
    } catch (error) {
      this.loggingService.error('Failed to run business checks', error);
    }
  }

  private async cleanupOldAlerts(): Promise<void> {
    try {
      const pattern = 'alert:*';
      const keys = await this.redisService.keys(pattern);
      const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      
      for (const key of keys) {
        const alertData = await this.redisService.get(key);
        if (alertData) {
          const alert: Alert = JSON.parse(alertData);
          if (alert.timestamp < cutoffTime) {
            await this.redisService.del(key);
          }
        }
      }
      
      // Cleanup cooldowns
      const now = new Date();
      for (const [alertId, cooldownEnd] of this.alertCooldowns.entries()) {
        if (cooldownEnd <= now) {
          this.alertCooldowns.delete(alertId);
        }
      }
    } catch (error) {
      this.loggingService.error('Failed to cleanup old alerts', error);
    }
  }
}
