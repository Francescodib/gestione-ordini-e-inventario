import React, { useState, useCallback, useEffect } from 'react';
import { fileService } from '../services/api';
import type { ProductImageUpload } from '../services/api';
import FileUpload from './FileUpload';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';

interface ImageUploadProps {
  productId?: string;
  userId?: string;
  type: 'product' | 'avatar';
  onUploadSuccess?: (result: ProductImageUpload[] | any) => void;
  onUploadError?: (error: string) => void;
  existingImages?: ProductImageUpload[];
  maxImages?: number;
  className?: string;
}

interface ImageWithPrimary {
  file: File;
  isPrimary: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  productId,
  userId,
  type,
  onUploadSuccess,
  onUploadError,
  existingImages = [],
  maxImages = 5,
  className = ''
}) => {
  const [selectedImages, setSelectedImages] = useState<ImageWithPrimary[]>([]);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<ProductImageUpload[]>(existingImages);
  const [loadingImages, setLoadingImages] = useState(false);

  useEffect(() => {
    if (type === 'product' && productId) {
      loadExistingImages();
    }
  }, [productId, type]);

  const loadExistingImages = async () => {
    if (!productId) return;
    
    setLoadingImages(true);
    try {
      const response = await fileService.getProductImages(productId);
      if (response.success && response.data) {
        setImages(response.data);
      }
    } catch (error) {
      console.error('Failed to load existing images:', error);
    } finally {
      setLoadingImages(false);
    }
  };

  const handleFileSelect = useCallback((files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const newImages = imageFiles.map((file, index) => {
      // Check if this is the first image overall (no existing selected images and no existing uploaded images)
      const isFirstImageOverall = selectedImages.length === 0 && index === 0 && images.length === 0;
      // Check if this is the first image in this selection and no primary is already set
      const hasPrimarySelected = selectedImages.some(img => img.isPrimary);
      const shouldBePrimary = isFirstImageOverall || (!hasPrimarySelected && index === 0);

      return {
        file,
        isPrimary: shouldBePrimary
      };
    });

    setSelectedImages(newImages);
  }, [selectedImages, images.length]);

  const setPrimaryImage = useCallback((index: number) => {
    setSelectedImages(prev => 
      prev.map((img, i) => ({
        ...img,
        isPrimary: i === index
      }))
    );
  }, []);

  const handleUpload = async () => {
    if (selectedImages.length === 0) return;

    setUploading(true);
    try {
      let result;
      
      if (type === 'product' && productId) {
        const files = selectedImages.map(img => img.file);
        const primaryFlags = selectedImages.map(img => img.isPrimary);
        
        const response = await fileService.uploadProductImages(productId, files, primaryFlags);
        if (response.success && response.data) {
          result = response.data;
          setImages(prev => [...prev, ...(response.data || [])]);
          setSelectedImages([]);
        }
      } else if (type === 'avatar' && userId) {
        if (selectedImages.length > 0) {
          const response = await fileService.uploadAvatar(userId, selectedImages[0].file);
          if (response.success && response.data) {
            result = response.data;
            setSelectedImages([]);
          }
        }
      }

      if (result && onUploadSuccess) {
        onUploadSuccess(result);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Upload failed';
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      await fileService.deleteProductImage(imageId);
      setImages(prev => prev.filter(img => img.id !== imageId));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Delete failed';
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      await fileService.setPrimaryProductImage(imageId);
      setImages(prev => 
        prev.map(img => ({
          ...img,
          isPrimary: img.id === imageId
        }))
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to set primary image';
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    }
  };

  const getImageUrl = (image: ProductImageUpload, size: 'thumbnail' | 'medium' | 'large' | 'original' = 'medium') => {
    return fileService.getFileUrl(image.paths[size]);
  };

  const maxFiles = type === 'avatar' ? 1 : Math.max(0, maxImages - images.length);
  const maxSizeBytes = type === 'avatar' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Existing Images */}
      {type === 'product' && images.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Current Images</h3>
          
          {loadingImages ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map((image) => (
                <div key={image.id} className="relative group">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={getImageUrl(image, 'medium')}
                      alt={image.originalName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {image.isPrimary && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                      Primary
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gray-900/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
                    {!image.isPrimary && (
                      <Button
                        size="sm"
                        variant="info"
                        onClick={() => handleSetPrimary(image.id)}
                      >
                        Set Primary
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteImage(image.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload New Images */}
      {maxFiles > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            {type === 'avatar' ? 'Upload Avatar' : 'Add New Images'}
          </h3>
          
          <FileUpload
            onFileSelect={handleFileSelect}
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple={type !== 'avatar'}
            maxFiles={maxFiles}
            maxSizeBytes={maxSizeBytes}
            disabled={uploading}
            uploadType="image"
            showPreview={true}
          />

          {/* Primary Selection for Product Images */}
          {type === 'product' && selectedImages.length > 1 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">Set Primary Image</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {selectedImages.map((imageWithPrimary, index) => (
                  <div key={index} className="relative">
                    <div 
                      className={`aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer border-2 transition-colors ${
                        imageWithPrimary.isPrimary ? 'border-blue-500' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setPrimaryImage(index)}
                    >
                      <img
                        src={URL.createObjectURL(imageWithPrimary.file)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {imageWithPrimary.isPrimary && (
                      <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                        Primary
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <input
                        type="radio"
                        name="primary-image"
                        checked={imageWithPrimary.isPrimary}
                        onChange={() => setPrimaryImage(index)}
                        className="h-4 w-4 text-blue-600"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedImages.length > 0 && (
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setSelectedImages([])}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpload}
                loading={uploading}
                disabled={selectedImages.length === 0}
              >
                Upload {selectedImages.length} {selectedImages.length === 1 ? 'Image' : 'Images'}
              </Button>
            </div>
          )}
        </div>
      )}

      {maxFiles === 0 && type === 'product' && (
        <div className="text-center py-8 text-gray-500">
          <p>Maximum number of images ({maxImages}) reached.</p>
          <p className="text-sm">Delete some existing images to upload new ones.</p>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;