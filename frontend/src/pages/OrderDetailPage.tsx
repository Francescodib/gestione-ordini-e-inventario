import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { orderService } from '../services/api';
import type { Order } from '../services/api';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';

const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (id) {
      loadOrder(id);
    }
  }, [id]);

  const loadOrder = async (orderId: string) => {
    try {
      setLoading(true);
      setError('');

      const response = await orderService.getOrderById(orderId);

      if (response.success) {
        setOrder(response.data);
      } else {
        throw new Error(response.message || 'Ordine non trovato');
      }
    } catch (error: any) {
      setError(error.message || 'Errore durante il caricamento dell\'ordine');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: Order['status']) => {
    if (!order) return;

    try {
      const response = await orderService.updateOrderStatus(order.id, newStatus);

      if (response.success) {
        setOrder(response.data);
        setSuccess('Stato ordine aggiornato con successo');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(response.message || 'Errore durante l\'aggiornamento dello stato');
      }
    } catch (error: any) {
      setError(error.message || 'Errore durante l\'aggiornamento dello stato dell\'ordine');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      SHIPPED: 'bg-indigo-100 text-indigo-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      RETURNED: 'bg-gray-100 text-gray-800'
    };
    return badges[status as keyof typeof badges] || badges.PENDING;
  };

  const getStatusText = (status: string) => {
    const texts = {
      PENDING: 'In Attesa',
      PROCESSING: 'In Elaborazione',
      SHIPPED: 'Spedito',
      DELIVERED: 'Consegnato',
      CANCELLED: 'Annullato',
      RETURNED: 'Restituito'
    };
    return texts[status as keyof typeof texts] || status;
  };

  const getPaymentBadge = (status: string) => {
    const badges = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      REFUNDED: 'bg-gray-100 text-gray-800',
      PARTIALLY_REFUNDED: 'bg-orange-100 text-orange-800'
    };
    return badges[status as keyof typeof badges] || badges.PENDING;
  };

  const getPaymentText = (status: string) => {
    const texts = {
      PENDING: 'In Attesa',
      PAID: 'Pagato',
      FAILED: 'Fallito',
      REFUNDED: 'Rimborsato',
      PARTIALLY_REFUNDED: 'Parzialmente Rimborsato'
    };
    return texts[status as keyof typeof texts] || status;
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                <Link to="/orders" className="hover:text-gray-700">Ordini</Link>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-gray-900">{order.orderNumber}</span>
              </nav>
              <h1 className="text-2xl font-bold text-gray-900">Ordine {order.orderNumber}</h1>
              <p className="mt-1 text-sm text-gray-600">
                Cliente: {order.user?.firstName} {order.user?.lastName}
              </p>
            </div>
            <div className="flex space-x-3">
              <Link to={`/orders/${order.id}/edit`}>
                <Button variant="secondary">
                  Modifica
                </Button>
              </Link>
            </div>
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Items */}
              <Card>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Prodotti ({order.items?.length || 0})
                  </h3>
                </div>
                <div className="overflow-hidden">
                  {order.items && order.items.length > 0 ? (
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
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {order.items.map((item, index) => (
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.quantity}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                €{item.totalPrice.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-6 py-8 text-center">
                      <p className="text-gray-500">Nessun prodotto nell'ordine</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Addresses */}
              <Card>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Indirizzi</h3>
                </div>
                <div className="px-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Indirizzo di Spedizione</h4>
                      <p className="text-sm text-gray-600 whitespace-pre-line">
                        {order.shippingAddress}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Indirizzo di Fatturazione</h4>
                      <p className="text-sm text-gray-600 whitespace-pre-line">
                        {order.billingAddress || order.shippingAddress}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Notes */}
              {order.notes && (
                <Card>
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Note</h3>
                  </div>
                  <div className="px-6 py-4">
                    <p className="text-sm text-gray-600 whitespace-pre-line">
                      {order.notes}
                    </p>
                  </div>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Status */}
              <Card>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Stato Ordine</h3>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stato Corrente</label>
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadge(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cambia Stato</label>
                    <select
                      onChange={(e) => updateOrderStatus(e.target.value as Order['status'])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                      defaultValue=""
                    >
                      <option value="">Seleziona nuovo stato</option>
                      <option value="PENDING">In Attesa</option>
                      <option value="PROCESSING">In Elaborazione</option>
                      <option value="SHIPPED">Spedito</option>
                      <option value="DELIVERED">Consegnato</option>
                      <option value="CANCELLED">Annullato</option>
                      <option value="RETURNED">Restituito</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stato Pagamento</label>
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPaymentBadge(order.paymentStatus)}`}>
                      {getPaymentText(order.paymentStatus)}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Order Summary */}
              <Card>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Riepilogo</h3>
                </div>
                <div className="px-6 py-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotale:</span>
                    <span>€{order.subtotal.toFixed(2)}</span>
                  </div>

                  {order.shippingCost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Spedizione:</span>
                      <span>€{order.shippingCost.toFixed(2)}</span>
                    </div>
                  )}

                  {order.taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tasse:</span>
                      <span>€{order.taxAmount.toFixed(2)}</span>
                    </div>
                  )}

                  {order.discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Sconto:</span>
                      <span className="text-red-600">-€{order.discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-lg font-medium text-gray-900">Totale:</span>
                      <span className="text-lg font-bold text-gray-900">€{order.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Dates */}
              <Card>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Date Importanti</h3>
                </div>
                <div className="px-6 py-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Creato il</label>
                    <p className="text-sm text-gray-900">
                      {new Date(order.createdAt).toLocaleDateString('it-IT', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  {order.shippedAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Spedito il</label>
                      <p className="text-sm text-gray-900">
                        {new Date(order.shippedAt).toLocaleDateString('it-IT', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}

                  {order.deliveredAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Consegnato il</label>
                      <p className="text-sm text-gray-900">
                        {new Date(order.deliveredAt).toLocaleDateString('it-IT', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}

                  {order.trackingNumber && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tracking</label>
                      <p className="text-sm text-gray-900 font-mono">
                        {order.trackingNumber}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default OrderDetailPage;