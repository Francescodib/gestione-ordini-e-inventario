import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { productService, categoryService } from '../services/api';
import type { Product, Category } from '../services/api';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Input from '../components/Input';
import ErrorMessage from '../components/ErrorMessage';
import ProductImageGallery from '../components/ProductImageGallery';

const ProductsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search')?.trim() || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('categoryId') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [lowStockFilter, setLowStockFilter] = useState(searchParams.get('lowStock') === 'true');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    loadData();
  }, [searchParams]); // loadData depends on searchParams, which is stable

  // Update filter state from URL params
  useEffect(() => {
    setSearchQuery(searchParams.get('search')?.trim() || '');
    setSelectedCategory(searchParams.get('categoryId') || '');
    setStatusFilter(searchParams.get('status') || '');
    setLowStockFilter(searchParams.get('lowStock') === 'true');
  }, [searchParams]);

  // Apply client-side filters
  useEffect(() => {
    let filtered = [...allProducts];

    // Apply category filter
    if (selectedCategory) {
      const categoryId = Number.parseInt(selectedCategory, 10);
      if (!Number.isNaN(categoryId)) {
        filtered = filtered.filter(product => product.category?.id === categoryId);
      }
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(product => product.status === statusFilter);
    }

    // Apply low stock filter
    if (lowStockFilter) {
      filtered = filtered.filter(product =>
        product.stock <= (product.minStock || 0)
      );
    }

    setFilteredProducts(filtered);
  }, [allProducts, selectedCategory, statusFilter, lowStockFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const searchValue = searchParams.get('search');
      const pageParam = searchParams.get('page');
      const limitParam = searchParams.get('limit');

      // Determine if this is a search operation (only for search query, not filters)
      const isSearchOperation = !!(searchValue);
      setHasSearched(isSearchOperation);

      const pageNumber = Number.parseInt(pageParam || '1', 10);
      const limitNumber = Number.parseInt(limitParam || '100', 10); // Increased limit for client-side filtering

      const params = {
        search: searchValue?.trim() ? searchValue.trim() : undefined,
        page: Number.isNaN(pageNumber) ? 1 : pageNumber,
        limit: Number.isNaN(limitNumber) ? 100 : limitNumber
      };

      const [productsResponse, categoriesResponse] = await Promise.all([
        productService.getAllProducts(params),
        categoryService.getAllCategories()
      ]);

      if (productsResponse.success && productsResponse.data) {
        setAllProducts(productsResponse.data);
      }

      if (categoriesResponse.success && categoriesResponse.data) {
        setCategories(categoriesResponse.data);
      }

    } catch (err: any) {
      console.error('Error loading products:', err);
      setError('Errore nel caricamento dei prodotti');
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

    newParams.set('page', '1'); // Reset to first page
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setStatusFilter('');
    setLowStockFilter(false);
  };

  const clearAll = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setStatusFilter('');
    setLowStockFilter(false);
    setHasSearched(false);
    setSearchParams({});
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      'ACTIVE': 'bg-green-100 text-green-800',
      'INACTIVE': 'bg-gray-100 text-gray-800',
      'DISCONTINUED': 'bg-red-100 text-red-800',
      'OUT_OF_STOCK': 'bg-yellow-100 text-yellow-800'
    };
    
    return badges[status as keyof typeof badges] || badges['ACTIVE'];
  };

  const getStatusText = (status: string) => {
    const texts = {
      'ACTIVE': 'Attivo',
      'INACTIVE': 'Inattivo',
      'DISCONTINUED': 'Discontinuo',
      'OUT_OF_STOCK': 'Esaurito'
    };
    
    return texts[status as keyof typeof texts] || status;
  };

  const columns = [
    {
      key: 'name' as keyof Product,
      title: 'Prodotto',
      render: (value: string, record: Product) => (
        <div className="flex items-center py-2">
          <div className="h-16 w-16 flex-shrink-0">
            <ProductImageGallery
              productId={record.id}
              productName={record.name}
              size="small"
              className="cursor-pointer rounded-lg overflow-hidden"
              onImageSelect={() => navigate(`/products/${record.id}`)}
            />
          </div>
          <div className="ml-4 min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate">
              <Link to={`/products/${record.id}`} title={record.name}>
                {record.name}
              </Link>
            </div>
            <div className="text-sm text-gray-500 truncate" title={`SKU: ${record.sku}`}>
              SKU: {record.sku}
            </div>
            {record.description && (
              <div className="text-xs text-gray-400 truncate mt-1" title={record.description}>
                {record.description}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'category' as keyof Product,
      title: 'Categoria',
      render: (category: Category) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900 truncate" title={category?.name || 'N/A'}>
            {category?.name || 'N/A'}
          </div>
          {category?.description && (
            <div className="text-xs text-gray-500 truncate" title={category.description}>
              {category.description}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'price' as keyof Product,
      title: 'Prezzo',
      render: (value: number, record: Product) => (
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">
            €{value.toFixed(2)}
          </div>
          {record.costPrice && (
            <div className="text-xs text-gray-500">
              Costo: €{record.costPrice.toFixed(2)}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'stock' as keyof Product,
      title: 'Scorta',
      render: (value: number, record: Product) => (
        <div className="text-center">
          <div className={`text-sm font-medium ${
            value <= (record.minStock || 0) ? 'text-red-600' : 'text-gray-900'
          }`}>
            {value}
          </div>
          <div className="text-xs text-gray-500">
            Min: {record.minStock || 0}
          </div>
          {value <= (record.minStock || 0) && (
            <div className="flex justify-center mt-1">
              <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'status' as keyof Product,
      title: 'Stato',
      render: (value: string) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(value)}`}>
          {getStatusText(value)}
        </span>
      )
    },
    {
      key: 'updatedAt' as keyof Product,
      title: 'Aggiornato',
      render: (value: string) => (
        <div className="text-sm text-gray-900">
          <div>{new Date(value).toLocaleDateString('it-IT')}</div>
          <div className="text-xs text-gray-500">
            {new Date(value).toLocaleTimeString('it-IT', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      )
    }
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestione Prodotti</h1>
            <p className="mt-2 text-sm text-gray-700">
              Gestisci l'inventario dei tuoi prodotti
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Link to="/products/new">
              <Button
                variant="primary"
                icon={
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                }
              >
                Nuovo Prodotto
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <ErrorMessage message={error} onDismiss={() => setError('')} />
        )}

        {/* Search */}
        <Card>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-4 space-y-4 sm:space-y-0">
              <div className="flex-1">
                <Input
                  label="Cerca prodotti"
                  placeholder="Nome prodotto, SKU, descrizione..."
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
                  onClick={clearAll}
                >
                  Reset
                </Button>
              </div>
            </div>
          </form>
        </Card>

        {/* Filters */}
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Filtri visualizzazione</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Tutte le categorie</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stato
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Tutti gli stati</option>
                  <option value="ACTIVE">Attivo</option>
                  <option value="INACTIVE">Inattivo</option>
                  <option value="OUT_OF_STOCK">Esaurito</option>
                  <option value="DISCONTINUED">Discontinuo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Filtri Avanzati
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={lowStockFilter}
                    onChange={(e) => setLowStockFilter(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Solo prodotti a scorte basse</span>
                </label>
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
        </Card>

        {/* Results Summary */}
        {!loading && (
          <div className="text-sm text-gray-600 space-y-1">
            <div>
              Visualizzazione di {filteredProducts.length} prodotti
              {allProducts.length !== filteredProducts.length && ` su ${allProducts.length} totali`}
              {searchQuery && ` con ricerca: "${searchQuery}"`}
            </div>
            {(selectedCategory || statusFilter || lowStockFilter) && (
              <div className="text-xs">
                Filtri attivi:
                {selectedCategory && ` Categoria: ${categories.find(c => c.id.toString() === selectedCategory)?.name}`}
                {statusFilter && ` Stato: ${getStatusText(statusFilter)}`}
                {lowStockFilter && ` Scorte basse`}
              </div>
            )}
          </div>
        )}

        {/* Products Table */}
        <Table
          data={filteredProducts}
          columns={columns}
          loading={loading}
          emptyText="Nessun prodotto trovato"
          onRowClick={(product) => {
            // Navigate to product detail page using React Router
            navigate(`/products/${product.id}`);
          }}
        />

        {/* Pagination would go here */}
        {filteredProducts.length >= 50 && (
          <div className="flex justify-center">
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <Button variant="secondary" size="sm">
                Precedente
              </Button>
              <Button variant="secondary" size="sm" className="ml-2">
                Successivo
              </Button>
            </nav>
          </div>
        )}
        </div>
      </div>
    </Layout>
  );
};

export default ProductsPage;