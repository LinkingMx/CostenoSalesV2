// API Services Index - Costeno Sales V2
// Central export point for all API services and utilities

// API Client
export { default as apiClient } from './client';

// Dashboard API Service
export { default as dashboardApiService } from './dashboard';

// Re-export types for convenience
export type {
  // Core API types
  DashboardDataRequest,
  DashboardDataResponse,
  DashboardData,
  ApiError,
  ApiResponse,
  ApiClientConfig,
  RequestOptions,
  
  // Dashboard-specific types
  ProductSales,
  LowStockProduct,
  DailySales,
  MonthlyComparison,
  
  // Utility types
  DateRange,
  PredefinedPeriod,
  UseDashboardDataOptions,
} from '@/types/api';