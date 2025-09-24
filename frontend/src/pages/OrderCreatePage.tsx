import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService, productService, authService, addressService } from '../services/api';
import type { Product, User, UserAddress, CreateOrderRequest } from '../services/api';
// Temporary: using inline type until module loading is fixed
interface OrderAddress {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import ErrorMessage from '../components/ErrorMessage';

interface OrderItem {
  productId: string; // Keeping as string for UI compatibility
  product?: Product;
  quantity: number;
  price: number;
  totalPrice: number;
}

interface OrderFormData {
  userId: string;
  items: OrderItem[];
  // New address reference fields (preferred method)
  shippingAddressId?: number;
  billingAddressId?: number;
  // Legacy address fields (fallback)
  shippingAddress: OrderAddress;
  billingAddress: OrderAddress;
  // For UI selection
  useShippingAddressId: boolean;
  useBillingAddressId: boolean;
  notes: string;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
}

interface NewCustomerForm {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phone: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  country: string;
}

const OrderCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userAddresses, setUserAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<OrderFormData>({
    userId: '',
    items: [],
    // New address reference fields
    shippingAddressId: undefined,
    billingAddressId: undefined,
    // Legacy address fields
    shippingAddress: {
      firstName: '',
      lastName: '',
      company: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Italy',
      phone: ''
    },
    billingAddress: {
      firstName: '',
      lastName: '',
      company: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Italy',
      phone: ''
    },
    // UI selection
    useShippingAddressId: false,
    useBillingAddressId: false,
    notes: '',
    shippingCost: 0,
    taxAmount: 0,
    discountAmount: 0
  });

  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  // New customer modal state
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState('');
  const [newCustomerForm, setNewCustomerForm] = useState<NewCustomerForm>({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    phone: '',
    streetAddress: '',
    city: '',
    postalCode: '',
    country: 'Italy'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsResponse, usersResponse] = await Promise.all([
        productService.getAllProducts({ status: 'ACTIVE' }),
        authService.getAllUsers()
      ]);

      if (productsResponse.success) {
        setProducts(productsResponse.data);
      }

      if (usersResponse.success) {
        // Filter only CLIENT users for order creation
        const clientUsers = usersResponse.data.filter(user => user.role === 'CLIENT' && user.isActive);
        setUsers(clientUsers);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
    }
  };

  const addItem = () => {
    if (!selectedProduct || selectedQuantity <= 0) {
      setError('Seleziona un prodotto e inserisci una quantità valida');
      return;
    }

    const product = products.find(p => p.id.toString() === selectedProduct);
    if (!product) {
      setError('Prodotto non trovato');
      return;
    }

    if (product.stock < selectedQuantity) {
      setError('Quantità non disponibile in magazzino');
      return;
    }

    // Check if product already exists in items
    const existingItemIndex = formData.items.findIndex(item => item.productId === selectedProduct);

    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...formData.items];
      updatedItems[existingItemIndex].quantity += selectedQuantity;
      updatedItems[existingItemIndex].totalPrice = updatedItems[existingItemIndex].quantity * updatedItems[existingItemIndex].price;

      setFormData(prev => ({
        ...prev,
        items: updatedItems
      }));
    } else {
      // Add new item
      const newItem: OrderItem = {
        productId: product.id.toString(),
        product,
        quantity: selectedQuantity,
        price: product.price,
        totalPrice: selectedQuantity * product.price
      };

      setFormData(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }));
    }

    setSelectedProduct('');
    setSelectedQuantity(1);
    setError('');
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(index);
      return;
    }

    const updatedItems = [...formData.items];
    updatedItems[index].quantity = quantity;
    updatedItems[index].totalPrice = quantity * updatedItems[index].price;

    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal + formData.shippingCost + formData.taxAmount - formData.discountAmount;
  };

  const createNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingCustomer(true);
    setCustomerError('');

    try {
      const userData = {
        ...newCustomerForm,
        password: 'TempPassword123!', // Temporary password - should be changed on first login
        role: 'CLIENT',
        isActive: true
      };

      const response = await authService.register(userData);

      if (response.success && response.user) {
        // Add new user to users list (only if it's a CLIENT)
        if (response.user.role === 'CLIENT') {
          setUsers(prev => [...prev, response.user]);
          // Select the new user
          setFormData(prev => ({ ...prev, userId: response.user.id.toString() }));

          // Auto-populate address fields if they were provided during customer creation
          if (newCustomerForm.streetAddress || newCustomerForm.city || newCustomerForm.postalCode) {
            const customerAddress: OrderAddress = {
              firstName: newCustomerForm.firstName,
              lastName: newCustomerForm.lastName,
              company: '',
              address1: newCustomerForm.streetAddress,
              address2: '',
              city: newCustomerForm.city,
              state: newCustomerForm.city, // Use city as state fallback
              postalCode: newCustomerForm.postalCode,
              country: newCustomerForm.country,
              phone: newCustomerForm.phone
            };

            setFormData(prev => ({
              ...prev,
              shippingAddress: customerAddress,
              billingAddress: customerAddress
            }));

            setSuccess('Nuovo cliente creato con successo! Indirizzi popolati automaticamente.');
          } else {
            setSuccess('Nuovo cliente creato con successo!');
          }
        }
        // Close modal and reset form
        setShowNewCustomerModal(false);
        setNewCustomerForm({
          firstName: '',
          lastName: '',
          email: '',
          username: '',
          phone: '',
          streetAddress: '',
          city: '',
          postalCode: '',
          country: 'Italy'
        });
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(response.message || 'Errore durante la creazione del cliente');
      }
    } catch (error: any) {
      setCustomerError(error.message || 'Errore durante la creazione del cliente');
    } finally {
      setCreatingCustomer(false);
    }
  };

  const loadUserAddresses = async (userId: string) => {
    try {
      const response = await addressService.getUserAddresses(userId);
      if (response.success && response.data) {
        setUserAddresses(response.data);

        // If user has addresses, auto-populate legacy address fields with default address
        if (response.data.length > 0) {
          const defaultShipping = response.data.find(addr => addr.isDefault) || response.data[0];

          // Convert UserAddress to OrderAddress format
          // Get user name from selected user since UserAddress doesn't contain name fields
          const selectedUser = users.find(u => u.id.toString() === formData.userId);
          const convertedAddress: OrderAddress = {
            firstName: selectedUser?.firstName || '',
            lastName: selectedUser?.lastName || '',
            company: '',
            address1: defaultShipping.streetAddress || '',
            address2: '',
            city: defaultShipping.city || '',
            state: defaultShipping.state || defaultShipping.city || 'IT',
            postalCode: defaultShipping.postalCode || '',
            country: defaultShipping.country || 'Italy',
            phone: selectedUser?.phone || ''
          };

          setFormData(prev => ({
            ...prev,
            shippingAddressId: defaultShipping.id,
            billingAddressId: defaultShipping.id,
            useShippingAddressId: true,
            useBillingAddressId: true,
            shippingAddress: convertedAddress,
            billingAddress: convertedAddress
          }));

          setSuccess(`Trovati ${response.data.length} indirizzi per questo cliente - indirizzo predefinito caricato`);
          setTimeout(() => setSuccess(''), 3000);
        } else {
          // No addresses found, reset to manual entry
          setUserAddresses([]);
          setFormData(prev => ({
            ...prev,
            shippingAddressId: undefined,
            billingAddressId: undefined,
            useShippingAddressId: false,
            useBillingAddressId: false
          }));

          setError('Nessun indirizzo salvato per questo cliente - inserisci manualmente');
          setTimeout(() => setError(''), 3000);
        }
      } else {
        setUserAddresses([]);
        setFormData(prev => ({
          ...prev,
          shippingAddressId: undefined,
          billingAddressId: undefined,
          useShippingAddressId: false,
          useBillingAddressId: false
        }));
      }
    } catch (error) {
      console.error('Error loading user addresses:', error);
      setUserAddresses([]);
      setFormData(prev => ({
        ...prev,
        shippingAddressId: undefined,
        billingAddressId: undefined,
        useShippingAddressId: false,
        useBillingAddressId: false
      }));
    }
  };

  const handleUserChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = e.target.value;
    setFormData(prev => ({ ...prev, userId }));

    // Load user addresses if available
    if (userId) {
      await loadUserAddresses(userId);
    } else {
      // Reset address data when no user selected
      setUserAddresses([]);
      setFormData(prev => ({
        ...prev,
        shippingAddressId: undefined,
        billingAddressId: undefined,
        useShippingAddressId: false,
        useBillingAddressId: false
      }));
    }
  };

  const handleNumberInput = (field: keyof OrderFormData, value: string) => {
    // Se il campo è vuoto, imposta a 0
    if (value === '') {
      setFormData(prev => ({ ...prev, [field]: 0 }));
      return;
    }

    // Rimuovi caratteri non numerici eccetto punto e virgola
    const cleanValue = value.replace(/[^0-9.,]/g, '').replace(',', '.');

    // Se è solo un punto, ignora
    if (cleanValue === '.') {
      return;
    }

    // Se è un numero valido, aggiorna
    const numValue = parseFloat(cleanValue);
    if (!isNaN(numValue) && numValue >= 0) {
      setFormData(prev => ({ ...prev, [field]: numValue }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validation
      if (!formData.userId) {
        throw new Error('Seleziona un cliente');
      }
      if (formData.items.length === 0) {
        throw new Error('Aggiungi almeno un prodotto all\'ordine');
      }

      // Validate shipping address
      if (formData.useShippingAddressId) {
        if (!formData.shippingAddressId) {
          throw new Error('Seleziona un indirizzo di spedizione dalla lista');
        }
      } else {
        if (!formData.shippingAddress.address1?.trim() || !formData.shippingAddress.city?.trim() ||
            !formData.shippingAddress.postalCode?.trim()) {
          throw new Error('Completa tutti i campi obbligatori dell\'indirizzo di spedizione');
        }
      }

      // Order data calculations are handled in the component methods

      // Get selected user data to populate name fields
      const selectedUser = users.find(u => u.id.toString() === formData.userId);
      if (!selectedUser) {
        throw new Error('Cliente selezionato non trovato');
      }

      // Convert addresses to legacy format expected by backend
      const shippingAddress = {
        firstName: formData.shippingAddress.firstName || selectedUser.firstName || 'Cliente',
        lastName: formData.shippingAddress.lastName || selectedUser.lastName || 'Cliente',
        company: formData.shippingAddress.company || '',
        address1: formData.shippingAddress.address1 || '',
        address2: formData.shippingAddress.address2 || '',
        city: formData.shippingAddress.city || '',
        state: formData.shippingAddress.state || formData.shippingAddress.city || 'IT',
        postalCode: formData.shippingAddress.postalCode || '',
        country: formData.shippingAddress.country || 'Italy',
        phone: formData.shippingAddress.phone || selectedUser.phone || ''
      };

      const billingAddress = (formData.billingAddress.firstName.trim() || formData.billingAddress.lastName.trim() || formData.billingAddress.address1.trim())
        ? {
            firstName: formData.billingAddress.firstName || selectedUser.firstName || 'Cliente',
            lastName: formData.billingAddress.lastName || selectedUser.lastName || 'Cliente',
            company: formData.billingAddress.company || '',
            address1: formData.billingAddress.address1 || '',
            address2: formData.billingAddress.address2 || '',
            city: formData.billingAddress.city || '',
            state: formData.billingAddress.state || formData.billingAddress.city || 'IT',
            postalCode: formData.billingAddress.postalCode || '',
            country: formData.billingAddress.country || 'Italy',
            phone: formData.billingAddress.phone || selectedUser.phone || ''
          }
        : shippingAddress;

      // Prepare order data using new CreateOrderRequest interface
      const orderData: CreateOrderRequest = {
        items: formData.items.map(item => ({
          productId: parseInt(item.productId), // Convert string to number
          quantity: item.quantity,
          unitPrice: item.price // Use unitPrice instead of price to match backend
        })),
        targetUserId: parseInt(formData.userId), // Add target user ID for admin orders
        shippingCost: formData.shippingCost,
        taxAmount: formData.taxAmount,
        discountAmount: formData.discountAmount,
        notes: formData.notes,
        currency: 'EUR'
      };

      // Always use legacy address format (like OrderEditPage) to avoid foreign key constraint issues
      orderData.shippingAddress = shippingAddress;
      orderData.billingAddress = billingAddress;

      const response = await orderService.createOrder(orderData);

      if (response.success) {
        setSuccess('Ordine creato con successo!');
        setTimeout(() => {
          navigate('/orders');
        }, 1500);
      } else {
        throw new Error(response.message || 'Errore durante la creazione dell\'ordine');
      }
    } catch (error: any) {
      setError(error.message || 'Errore durante la creazione dell\'ordine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nuovo Ordine</h1>
              <p className="mt-2 text-sm text-gray-700">
                Crea un nuovo ordine per un cliente
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => navigate('/orders')}
            >
              Annulla
            </Button>
          </div>

          {error && (
            <ErrorMessage message={error} onDismiss={() => setError('')} />
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{success}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Order Items */}
              <div className="lg:col-span-2 space-y-6">
                {/* Customer Selection */}
                <Card>
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Cliente</h3>
                  </div>
                  <div className="px-6 py-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Seleziona Cliente *
                        </label>
                        <select
                          value={formData.userId}
                          onChange={handleUserChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="">Seleziona un cliente</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.firstName} {user.lastName} ({user.email})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setShowNewCustomerModal(true)}
                          className="w-full"
                        >
                          + Crea Nuovo Cliente
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Address Selection (for CLIENT users with saved addresses) */}
                {formData.userId && userAddresses.length > 0 && (
                  <Card>
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Selezione Indirizzi</h3>
                    </div>
                    <div className="px-6 py-4 space-y-6">
                      {/* Shipping Address Selection */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Indirizzo di Spedizione</h4>
                        <div className="space-y-3">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="shippingAddressMode"
                              checked={formData.useShippingAddressId}
                              onChange={() => setFormData(prev => ({
                                ...prev,
                                useShippingAddressId: true,
                                shippingAddressId: userAddresses[0]?.id || undefined
                              }))}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">Usa indirizzo salvato</span>
                          </label>
                          {formData.useShippingAddressId && (
                            <select
                              value={formData.shippingAddressId || ''}
                              onChange={(e) => {
                                const addressId = parseInt(e.target.value);
                                const selectedAddress = userAddresses.find(addr => addr.id === addressId);

                                if (selectedAddress) {
                                  // Convert to legacy format and update form
                                  // Get user name from selected user since UserAddress doesn't contain name fields
                                  const selectedUser = users.find(u => u.id.toString() === formData.userId);
                                  const convertedAddress: OrderAddress = {
                                    firstName: selectedUser?.firstName || '',
                                    lastName: selectedUser?.lastName || '',
                                    company: '',
                                    address1: selectedAddress.streetAddress || '',
                                    address2: '',
                                    city: selectedAddress.city || '',
                                    state: selectedAddress.state || selectedAddress.city || 'IT',
                                    postalCode: selectedAddress.postalCode || '',
                                    country: selectedAddress.country || 'Italy',
                                    phone: selectedUser?.phone || ''
                                  };

                                  setFormData(prev => ({
                                    ...prev,
                                    shippingAddressId: addressId,
                                    shippingAddress: convertedAddress
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    shippingAddressId: undefined
                                  }));
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ml-6"
                            >
                              {userAddresses.map((address) => (
                                <option key={address.id} value={address.id}>
                                  {address.streetAddress} - {address.city}, {address.postalCode}
                                  {address.isDefault && ' (Predefinito)'}
                                </option>
                              ))}
                            </select>
                          )}
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="shippingAddressMode"
                              checked={!formData.useShippingAddressId}
                              onChange={() => setFormData(prev => ({
                                ...prev,
                                useShippingAddressId: false,
                                shippingAddressId: undefined
                              }))}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">Inserisci nuovo indirizzo</span>
                          </label>
                        </div>
                      </div>

                      {/* Billing Address Selection */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Indirizzo di Fatturazione</h4>
                        <div className="space-y-3">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="billingAddressMode"
                              checked={formData.useBillingAddressId}
                              onChange={() => setFormData(prev => ({
                                ...prev,
                                useBillingAddressId: true,
                                billingAddressId: userAddresses[0]?.id || undefined
                              }))}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">Usa indirizzo salvato</span>
                          </label>
                          {formData.useBillingAddressId && (
                            <select
                              value={formData.billingAddressId || ''}
                              onChange={(e) => {
                                const addressId = parseInt(e.target.value);
                                const selectedAddress = userAddresses.find(addr => addr.id === addressId);

                                if (selectedAddress) {
                                  // Convert to legacy format and update form
                                  // Get user name from selected user since UserAddress doesn't contain name fields
                                  const selectedUser = users.find(u => u.id.toString() === formData.userId);
                                  const convertedAddress: OrderAddress = {
                                    firstName: selectedUser?.firstName || '',
                                    lastName: selectedUser?.lastName || '',
                                    company: '',
                                    address1: selectedAddress.streetAddress || '',
                                    address2: '',
                                    city: selectedAddress.city || '',
                                    state: selectedAddress.state || selectedAddress.city || 'IT',
                                    postalCode: selectedAddress.postalCode || '',
                                    country: selectedAddress.country || 'Italy',
                                    phone: selectedUser?.phone || ''
                                  };

                                  setFormData(prev => ({
                                    ...prev,
                                    billingAddressId: addressId,
                                    billingAddress: convertedAddress
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    billingAddressId: undefined
                                  }));
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ml-6"
                            >
                              {userAddresses.map((address) => (
                                <option key={address.id} value={address.id}>
                                  {address.streetAddress} - {address.city}, {address.postalCode}
                                  {address.isDefault && ' (Predefinito)'}
                                </option>
                              ))}
                            </select>
                          )}
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="billingAddressMode"
                              checked={!formData.useBillingAddressId}
                              onChange={() => setFormData(prev => ({
                                ...prev,
                                useBillingAddressId: false,
                                billingAddressId: undefined
                              }))}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">Inserisci nuovo indirizzo o uguale alla spedizione</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Add Products */}
                <Card>
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Aggiungi Prodotti</h3>
                  </div>
                  <div className="px-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Prodotto
                        </label>
                        <select
                          value={selectedProduct}
                          onChange={(e) => setSelectedProduct(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Seleziona un prodotto</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} - €{product.price.toFixed(2)} (Stock: {product.stock})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantità
                        </label>
                        <div className="flex">
                          <input
                            type="number"
                            min="1"
                            value={selectedQuantity}
                            onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                          <Button
                            type="button"
                            onClick={addItem}
                            className="rounded-l-none"
                          >
                            Aggiungi
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Order Items */}
                <Card>
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                      Prodotti nell'ordine ({formData.items.length})
                    </h3>
                  </div>
                  <div className="overflow-hidden">
                    {formData.items.length === 0 ? (
                      <div className="px-6 py-8 text-center">
                        <p className="text-gray-500">Nessun prodotto aggiunto all'ordine</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Prodotto
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Prezzo
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Quantità
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Totale
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Azioni
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {formData.items.map((item, index) => (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {item.product?.name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      SKU: {item.product?.sku}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  €{item.price.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 0)}
                                    className="w-20 px-3 py-1 border border-gray-300 rounded-md text-sm"
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  €{item.totalPrice.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Rimuovi
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Manual Address Entry */}
                {(!formData.useShippingAddressId || !formData.useBillingAddressId || userAddresses.length === 0) && (
                  <Card>
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Indirizzi Manuali</h3>
                    </div>
                    <div className="px-6 py-4 space-y-6">
                      {/* Shipping Address */}
                      {!formData.useShippingAddressId && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Indirizzo di Spedizione *</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Nome *"
                          type="text"
                          value={formData.shippingAddress.firstName}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            shippingAddress: { ...prev.shippingAddress, firstName: e.target.value }
                          }))}
                          placeholder="Nome"
                          required
                        />
                        <Input
                          label="Cognome *"
                          type="text"
                          value={formData.shippingAddress.lastName}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            shippingAddress: { ...prev.shippingAddress, lastName: e.target.value }
                          }))}
                          placeholder="Cognome"
                          required
                        />
                        <Input
                          label="Azienda"
                          type="text"
                          value={formData.shippingAddress.company}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            shippingAddress: { ...prev.shippingAddress, company: e.target.value }
                          }))}
                          placeholder="Nome azienda (opzionale)"
                        />
                        <Input
                          label="Telefono"
                          type="text"
                          value={formData.shippingAddress.phone}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            shippingAddress: { ...prev.shippingAddress, phone: e.target.value }
                          }))}
                          placeholder="Numero di telefono (opzionale)"
                        />
                        <Input
                          label="Indirizzo *"
                          type="text"
                          value={formData.shippingAddress.address1}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            shippingAddress: { ...prev.shippingAddress, address1: e.target.value }
                          }))}
                          placeholder="Via, numero civico"
                          required
                        />
                        <Input
                          label="Indirizzo (riga 2)"
                          type="text"
                          value={formData.shippingAddress.address2}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            shippingAddress: { ...prev.shippingAddress, address2: e.target.value }
                          }))}
                          placeholder="Appartamento, scala, ecc. (opzionale)"
                        />
                        <Input
                          label="Città *"
                          type="text"
                          value={formData.shippingAddress.city}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            shippingAddress: { ...prev.shippingAddress, city: e.target.value }
                          }))}
                          placeholder="Città"
                          required
                        />
                        <Input
                          label="Provincia"
                          type="text"
                          value={formData.shippingAddress.state}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            shippingAddress: { ...prev.shippingAddress, state: e.target.value }
                          }))}
                          placeholder="Provincia (opzionale)"
                        />
                        <Input
                          label="CAP *"
                          type="text"
                          value={formData.shippingAddress.postalCode}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            shippingAddress: { ...prev.shippingAddress, postalCode: e.target.value }
                          }))}
                          placeholder="00000"
                          required
                        />
                        <Input
                          label="Paese"
                          type="text"
                          value={formData.shippingAddress.country}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            shippingAddress: { ...prev.shippingAddress, country: e.target.value }
                          }))}
                          placeholder="Italy"
                        />
                          </div>
                        </div>
                      )}

                      {/* Billing Address */}
                      {!formData.useBillingAddressId && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Indirizzo di Fatturazione (opzionale)</h4>
                      <div className="mb-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={
                              formData.billingAddress.firstName === formData.shippingAddress.firstName &&
                              formData.billingAddress.lastName === formData.shippingAddress.lastName &&
                              formData.billingAddress.address1 === formData.shippingAddress.address1 &&
                              formData.billingAddress.city === formData.shippingAddress.city &&
                              formData.billingAddress.postalCode === formData.shippingAddress.postalCode
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                // Copia l'indirizzo di spedizione
                                setFormData(prev => ({
                                  ...prev,
                                  billingAddress: { ...prev.shippingAddress }
                                }));
                              } else {
                                // Svuota l'indirizzo di fatturazione per permettere modifica
                                setFormData(prev => ({
                                  ...prev,
                                  billingAddress: {
                                    firstName: '',
                                    lastName: '',
                                    company: '',
                                    address1: '',
                                    address2: '',
                                    city: '',
                                    state: '',
                                    postalCode: '',
                                    country: 'Italy',
                                    phone: ''
                                  }
                                }));
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-600">Uguale all'indirizzo di spedizione</span>
                        </label>
                      </div>
                      {!(
                        formData.billingAddress.firstName === formData.shippingAddress.firstName &&
                        formData.billingAddress.lastName === formData.shippingAddress.lastName &&
                        formData.billingAddress.address1 === formData.shippingAddress.address1 &&
                        formData.billingAddress.city === formData.shippingAddress.city &&
                        formData.billingAddress.postalCode === formData.shippingAddress.postalCode
                      ) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input
                            label="Nome"
                            type="text"
                            value={formData.billingAddress.firstName}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              billingAddress: { ...prev.billingAddress, firstName: e.target.value }
                            }))}
                            placeholder="Nome"
                          />
                          <Input
                            label="Cognome"
                            type="text"
                            value={formData.billingAddress.lastName}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              billingAddress: { ...prev.billingAddress, lastName: e.target.value }
                            }))}
                            placeholder="Cognome"
                          />
                          <Input
                            label="Azienda"
                            type="text"
                            value={formData.billingAddress.company}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              billingAddress: { ...prev.billingAddress, company: e.target.value }
                            }))}
                            placeholder="Nome azienda (opzionale)"
                          />
                          <Input
                            label="Telefono"
                            type="text"
                            value={formData.billingAddress.phone}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              billingAddress: { ...prev.billingAddress, phone: e.target.value }
                            }))}
                            placeholder="Numero di telefono (opzionale)"
                          />
                          <Input
                            label="Indirizzo"
                            type="text"
                            value={formData.billingAddress.address1}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              billingAddress: { ...prev.billingAddress, address1: e.target.value }
                            }))}
                            placeholder="Via, numero civico"
                          />
                          <Input
                            label="Indirizzo (riga 2)"
                            type="text"
                            value={formData.billingAddress.address2}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              billingAddress: { ...prev.billingAddress, address2: e.target.value }
                            }))}
                            placeholder="Appartamento, scala, ecc. (opzionale)"
                          />
                          <Input
                            label="Città"
                            type="text"
                            value={formData.billingAddress.city}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              billingAddress: { ...prev.billingAddress, city: e.target.value }
                            }))}
                            placeholder="Città"
                          />
                          <Input
                            label="Provincia"
                            type="text"
                            value={formData.billingAddress.state}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              billingAddress: { ...prev.billingAddress, state: e.target.value }
                            }))}
                            placeholder="Provincia (opzionale)"
                          />
                          <Input
                            label="CAP"
                            type="text"
                            value={formData.billingAddress.postalCode}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              billingAddress: { ...prev.billingAddress, postalCode: e.target.value }
                            }))}
                            placeholder="00000"
                          />
                          <Input
                            label="Paese"
                            type="text"
                            value={formData.billingAddress.country}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              billingAddress: { ...prev.billingAddress, country: e.target.value }
                            }))}
                            placeholder="Italy"
                          />
                        </div>
                      )}
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Notes */}
                <Card>
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Note</h3>
                  </div>
                  <div className="px-6 py-4">
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Note aggiuntive per l'ordine"
                    />
                  </div>
                </Card>
              </div>

              {/* Right Column - Order Summary */}
              <div className="space-y-6">
                <Card>
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Riepilogo Ordine</h3>
                  </div>
                  <div className="px-6 py-4 space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Subtotale:</span>
                      <span className="text-sm font-medium">€{calculateSubtotal().toFixed(2)}</span>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Costi di Spedizione
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formData.shippingCost === 0 ? '' : formData.shippingCost.toString()}
                        onChange={(e) => handleNumberInput('shippingCost', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tasse
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formData.taxAmount === 0 ? '' : formData.taxAmount.toString()}
                        onChange={(e) => handleNumberInput('taxAmount', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sconto
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formData.discountAmount === 0 ? '' : formData.discountAmount.toString()}
                        onChange={(e) => handleNumberInput('discountAmount', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between">
                        <span className="text-lg font-medium text-gray-900">Totale:</span>
                        <span className="text-lg font-bold text-gray-900">€{calculateTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading || formData.items.length === 0}
                  className="w-full"
                >
                  {loading ? 'Creando Ordine...' : 'Crea Ordine'}
                </Button>
              </div>
            </div>
          </form>

          {/* New Customer Modal */}
          {showNewCustomerModal && (
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Crea Nuovo Cliente</h3>

                  {customerError && (
                    <ErrorMessage message={customerError} onDismiss={() => setCustomerError('')} />
                  )}

                  <form onSubmit={createNewCustomer} className="space-y-4">
                    <Input
                      label="Nome *"
                      type="text"
                      value={newCustomerForm.firstName}
                      onChange={(e) => setNewCustomerForm(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Nome"
                      required
                    />

                    <Input
                      label="Cognome *"
                      type="text"
                      value={newCustomerForm.lastName}
                      onChange={(e) => setNewCustomerForm(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Cognome"
                      required
                    />

                    <Input
                      label="Username *"
                      type="text"
                      value={newCustomerForm.username}
                      onChange={(e) => setNewCustomerForm(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Username"
                      required
                    />

                    <Input
                      label="Email *"
                      type="email"
                      value={newCustomerForm.email}
                      onChange={(e) => setNewCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@example.com"
                      required
                    />

                    {/* Address Fields Section */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Informazioni di Contatto</h4>
                      <div className="space-y-4">
                        <Input
                          label="Telefono"
                          type="text"
                          value={newCustomerForm.phone}
                          onChange={(e) => setNewCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="Numero di telefono"
                        />

                        <Input
                          label="Indirizzo"
                          type="text"
                          value={newCustomerForm.streetAddress}
                          onChange={(e) => setNewCustomerForm(prev => ({ ...prev, streetAddress: e.target.value }))}
                          placeholder="Via, numero civico"
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            label="Città"
                            type="text"
                            value={newCustomerForm.city}
                            onChange={(e) => setNewCustomerForm(prev => ({ ...prev, city: e.target.value }))}
                            placeholder="Città"
                          />

                          <Input
                            label="CAP"
                            type="text"
                            value={newCustomerForm.postalCode}
                            onChange={(e) => setNewCustomerForm(prev => ({ ...prev, postalCode: e.target.value }))}
                            placeholder="00000"
                          />
                        </div>

                        <Input
                          label="Paese"
                          type="text"
                          value={newCustomerForm.country}
                          onChange={(e) => setNewCustomerForm(prev => ({ ...prev, country: e.target.value }))}
                          placeholder="Italy"
                        />
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                      <p className="text-sm text-yellow-700">
                        <strong>Nota:</strong> La password temporanea sarà "TempPassword123!" -
                        il cliente dovrà cambiarla al primo accesso.
                      </p>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setShowNewCustomerModal(false);
                          setCustomerError('');
                          setNewCustomerForm({
                            firstName: '',
                            lastName: '',
                            email: '',
                            username: '',
                            phone: '',
                            streetAddress: '',
                            city: '',
                            postalCode: '',
                            country: 'Italy'
                          });
                        }}
                        disabled={creatingCustomer}
                      >
                        Annulla
                      </Button>
                      <Button
                        type="submit"
                        loading={creatingCustomer}
                      >
                        {creatingCustomer ? 'Creando...' : 'Crea Cliente'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default OrderCreatePage;