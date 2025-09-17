import React, { useState, useCallback, useEffect } from 'react';
import { fileService } from '../services/api';
import type { UploadedFile } from '../services/api';
import FileUpload from './FileUpload';
import Button from './Button';
import Input from './Input';
import LoadingSpinner from './LoadingSpinner';

interface DocumentUploadProps {
  entityId?: string;
  entityType?: string;
  onUploadSuccess?: (result: UploadedFile[]) => void;
  onUploadError?: (error: string) => void;
  showExisting?: boolean;
  className?: string;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  entityId,
  entityType,
  onUploadSuccess,
  onUploadError,
  showExisting = true,
  className = ''
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [existingFiles, setExistingFiles] = useState<UploadedFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  useEffect(() => {
    if (showExisting && entityId && entityType) {
      loadExistingFiles();
    }
  }, [entityId, entityType, showExisting]);

  const loadExistingFiles = async () => {
    if (!entityId || !entityType) return;
    
    setLoadingFiles(true);
    try {
      const response = await fileService.getDocuments(entityId, entityType);
      if (response.success && response.data) {
        setExistingFiles(response.data);
      }
    } catch (error) {
      console.error('Failed to load existing files:', error);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleFileSelect = useCallback((files: File[]) => {
    setSelectedFiles(files);
  }, []);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      const response = await fileService.uploadDocuments(
        selectedFiles,
        entityId,
        entityType,
        description
      );
      
      if (response.success && response.data) {
        setExistingFiles(prev => [...prev, ...(response.data || [])]);
        setSelectedFiles([]);
        setDescription('');
        
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

  const handleDeleteFile = async (fileId: string) => {
    try {
      await fileService.deleteDocument(fileId);
      setExistingFiles(prev => prev.filter(file => file.id !== fileId));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Delete failed';
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.includes('pdf')) {
      return (
        <svg className="h-8 w-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    } else if (mimetype.includes('word')) {
      return (
        <svg className="h-8 w-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    } else {
      return (
        <svg className="h-8 w-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    }
  };

  const downloadFile = (file: UploadedFile) => {
    const url = fileService.getFileUrl(file.path);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Existing Files */}
      {showExisting && existingFiles.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Existing Documents</h3>
          
          {loadingFiles ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-3">
              {existingFiles.map((file) => (
                <div key={file.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
                  <div className="flex-shrink-0">
                    {getFileIcon(file.mimetype)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.originalName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex-shrink-0 flex space-x-2">
                    <Button
                      variant="info"
                      size="sm"
                      onClick={() => downloadFile(file)}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteFile(file.id)}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload New Documents */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Upload New Documents</h3>
        
        <FileUpload
          onFileSelect={handleFileSelect}
          accept="application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          multiple={true}
          maxFiles={3}
          maxSizeBytes={10 * 1024 * 1024} // 10MB
          disabled={uploading}
          uploadType="document"
          showPreview={false}
        />

        {selectedFiles.length > 0 && (
          <div className="space-y-4">
            <Input
              label="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description for these documents..."
              disabled={uploading}
            />

            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedFiles([]);
                  setDescription('');
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpload}
                loading={uploading}
                disabled={selectedFiles.length === 0}
              >
                Upload {selectedFiles.length} {selectedFiles.length === 1 ? 'Document' : 'Documents'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUpload;