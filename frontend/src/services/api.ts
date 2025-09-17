import axios from 'axios';
import type { LoginRequest, RegisterRequest, AuthResponse, User } from '../types/auth';

// Export User type for external use
export type { User };

// Additional types for comprehensive API
export interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  category?: Category;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  maxStock?: number;
  weight?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' | 'OUT_OF_STOCK';
  images: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  slug: string;
  parentId?: string;
  isActive: boolean;
  children?: Category[];
  products?: Product[];
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  shippingAddress: Record<string, unknown>;
  items: OrderItem[];
  user?: User;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  totalPrice: number;
  product?: Product;
}

export interface SearchFilters {
  search?: string;
  categoryId?: number;
  status?: string;
  paymentStatus?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  lowStock?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  tags?: string;
  supplier?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  minTotal?: number;
  maxTotal?: number;
  hasTracking?: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor per aggiungere il token alle richieste
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor per gestire le risposte e gli errori
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if it's a 401 error but NOT on login/register endpoints
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/login') || url.includes('/register');
      
      if (!isAuthEndpoint) {
        // Token scaduto o non valido - solo per endpoint protetti
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Use history API instead of window.location to avoid hard refresh
        if (window.location.pathname !== '/login') {
          window.history.pushState({}, '', '/login');
          window.location.reload();
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post('/users/login', credentials);
    return response.data;
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post('/users/register', userData);
    return response.data;
  },

  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await api.get('/users/me');
    return response.data;
  },

  async refreshToken(token: string): Promise<AuthResponse> {
    const response = await api.post('/users/refresh', { token });
    return response.data;
  },

  async getAllUsers(params?: PaginationParams): Promise<ApiResponse<User[]>> {
    const response = await api.get('/users', { params });
    return response.data;
  },

  async getUserById(id: string): Promise<ApiResponse<User>> {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  async updateUser(id: string, userData: Partial<User>): Promise<ApiResponse<User>> {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  async getUserStats(): Promise<ApiResponse<import('../types').UserStats>> {
    const response = await api.get('/users/stats');
    return response.data;
  },

  async deleteUser(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  async toggleUserStatus(id: string, isActive: boolean): Promise<ApiResponse<User>> {
    const response = await api.put(`/users/${id}`, { isActive });
    return response.data;
  },

  async updateUserRole(id: string, role: 'USER' | 'MANAGER' | 'ADMIN'): Promise<ApiResponse<User>> {
    const response = await api.put(`/users/${id}`, { role });
    return response.data;
  },

  async sendPasswordReset(email: string): Promise<ApiResponse<void>> {
    const response = await api.post('/users/reset-password', { email });
    return response.data;
  }
};

export const productService = {
  async getAllProducts(params?: PaginationParams & SearchFilters): Promise<ApiResponse<Product[]>> {
    const response = await api.get('/products', { params });
    return response.data;
  },

  async getProductById(id: string): Promise<ApiResponse<Product>> {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  async createProduct(productData: Partial<Product>): Promise<ApiResponse<Product>> {
    const response = await api.post('/products', productData);
    return response.data;
  },

  async updateProduct(id: string, productData: Partial<Product>): Promise<ApiResponse<Product>> {
    const response = await api.put(`/products/${id}`, productData);
    return response.data;
  },

  async deleteProduct(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  async updateStock(id: string, stockData: { quantity: number; operation: 'add' | 'subtract' }): Promise<ApiResponse<Product>> {
    const response = await api.post(`/products/${id}/stock`, stockData);
    return response.data;
  },

  async getProductStats(): Promise<ApiResponse<import('../types').ProductStats>> {
    const response = await api.get('/products/stats');
    return response.data;
  }
};

export const categoryService = {
  async getAllCategories(params?: PaginationParams): Promise<ApiResponse<Category[]>> {
    const response = await api.get('/categories', { params });
    return response.data;
  },

  async getCategoryById(id: string): Promise<ApiResponse<Category>> {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  async createCategory(categoryData: Partial<Category>): Promise<ApiResponse<Category>> {
    const response = await api.post('/categories', categoryData);
    return response.data;
  },

  async updateCategory(id: string, categoryData: Partial<Category>): Promise<ApiResponse<Category>> {
    const response = await api.put(`/categories/${id}`, categoryData);
    return response.data;
  },

  async deleteCategory(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },

  async getCategoryHierarchy(): Promise<ApiResponse<Category[]>> {
    const response = await api.get('/categories/hierarchy');
    return response.data;
  },

  async getCategoryStats(): Promise<ApiResponse<import('../types').BaseStats>> {
    const response = await api.get('/categories/stats');
    return response.data;
  }
};

export const orderService = {
  async getAllOrders(params?: PaginationParams & SearchFilters): Promise<ApiResponse<Order[]>> {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  async getOrderById(id: string): Promise<ApiResponse<Order>> {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  async createOrder(orderData: Partial<Order>): Promise<ApiResponse<Order>> {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  async updateOrder(id: string, orderData: Partial<Order>): Promise<ApiResponse<Order>> {
    const response = await api.put(`/orders/${id}`, orderData);
    return response.data;
  },

  async updateOrderStatus(id: string, status: Order['status']): Promise<ApiResponse<Order>> {
    const response = await api.put(`/orders/${id}/status`, { status });
    return response.data;
  },

  async getOrderStats(): Promise<ApiResponse<import('../types').OrderStats>> {
    const response = await api.get('/orders/stats');
    return response.data;
  }
};

export const searchService = {
  async searchProducts(query: string, filters?: SearchFilters): Promise<ApiResponse<Product[]>> {
    const params: Record<string, unknown> = { q: query.trim() };

    if (filters) {
      if (filters.categoryId !== undefined) {
        params.categoryIds = String(filters.categoryId);
      }
      if (filters.status) {
        params.status = filters.status;
      }
      if (filters.minPrice !== undefined) {
        params['price.min'] = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        params['price.max'] = filters.maxPrice;
      }
      if (filters.inStock !== undefined) {
        params.inStock = filters.inStock;
      }
      if (filters.sortBy) {
        params.sortBy = filters.sortBy;
      }
      if (filters.sortOrder) {
        params.sortOrder = filters.sortOrder;
      }
    }

    const response = await api.get('/search/products', { params });
    return response.data;
  },

  async searchOrders(query: string, filters?: SearchFilters): Promise<ApiResponse<Order[]>> {
    const params: Record<string, unknown> = { q: query.trim() };

    if (filters) {
      if (filters.status) {
        params.status = filters.status;
      }
      if (filters.dateFrom) {
        params['date.from'] = filters.dateFrom;
      }
      if (filters.dateTo) {
        params['date.to'] = filters.dateTo;
      }
    }

    const response = await api.get('/search/orders', { params });
    return response.data;
  },

  async searchCategories(query: string): Promise<ApiResponse<Category[]>> {
    const response = await api.get('/search/categories', { 
      params: { q: query.trim() } 
    });
    return response.data;
  },

  async globalSearch(query: string): Promise<ApiResponse<{products: Product[], orders: Order[], categories: Category[]}>> {
    const response = await api.get('/search', { 
      params: { q: query.trim() } 
    });
    return response.data;
  }
};

export const monitoringService = {
  async getSystemHealth(): Promise<ApiResponse<import('../types').SystemHealth>> {
    const response = await api.get('/monitoring/health');
    return response.data;
  },

  async getSystemMetrics(): Promise<ApiResponse<Record<string, unknown>>> {
    const response = await api.get('/monitoring/system');
    return response.data;
  },

  async getDashboardStats(): Promise<ApiResponse<import('../types').DashboardStats>> {
    const response = await api.get('/monitoring/dashboard');
    return response.data;
  }
};

export const backupService = {
  async getBackupStatus(): Promise<ApiResponse<{status: string, lastBackup?: string}>> {
    const response = await api.get('/backup/status');
    return response.data;
  },

  async createBackup(): Promise<ApiResponse<{backupId: string, timestamp: string}>> {
    const response = await api.post('/backup/create');
    return response.data;
  },

  async getBackupHistory(): Promise<ApiResponse<{backupId: string, timestamp: string, size: number}[]>> {
    const response = await api.get('/backup/history');
    return response.data;
  }
};

// File upload service
export const fileService = {
  async uploadFile(file: File, type: 'product' | 'avatar' | 'document'): Promise<ApiResponse<{fileId: string, url: string, thumbnails?: string[]}>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    const response = await api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async deleteFile(fileId: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/files/${fileId}`);
    return response.data;
  }
};

export default api;
