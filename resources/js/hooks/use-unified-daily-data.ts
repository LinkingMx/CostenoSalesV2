import { useQuery } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import { chartApiService } from '@/services/chart-api';
import { HourData, HoursChartError, HoursChartApiResponse } from '@/types/chart-types';

/**
 * Main Dashboard Data Interface
 * Represents the core dashboard data structure from the API
 */
interface MainDashboardData {
    success: boolean;
    message: string;
    data: {
        sales: {
            total: number;
            subtotal: number;
        };
        cards: Record<string, {
            open_accounts: {
                total: number;
                money: number;
            };
            closed_ticket: {
                total: number;
                money: number;
            };
            average_ticket: number;
            percentage: {
                icon: string;
                qty: string;
            };
            date: string;
            store_id: number;
            brand?: string;
            region?: string;
            operational_address?: string;
            general_address?: string;
        }>;
    };
}

/**
 * Unified Daily Data Result Interface
 * Consolidates all daily data types for consistent consumption
 */
interface UnifiedDailyDataResult {
    // Main dashboard data
    dashboardData: MainDashboardData | null;
    dashboardComparisonData: MainDashboardData | null;
    dashboardPercentageChange: number | null;
    dashboardPreviousAmount: number | null;
    
    // Hours chart data
    hoursChartData: HourData[] | null;
    
    // Loading and error states
    isLoading: boolean;
    error: Error | null;
    
    // Refetch capabilities
    refetchDashboard: () => Promise<any>;
    refetchHours: () => Promise<void>;
    refetchAll: () => Promise<void>;
}

/**
 * Utility function to extract CSRF token from various sources
 * @returns {string} The CSRF token or empty string if not found
 */
function getCsrfToken(): string {
    let token = '';
    
    // Try meta tag first (most common in Laravel)
    const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
    if (meta?.content) {
        token = meta.content;
    }
    
    // Fallback to hidden input
    if (!token) {
        const tokenInput = document.querySelector('input[name="_token"]') as HTMLInputElement;
        if (tokenInput?.value) {
            token = tokenInput.value;
        }
    }
    
    // Fallback to cookie
    if (!token) {
        const cookieMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        if (cookieMatch) {
            token = decodeURIComponent(cookieMatch[1]);
        }
    }
    
    return token;
}

/**
 * Calculate the previous week's date for comparison purposes
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} Previous week's date in YYYY-MM-DD format
 */
function getPreviousWeekDate(dateString: string): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    // Validate date
    if (isNaN(date.getTime())) {
        console.warn('Invalid date provided to getPreviousWeekDate:', dateString);
        return '';
    }
    
    try {
        const previousWeek = new Date(date);
        previousWeek.setDate(date.getDate() - 7);
        return previousWeek.toISOString().split('T')[0];
    } catch (error) {
        console.warn('Error calculating previous week date:', error);
        return '';
    }
}

/**
 * Transform hours chart API response to chart data format
 * @param {HoursChartApiResponse} apiResponse - Raw API response
 * @returns {HourData[]} Transformed data for chart consumption
 */
function transformHoursApiData(apiResponse: HoursChartApiResponse): HourData[] {
    if (!apiResponse.success || !apiResponse.data) {
        return [];
    }

    // Get all date keys and sort them (oldest to newest)
    const dateKeys = Object.keys(apiResponse.data).sort();
    
    // Take the last 2 dates (most recent)
    const lastTwoDates = dateKeys.slice(-2);
    
    if (lastTwoDates.length < 2) {
        // If we only have one date, use it as current and set previous to 0
        const singleDate = lastTwoDates[0];
        const singleDateData = apiResponse.data[singleDate];
        
        return Object.entries(singleDateData).map(([hour, value]) => ({
            hour,
            current: value,
            previous: 0,
            timestamp: `${singleDate} ${hour}:00`
        }));
    }

    const [previousDate, currentDate] = lastTwoDates;
    const currentData = apiResponse.data[currentDate];
    const previousData = apiResponse.data[previousDate];

    // Use the order from the API data (which comes from the most recent date)
    const apiHours = Object.keys(currentData).length > 0 ? Object.keys(currentData) : Object.keys(previousData);
    
    // Get all unique hours from both datasets but maintain API order
    const allHours = new Set([...apiHours]);
    
    // Add any missing hours from previous data at the end
    Object.keys(previousData).forEach(hour => {
        if (!allHours.has(hour)) {
            allHours.add(hour);
        }
    });

    // Convert to array maintaining the original API order
    const sortedHours = Array.from(allHours);

    return sortedHours.map(hour => ({
        hour,
        current: currentData[hour] || 0,
        previous: previousData[hour] || 0,
        timestamp: `${currentDate} ${hour}:00`
    }));
}

/**
 * Unified hook for daily dashboard data
 * Consolidates dashboard data and hours chart data into a single hook
 * to eliminate duplicate API calls and provide consistent loading states
 * 
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format  
 * @param {boolean} enabled - Whether to enable data fetching
 * @returns {UnifiedDailyDataResult} Combined daily data with loading states
 */
export function useUnifiedDailyData(
    startDate: string,
    endDate: string,
    enabled: boolean = true
): UnifiedDailyDataResult {
    // State for hours chart data (handled separately due to different API)
    const [hoursChartData, setHoursChartData] = useState<HourData[] | null>(null);
    const [hoursChartError, setHoursChartError] = useState<HoursChartError | null>(null);
    const [hoursChartLoading, setHoursChartLoading] = useState(false);

    /**
     * Main dashboard data query using React Query for caching and optimization
     */
    const dashboardQuery = useQuery({
        queryKey: ['unified-daily-dashboard', startDate, endDate],
        queryFn: async (): Promise<{
            currentData: MainDashboardData;
            comparisonData: MainDashboardData | null;
            percentageChange: number | null;
            previousAmount: number | null;
        }> => {
            if (!startDate || !endDate) {
                throw new Error('Start date and end date are required');
            }

            const csrfToken = getCsrfToken();
            
            // **API CALL 1: Current period dashboard data**
            const currentUrl = new URL('/api/dashboard/main-data', window.location.origin);
            currentUrl.searchParams.append('start_date', startDate);
            currentUrl.searchParams.append('end_date', endDate);
            
            const currentResponse = await fetch(currentUrl.toString(), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            });

            if (!currentResponse.ok) {
                if (currentResponse.status === 419) {
                    // Session expired, reload page
                    window.location.reload();
                    throw new Error('Session expired');
                }
                
                // Try to get error message from response
                let errorMessage = `HTTP error! status: ${currentResponse.status}`;
                try {
                    const errorData = await currentResponse.json();
                    if (errorData.message) {
                        errorMessage = errorData.message;
                    }
                } catch {
                    // If we can't parse the error response, use the default message
                }
                
                throw new Error(errorMessage);
            }

            const currentResult = await currentResponse.json();

            if (!currentResult.success) {
                throw new Error(currentResult.message || 'Error al obtener los datos del dashboard');
            }

            // **API CALL 2: Comparison period (previous week) dashboard data**
            const previousWeekStartDate = getPreviousWeekDate(startDate);
            const previousWeekEndDate = getPreviousWeekDate(endDate);
            
            let comparisonResult = null;
            let percentageChange = null;
            let previousAmount = null;

            if (previousWeekStartDate && previousWeekEndDate) {
                try {
                    const comparisonUrl = new URL('/api/dashboard/main-data', window.location.origin);
                    comparisonUrl.searchParams.append('start_date', previousWeekStartDate);
                    comparisonUrl.searchParams.append('end_date', previousWeekEndDate);
                    
                    const comparisonResponse = await fetch(comparisonUrl.toString(), {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': csrfToken,
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        credentials: 'same-origin'
                    });

                    if (comparisonResponse.ok) {
                        comparisonResult = await comparisonResponse.json();
                        
                        if (comparisonResult.success) {
                            // Calculate percentage change
                            const currentTotal = currentResult.data?.sales?.total || 0;
                            const previousTotal = comparisonResult.data?.sales?.total || 0;
                            
                            if (previousTotal > 0) {
                                const change = ((currentTotal - previousTotal) / previousTotal) * 100;
                                percentageChange = Math.round(change * 10) / 10; // Round to 1 decimal
                            }
                            previousAmount = previousTotal;
                        }
                    }
                } catch (comparisonErr) {
                    // Comparison data is not critical, continue without it
                    console.warn('Failed to fetch comparison data:', comparisonErr);
                }
            }

            return {
                currentData: currentResult,
                comparisonData: comparisonResult,
                percentageChange,
                previousAmount
            };
        },
        enabled: enabled && Boolean(startDate && endDate),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
        retry: 2,
    });

    /**
     * Fetch hours chart data separately (different API endpoint)
     */
    const fetchHoursData = useCallback(async (targetDate: string) => {
        if (!targetDate || !enabled) return;

        setHoursChartLoading(true);
        setHoursChartError(null);

        try {
            const apiResponse = await chartApiService.getHoursChart(targetDate);
            const transformedData = transformHoursApiData(apiResponse);
            setHoursChartData(transformedData);
        } catch (err) {
            const error: HoursChartError = {
                message: err instanceof Error ? err.message : 'Error desconocido',
                status: err instanceof Error && 'status' in err ? (err as any).status : undefined
            };
            setHoursChartError(error);
            setHoursChartData(null);
        } finally {
            setHoursChartLoading(false);
        }
    }, [enabled]);

    /**
     * Effect to fetch hours data when startDate changes
     */
    useEffect(() => {
        if (startDate && enabled) {
            fetchHoursData(startDate);
        }
    }, [startDate, enabled, fetchHoursData]);

    /**
     * Refetch functions for manual data refresh
     */
    const refetchHours = useCallback(async () => {
        if (startDate) {
            await fetchHoursData(startDate);
        }
    }, [startDate, fetchHoursData]);

    const refetchAll = useCallback(async () => {
        const promises = [];
        
        // Refetch dashboard data
        promises.push(dashboardQuery.refetch());
        
        // Refetch hours data
        if (startDate) {
            promises.push(fetchHoursData(startDate));
        }
        
        await Promise.allSettled(promises);
    }, [dashboardQuery.refetch, startDate, fetchHoursData]);

    // Combine loading states and errors
    const combinedLoading = dashboardQuery.isLoading || hoursChartLoading;
    const combinedError = dashboardQuery.error || hoursChartError;

    return {
        // Dashboard data
        dashboardData: dashboardQuery.data?.currentData || null,
        dashboardComparisonData: dashboardQuery.data?.comparisonData || null,
        dashboardPercentageChange: dashboardQuery.data?.percentageChange || null,
        dashboardPreviousAmount: dashboardQuery.data?.previousAmount || null,
        
        // Hours chart data
        hoursChartData,
        
        // Combined states
        isLoading: combinedLoading,
        error: combinedError instanceof Error ? combinedError : null,
        
        // Refetch functions
        refetchDashboard: dashboardQuery.refetch,
        refetchHours,
        refetchAll,
    };
}

/**
 * Hook for checking if a date range represents a single day
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {boolean} True if the range represents a single day
 */
export function useIsSingleDay(startDate: string, endDate: string): boolean {
    if (!startDate || !endDate) return false;
    
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return false;
        }
        
        // Check if both dates are the same day
        return start.toISOString().split('T')[0] === end.toISOString().split('T')[0];
    } catch {
        return false;
    }
}