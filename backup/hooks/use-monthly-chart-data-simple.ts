import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addWeeks, subMonths, startOfDay, endOfDay } from 'date-fns';
import { monthlyDataCache, createCacheKey } from '@/utils/cache-manager';
import { retryConfigs } from '@/utils/retry-manager';
import { trackNetworkRequest, trackOperation } from '@/utils/performance-monitor';

// Helper function to get CSRF token from meta tag
const getCsrfToken = (): string => {
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (!token) {
        throw new Error('CSRF token not found');
    }
    return token;
};

interface WeekData {
    week: string;
    weekName: string;
    current: number;
    previous: number;
}

interface UseMonthlyChartDataResult {
    data: WeekData[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    currentStage?: string;
    progress?: number;
}

// Helper function to get weeks within a month
function getWeeksInMonth(monthStart: Date, monthEnd: Date, monthLabel: string) {
    const weeks = [];
    let weekStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
    
    while (weekStart <= monthEnd) {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        
        // Only include weeks that actually overlap with the month
        if (weekEnd >= monthStart && weekStart <= monthEnd) {
            const actualStart = weekStart < monthStart ? monthStart : weekStart;
            const actualEnd = weekEnd > monthEnd ? monthEnd : weekEnd;
            
            const weekNumber = Math.floor((actualStart.getTime() - monthStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
            
            weeks.push({
                week_key: `${monthLabel}_week_${weekNumber}`,
                week_name: `Semana ${weekNumber}`,
                start_date: format(startOfDay(actualStart), 'yyyy-MM-dd'),
                end_date: format(endOfDay(actualEnd), 'yyyy-MM-dd')
            });
        }
        
        weekStart = addWeeks(weekStart, 1);
    }
    
    return weeks;
}

export function useMonthlyChartDataSimple(startDate: string, endDate: string): UseMonthlyChartDataResult {
    const [data, setData] = useState<WeekData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [refreshKey, setRefreshKey] = useState(0); // Add refresh key for manual refetch
    const [currentStage, setCurrentStage] = useState<string>('init');
    const [progress, setProgress] = useState<number>(0);
    
    // Don't make API calls if dates are empty
    const shouldFetch = startDate && endDate && startDate.trim() !== '' && endDate.trim() !== '';

    useEffect(() => {
        if (!shouldFetch) {
            setData([]);
            setLoading(false);
            setError(null);
            return;
        }

        let cancelled = false;

        const fetchMonthlyData = async () => {
            // Start performance tracking
            const operationTimer = trackOperation('monthly-chart-fetch', {
                startDate,
                endDate,
                refreshKey
            });
            
            // Generate cache key for this request
            const cacheKey = createCacheKey('monthly-chart', { startDate, endDate });
            
            // Check cache first
            const cachedResult = monthlyDataCache.get<WeekData[]>(cacheKey);
            if (cachedResult && !cachedResult.isStale) {
                console.log('📊 Monthly Chart: Using cached data');
                setData(cachedResult.data);
                setLoading(false);
                setError(null);
                operationTimer(true, undefined, { cacheHit: true });
                return;
            }
            
            // If we have stale data, use it while we fetch fresh data
            if (cachedResult?.isStale) {
                console.log('📊 Monthly Chart: Using stale data while revalidating');
                setData(cachedResult.data);
                setError(null);
            }
            
            setLoading(true);
            setError(null);
            setCurrentStage('init');
            setProgress(5);

            try {
                setCurrentStage('weeks');
                setProgress(15);
                
                // Parse the month dates
                const currentMonthStart = startOfMonth(new Date(startDate));
                const currentMonthEnd = endOfMonth(new Date(endDate));
                const previousMonthStart = startOfMonth(subMonths(currentMonthStart, 1));
                const previousMonthEnd = endOfMonth(subMonths(currentMonthEnd, 1));

                // Get weeks for both months
                const currentMonthWeeks = getWeeksInMonth(currentMonthStart, currentMonthEnd, 'current');
                const previousMonthWeeks = getWeeksInMonth(previousMonthStart, previousMonthEnd, 'previous');

                setCurrentStage('api');
                setProgress(25);

                console.log('📊 Monthly Chart: Making POST request to /api/dashboard/monthly-batch', {
                    currentMonthWeeks: currentMonthWeeks.length,
                    previousMonthWeeks: previousMonthWeeks.length,
                    totalCalls: currentMonthWeeks.length + previousMonthWeeks.length,
                    url: '/api/dashboard/monthly-batch',
                    method: 'POST'
                });

                const csrfToken = getCsrfToken();
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes timeout for complex monthly batch
                
                // Track network request
                const networkTracker = trackNetworkRequest('/api/dashboard/monthly-batch', 'POST', {
                    currentMonthWeeks: currentMonthWeeks.length,
                    previousMonthWeeks: previousMonthWeeks.length,
                    totalWeeks: currentMonthWeeks.length + previousMonthWeeks.length,
                    cacheKey
                });
                
                let result: any;
                let responseSize = 0;
                
                try {
                    const response = await retryConfigs.critical.executeWithRetry(async () => {
                        const response = await fetch('/api/dashboard/monthly-batch', {
                            method: 'POST',
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': csrfToken,
                                'X-Requested-With': 'XMLHttpRequest'
                            },
                            credentials: 'same-origin',
                            signal: controller.signal,
                            body: JSON.stringify({
                                current_month_weeks: currentMonthWeeks,
                                previous_month_weeks: previousMonthWeeks
                            })
                        });
                        
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        
                        return response;
                    }, 'Monthly batch API call');
                    
                    clearTimeout(timeoutId);
                    console.log('📊 Monthly Chart: POST request completed', { status: response.status, ok: response.ok });
                    
                    setCurrentStage('process');
                    setProgress(75);

                    result = await response.json();
                    
                    // Track successful network request
                    responseSize = JSON.stringify(result).length;
                    networkTracker.success(response.status, responseSize, !!cachedResult?.isStale);

                    if (!result.success) {
                        throw new Error(result.message || 'Error al obtener datos mensuales por semana');
                    }
                    
                } catch (fetchError) {
                    clearTimeout(timeoutId);
                    
                    const errorMessage = fetchError.name === 'AbortError' 
                        ? 'La consulta tardó demasiado tiempo (3+ minutos). Por favor, intenta con un rango de fechas más pequeño.'
                        : fetchError.message;
                    
                    // Track failed network request
                    networkTracker.failure(errorMessage);
                    
                    console.error('📊 Monthly Chart: Fetch error details', {
                        error: fetchError,
                        name: fetchError.name,
                        message: fetchError.message
                    });
                    
                    throw new Error(errorMessage);
                }

                if (cancelled) return;

                // Transform API response to chart data format
                const chartData: WeekData[] = [];
                
                // Process each current month week and find its previous month equivalent
                const currentWeeksData = result.data.current_month_weeks || {};
                const previousWeeksData = result.data.previous_month_weeks || {};
                
                Object.keys(currentWeeksData).forEach((weekKey, index) => {
                    const currentWeek = currentWeeksData[weekKey];
                    const previousWeekKey = `previous_week_${index + 1}`;
                    const previousWeek = previousWeeksData[previousWeekKey] || { total: 0 };
                    
                    chartData.push({
                        week: weekKey,
                        weekName: currentWeek.week_name || `Semana ${index + 1}`,
                        current: Number(currentWeek.total || 0),
                        previous: Number(previousWeek.total || 0)
                    });
                });

                console.log('✅ Monthly Chart: Data processed successfully', {
                    weeksProcessed: chartData.length,
                    currentTotal: result.data.metadata?.current_month_total || 0,
                    previousTotal: result.data.metadata?.previous_month_total || 0,
                    change: result.data.metadata?.month_over_month_change || 0
                });

                setCurrentStage('cache');
                setProgress(90);
                
                // Cache the processed data
                monthlyDataCache.set(cacheKey, chartData, `${startDate}-${endDate}-${refreshKey}`);

                console.log('📊 Monthly Chart: Setting data and clearing error', {
                    chartDataLength: chartData.length
                });

                setData(chartData);
                setError(null);
                setProgress(100);
                
                // Track successful operation
                operationTimer(true, undefined, {
                    cacheHit: false,
                    weeksProcessed: chartData.length,
                    responseSize,
                    compressionEnabled: result.data.metadata?.compression_enabled || false
                });

            } catch (err) {
                if (cancelled) return;
                
                const error = err instanceof Error ? err : new Error('Error desconocido al obtener datos mensuales');
                console.error('❌ Monthly Chart: Error fetching data', error);
                
                // Track failed operation
                operationTimer(false, error.message, {
                    cacheHit: !!cachedResult,
                    errorType: error.constructor.name
                });
                
                setError(error);
                setData([]);
            } finally {
                if (!cancelled) {
                    console.log('📊 Monthly Chart: Finalizing request', { 
                        loading: false 
                    });
                    setLoading(false);
                    setCurrentStage('init');
                    // Reset progress after a short delay
                    setTimeout(() => setProgress(0), 1000);
                }
            }
        };

        fetchMonthlyData();

        return () => {
            cancelled = true;
        };
    }, [shouldFetch, startDate, endDate, refreshKey]);

    const refetch = async () => {
        if (shouldFetch) {
            // Trigger a re-fetch by incrementing the refresh key
            // This will cause the useEffect to run again with the same dates
            setRefreshKey(prev => prev + 1);
        }
        return Promise.resolve();
    };

    return {
        data,
        loading,
        error,
        refetch,
        currentStage,
        progress
    };
}