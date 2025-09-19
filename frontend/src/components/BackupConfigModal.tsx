import React, { useState, useEffect } from 'react';
import { backupService } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import {
  X, Settings, Database, File, Clock, HardDrive,
  Trash2, Play, CheckCircle, AlertCircle
} from 'lucide-react';

interface BackupConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BackupStats {
  database: {
    count: number;
    totalSize: string;
    oldestBackup: string | null;
    newestBackup: string | null;
  };
  files: {
    count: number;
    totalSize: string;
    oldestBackup: string | null;
    newestBackup: string | null;
  };
  total: {
    count: number;
    totalSize: string;
  };
  jobs: Array<{
    name: string;
    status: 'idle' | 'running' | 'error';
    lastRun: string | null;
    nextRun: string | null;
    active: boolean;
  }>;
  configuration: any;
}

const BackupConfigModal: React.FC<BackupConfigModalProps> = ({
  isOpen,
  onClose
}) => {
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await backupService.getBackupStats();
      if (response.success) {
        setStats(response.data);
      } else {
        setError('Errore nel caricamento delle statistiche backup');
      }
    } catch (err: any) {
      console.error('Error loading backup stats:', err);

      // Handle authentication errors specifically
      if (err.response?.status === 401) {
        setError('Sessione scaduta. Effettua nuovamente il login.');
      } else if (err.response?.status === 403) {
        setError('Non hai i permessi necessari per visualizzare le statistiche backup.');
      } else if (err.response?.status === 500) {
        setError('Errore interno del server. Riprova più tardi.');
      } else if (err.code === 'NETWORK_ERROR' || !err.response) {
        setError('Errore di connessione al server. Verifica la tua connessione internet.');
      } else {
        setError(`Errore nel caricamento delle statistiche backup: ${err.message || 'Errore sconosciuto'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerJob = async (jobName: string) => {
    try {
      setActionLoading(jobName);
      const response = await backupService.triggerJob(jobName);
      if (response.success) {
        // Refresh stats after triggering job
        await loadStats();
      } else {
        setError(`Errore nell'avvio del job ${jobName}`);
      }
    } catch (err: any) {
      setError(`Errore nell'avvio del job ${jobName}`);
      console.error('Error triggering job:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCleanup = async () => {
    try {
      setActionLoading('cleanup');
      const response = await backupService.cleanupOldBackups();
      if (response.success) {
        // Refresh stats after cleanup
        await loadStats();
      } else {
        setError('Errore nella pulizia dei backup');
      }
    } catch (err: any) {
      setError('Errore nella pulizia dei backup');
      console.error('Error cleaning up backups:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('it-IT');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="h-4 w-4 text-blue-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Configurazione Backup</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6">
              <ErrorMessage message={error} onDismiss={() => setError('')} />
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <LoadingSpinner size="lg" />
            </div>
          ) : stats ? (
            <div className="space-y-6">
              {/* Statistics Overview */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Statistiche Backup</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <Database className="h-8 w-8 text-blue-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Database</p>
                        <p className="text-2xl font-semibold text-gray-900">{stats.database.count}</p>
                        <p className="text-xs text-gray-500">{stats.database.totalSize}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <File className="h-8 w-8 text-green-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Files</p>
                        <p className="text-2xl font-semibold text-gray-900">{stats.files.count}</p>
                        <p className="text-xs text-gray-500">{stats.files.totalSize}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <HardDrive className="h-8 w-8 text-purple-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Totale</p>
                        <p className="text-2xl font-semibold text-gray-900">{stats.total.count}</p>
                        <p className="text-xs text-gray-500">{stats.total.totalSize}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Jobs Status */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Job di Backup</h4>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="divide-y divide-gray-200">
                    {stats.jobs.map((job, index) => (
                      <div key={index} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(job.status)}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{job.name}</p>
                              <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                                <span>Ultimo: {formatDate(job.lastRun)}</span>
                                <span>Prossimo: {formatDate(job.nextRun)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(job.status)}`}>
                              {job.status === 'running' ? 'In corso' :
                               job.status === 'error' ? 'Errore' : 'Inattivo'}
                            </span>

                            <button
                              onClick={() => handleTriggerJob(job.name)}
                              disabled={actionLoading === job.name || job.status === 'running'}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                            >
                              {actionLoading === job.name ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <>
                                  <Play className="h-3 w-3 mr-1" />
                                  Avvia
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Configuration */}
              {stats.configuration && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Configurazione</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Backup Database</dt>
                        <dd className="text-sm text-gray-900">
                          {stats.configuration.database?.enabled ? 'Abilitato' : 'Disabilitato'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Backup Files</dt>
                        <dd className="text-sm text-gray-900">
                          {stats.configuration.files?.enabled ? 'Abilitato' : 'Disabilitato'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Retention Giornaliera</dt>
                        <dd className="text-sm text-gray-900">
                          {stats.configuration.database?.retention?.daily || 'N/A'} giorni
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Retention Settimanale</dt>
                        <dd className="text-sm text-gray-900">
                          {stats.configuration.database?.retention?.weekly || 'N/A'} settimane
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Retention Mensile</dt>
                        <dd className="text-sm text-gray-900">
                          {stats.configuration.database?.retention?.monthly || 'N/A'} mesi
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Compressione</dt>
                        <dd className="text-sm text-gray-900">
                          {stats.configuration.database?.compression ? 'Abilitata' : 'Disabilitata'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Azioni</h4>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleCleanup}
                    disabled={actionLoading === 'cleanup'}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading === 'cleanup' ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Pulisci Backup Vecchi
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackupConfigModal;