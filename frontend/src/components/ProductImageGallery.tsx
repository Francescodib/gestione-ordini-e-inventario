import React, { useState, useEffect } from 'react';
import { fileService } from '../services/api';
import type { ProductImageUpload } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

interface ProductImageGalleryProps {
  productId: string;
  productName: string;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  onImageSelect?: (image: ProductImageUpload) => void;
  onImageError?: (error: string) => void;
}

const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({
  productId,
  productName,
  className = '',
  size = 'medium',
  onImageSelect,
  onImageError
}) => {
  const [images, setImages] = useState<ProductImageUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ProductImageUpload | null>(null);
  const [showModal, setShowModal] = useState(false);

  const sizeClasses = {
    small: 'aspect-square h-16 w-16',
    medium: 'aspect-square h-32 w-32',
    large: 'aspect-square h-48 w-48'
  };

  const gridClasses = {
    small: 'grid-cols-4 gap-2',
    medium: 'grid-cols-3 gap-4',
    large: 'grid-cols-2 gap-6'
  };

  useEffect(() => {
    loadImages();
  }, [productId]);

  const loadImages = async () => {
    try {
      setLoading(true);
      setError(false);
      const response = await fileService.getProductImages(productId);
      if (response.success && response.data) {
        const sortedImages = response.data.sort((a, b) => {
          if (a.isPrimary && !b.isPrimary) return -1;
          if (!a.isPrimary && b.isPrimary) return 1;
          return a.sortOrder - b.sortOrder;
        });
        setImages(sortedImages);
      }
    } catch (err) {
      setError(true);
      if (onImageError) {
        onImageError('Errore nel caricamento delle immagini');
      }
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (image: ProductImageUpload, imageSize: 'thumbnail' | 'medium' | 'large' | 'original' = 'medium') => {
    return fileService.getFileUrl(image.paths[imageSize]);
  };

  const handleImageClick = (image: ProductImageUpload) => {
    if (onImageSelect) {
      onImageSelect(image);
    }
    setSelectedImage(image);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedImage(null);
  };

  const getMainImage = () => {
    return images.find(img => img.isPrimary) || images[0];
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error || images.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="mt-2 text-sm text-gray-500">
          {error ? 'Errore nel caricamento delle immagini' : 'Nessuna immagine disponibile'}
        </p>
      </div>
    );
  }

  // Single image display for small size
  if (size === 'small') {
    const mainImage = getMainImage();
    if (!mainImage) return null;

    return (
      <div className={`${sizeClasses[size]} ${className}`}>
        <img
          src={getImageUrl(mainImage, 'thumbnail')}
          alt={productName}
          className="w-full h-full object-cover rounded-md border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => handleImageClick(mainImage)}
          onError={(e) => {
            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQgMTZMOC41ODYgMTEuNDE0QzkuMzY3IDEwLjYzMyAxMC42MzMgMTAuNjMzIDExLjQxNCAxMS40MTRMMTYgMTZNMTQgMTRMMTUuNTg2IDEyLjQxNEMxNi4zNjcgMTEuNjMzIDE3LjYzMyAxMS42MzMgMTguNDE0IDEyLjQxNEwyMCAxNE0xOCA4SDEzTTYgMjBIMThDMTkuMTA0NiAyMCAyMCAxOS4xMDQ2IDIwIDE4VjZDMjAgNC44OTU0MyAxOS4xMDQ2IDQgMTggNEg2QzQuODk1NDMgNCA0IDQuODk1NDMgNCA2VjE4QzQgMTkuMTA0NiA0Ljg5NTQzIDIwIDYgMjBaIiBzdHJva2U9IiNEMUQ1REIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=';
          }}
        />
        {mainImage.isPrimary && (
          <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 py-0.5 rounded">
            P
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={`grid ${gridClasses[size]} ${className}`}>
        {images.map((image) => (
          <div key={image.id} className="relative group">
            <div className={`${sizeClasses[size]} bg-gray-100 rounded-lg overflow-hidden`}>
              <img
                src={getImageUrl(image, size === 'large' ? 'large' : 'medium')}
                alt={`${productName} - ${image.originalName}`}
                className="w-full h-full object-cover cursor-pointer group-hover:opacity-80 transition-opacity"
                onClick={() => handleImageClick(image)}
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQgMTZMOC41ODYgMTEuNDE0QzkuMzY3IDEwLjYzMyAxMC42MzMgMTAuNjMzIDExLjQxNCAxMS40MTRMMTYgMTZNMTQgMTRMMTUuNTg2IDEyLjQxNEMxNi4zNjcgMTEuNjMzIDE3LjYzMyAxMS42MzMgMTguNDE0IDEyLjQxNEwyMCAxNE0xOCA4SDEzTTYgMjBIMThDMTkuMTA0NiAyMCAyMCAxOS4xMDQ2IDIwIDE4VjZDMjAgNC44OTU0MyAxOS4xMDQ2IDQgMTggNEg2QzQuODk1NDMgNCA0IDQuODk1NDMgNCA2VjE4QzQgMTkuMTA0NiA0Ljg5NTQzIDIwIDYgMjBaIiBzdHJva2U9IiNEMUQ1REIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=';
                }}
              />
            </div>
            
            {image.isPrimary && (
              <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                Principale
              </div>
            )}
            
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded-lg flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for full-size image view */}
      {showModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-screen">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <img
              src={getImageUrl(selectedImage, 'original')}
              alt={`${productName} - ${selectedImage.originalName}`}
              className="max-w-full max-h-screen object-contain"
              onError={(e) => {
                e.currentTarget.src = getImageUrl(selectedImage, 'large');
              }}
            />
            
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white p-3 rounded">
              <p className="text-sm font-medium">{productName}</p>
              <p className="text-xs text-gray-300">{selectedImage.originalName}</p>
              {selectedImage.isPrimary && (
                <span className="inline-block mt-1 bg-green-500 text-white text-xs px-2 py-1 rounded">
                  Immagine Principale
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductImageGallery;