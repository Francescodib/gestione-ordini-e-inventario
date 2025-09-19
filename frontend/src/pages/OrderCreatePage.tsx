import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService, productService, authService } from '../services/api';
import type { Product, User } from '../services/api';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import ErrorMessage from '../components/ErrorMessage';

interface OrderItem {
  productId: string;
  product?: Product;
  quantity: number;
  price: number;
  totalPrice: number;
}

interface OrderFormData {
  userId: string;
  items: OrderItem[];
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  billingAddress: {
    name: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
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
}

const OrderCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<OrderFormData>({
    userId: '',
    items: [],
    shippingAddress: {
      name: '',
      street: '',
      city: '',
      postalCode: '',
      country: 'Italia'
    },
    billingAddress: {
      name: '',
      street: '',
      city: '',
      postalCode: '',
      country: 'Italia'
    },
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
    username: ''
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
        setUsers(usersResponse.data);
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
        role: 'USER',
        isActive: true
      };

      const response = await authService.register(userData);

      if (response.success && response.user) {
        // Add new user to users list
        setUsers(prev => [...prev, response.user]);
        // Select the new user
        setFormData(prev => ({ ...prev, userId: response.user.id.toString() }));
        // Close modal and reset form
        setShowNewCustomerModal(false);
        setNewCustomerForm({
          firstName: '',
          lastName: '',
          email: '',
          username: ''
        });
        setSuccess('Nuovo cliente creato con successo!');
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

  const loadUserAddress = async (userId: string) => {
    try {
      const response = await authService.getUserLastAddress(userId);
      if (response.success && response.data) {
        const { shippingAddress, billingAddress } = response.data;

        // Verifica se ci sono indirizzi validi
        const hasShippingAddress = shippingAddress && Object.keys(shippingAddress).length > 0 && shippingAddress.name;
        const hasBillingAddress = billingAddress && Object.keys(billingAddress).length > 0 && billingAddress.name;

        if (hasShippingAddress || hasBillingAddress) {
          // Popola gli indirizzi disponibili
          setFormData(prev => ({
            ...prev,
            shippingAddress: hasShippingAddress ? {
              name: shippingAddress.name || '',
              street: shippingAddress.street || '',
              city: shippingAddress.city || '',
              postalCode: shippingAddress.postalCode || '',
              country: shippingAddress.country || 'Italia'
            } : {
              name: '',
              street: '',
              city: '',
              postalCode: '',
              country: 'Italia'
            },
            billingAddress: hasBillingAddress ? {
              name: billingAddress.name || '',
              street: billingAddress.street || '',
              city: billingAddress.city || '',
              postalCode: billingAddress.postalCode || '',
              country: billingAddress.country || 'Italia'
            } : {
              name: '',
              street: '',
              city: '',
              postalCode: '',
              country: 'Italia'
            }
          }));

          // Messaggio di successo
          setSuccess('Indirizzi caricati automaticamente dall\'ultimo ordine del cliente');
          setTimeout(() => setSuccess(''), 3000);
        } else {
          // Svuota tutti i campi se non ci sono indirizzi validi
          setFormData(prev => ({
            ...prev,
            shippingAddress: {
              name: '',
              street: '',
              city: '',
              postalCode: '',
              country: 'Italia'
            },
            billingAddress: {
              name: '',
              street: '',
              city: '',
              postalCode: '',
              country: 'Italia'
            }
          }));

          // Messaggio informativo
          setError('Nessun indirizzo precedente trovato per questo cliente - inserisci manualmente');
          setTimeout(() => setError(''), 3000);
        }
      } else {
        // Svuota i campi se la risposta non contiene dati
        setFormData(prev => ({
          ...prev,
          shippingAddress: {
            name: '',
            street: '',
            city: '',
            postalCode: '',
            country: 'Italia'
          },
          billingAddress: {
            name: '',
            street: '',
            city: '',
            postalCode: '',
            country: 'Italia'
          }
        }));

        setError('Nessun indirizzo precedente trovato per questo cliente - inserisci manualmente');
        setTimeout(() => setError(''), 3000);
      }
    } catch (error) {
      // Svuota i campi in caso di errore
      setFormData(prev => ({
        ...prev,
        shippingAddress: {
          name: '',
          street: '',
          city: '',
          postalCode: '',
          country: 'Italia'
        },
        billingAddress: {
          name: '',
          street: '',
          city: '',
          postalCode: '',
          country: 'Italia'
        }
      }));

      setError('Nessun indirizzo precedente trovato per questo cliente - inserisci manualmente');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleUserChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = e.target.value;
    setFormData(prev => ({ ...prev, userId }));

    // Carica l'ultimo indirizzo dell'utente se disponibile
    if (userId) {
      await loadUserAddress(userId);
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
      if (!formData.shippingAddress.name.trim() || !formData.shippingAddress.street.trim() ||
          !formData.shippingAddress.city.trim() || !formData.shippingAddress.postalCode.trim()) {
        throw new Error('Completa tutti i campi obbligatori dell\'indirizzo di spedizione');
      }

      const subtotal = calculateSubtotal();
      const totalAmount = calculateTotal();

      const orderData = {
        userId: formData.userId,
        items: formData.items.map(item => ({
          productId: item.productId,
          name: item.product?.name || '',
          sku: item.product?.sku || '',
          quantity: item.quantity,
          price: item.price,
          totalPrice: item.totalPrice
        })),
        subtotal,
        shippingCost: formData.shippingCost,
        taxAmount: formData.taxAmount,
        discountAmount: formData.discountAmount,
        totalAmount,
        shippingAddress: JSON.stringify(formData.shippingAddress),
        billingAddress: JSON.stringify(
          formData.billingAddress.name.trim()
            ? formData.billingAddress
            : formData.shippingAddress
        ),
        notes: formData.notes,
        status: 'PENDING',
        paymentStatus: 'PENDING'
      };

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

                {/* Addresses */}
                <Card>
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Indirizzi</h3>
                  </div>
                  <div className="px-6 py-4 space-y-6">
                    {/* Shipping Address */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Indirizzo di Spedizione *</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Nome completo *"
                          type="text"
                          value={formData.shippingAddress.name}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            shippingAddress: { ...prev.shippingAddress, name: e.target.value }
                          }))}
                          placeholder="Nome e cognome"
                          required
                        />
                        <Input
                          label="Via e numero civico *"
                          type="text"
                          value={formData.shippingAddress.street}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            shippingAddress: { ...prev.shippingAddress, street: e.target.value }
                          }))}
                          placeholder="Via, numero civico"
                          required
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
                        <div className="md:col-span-2">
                          <Input
                            label="Paese"
                            type="text"
                            value={formData.shippingAddress.country}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              shippingAddress: { ...prev.shippingAddress, country: e.target.value }
                            }))}
                            placeholder="Italia"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Billing Address */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Indirizzo di Fatturazione (opzionale)</h4>
                      <div className="mb-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={
                              formData.billingAddress.name === formData.shippingAddress.name &&
                              formData.billingAddress.street === formData.shippingAddress.street &&
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
                                  billingAddress: { name: '', street: '', city: '', postalCode: '', country: 'Italia' }
                                }));
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-600">Uguale all'indirizzo di spedizione</span>
                        </label>
                      </div>
                      {!(
                        formData.billingAddress.name === formData.shippingAddress.name &&
                        formData.billingAddress.street === formData.shippingAddress.street &&
                        formData.billingAddress.city === formData.shippingAddress.city &&
                        formData.billingAddress.postalCode === formData.shippingAddress.postalCode
                      ) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input
                            label="Nome completo"
                            type="text"
                            value={formData.billingAddress.name}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              billingAddress: { ...prev.billingAddress, name: e.target.value }
                            }))}
                            placeholder="Nome e cognome"
                          />
                          <Input
                            label="Via e numero civico"
                            type="text"
                            value={formData.billingAddress.street}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              billingAddress: { ...prev.billingAddress, street: e.target.value }
                            }))}
                            placeholder="Via, numero civico"
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
                            label="CAP"
                            type="text"
                            value={formData.billingAddress.postalCode}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              billingAddress: { ...prev.billingAddress, postalCode: e.target.value }
                            }))}
                            placeholder="00000"
                          />
                          <div className="md:col-span-2">
                            <Input
                              label="Paese"
                              type="text"
                              value={formData.billingAddress.country}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                billingAddress: { ...prev.billingAddress, country: e.target.value }
                              }))}
                              placeholder="Italia"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

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
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
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
                            username: ''
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