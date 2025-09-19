import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchService } from '../services/api';
import type { Product, Order, Category } from '../services/api';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Input from '../components/Input';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

interface SearchResults {
  products: Product[];
  orders: Order[];
  categories: Category[];
  total: number;
}

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState<SearchResults>({
    products: [],
    orders: [],
    categories: [],
    total: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
      performSearch(query);
    }
  }, [searchParams]);

  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      setError('');

      const [
        ,
        productsResponse,
        ordersResponse,
        categoriesResponse
      ] = await Promise.allSettled([
        searchService.globalSearch(query),
        searchService.searchProducts(query),
        searchService.searchOrders(query),
        searchService.searchCategories(query)
      ]);

      const newResults: SearchResults = {
        products: [],
        orders: [],
        categories: [],
        total: 0
      };

      if (productsResponse.status === 'fulfilled' && productsResponse.value.success) {
        newResults.products = productsResponse.value.data || [];
      }

      if (ordersResponse.status === 'fulfilled' && ordersResponse.value.success) {
        newResults.orders = ordersResponse.value.data || [];
      }

      if (categoriesResponse.status === 'fulfilled' && categoriesResponse.value.success) {
        newResults.categories = categoriesResponse.value.data || [];
      }

      newResults.total = newResults.products.length + newResults.orders.length + newResults.categories.length;
      setResults(newResults);

    } catch (err: any) {
      console.error('Search error:', err);
      setError('Errore durante la ricerca');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const newParams = new URLSearchParams();
      newParams.set('q', searchQuery.trim());
      setSearchParams(newParams);
    }
  };

  const productColumns = [
    {
      key: 'name' as keyof Product,
      title: 'Prodotto',
      render: (value: string, record: Product) => (
        <div className="flex items-center">
          <div className="h-10 w-10 flex-shrink-0">
            <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
              <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{record.name}</div>
            <div className="text-sm text-gray-500">SKU: {record.sku}</div>
          </div>
        </div>
      )
    },
    {
      key: 'category' as keyof Product,
      title: 'Categoria',
      render: (category: any) => category?.name || 'N/A'
    },
    {
      key: 'price' as keyof Product,
      title: 'Prezzo',
      render: (value: number) => `€${value.toFixed(2)}`
    },
    {
      key: 'stock' as keyof Product,
      title: 'Scorta',
      render: (value: number) => value
    }
  ];

  const orderColumns = [
    {
      key: 'orderNumber' as keyof Order,
      title: 'Numero Ordine',
      render: (value: string) => `#${value}`
    },
    {
      key: 'user' as keyof Order,
      title: 'Cliente',
      render: (user: any) => {
        if (!user) return 'N/A';
        if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
        return user.username || user.email || 'N/A';
      }
    },
    {
      key: 'status' as keyof Order,
      title: 'Stato',
      render: (value: string) => (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
          {value}
        </span>
      )
    },
    {
      key: 'totalAmount' as keyof Order,
      title: 'Totale',
      render: (value: number) => `€${value.toFixed(2)}`
    }
  ];

  const categoryColumns = [
    {
      key: 'name' as keyof Category,
      title: 'Nome',
      render: (value: string) => value
    },
    {
      key: 'description' as keyof Category,
      title: 'Descrizione',
      render: (value: string) => value
    },
    {
      key: 'products' as keyof Category,
      title: 'Prodotti',
      render: (products: any[]) => products?.length || 0
    }
  ];

  const tabs = [
    { id: 'all', name: 'Tutti', count: results.total },
    { id: 'products', name: 'Prodotti', count: results.products.length },
    { id: 'orders', name: 'Ordini', count: results.orders.length },
    { id: 'categories', name: 'Categorie', count: results.categories.length },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ricerca</h1>
          <p className="mt-2 text-sm text-gray-700">
            Cerca prodotti, ordini, categorie e altro
          </p>
        </div>

        {error && (
          <ErrorMessage message={error} onDismiss={() => setError('')} />
        )}

        {/* Search Form */}
        <Card>
          <form onSubmit={handleSearch}>
            <div className="flex space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Cerca prodotti, ordini, categorie..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  }
                  fullWidth
                />
              </div>
              <Button type="submit" variant="primary" loading={loading}>
                Cerca
              </Button>
            </div>
          </form>
        </Card>

        {searchQuery && (
          <>
            {/* Search Results Summary */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Risultati per "{searchQuery}"
                </h2>
                <p className="text-sm text-gray-500">
                  {loading ? 'Ricerca in corso...' : `${results.total} risultati trovati`}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.name}
                    {tab.count > 0 && (
                      <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                        activeTab === tab.id
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Results */}
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg"  />
              </div>
            ) : (
              <div className="space-y-6">
                {(activeTab === 'all' || activeTab === 'products') && results.products.length > 0 && (
                  <div>
                    {activeTab === 'all' && (
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Prodotti ({results.products.length})
                      </h3>
                    )}
                    <Table
                      data={results.products}
                      columns={productColumns}
                      onRowClick={(product) => {
                        window.location.href = `/products/${product.id}`;
                      }}
                    />
                  </div>
                )}

                {(activeTab === 'all' || activeTab === 'orders') && results.orders.length > 0 && (
                  <div>
                    {activeTab === 'all' && (
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Ordini ({results.orders.length})
                      </h3>
                    )}
                    <Table
                      data={results.orders}
                      columns={orderColumns}
                      onRowClick={(order) => {
                        window.location.href = `/orders/${order.id}`;
                      }}
                    />
                  </div>
                )}

                {(activeTab === 'all' || activeTab === 'categories') && results.categories.length > 0 && (
                  <div>
                    {activeTab === 'all' && (
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Categorie ({results.categories.length})
                      </h3>
                    )}
                    <Table
                      data={results.categories}
                      columns={categoryColumns}
                      onRowClick={(category) => {
                        window.location.href = `/categories/${category.id}`;
                      }}
                    />
                  </div>
                )}

                {results.total === 0 && searchQuery && !loading && (
                  <Card>
                    <div className="text-center py-12">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <h3 className="mt-4 text-lg font-medium text-gray-900">
                        Nessun risultato trovato
                      </h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Non siamo riusciti a trovare nulla per "{searchQuery}". 
                        Prova con termini di ricerca diversi.
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </>
        )}

        {!searchQuery && (
          <Card>
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Inizia una ricerca
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Cerca prodotti, ordini, categorie e molto altro utilizzando la barra di ricerca sopra.
              </p>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default SearchPage;