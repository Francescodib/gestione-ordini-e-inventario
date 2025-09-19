# 📁 **FILE UPLOAD API DOCUMENTATION**

## 📋 **Panoramica**

L'API File Upload fornisce un sistema completo per la gestione del caricamento, elaborazione e servizio di file nel sistema di gestione ordini e inventario. Supporta immagini di prodotti, avatar utenti e documenti con elaborazione automatica delle immagini e controlli di sicurezza.

### **🔧 Caratteristiche Principali**

- **Upload Immagini Prodotti**: Multiple sizes con processing automatico
- **Avatar Utenti**: Processing automatico in diverse dimensioni
- **Upload Documenti**: Supporto per vari formati di file
- **Static File Serving**: Serving ottimizzato con caching
- **Image Processing**: Resize automatico e ottimizzazione qualità
- **Security**: Validazione file type, size limits, permission controls
- **Storage Management**: Organizzazione gerarchica dei file
- **Cleanup Tools**: Rimozione automatica file orfani

---

## 🗂️ **STRUTTURA FILE SYSTEM**

### **Directory Organization:**
```
uploads/
├── products/
│   └── {productId}/
│       ├── {filename}_thumb.jpg    (300x300, 80% quality)
│       ├── {filename}_medium.jpg   (600x600, 85% quality)
│       ├── {filename}_large.jpg    (1200x1200, 90% quality)
│       └── {filename}_original.jpg (original size)
├── avatars/
│   └── {userId}/
│       ├── {filename}_small.jpg    (64x64, 80% quality)
│       ├── {filename}_medium.jpg   (128x128, 85% quality)
│       └── {filename}_large.jpg    (256x256, 90% quality)
├── documents/
│   └── {filename}                  (original format)
└── temp/
    └── {temporary files}
```

### **File Naming Convention:**
- **Products**: `product_{uuid}.{ext}`
- **Avatars**: `avatar_{uuid}.{ext}`
- **Documents**: `doc_{uuid}.{ext}`

---

## 🖼️ **PRODUCT IMAGES API**

### **POST /api/files/products/:productId/images** 🔒
**Upload product images (Admin/Manager only)**

#### **Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

#### **Form Data:**
```typescript
{
  images: File[];           // Array di immagini (max 5)
  isPrimary?: string;       // JSON array di boolean "[true, false, ...]"
}
```

#### **File Constraints:**
- **Max Size**: 5MB per file
- **Max Count**: 5 files per request
- **Allowed Types**: JPEG, JPG, PNG, WebP
- **Processing**: Auto-resize in 4 sizes (thumb, medium, large, original)

#### **Response:**
```typescript
{
  success: boolean;
  message: string;
  data: ProductImageUpload[];
}

interface ProductImageUpload {
  id: string;
  productId: string;
  filename: string;
  originalName: string;
  paths: {
    thumbnail: string;
    medium: string;
    large: string;
    original: string;
  };
  urls: {
    thumbnail: string;
    medium: string;
    large: string;
    original: string;
  };
  isPrimary: boolean;
  sortOrder: number;
  createdAt: Date;
}
```

#### **Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "images=@product1.jpg" \
  -F "images=@product2.jpg" \
  -F "isPrimary=[true, false]" \
  "http://localhost:3000/api/files/products/{productId}/images"
```

### **GET /api/files/products/:productId/images**
**Get product images (Public)**

#### **Response:**
```typescript
{
  success: boolean;
  data: ProductImageUpload[];
}
```

#### **Example:**
```bash
curl "http://localhost:3000/api/files/products/{productId}/images"
```

### **DELETE /api/files/products/images/:imageId** 🔒
**Delete product image (Admin/Manager only)**

#### **Headers:**
```
Authorization: Bearer <token>
```

#### **Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

#### **Example:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/files/products/images/{imageId}"
```

### **PUT /api/files/products/images/:imageId/primary** 🔒
**Set image as primary (Admin/Manager only)**

#### **Headers:**
```
Authorization: Bearer <token>
```

#### **Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

#### **Example:**
```bash
curl -X PUT \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/files/products/images/{imageId}/primary"
```

---

## 👤 **AVATAR UPLOAD API**

### **POST /api/files/users/:userId/avatar** 🔒
**Upload user avatar (Self or Admin)**

#### **Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

#### **Form Data:**
```typescript
{
  avatar: File;             // Single avatar image
}
```

#### **File Constraints:**
- **Max Size**: 2MB
- **Max Count**: 1 file
- **Allowed Types**: JPEG, JPG, PNG
- **Processing**: Auto-resize in 3 sizes (small, medium, large)

#### **Permissions:**
- **Self**: Users can upload their own avatar
- **Admin**: Can upload avatar for any user

#### **Response:**
```typescript
{
  success: boolean;
  message: string;
  data: AvatarUpload;
}

interface AvatarUpload {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  paths: {
    small: string;
    medium: string;
    large: string;
  };
  urls: {
    small: string;
    medium: string;
    large: string;
  };
  createdAt: Date;
}
```

#### **Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "avatar=@avatar.jpg" \
  "http://localhost:3000/api/files/users/{userId}/avatar"
```

### **GET /api/files/users/:userId/avatar**
**Get user avatar (Public)**

#### **Response:**
```typescript
{
  success: boolean;
  data: AvatarUpload | null;
}
```

#### **Example:**
```bash
curl "http://localhost:3000/api/files/users/{userId}/avatar"
```

### **DELETE /api/files/users/:userId/avatar** 🔒
**Delete user avatar (Self or Admin)**

#### **Headers:**
```
Authorization: Bearer <token>
```

#### **Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

#### **Example:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/files/users/{userId}/avatar"
```

---

## 📄 **DOCUMENT UPLOAD API**

### **POST /api/files/documents** 🔒
**Upload documents (Authenticated users)**

#### **Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

#### **Form Data:**
```typescript
{
  documents: File[];        // Array di documenti (max 3)
  entityId?: string;        // ID entità correlata
  entityType?: string;      // Tipo entità ('product', 'user', 'order', etc.)
  description?: string;     // Descrizione documento
}
```

#### **File Constraints:**
- **Max Size**: 10MB per file
- **Max Count**: 3 files per request
- **Allowed Types**: PDF, TXT, DOC, DOCX

#### **Response:**
```typescript
{
  success: boolean;
  message: string;
  data: UploadedFile[];
}

interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
  type: FileType;
  entityId?: string;
  entityType?: EntityType;
  createdAt: Date;
  updatedAt: Date;
}
```

#### **Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "documents=@manual.pdf" \
  -F "entityId=product123" \
  -F "entityType=product" \
  -F "description=Product manual" \
  "http://localhost:3000/api/files/documents"
```

### **GET /api/files/documents** 🔒
**Get documents by entity (Authenticated users)**

#### **Headers:**
```
Authorization: Bearer <token>
```

#### **Query Parameters:**
```typescript
{
  entityId: string;         // ID entità (required)
  entityType: string;       // Tipo entità (required)
}
```

#### **Response:**
```typescript
{
  success: boolean;
  data: UploadedFile[];
}
```

#### **Example:**
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/files/documents?entityId=product123&entityType=product"
```

### **DELETE /api/files/documents/:fileId** 🔒
**Delete document (Admin/Manager only)**

#### **Headers:**
```
Authorization: Bearer <token>
```

#### **Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

#### **Example:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/files/documents/{fileId}"
```

---

## 📊 **FILE MANAGEMENT API**

### **GET /api/files/stats** 🔒
**Get file upload statistics (Admin only)**

#### **Headers:**
```
Authorization: Bearer <token>
```

#### **Response:**
```typescript
{
  success: boolean;
  data: {
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
    recentUploads: number;     // Last 24h
    config: {
      maxFileSizes: {
        image: number;
        document: number;
        avatar: number;
      };
      allowedTypes: {
        image: string[];
        document: string[];
        avatar: string[];
      };
      uploadDirectories: Record<string, string>;
    };
  };
}
```

#### **Example:**
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/files/stats"
```

### **POST /api/files/cleanup** 🔒
**Cleanup orphaned files (Admin only)**

#### **Headers:**
```
Authorization: Bearer <token>
```

#### **Response:**
```typescript
{
  success: boolean;
  message: string;
  data: {
    deletedCount: number;
  };
}
```

#### **Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/files/cleanup"
```

---

## 🌐 **STATIC FILE SERVING**

### **GET /api/files/uploads/*path**
**Serve uploaded files (Public)**

#### **Features:**
- **Caching**: 1 day cache with ETag support
- **Security**: Serves only from upload directories
- **Performance**: Express static middleware optimized
- **MIME Detection**: Automatic content-type detection

#### **URL Structure:**
```
/api/files/uploads/products/{productId}/{filename}
/api/files/uploads/avatars/{userId}/{filename}
/api/files/uploads/documents/{filename}
```

#### **Examples:**
```bash
# Product image (medium size)
curl "http://localhost:3000/api/files/uploads/products/prod123/product_uuid_medium.jpg"

# User avatar (large size)
curl "http://localhost:3000/api/files/uploads/avatars/user456/avatar_uuid_large.jpg"

# Document
curl "http://localhost:3000/api/files/uploads/documents/doc_uuid.pdf"
```

---

## 🔧 **HEALTH CHECK**

### **GET /api/files/health**
**Check file upload system health (Public)**

#### **Response:**
```typescript
{
  success: boolean;
  message: string;
  data: {
    directories: Record<string, boolean>;  // Directory accessibility
    config: {
      maxFileSizes: Record<string, number>;
      allowedTypes: Record<string, string[]>;
    };
  };
}
```

#### **Health Checks:**
- ✅ Upload directories exist and writable
- ✅ File size configurations valid
- ✅ File type restrictions active
- ✅ Image processing system operational

#### **Example:**
```bash
curl "http://localhost:3000/api/files/health"
```

---

## 🔒 **SECURITY & PERMISSIONS**

### **File Type Validation:**
```typescript
const allowedTypes = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  document: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  avatar: ['image/jpeg', 'image/jpg', 'image/png']
};
```

### **Size Limits:**
```typescript
const maxFileSize = {
  image: 5 * 1024 * 1024,      // 5MB
  document: 10 * 1024 * 1024,  // 10MB
  avatar: 2 * 1024 * 1024      // 2MB
};
```

### **Access Control:**
- **Public**: Static file serving, health check
- **Authenticated**: Document upload, own avatar management
- **Admin/Manager**: Product images, delete operations, statistics
- **Admin Only**: User avatar management (others), cleanup operations

### **File System Security:**
- **Path Traversal Protection**: No access outside upload directories
- **File Extension Validation**: MIME type verification
- **Unique Naming**: UUID-based filenames prevent conflicts
- **Automatic Cleanup**: Orphaned file detection and removal

---

## 🚀 **IMAGE PROCESSING PIPELINE**

### **Product Images Processing:**
1. **Upload**: Receive multipart file
2. **Validation**: Type, size, count checks
3. **Processing**: Generate 4 sizes in parallel
   - Thumbnail: 300x300px, 80% quality
   - Medium: 600x600px, 85% quality
   - Large: 1200x1200px, 90% quality
   - Original: Unchanged size, stored as backup
4. **Storage**: Organized by product ID
5. **Database**: Store paths and metadata
6. **URLs**: Generate accessible URLs

### **Avatar Processing:**
1. **Upload**: Single avatar file
2. **Validation**: Type, size checks
3. **Processing**: Generate 3 sizes
   - Small: 64x64px, 80% quality
   - Medium: 128x128px, 85% quality
   - Large: 256x256px, 90% quality
4. **Cleanup**: Remove old avatar if exists
5. **Update**: User profile avatar URL

### **Processing Configuration:**
```typescript
const imageProcessing = {
  product: {
    thumbnail: { width: 300, height: 300, quality: 80 },
    medium: { width: 600, height: 600, quality: 85 },
    large: { width: 1200, height: 1200, quality: 90 }
  },
  avatar: {
    small: { width: 64, height: 64, quality: 80 },
    medium: { width: 128, height: 128, quality: 85 },
    large: { width: 256, height: 256, quality: 90 }
  }
};
```

---

## 📈 **PERFORMANCE OPTIMIZATION**

### **Caching Strategy:**
- **Static Files**: 1 day browser cache with ETag
- **Database Queries**: Optimized with proper indexes
- **Image Processing**: Parallel processing for multiple sizes
- **Memory Management**: Streaming uploads, buffer reuse

### **Storage Optimization:**
- **Compression**: JPEG optimization with quality control
- **Format Conversion**: Auto-convert to JPEG for consistency
- **Size Variants**: Multiple sizes for responsive delivery
- **Cleanup**: Automatic orphaned file removal

### **Upload Optimization:**
- **Memory Storage**: In-memory processing for faster response
- **Parallel Processing**: Multiple images processed simultaneously
- **Progress Tracking**: Request logging for monitoring
- **Error Recovery**: Graceful handling of processing failures

---

## 🚨 **ERROR HANDLING**

### **Common Errors:**

#### **400 - Bad Request:**
```typescript
{
  success: false,
  message: "No images provided"
}

{
  success: false,
  message: "Invalid file type. Allowed types: image/jpeg, image/png"
}
```

#### **413 - Payload Too Large:**
```typescript
{
  success: false,
  message: "File too large. Maximum size: 5MB"
}
```

#### **403 - Forbidden:**
```typescript
{
  success: false,
  message: "Insufficient permissions to upload product images"
}
```

#### **404 - Not Found:**
```typescript
{
  success: false,
  message: "Product with ID xyz not found"
}
```

#### **500 - Internal Server Error:**
```typescript
{
  success: false,
  message: "Failed to process image",
  error: "Sharp processing error"
}
```

---

## 🔧 **CONFIGURATION**

### **Environment Variables:**
```bash
# Upload Configuration (optional, defaults shown)
MAX_FILE_SIZE_IMAGE=5242880      # 5MB
MAX_FILE_SIZE_DOCUMENT=10485760  # 10MB
MAX_FILE_SIZE_AVATAR=2097152     # 2MB
UPLOAD_DIR=uploads               # Upload base directory
```

### **System Requirements:**
- **Sharp**: Image processing library
- **Multer**: File upload handling
- **Node.js**: v16+ for optimal performance
- **Disk Space**: Adequate storage for file uploads
- **Memory**: Sufficient RAM for image processing

---

## 🔄 **USAGE EXAMPLES**

### **Frontend Integration:**

#### **Product Image Upload:**
```javascript
const uploadProductImages = async (productId, files, primaryFlags) => {
  const formData = new FormData();
  
  files.forEach(file => {
    formData.append('images', file);
  });
  
  formData.append('isPrimary', JSON.stringify(primaryFlags));
  
  const response = await fetch(`/api/files/products/${productId}/images`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return response.json();
};
```

#### **Avatar Upload:**
```javascript
const uploadAvatar = async (userId, file) => {
  const formData = new FormData();
  formData.append('avatar', file);
  
  const response = await fetch(`/api/files/users/${userId}/avatar`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return response.json();
};
```

#### **Responsive Image Display:**
```javascript
const ProductImage = ({ product, size = 'medium' }) => {
  const [images, setImages] = useState([]);
  
  useEffect(() => {
    fetch(`/api/files/products/${product.id}/images`)
      .then(res => res.json())
      .then(data => setImages(data.data));
  }, [product.id]);
  
  const primaryImage = images.find(img => img.isPrimary) || images[0];
  
  return primaryImage ? (
    <img 
      src={primaryImage.urls[size]} 
      alt={product.name}
      loading="lazy"
    />
  ) : (
    <div className="no-image">No image available</div>
  );
};
```

---

## 📝 **CHANGELOG**

### **v1.0.0** - 2025-09-13
- ✨ Initial release
- ✨ Product image upload with multi-size processing
- ✨ User avatar upload and management
- ✨ Document upload system
- ✨ Static file serving with caching
- ✨ Image processing pipeline with Sharp
- ✨ Security controls and validation
- ✨ File cleanup and management tools
- ✨ Health monitoring system
- ✨ Comprehensive error handling

---

## 🤝 **SUPPORTO**

Per supporto tecnico o segnalazione di bug:
- **Email**: support@quickstock.com  
- **Documentation**: `/api/docs`  
- **Health Check**: `/api/files/health`  
- **File Stats**: `/api/files/stats` (Admin only)
