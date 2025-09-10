import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { differenceInDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTopBranches } from './use-top-branches';
import { useAllBranches } from './use-all-branches';
import { 
    CustomRangeData, 
    TopBranchData, 
    AllBranchData,
    CustomRangeSummaryData,
    AllBranchesSummaryData,
    CUSTOM_RANGE_ERROR_MESSAGES,
    CustomRangeErrorType 
} from '@/types/custom-range';

export interface UseCustomRangeDataResult {
    data: CustomRangeData | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<any>;
    topBranches: TopBranchData[];
    allBranches: AllBranchData[];
    summaryData: CustomRangeSummaryData;
    allBranchesSummaryData: AllBranchesSummaryData;
    validationError: string | null;
    isValidRange: boolean;
}

/**
 * Validates if the date range is appropriate for custom range display
 */
function validateDateRange(startDate: string, endDate: string): string | null {
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const daysDiff = differenceInDays(end, start);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return CUSTOM_RANGE_ERROR_MESSAGES.INVALID_DATES;
        }
        
        if (daysDiff < 1) {
            return CUSTOM_RANGE_ERROR_MESSAGES.RANGE_TOO_SMALL;
        }
        
        if (daysDiff > 90) {
            return CUSTOM_RANGE_ERROR_MESSAGES.RANGE_TOO_LARGE;
        }
        
        return null;
    } catch (error) {
        return CUSTOM_RANGE_ERROR_MESSAGES.INVALID_DATES;
    }
}

/**
 * Main hook for custom date range data management
 * Handles API calls, top branches calculation, and data validation
 */
export function useCustomRangeData(
    startDate: string,
    endDate: string,
    enabled: boolean = true
): UseCustomRangeDataResult {
    
    const getCsrfToken = (): string => {
        const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
        return meta?.content || '';
    };
    
    // Validate the date range
    const validationError = useMemo(() => {
        if (!startDate || !endDate) return null;
        return validateDateRange(startDate, endDate);
    }, [startDate, endDate]);
    
    const isValidRange = validationError === null && !!startDate && !!endDate;
    
    // Query key for caching
    const queryKey = ['custom-range-data', startDate, endDate];
    
    // Main API query
    const { data, isLoading, error, refetch } = useQuery({
        queryKey,
        queryFn: async (): Promise<CustomRangeData> => {
            console.log('📊 Custom Range: Making API call', {
                startDate,
                endDate,
                daysDiff: differenceInDays(new Date(endDate), new Date(startDate)) + 1
            });
            
            const csrfToken = getCsrfToken();
            
            const response = await fetch(`/api/dashboard/main-data?start_date=${startDate}&end_date=${endDate}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                if (response.status === 419) {
                    window.location.reload();
                    throw new Error('Session expired');
                }
                
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData.message) {
                        errorMessage = errorData.message;
                    }
                } catch {
                    // Use default error message
                }
                
                throw new Error(errorMessage);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || CUSTOM_RANGE_ERROR_MESSAGES.API_ERROR);
            }
            
            console.log('✅ Custom Range: API call successful', {
                totalSales: result.data?.sales?.total || 0,
                branchCount: Object.keys(result.data?.cards || {}).length
            });
            
            return result;
        },
        enabled: enabled && isValidRange,
        staleTime: 10 * 60 * 1000, // 10 minutes (longer for custom ranges)
        gcTime: 30 * 60 * 1000, // 30 minutes
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
            // Only retry network errors, not validation errors
            if (error.message.includes('validation') || error.message.includes('Invalid')) {
                return false;
            }
            return failureCount < 2;
        }
    });
    
    // Calculate top branches using the dedicated hook
    const topBranches = useTopBranches(data?.data?.cards);
    
    // Calculate all branches data using the new hook
    const { allBranches, summaryData: allBranchesSummary } = useAllBranches(data?.data?.cards);
    
    // Calculate summary data
    const summaryData: CustomRangeSummaryData = useMemo(() => {
        if (!data || !startDate || !endDate) {
            return {
                totalSales: 0,
                dailyAverage: 0,
                dayCount: 0,
                periodDescription: ''
            };
        }
        
        const totalSales = data.data?.sales?.total || 0;
        const dayCount = differenceInDays(new Date(endDate), new Date(startDate)) + 1;
        const dailyAverage = dayCount > 0 ? totalSales / dayCount : 0;
        
        const startFormatted = format(new Date(startDate), "d 'de' MMMM", { locale: es });
        const endFormatted = format(new Date(endDate), "d 'de' MMMM 'de' yyyy", { locale: es });
        const periodDescription = `${startFormatted} al ${endFormatted}`;
        
        return {
            totalSales,
            dailyAverage,
            dayCount,
            periodDescription
        };
    }, [data, startDate, endDate]);
    
    // Enhanced summary data that includes all branches metrics
    const allBranchesSummaryData: AllBranchesSummaryData = useMemo(() => {
        if (!data || !startDate || !endDate || !allBranchesSummary) {
            return {
                totalSales: 0,
                totalTickets: 0,
                totalOpenAccounts: 0,
                totalClosedTickets: 0,
                averageTicket: 0,
                branchCount: 0,
                topBranchPercentage: 0,
                dailyAverage: 0,
                dayCount: 0,
                periodDescription: ''
            };
        }
        
        const dayCount = differenceInDays(new Date(endDate), new Date(startDate)) + 1;
        const dailyAverage = dayCount > 0 ? allBranchesSummary.totalSales / dayCount : 0;
        
        const startFormatted = format(new Date(startDate), "d 'de' MMMM", { locale: es });
        const endFormatted = format(new Date(endDate), "d 'de' MMMM 'de' yyyy", { locale: es });
        const periodDescription = `${startFormatted} al ${endFormatted}`;
        
        return {
            ...allBranchesSummary,
            dailyAverage,
            dayCount,
            periodDescription
        };
    }, [allBranchesSummary, startDate, endDate, data]);
    
    return {
        data: data || null,
        isLoading,
        error: validationError ? new Error(validationError) : error,
        refetch,
        topBranches,
        allBranches,
        summaryData,
        allBranchesSummaryData,
        validationError,
        isValidRange
    };
}

/**
 * Utility hook to detect if a date range is a custom range
 * (not single day, not weekly, not monthly)
 */
export function useIsCustomRange(startDate: string | null, endDate: string | null): boolean {
    return useMemo(() => {
        if (!startDate || !endDate) return false;
        
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const daysDiff = differenceInDays(end, start);
            
            // Single day check
            if (daysDiff === 0) return false;
            
            // Weekly check (exactly 7 days starting on Monday)
            if (daysDiff === 6 && start.getDay() === 1) return false; // getDay(): 1 = Monday
            
            // Monthly check (first day to last day of same month)
            if (start.getDate() === 1 && 
                end.getMonth() === start.getMonth() && 
                end.getFullYear() === start.getFullYear()) {
                // Check if end date is last day of month
                const lastDayOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0);
                if (end.getDate() === lastDayOfMonth.getDate()) {
                    return false;
                }
            }
            
            // If none of the above, it's a custom range
            return true;
            
        } catch (error) {
            return false;
        }
    }, [startDate, endDate]);
}