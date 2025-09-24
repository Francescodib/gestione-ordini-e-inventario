import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import AvatarUpload from '../components/AvatarUpload';
import Button from '../components/Button';
import AddressModal from '../components/AddressModal';
import { orderService, addressService, authService } from '../services/api';
import type { UserAddress, CreateAddressRequest, UpdateAddressRequest, Order as ApiOrder } from '../services/api';

// Temporary inline interfaces
interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'CLIENT' | 'MANAGER' | 'ADMIN';
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: Date | string;
  avatar?: string;
  phone?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface UserProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface EditableUserData extends UserProfileData {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

const ClientProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<EditableUserData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);

  useEffect(() => {
    if (user) {
      setEditData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
      });

      // Debounce API calls to avoid 429 errors
      const timeoutId = setTimeout(() => {
        loadUserOrders();
        loadAddresses();
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [user]);

  const loadUserOrders = async () => {
    if (!user) return;

    try {
      setOrdersLoading(true);
      const response = await orderService.getAllOrders();
      if (response.success && response.data) {
        // Solo gli ordini dell'utente corrente
        const userOrders = response.data.filter((order: ApiOrder) => order.userId === user.id);
        setOrders(userOrders);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadAddresses = async () => {
    if (!user) return;

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };


  const handleSaveChanges = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Validazione password se fornita
      if (editData.newPassword) {
        if (!editData.currentPassword) {
          setError('Password attuale richiesta per cambiare password');
          return;
        }
        if (editData.newPassword !== editData.confirmPassword) {
          setError('Le password non coincidono');
          return;
        }
        if (editData.newPassword.length < 6) {
          setError('La nuova password deve essere di almeno 6 caratteri');
          return;
        }
      }

      const updateData = {
        firstName: editData.firstName,
        lastName: editData.lastName,
        phone: editData.phone,
        ...(editData.newPassword && {
          currentPassword: editData.currentPassword,
          newPassword: editData.newPassword
        })
      };

      const response = await authService.updateUser(user.id, updateData);

      if (response.success && response.data) {
        // Aggiorna i dati utente nel context (questo aggiornerà anche localStorage)
        const updatedUser = { ...user, ...response.data };
        updateUser(updatedUser);

        setSuccess('Profilo aggiornato con successo');
        setEditMode(false);

        // Reset password fields
        setEditData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        setError(response.message || 'Errore durante l\'aggiornamento');
      }
    } catch {
      setError('Errore durante l\'aggiornamento del profilo');
    } finally {
      setLoading(false);
    }
  };


  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Il mio Profilo</h1>
            <p className="text-sm text-gray-600">Gestisci le tue informazioni personali e visualizza i tuoi ordini</p>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow rounded-lg p-6">
                <div className="text-center">
                  <div className="flex flex-col items-center mb-4">
                    <div className="[&_.flex.items-center.space-x-4]:flex-col [&_.flex.items-center.space-x-4]:items-center [&_.flex.items-center.space-x-4]:space-x-0 [&_.flex.items-center.space-x-4]:space-y-4">
                      <AvatarUpload
                        userId={user.id}
                        size="xl"
                        onUploadSuccess={() => {
                          setSuccess('Avatar caricato con successo!');
                          setTimeout(() => window.location.reload(), 1000);
                        }}
                        onUploadError={(error) => setError(error)}
                        onDeleteSuccess={() => {
                          setSuccess('Avatar rimosso con successo!');
                          setTimeout(() => window.location.reload(), 1000);
                        }}
                        showUploadButton={true}
                        allowDelete={true}
                        user={{
                          firstName: user.firstName,
                          lastName: user.lastName,
                          username: user.username
                        }}
                      />
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {user.firstName} {user.lastName}
                  </h2>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <p className="text-sm text-gray-400">Cliente dal {formatDate(user.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Informazioni Personali</h3>
                    {!editMode && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setEditMode(true)}
                      >
                        Modifica
                      </Button>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  {editMode ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                          <input
                            type="text"
                            name="firstName"
                            value={editData.firstName}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
                          <input
                            type="text"
                            name="lastName"
                            value={editData.lastName}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                        <input
                          type="tel"
                          name="phone"
                          value={editData.phone}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="border-t border-gray-200 pt-6">
                        <h4 className="text-lg font-medium text-gray-900 mb-4">Cambia Password (opzionale)</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password Attuale</label>
                            <input
                              type="password"
                              name="currentPassword"
                              value={editData.currentPassword || ''}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nuova Password</label>
                            <input
                              type="password"
                              name="newPassword"
                              value={editData.newPassword || ''}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Conferma Nuova Password</label>
                            <input
                              type="password"
                              name="confirmPassword"
                              value={editData.confirmPassword || ''}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3 pt-6">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditMode(false);
                            setError('');
                            setSuccess('');
                          }}
                        >
                          Annulla
                        </Button>
                        <Button
                          variant="primary"
                          onClick={handleSaveChanges}
                          loading={loading}
                        >
                          Salva Modifiche
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Nome</dt>
                          <dd className="mt-1 text-sm text-gray-900">{user.firstName}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Cognome</dt>
                          <dd className="mt-1 text-sm text-gray-900">{user.lastName}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Email</dt>
                          <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Username</dt>
                          <dd className="mt-1 text-sm text-gray-900">{user.username}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Telefono</dt>
                          <dd className="mt-1 text-sm text-gray-900">{user.phone || 'Non specificato'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Membro dal</dt>
                          <dd className="mt-1 text-sm text-gray-900">{formatDate(user.createdAt)}</dd>
                        </div>
                      </dl>
                    </div>
                  )}
                </div>
              </div>

              {/* Address Management */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">I miei Indirizzi</h3>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openAddressModal()}
                    >
                      Aggiungi Indirizzo
                    </Button>
                  </div>
                </div>
                <div className="p-6">
                  {addressLoading ? (
                    <div className="flex justify-center py-12">
                      <LoadingSpinner />
                    </div>
                  ) : addresses.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun indirizzo</h3>
                      <p className="mt-1 text-sm text-gray-500">Non hai ancora configurato indirizzi</p>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openAddressModal()}
                        className="mt-4"
                      >
                        Aggiungi il primo indirizzo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {addresses.map((address) => (
                        <div key={address.id} className="bg-gray-50 border border-gray-200 rounded-md p-4 hover:bg-gray-100 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
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
                            <div className="flex items-center space-x-3 ml-4">
                              {!address.isDefault && (
                                <button
                                  onClick={() => handleSetDefaultAddress(address.id)}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  Imposta predefinito
                                </button>
                              )}
                              <button
                                onClick={() => openAddressModal(address)}
                                className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                              >
                                Modifica
                              </button>
                              <button
                                onClick={() => handleDeleteAddress(address.id)}
                                className="text-xs text-red-600 hover:text-red-800 font-medium"
                              >
                                Elimina
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Orders Section */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">I miei Ordini</h3>
                </div>
                <div className="p-6">
                  {ordersLoading ? (
                    <div className="flex justify-center py-12">
                      <LoadingSpinner />
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun ordine</h3>
                      <p className="mt-1 text-sm text-gray-500">Non hai ancora effettuato ordini</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div key={order.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <h4 className="font-semibold text-gray-900">Ordine #{order.id}</h4>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">{formatDate(order.createdAt)}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Totale:</span>
                              <span className="ml-2 font-semibold text-green-600">€{order.totalAmount}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Articoli:</span>
                              <span className="ml-2 font-medium">{order.items?.length || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Pagamento:</span>
                              <span className="ml-2 font-medium">{order.paymentStatus}</span>
                            </div>
                          </div>

                          {order.items && order.items.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="space-y-2">
                                {order.items.map((item, index) => (
                                  <div key={index} className="flex justify-between items-center text-sm">
                                    <span className="text-gray-900">
                                      {item.name} <span className="text-gray-500">×{item.quantity}</span>
                                    </span>
                                    <span className="font-medium">€{(item.price * item.quantity).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

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

export default ClientProfilePage;