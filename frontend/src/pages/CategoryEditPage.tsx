import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { categoryService, productService } from '../services/api';
import type { Category, Product } from '../services/api';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import ErrorMessage from '../components/ErrorMessage';

interface CategoryFormData {
  name: string;
  description: string;
  slug: string;
  parentId?: string;
  isActive: boolean;
}

const CategoryEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [childCategories, setChildCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    slug: '',
    parentId: '',
    isActive: true
  });

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  // Function to get all child categories recursively
  const getAllChildCategories = async (parentId: string): Promise<Category[]> => {
    try {
      const response = await categoryService.getAllCategories();
      if (response.success && response.data) {
        const allCategories = response.data;
        const children: Category[] = [];
        
        const findChildren = (parentId: string) => {
          const directChildren = allCategories.filter(cat => cat.parentId === parentId);
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


  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [categoryResponse, categoriesResponse] = await Promise.all([
        categoryService.getCategoryById(id!),
        categoryService.getAllCategories()
      ]);

      if (categoriesResponse.success && categoriesResponse.data) {
        // Filter out the current category and its children to prevent circular references
        const filteredCategories = categoriesResponse.data.filter(cat => 
          cat.id !== id && !isChildCategory(cat, id!)
        );
        setCategories(filteredCategories);
      }

      if (categoryResponse.success && categoryResponse.data) {
        const category = categoryResponse.data;
        setFormData({
          name: category.name,
          description: category.description,
          slug: category.slug,
          parentId: category.parentId || '',
          isActive: category.isActive
        });

        // Get child categories and products (simplified)
        try {
          const children = await getAllChildCategories(id!);
          setChildCategories(children);
          
          // Load products from main category first
          const mainCategoryResponse = await productService.getAllProducts({ categoryId: parseInt(id!) });
          if (mainCategoryResponse.success && mainCategoryResponse.data) {
            setProducts(mainCategoryResponse.data);
          }
          
          // Then load products from child categories
          if (children.length > 0) {
            const allProducts = [...(mainCategoryResponse.data || [])];
            for (const childCategory of children) {
              const childResponse = await productService.getAllProducts({ categoryId: parseInt(childCategory.id) });
              if (childResponse.success && childResponse.data) {
                allProducts.push(...childResponse.data);
              }
            }
            setProducts(allProducts);
          }
        } catch (childError) {
          console.warn('Error loading child categories, continuing with main category only:', childError);
        }
      } else {
        throw new Error(categoryResponse.message || 'Categoria non trovata');
      }
    } catch (error: any) {
      setError(error.message || 'Errore durante il caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const isChildCategory = (category: Category, parentId: string): boolean => {
    if (category.parentId === parentId) return true;
    if (category.children) {
      return category.children.some(child => isChildCategory(child, parentId));
    }
    return false;
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim();
  };

  const handleNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      name: value,
      slug: generateSlug(value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // Validation
      if (!formData.name.trim()) {
        throw new Error('Il nome della categoria è obbligatorio');
      }
      if (!formData.slug.trim()) {
        throw new Error('Lo slug è obbligatorio');
      }

      const categoryData = {
        ...formData,
        parentId: formData.parentId || undefined
      };

      const response = await categoryService.updateCategory(id!, categoryData);

      if (response.success) {
        setSuccess('Categoria aggiornata con successo!');
        setTimeout(() => {
          navigate(`/categories/${id}`);
        }, 1500);
      } else {
        throw new Error(response.message || 'Errore durante l\'aggiornamento della categoria');
      }
    } catch (error: any) {
      setError(error.message || 'Errore durante l\'aggiornamento della categoria');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof CategoryFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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

  if (error && !formData.name) {
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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Modifica Categoria</h1>
              <p className="mt-2 text-sm text-gray-700">
                Aggiorna le informazioni della categoria
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={() => navigate(`/categories/${id}`)}
              >
                Annulla
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

          {/* Products Preview */}
          {products.length > 0 && (
            <Card>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Prodotti nella categoria ({products.length})
                  {childCategories.length > 0 && (
                    <span className="text-sm text-gray-500 ml-2">
                      (inclusi {childCategories.length} sottocategorie)
                    </span>
                  )}
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  {/* Main category products */}
                  {products.filter(p => p.categoryId == id).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {formData.name} ({products.filter(p => p.categoryId == id).length} prodotti)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {products.filter(p => p.categoryId == id).slice(0, 6).map((product) => (
                          <div key={product.id} className="p-3 bg-gray-50 rounded-lg">
                            <Link 
                              to={`/products/${product.id}`}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                              {product.name}
                            </Link>
                            <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                            <p className="text-xs text-gray-900">€{product.price.toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                      {products.filter(p => p.categoryId == id).length > 6 && (
                        <p className="text-sm text-gray-500 text-center mt-2">
                          E altri {products.filter(p => p.categoryId == id).length - 6} prodotti...
                        </p>
                      )}
                    </div>
                  )}

                  {/* Child categories products */}
                  {childCategories.map((childCategory) => {
                    const childProducts = products.filter(p => p.categoryId == childCategory.id);
                    if (childProducts.length === 0) return null;
                    
                    return (
                      <div key={childCategory.id}>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          {childCategory.name} ({childProducts.length} prodotti)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {childProducts.slice(0, 3).map((product) => (
                            <div key={product.id} className="p-3 bg-green-50 rounded-lg">
                              <Link 
                                to={`/products/${product.id}`}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800"
                              >
                                {product.name}
                              </Link>
                              <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                              <p className="text-xs text-gray-900">€{product.price.toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                        {childProducts.length > 3 && (
                          <p className="text-sm text-gray-500 text-center mt-2">
                            E altri {childProducts.length - 3} prodotti...
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* Form */}
          <Card>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Nome Categoria *"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Inserisci il nome della categoria"
                  required
                />

                <Input
                  label="Slug *"
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  placeholder="slug-della-categoria"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrizione
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Descrizione della categoria"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria Padre
                  </label>
                  <select
                    value={formData.parentId}
                    onChange={(e) => handleInputChange('parentId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Nessuna (categoria principale)</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stato
                  </label>
                  <select
                    value={formData.isActive ? 'true' : 'false'}
                    onChange={(e) => handleInputChange('isActive', e.target.value === 'true')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="true">Attiva</option>
                    <option value="false">Non Attiva</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate(`/categories/${id}`)}
                  disabled={saving}
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : 'Salva Modifiche'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default CategoryEditPage;
