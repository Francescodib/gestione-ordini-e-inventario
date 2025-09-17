import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productService, categoryService } from '../services/api';
import type { Category, ProductImageUpload } from '../services/api';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import ErrorMessage from '../components/ErrorMessage';
import ImageUpload from '../components/ImageUpload';

interface ProductFormData {
  name: string;
  description: string;
  sku: string;
  barcode: string;
  categoryId: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  maxStock: number;
  weight: number;
  tags: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' | 'OUT_OF_STOCK';
}

const ProductCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);
  const [showImageUpload, setShowImageUpload] = useState(false);

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    categoryId: '',
    price: 0,
    costPrice: 0,
    stock: 0,
    minStock: 0,
    maxStock: 0,
    weight: 0,
    tags: '',
    status: 'ACTIVE'
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await categoryService.getAllCategories();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error: any) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validation
      if (!formData.name.trim()) {
        throw new Error('Il nome del prodotto è obbligatorio');
      }
      if (!formData.sku.trim()) {
        throw new Error('Lo SKU è obbligatorio');
      }
      if (!formData.categoryId) {
        throw new Error('La categoria è obbligatoria');
      }
      if (formData.price <= 0) {
        throw new Error('Il prezzo deve essere maggiore di zero');
      }

      const productData = {
        ...formData,
        price: Number(formData.price),
        costPrice: Number(formData.costPrice),
        stock: Number(formData.stock),
        minStock: Number(formData.minStock),
        maxStock: formData.maxStock > 0 ? Number(formData.maxStock) : undefined,
        weight: formData.weight > 0 ? Number(formData.weight) : undefined,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : []
      };

      const response = await productService.createProduct(productData);

      if (response.success) {
        setCreatedProductId(response.data.id);
        setSuccess('Prodotto creato con successo! Ora puoi aggiungere delle immagini.');
        setShowImageUpload(true);
      } else {
        throw new Error(response.message || 'Errore durante la creazione del prodotto');
      }
    } catch (error: any) {
      setError(error.message || 'Errore durante la creazione del prodotto');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProductFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUploadSuccess = (images: ProductImageUpload[]) => {
    setSuccess(`${images.length} immagini caricate con successo!`);
  };

  const handleImageUploadError = (error: string) => {
    setError(error);
  };

  const handleFinishAndViewProduct = () => {
    if (createdProductId) {
      navigate(`/products/${createdProductId}`);
    } else {
      navigate('/products');
    }
  };

  const handleSkipImages = () => {
    navigate('/products');
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nuovo Prodotto</h1>
              <p className="mt-2 text-sm text-gray-700">
                Aggiungi un nuovo prodotto al catalogo
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => navigate('/products')}
            >
              Annulla
            </Button>
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

          {/* Product Form */}
          {!showImageUpload && (
            <Card>
              <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Nome Prodotto *"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Inserisci il nome del prodotto"
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => handleInputChange('categoryId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Seleziona una categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="SKU *"
                  type="text"
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  placeholder="Codice univoco prodotto"
                  required
                />

                <Input
                  label="Codice a Barre"
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => handleInputChange('barcode', e.target.value)}
                  placeholder="Codice a barre (opzionale)"
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
                  placeholder="Descrizione dettagliata del prodotto"
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Prezzo di Vendita *"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  required
                />

                <Input
                  label="Prezzo di Costo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.costPrice}
                  onChange={(e) => handleInputChange('costPrice', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>

              {/* Inventory */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input
                  label="Quantità Iniziale"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />

                <Input
                  label="Scorta Minima"
                  type="number"
                  min="0"
                  value={formData.minStock}
                  onChange={(e) => handleInputChange('minStock', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />

                <Input
                  label="Scorta Massima"
                  type="number"
                  min="0"
                  value={formData.maxStock}
                  onChange={(e) => handleInputChange('maxStock', parseInt(e.target.value) || 0)}
                  placeholder="0 (opzionale)"
                />
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Peso (kg)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.weight}
                  onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || 0)}
                  placeholder="0.00 (opzionale)"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stato
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ACTIVE">Attivo</option>
                    <option value="INACTIVE">Non Attivo</option>
                    <option value="DISCONTINUED">Dismesso</option>
                    <option value="OUT_OF_STOCK">Esaurito</option>
                  </select>
                </div>
              </div>

              <Input
                label="Tag"
                type="text"
                value={formData.tags}
                onChange={(e) => handleInputChange('tags', e.target.value)}
                placeholder="tag1, tag2, tag3 (separati da virgola)"
              />

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/products')}
                  disabled={loading}
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                >
                  {loading ? 'Creando...' : 'Crea Prodotto'}
                </Button>
              </div>
            </form>
          </Card>
          )}

          {/* Image Upload Step */}
          {showImageUpload && createdProductId && (
            <Card>
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Aggiungi Immagini Prodotto</h2>
                  <p className="mt-2 text-sm text-gray-600">
                    Carica delle immagini per il prodotto appena creato. Puoi saltare questo passaggio e aggiungere le immagini in seguito.
                  </p>
                </div>

                <ImageUpload
                  productId={createdProductId}
                  type="product"
                  onUploadSuccess={handleImageUploadSuccess}
                  onUploadError={handleImageUploadError}
                  maxImages={5}
                />

                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <Button
                    variant="secondary"
                    onClick={handleSkipImages}
                  >
                    Salta questo passaggio
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleFinishAndViewProduct}
                  >
                    Completa e Visualizza Prodotto
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ProductCreatePage;