import React, { useState, useCallback, useEffect } from 'react';
import { fileService } from '../services/api';
import type { AvatarUpload as AvatarUploadType } from '../services/api';
import FileUpload from './FileUpload';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string;
  onUploadSuccess?: (result: AvatarUploadType) => void;
  onUploadError?: (error: string) => void;
  onDeleteSuccess?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showUploadButton?: boolean;
  allowDelete?: boolean;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  userId,
  currentAvatarUrl,
  onUploadSuccess,
  onUploadError,
  onDeleteSuccess,
  size = 'lg',
  className = '',
  showUploadButton = true,
  allowDelete = true
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [avatar, setAvatar] = useState<AvatarUploadType | null>(null);
  const [loading, setLoading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48'
  };

  useEffect(() => {
    loadCurrentAvatar();
  }, [userId]);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  const loadCurrentAvatar = async () => {
    setLoading(true);
    try {
      const response = await fileService.getUserAvatar(userId);
      if (response.success && response.data) {
        setAvatar(response.data);
      }
    } catch (error) {
      console.error('Failed to load avatar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = useCallback((files: File[]) => {
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const response = await fileService.uploadAvatar(userId, selectedFile);
      
      if (response.success && response.data) {
        setAvatar(response.data);
        setSelectedFile(null);
        setShowUploader(false);
        
        if (onUploadSuccess) {
          onUploadSuccess(response.data);
        }
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

  const handleDelete = async () => {
    if (!avatar) return;

    setDeleting(true);
    try {
      await fileService.deleteUserAvatar(userId);
      setAvatar(null);
      
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Delete failed';
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setDeleting(false);
    }
  };

  const getAvatarUrl = (size: 'small' | 'medium' | 'large' = 'large') => {
    if (avatar?.urls?.[size]) {
      return fileService.getFileUrl(avatar.paths[size]);
    }
    return currentAvatarUrl;
  };

  const getInitials = () => {
    return '?';
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    setShowUploader(false);
  };

  if (loading) {
    return (
      <div className={`${sizeClasses[size]} ${className} flex items-center justify-center bg-gray-100 rounded-full`}>
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Avatar Display */}
      <div className="flex items-center space-x-4">
        <div className={`${sizeClasses[size]} relative`}>
          {previewUrl || getAvatarUrl() ? (
            <img
              src={previewUrl || getAvatarUrl()}
              alt="Avatar"
              className="w-full h-full object-cover rounded-full border-2 border-gray-200"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 rounded-full border-2 border-gray-200 flex items-center justify-center text-white font-semibold text-lg">
              {getInitials()}
            </div>
          )}
          
          {selectedFile && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-medium">Preview</span>
            </div>
          )}
        </div>

        {showUploadButton && (
          <div className="space-y-2">
            {!showUploader && (
              <div className="space-x-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowUploader(true)}
                  disabled={uploading || deleting}
                >
                  {avatar ? 'Change Avatar' : 'Upload Avatar'}
                </Button>
                
                {avatar && allowDelete && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDelete}
                    loading={deleting}
                    disabled={uploading}
                  >
                    Remove
                  </Button>
                )}
              </div>
            )}

            {selectedFile && (
              <div className="space-x-2">
                <Button
                  variant="success"
                  size="sm"
                  onClick={handleUpload}
                  loading={uploading}
                  disabled={!selectedFile}
                >
                  Save
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={cancelUpload}
                  disabled={uploading}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* File Upload Component */}
      {showUploader && !selectedFile && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <FileUpload
            onFileSelect={handleFileSelect}
            accept="image/jpeg,image/jpg,image/png"
            multiple={false}
            maxFiles={1}
            maxSizeBytes={2 * 1024 * 1024} // 2MB
            disabled={uploading}
            uploadType="avatar"
            showPreview={false}
          >
            <div className="text-center py-8">
              <div className="mx-auto flex justify-center">
                <svg
                  className="h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-900">
                  Drop your avatar here, or{' '}
                  <span className="text-blue-600 hover:text-blue-500">browse</span>
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  PNG, JPG up to 2MB
                </p>
              </div>
            </div>
          </FileUpload>
        </div>
      )}

      {/* File Info */}
      {avatar && !showUploader && (
        <div className="text-xs text-gray-500">
          <p>Uploaded: {new Date(avatar.createdAt).toLocaleDateString()}</p>
          <p>Original: {avatar.originalName}</p>
        </div>
      )}
    </div>
  );
};

export default AvatarUpload;