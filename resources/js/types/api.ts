// API Types for Costeno Sales V2
// Dashboard API integration types

export interface DashboardDataRequest {
  start_date: string; // Format: YYYY-MM-DD
  end_date: string;   // Format: YYYY-MM-DD
}

export interface DashboardDataResponse {
  success: boolean;
  data: DashboardData;
  message?: string;
  timestamp?: string;
}

export interface DashboardData {
  // Sales metrics
  total_sales: number;
  total_revenue: number;
  average_order_value: number;
  sales_count: number;
  
  // Customer metrics
  total_customers: number;
  new_customers: number;
  returning_customers: number;
  
  // Product metrics
  products_sold: number;
  top_selling_products: ProductSales[];
  low_stock_products: LowStockProduct[];
  
  // Financial metrics
  gross_profit: number;
  net_profit: number;
  profit_margin: number;
  
  // Time-based metrics
  daily_sales: DailySales[];
  monthly_comparison: MonthlyComparison;
  
  // Additional metrics
  pending_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  
  // Branch data
  sucursales?: BranchData[];
}

export interface BranchData {
  id: string;
  nombre: string;
  ventas: number;
  percentageChange?: number;
  abiertas?: number;
  cerradas?: number;
  promedio?: number;
  totalTickets?: number;
}

export interface ProductSales {
  product_id: number;
  product_name: string;
  quantity_sold: number;
  revenue: number;
  profit: number;
}

export interface LowStockProduct {
  product_id: number;
  product_name: string;
  current_stock: number;
  minimum_stock: number;
  status: 'low' | 'critical' | 'out_of_stock';
}

export interface DailySales {
  date: string; // YYYY-MM-DD
  sales: number;
  revenue: number;
  orders: number;
}

export interface MonthlyComparison {
  current_month: {
    sales: number;
    revenue: number;
    orders: number;
  };
  previous_month: {
    sales: number;
    revenue: number;
    orders: number;
  };
  growth_percentage: {
    sales: number;
    revenue: number;
    orders: number;
  };
}

// API Error types
export interface ApiError {
  success: false;
  message: string;
  error_code?: string;
  details?: Record<string, unknown>;
}

// Hook configuration types
export interface UseDashboardDataOptions {
  enabled?: boolean;
  refetchInterval?: number;
  refetchOnWindowFocus?: boolean;
  retryDelay?: number;
  maxRetries?: number;
}

// Date range utilities
export type PredefinedPeriod = 
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_month'
  | 'last_month'
  | 'this_year';

export interface DateRange {
  start_date: string;
  end_date: string;
}

// API Client types
export interface ApiClientConfig {
  baseUrl: string;
  authToken: string;
  timeout?: number;
  retries?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// HTTP Request options
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  signal?: AbortSignal;
}