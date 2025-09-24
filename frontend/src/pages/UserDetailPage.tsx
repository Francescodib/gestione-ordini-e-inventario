import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService, addressService } from '../services/api';
import type { User, UserAddress, CreateAddressRequest, UpdateAddressRequest } from '../services/api';
import type { AvatarUpload as AvatarUploadType } from '../services/api';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import Input from '../components/Input';
import ErrorMessage from '../components/ErrorMessage';
import AvatarUpload from '../components/AvatarUpload';
import AddressModal from '../components/AddressModal';
import { useAuth } from '../contexts/AuthContext';

const UserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser, isAdmin } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    phone: ''
  });
  const [selectedRole, setSelectedRole] = useState<'CLIENT' | 'MANAGER' | 'ADMIN'>('CLIENT');

  useEffect(() => {
    if (id) {
      loadUser(id);
    }
  }, [id]);

  useEffect(() => {
    if (user?.role === 'CLIENT') {
      loadAddresses();
    }
  }, [user]);

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
          username: response.data.username,
          phone: response.data.phone || ''
        });
        setSelectedRole(response.data.role as 'CLIENT' | 'MANAGER' | 'ADMIN');
      } else {
        setError('Utente non trovato');
      }

    } catch (err: unknown) {
      console.error('Error loading user:', err);
      setError('Errore nel caricamento dei dettagli utente');
    } finally {
      setLoading(false);
    }
  };

  const loadAddresses = async () => {
    if (!user || user.role !== 'CLIENT') return;

    try {
      setAddressLoading(true);
      const response = await addressService.getUserAddresses(user.id.toString());

      if (response.success && response.data) {
        setAddresses(response.data);
      }
    } catch (err) {
      console.error('Error loading addresses:', err);
    } finally {
      setAddressLoading(false);
    }
  };

  const handleCreateAddress = async (addressData: CreateAddressRequest) => {
    if (!user) return;

    try {
      const response = await addressService.createAddress(user.id.toString(), addressData);

      if (response.success && response.data) {
        setSuccess('Indirizzo creato con successo');
        await loadAddresses();
        setShowAddressModal(false);
        setSelectedAddress(null);
      } else {
        setError('Errore nella creazione dell\'indirizzo');
      }
    } catch (err) {
      console.error('Error creating address:', err);
      setError('Errore nella creazione dell\'indirizzo');
    }
  };

  const handleUpdateAddress = async (addressData: UpdateAddressRequest) => {
    if (!user || !selectedAddress) return;

    try {
      const response = await addressService.updateAddress(
        user.id.toString(),
        selectedAddress.id.toString(),
        addressData
      );

      if (response.success && response.data) {
        setSuccess('Indirizzo aggiornato con successo');
        await loadAddresses();
        setShowAddressModal(false);
        setSelectedAddress(null);
      } else {
        setError('Errore nell\'aggiornamento dell\'indirizzo');
      }
    } catch (err) {
      console.error('Error updating address:', err);
      setError('Errore nell\'aggiornamento dell\'indirizzo');
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    if (!user) return;

    if (!confirm('Sei sicuro di voler eliminare questo indirizzo?')) {
      return;
    }

    try {
      const response = await addressService.deleteAddress(
        user.id.toString(),
        addressId.toString()
      );

      if (response.success) {
        setSuccess('Indirizzo eliminato con successo');
        await loadAddresses();
      } else {
        setError('Errore nell\'eliminazione dell\'indirizzo');
      }
    } catch (err) {
      console.error('Error deleting address:', err);
      setError('Errore nell\'eliminazione dell\'indirizzo');
    }
  };

  const handleSetDefaultAddress = async (addressId: number) => {
    if (!user) return;

    try {
      const response = await addressService.setDefaultAddress(
        user.id.toString(),
        addressId.toString()
      );

      if (response.success) {
        setSuccess('Indirizzo predefinito aggiornato');
        await loadAddresses();
      } else {
        setError('Errore nell\'impostazione dell\'indirizzo predefinito');
      }
    } catch (err) {
      console.error('Error setting default address:', err);
      setError('Errore nell\'impostazione dell\'indirizzo predefinito');
    }
  };

  const openAddressModal = (address?: UserAddress) => {
    setSelectedAddress(address || null);
    setShowAddressModal(true);
  };

  // Only admins can access this page
  if (!isAdmin()) {
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        </div>
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

  const handleEditUser = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      const response = await authService.updateUser(user.id, editFormData);

      if (response.success && response.data) {
        setUser(response.data);
        // Refresh form data with updated user data
        setEditFormData({
          firstName: response.data.firstName || '',
          lastName: response.data.lastName || '',
          email: response.data.email,
          username: response.data.username,
          phone: response.data.phone || ''
        });
        setSuccess('Utente aggiornato con successo');
        setShowEditModal(false);
      } else {
        setError('Errore nell\'aggiornamento dell\'utente');
      }
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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
        setSuccess('Simulazione di Funzione non ancora implementata - L\'invio di email di reset password non è al momento attivo');
      } else {
        setError('Funzione non ancora implementata - L\'invio di email di reset password non è al momento attivo');
      }
    } catch (err: unknown) {
      console.error('Error sending password reset:', err);
      setError('Funzione non ancora implementata - L\'invio di email di reset password non è al momento attivo');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;

    if (!confirm('Sei sicuro di voler disattivare questo utente? L\'account verrà disattivato ma mantenuto per preservare l\'integrità dei dati degli ordini associati.')) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await authService.deleteUser(user.id);

      if (response.success) {
        setSuccess('Utente disattivato con successo. L\'account rimane nel sistema per preservare l\'integrità dei dati.');
        setTimeout(() => navigate('/users'), 2000);
      } else {
        setError('Errore nella disattivazione dell\'utente');
      }
    } catch (err: unknown) {
      console.error('Error deleting user:', err);
      setError('Errore nell\'eliminazione dell\'utente');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUploadSuccess = () => {
    setSuccess('Avatar caricato con successo!');
  };

  const handleAvatarUploadError = (error: string) => {
    setError(error);
  };

  const handleAvatarDeleteSuccess = () => {
    setSuccess('Avatar rimosso con successo!');
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <div className="flex items-start space-x-6">
              {/* Avatar Upload */}
              <div className="flex-shrink-0">
                <AvatarUpload
                  userId={user.id}
                  size="xl"
                  onUploadSuccess={handleAvatarUploadSuccess}
                  onUploadError={handleAvatarUploadError}
                  onDeleteSuccess={handleAvatarDeleteSuccess}
                  showUploadButton={true}
                  allowDelete={true}
                  user={{
                    firstName: user.firstName,
                    lastName: user.lastName,
                    username: user.username
                  }}
                />
              </div>
              
              {/* User Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold text-gray-900">
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.username}
                </h3>
                <p className="text-sm text-gray-500">@{user.username}</p>
                <div className="mt-3 flex items-center flex-wrap gap-3">
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

                {/* Contact Information */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Informazioni di Contatto</h4>
                  {user.phone ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Telefono</label>
                      <p className="mt-1 text-sm text-gray-900">{user.phone}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Nessun numero di telefono configurato</p>
                  )}
                </div>

                {/* Address Management - Only for CLIENT users */}
                {user.role === 'CLIENT' && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium text-gray-900">Indirizzi Cliente</h4>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openAddressModal()}
                      >
                        Aggiungi Indirizzo
                      </Button>
                    </div>

                    {addressLoading ? (
                      <div className="flex justify-center py-4">
                        <LoadingSpinner size="sm" />
                      </div>
                    ) : addresses.length > 0 ? (
                      <div className="space-y-3">
                        {addresses.map((address) => (
                          <div key={address.id} className="bg-gray-50 border border-gray-200 rounded-md p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                    address.addressType === 'SHIPPING'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    {address.addressType === 'SHIPPING' ? 'Spedizione' : 'Fatturazione'}
                                  </span>
                                  {address.isDefault && (
                                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                      Predefinito
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-900 font-medium">{address.streetAddress}</p>
                                <p className="text-sm text-gray-600">
                                  {address.city}, {address.postalCode} {address.state && `(${address.state})`}
                                </p>
                                <p className="text-sm text-gray-600">{address.country}</p>
                              </div>
                              <div className="flex items-center space-x-2 ml-4">
                                {!address.isDefault && (
                                  <button
                                    onClick={() => handleSetDefaultAddress(address.id)}
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    Imposta come predefinito
                                  </button>
                                )}
                                <button
                                  onClick={() => openAddressModal(address)}
                                  className="text-xs text-gray-600 hover:text-gray-800"
                                >
                                  Modifica
                                </button>
                                <button
                                  onClick={() => handleDeleteAddress(address.id)}
                                  className="text-xs text-red-600 hover:text-red-800"
                                >
                                  Elimina
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-center">
                        <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-sm text-gray-500">Nessun indirizzo configurato</p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openAddressModal()}
                          className="mt-2"
                        >
                          Aggiungi il primo indirizzo
                        </Button>
                      </div>
                    )}
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
            </div>
          </div>
        </Card>

        {/* Edit User Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
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
                  <Input
                    label="Telefono"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                    fullWidth
                    placeholder="Es. +39 333 1234567"
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
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
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
                      {['CLIENT', 'MANAGER', 'ADMIN'].map((role) => (
                        <label key={role} className="flex items-center">
                          <input
                            type="radio"
                            value={role}
                            checked={selectedRole === role}
                            onChange={(e) => setSelectedRole(e.target.value as 'CLIENT' | 'MANAGER' | 'ADMIN')}
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

        {/* Address Modal */}
        {showAddressModal && (
          <AddressModal
            isOpen={showAddressModal}
            onClose={() => {
              setShowAddressModal(false);
              setSelectedAddress(null);
            }}
            onSave={selectedAddress ? handleUpdateAddress : handleCreateAddress}
            address={selectedAddress}
            loading={addressLoading}
            title={selectedAddress ? 'Modifica Indirizzo' : 'Nuovo Indirizzo'}
          />
        )}
        </div>
      </div>
    </Layout>
  );
};

export default UserDetailPage;