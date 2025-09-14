import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  monitoringService,
  productService,
  orderService,
  authService
} from '../services/api';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  lowStockProducts: number;
  pendingOrders: number;
  monthlyRevenue: number;
  recentOrders: any[];
  topProducts: any[];
}

interface SystemHealth {
  status: string;
  database: string;
  uptime: string;
  memoryUsage: number;
  diskUsage: number;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load dashboard stats in parallel
      const [
        productStatsResponse,
        orderStatsResponse,
        userStatsResponse,
        healthResponse
      ] = await Promise.allSettled([
        productService.getProductStats(),
        orderService.getOrderStats(),
        authService.getUserStats(),
        monitoringService.getSystemHealth()
      ]);

      // Combine all stats
      const dashboardStats: DashboardStats = {
        totalProducts: 0,
        totalOrders: 0,
        totalUsers: 0,
        lowStockProducts: 0,
        pendingOrders: 0,
        monthlyRevenue: 0,
        recentOrders: [],
        topProducts: []
      };

      if (productStatsResponse.status === 'fulfilled' && productStatsResponse.value.success) {
        const productStats = productStatsResponse.value.data;
        console.log('Product stats:', productStats);
        dashboardStats.totalProducts = productStats.totalProducts || 0;
        dashboardStats.lowStockProducts = productStats.lowStockProducts || 0;
        dashboardStats.topProducts = productStats.topCategories || [];
      } else {
        console.error('Product stats failed:', productStatsResponse);
      }

      if (orderStatsResponse.status === 'fulfilled' && orderStatsResponse.value.success) {
        const orderStats = orderStatsResponse.value.data;
        console.log('Order stats:', orderStats);
        dashboardStats.totalOrders = orderStats.totalOrders || 0;
        dashboardStats.pendingOrders = orderStats.pendingOrders || 0;
        dashboardStats.monthlyRevenue = orderStats.totalRevenue || 0;
        dashboardStats.recentOrders = orderStats.recent || [];
      } else {
        console.error('Order stats failed:', orderStatsResponse);
      }

      if (userStatsResponse.status === 'fulfilled' && userStatsResponse.value.success) {
        const userStats = userStatsResponse.value.data;
        dashboardStats.totalUsers = userStats.totalUsers || 0;
      }

      setStats(dashboardStats);

      if (healthResponse.status === 'fulfilled' && healthResponse.value.success) {
        const healthData = healthResponse.value.data;
        // Extract database status from components array
        const dbComponent = healthData.components?.find((c: any) => c.component === 'database');
        const transformedHealth = {
          status: healthData.status,
          database: dbComponent?.status === 'healthy' ? 'connected' : 'disconnected',
          uptime: healthData.summary?.uptime || 'N/A',
          memoryUsage: healthData.summary?.memoryUsage || 0,
          diskUsage: healthData.summary?.diskUsage || 0
        };
        setSystemHealth(transformedHealth);
      }

    } catch (err: any) {
      console.error('Dashboard loading error:', err);
      setError('Errore nel caricamento della dashboard');
    } finally {
      setLoading(false);
    }
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Benvenuto, {user?.firstName}!{' '}
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ml-2 ${
              user?.role === 'ADMIN'
                ? 'bg-red-100 text-red-800'
                : user?.role === 'MANAGER'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {user?.role === 'ADMIN' ? 'Amministratore' :
               user?.role === 'MANAGER' ? 'Manager' : 'Utente'}
            </span>
            <br />
            <span className="text-sm text-gray-500">Ecco una panoramica del tuo sistema.</span>
          </p>
        </div>

        {error && (
          <ErrorMessage 
            message={error} 
            onDismiss={() => setError('')} 
          />
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center p-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-md bg-blue-50 flex items-center justify-center">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <dt className="text-sm font-medium text-gray-600 mb-1">
                  Prodotti Totali
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {stats?.totalProducts || 0}
                </dd>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center p-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-md bg-green-50 flex items-center justify-center">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <dt className="text-sm font-medium text-gray-600 mb-1">
                  Ordini Totali
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {stats?.totalOrders || 0}
                </dd>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center p-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-md bg-yellow-50 flex items-center justify-center">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <dt className="text-sm font-medium text-gray-600 mb-1">
                  Ordini in Sospeso
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {stats?.pendingOrders || 0}
                </dd>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center p-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-md bg-blue-50 flex items-center justify-center">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <dt className="text-sm font-medium text-gray-600 mb-1">
                  Ricavi Mensili
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  €{(stats?.monthlyRevenue || 0).toLocaleString()}
                </dd>
              </div>
            </div>
          </div>
        </div>

        {/* Alert for Low Stock */}
        {(stats?.lowStockProducts || 0) > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Attenzione: Prodotti con scorte basse
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    Ci sono {stats?.lowStockProducts} prodotti con scorte al di sotto del minimo.
                    <Link to="/products?filter=low-stock" className="ml-2 font-medium underline hover:text-red-600">
                      Visualizza prodotti
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Ordini Recenti</h3>
                  <Link
                    to="/orders"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Visualizza tutti
                  </Link>
                </div>
              </div>
              <div className="px-6 py-4">
              
                {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {stats.recentOrders.slice(0, 5).map((order: any, index: number) => (
                      <li key={order.id || index} className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                                <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
                                </svg>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                Ordine #{order.orderNumber || order.id}
                              </div>
                              <div className="text-sm text-gray-500">
                                {order.user?.firstName} {order.user?.lastName} • €{order.totalAmount}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                              order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' :
                              order.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Nessun ordine recente</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Azioni Rapide</h3>
              </div>
              <div className="px-6 py-4 space-y-3">
                <Link
                  to="/products/new"
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Nuovo Prodotto
                </Link>
                <Link
                  to="/orders/new"
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Nuovo Ordine
                </Link>
                <Link
                  to="/categories/new"
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Nuova Categoria
                </Link>
              </div>
            </div>

            {/* System Health */}
            {systemHealth && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Stato Sistema</h3>
                </div>
                <div className="px-6 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Database</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      systemHealth.database === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {systemHealth.database === 'connected' ? 'Connesso' : 'Disconnesso'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Uptime</span>
                    <span className="text-sm font-medium text-gray-900">
                      {systemHealth.uptime || 'N/A'}
                    </span>
                  </div>
                  {systemHealth.memoryUsage && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Memoria</span>
                      <span className="text-sm font-medium text-gray-900">
                        {systemHealth.memoryUsage}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default DashboardPage;