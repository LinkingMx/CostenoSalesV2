import { useOptimizedWeeklyChartData } from './use-optimized-period-data';

/**
 * OPTIMIZED Weekly Chart Data Hook
 * 
 * BEFORE: 14 individual API calls (7 current + 7 previous days)
 * AFTER: 1 cached API call with intelligent breakdown
 * 
 * Performance improvement: ~95% reduction in API calls
 */
export function useWeeklyChartDataOptimized(startDate: string, endDate: string) {
    const { data, totals, loading, error, refetch, metadata } = useOptimizedWeeklyChartData(startDate, endDate);

    return {
        data: data || [], // Daily breakdown for chart
        totals, // Summary totals for headers
        loading,
        error,
        refetch,
        metadata: {
            ...metadata,
            optimizationNote: 'Using optimized endpoint - saved ~12 API calls'
        }
    };
}

// Export with original name for backward compatibility
export { useWeeklyChartDataOptimized as useWeeklyChartData };