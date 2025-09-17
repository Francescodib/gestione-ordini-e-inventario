import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import type { User } from '../services/api';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import Input from '../components/Input';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../contexts/AuthContext';

const UserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: ''
  });
  const [selectedRole, setSelectedRole] = useState<'USER' | 'MANAGER' | 'ADMIN'>('USER');

  useEffect(() => {
    if (id) {
      loadUser(id);
    }
  }, [id]);

  const loadUser = async (userId: string) => {
    try {
      setLoading(true);
      setError('');

      const response = await authService.getUserById(userId);

      if (response.success && response.data) {
        setUser(response.data);
        setEditFormData({
          firstName: response.data.firstName || '',
          lastName: response.data.lastName || '',
          email: response.data.email,
          username: response.data.username
        });
        setSelectedRole(response.data.role as 'USER' | 'MANAGER' | 'ADMIN');
      } else {
        setError('Utente non trovato');
      }

    } catch (err: any) {
      console.error('Error loading user:', err);
      setError('Errore nel caricamento dei dettagli utente');
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

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  if (error || !user) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Dettagli Utente</h1>
            <Button variant="secondary" onClick={() => navigate('/users')}>
              Torna alla Lista
            </Button>
          </div>
          <ErrorMessage message={error || 'Utente non trovato'} onDismiss={() => setError('')} />
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
                <div className="ml-auto pl-3">
                  <div className="-mx-1.5 -my-1.5">
                    <button
                      onClick={() => setSuccess('')}
                      className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
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

  const handleEditUser = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      const response = await authService.updateUser(user.id, editFormData);

      if (response.success && response.data) {
        setUser(response.data);
        setSuccess('Utente aggiornato con successo');
        setShowEditModal(false);
      } else {
        setError('Errore nell\'aggiornamento dell\'utente');
      }
    } catch (err: any) {
      console.error('Error updating user:', err);
      setError('Errore nell\'aggiornamento dell\'utente');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      const response = await authService.toggleUserStatus(user.id, !user.isActive);

      if (response.success && response.data) {
        setUser(response.data);
        setSuccess(`Utente ${response.data.isActive ? 'attivato' : 'disattivato'} con successo`);
      } else {
        setError('Errore nel cambio stato utente');
      }
    } catch (err: any) {
      console.error('Error toggling user status:', err);
      setError('Errore nel cambio stato utente');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      const response = await authService.updateUserRole(user.id, selectedRole);

      if (response.success && response.data) {
        setUser(response.data);
        setSuccess('Ruolo aggiornato con successo');
        setShowRoleModal(false);
      } else {
        setError('Errore nell\'aggiornamento del ruolo');
      }
    } catch (err: any) {
      console.error('Error updating user role:', err);
      setError('Errore nell\'aggiornamento del ruolo');
    } finally {
      setLoading(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      const response = await authService.sendPasswordReset(user.email);

      if (response.success) {
        setSuccess('Email di reset password inviata con successo');
      } else {
        setError('Errore nell\'invio dell\'email di reset');
      }
    } catch (err: any) {
      console.error('Error sending password reset:', err);
      setError('Errore nell\'invio dell\'email di reset');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;

    if (!confirm('Sei sicuro di voler eliminare questo utente? Questa azione disattiverà l\'account.')) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await authService.deleteUser(user.id);

      if (response.success) {
        setSuccess('Utente eliminato con successo');
        setTimeout(() => navigate('/users'), 2000);
      } else {
        setError('Errore nell\'eliminazione dell\'utente');
      }
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError('Errore nell\'eliminazione dell\'utente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dettagli Utente</h1>
            <p className="mt-2 text-sm text-gray-700">
              Informazioni dettagliate sull'utente {user.username}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <Button variant="secondary" onClick={() => navigate('/users')}>
              Torna alla Lista
            </Button>
            <Button variant="primary" onClick={() => setShowEditModal(true)}>
              Modifica Utente
            </Button>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    onClick={() => setSuccess('')}
                    className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <ErrorMessage message={error} onDismiss={() => setError('')} />
        )}

        {/* User Profile Card */}
        <Card>
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="h-20 w-20 flex-shrink-0">
                <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-2xl font-medium text-gray-700">
                    {(user.firstName || user.username).charAt(0)}{(user.lastName || '').charAt(0) || (user.username || 'U').charAt(1)}
                  </span>
                </div>
              </div>
              <div className="ml-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.username}
                </h3>
                <p className="text-sm text-gray-500">@{user.username}</p>
                <div className="mt-2 flex items-center space-x-3">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getRoleBadge(user.role)}`}>
                    {getRoleText(user.role)}
                  </span>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.isActive ? 'Attivo' : 'Inattivo'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* User Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Information */}
          <Card>
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informazioni di Contatto</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <div className="mt-1 flex items-center">
                    <p className="text-sm text-gray-900">{user.email}</p>
                    {user.emailVerified ? (
                      <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Verificata
                      </span>
                    ) : (
                      <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Non verificata
                      </span>
                    )}
                  </div>
                </div>
                {user.phone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Telefono</label>
                    <p className="mt-1 text-sm text-gray-900">{user.phone}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Account Information */}
          <Card>
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informazioni Account</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <p className="mt-1 text-sm text-gray-900">@{user.username}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ruolo</label>
                  <p className="mt-1 text-sm text-gray-900">{getRoleText(user.role)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stato Account</label>
                  <p className="mt-1 text-sm text-gray-900">{user.isActive ? 'Attivo' : 'Inattivo'}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Activity Information */}
        <Card>
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Attività Account</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Registrato</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString('it-IT', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ultimo Aggiornamento</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(user.updatedAt).toLocaleDateString('it-IT', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ultimo Accesso</label>
                <p className="mt-1 text-sm text-gray-900">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('it-IT', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Mai'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <Card>
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Azioni Account</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" size="sm" onClick={handleSendPasswordReset}>
                Invia Email di Reset Password
              </Button>
              <Button variant="secondary" size="sm" onClick={handleToggleStatus}>
                {user.isActive ? 'Disattiva Account' : 'Attiva Account'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowRoleModal(true)}>
                Cambia Ruolo
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteUser}>
                Elimina Account
              </Button>
            </div>
          </div>
        </Card>

        {/* Edit User Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Modifica Utente</h3>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-4">
                  <Input
                    label="Nome"
                    value={editFormData.firstName}
                    onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                    fullWidth
                  />
                  <Input
                    label="Cognome"
                    value={editFormData.lastName}
                    onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                    fullWidth
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                    fullWidth
                  />
                  <Input
                    label="Username"
                    value={editFormData.username}
                    onChange={(e) => setEditFormData({...editFormData, username: e.target.value})}
                    fullWidth
                  />
                </div>
                <div className="flex space-x-3 mt-6">
                  <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                    Annulla
                  </Button>
                  <Button variant="primary" onClick={handleEditUser}>
                    Salva Modifiche
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Change Role Modal */}
        {showRoleModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Cambia Ruolo</h3>
                  <button
                    onClick={() => setShowRoleModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seleziona nuovo ruolo
                    </label>
                    <div className="space-y-2">
                      {['USER', 'MANAGER', 'ADMIN'].map((role) => (
                        <label key={role} className="flex items-center">
                          <input
                            type="radio"
                            value={role}
                            checked={selectedRole === role}
                            onChange={(e) => setSelectedRole(e.target.value as 'USER' | 'MANAGER' | 'ADMIN')}
                            className="mr-2"
                          />
                          {getRoleText(role)}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3 mt-6">
                  <Button variant="secondary" onClick={() => setShowRoleModal(false)}>
                    Annulla
                  </Button>
                  <Button variant="primary" onClick={handleUpdateRole}>
                    Aggiorna Ruolo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default UserDetailPage;