import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

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
        }>;
    };
}

interface SharedMonthlyData {
    currentData: MainDashboardData | null;
    comparisonData: MainDashboardData | null;
    percentageChange: number | null;
    previousAmount: number;
    isLoading: boolean;
    error: Error | null;
}

/**
 * Hook optimizado para datos mensuales - EXACTAMENTE 2 API calls
 * 
 * Problema original: Cada componente mensual hacía llamadas individuales
 * - MonthlySalesSummary: 2 calls
 * - MonthlyBranchSummaryAccordion: branchCount × 2 calls
 * - MonthlyLineChart: ~60 calls (30 días × 2 períodos)
 * - Otros componentes mensuales: ~6 calls
 * Total: 70+ calls por vista mensual
 * 
 * Solución: Un solo hook que hace EXACTAMENTE 2 calls para todos los componentes
 * - Call 1: Mes actual
 * - Call 2: Mes anterior (comparación)
 * Mejora: >95% reducción en requests
 */
export function useSharedMonthlyData(
    startDate: string,
    endDate: string,
    enabled: boolean = true
): SharedMonthlyData {
    
    // Helper function to get CSRF token
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

    // Calcular fechas del mes anterior para comparación
    const getPreviousMonthDates = (currentStart: string, currentEnd: string) => {
        // Validar que las fechas no estén vacías
        if (!currentStart || !currentEnd) {
            return {
                startDate: '',
                endDate: ''
            };
        }
        
        const start = new Date(currentStart);
        const end = new Date(currentEnd);
        
        // Validar que las fechas sean válidas
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return {
                startDate: '',
                endDate: ''
            };
        }
        
        try {
            // Obtener el mes anterior
            const prevStart = startOfMonth(subMonths(start, 1));
            const prevEnd = endOfMonth(subMonths(end, 1));
            
            return {
                startDate: format(prevStart, 'yyyy-MM-dd'),
                endDate: format(prevEnd, 'yyyy-MM-dd')
            };
        } catch (error) {
            console.warn('Error calculating previous month dates:', error);
            return {
                startDate: '',
                endDate: ''
            };
        }
    };

    const { startDate: previousStartDate, endDate: previousEndDate } = 
        getPreviousMonthDates(startDate, endDate);

    // **SHARED MONTHLY DATA - EXACTLY 2 API CALLS**
    const query = useQuery({
        queryKey: ['shared-monthly-data', startDate, endDate],
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
            
            // **CALL 1: Mes actual**
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
                throw new Error(currentResult.message || 'Error al obtener los datos del mes actual');
            }

            // **CALL 2: Mes anterior para comparación**
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
                    
                    if (comparisonResult.success && currentResult.data?.sales?.total && comparisonResult.data?.sales?.total) {
                        const currentTotal = currentResult.data.sales.total;
                        const previousTotal = comparisonResult.data.sales.total;
                        previousAmount = previousTotal;
                        
                        if (previousTotal > 0) {
                            percentageChange = ((currentTotal - previousTotal) / previousTotal) * 100;
                            percentageChange = Math.round(percentageChange * 10) / 10; // Redondear a 1 decimal
                        }
                    }
                }
            } catch (error) {
                // Si falla la comparación, no es crítico - continuamos sin ella
                console.warn('Could not fetch comparison data:', error);
            }

            return {
                currentData: currentResult,
                comparisonData: comparisonResult,
                percentageChange,
                previousAmount
            };
        },
        enabled: enabled && !!startDate && !!endDate,
        gcTime: 5 * 60 * 1000, // 5 minutos
        staleTime: 2 * 60 * 1000, // 2 minutos
        retry: 2,
    });

    return {
        currentData: query.data?.currentData ?? null,
        comparisonData: query.data?.comparisonData ?? null,
        percentageChange: query.data?.percentageChange ?? null,
        previousAmount: query.data?.previousAmount ?? 0,
        isLoading: query.isLoading,
        error: query.error,
    };
}

/**
 * Hook helper para detectar si un rango de fechas representa un mes completo
 * Esto permite al dashboard decidir cuándo usar componentes mensuales optimizados
 */
export function useIsMonthlyPeriod(startDate: string, endDate: string): boolean {
    if (!startDate || !endDate) return false;

    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Validar que las fechas sean válidas
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return false;
        }
        
        // Verificar si es el primer día del mes
        const isFirstDay = start.getDate() === 1;
        
        // Verificar si es el último día del mes
        const lastDayOfMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0);
        const isLastDay = end.getDate() === lastDayOfMonth.getDate();
        
        // Verificar que estén en el mismo mes
        const sameMonth = start.getMonth() === end.getMonth() && 
                         start.getFullYear() === end.getFullYear();
        
        return isFirstDay && isLastDay && sameMonth;
    } catch {
        return false;
    }
}