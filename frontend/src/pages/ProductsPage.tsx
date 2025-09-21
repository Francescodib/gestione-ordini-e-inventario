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
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search')?.trim() || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('categoryId') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [lowStockFilter, setLowStockFilter] = useState(searchParams.get('lowStock') === 'true');
  const [showFilters, setShowFilters] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    loadData();
  }, [searchParams]); // loadData depends on searchParams, which is stable

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const searchValue = searchParams.get('search');
      const categoryValue = searchParams.get('categoryId');
      const statusValue = searchParams.get('status');
      const lowStockValue = searchParams.get('lowStock') === 'true';
      const pageParam = searchParams.get('page');
      const limitParam = searchParams.get('limit');

      // Determine if this is a search operation
      const isSearchOperation = !!(searchValue || categoryValue || statusValue || lowStockValue);
      setHasSearched(isSearchOperation);

      let categoryId: number | undefined;
      if (categoryValue) {
        const parsedCategory = Number.parseInt(categoryValue, 10);
        if (!Number.isNaN(parsedCategory)) {
          categoryId = parsedCategory;
        }
      }

      const pageNumber = Number.parseInt(pageParam || '1', 10);
      const limitNumber = Number.parseInt(limitParam || '50', 10);

      const params = {
        search: searchValue?.trim() ? searchValue.trim() : undefined,
        categoryId,
        status: statusValue || undefined,
        lowStock: lowStockValue || undefined,
        page: Number.isNaN(pageNumber) ? 1 : pageNumber,
        limit: Number.isNaN(limitNumber) ? 50 : limitNumber
      };

      const [productsResponse, categoriesResponse] = await Promise.all([
        productService.getAllProducts(params),
        categoryService.getAllCategories()
      ]);

      if (productsResponse.success && productsResponse.data) {
        setProducts(productsResponse.data);
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
    
    if (selectedCategory) {
      newParams.set('categoryId', selectedCategory);
    } else {
      newParams.delete('categoryId');
    }
    newParams.delete('category');
    
    if (statusFilter) {
      newParams.set('status', statusFilter);
    } else {
      newParams.delete('status');
    }

    if (lowStockFilter) {
      newParams.set('lowStock', 'true');
    } else {
      newParams.delete('lowStock');
    }

    newParams.set('page', '1'); // Reset to first page
    setSearchParams(newParams);
  };

  const clearFilters = () => {
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

        {/* Filters */}
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
                  onClick={() => setShowFilters(!showFilters)}
                >
                  Filtri
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="pt-4 border-t border-gray-200">
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
            )}
          </form>
        </Card>

        {/* Results Summary */}
        {!loading && hasSearched && (
          <div className="text-sm text-gray-600">
            Trovati {products.length} prodotti
            {searchQuery && ` per "${searchQuery}"`}
            {selectedCategory && ` nella categoria selezionata`}
            {statusFilter && ` con stato "${getStatusText(statusFilter)}"`}
            {lowStockFilter && ` con scorte basse`}
          </div>
        )}

        {/* Default State Message */}
        {!loading && !hasSearched && (
          <div className="text-sm text-gray-600">
            Visualizzazione di tutti i prodotti disponibili
          </div>
        )}

        {/* Products Table */}
        <Table
          data={products}
          columns={columns}
          loading={loading}
          emptyText="Nessun prodotto trovato"
          onRowClick={(product) => {
            // Navigate to product detail page using React Router
            navigate(`/products/${product.id}`);
          }}
        />

        {/* Pagination would go here */}
        {products.length >= 50 && (
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