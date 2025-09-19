import React, { useState, useEffect } from 'react';
import { backupService } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import {
  X, Download, RefreshCw, Database, File,
  Calendar, HardDrive, CheckCircle, AlertCircle
} from 'lucide-react';

interface BackupHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore?: (backupPath: string, type: string) => void;
}

interface BackupItem {
  filename: string;
  path: string;
  size: number | string;
  created: string;
  type: 'database' | 'files';
  valid?: boolean;
}

const BackupHistoryModal: React.FC<BackupHistoryModalProps> = ({
  isOpen,
  onClose,
  onRestore
}) => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'database' | 'files'>('all');

  useEffect(() => {
    if (isOpen) {
      loadBackups();
    }
  }, [isOpen]);

  const loadBackups = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await backupService.getBackupList();
      if (response.success) {
        setBackups(response.data || []);
      } else {
        setError('Errore nel caricamento della cronologia backup');
      }
    } catch (err: any) {
      console.error('Error loading backups:', err);

      // Handle authentication errors specifically
      if (err.response?.status === 401) {
        setError('Sessione scaduta. Effettua nuovamente il login.');
      } else if (err.response?.status === 403) {
        setError('Non hai i permessi necessari per visualizzare la cronologia backup.');
      } else if (err.response?.status === 500) {
        setError('Errore interno del server. Riprova più tardi.');
      } else if (err.code === 'NETWORK_ERROR' || !err.response) {
        setError('Errore di connessione al server. Verifica la tua connessione internet.');
      } else {
        setError(`Errore nel caricamento della cronologia backup: ${err.message || 'Errore sconosciuto'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (backup: BackupItem) => {
    if (onRestore) {
      onRestore(backup.path, backup.type);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT');
  };

  const formatSize = (size: number | string) => {
    if (typeof size === 'string') return size;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const filteredBackups = backups.filter(backup => {
    if (filterType === 'all') return true;
    return backup.type === filterType;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Cronologia Backup</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tutti
            </button>
            <button
              onClick={() => setFilterType('database')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filterType === 'database'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Database
            </button>
            <button
              onClick={() => setFilterType('files')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filterType === 'files'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Files
            </button>
          </div>
          <button
            onClick={loadBackups}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {error && (
            <div className="p-6">
              <ErrorMessage message={error} onDismiss={() => setError('')} />
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="overflow-y-auto h-full">
              {filteredBackups.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-gray-500">
                  <div className="text-center">
                    <HardDrive className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Nessun backup trovato</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredBackups.map((backup, index) => (
                    <div key={index} className="p-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            backup.type === 'database' ? 'bg-blue-100' : 'bg-green-100'
                          }`}>
                            {backup.type === 'database' ? (
                              <Database className={`h-5 w-5 ${
                                backup.type === 'database' ? 'text-blue-600' : 'text-green-600'
                              }`} />
                            ) : (
                              <File className="h-5 w-5 text-green-600" />
                            )}
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-gray-900">
                              {backup.filename}
                            </h4>
                            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDate(backup.created)}
                              </div>
                              <div className="flex items-center">
                                <HardDrive className="h-3 w-3 mr-1" />
                                {formatSize(backup.size)}
                              </div>
                              <div className="flex items-center">
                                {backup.valid !== false ? (
                                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                                ) : (
                                  <AlertCircle className="h-3 w-3 mr-1 text-red-500" />
                                )}
                                {backup.valid !== false ? 'Valido' : 'Corrotto'}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            backup.type === 'database'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {backup.type === 'database' ? 'Database' : 'Files'}
                          </span>

                          {onRestore && (
                            <button
                              onClick={() => handleRestore(backup)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Ripristina
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {filteredBackups.length} backup trovati
          </div>
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

export default BackupHistoryModal;