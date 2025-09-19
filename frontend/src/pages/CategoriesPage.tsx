import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { categoryService, productService } from '../services/api';
import type { Category, Product } from '../services/api';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError('');

      // Load categories and products in parallel
      const [categoriesResponse, productsResponse] = await Promise.all([
        categoryService.getAllCategories(),
        productService.getAllProducts()
      ]);

      if (categoriesResponse.success && categoriesResponse.data) {
        setCategories(categoriesResponse.data);
      }

      if (productsResponse.success && productsResponse.data) {
        setProducts(productsResponse.data);
      }

    } catch (err: unknown) {
      console.error('Error loading categories:', err);
      setError('Errore nel caricamento delle categorie');
    } finally {
      setLoading(false);
    }
  };

  // Build hierarchical structure for display
  const buildCategoryHierarchy = (categories: Category[]): Category[] => {
    const categoryMap = new Map<string, Category & { children: Category[] }>();
    const rootCategories: (Category & { children: Category[] })[] = [];

    // Initialize all categories with empty children array
    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Build hierarchy
    categories.forEach(cat => {
      const category = categoryMap.get(cat.id)!;
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children.push(category);
        } else {
          rootCategories.push(category);
        }
      } else {
        rootCategories.push(category);
      }
    });

    return rootCategories;
  };

  // Function to get all child categories recursively
  const getAllChildCategories = (parentId: string): Category[] => {
    const children: Category[] = [];
    
    const findChildren = (parentId: string) => {
      const directChildren = categories.filter(cat => cat.parentId == parentId);
      children.push(...directChildren);
      directChildren.forEach(child => findChildren(child.id));
    };
    
    findChildren(parentId);
    return children;
  };

  // Function to calculate product count for a category
  const getProductCount = (category: Category): number => {
    const children = getAllChildCategories(category.id);
    
    if (children.length > 0) {
      // Parent category: count products from all child categories
      const childCategoryIds = children.map(child => child.id);
      return products.filter(p => childCategoryIds.includes(p.categoryId)).length;
    } else {
      // Child category: count products directly from this category
      return products.filter(p => p.categoryId === category.id).length;
    }
  };

  const hierarchicalCategories = buildCategoryHierarchy(categories);

  // Flatten hierarchy for table display with indentation
  const flattenHierarchy = (cats: (Category & { children: Category[], level?: number })[], level = 0): (Category & { children: Category[], level: number })[] => {
    let result: (Category & { children: Category[], level: number })[] = [];
    cats.forEach(cat => {
      result.push({ ...cat, level });
      if (cat.children && cat.children.length > 0) {
        result = result.concat(flattenHierarchy(cat.children, level + 1));
      }
    });
    return result;
  };

  const flatCategories = flattenHierarchy(hierarchicalCategories);

  const columns = [
    {
      key: 'name' as keyof Category,
      title: 'Nome Categoria',
      render: (value: string, record: Category & { level: number; children: Category[] }) => (
        <div className="flex items-center">
          <div style={{ marginLeft: `${record.level * 24}px` }} className="flex items-center">
            {record.level > 0 && (
              <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
              record.isActive ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <svg className={`w-3 h-3 ${
                record.isActive ? 'text-green-600' : 'text-gray-400'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">{value}</div>
              <div className="text-sm text-gray-500">{record.description}</div>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'slug' as keyof Category,
      title: 'Slug',
      render: (value: string) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {value}
        </span>
      )
    },
    {
      key: 'products' as keyof Category,
      title: 'Prodotti',
      render: (products: Category[] | undefined, record: Category & { children: Category[] }) => {
        const productCount = getProductCount(record);
        return (
          <div className="text-sm text-gray-900">
            {productCount}
            {record.children && record.children.length > 0 && (
              <div className="text-xs text-gray-500">
                {record.children.length} sottocategorie
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'isActive' as keyof Category,
      title: 'Stato',
      render: (value: boolean) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value ? 'Attiva' : 'Inattiva'}
        </span>
      )
    },
    {
      key: 'createdAt' as keyof Category,
      title: 'Creata',
      render: (value: string) => new Date(value).toLocaleDateString('it-IT')
    }
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestione Categorie</h1>
            <p className="mt-2 text-sm text-gray-700">
              Organizza i tuoi prodotti in categorie gerarchiche
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Link to="/categories/new">
              <Button
                variant="primary"
                icon={
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                }
              >
                Nuova Categoria
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <ErrorMessage message={error} onDismiss={() => setError('')} />
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card padding="sm" className="bg-blue-50 border-blue-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-800">Totale</p>
                <p className="text-2xl font-semibold text-blue-900">
                  {categories.length}
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
                <p className="text-sm font-medium text-green-800">Attive</p>
                <p className="text-2xl font-semibold text-green-900">
                  {categories.filter(c => c.isActive).length}
                </p>
              </div>
            </div>
          </Card>

          <Card padding="sm" className="bg-purple-50 border-purple-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-800">Principali</p>
                <p className="text-2xl font-semibold text-purple-900">
                  {categories.filter(c => !c.parentId).length}
                </p>
              </div>
            </div>
          </Card>

          <Card padding="sm" className="bg-orange-50 border-orange-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-orange-800">Sottocategorie</p>
                <p className="text-2xl font-semibold text-orange-900">
                  {categories.filter(c => c.parentId).length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Categories Table */}
        <Table
          data={flatCategories}
          columns={columns}
          loading={loading}
          emptyText="Nessuna categoria trovata"
          onRowClick={(category) => {
            window.location.href = `/categories/${category.id}`;
          }}
        />

        {/* Help Text */}
        {categories.length === 0 && !loading && (
          <Card>
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Nessuna categoria
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Inizia creando la tua prima categoria per organizzare i prodotti.
              </p>
              <div className="mt-6">
                <Link to="/categories/new">
                  <Button variant="primary">
                    Crea Prima Categoria
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        )}
        </div>
      </div>
    </Layout>
  );
};

export default CategoriesPage;