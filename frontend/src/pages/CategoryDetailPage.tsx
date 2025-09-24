import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { categoryService, productService } from '../services/api';
import type { Category, Product } from '../services/api';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';

const CategoryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [childCategories, setChildCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Function to get all child categories recursively
  const getAllChildCategories = async (parentId: string): Promise<Category[]> => {
    try {
      console.log('Fetching child categories for parent:', parentId);
      const response = await categoryService.getAllCategories();
      if (response.success && response.data) {
        const allCategories = response.data;
        const children: Category[] = [];
        
        const findChildren = (parentId: string) => {
          const directChildren = allCategories.filter(cat => cat.parentId == parentId);
          children.push(...directChildren);
          directChildren.forEach(child => findChildren(child.id));
        };
        
        findChildren(parentId);
        return children;
      }
      return [];
    } catch (error) {
      console.error('Error fetching child categories:', error);
      return [];
    }
  };


  useEffect(() => {
    if (!id) return;

    console.log('CategoryDetailPage useEffect triggered for id:', id);
    let isSubscribed = true;

    const loadCategory = async () => {
      if (!isSubscribed) return;

      try {
        console.log('Starting to load category data...');
        setLoading(true);
        setError('');

        const categoryResponse = await categoryService.getCategoryById(id);
        console.log('Category response:', categoryResponse);

        if (!isSubscribed) return; // Prevent state update if component unmounted

        if (categoryResponse.success && categoryResponse.data) {
          const categoryData = categoryResponse.data;
          console.log('Setting category data:', categoryData);
          setCategory(categoryData);
          
          // Get child categories first
          try {
            const children = await getAllChildCategories(id);
            setChildCategories(children);
            
            // Get all products
            const allProductsResponse = await productService.getAllProducts();
            if (allProductsResponse.success && allProductsResponse.data) {
              const categoryId = parseInt(id);
              
              // If this category has children, get products from children
              // If this category has no children, get products directly from this category
              if (children.length > 0) {
                // Parent category: get products from all child categories
                const childCategoryIds = children.map(child => child.id);
                const filteredProducts = allProductsResponse.data.filter(p => 
                  childCategoryIds.includes(p.categoryId)
                );
                setProducts(filteredProducts);
              } else {
                // Child category: get products directly from this category
                const filteredProducts = allProductsResponse.data.filter(p => p.categoryId === categoryId);
                setProducts(filteredProducts);
              }
            } else {
              setProducts([]);
            }
          } catch (childError) {
            console.warn('Error loading child categories, continuing with main category only:', childError);
            setChildCategories([]);
            setProducts([]);
          }
          
          console.log('Category data loaded successfully');
        } else {
          throw new Error(categoryResponse.message || 'Categoria non trovata');
        }
      } catch (error: unknown) {
        if (!isSubscribed) return; // Prevent state update if component unmounted
        console.error('Error loading category:', error);
        setError(error instanceof Error ? error.message : 'Errore durante il caricamento della categoria');
      } finally {
        if (isSubscribed) {
          console.log('Setting loading to false');
          setLoading(false);
        }
      }
    };

    loadCategory();

    return () => {
      isSubscribed = false;
    };
  }, [id]);

  const handleDelete = async () => {
    if (!category || !confirm('Sei sicuro di voler eliminare questa categoria?')) {
      return;
    }

    try {
      const response = await categoryService.deleteCategory(category.id);

      if (response.success) {
        setSuccess('Categoria eliminata con successo');
        setTimeout(() => {
          navigate('/categories');
        }, 1500);
      } else {
        throw new Error(response.message || 'Errore durante l\'eliminazione');
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Errore durante l\'eliminazione della categoria');
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800' 
      : 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'Attiva' : 'Non Attiva';
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

  if (error && !category) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorMessage message={error} onDismiss={() => setError('')} />
          <div className="mt-6">
            <Button onClick={() => navigate('/categories')}>
              Torna alle Categorie
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!category) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Categoria non trovata</h2>
            <p className="mt-2 text-gray-600">La categoria richiesta non esiste.</p>
            <div className="mt-6">
              <Button onClick={() => navigate('/categories')}>
                Torna alle Categorie
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                <Link to="/categories" className="hover:text-gray-700">Categorie</Link>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-gray-900">{category.name}</span>
              </nav>
              <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
              <p className="mt-1 text-sm text-gray-600">Slug: {category.slug}</p>
            </div>
            <div className="flex space-x-3">
              <Link to={`/categories/${category.id}/edit`}>
                <Button variant="secondary">
                  Modifica
                </Button>
              </Link>
              <Button variant="danger" onClick={handleDelete}>
                Elimina
              </Button>
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

          {/* Category Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Informazioni Generali</h3>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Descrizione</label>
                    <p className="mt-1 text-sm text-gray-900">{category.description || 'Nessuna descrizione'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Slug</label>
                      <p className="mt-1 text-sm text-gray-900 font-mono">{category.slug}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Stato</label>
                      <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(category.isActive)}`}>
                        {getStatusText(category.isActive)}
                      </span>
                    </div>
                  </div>

                  {category.parentId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Categoria Padre</label>
                      <Link
                        to={`/categories/${category.parentId}`}
                        className="mt-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {category.parent?.name || `ID: ${category.parentId}`}
                      </Link>
                    </div>
                  )}
                </div>
              </Card>

              {/* Products in this category and children */}
              <Card>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Prodotti ({products.length})
                    {childCategories.length > 0 && (
                      <span className="text-sm text-gray-500 ml-2">
                        (inclusi {childCategories.length} sottocategorie)
                      </span>
                    )}
                  </h3>
                </div>
                <div className="px-6 py-4">
                  {products.length > 0 ? (
                    <div className="space-y-6">
                      {/* Main category products - only show if this is a child category */}
                      {childCategories.length === 0 && products.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            {category?.name} ({products.filter(p => p.categoryId == id).length} prodotti)
                          </h4>
                          <div className="space-y-2">
                            {products.filter(p => p.categoryId == id).slice(0, 5).map((product) => (
                              <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                  <Link 
                                    to={`/products/${product.id}`}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                                  >
                                    {product.name}
                                  </Link>
                                  <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">€{product.price.toFixed(2)}</p>
                                  <p className="text-xs text-gray-500">Stock: {product.stock}</p>
                                </div>
                              </div>
                            ))}
                            {products.filter(p => p.categoryId == id).length > 5 && (
                              <p className="text-sm text-gray-500 text-center">
                                E altri {products.filter(p => p.categoryId == id).length - 5} prodotti...
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Child categories products - only show if this is a parent category */}
                      {childCategories.length > 0 && childCategories.map((childCategory) => {
                        const childProducts = products.filter(p => p.categoryId === childCategory.id);
                        if (childProducts.length === 0) return null;
                        
                        return (
                          <div key={childCategory.id}>
                            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              {childCategory.name} ({childProducts.length} prodotti)
                            </h4>
                            <div className="space-y-2">
                              {childProducts.slice(0, 3).map((product) => (
                                <div key={product.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                  <div className="flex-1">
                                    <Link 
                                      to={`/products/${product.id}`}
                                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                                    >
                                      {product.name}
                                    </Link>
                                    <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900">€{product.price.toFixed(2)}</p>
                                    <p className="text-xs text-gray-500">Stock: {product.stock}</p>
                                  </div>
                                </div>
                              ))}
                              {childProducts.length > 3 && (
                                <p className="text-sm text-gray-500 text-center">
                                  E altri {childProducts.length - 3} prodotti...
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">Nessun prodotto in questa categoria</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Category Stats */}
              <Card>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Statistiche</h3>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Numero Prodotti</label>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{products.length}</p>
                    <p className="text-xs text-gray-500">
                      {childCategories.length === 0 
                        ? `${products.length} prodotti in questa categoria`
                        : `${products.length} prodotti totali nelle sottocategorie`
                      }
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sottocategorie</label>
                    <p className="mt-1 text-lg text-blue-600">{childCategories.length}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prodotti Attivi</label>
                    <p className="mt-1 text-lg text-green-600">
                      {products.filter(p => p.status === 'ACTIVE').length}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prodotti in Scorta Bassa</label>
                    <p className="mt-1 text-lg text-yellow-600">
                      {products.filter(p => p.stock <= p.minStock).length}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Metadata */}
              <Card>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Informazioni Sistema</h3>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Creato il</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(category.createdAt).toLocaleDateString('it-IT', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ultimo Aggiornamento</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(category.updatedAt).toLocaleDateString('it-IT', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CategoryDetailPage;
