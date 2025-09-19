import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import type { User } from '../services/api';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Input from '../components/Input';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../contexts/AuthContext';

const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    // Filter users based on search query
    if (searchQuery.trim()) {
      const filtered = users.filter(user =>
        (user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [users, searchQuery]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await authService.getAllUsers();

      if (response.success && response.data) {
        setUsers(response.data);
      }

    } catch (err: unknown) {
      console.error('Error loading users:', err);
      setError('Errore nel caricamento degli utenti');
    } finally {
      setLoading(false);
    }
  };

  // Only admins can access this page
  if (currentUser?.role !== 'ADMIN') {
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
              Non hai i permessi necessari per visualizzare questa pagina.
            </p>
          </div>
        </Card>
      </Layout>
    );
  }

  const getRoleBadge = (role: string) => {
    const badges = {
      'ADMIN': 'bg-red-100 text-red-800',
      'MANAGER': 'bg-blue-100 text-blue-800',
      'USER': 'bg-green-100 text-green-800'
    };
    
    return badges[role as keyof typeof badges] || badges['USER'];
  };

  const getRoleText = (role: string) => {
    const texts = {
      'ADMIN': 'Amministratore',
      'MANAGER': 'Manager',
      'USER': 'Utente'
    };
    
    return texts[role as keyof typeof texts] || role;
  };

  const columns = [
    {
      key: 'user' as keyof User,
      title: 'Utente',
      render: (_: any, record: User) => (
        <div className="flex items-center">
          <div className="h-10 w-10 flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {(record.firstName || record.username).charAt(0)}{(record.lastName || '').charAt(0) || (record.username || 'U').charAt(1)}
              </span>
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {record.firstName && record.lastName 
                ? `${record.firstName} ${record.lastName}` 
                : record.username}
            </div>
            <div className="text-sm text-gray-500">@{record.username}</div>
          </div>
        </div>
      )
    },
    {
      key: 'email' as keyof User,
      title: 'Email',
      render: (value: string, record: User) => (
        <div>
          <div className="text-sm text-gray-900">{value}</div>
          <div className="flex items-center">
            {record.emailVerified ? (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Verificata
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Non verificata
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'role' as keyof User,
      title: 'Ruolo',
      render: (value: string) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadge(value)}`}>
          {getRoleText(value)}
        </span>
      )
    },
    {
      key: 'isActive' as keyof User,
      title: 'Stato',
      render: (value: boolean) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value ? 'Attivo' : 'Inattivo'}
        </span>
      )
    },
    {
      key: 'lastLogin' as keyof User,
      title: 'Ultimo Accesso',
      render: (value: string | undefined) => (
        <div className="text-sm text-gray-900">
          {value ? new Date(value).toLocaleDateString('it-IT', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : 'Mai'}
        </div>
      )
    },
    {
      key: 'createdAt' as keyof User,
      title: 'Registrato',
      render: (value: string) => new Date(value).toLocaleDateString('it-IT')
    }
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestione Utenti</h1>
            <p className="mt-2 text-sm text-gray-700">
              Visualizza e gestisci tutti gli utenti del sistema
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button
              variant="primary"
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              }
            >
              Invita Utente
            </Button>
          </div>
        </div>

        {error && (
          <ErrorMessage message={error} onDismiss={() => setError('')} />
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card padding="sm" className="bg-blue-50 border-blue-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-800">Totale Utenti</p>
                <p className="text-2xl font-semibold text-blue-900">
                  {users.length}
                </p>
              </div>
            </div>
          </Card>

          <Card padding="sm" className="bg-green-50 border-green-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-800">Utenti Attivi</p>
                <p className="text-2xl font-semibold text-green-900">
                  {users.filter(u => u.isActive).length}
                </p>
              </div>
            </div>
          </Card>

          <Card padding="sm" className="bg-red-50 border-red-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-red-800">Amministratori</p>
                <p className="text-2xl font-semibold text-red-900">
                  {users.filter(u => u.role === 'ADMIN').length}
                </p>
              </div>
            </div>
          </Card>

          <Card padding="sm" className="bg-yellow-50 border-yellow-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-800">Email Verificate</p>
                <p className="text-2xl font-semibold text-yellow-900">
                  {users.filter(u => u.emailVerified).length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <div className="flex space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Cerca utenti per nome, email o username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
                fullWidth
              />
            </div>
            <Button 
              variant="secondary" 
              onClick={() => setSearchQuery('')}
            >
              Pulisci
            </Button>
          </div>
        </Card>

        {/* Results Summary */}
        {!loading && (
          <div className="text-sm text-gray-600">
            Visualizzando {filteredUsers.length} di {users.length} utenti
            {searchQuery && ` per "${searchQuery}"`}
          </div>
        )}

        {/* Users Table */}
        <Table
          data={filteredUsers}
          columns={columns}
          loading={loading}
          emptyText="Nessun utente trovato"
          onRowClick={(user) => {
            navigate(`/users/${user.id}`);
          }}
        />

        {/* Additional Actions */}
        {!loading && users.length > 0 && (
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Azioni di Sistema</h3>
                <p className="text-sm text-gray-500">
                  Azioni amministrative per la gestione degli utenti
                </p>
              </div>
              <div className="flex space-x-3">
                <Button variant="secondary" size="sm">
                  Esporta CSV
                </Button>
                <Button variant="secondary" size="sm">
                  Invia Email di Massa
                </Button>
                <Button variant="danger" size="sm">
                  Pulizia Account Inattivi
                </Button>
              </div>
            </div>
          </Card>
        )}
        </div>
      </div>
    </Layout>
  );
};

export default UsersPage;