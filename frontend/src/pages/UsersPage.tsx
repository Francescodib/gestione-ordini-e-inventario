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
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../contexts/AuthContext';

const UsersPage: React.FC = () => {
  const { user: currentUser, isAdmin, canCreateClients } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [inactiveUsers, setInactiveUsers] = useState<User[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [cleanupModal, setCleanupModal] = useState(false);
  const [selectedInactiveUsers, setSelectedInactiveUsers] = useState<number[]>([]);
  const [dependencyCheck, setDependencyCheck] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'CLIENT' as 'CLIENT' | 'MANAGER' | 'ADMIN',
    phone: '',
    streetAddress: '',
    city: '',
    postalCode: '',
    country: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    // Filter users based on search query
    if (searchQuery.trim()) {
      const usersToFilter = showInactive ? inactiveUsers : users;
      const filtered = usersToFilter.filter(user =>
        (user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(showInactive ? inactiveUsers : users);
    }
  }, [users, inactiveUsers, searchQuery, showInactive]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');

      const [usersResponse, inactiveResponse] = await Promise.allSettled([
        authService.getAllUsers(),
        authService.getInactiveUsers(90)
      ]);

      if (usersResponse.status === 'fulfilled' && usersResponse.value.success && usersResponse.value.data) {
        const activeUsers = usersResponse.value.data.filter(user => user.isActive);
        setUsers(activeUsers);
      }

      if (inactiveResponse.status === 'fulfilled' && inactiveResponse.value.success && inactiveResponse.value.data) {
        setInactiveUsers(inactiveResponse.value.data);
      }

    } catch (err: unknown) {
      console.error('Error loading users:', err);
      setError('Errore nel caricamento degli utenti');
    } finally {
      setLoading(false);
    }
  };

  // Generate username automatically from email
  const generateUsername = (email: string) => {
    const baseUsername = email.split('@')[0].toLowerCase();
    return baseUsername.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  };

  const handleCreateFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setCreateFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      };

      // Auto-generate username when email changes
      if (name === 'email' && value && (!prev.username || prev.username === generateUsername(prev.email))) {
        updated.username = generateUsername(value);
      }

      return updated;
    });
  };

  const handleCreateUser = async () => {
    try {
      setLoading(true);
      setError('');

      if (createFormData.password !== createFormData.confirmPassword) {
        setError('Le password non corrispondono');
        return;
      }

      const addressData = createFormData.role === 'CLIENT' ? {
        phone: createFormData.phone,
        streetAddress: createFormData.streetAddress,
        city: createFormData.city,
        postalCode: createFormData.postalCode,
        country: createFormData.country
      } : undefined;

      const response = await authService.createUser({
        username: createFormData.username,
        firstName: createFormData.firstName,
        lastName: createFormData.lastName,
        email: createFormData.email,
        password: createFormData.password,
        confirmPassword: createFormData.confirmPassword,
        role: createFormData.role,
        ...(addressData || {})
      });

      if (response.success) {
        setShowCreateModal(false);
        setCreateFormData({
          username: '',
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'CLIENT',
          phone: '',
          streetAddress: '',
          city: '',
          postalCode: '',
          country: ''
        });
        loadUsers(); // Reload users list
      } else {
        setError(response.message || 'Errore nella creazione dell\'utente');
      }
    } catch (err: unknown) {
      console.error('Error creating user:', err);
      setError('Errore nella creazione dell\'utente');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const blob = await authService.exportUsersCSV(true);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Errore durante l\'esportazione CSV');
    }
  };

  const handleCleanupInactive = async () => {
    if (inactiveUsers.length === 0) {
      setError('Nessun utente inattivo da pulire');
      return;
    }

    try {
      setLoading(true);
      const userIds = inactiveUsers.map(u => u.id);

      // Check dependencies first
      const depResponse = await authService.checkUserDependencies(userIds);
      if (depResponse.success) {
        setDependencyCheck(depResponse.data);
        setCleanupModal(true);
      }
    } catch (err: any) {
      setError('Errore durante la verifica delle dipendenze');
    } finally {
      setLoading(false);
    }
  };

  const confirmCleanup = async () => {
    try {
      setLoading(true);
      const response = await authService.cleanupInactiveUsers(selectedInactiveUsers);

      if (response.success) {
        setCleanupModal(false);
        setSelectedInactiveUsers([]);
        setDependencyCheck(null);
        loadUsers(); // Reload data

        const { deleted, skipped, errors } = response.data;
        let message = `Operazione completata: ${deleted.length} utenti eliminati`;
        if (skipped.length > 0) message += `, ${skipped.length} saltati`;
        if (errors.length > 0) message += `, ${errors.length} errori`;

        // You could show a more detailed success message here
        alert(message);
      }
    } catch (err: any) {
      setError('Errore durante la pulizia degli utenti inattivi');
    } finally {
      setLoading(false);
    }
  };

  // Only admins and managers can access this page
  if (!isAdmin() && !canCreateClients()) {
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
      'CLIENT': 'bg-green-100 text-green-800'
    };

    return badges[role as keyof typeof badges] || badges['CLIENT'];
  };

  const getRoleText = (role: string) => {
    const texts = {
      'ADMIN': 'Amministratore',
      'MANAGER': 'Manager',
      'CLIENT': 'Cliente'
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
            <UserAvatar
              userId={record.id.toString()}
              username={record.username}
              firstName={record.firstName}
              lastName={record.lastName}
              size="lg"
              showInitials={true}
            />
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
              onClick={() => setShowCreateModal(true)}
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              }
            >
              Crea Utente
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

          <Card padding="sm" className="bg-purple-50 border-purple-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-800">Clienti</p>
                <p className="text-2xl font-semibold text-purple-900">
                  {users.filter(u => u.role === 'CLIENT').length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <div className="space-y-4">
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

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">Visualizza:</span>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="userFilter"
                    checked={!showInactive}
                    onChange={() => setShowInactive(false)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">Utenti Attivi ({users.length})</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="userFilter"
                    checked={showInactive}
                    onChange={() => setShowInactive(true)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">Utenti Inattivi ({inactiveUsers.length})</span>
                </label>
              </div>

              {showInactive && inactiveUsers.length > 0 && (
                <div className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-md">
                  ⚠️ Gli utenti inattivi non hanno effettuato login negli ultimi 90 giorni
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Results Summary */}
        {!loading && (
          <div className="text-sm text-gray-600">
            Visualizzando {showInactive ? inactiveUsers.length : filteredUsers.length} di{' '}
            {showInactive ? inactiveUsers.length : users.length} utenti{' '}
            {showInactive ? 'inattivi' : 'attivi'}
            {searchQuery && ` per "${searchQuery}"`}
          </div>
        )}

        {/* Users Table */}
        <Table
          data={filteredUsers}
          columns={columns}
          loading={loading}
          emptyText={showInactive ? "Nessun utente inattivo trovato" : "Nessun utente trovato"}
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
                  Azioni amministrative per la gestione degli utenti {inactiveUsers.length > 0 && (
                    <span className="text-red-600">• {inactiveUsers.length} utenti inattivi rilevati</span>
                  )}
                </p>
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExportCSV}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                >
                  Esporta CSV
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleCleanupInactive}
                  disabled={inactiveUsers.length === 0}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  }
                >
                  Pulizia Account Inattivi ({inactiveUsers.length})
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Crea Nuovo Utente</h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Nome"
                      name="firstName"
                      value={createFormData.firstName}
                      onChange={handleCreateFormChange}
                      required
                    />
                    <Input
                      label="Cognome"
                      name="lastName"
                      value={createFormData.lastName}
                      onChange={handleCreateFormChange}
                      required
                    />
                  </div>
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={createFormData.email}
                    onChange={handleCreateFormChange}
                    required
                    fullWidth
                  />
                  <Input
                    label="Username"
                    name="username"
                    value={createFormData.username}
                    onChange={handleCreateFormChange}
                    required
                    fullWidth
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
                    <select
                      name="role"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={createFormData.role}
                      onChange={handleCreateFormChange}
                    >
                      <option value="CLIENT">Cliente</option>
                      {canCreateClients() && (
                        <>
                          <option value="MANAGER">Manager</option>
                          {isAdmin() && <option value="ADMIN">Amministratore</option>}
                        </>
                      )}
                    </select>
                  </div>

                  {/* Address fields - Only for CLIENT users */}
                  {createFormData.role === 'CLIENT' && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Informazioni di Contatto (Opzionali)</h4>
                      <div className="space-y-3">
                        <Input
                          label="Telefono"
                          name="phone"
                          value={createFormData.phone}
                          onChange={handleCreateFormChange}
                          fullWidth
                        />
                        <Input
                          label="Indirizzo"
                          name="streetAddress"
                          value={createFormData.streetAddress}
                          onChange={handleCreateFormChange}
                          fullWidth
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            label="Città"
                            name="city"
                            value={createFormData.city}
                            onChange={handleCreateFormChange}
                          />
                          <Input
                            label="CAP"
                            name="postalCode"
                            value={createFormData.postalCode}
                            onChange={handleCreateFormChange}
                          />
                        </div>
                        <Input
                          label="Paese"
                          name="country"
                          value={createFormData.country}
                          onChange={handleCreateFormChange}
                          fullWidth
                        />
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Credenziali</h4>
                    <div className="space-y-3">
                      <Input
                        label="Password"
                        name="password"
                        type="password"
                        value={createFormData.password}
                        onChange={handleCreateFormChange}
                        required
                        fullWidth
                      />
                      <Input
                        label="Conferma Password"
                        name="confirmPassword"
                        type="password"
                        value={createFormData.confirmPassword}
                        onChange={handleCreateFormChange}
                        required
                        fullWidth
                      />
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3 mt-6">
                  <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                    Annulla
                  </Button>
                  <Button variant="primary" onClick={handleCreateUser} disabled={loading}>
                    {loading ? 'Creazione...' : 'Crea Utente'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cleanup Inactive Users Modal */}
        {cleanupModal && dependencyCheck && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Verifica Pulizia Utenti Inattivi</h3>
                  <button
                    onClick={() => setCleanupModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Analisi delle dipendenze per {dependencyCheck.length} utenti inattivi:
                  </p>

                  <div className="space-y-3">
                    {dependencyCheck.map((userDep: any, index: number) => {
                      const user = inactiveUsers.find(u => u.id === userDep.userId);
                      return (
                        <div key={userDep.userId} className={`p-3 border rounded-md ${
                          userDep.canDelete ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedInactiveUsers.includes(userDep.userId)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedInactiveUsers(prev => [...prev, userDep.userId]);
                                  } else {
                                    setSelectedInactiveUsers(prev => prev.filter(id => id !== userDep.userId));
                                  }
                                }}
                                disabled={!userDep.canDelete}
                                className="mr-3"
                              />
                              <div>
                                <div className="font-medium text-gray-900">
                                  {user?.firstName} {user?.lastName} (@{user?.username})
                                </div>
                                <div className="text-sm text-gray-500">{user?.email}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                userDep.canDelete ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {userDep.canDelete ? 'Eliminabile' : 'Bloccato'}
                              </span>
                            </div>
                          </div>

                          {userDep.warnings && userDep.warnings.length > 0 && (
                            <div className="mt-2">
                              <div className="text-sm text-gray-600 font-medium">Dipendenze:</div>
                              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                {userDep.warnings.map((warning: string, i: number) => (
                                  <li key={i}>{warning}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="mt-2 grid grid-cols-4 gap-2 text-xs text-gray-500">
                            <div>Ordini: {userDep.dependencies.orders}</div>
                            <div>Audit: {userDep.dependencies.auditLogs}</div>
                            <div>Creati: {userDep.dependencies.createdUsers}</div>
                            <div>Indirizzi: {userDep.dependencies.addresses}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    {selectedInactiveUsers.length} di {dependencyCheck.length} utenti selezionati per l'eliminazione
                  </div>
                  <div className="flex space-x-3">
                    <Button variant="secondary" onClick={() => setCleanupModal(false)}>
                      Annulla
                    </Button>
                    <Button
                      variant="danger"
                      onClick={confirmCleanup}
                      disabled={selectedInactiveUsers.length === 0 || loading}
                    >
                      {loading ? 'Eliminazione...' : `Elimina ${selectedInactiveUsers.length} Utenti`}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </Layout>
  );
};

export default UsersPage;