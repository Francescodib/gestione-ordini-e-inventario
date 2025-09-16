import React, { useState, useEffect } from 'react';
import { monitoringService, backupService } from '../services/api';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../contexts/AuthContext';

interface SystemHealth {
  status: string;
  database: string;
  uptime: string;
  version: string;
  environment: string;
  memory?: {
    used: number;
    total: number;
    percentage: number;
  };
  disk?: {
    used: number;
    total: number;
    percentage: number;
  };
}

interface BackupInfo {
  lastBackup?: string;
  nextScheduled?: string;
  totalBackups: number;
  status: string;
}

const SystemPage: React.FC = () => {
  const { user } = useAuth();
  const [health, setHealth] = useState<SystemHealth | null>(null);
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

      const [healthResponse, backupResponse] = await Promise.allSettled([
        monitoringService.getSystemHealth(),
        backupService.getBackupStatus()
      ]);

      if (healthResponse.status === 'fulfilled' && healthResponse.value.success) {
        setHealth(healthResponse.value.data);
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

  // Only admins can access this page
  if (user?.role !== 'ADMIN') {
    return (
      <Layout>
        <Card>
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
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
          <LoadingSpinner size="lg"  />
        </div>
      </Layout>
    );
  }

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
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
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
            health?.status === 'OK' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  health?.status === 'OK' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <svg className={`w-5 h-5 ${
                    health?.status === 'OK' ? 'text-green-600' : 'text-red-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${
                  health?.status === 'OK' ? 'text-green-800' : 'text-red-800'
                }`}>
                  Stato Sistema
                </p>
                <p className={`text-2xl font-semibold ${
                  health?.status === 'OK' ? 'text-green-900' : 'text-red-900'
                }`}>
                  {health?.status || 'N/A'}
                </p>
              </div>
            </div>
          </Card>

          <Card padding="sm" className={`${
            health?.database === 'connected' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  health?.database === 'connected' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <svg className={`w-5 h-5 ${
                    health?.database === 'connected' ? 'text-green-600' : 'text-red-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${
                  health?.database === 'connected' ? 'text-green-800' : 'text-red-800'
                }`}>
                  Database
                </p>
                <p className={`text-2xl font-semibold ${
                  health?.database === 'connected' ? 'text-green-900' : 'text-red-900'
                }`}>
                  {health?.database === 'connected' ? 'Connesso' : 'Disconnesso'}
                </p>
              </div>
            </div>
          </Card>

          <Card padding="sm" className="bg-blue-50 border-blue-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-800">Uptime</p>
                <p className="text-2xl font-semibold text-blue-900">
                  {health?.uptime || 'N/A'}
                </p>
              </div>
            </div>
          </Card>

          <Card padding="sm" className="bg-purple-50 border-purple-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-800">Versione</p>
                <p className="text-2xl font-semibold text-purple-900">
                  {health?.version || '1.0.0'}
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
                <dt className="text-sm font-medium text-gray-500">Ambiente</dt>
                <dd className="text-sm text-gray-900">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    health?.environment === 'production' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {health?.environment || 'development'}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Database</dt>
                <dd className="text-sm text-gray-900">SQLite</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Node.js</dt>
                <dd className="text-sm text-gray-900">{process.versions?.node || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Piattaforma</dt>
                <dd className="text-sm text-gray-900">{navigator.platform}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Risorse Sistema</h3>
            
            {/* Memory Usage */}
            {health?.memory && (
              <div className="mb-4">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">Memoria</span>
                  <span className="text-gray-500">
                    {health.memory.percentage}% utilizzata
                  </span>
                </div>
                <div className="mt-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      health.memory.percentage > 80 ? 'bg-red-600' :
                      health.memory.percentage > 60 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${health.memory.percentage}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {Math.round(health.memory.used / 1024 / 1024)} MB / {Math.round(health.memory.total / 1024 / 1024)} MB
                </div>
              </div>
            )}

            {/* Disk Usage */}
            {health?.disk && (
              <div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">Disco</span>
                  <span className="text-gray-500">
                    {health.disk.percentage}% utilizzato
                  </span>
                </div>
                <div className="mt-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      health.disk.percentage > 90 ? 'bg-red-600' :
                      health.disk.percentage > 70 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${health.disk.percentage}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {Math.round(health.disk.used / 1024 / 1024 / 1024)} GB / {Math.round(health.disk.total / 1024 / 1024 / 1024)} GB
                </div>
              </div>
            )}

            {!health?.memory && !health?.disk && (
              <div className="text-sm text-gray-500">
                Informazioni sulle risorse non disponibili
              </div>
            )}
          </Card>
        </div>

        {/* Backup Management */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Gestione Backup</h3>
            <Button 
              variant="primary"
              onClick={createBackup}
              loading={backupLoading}
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              }
            >
              Crea Backup Ora
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {backup?.totalBackups || 0}
              </div>
              <div className="text-sm text-gray-600">Backup Totali</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {backup?.lastBackup ? 
                  new Date(backup.lastBackup).toLocaleDateString('it-IT') : 
                  'Mai'
                }
              </div>
              <div className="text-sm text-gray-600">Ultimo Backup</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {backup?.nextScheduled ? 
                  new Date(backup.nextScheduled).toLocaleDateString('it-IT') : 
                  'N/A'
                }
              </div>
              <div className="text-sm text-gray-600">Prossimo Backup</div>
            </div>
          </div>

          <div className="mt-4 flex space-x-4">
            <Button variant="secondary" size="sm">
              Visualizza Cronologia
            </Button>
            <Button variant="secondary" size="sm">
              Configurazione
            </Button>
            <Button variant="secondary" size="sm">
              Ripristina Backup
            </Button>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Azioni Rapide</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="secondary" fullWidth>
              Pulisci Cache
            </Button>
            <Button variant="secondary" fullWidth>
              Riavvia Servizi
            </Button>
            <Button variant="secondary" fullWidth>
              Esporta Logs
            </Button>
            <Button variant="danger" fullWidth>
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