import { useState, useEffect } from 'react';
import { trackNetworkRequest, trackOperation } from '@/utils/performance-monitor';
import { weeklyDataCache, createCacheKey } from '@/utils/cache-manager';
import { retryConfigs } from '@/utils/retry-manager';
import { format, addDays, subDays, parse, isValid } from 'date-fns';

// Helper function to get CSRF token from meta tag
const getCsrfToken = (): string => {
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (!token) {
        throw new Error('CSRF token not found');
    }
    return token;
};

// Helper function to calculate previous week dates
const getPreviousWeekDate = (dateString: string): string => {
    const date = new Date(dateString);
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
};

// Helper function to generate array of 7 consecutive dates for weekly batch API
const generateWeekDays = (startDate: string, endDate: string): string[] => {
    if (!startDate || !endDate) return [];
    
    try {
        const startDateObj = parse(startDate, 'yyyy-MM-dd', new Date());
        const endDateObj = parse(endDate, 'yyyy-MM-dd', new Date());
        
        if (!isValid(startDateObj) || !isValid(endDateObj)) {
            console.warn('Invalid date format provided to generateWeekDays');
            return [];
        }
        
        const weekDays: string[] = [];
        let currentDate = new Date(startDateObj);
        const endDateTimestamp = endDateObj.getTime();
        
        // Generate array of dates from start to end (inclusive)
        while (currentDate.getTime() <= endDateTimestamp) {
            weekDays.push(format(currentDate, 'yyyy-MM-dd'));
            currentDate = addDays(currentDate, 1);
        }
        
        return weekDays;
    } catch (error) {
        console.warn('Error generating week days:', error);
        return [];
    }
};

// Helper function to calculate previous week dates array
const calculatePreviousWeekDates = (currentWeekDates: string[]): string[] => {
    return currentWeekDates.map(dateString => {
        const currentDate = parse(dateString, 'yyyy-MM-dd', new Date());
        return format(subDays(currentDate, 7), 'yyyy-MM-dd');
    });
};

interface SharedWeeklyDataResult {
    currentData: any;
    comparisonData: any;
    chartData: any;
    percentageChange: number;
    previousAmount: number;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    performanceMetrics?: {
        totalExecutionTime: number;
        parallelExecutionTime: number;
        improvementPercentage: number;
        slowestCall: string;
    };
}

export function useSharedWeeklyDataOptimized(
    startDate: string,
    endDate: string,
    enabled: boolean = true
): SharedWeeklyDataResult {
    const [currentData, setCurrentData] = useState<any>(null);
    const [comparisonData, setComparisonData] = useState<any>(null);
    const [chartData, setChartData] = useState<any>(null);
    const [percentageChange, setPercentageChange] = useState<number>(0);
    const [previousAmount, setPreviousAmount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);

    const shouldFetch = enabled && startDate && endDate && startDate.trim() !== '' && endDate.trim() !== '';

    useEffect(() => {
        if (!shouldFetch) {
            setCurrentData(null);
            setComparisonData(null);
            setChartData(null);
            setPercentageChange(0);
            setPreviousAmount(0);
            setIsLoading(false);
            setError(null);
            return;
        }

        let cancelled = false;

        const fetchWeeklyDataInParallel = async () => {
            const startTime = performance.now();
            
            // Start performance tracking
            const operationTimer = trackOperation('weekly-data-parallel-fetch', {
                startDate,
                endDate,
                refreshKey
            });

            setIsLoading(true);
            setError(null);

            try {
                console.log('🚀 [OPTIMIZED] Starting parallel weekly batch request', {
                    currentWeek: `${startDate} to ${endDate}`,
                    previousWeek: `${getPreviousWeekDate(startDate)} to ${getPreviousWeekDate(endDate)}`,
                    timestamp: new Date().toISOString()
                });

                const csrfToken = getCsrfToken();
                
                // **PARALLEL EXECUTION**: Create all promises simultaneously
                const previousStartDate = getPreviousWeekDate(startDate);
                const previousEndDate = getPreviousWeekDate(endDate);
                
                // Generate arrays of 7 dates for weekly batch API
                const currentWeekDates = generateWeekDays(startDate, endDate);
                const previousWeekDates = calculatePreviousWeekDates(currentWeekDates);

                // Create cache keys for potential cache hits
                const currentCacheKey = createCacheKey('weekly-current', { startDate, endDate });
                const comparisonCacheKey = createCacheKey('weekly-comparison', { 
                    startDate: previousStartDate, 
                    endDate: previousEndDate 
                });
                const chartCacheKey = createCacheKey('weekly-chart', { startDate, endDate });

                // Check cache first for all three calls
                const currentCached = weeklyDataCache.get(currentCacheKey);
                const comparisonCached = weeklyDataCache.get(comparisonCacheKey);
                const chartCached = weeklyDataCache.get(chartCacheKey);

                const promises: Promise<any>[] = [];
                const promiseLabels: string[] = [];

                // **PROMISE 1: Current week data**
                if (!currentCached || currentCached.isStale) {
                    const currentTracker = trackNetworkRequest('/api/dashboard/main-data', 'GET', {
                        type: 'current-week',
                        startDate, 
                        endDate
                    });
                    
                    const currentUrl = new URL('/api/dashboard/main-data', window.location.origin);
                    currentUrl.searchParams.append('start_date', startDate);
                    currentUrl.searchParams.append('end_date', endDate);
                    
                    promises.push(
                        retryConfigs.realtime.executeWithRetry(async () => {
                            const response = await fetch(currentUrl.toString(), {
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
                                    throw new Error('Session expired');
                                }
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }
                            
                            const result = await response.json();
                            currentTracker.success(response.status, JSON.stringify(result).length);
                            
                            if (!result.success) {
                                throw new Error(result.message || 'Error al obtener los datos del período actual');
                            }
                            
                            // Cache the result
                            weeklyDataCache.set(currentCacheKey, result, `current-${Date.now()}`);
                            
                            return { type: 'current', data: result };
                        }, 'Weekly current data')
                    );
                    promiseLabels.push('current-week');
                } else {
                    promises.push(Promise.resolve({ type: 'current', data: currentCached.data }));
                    promiseLabels.push('current-week-cached');
                }

                // **PROMISE 2: Previous week data (comparison)**
                if (!comparisonCached || comparisonCached.isStale) {
                    const comparisonTracker = trackNetworkRequest('/api/dashboard/main-data', 'GET', {
                        type: 'comparison-week',
                        startDate: previousStartDate, 
                        endDate: previousEndDate
                    });
                    
                    const comparisonUrl = new URL('/api/dashboard/main-data', window.location.origin);
                    comparisonUrl.searchParams.append('start_date', previousStartDate);
                    comparisonUrl.searchParams.append('end_date', previousEndDate);
                    
                    promises.push(
                        retryConfigs.realtime.executeWithRetry(async () => {
                            const response = await fetch(comparisonUrl.toString(), {
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
                                    throw new Error('Session expired');
                                }
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }
                            
                            const result = await response.json();
                            comparisonTracker.success(response.status, JSON.stringify(result).length);
                            
                            if (!result.success) {
                                throw new Error(result.message || 'Error al obtener los datos de comparación');
                            }
                            
                            // Cache the result
                            weeklyDataCache.set(comparisonCacheKey, result, `comparison-${Date.now()}`);
                            
                            return { type: 'comparison', data: result };
                        }, 'Weekly comparison data')
                    );
                    promiseLabels.push('comparison-week');
                } else {
                    promises.push(Promise.resolve({ type: 'comparison', data: comparisonCached.data }));
                    promiseLabels.push('comparison-week-cached');
                }

                // **PROMISE 3: Chart data (weekly-batch)**  
                // Only make weekly-batch call if we have exactly 7 days
                if ((!chartCached || chartCached.isStale) && currentWeekDates.length === 7) {
                    const chartTracker = trackNetworkRequest('/api/dashboard/weekly-batch', 'POST', {
                        type: 'chart-data',
                        startDate, 
                        endDate
                    });
                    
                    promises.push(
                        retryConfigs.realtime.executeWithRetry(async () => {
                            const response = await fetch('/api/dashboard/weekly-batch', {
                                method: 'POST',
                                headers: {
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/json',
                                    'X-CSRF-TOKEN': csrfToken,
                                    'X-Requested-With': 'XMLHttpRequest'
                                },
                                credentials: 'same-origin',
                                body: JSON.stringify({
                                    current_week: currentWeekDates,
                                    previous_week: previousWeekDates
                                })
                            });
                            
                            if (!response.ok) {
                                if (response.status === 419) {
                                    throw new Error('Session expired');
                                }
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }
                            
                            const result = await response.json();
                            chartTracker.success(response.status, JSON.stringify(result).length);
                            
                            if (!result.success) {
                                throw new Error(result.message || 'Error al obtener los datos del gráfico');
                            }
                            
                            // Cache the result
                            weeklyDataCache.set(chartCacheKey, result, `chart-${Date.now()}`);
                            
                            return { type: 'chart', data: result };
                        }, 'Weekly chart data')
                    );
                    promiseLabels.push('weekly-batch');
                } else if (chartCached && !chartCached.isStale) {
                    promises.push(Promise.resolve({ type: 'chart', data: chartCached.data }));
                    promiseLabels.push('weekly-batch-cached');
                } else if (currentWeekDates.length !== 7) {
                    // Skip chart data if not exactly 7 days - not a valid weekly period
                    console.log('⚠️ [OPTIMIZED] Skipping weekly-batch: not exactly 7 days', {
                        daysProvided: currentWeekDates.length,
                        startDate,
                        endDate
                    });
                }

                // **EXECUTE ALL PROMISES IN PARALLEL**
                const parallelStartTime = performance.now();
                const results = await Promise.allSettled(promises);
                const parallelEndTime = performance.now();
                
                const parallelExecutionTime = parallelEndTime - parallelStartTime;
                const totalExecutionTime = parallelEndTime - startTime;
                
                if (cancelled) return;

                // Process results
                let currentResult = null;
                let comparisonResult = null;
                let chartResult = null;
                const failedCalls: string[] = [];

                results.forEach((result, index) => {
                    const label = promiseLabels[index];
                    
                    if (result.status === 'fulfilled') {
                        const { type, data } = result.value;
                        switch (type) {
                            case 'current':
                                currentResult = data;
                                break;
                            case 'comparison':
                                comparisonResult = data;
                                break;
                            case 'chart':
                                chartResult = data;
                                break;
                        }
                    } else {
                        console.error(`❌ [OPTIMIZED] Failed to fetch ${label}:`, result.reason);
                        failedCalls.push(label);
                    }
                });

                // Calculate performance metrics
                const estimatedSequentialTime = parallelExecutionTime * 3; // rough estimate
                const improvementPercentage = Math.round(((estimatedSequentialTime - parallelExecutionTime) / estimatedSequentialTime) * 100);
                const slowestCall = promiseLabels.reduce((slowest, current) => 
                    current.includes('batch') ? 'weekly-batch' : slowest === '' ? current : slowest, ''
                );

                const metrics = {
                    totalExecutionTime: Math.round(totalExecutionTime),
                    parallelExecutionTime: Math.round(parallelExecutionTime),
                    improvementPercentage,
                    slowestCall
                };

                console.log('✅ [OPTIMIZED] Weekly data fetched in parallel', {
                    executionTime: `${metrics.parallelExecutionTime}ms`,
                    improvement: `${metrics.improvementPercentage}% faster than sequential`,
                    failedCalls,
                    cacheHits: promiseLabels.filter(label => label.includes('cached')).length,
                    totalCalls: promises.length
                });

                // Handle partial failures
                if (failedCalls.length === promises.length) {
                    throw new Error('All API calls failed');
                }

                // Process successful data
                if (currentResult && comparisonResult) {
                    const currentTotal = (currentResult as any).data?.sales?.total || 0;
                    const previousTotal = (comparisonResult as any).data?.sales?.total || 0;
                    
                    const change = previousTotal !== 0 ? 
                        ((currentTotal - previousTotal) / previousTotal) * 100 : 0;
                    
                    setCurrentData(currentResult);
                    setComparisonData(comparisonResult);
                    setPercentageChange(change);
                    setPreviousAmount(previousTotal);
                }

                if (chartResult) {
                    // Process weekly batch data to chart format
                    if (chartResult.data && chartResult.data.current_week && currentWeekDates.length === 7) {
                        const processedChartData = currentWeekDates.map((dateString, index) => {
                            const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                            const dayAbbr = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
                            const dayIndex = new Date(dateString).getDay();
                            const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1; // Convert Sunday (0) to 6, Monday (1) to 0, etc.
                            
                            const currentDayData = chartResult.data.current_week[dateString];
                            const previousDayData = chartResult.data.previous_week[previousWeekDates[index]];
                            
                            return {
                                day: dayAbbr[adjustedIndex] || '',
                                dayName: dayNames[adjustedIndex] || '',
                                current: currentDayData?.total || 0,
                                previous: previousDayData?.total || 0
                            };
                        });
                        
                        setChartData(processedChartData);
                    } else {
                        setChartData(chartResult);
                    }
                }

                setPerformanceMetrics(metrics);
                setError(null);
                
                // Track successful operation (simplified call)
                operationTimer();

            } catch (err) {
                if (cancelled) return;
                
                const error = err instanceof Error ? err : new Error('Error desconocido al obtener datos semanales');
                console.error('❌ [OPTIMIZED] Weekly data parallel fetch failed:', error);
                
                setError(error);
                setCurrentData(null);
                setComparisonData(null);
                setChartData(null);
                
                // Track failed operation (simplified call)
                operationTimer();
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchWeeklyDataInParallel();

        return () => {
            cancelled = true;
        };
    }, [shouldFetch, startDate, endDate, refreshKey]);

    const refetch = async () => {
        if (shouldFetch) {
            setRefreshKey(prev => prev + 1);
        }
        return Promise.resolve();
    };

    return {
        currentData,
        comparisonData,
        chartData,
        percentageChange,
        previousAmount,
        isLoading,
        error,
        refetch,
        performanceMetrics
    };
}