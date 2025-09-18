import React, { useState, useEffect } from 'react';
import { monitoringService, backupService } from '../services/api';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../contexts/AuthContext';
import {
  RefreshCw, AlertTriangle, CheckCircle, Database, Clock,
  FileText, Activity, HardDrive, Cpu, Download, Settings,
  Eye, RotateCcw, Trash2, Wrench, Server, Shield, Archive
} from 'lucide-react';

interface SystemHealth {
  status: string;
  timestamp: string;
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
  components: Array<{
    component: string;
    status: string;
    message: string;
    responseTime: number;
  }>;
  monitoring: {
    scheduler: string;
    activeJobs: number;
    errorJobs: number;
  };
}

interface SystemMetrics {
  timestamp: string;
  system: {
    uptime: string;
    platform: string;
    arch: string;
    version: string;
  };
  cpu: {
    usage: string;
    cores: number;
    model: string;
  };
  memory: {
    total: string;
    free: string;
    used: string;
    usagePercentage: string;
  };
  disk: {
    total: string;
    free: string;
    used: string;
    usagePercentage: string;
  };
  process: {
    uptime: string;
    memory: string;
    memoryPercentage: string;
    pid: number;
  };
}

interface BackupInfo {
  status: string;
  timestamp: string;
  scheduler: {
    initialized: boolean;
    activeJobs: number;
    totalJobs: number;
    errorJobs: number;
  };
  configuration: {
    databaseBackupEnabled: boolean;
    filesBackupEnabled: boolean;
    localStorageEnabled: boolean;
    notificationsEnabled: boolean;
  };
  storage: {
    backupDirectory: string;
    retention: number;
  };
}

const SystemPage: React.FC = () => {
  const { user } = useAuth();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [backup, setBackup] = useState<BackupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);

  useEffect(() => {
    loadSystemData();
    // Refresh every 30 seconds
    const interval = setInterval(loadSystemData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemData = async () => {
    try {
      setLoading(true);
      setError('');

      const [healthResponse, metricsResponse, backupResponse] = await Promise.allSettled([
        monitoringService.getSystemHealth(),
        monitoringService.getSystemMetrics(),
        backupService.getBackupStatus()
      ]);

      if (healthResponse.status === 'fulfilled' && healthResponse.value.success) {
        setHealth(healthResponse.value.data);
      }

      if (metricsResponse.status === 'fulfilled' && metricsResponse.value.success) {
        setMetrics(metricsResponse.value.data);
      }

      if (backupResponse.status === 'fulfilled' && backupResponse.value.success) {
        setBackup(backupResponse.value.data);
      }

    } catch (err: any) {
      console.error('Error loading system data:', err);
      setError('Errore nel caricamento dei dati di sistema');
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    try {
      setBackupLoading(true);
      const response = await backupService.createBackup();
      if (response.success) {
        // Refresh backup status
        loadSystemData();
      }
    } catch (err: any) {
      console.error('Error creating backup:', err);
      setError('Errore nella creazione del backup');
    } finally {
      setBackupLoading(false);
    }
  };

  const parsePercentage = (percentageStr: string): number => {
    return parseFloat(percentageStr.replace('%', '')) || 0;
  };

  // Only admins can access this page
  if (user?.role !== 'ADMIN') {
    return (
      <Layout>
        <Card>
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Accesso Negato
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Solo gli amministratori possono accedere al pannello di sistema.
            </p>
          </div>
        </Card>
      </Layout>
    );
  }

  if (loading && !health) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  const isHealthy = health?.status === 'healthy';
  const dbComponent = health?.components?.find(c => c.component.toLowerCase().includes('database'));
  const isDatabaseHealthy = dbComponent?.status === 'healthy';

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Monitoraggio Sistema</h1>
              <p className="mt-2 text-sm text-gray-700">
                Stato del sistema e strumenti di amministrazione
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <Button
                variant="secondary"
                onClick={loadSystemData}
                icon={<RefreshCw className="h-4 w-4" />}
                loading={loading}
              >
                Aggiorna
              </Button>
            </div>
          </div>

          {error && (
            <ErrorMessage message={error} onDismiss={() => setError('')} />
          )}

          {/* System Health Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card padding="sm" className={`${
              isHealthy ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isHealthy ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {isHealthy ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${
                    isHealthy ? 'text-green-800' : 'text-red-800'
                  }`}>
                    Stato Sistema
                  </p>
                  <p className={`text-2xl font-semibold ${
                    isHealthy ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {health?.status === 'healthy' ? 'Sano' :
                     health?.status === 'degraded' ? 'Degradato' : 'Errore'}
                  </p>
                </div>
              </div>
            </Card>

            <Card padding="sm" className={`${
              isDatabaseHealthy ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isDatabaseHealthy ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <Database className={`w-5 h-5 ${
                      isDatabaseHealthy ? 'text-green-600' : 'text-red-600'
                    }`} />
                  </div>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${
                    isDatabaseHealthy ? 'text-green-800' : 'text-red-800'
                  }`}>
                    Database
                  </p>
                  <p className={`text-2xl font-semibold ${
                    isDatabaseHealthy ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {isDatabaseHealthy ? 'Connesso' : 'Disconnesso'}
                  </p>
                </div>
              </div>
            </Card>

            <Card padding="sm" className="bg-blue-50 border-blue-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-800">Uptime</p>
                  <p className="text-2xl font-semibold text-blue-900">
                    {metrics?.system?.uptime || 'N/A'}
                  </p>
                </div>
              </div>
            </Card>

            <Card padding="sm" className="bg-purple-50 border-purple-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-purple-800">Versione</p>
                  <p className="text-2xl font-semibold text-purple-900">
                    {metrics?.system?.version || '1.0.0'}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* System Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informazioni Sistema</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Piattaforma</dt>
                  <dd className="text-sm text-gray-900">{metrics?.system?.platform || 'N/A'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Architettura</dt>
                  <dd className="text-sm text-gray-900">{metrics?.system?.arch || 'N/A'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">CPU</dt>
                  <dd className="text-sm text-gray-900">{metrics?.cpu?.cores} core</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Componenti Sani</dt>
                  <dd className="text-sm text-gray-900">
                    {health?.summary?.healthy || 0} / {(health?.summary?.healthy || 0) + (health?.summary?.degraded || 0) + (health?.summary?.unhealthy || 0)}
                  </dd>
                </div>
              </dl>
            </Card>

            <Card>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Risorse Sistema</h3>

              {/* Memory Usage */}
              {metrics?.memory && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Memoria</span>
                    <span className="text-gray-500">
                      {metrics.memory.usagePercentage} utilizzata
                    </span>
                  </div>
                  <div className="mt-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        parsePercentage(metrics.memory.usagePercentage) > 80 ? 'bg-red-600' :
                        parsePercentage(metrics.memory.usagePercentage) > 60 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: metrics.memory.usagePercentage }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {metrics.memory.used} / {metrics.memory.total}
                  </div>
                </div>
              )}

              {/* Disk Usage */}
              {metrics?.disk && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Disco</span>
                    <span className="text-gray-500">
                      {metrics.disk.usagePercentage} utilizzato
                    </span>
                  </div>
                  <div className="mt-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        parsePercentage(metrics.disk.usagePercentage) > 90 ? 'bg-red-600' :
                        parsePercentage(metrics.disk.usagePercentage) > 70 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: metrics.disk.usagePercentage }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {metrics.disk.used} / {metrics.disk.total}
                  </div>
                </div>
              )}

              {/* CPU Usage */}
              {metrics?.cpu && (
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">CPU</span>
                    <span className="text-gray-500">
                      {metrics.cpu.usage} utilizzo
                    </span>
                  </div>
                  <div className="mt-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        parsePercentage(metrics.cpu.usage) > 80 ? 'bg-red-600' :
                        parsePercentage(metrics.cpu.usage) > 60 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: metrics.cpu.usage }}
                    />
                  </div>
                </div>
              )}

              {!metrics?.memory && !metrics?.disk && !metrics?.cpu && (
                <div className="text-sm text-gray-500">
                  Informazioni sulle risorse non disponibili
                </div>
              )}
            </Card>
          </div>

          {/* Components Status */}
          {health?.components && health.components.length > 0 && (
            <Card>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Stato Componenti</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {health.components.map((component, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {component.status === 'healthy' ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        ) : component.status === 'degraded' ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                        )}
                        <span className="text-sm font-medium">{component.component}</span>
                      </div>
                      <span className="text-xs text-gray-500">{component.responseTime}ms</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{component.message}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Backup Management */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Gestione Backup</h3>
              <Button
                variant="primary"
                onClick={createBackup}
                loading={backupLoading}
                icon={<Download className="h-4 w-4" />}
              >
                Crea Backup Ora
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {backup?.scheduler?.totalJobs || 0}
                </div>
                <div className="text-sm text-gray-600">Job Backup</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {backup?.scheduler?.activeJobs || 0}
                </div>
                <div className="text-sm text-gray-600">Job Attivi</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className={`text-2xl font-bold ${
                  backup?.status === 'healthy' ? 'text-green-900' : 'text-red-900'
                }`}>
                  {backup?.status === 'healthy' ? 'Sano' : 'Errore'}
                </div>
                <div className="text-sm text-gray-600">Stato Sistema</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {backup?.storage?.retention || 7}
                </div>
                <div className="text-sm text-gray-600">Giorni Retention</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" icon={<Eye className="h-4 w-4" />}>
                Visualizza Cronologia
              </Button>
              <Button variant="secondary" size="sm" icon={<Settings className="h-4 w-4" />}>
                Configurazione
              </Button>
              <Button variant="secondary" size="sm" icon={<RotateCcw className="h-4 w-4" />}>
                Ripristina Backup
              </Button>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Azioni Rapide</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                variant="secondary"
                fullWidth
                icon={<Trash2 className="h-4 w-4" />}
              >
                Pulisci Cache
              </Button>
              <Button
                variant="secondary"
                fullWidth
                icon={<Server className="h-4 w-4" />}
              >
                Riavvia Servizi
              </Button>
              <Button
                variant="secondary"
                fullWidth
                icon={<Archive className="h-4 w-4" />}
              >
                Esporta Logs
              </Button>
              <Button
                variant="danger"
                fullWidth
                icon={<Wrench className="h-4 w-4" />}
              >
                Manutenzione
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default SystemPage;