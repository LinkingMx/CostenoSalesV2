import { useQuery } from '@tanstack/react-query';

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

interface SharedWeeklyDataResult {
    currentData: MainDashboardData | null;
    comparisonData: MainDashboardData | null;
    isLoading: boolean;
    error: Error | null;
    percentageChange: number | null;
    previousAmount: number | null;
    refetch: () => Promise<any>;
}

/**
 * Hook centralizado que hace EXACTAMENTE 2 llamadas API:
 * 1. Período actual (start_date, end_date)
 * 2. Período de comparación (semana anterior)
 * 
 * Todos los componentes semanales deben usar este hook compartido
 * en lugar de hacer sus propias llamadas individuales.
 */
export function useSharedWeeklyData(
    startDate: string,
    endDate: string,
    enabled: boolean = true
): SharedWeeklyDataResult {
    const getCsrfToken = (): string => {
        let token = '';
        
        const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
        if (meta?.content) {
            token = meta.content;
        }
        
        if (!token) {
            const tokenInput = document.querySelector('input[name="_token"]') as HTMLInputElement;
            if (tokenInput?.value) {
                token = tokenInput.value;
            }
        }
        
        if (!token) {
            const cookieMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
            if (cookieMatch) {
                token = decodeURIComponent(cookieMatch[1]);
            }
        }
        
        return token;
    };

    const getPreviousWeekDate = (dateString: string) => {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        
        // Validar que la fecha sea válida
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
    };

    const query = useQuery({
        queryKey: ['shared-weekly-data', startDate, endDate],
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
            
            // **CALL 1: Período actual**
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
                    window.location.reload();
                    throw new Error('Session expired');
                }
                throw new Error(`HTTP error! status: ${currentResponse.status}`);
            }

            const currentResult = await currentResponse.json();

            if (!currentResult.success) {
                throw new Error(currentResult.message || 'Error al obtener los datos del período actual');
            }

            // **CALL 2: Período de comparación (semana anterior)**
            const previousStartDate = getPreviousWeekDate(startDate);
            const previousEndDate = getPreviousWeekDate(endDate);
            
            const comparisonUrl = new URL('/api/dashboard/main-data', window.location.origin);
            comparisonUrl.searchParams.append('start_date', previousStartDate);
            comparisonUrl.searchParams.append('end_date', previousEndDate);
            
            let comparisonResult = null;
            let percentageChange = null;
            let previousAmount = null;

            try {
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
                        // Calcular percentage change
                        const currentTotal = currentResult.data?.sales?.total || 0;
                        const previousTotal = comparisonResult.data?.sales?.total || 0;
                        
                        if (previousTotal > 0) {
                            const change = ((currentTotal - previousTotal) / previousTotal) * 100;
                            percentageChange = Math.round(change * 10) / 10;
                        }
                        previousAmount = previousTotal;
                    }
                }
            } catch (comparisonErr) {
                console.warn('Failed to fetch comparison data:', comparisonErr);
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
        gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
        refetchOnWindowFocus: false,
    });

    return {
        currentData: query.data?.currentData || null,
        comparisonData: query.data?.comparisonData || null,
        isLoading: query.isLoading,
        error: query.error instanceof Error ? query.error : null,
        percentageChange: query.data?.percentageChange || null,
        previousAmount: query.data?.previousAmount || null,
        refetch: query.refetch,
    };
}