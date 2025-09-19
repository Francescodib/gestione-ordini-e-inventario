import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { orderService, productService } from '../services/api';
import type { Order, Product } from '../services/api';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import ErrorMessage from '../components/ErrorMessage';

interface OrderEditItem {
  id?: number;
  productId: string;
  product?: Product;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

interface OrderEditFormData {
  status: Order['status'];
  paymentStatus: Order['paymentStatus'];
  trackingNumber: string;
  notes: string;
  items: OrderEditItem[];
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
}

const OrderEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // States for item editing
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  // State for order cancellation
  const [cancelling, setCancelling] = useState(false);

  const [formData, setFormData] = useState<OrderEditFormData>({
    status: 'PENDING',
    paymentStatus: 'PENDING',
    trackingNumber: '',
    notes: '',
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
    }
  });

  useEffect(() => {
    if (id) {
      loadOrder(id);
    }
    loadProducts();
  }, [id]);

  const loadProducts = async () => {
    try {
      const response = await productService.getAllProducts({ status: 'ACTIVE' });
      if (response.success) {
        setProducts(response.data);
      }
    } catch (error: any) {
      console.error('Error loading products:', error);
    }
  };

  const loadOrder = async (orderId: string) => {
    try {
      setLoading(true);
      setError('');

      const response = await orderService.getOrderById(orderId);

      if (response.success && response.data) {
        const orderData = response.data;
        setOrder(orderData);

        // Format addresses for editing
        const shippingAddr = formatAddressForEdit(orderData.shippingAddress);
        const billingAddr = formatAddressForEdit(orderData.billingAddress || orderData.shippingAddress);

        // Format order items
        const formattedItems: OrderEditItem[] = orderData.items?.map((item: any) => ({
          id: item.id,
          productId: item.productId?.toString() || '',
          name: item.name || '',
          sku: item.sku || '',
          quantity: item.quantity || 0,
          price: item.price || 0,
          totalPrice: item.totalPrice || (item.quantity * item.price)
        })) || [];

        setFormData({
          status: orderData.status,
          paymentStatus: orderData.paymentStatus,
          trackingNumber: orderData.trackingNumber || '',
          notes: orderData.notes || '',
          items: formattedItems,
          shippingAddress: shippingAddr,
          billingAddress: billingAddr
        });
      } else {
        throw new Error(response.message || 'Ordine non trovato');
      }
    } catch (error: any) {
      setError(error.message || 'Errore durante il caricamento dell\'ordine');
    } finally {
      setLoading(false);
    }
  };

  const formatAddressForEdit = (addressString: string | Record<string, unknown>) => {
    try {
      if (typeof addressString === 'object' && addressString !== null) {
        const addr = addressString as any;
        return {
          name: addr.name || '',
          street: addr.street || '',
          city: addr.city || '',
          postalCode: addr.postalCode || '',
          country: addr.country || 'Italia'
        };
      }

      if (typeof addressString === 'string') {
        const parsed = JSON.parse(addressString);
        return {
          name: parsed.name || '',
          street: parsed.street || '',
          city: parsed.city || '',
          postalCode: parsed.postalCode || '',
          country: parsed.country || 'Italia'
        };
      }

      return {
        name: '',
        street: '',
        city: '',
        postalCode: '',
        country: 'Italia'
      };
    } catch (error) {
      return {
        name: '',
        street: '',
        city: '',
        postalCode: '',
        country: 'Italia'
      };
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!order || !id) return;

    try {
      setSaving(true);
      setError('');

      // Calculate totals
      const subtotal = calculateSubtotal();

      const updateData = {
        status: formData.status,
        paymentStatus: formData.paymentStatus,
        trackingNumber: formData.trackingNumber || null,
        notes: formData.notes || null,
        subtotal,
        totalAmount: subtotal, // For now, assuming no shipping/tax/discount in edit
        items: formData.items.map(item => ({
          id: item.id, // Keep existing ID if present
          productId: item.productId,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          price: item.price,
          totalPrice: item.totalPrice
        })),
        shippingAddress: JSON.stringify(formData.shippingAddress),
        billingAddress: JSON.stringify(formData.billingAddress)
      };

      const response = await orderService.updateOrder(id, updateData);

      if (response.success) {
        setSuccess('Ordine aggiornato con successo');
        setTimeout(() => {
          navigate(`/orders/${id}`);
        }, 1500);
      } else {
        throw new Error(response.message || 'Errore durante l\'aggiornamento dell\'ordine');
      }
    } catch (error: any) {
      setError(error.message || 'Errore durante l\'aggiornamento dell\'ordine');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddressChange = (addressType: 'shippingAddress' | 'billingAddress', field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [addressType]: {
        ...prev[addressType],
        [field]: value
      }
    }));
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
      const newItem: OrderEditItem = {
        productId: product.id.toString(),
        product,
        name: product.name,
        sku: product.sku,
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

  const handleCancelOrder = async () => {
    if (!order || !id) return;

    const confirmCancel = window.confirm(
      'Sei sicuro di voler annullare questo ordine?\n\nQuesta azione non può essere annullata.'
    );

    if (!confirmCancel) return;

    try {
      setCancelling(true);
      setError('');

      const response = await orderService.updateOrder(id, {
        status: 'CANCELLED',
        paymentStatus: formData.paymentStatus === 'PAID' ? 'REFUNDED' : 'FAILED'
      });

      if (response.success) {
        setSuccess('Ordine annullato con successo');
        setTimeout(() => {
          navigate(`/orders/${id}`);
        }, 1500);
      } else {
        throw new Error(response.message || 'Errore durante l\'annullamento dell\'ordine');
      }
    } catch (error: any) {
      setError(error.message || 'Errore durante l\'annullamento dell\'ordine');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error && !order) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorMessage message={error} onDismiss={() => setError('')} />
          <div className="mt-6">
            <Button onClick={() => navigate('/orders')}>
              Torna agli Ordini
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Ordine non trovato</h2>
            <p className="mt-2 text-gray-600">L'ordine richiesto non esiste.</p>
            <div className="mt-6">
              <Button onClick={() => navigate('/orders')}>
                Torna agli Ordini
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
              <Link to="/orders" className="hover:text-gray-700">Ordini</Link>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <Link to={`/orders/${order.id}`} className="hover:text-gray-700">{order.orderNumber}</Link>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-gray-900">Modifica</span>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900">Modifica Ordine {order.orderNumber}</h1>
            <p className="mt-1 text-sm text-gray-600">
              Cliente: {order.user?.firstName} {order.user?.lastName}
            </p>
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
            {/* Order Status */}
            <Card>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Stato Ordine</h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                      Stato Ordine
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="PENDING">In Attesa</option>
                      <option value="PROCESSING">In Elaborazione</option>
                      <option value="SHIPPED">Spedito</option>
                      <option value="DELIVERED">Consegnato</option>
                      <option value="CANCELLED">Annullato</option>
                      <option value="RETURNED">Restituito</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="paymentStatus" className="block text-sm font-medium text-gray-700 mb-1">
                      Stato Pagamento
                    </label>
                    <select
                      id="paymentStatus"
                      name="paymentStatus"
                      value={formData.paymentStatus}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="PENDING">In Attesa</option>
                      <option value="PAID">Pagato</option>
                      <option value="FAILED">Fallito</option>
                      <option value="REFUNDED">Rimborsato</option>
                      <option value="PARTIALLY_REFUNDED">Parzialmente Rimborsato</option>
                    </select>
                  </div>
                </div>

                <Input
                  id="trackingNumber"
                  name="trackingNumber"
                  label="Numero di Tracking"
                  type="text"
                  value={formData.trackingNumber}
                  onChange={handleInputChange}
                  placeholder="es. TRK123456789"
                />
              </div>
            </Card>

            {/* Order Items Management */}
            <Card>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Gestione Articoli</h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                {/* Add Product Section */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Aggiungi Prodotto</h4>
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

                {/* Current Items */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Articoli nell'ordine ({formData.items.length}) - Subtotale: €{calculateSubtotal().toFixed(2)}
                  </h4>
                  {formData.items.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      Nessun articolo nell'ordine
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
                                    {item.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    SKU: {item.sku}
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
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Indirizzo di Spedizione</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Nome completo"
                      type="text"
                      value={formData.shippingAddress.name}
                      onChange={(e) => handleAddressChange('shippingAddress', 'name', e.target.value)}
                      placeholder="Nome e cognome"
                    />
                    <Input
                      label="Via e numero civico"
                      type="text"
                      value={formData.shippingAddress.street}
                      onChange={(e) => handleAddressChange('shippingAddress', 'street', e.target.value)}
                      placeholder="Via, numero civico"
                    />
                    <Input
                      label="Città"
                      type="text"
                      value={formData.shippingAddress.city}
                      onChange={(e) => handleAddressChange('shippingAddress', 'city', e.target.value)}
                      placeholder="Città"
                    />
                    <Input
                      label="CAP"
                      type="text"
                      value={formData.shippingAddress.postalCode}
                      onChange={(e) => handleAddressChange('shippingAddress', 'postalCode', e.target.value)}
                      placeholder="00000"
                    />
                    <div className="md:col-span-2">
                      <Input
                        label="Paese"
                        type="text"
                        value={formData.shippingAddress.country}
                        onChange={(e) => handleAddressChange('shippingAddress', 'country', e.target.value)}
                        placeholder="Italia"
                      />
                    </div>
                  </div>
                </div>

                {/* Billing Address */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Indirizzo di Fatturazione</h4>
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
                            setFormData(prev => ({
                              ...prev,
                              billingAddress: { ...prev.shippingAddress }
                            }));
                          } else {
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
                        onChange={(e) => handleAddressChange('billingAddress', 'name', e.target.value)}
                        placeholder="Nome e cognome"
                      />
                      <Input
                        label="Via e numero civico"
                        type="text"
                        value={formData.billingAddress.street}
                        onChange={(e) => handleAddressChange('billingAddress', 'street', e.target.value)}
                        placeholder="Via, numero civico"
                      />
                      <Input
                        label="Città"
                        type="text"
                        value={formData.billingAddress.city}
                        onChange={(e) => handleAddressChange('billingAddress', 'city', e.target.value)}
                        placeholder="Città"
                      />
                      <Input
                        label="CAP"
                        type="text"
                        value={formData.billingAddress.postalCode}
                        onChange={(e) => handleAddressChange('billingAddress', 'postalCode', e.target.value)}
                        placeholder="00000"
                      />
                      <div className="md:col-span-2">
                        <Input
                          label="Paese"
                          type="text"
                          value={formData.billingAddress.country}
                          onChange={(e) => handleAddressChange('billingAddress', 'country', e.target.value)}
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
                  id="notes"
                  name="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Note aggiuntive sull'ordine..."
                />
              </div>
            </Card>

            {/* Actions */}
            <div className="flex justify-between">
              <div>
                {/* Cancel Order Button - only show if order can be cancelled */}
                {order && !['CANCELLED', 'DELIVERED', 'RETURNED'].includes(order.status) && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCancelOrder}
                    disabled={saving || cancelling}
                    className="bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                  >
                    {cancelling ? 'Annullando Ordine...' : 'Annulla Ordine'}
                  </Button>
                )}
              </div>
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate(`/orders/${order.id}`)}
                  disabled={saving || cancelling}
                >
                  Torna al Dettaglio
                </Button>
                <Button
                  type="submit"
                  loading={saving}
                  disabled={cancelling}
                >
                  {saving ? 'Salvataggio...' : 'Salva Modifiche'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default OrderEditPage;