import React, { useState, useRef, useCallback } from 'react';
import Button from './Button';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSizeBytes?: number;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  showPreview?: boolean;
  uploadType?: 'image' | 'document' | 'avatar';
}

interface FileWithPreview {
  file: File;
  preview?: string;
  error?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = '*/*',
  multiple = true,
  maxFiles = 5,
  maxSizeBytes = 5 * 1024 * 1024, // 5MB default
  disabled = false,
  className = '',
  children,
  showPreview = true,
  uploadType = 'image'
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultAccept = {
    image: 'image/jpeg,image/jpg,image/png,image/webp',
    document: 'application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    avatar: 'image/jpeg,image/jpg,image/png'
  };

  const fileAccept = accept === '*/*' ? defaultAccept[uploadType] : accept;

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxSizeBytes) {
      return `File "${file.name}" is too large. Maximum size is ${formatFileSize(maxSizeBytes)}.`;
    }

    const allowedTypes = fileAccept.split(',').map(type => type.trim());
    if (!allowedTypes.includes(file.type)) {
      return `File "${file.name}" has an invalid type. Allowed types: ${allowedTypes.join(', ')}.`;
    }

    return null;
  }, [maxSizeBytes, fileAccept]);

  const processFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    if (!multiple && files.length > 1) {
      setError('Only one file is allowed.');
      return;
    }

    if (multiple && files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed.`);
      return;
    }

    setError('');
    const validFiles: FileWithPreview[] = [];
    
    for (const file of files) {
      const validationError = validateFile(file);
      
      if (validationError) {
        setError(validationError);
        return;
      }

      const fileWithPreview: FileWithPreview = { file };

      if (showPreview && file.type.startsWith('image/')) {
        try {
          const preview = await createImagePreview(file);
          fileWithPreview.preview = preview;
        } catch (err) {
          console.warn('Failed to create preview for', file.name);
        }
      }

      validFiles.push(fileWithPreview);
    }

    setSelectedFiles(validFiles);
    onFileSelect(validFiles.map(f => f.file));
  }, [multiple, maxFiles, validateFile, showPreview, onFileSelect]);

  const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, [disabled, processFiles]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  }, [processFiles]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const removeFile = useCallback((index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFileSelect(newFiles.map(f => f.file));
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [selectedFiles, onFileSelect]);

  const clearAll = useCallback(() => {
    setSelectedFiles([]);
    setError('');
    onFileSelect([]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileSelect]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUploadTypeText = () => {
    switch (uploadType) {
      case 'image': return 'images';
      case 'document': return 'documents';
      case 'avatar': return 'avatar image';
      default: return 'files';
    }
  };

  const baseClasses = 'relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer';
  const dragClasses = isDragOver 
    ? 'border-blue-500 bg-blue-50' 
    : error 
      ? 'border-red-300 bg-red-50' 
      : 'border-gray-300 hover:border-gray-400';
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        className={`${baseClasses} ${dragClasses} ${disabledClasses}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={fileAccept}
          multiple={multiple}
          onChange={handleFileInputChange}
          disabled={disabled}
        />
        
        <div className="text-center">
          {children || (
            <>
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
                <p className="text-lg font-medium text-gray-900">
                  Drop {getUploadTypeText()} here, or{' '}
                  <span className="text-blue-600 hover:text-blue-500">browse</span>
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {multiple ? `Up to ${maxFiles} files, ` : 'Single file, '}
                  max {formatFileSize(maxSizeBytes)} each
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Supported formats: {fileAccept.split(',').map(type => type.split('/')[1]).join(', ')}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
          {error}
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              Selected Files ({selectedFiles.length})
            </h4>
            <Button
              variant="secondary"
              size="sm"
              onClick={clearAll}
              className="text-xs"
            >
              Clear All
            </Button>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {selectedFiles.map((fileWithPreview, index) => (
              <div
                key={`${fileWithPreview.file.name}-${index}`}
                className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg border"
              >
                {fileWithPreview.preview && (
                  <div className="flex-shrink-0">
                    <img
                      src={fileWithPreview.preview}
                      alt="Preview"
                      className="h-12 w-12 object-cover rounded-md"
                    />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {fileWithPreview.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(fileWithPreview.file.size)} • {fileWithPreview.file.type}
                  </p>
                </div>
                
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="flex-shrink-0"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;