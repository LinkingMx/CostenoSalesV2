import { useQuery } from '@tanstack/react-query';

interface BranchData {
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
}

interface OptimizedBranchDataResponse {
    success: boolean;
    current: {
        total: number;
        sales_total: number;
        orders_count: number;
        branches: Record<string, BranchData>;
        period: {
            start_date: string;
            end_date: string;
            type: string;
        };
    };
    comparison: {
        total: number;
        sales_total: number;
        orders_count: number;
        branches: Record<string, BranchData>;
        period: {
            start_date: string;
            end_date: string;
            type: string;
        };
    };
    metadata: {
        percentage_change: number | null;
        cached_at: string;
        api_calls_saved: number;
        branches_count: number;
    };
}

interface UseOptimizedBranchDataResult {
    data: OptimizedBranchDataResponse | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
}

export function useOptimizedBranchData(
    startDate: string,
    endDate: string,
    enabled: boolean = true
): UseOptimizedBranchDataResult {
    const query = useQuery({
        queryKey: ['optimized-branch-data', startDate, endDate],
        queryFn: async () => {
            if (!startDate || !endDate) {
                throw new Error('Start date and end date are required');
            }

            const response = await fetch(`/api/dashboard/optimized-branch-data?${new URLSearchParams({
                start_date: startDate,
                end_date: endDate,
                period_type: 'weekly' // Could be dynamic based on date range
            })}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Error al obtener datos de sucursales');
            }

            return result;
        },
        enabled: enabled && Boolean(startDate && endDate),
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
    });

    return {
        data: query.data || null,
        isLoading: query.isLoading,
        error: query.error instanceof Error ? query.error : null,
        refetch: query.refetch,
    };
}

// Hook específico para obtener solo los datos de sucursales actuales
export function useCurrentBranchData(
    startDate: string,
    endDate: string,
    enabled: boolean = true
) {
    const { data, isLoading, error, refetch } = useOptimizedBranchData(startDate, endDate, enabled);
    
    return {
        branches: data?.current.branches || {},
        isLoading,
        error,
        refetch,
        metadata: {
            total: data?.current.total || 0,
            branchesCount: data?.metadata.branches_count || 0,
            apiCallsSaved: data?.metadata.api_calls_saved || 0
        }
    };
}

// Hook específico para obtener datos de comparación
export function useComparisonBranchData(
    startDate: string,
    endDate: string,
    enabled: boolean = true
) {
    const { data, isLoading, error, refetch } = useOptimizedBranchData(startDate, endDate, enabled);
    
    return {
        branches: data?.comparison.branches || {},
        isLoading,
        error,
        refetch,
        percentageChange: data?.metadata.percentage_change || null
    };
}

// Hook para obtener datos combinados con comparación automática
export function useBranchDataWithComparison(
    startDate: string,
    endDate: string,
    enabled: boolean = true
) {
    const { data, isLoading, error, refetch } = useOptimizedBranchData(startDate, endDate, enabled);
    
    const calculateBranchPercentageChange = (branchName: string, currentTotal: number) => {
        if (!data?.comparison.branches) return { percentage: 0, hasComparison: false };
        
        const previousBranchData = data.comparison.branches[branchName];
        if (!previousBranchData) return { percentage: 0, hasComparison: false };
        
        const previousTotal = previousBranchData.open_accounts.money + previousBranchData.closed_ticket.money;
        
        if (previousTotal === 0) return { percentage: 0, hasComparison: false };
        
        const change = ((currentTotal - previousTotal) / previousTotal) * 100;
        return { 
            percentage: Math.round(change * 10) / 10, // Round to 1 decimal
            hasComparison: true 
        };
    };
    
    return {
        currentBranches: data?.current.branches || {},
        comparisonBranches: data?.comparison.branches || {},
        calculateBranchPercentageChange,
        isLoading,
        error,
        refetch,
        metadata: data?.metadata || null
    };
}