import React, { useState, useEffect } from 'react';
import { backupService } from '../services/api';
import { databaseService } from '../services/database';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import {
  X, RotateCcw, AlertTriangle, Database, File,
  Calendar, HardDrive, CheckCircle, AlertCircle
} from 'lucide-react';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBackup?: {
    path: string;
    type: 'database' | 'files';
    filename: string;
  } | null;
}

interface BackupItem {
  filename: string;
  path: string;
  size: number | string;
  created: string;
  type: 'database' | 'files';
  valid?: boolean;
}

const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  selectedBackup
}) => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [selectedBackupLocal, setSelectedBackupLocal] = useState<BackupItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [targetDirectory, setTargetDirectory] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadBackups();
      if (selectedBackup) {
        setSelectedBackupLocal({
          filename: selectedBackup.filename,
          path: selectedBackup.path,
          type: selectedBackup.type,
          size: 'N/A',
          created: new Date().toISOString()
        });
      }
    }
  }, [isOpen, selectedBackup]);

  const loadBackups = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await backupService.getBackupList();
      if (response.success) {
        setBackups(response.data || []);
      } else {
        setError('Errore nel caricamento dei backup');
      }
    } catch (err: any) {
      setError('Errore nel caricamento dei backup');
      console.error('Error loading backups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedBackupLocal) return;

    try {
      setRestoreLoading(true);
      setError('');
      setSuccess('');

      let response;
      if (selectedBackupLocal.type === 'database') {
        response = await backupService.restoreDatabase(selectedBackupLocal.path);
      } else {
        response = await backupService.restoreFiles(selectedBackupLocal.path, targetDirectory || undefined);
      }

      if (response.success) {
        setSuccess(`Backup ${selectedBackupLocal.type} ripristinato con successo`);
        setShowConfirm(false);

        // Se è un ripristino database e il backend indica che serve un refresh
        if (selectedBackupLocal.type === 'database' && response.requiresRefresh) {
          setSuccess('Database ripristinato con successo. La pagina si aggiornerà automaticamente...');

          // Forzare un controllo di salute del database
          databaseService.forceHealthCheck().then(() => {
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }).catch(() => {
            // Se il controllo fallisce, ricarica comunque dopo un po'
            setTimeout(() => {
              window.location.reload();
            }, 3000);
          });
        } else {
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      } else {
        setError(`Errore nel ripristino del backup: ${response.error || 'Errore sconosciuto'}`);
      }
    } catch (err: any) {
      setError(`Errore nel ripristino del backup: ${err.message}`);
      console.error('Error restoring backup:', err);
    } finally {
      setRestoreLoading(false);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Ripristina Backup</h3>
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

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{success}</p>
                </div>
              </div>
            </div>
          )}

          {!showConfirm ? (
            <div>
              {!selectedBackup && (
                <>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Seleziona Backup da Ripristinare</h4>

                  {loading ? (
                    <div className="flex items-center justify-center h-48">
                      <LoadingSpinner size="lg" />
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {backups.map((backup, index) => (
                        <div
                          key={index}
                          onClick={() => setSelectedBackupLocal(backup)}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedBackupLocal?.path === backup.path
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                backup.type === 'database' ? 'bg-blue-100' : 'bg-green-100'
                              }`}>
                                {backup.type === 'database' ? (
                                  <Database className={`h-4 w-4 ${
                                    backup.type === 'database' ? 'text-blue-600' : 'text-green-600'
                                  }`} />
                                ) : (
                                  <File className="h-4 w-4 text-green-600" />
                                )}
                              </div>

                              <div>
                                <h5 className="text-sm font-medium text-gray-900">
                                  {backup.filename}
                                </h5>
                                <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                                  <div className="flex items-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {formatDate(backup.created)}
                                  </div>
                                  <div className="flex items-center">
                                    <HardDrive className="h-3 w-3 mr-1" />
                                    {formatSize(backup.size)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              backup.type === 'database'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {backup.type === 'database' ? 'Database' : 'Files'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {selectedBackupLocal && (
                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Backup Selezionato</h4>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedBackupLocal.type === 'database' ? 'bg-blue-100' : 'bg-green-100'
                      }`}>
                        {selectedBackupLocal.type === 'database' ? (
                          <Database className={`h-5 w-5 ${
                            selectedBackupLocal.type === 'database' ? 'text-blue-600' : 'text-green-600'
                          }`} />
                        ) : (
                          <File className="h-5 w-5 text-green-600" />
                        )}
                      </div>

                      <div>
                        <h5 className="text-sm font-medium text-gray-900">
                          {selectedBackupLocal.filename}
                        </h5>
                        <p className="text-xs text-gray-500">
                          Tipo: {selectedBackupLocal.type === 'database' ? 'Database' : 'Files'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedBackupLocal.type === 'files' && (
                    <div className="mb-4">
                      <label htmlFor="targetDirectory" className="block text-sm font-medium text-gray-700">
                        Directory di Destinazione (opzionale)
                      </label>
                      <input
                        type="text"
                        id="targetDirectory"
                        value={targetDirectory}
                        onChange={(e) => setTargetDirectory(e.target.value)}
                        placeholder="Lascia vuoto per directory predefinita"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Se non specificato, i files verranno ripristinati nella directory originale
                      </p>
                    </div>
                  )}

                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                      <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                          Attenzione
                        </h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>
                            {selectedBackupLocal.type === 'database' ?
                              'Il ripristino del database sostituirà tutti i dati attuali. Questa operazione non può essere annullata.' :
                              'Il ripristino dei files sovrascriverà i files esistenti nella directory di destinazione.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Conferma Ripristino
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Sei sicuro di voler ripristinare il backup "{selectedBackupLocal?.filename}"?
                    {selectedBackupLocal?.type === 'database' && ' Tutti i dati attuali del database verranno sostituiti.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          {!showConfirm ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                disabled={!selectedBackupLocal}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Ripristina
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={restoreLoading}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                Indietro
              </button>
              <button
                onClick={handleRestore}
                disabled={restoreLoading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
              >
                {restoreLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Ripristinando...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Conferma Ripristino
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BackupRestoreModal;