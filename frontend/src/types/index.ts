// Re-export all types from other modules
export * from './auth';

// Common API response types
export interface BaseStats {
  totalUsers?: number;
  totalProducts?: number;
  totalOrders?: number;
  totalCategories?: number;
  lowStockProducts?: number;
  pendingOrders?: number;
  monthlyRevenue?: number;
  totalRevenue?: number;
  averageOrderValue?: number;
}

export interface ProductStats extends BaseStats {
  outOfStockProducts?: number;
  activeProducts?: number;
  inactiveProducts?: number;
  topCategories?: CategoryStat[];
  stockDistribution?: StockDistribution[];
}

export interface OrderStats extends BaseStats {
  completedOrders?: number;
  cancelledOrders?: number;
  recent?: OrderSummary[];
  topProducts?: ProductStat[];
  revenueByMonth?: MonthlyRevenue[];
}

export interface UserStats extends BaseStats {
  activeUsers?: number;
  newUsersThisMonth?: number;
  usersByRole?: RoleStat[];
}

export interface SystemHealth {
  status: string;
  database: string;
  uptime: string;
  memoryUsage: number;
  diskUsage: number;
  components?: HealthComponent[];
  summary?: {
    uptime: string;
    memoryUsage: number;
    diskUsage: number;
  };
}

export interface HealthComponent {
  component: string;
  status: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  lowStockProducts: number;
  pendingOrders: number;
  monthlyRevenue: number;
  recentOrders: OrderSummary[];
  topProducts: ProductStat[];
}

// Detailed stat interfaces
export interface CategoryStat {
  id: string;
  name: string;
  count: number;
}

export interface StockDistribution {
  range: string;
  count: number;
}

export interface OrderSummary {
  id: string;
  orderNumber?: string;
  totalAmount: number;
  status: string;
  user?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

export interface ProductStat {
  id: string;
  name: string;
  sku: string;
  totalSold?: number;
  revenue?: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export interface RoleStat {
  role: string;
  count: number;
}

// Form data interfaces
export interface FormData {
  [key: string]: string | number | boolean | File | undefined;
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

// Table column interface
export interface TableColumn<T = Record<string, unknown>> {
  key: keyof T;
  title: string;
  render?: (value: T[keyof T], record: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

// Error interfaces
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Component prop interfaces
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface LineChartDataPoint {
  name: string;
  [key: string]: string | number;
}