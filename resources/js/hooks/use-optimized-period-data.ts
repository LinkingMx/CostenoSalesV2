import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

interface DailyBreakdown {
    date: string;
    label: string;
    full_label: string;
    sales_total: number;
    orders_count: number;
    day_of_week: number;
}

interface WeeklyBreakdown {
    week_number: number;
    label: string;
    full_label: string;
    start_date: string;
    end_date: string;
    sales_total: number;
    orders_count: number;
}

interface PeriodData {
    total: number;
    sales_total: number;
    orders_count: number;
    breakdown: DailyBreakdown[] | WeeklyBreakdown[];
    period: {
        start_date: string;
        end_date: string;
        type: 'weekly' | 'monthly';
    };
}

interface OptimizedPeriodResponse {
    success: boolean;
    current: PeriodData;
    comparison: PeriodData;
    metadata: {
        percentage_change: number | null;
        cached_at: string;
        api_calls_saved: number;
    };
}

/**
 * Optimized hook that replaces 14+ individual API calls with 1 cached call
 */
export function useOptimizedPeriodData(
    startDate: string, 
    endDate: string, 
    periodType: 'weekly' | 'monthly'
) {
    // Get CSRF token for requests
    const getCsrfToken = (): string => {
        const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
        return meta?.content || '';
    };

    // Single API call with React Query caching
    const query = useQuery({
        queryKey: ['optimized-period-data', startDate, endDate, periodType],
        queryFn: async (): Promise<OptimizedPeriodResponse> => {
            const url = new URL('/api/dashboard/optimized-period-data', window.location.origin);
            url.searchParams.append('start_date', startDate);
            url.searchParams.append('end_date', endDate);
            url.searchParams.append('period_type', periodType);

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            });

            if (!response.ok) {
                if (response.status === 419) {
                    window.location.reload();
                    throw new Error('Session expired');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Error al obtener datos optimizados');
            }

            return result;
        },
        enabled: !!startDate && !!endDate && !!periodType,
        staleTime: 3 * 60 * 1000, // 3 minutes for dashboard data
        cacheTime: 5 * 60 * 1000, // 5 minutes cache
    });

    return {
        data: query.data,
        loading: query.isLoading,
        error: query.error as Error | null,
        refetch: query.refetch,
        isStale: query.isStale,
        lastUpdated: query.dataUpdatedAt
    };
}

/**
 * Hook for weekly chart data - now uses optimized endpoint
 */
export function useOptimizedWeeklyChartData(startDate: string, endDate: string) {
    const { data, loading, error, refetch } = useOptimizedPeriodData(startDate, endDate, 'weekly');

    const chartData = useMemo(() => {
        if (!data?.current?.breakdown) return [];

        const currentBreakdown = data.current.breakdown as DailyBreakdown[];
        const comparisonBreakdown = data.comparison.breakdown as DailyBreakdown[];

        return currentBreakdown.map((day, index) => ({
            day: day.label,
            dayName: day.full_label,
            date: day.date,
            current: day.sales_total,
            previous: comparisonBreakdown[index]?.sales_total || 0,
            currentOrders: day.orders_count,
            previousOrders: comparisonBreakdown[index]?.orders_count || 0,
        }));
    }, [data]);

    const totals = useMemo(() => ({
        current: data?.current?.total || 0,
        previous: data?.comparison?.total || 0,
        percentageChange: data?.metadata?.percentage_change || null
    }), [data]);

    return {
        data: chartData,
        totals,
        loading,
        error,
        refetch,
        metadata: data?.metadata
    };
}

/**
 * Hook for monthly chart data - now uses optimized endpoint  
 */
export function useOptimizedMonthlyChartData(startDate: string, endDate: string) {
    const { data, loading, error, refetch } = useOptimizedPeriodData(startDate, endDate, 'monthly');

    const chartData = useMemo(() => {
        if (!data?.current?.breakdown) return [];

        const currentBreakdown = data.current.breakdown as WeeklyBreakdown[];
        const comparisonBreakdown = data.comparison.breakdown as WeeklyBreakdown[];

        return currentBreakdown.map((week, index) => ({
            week: week.label,
            weekName: week.full_label,
            startDate: week.start_date,
            endDate: week.end_date,
            current: week.sales_total,
            previous: comparisonBreakdown[index]?.sales_total || 0,
            currentOrders: week.orders_count,
            previousOrders: comparisonBreakdown[index]?.orders_count || 0,
        }));
    }, [data]);

    const totals = useMemo(() => ({
        current: data?.current?.total || 0,
        previous: data?.comparison?.total || 0,
        percentageChange: data?.metadata?.percentage_change || null
    }), [data]);

    return {
        data: chartData,
        totals,
        loading,
        error,
        refetch,
        metadata: data?.metadata
    };
}

/**
 * Hook to get summary data without breakdown (for summary cards)
 */
export function useOptimizedSummaryData(
    startDate: string, 
    endDate: string, 
    periodType: 'weekly' | 'monthly'
) {
    const { data, loading, error, refetch } = useOptimizedPeriodData(startDate, endDate, periodType);

    const summaryData = useMemo(() => {
        if (!data) return null;

        return {
            current: {
                total: data.current.total,
                salesTotal: data.current.sales_total,
                ordersCount: data.current.orders_count,
            },
            comparison: {
                total: data.comparison.total,
                salesTotal: data.comparison.sales_total,
                ordersCount: data.comparison.orders_count,
            },
            percentageChange: data.metadata.percentage_change,
            period: data.current.period
        };
    }, [data]);

    return {
        data: summaryData,
        loading,
        error,
        refetch,
        metadata: data?.metadata
    };
}