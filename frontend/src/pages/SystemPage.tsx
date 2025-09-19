import React, { useState, useEffect } from 'react';
import { monitoringService, backupService } from '../services/api';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import BackupHistoryModal from '../components/BackupHistoryModal';
import BackupConfigModal from '../components/BackupConfigModal';
import BackupRestoreModal from '../components/BackupRestoreModal';
import { useAuth } from '../contexts/AuthContext';
import {
  RefreshCw, AlertTriangle, CheckCircle, Database, Clock,
  FileText, Activity, HardDrive, Cpu, Download, Settings,
  Eye, RotateCcw, Trash2, Wrench, Server, Shield, Archive, X
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
    retention: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
}

const SystemPage: React.FC = () => {
  const { user } = useAuth();

  // Job descriptions and schedules
  const getJobDescriptions = () => {
    return [
      {
        name: 'Backup Database',
        schedule: 'Ogni giorno alle 02:00',
        description: 'Crea automaticamente backup del database con compressione',
        color: 'text-blue-700',
        active: backup?.scheduler?.activeJobs > 0
      },
      {
        name: 'Backup File',
        schedule: 'Ogni domenica alle 03:00',
        description: 'Crea backup di immagini, documenti e file caricati',
        color: 'text-green-700',
        active: backup?.scheduler?.activeJobs > 0
      },
      {
        name: 'Pulizia Database',
        schedule: 'Ogni giorno alle 01:00',
        description: 'Rimuove backup database vecchi secondo retention policy',
        color: 'text-orange-700',
        active: backup?.scheduler?.activeJobs > 0
      },
      {
        name: 'Pulizia File',
        schedule: 'Ogni giorno alle 01:30',
        description: 'Rimuove backup file vecchi per liberare spazio disco',
        color: 'text-purple-700',
        active: backup?.scheduler?.activeJobs > 0
      }
    ];
  };
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [backup, setBackup] = useState<BackupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modals state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [success, setSuccess] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    loadSystemData();
    // Refresh every 5 minutes (conservative to avoid rate limiting)
    const interval = setInterval(loadSystemData, 300000);
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

      // Handle rate limiting specifically
      if (err.response?.status === 429 || err.message?.includes('Too many requests')) {
        console.warn('Rate limit exceeded, skipping refresh');
        // Don't show error to user for rate limiting during auto-refresh
        return;
      }

      setError('Errore nel caricamento dei dati di sistema');
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  const createBackup = async () => {
    try {
      setBackupLoading(true);
      setError('');
      setSuccess('');

      // Check user permissions
      if (user?.role !== 'ADMIN') {
        setError('Solo gli amministratori possono creare backup');
        return;
      }

      // Show progress message
      setSuccess('🔄 Creazione backup in corso (database + file)...');

      const response = await backupService.createBackup();
      if (response.success) {
        const backupData = response.data;

        // Handle combined backup (database + files)
        if (backupData.combined) {
          const dbData = backupData.database;
          const filesData = backupData.files;
          const totalRecords = Object.values(dbData.metadata.recordCounts).reduce((a: number, b: number) => a + b, 0);

          setSuccess(
            `✅ Backup completo creato con successo! ` +
            `Database: ${dbData.size} (${dbData.metadata.tables.length} tabelle, ${totalRecords} record) | ` +
            `File: ${filesData.size} (${filesData.metadata.fileCount} file) | ` +
            `Durata totale: ${Math.max(dbData.duration, filesData.duration)}ms`
          );
        }
        // Handle partial success (only database or with file error)
        else if (backupData.database && !backupData.files) {
          const dbData = backupData.database;
          const totalRecords = Object.values(dbData.metadata.recordCounts).reduce((a: number, b: number) => a + b, 0);

          setSuccess(
            `⚠️ Backup database completato, errore nei file. ` +
            `Database: ${dbData.size} (${dbData.metadata.tables.length} tabelle, ${totalRecords} record) | ` +
            `Errore file: ${backupData.error}`
          );
        }
        // Handle single backup (legacy or manual database only)
        else if (backupData.metadata) {
          const totalRecords = Object.values(backupData.metadata.recordCounts).reduce((a: number, b: number) => a + b, 0);

          setSuccess(
            `✅ Backup database completato! ` +
            `File: ${backupData.size} | ` +
            `${backupData.metadata.tables.length} tabelle | ` +
            `${totalRecords} record | ` +
            `Completato in ${backupData.duration}ms`
          );
        }

        // Auto-dismiss success message after 15 seconds (longer for detailed messages)
        setTimeout(() => {
          setSuccess('');
        }, 15000);

        // Refresh backup status
        loadSystemData();
      } else {
        setError(response.error || response.message || 'Errore nella creazione del backup');
      }
    } catch (err: any) {
      console.error('Error creating backup:', err);

      // Handle authentication errors
      if (err.response?.status === 401) {
        setError('Sessione scaduta. Effettua nuovamente il login.');
      } else if (err.response?.status === 403) {
        setError('Non hai i permessi necessari per questa operazione.');
      } else {
        setError('Errore nella creazione del backup. Verifica la connessione al server.');
      }
    } finally {
      setBackupLoading(false);
    }
  };

  const handleCleanupBackups = async () => {
    try {
      setActionLoading('cleanup-backups');
      setError('');
      setSuccess('');

      // Check user permissions
      if (user?.role !== 'ADMIN') {
        setError('Solo gli amministratori possono pulire i backup');
        return;
      }

      const response = await backupService.cleanupOldBackups();
      if (response.success) {
        const { data } = response;
        const totalDeleted = data.summary.totalDeleted;

        if (totalDeleted > 0) {
          setSuccess(`🗑️ Pulizia completata! Rimossi ${totalDeleted} backup vecchi.`);
        } else {
          setSuccess('✅ Nessun backup da pulire. Tutti i backup rientrano nella retention policy.');
        }

        // Refresh backup status
        loadSystemData();
      } else {
        setError(response.error || 'Errore durante la pulizia dei backup');
      }
    } catch (err: any) {
      console.error('Error cleaning up backups:', err);

      if (err.response?.status === 401) {
        setError('Sessione scaduta. Effettua nuovamente il login.');
      } else if (err.response?.status === 403) {
        setError('Non hai i permessi necessari per questa operazione.');
      } else {
        setError('Errore durante la pulizia dei backup. Verifica la connessione al server.');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleCleanupFiles = async () => {
    try {
      setActionLoading('cleanup-files');
      setError('');
      setSuccess('');

      // Check user permissions
      if (user?.role !== 'ADMIN') {
        setError('Solo gli amministratori possono pulire i file orfani');
        return;
      }

      const response = await backupService.cleanupOrphanedFiles();
      if (response.success) {
        const deletedCount = response.data.deletedCount;

        if (deletedCount > 0) {
          setSuccess(`🗑️ Pulizia file completata! Rimossi ${deletedCount} file orfani.`);
        } else {
          setSuccess('✅ Nessun file orfano trovato. Sistema pulito.');
        }

        // Refresh system data
        loadSystemData();
      } else {
        setError(response.error || response.message || 'Errore durante la pulizia dei file');
      }
    } catch (err: any) {
      console.error('Error cleaning up files:', err);

      if (err.response?.status === 401) {
        setError('Sessione scaduta. Effettua nuovamente il login.');
      } else if (err.response?.status === 403) {
        setError('Non hai i permessi necessari per questa operazione.');
      } else {
        setError('Errore durante la pulizia dei file. Verifica la connessione al server.');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestoreFromModal = async (backupPath: string, type: string) => {
    try {
      setError('');
      setSuccess('');

      let response;
      if (type === 'database') {
        response = await backupService.restoreDatabase(backupPath);
      } else {
        response = await backupService.restoreFiles(backupPath);
      }

      if (response.success) {
        setSuccess(`Backup ${type} ripristinato con successo`);
        setShowHistoryModal(false);
        setShowRestoreModal(false);
        // Refresh system data
        loadSystemData();
      } else {
        setError(`Errore nel ripristino del backup: ${response.error || 'Errore sconosciuto'}`);
      }
    } catch (err: any) {
      console.error('Error restoring backup:', err);
      setError(`Errore nel ripristino del backup: ${err.message}`);
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
              <div className="flex items-center space-x-3">
                {lastUpdated && (
                  <span className="text-xs text-gray-500">
                    Ultimo aggiornamento: {lastUpdated.toLocaleTimeString('it-IT')}
                  </span>
                )}
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
          </div>

          {error && (
            <ErrorMessage message={error} onDismiss={() => setError('')} />
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{success}</p>
                </div>
                <div className="ml-auto pl-3">
                  <button
                    onClick={() => setSuccess('')}
                    className="text-green-400 hover:text-green-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
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
              <div className="flex items-center space-x-3">
                {user?.role !== 'ADMIN' && (
                  <span className="text-sm text-gray-500">Solo amministratori</span>
                )}
                <Button
                  variant="primary"
                  onClick={createBackup}
                  loading={backupLoading}
                  icon={<Download className="h-4 w-4" />}
                  disabled={user?.role !== 'ADMIN'}
                >
                  {backupLoading ? 'Backup in corso...' : 'Crea Backup Completo'}
                </Button>
              </div>
            </div>

            {/* Backup Progress Indicator */}
            {backupLoading && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                  <div className="text-sm text-blue-800">
                    <div className="font-medium">Creazione backup completo in corso...</div>
                    <div className="text-xs mt-1">
                      Stiamo creando una copia sicura del database e dei file caricati. Questo processo potrebbe richiedere alcuni secondi.
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg" title="Numero totale di job automatici configurati nel sistema">
                <div className="text-2xl font-bold text-gray-900">
                  {backup?.scheduler?.totalJobs || 0}
                </div>
                <div className="text-sm text-gray-600">Job Configurati</div>
                <div className="text-xs text-gray-500 mt-1">Backup + Cleanup</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg" title="Numero di job attualmente attivi e funzionanti">
                <div className="text-2xl font-bold text-gray-900">
                  {backup?.scheduler?.activeJobs || 0}
                </div>
                <div className="text-sm text-gray-600">Job Attivi</div>
                <div className="text-xs text-gray-500 mt-1">Automatici</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg" title="Stato generale del sistema di backup">
                <div className={`text-2xl font-bold ${
                  backup?.status === 'healthy' ? 'text-green-900' : 'text-red-900'
                }`}>
                  {backup?.status === 'healthy' ? 'Sano' : 'Errore'}
                </div>
                <div className="text-sm text-gray-600">Stato Sistema</div>
                <div className="text-xs text-gray-500 mt-1">
                  {backup?.status === 'healthy' ? 'Funzionante' : 'Problemi'}
                </div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg" title="Numero di giorni per cui vengono mantenuti i backup giornalieri">
                <div className="text-2xl font-bold text-gray-900">
                  {backup?.storage?.retention?.daily || 7}
                </div>
                <div className="text-sm text-gray-600">Giorni Retention</div>
                <div className="text-xs text-gray-500 mt-1">Policy giornaliera</div>
              </div>
            </div>

            {/* Job Descriptions */}
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <Clock className="h-4 w-4 mr-2 text-gray-500" />
                Job Automatici Programmati
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {getJobDescriptions().map((job, index) => (
                  <div key={index} className="bg-white rounded p-3 border border-gray-200">
                    <div className={`font-medium mb-1 ${job.color}`}>{job.name}</div>
                    <div className="text-gray-600 mb-1">{job.schedule}</div>
                    <div className="text-gray-500">{job.description}</div>
                    {backup?.scheduler?.totalJobs > 0 && (
                      <div className="text-xs text-gray-400 mt-1">
                        Stato: {job.active ? '🟢 Attivo' : '🔴 Inattivo'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-gray-500 flex items-center">
                <span>💡 I job sono gestiti automaticamente dal sistema. Retention: 7 giorni daily, 4 settimane weekly, 12 mesi monthly.</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Eye className="h-4 w-4" />}
                disabled={user?.role !== 'ADMIN'}
                onClick={() => {
                  if (user?.role !== 'ADMIN') {
                    setError('Solo gli amministratori possono visualizzare la cronologia backup');
                    return;
                  }
                  setShowHistoryModal(true);
                }}
                title={user?.role !== 'ADMIN' ? 'Accesso riservato agli amministratori' : 'Visualizza la cronologia dei backup'}
              >
                Visualizza Cronologia
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Settings className="h-4 w-4" />}
                disabled={user?.role !== 'ADMIN'}
                onClick={() => {
                  if (user?.role !== 'ADMIN') {
                    setError('Solo gli amministratori possono accedere alle configurazioni backup');
                    return;
                  }
                  setShowConfigModal(true);
                }}
                title={user?.role !== 'ADMIN' ? 'Accesso riservato agli amministratori' : 'Configura le impostazioni di backup'}
              >
                Configurazione
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<RotateCcw className="h-4 w-4" />}
                disabled={user?.role !== 'ADMIN'}
                onClick={() => {
                  if (user?.role !== 'ADMIN') {
                    setError('Solo gli amministratori possono ripristinare backup');
                    return;
                  }
                  setShowRestoreModal(true);
                }}
                title={user?.role !== 'ADMIN' ? 'Accesso riservato agli amministratori' : 'Ripristina da un backup esistente'}
              >
                Ripristina Backup
              </Button>
            </div>

            {/* Cleanup Actions */}
            <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-2">
              <span className="text-xs text-gray-500 w-full mb-2">Azioni di Pulizia (Avanzate)</span>
              <Button
                variant="warning"
                size="sm"
                icon={<Trash2 className="h-4 w-4" />}
                disabled={user?.role !== 'ADMIN'}
                onClick={handleCleanupBackups}
                loading={actionLoading === 'cleanup-backups'}
                title={user?.role !== 'ADMIN' ? 'Accesso riservato agli amministratori' : 'Pulisci backup vecchi secondo retention policy'}
              >
                Pulisci Backup Vecchi
              </Button>

              <Button
                variant="warning"
                size="sm"
                icon={<Trash2 className="h-4 w-4" />}
                disabled={user?.role !== 'ADMIN'}
                onClick={handleCleanupFiles}
                loading={actionLoading === 'cleanup-files'}
                title={user?.role !== 'ADMIN' ? 'Accesso riservato agli amministratori' : 'Pulisci file orfani non più utilizzati'}
              >
                Pulisci File Orfani
              </Button>
            </div>
          </Card>

        </div>
      </div>

      {/* Modals */}
      <BackupHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onRestore={handleRestoreFromModal}
      />

      <BackupConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />

      <BackupRestoreModal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
      />
    </Layout>
  );
};

export default SystemPage;