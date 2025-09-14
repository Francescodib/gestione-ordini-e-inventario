import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { orderService } from '../services/api';
import type { Order } from '../services/api';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Input from '../components/Input';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const OrdersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [paymentFilter, setPaymentFilter] = useState(searchParams.get('payment') || '');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [searchParams]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        query: searchParams.get('search') || undefined,
        status: searchParams.get('status') || undefined,
        paymentStatus: searchParams.get('payment') || undefined,
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '50')
      };

      const response = await orderService.getAllOrders(params);

      if (response.success && response.data) {
        setOrders(response.data);
      }

    } catch (err: any) {
      console.error('Error loading orders:', err);
      setError('Errore nel caricamento degli ordini');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    
    if (searchQuery) {
      newParams.set('search', searchQuery);
    } else {
      newParams.delete('search');
    }
    
    if (statusFilter) {
      newParams.set('status', statusFilter);
    } else {
      newParams.delete('status');
    }
    
    if (paymentFilter) {
      newParams.set('payment', paymentFilter);
    } else {
      newParams.delete('payment');
    }
    
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setPaymentFilter('');
    setSearchParams({});
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      const response = await orderService.updateOrderStatus(orderId, newStatus);
      if (response.success) {
        // Refresh orders
        loadOrders();
      }
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'PROCESSING': 'bg-blue-100 text-blue-800',
      'SHIPPED': 'bg-indigo-100 text-indigo-800',
      'DELIVERED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800',
      'RETURNED': 'bg-gray-100 text-gray-800'
    };
    
    return badges[status as keyof typeof badges] || badges['PENDING'];
  };

  const getPaymentBadge = (status: string) => {
    const badges = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'PAID': 'bg-green-100 text-green-800',
      'FAILED': 'bg-red-100 text-red-800',
      'REFUNDED': 'bg-gray-100 text-gray-800',
      'PARTIALLY_REFUNDED': 'bg-orange-100 text-orange-800'
    };
    
    return badges[status as keyof typeof badges] || badges['PENDING'];
  };

  const getStatusText = (status: string) => {
    const texts = {
      'PENDING': 'In Attesa',
      'PROCESSING': 'In Elaborazione',
      'SHIPPED': 'Spedito',
      'DELIVERED': 'Consegnato',
      'CANCELLED': 'Annullato',
      'RETURNED': 'Restituito'
    };
    
    return texts[status as keyof typeof texts] || status;
  };

  const getPaymentText = (status: string) => {
    const texts = {
      'PENDING': 'In Attesa',
      'PAID': 'Pagato',
      'FAILED': 'Fallito',
      'REFUNDED': 'Rimborsato',
      'PARTIALLY_REFUNDED': 'Parz. Rimborsato'
    };
    
    return texts[status as keyof typeof texts] || status;
  };

  const columns = [
    {
      key: 'orderNumber' as keyof Order,
      title: 'Numero Ordine',
      render: (value: string, record: Order) => (
        <div>
          <div className="text-sm font-medium text-gray-900">#{value}</div>
          <div className="text-sm text-gray-500">
            {new Date(record.createdAt).toLocaleDateString('it-IT')}
          </div>
        </div>
      )
    },
    {
      key: 'user' as keyof Order,
      title: 'Cliente',
      render: (user: any, record: Order) => {
        if (user) {
          return (
            <div>
              <div className="text-sm font-medium text-gray-900">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </div>
          );
        }
        return (
          <div className="text-sm text-gray-500">
            ID: {record.userId}
          </div>
        );
      }
    },
    {
      key: 'status' as keyof Order,
      title: 'Stato Ordine',
      render: (value: string) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(value)}`}>
          {getStatusText(value)}
        </span>
      )
    },
    {
      key: 'paymentStatus' as keyof Order,
      title: 'Pagamento',
      render: (value: string) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentBadge(value)}`}>
          {getPaymentText(value)}
        </span>
      )
    },
    {
      key: 'totalAmount' as keyof Order,
      title: 'Totale',
      render: (value: number, record: Order) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            €{value.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500">
            {record.currency}
          </div>
        </div>
      )
    },
    {
      key: 'items' as keyof Order,
      title: 'Articoli',
      render: (items: any[]) => (
        <span className="text-sm text-gray-900">
          {items?.length || 0} articoli
        </span>
      )
    },
    {
      key: 'actions',
      title: 'Azioni',
      render: (_: any, record: Order) => (
        <div className="flex space-x-2">
          {record.status === 'PENDING' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateOrderStatus(record.id, 'PROCESSING');
              }}
              className="text-blue-600 hover:text-blue-500 text-sm"
            >
              Elabora
            </button>
          )}
          {record.status === 'PROCESSING' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateOrderStatus(record.id, 'SHIPPED');
              }}
              className="text-indigo-600 hover:text-indigo-500 text-sm"
            >
              Spedisci
            </button>
          )}
          {record.status === 'SHIPPED' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateOrderStatus(record.id, 'DELIVERED');
              }}
              className="text-green-600 hover:text-green-500 text-sm"
            >
              Consegna
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestione Ordini</h1>
            <p className="mt-2 text-sm text-gray-700">
              Visualizza e gestisci tutti gli ordini dei clienti
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Link to="/orders/new">
              <Button
                variant="primary"
                icon={
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                }
              >
                Nuovo Ordine
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <ErrorMessage message={error} onDismiss={() => setError('')} />
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card padding="sm" className="bg-yellow-50 border-yellow-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-800">In Attesa</p>
                <p className="text-2xl font-semibold text-yellow-900">
                  {orders.filter(o => o.status === 'PENDING').length}
                </p>
              </div>
            </div>
          </Card>

          <Card padding="sm" className="bg-blue-50 border-blue-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-800">In Elaborazione</p>
                <p className="text-2xl font-semibold text-blue-900">
                  {orders.filter(o => o.status === 'PROCESSING').length}
                </p>
              </div>
            </div>
          </Card>

          <Card padding="sm" className="bg-indigo-50 border-indigo-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-indigo-800">Spediti</p>
                <p className="text-2xl font-semibold text-indigo-900">
                  {orders.filter(o => o.status === 'SHIPPED').length}
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
                <p className="text-sm font-medium text-green-800">Consegnati</p>
                <p className="text-2xl font-semibold text-green-900">
                  {orders.filter(o => o.status === 'DELIVERED').length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-4 space-y-4 sm:space-y-0">
              <div className="flex-1">
                <Input
                  label="Cerca ordini"
                  placeholder="Numero ordine, cliente, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  }
                />
              </div>
              <div>
                <Button type="submit" variant="primary">
                  Cerca
                </Button>
              </div>
              <div>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setShowFilters(!showFilters)}
                >
                  Filtri
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stato Ordine
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Tutti gli stati</option>
                      <option value="PENDING">In Attesa</option>
                      <option value="PROCESSING">In Elaborazione</option>
                      <option value="SHIPPED">Spedito</option>
                      <option value="DELIVERED">Consegnato</option>
                      <option value="CANCELLED">Annullato</option>
                      <option value="RETURNED">Restituito</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stato Pagamento
                    </label>
                    <select
                      value={paymentFilter}
                      onChange={(e) => setPaymentFilter(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Tutti i pagamenti</option>
                      <option value="PENDING">In Attesa</option>
                      <option value="PAID">Pagato</option>
                      <option value="FAILED">Fallito</option>
                      <option value="REFUNDED">Rimborsato</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={clearFilters}
                      fullWidth
                    >
                      Pulisci Filtri
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </Card>

        {/* Results Summary */}
        {!loading && (
          <div className="text-sm text-gray-600">
            Trovati {orders.length} ordini
            {searchQuery && ` per "${searchQuery}"`}
          </div>
        )}

        {/* Orders Table */}
        <Table
          data={orders}
          columns={columns}
          loading={loading}
          emptyText="Nessun ordine trovato"
          onRowClick={(order) => {
            window.location.href = `/orders/${order.id}`;
          }}
        />
      </div>
    </Layout>
  );
};

export default OrdersPage;