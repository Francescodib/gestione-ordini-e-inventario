import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { productService } from '../services/api';
import type { Product, ProductImageUpload } from '../services/api';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import ProductImageGallery from '../components/ProductImageGallery';
import ImageUpload from '../components/ImageUpload';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [requestInProgress, setRequestInProgress] = useState(false);
  const [showImageManagement, setShowImageManagement] = useState(false);


  useEffect(() => {
    if (!id || requestInProgress) return;

    let isSubscribed = true;

    const loadProduct = async () => {
      if (!isSubscribed) return;

      try {
        setRequestInProgress(true);
        setLoading(true);
        setError('');

        const response = await productService.getProductById(id);

        if (!isSubscribed) return; // Prevent state update if component unmounted

        if (response.success) {
          setProduct(response.data);
        } else {
          throw new Error(response.message || 'Prodotto non trovato');
        }
      } catch (error: any) {
        if (!isSubscribed) return; // Prevent state update if component unmounted
        setError(error.message || 'Errore durante il caricamento del prodotto');
      } finally {
        if (isSubscribed) {
          setLoading(false);
          setRequestInProgress(false);
        }
      }
    };

    loadProduct();

    return () => {
      isSubscribed = false;
    };
  }, [id]);

  const handleDelete = async () => {
    if (!product || !confirm('Sei sicuro di voler eliminare questo prodotto?')) {
      return;
    }

    try {
      const response = await productService.deleteProduct(product.id);

      if (response.success) {
        setSuccess('Prodotto eliminato con successo');
        setTimeout(() => {
          navigate('/products');
        }, 1500);
      } else {
        throw new Error(response.message || 'Errore durante l\'eliminazione');
      }
    } catch (error: any) {
      setError(error.message || 'Errore durante l\'eliminazione del prodotto');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
      DISCONTINUED: 'bg-red-100 text-red-800',
      OUT_OF_STOCK: 'bg-yellow-100 text-yellow-800'
    };
    return badges[status as keyof typeof badges] || badges.INACTIVE;
  };

  const getStatusText = (status: string) => {
    const texts = {
      ACTIVE: 'Attivo',
      INACTIVE: 'Non Attivo',
      DISCONTINUED: 'Dismesso',
      OUT_OF_STOCK: 'Esaurito'
    };
    return texts[status as keyof typeof texts] || status;
  };

  const handleImageUploadSuccess = (images: ProductImageUpload[]) => {
    setSuccess(`${images.length} immagini caricate con successo!`);
    // Optionally reload product data to show updated images
  };

  const handleImageUploadError = (error: string) => {
    setError(error);
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

  if (error && !product) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorMessage message={error} onDismiss={() => setError('')} />
          <div className="mt-6">
            <Button onClick={() => navigate('/products')}>
              Torna ai Prodotti
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Prodotto non trovato</h2>
            <p className="mt-2 text-gray-600">Il prodotto richiesto non esiste.</p>
            <div className="mt-6">
              <Button onClick={() => navigate('/products')}>
                Torna ai Prodotti
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                <Link to="/products" className="hover:text-gray-700">Prodotti</Link>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-gray-900">{product.name}</span>
              </nav>
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
              <p className="mt-1 text-sm text-gray-600">SKU: {product.sku}</p>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="secondary" 
                onClick={() => setShowImageManagement(!showImageManagement)}
              >
                {showImageManagement ? 'Nascondi' : 'Gestisci'} Immagini
              </Button>
              <Link to={`/products/${product.id}/edit`}>
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

          {/* Product Details */}
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
                    <p className="mt-1 text-sm text-gray-900">{product.description || 'Nessuna descrizione'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Categoria</label>
                      <p className="mt-1 text-sm text-gray-900">{product.category?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Stato</label>
                      <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(product.status)}`}>
                        {getStatusText(product.status)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Codice a Barre</label>
                      <p className="mt-1 text-sm text-gray-900">{product.barcode || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Peso</label>
                      <p className="mt-1 text-sm text-gray-900">{product.weight ? `${product.weight} kg` : 'N/A'}</p>
                    </div>
                  </div>

                  {product.tags && Array.isArray(product.tags) && product.tags.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tag</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {product.tags.map((tag, index) => (
                          <span key={index} className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Images */}
              <Card>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Immagini Prodotto</h3>
                </div>
                <div className="px-6 py-4">
                  <ProductImageGallery
                    productId={product.id}
                    productName={product.name}
                    size="large"
                  />
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Pricing */}
              <Card>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Prezzi</h3>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prezzo di Vendita</label>
                    <p className="mt-1 text-2xl font-bold text-gray-900">€{product.price.toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prezzo di Costo</label>
                    <p className="mt-1 text-lg text-gray-600">€{product.costPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Margine</label>
                    <p className="mt-1 text-lg text-green-600">
                      €{(product.price - product.costPrice).toFixed(2)}
                      ({((product.price - product.costPrice) / product.price * 100).toFixed(1)}%)
                    </p>
                  </div>
                </div>
              </Card>

              {/* Inventory */}
              <Card>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Inventario</h3>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantità Disponibile</label>
                    <p className={`mt-1 text-2xl font-bold ${product.stock <= product.minStock ? 'text-red-600' : 'text-gray-900'}`}>
                      {product.stock}
                      {product.stock <= product.minStock && (
                        <span className="ml-2 text-sm font-normal text-red-600">Scorta bassa!</span>
                      )}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Min</label>
                      <p className="mt-1 text-sm text-gray-900">{product.minStock}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Max</label>
                      <p className="mt-1 text-sm text-gray-900">{product.maxStock || 'N/A'}</p>
                    </div>
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
                      {new Date(product.createdAt).toLocaleDateString('it-IT', {
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
                      {new Date(product.updatedAt).toLocaleDateString('it-IT', {
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

          {/* Image Management Section */}
          {showImageManagement && (
            <Card>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Gestione Immagini</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Carica, rimuovi e gestisci le immagini del prodotto. L'immagine principale verrà mostrata per prima.
                </p>
              </div>
              <div className="px-6 py-4">
                <ImageUpload
                  productId={product.id}
                  type="product"
                  onUploadSuccess={handleImageUploadSuccess}
                  onUploadError={handleImageUploadError}
                  maxImages={8}
                />
              </div>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ProductDetailPage;