// Dashboard API Service for Costeno Sales V2
// Specialized service for fetching dashboard data

import { apiClient } from './client';
import type { 
  DashboardDataRequest, 
  DashboardDataResponse, 
  DateRange, 
  PredefinedPeriod,
  DashboardData 
} from '@/types/api';

class DashboardApiService {
  private readonly endpoint = '/api/main_dashboard_data';

  /**
   * Fetch dashboard data for a specific date range
   */
  async getDashboardData(request: DashboardDataRequest): Promise<DashboardData> {
    try {
      // Validate dates
      this.validateDateRange(request);

      const response = await apiClient.post<DashboardDataResponse>(
        this.endpoint,
        request
      );

      if (!response.success || !response.data) {
        throw new Error('Invalid response format from dashboard API');
      }

      return response.data.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch dashboard data: ${error.message}`);
      }
      throw new Error('Failed to fetch dashboard data: Unknown error');
    }
  }

  /**
   * Create date range from predefined period
   */
  createDateRange(period: PredefinedPeriod): DateRange {
    const today = new Date();
    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    };

    switch (period) {
      case 'today':
        return {
          start_date: formatDate(today),
          end_date: formatDate(today),
        };

      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return {
          start_date: formatDate(yesterday),
          end_date: formatDate(yesterday),
        };
      }

      case 'last_7_days': {
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        return {
          start_date: formatDate(weekAgo),
          end_date: formatDate(today),
        };
      }

      case 'last_30_days': {
        const monthAgo = new Date(today);
        monthAgo.setDate(today.getDate() - 30);
        return {
          start_date: formatDate(monthAgo),
          end_date: formatDate(today),
        };
      }

      case 'last_90_days': {
        const quarterAgo = new Date(today);
        quarterAgo.setDate(today.getDate() - 90);
        return {
          start_date: formatDate(quarterAgo),
          end_date: formatDate(today),
        };
      }

      case 'this_month': {
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          start_date: formatDate(firstDayOfMonth),
          end_date: formatDate(today),
        };
      }

      case 'last_month': {
        const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          start_date: formatDate(firstDayLastMonth),
          end_date: formatDate(lastDayLastMonth),
        };
      }

      case 'this_year': {
        const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
        return {
          start_date: formatDate(firstDayOfYear),
          end_date: formatDate(today),
        };
      }

      default:
        throw new Error(`Unsupported period: ${period}`);
    }
  }

  /**
   * Get dashboard data for predefined period
   */
  async getDashboardDataForPeriod(period: PredefinedPeriod): Promise<DashboardData> {
    const dateRange = this.createDateRange(period);
    return this.getDashboardData(dateRange);
  }

  /**
   * Get dashboard data for custom date range
   */
  async getDashboardDataForDateRange(
    startDate: string, 
    endDate: string
  ): Promise<DashboardData> {
    return this.getDashboardData({
      start_date: startDate,
      end_date: endDate,
    });
  }

  /**
   * Validate date range format and logic
   */
  private validateDateRange(request: DashboardDataRequest): void {
    const { start_date, end_date } = request;

    // Check date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start_date)) {
      throw new Error(`Invalid start_date format. Expected YYYY-MM-DD, got: ${start_date}`);
    }
    if (!dateRegex.test(end_date)) {
      throw new Error(`Invalid end_date format. Expected YYYY-MM-DD, got: ${end_date}`);
    }

    // Check if dates are valid
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);

    if (isNaN(startDateObj.getTime())) {
      throw new Error(`Invalid start_date: ${start_date}`);
    }
    if (isNaN(endDateObj.getTime())) {
      throw new Error(`Invalid end_date: ${end_date}`);
    }

    // Check date logic
    if (startDateObj > endDateObj) {
      throw new Error(`start_date (${start_date}) cannot be after end_date (${end_date})`);
    }

    // Check if date range is not too far in the future
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    if (startDateObj > today) {
      throw new Error(`start_date (${start_date}) cannot be in the future`);
    }
  }

  /**
   * Get available predefined periods
   */
  getAvailablePeriods(): Array<{ value: PredefinedPeriod; label: string }> {
    return [
      { value: 'today', label: 'Today' },
      { value: 'yesterday', label: 'Yesterday' },
      { value: 'last_7_days', label: 'Last 7 Days' },
      { value: 'last_30_days', label: 'Last 30 Days' },
      { value: 'last_90_days', label: 'Last 90 Days' },
      { value: 'this_month', label: 'This Month' },
      { value: 'last_month', label: 'Last Month' },
      { value: 'this_year', label: 'This Year' },
    ];
  }
}

// Export singleton instance
export const dashboardApiService = new DashboardApiService();
export default dashboardApiService;