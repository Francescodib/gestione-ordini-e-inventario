import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import ProfessionalChart from '../components/ProfessionalChart';
import {
  authService,
  productService,
  orderService,
  monitoringService
} from '../services/api';

interface AnalyticsData {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    byRole: { [key: string]: number };
  };
  products: {
    total: number;
    lowStock: number;
    outOfStock: number;
    categories: number;
    topSelling: Array<{
      id: string;
      name: string;
      soldQuantity: number;
      revenue: number;
    }>;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
    totalRevenue: number;
    averageValue: number;
    monthlyTrend: Array<{
      month: string;
      orderCount: number;
      revenue: number;
    }>;
  };
  system: {
    uptime: string;
    memoryUsage: number;
    diskUsage: number;
    activeConnections: number;
  };
}

const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('30'); // days

  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load all analytics data in parallel
      const [
        userStatsResponse,
        productStatsResponse,
        orderStatsResponse,
        systemStatsResponse
      ] = await Promise.allSettled([
        authService.getUserStats(),
        productService.getProductStats(),
        orderService.getOrderStats(),
        monitoringService.getSystemHealth()
      ]);

      const analyticsData: AnalyticsData = {
        users: {
          total: 0,
          active: 0,
          newThisMonth: 0,
          byRole: {}
        },
        products: {
          total: 0,
          lowStock: 0,
          outOfStock: 0,
          categories: 0,
          topSelling: []
        },
        orders: {
          total: 0,
          pending: 0,
          completed: 0,
          cancelled: 0,
          totalRevenue: 0,
          averageValue: 0,
          monthlyTrend: []
        },
        system: {
          uptime: 'N/A',
          memoryUsage: 0,
          diskUsage: 0,
          activeConnections: 0
        }
      };

      // Process user stats
      if (userStatsResponse.status === 'fulfilled' && userStatsResponse.value.success) {
        const userStats = userStatsResponse.value.data;
        console.log('User stats from backend:', userStats);
        analyticsData.users = {
          total: userStats.totalUsers || 0,
          active: userStats.activeUsers || 0,
          newThisMonth: 0, // This field needs to be implemented in backend
          byRole: {
            'ADMIN': userStats.adminUsers || 0,
            'MANAGER': userStats.managerUsers || 0,
            'USER': userStats.regularUsers || 0
          }
        };
      }

      // Process product stats
      if (productStatsResponse.status === 'fulfilled' && productStatsResponse.value.success) {
        const productStats = productStatsResponse.value.data;
        console.log('Product stats from backend:', productStats);
        analyticsData.products = {
          total: productStats.totalProducts || 0,
          lowStock: productStats.lowStockProducts || 0,
          outOfStock: productStats.outOfStockProducts || 0,
          categories: productStats.categoriesCount || 0,
          topSelling: [] // TopSelling products need to be implemented in backend
        };
      }

      // Process order stats
      if (orderStatsResponse.status === 'fulfilled' && orderStatsResponse.value.success) {
        const orderStats = orderStatsResponse.value.data;
        console.log('Order stats from backend:', orderStats);
        analyticsData.orders = {
          total: orderStats.totalOrders || 0,
          pending: orderStats.pendingOrders || 0,
          completed: orderStats.deliveredOrders || 0,
          cancelled: orderStats.cancelledOrders || 0,
          totalRevenue: orderStats.totalRevenue || 0,
          averageValue: orderStats.averageOrderValue || 0,
          monthlyTrend: orderStats.revenueByMonth || []
        };
      }

      // Process system stats
      if (systemStatsResponse.status === 'fulfilled' && systemStatsResponse.value.success) {
        const systemStats = systemStatsResponse.value.data;
        analyticsData.system = {
          uptime: systemStats.uptime || 'N/A',
          memoryUsage: systemStats.memoryUsage || 0,
          diskUsage: systemStats.diskUsage || 0,
          activeConnections: systemStats.activeConnections || 0
        };
      }

      setAnalytics(analyticsData);
    } catch (err: any) {
      console.error('Analytics loading error:', err);
      setError('Errore nel caricamento dei dati analytics');
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    if (!analytics) return;

    const csvData = [
      ['Metric', 'Value'],
      ['Total Users', analytics.users.total],
      ['Active Users', analytics.users.active],
      ['Total Products', analytics.products.total],
      ['Low Stock Products', analytics.products.lowStock],
      ['Total Orders', analytics.orders.total],
      ['Total Revenue', `€${analytics.orders.totalRevenue.toFixed(2)}`],
      ['System Uptime', analytics.system.uptime]
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics</h1>
            <p className="text-lg text-gray-600">
              Dashboard analytics e metriche del sistema
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="block w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="7">Ultimi 7 giorni</option>
              <option value="30">Ultimi 30 giorni</option>
              <option value="90">Ultimi 90 giorni</option>
              <option value="365">Ultimo anno</option>
            </select>
            <button
              onClick={exportData}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Esporta CSV
            </button>
          </div>
        </div>

        {error && (
          <ErrorMessage
            message={error}
            onDismiss={() => setError('')}
          />
        )}

        {analytics && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              {/* Total Revenue */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-md bg-green-50 flex items-center justify-center">
                      <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <dt className="text-sm font-medium text-gray-600 mb-1">
                      Ricavi Totali
                    </dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      €{analytics.orders.totalRevenue.toLocaleString()}
                    </dd>
                  </div>
                </div>
              </div>

              {/* Total Orders */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-md bg-blue-50 flex items-center justify-center">
                      <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <dt className="text-sm font-medium text-gray-600 mb-1">
                      Ordini Totali
                    </dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      {analytics.orders.total}
                    </dd>
                  </div>
                </div>
              </div>

              {/* Active Users */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-md bg-purple-50 flex items-center justify-center">
                      <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <dt className="text-sm font-medium text-gray-600 mb-1">
                      Utenti Attivi
                    </dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      {analytics.users.active}
                    </dd>
                  </div>
                </div>
              </div>

              {/* Total Products */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-md bg-orange-50 flex items-center justify-center">
                      <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <dt className="text-sm font-medium text-gray-600 mb-1">
                      Prodotti Totali
                    </dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      {analytics.products.total}
                    </dd>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Orders Overview */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Panoramica Ordini</h3>
                </div>
                <div className="px-6 py-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Completati</span>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900 mr-2">
                          {analytics.orders.completed}
                        </span>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${(analytics.orders.completed / analytics.orders.total) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">In Sospeso</span>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900 mr-2">
                          {analytics.orders.pending}
                        </span>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-yellow-600 h-2 rounded-full"
                            style={{ width: `${(analytics.orders.pending / analytics.orders.total) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Cancellati</span>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900 mr-2">
                          {analytics.orders.cancelled}
                        </span>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-600 h-2 rounded-full"
                            style={{ width: `${(analytics.orders.cancelled / analytics.orders.total) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Valore Medio Ordine</span>
                      <span className="font-medium text-gray-900">
                        €{analytics.orders.averageValue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Users by Role */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Utenti per Ruolo</h3>
                </div>
                <div className="px-6 py-4">
                  <div className="space-y-4">
                    {Object.entries(analytics.users.byRole).map(([role, count]) => (
                      <div key={role} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mr-3 ${
                            role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                            role === 'MANAGER' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {role === 'ADMIN' ? 'Admin' : role === 'MANAGER' ? 'Manager' : 'Utente'}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Nuovi questo mese</span>
                      <span className="font-medium text-gray-900">
                        {analytics.users.newThisMonth}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* System Health & Inventory Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* System Health */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Stato Sistema</h3>
                </div>
                <div className="px-6 py-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Uptime</span>
                      <span className="text-sm font-medium text-gray-900">
                        {analytics.system.uptime}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Utilizzo Memoria</span>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900 mr-2">
                          {analytics.system.memoryUsage}%
                        </span>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              analytics.system.memoryUsage > 80 ? 'bg-red-600' :
                              analytics.system.memoryUsage > 60 ? 'bg-yellow-600' : 'bg-green-600'
                            }`}
                            style={{ width: `${analytics.system.memoryUsage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Utilizzo Disco</span>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900 mr-2">
                          {analytics.system.diskUsage}%
                        </span>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              analytics.system.diskUsage > 80 ? 'bg-red-600' :
                              analytics.system.diskUsage > 60 ? 'bg-yellow-600' : 'bg-green-600'
                            }`}
                            style={{ width: `${analytics.system.diskUsage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inventory Alerts */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Alerts Inventario</h3>
                </div>
                <div className="px-6 py-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Scorte Basse</span>
                      <span className={`text-sm font-medium ${
                        analytics.products.lowStock > 0 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {analytics.products.lowStock}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Esauriti</span>
                      <span className={`text-sm font-medium ${
                        analytics.products.outOfStock > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {analytics.products.outOfStock}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Categorie Attive</span>
                      <span className="text-sm font-medium text-gray-900">
                        {analytics.products.categories}
                      </span>
                    </div>
                  </div>
                  {(analytics.products.lowStock > 0 || analytics.products.outOfStock > 0) && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center text-sm text-yellow-700 bg-yellow-50 px-3 py-2 rounded-md">
                        <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Attenzione richiesta per l'inventario
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Orders Status Chart */}
              <ProfessionalChart
                type="pie"
                title="Distribuzione Stati Ordini"
                data={[
                  { label: 'Completati', value: analytics.orders.completed, color: '#10B981' },
                  { label: 'In Sospeso', value: analytics.orders.pending, color: '#F59E0B' },
                  { label: 'Cancellati', value: analytics.orders.cancelled, color: '#EF4444' }
                ]}
                height={300}
              />

              {/* Users by Role Chart */}
              <ProfessionalChart
                type="bar"
                title="Utenti per Ruolo"
                data={Object.entries(analytics.users.byRole).map(([role, count]) => ({
                  label: role === 'ADMIN' ? 'Admin' : role === 'MANAGER' ? 'Manager' : 'Utente',
                  value: count,
                  color: role === 'ADMIN' ? '#EF4444' : role === 'MANAGER' ? '#3B82F6' : '#10B981'
                }))}
                height={300}
              />
            </div>

            {/* Top Products Chart */}
            {analytics.products.topSelling && analytics.products.topSelling.length > 0 && (
              <div className="mt-8">
                <ProfessionalChart
                  type="bar"
                  title="Prodotti Più Venduti"
                  data={analytics.products.topSelling.slice(0, 10).map(product => ({
                    label: product.name.length > 15 ? product.name.substring(0, 15) + '...' : product.name,
                    value: product.soldQuantity || 0
                  }))}
                  height={350}
                />
              </div>
            )}

            {/* Monthly Trend Chart */}
            {analytics.orders.monthlyTrend && analytics.orders.monthlyTrend.length > 0 && (
              <div className="mt-8 w-full">
                <ProfessionalChart
                  type="line"
                  title="Trend Ricavi Mensili"
                  data={analytics.orders.monthlyTrend.map(month => ({
                    label: month.month,
                    value: month.revenue || 0
                  }))}
                  height={400}
                />
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default AnalyticsPage;