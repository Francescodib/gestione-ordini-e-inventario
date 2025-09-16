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
  shippingAddress: string;
  billingAddress: string;
  notes: string;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
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
    shippingAddress: '',
    billingAddress: '',
    notes: '',
    shippingCost: 0,
    taxAmount: 0,
    discountAmount: 0
  });

  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

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

    const product = products.find(p => p.id === selectedProduct);
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
        productId: product.id,
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
      if (!formData.shippingAddress.trim()) {
        throw new Error('L\'indirizzo di spedizione è obbligatorio');
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
        shippingAddress: formData.shippingAddress,
        billingAddress: formData.billingAddress || formData.shippingAddress,
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seleziona Cliente *
                      </label>
                      <select
                        value={formData.userId}
                        onChange={(e) => setFormData(prev => ({ ...prev, userId: e.target.value }))}
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
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                  <div className="px-6 py-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Indirizzo di Spedizione *
                      </label>
                      <textarea
                        value={formData.shippingAddress}
                        onChange={(e) => setFormData(prev => ({ ...prev, shippingAddress: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Via, Città, CAP, Provincia"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Indirizzo di Fatturazione
                      </label>
                      <textarea
                        value={formData.billingAddress}
                        onChange={(e) => setFormData(prev => ({ ...prev, billingAddress: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Se diverso dall'indirizzo di spedizione"
                      />
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
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.shippingCost}
                        onChange={(e) => setFormData(prev => ({ ...prev, shippingCost: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tasse
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.taxAmount}
                        onChange={(e) => setFormData(prev => ({ ...prev, taxAmount: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sconto
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.discountAmount}
                        onChange={(e) => setFormData(prev => ({ ...prev, discountAmount: parseFloat(e.target.value) || 0 }))}
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
        </div>
      </div>
    </Layout>
  );
};

export default OrderCreatePage;