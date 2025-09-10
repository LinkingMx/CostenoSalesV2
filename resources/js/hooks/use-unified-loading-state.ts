import { useState, useEffect } from 'react';
import { trackOperation } from '@/utils/performance-monitor';

interface UnifiedLoadingOptions {
    minimumLoadingTime?: number; // Minimum time to show loading (prevents flashing)
    coordinateSkeletons?: boolean; // Whether to coordinate skeleton states
    showProgressiveLoading?: boolean; // Show components progressively or all at once
    staggerDelay?: number; // Delay between component reveals in ms
}

interface LoadingState {
    showLoading: boolean;
    showSkeletons: boolean;
    loadingProgress: number;
    slowestOperation: string;
    completedOperations: string[];
    metrics: {
        totalStartTime: number;
        operationTimings: Record<string, number>;
        coordinationOverhead: number;
    };
}

interface LoadingOperations {
    [operationName: string]: boolean;
}

export function useWeeklyLoadingCoordinator(
    currentDataLoading: boolean,
    comparisonDataLoading: boolean, 
    chartDataLoading: boolean,
    options: UnifiedLoadingOptions = {}
): LoadingState & { markOperationComplete: (operation: string) => void } {
    const {
        minimumLoadingTime = 800,
        coordinateSkeletons = true,
        showProgressiveLoading = false,
        staggerDelay = 200
    } = options;

    const [showLoading, setShowLoading] = useState(false);
    const [showSkeletons, setShowSkeletons] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [slowestOperation, setSlowestOperation] = useState<string>('');
    const [completedOperations, setCompletedOperations] = useState<string[]>([]);
    const [loadingStartTime, setLoadingStartTime] = useState<number>(0);
    const [operationTimings, setOperationTimings] = useState<Record<string, number>>({});
    const [operationStartTimes, setOperationStartTimes] = useState<Record<string, number>>({});

    // Track individual loading states
    const operations: LoadingOperations = {
        'current-data': currentDataLoading,
        'comparison-data': comparisonDataLoading,
        'chart-data': chartDataLoading
    };

    const activeOperations = Object.entries(operations)
        .filter(([, isLoading]) => isLoading)
        .map(([operation]) => operation);
    
    const isAnyLoading = activeOperations.length > 0;
    const totalOperations = Object.keys(operations).length;
    const completedCount = completedOperations.length;

    useEffect(() => {
        const operationTimer = trackOperation('weekly-loading-coordination', {
            coordinateSkeletons,
            showProgressiveLoading,
            minimumLoadingTime
        });

        // Start loading coordination
        if (isAnyLoading && !showLoading) {
            const startTime = performance.now();
            setLoadingStartTime(startTime);
            setShowLoading(true);
            setShowSkeletons(true);
            setLoadingProgress(0);
            setCompletedOperations([]);
            setSlowestOperation('');

            console.log('🔄 [LOADING] Starting unified weekly loading coordination', {
                activeOperations,
                coordinateSkeletons,
                minimumLoadingTime: `${minimumLoadingTime}ms`,
                timestamp: new Date().toISOString()
            });

            // Track operation start times
            const startTimes: Record<string, number> = {};
            activeOperations.forEach(op => {
                startTimes[op] = startTime;
            });
            setOperationStartTimes(startTimes);
        }

        // Update loading progress and track completed operations
        if (showLoading) {
            const newCompletedOps: string[] = [];
            const newTimings: Record<string, number> = { ...operationTimings };
            let slowestOp = slowestOperation;
            let maxDuration = 0;

            Object.entries(operations).forEach(([operation, isLoading]) => {
                const wasLoading = !completedOperations.includes(operation);
                const justCompleted = wasLoading && !isLoading;

                if (justCompleted) {
                    const duration = performance.now() - (operationStartTimes[operation] || loadingStartTime);
                    newTimings[operation] = duration;
                    newCompletedOps.push(operation);

                    if (duration > maxDuration) {
                        maxDuration = duration;
                        slowestOp = operation;
                    }

                    console.log(`✅ [LOADING] Operation completed: ${operation} (${duration.toFixed(2)}ms)`, {
                        operation,
                        duration: `${duration.toFixed(2)}ms`,
                        totalCompleted: completedOperations.length + 1,
                        totalOperations
                    });
                }
            });

            if (newCompletedOps.length > 0) {
                setCompletedOperations(prev => [...prev, ...newCompletedOps]);
                setOperationTimings(newTimings);
                if (slowestOp) {
                    setSlowestOperation(slowestOp);
                }
            }

            // Update progress
            const currentProgress = (completedCount / totalOperations) * 100;
            setLoadingProgress(currentProgress);
        }

        // End loading coordination
        if (!isAnyLoading && showLoading) {
            const totalDuration = performance.now() - loadingStartTime;
            const shouldWaitMinimum = totalDuration < minimumLoadingTime;

            const finishLoading = () => {
                console.log('🎉 [LOADING] All weekly operations completed', {
                    totalDuration: `${totalDuration.toFixed(2)}ms`,
                    slowestOperation,
                    operationTimings,
                    coordinationOverhead: `${(totalDuration - Math.max(...Object.values(operationTimings))).toFixed(2)}ms`,
                    minimumTimeEnforced: shouldWaitMinimum
                });

                if (coordinateSkeletons) {
                    // Hide all skeletons simultaneously
                    setShowSkeletons(false);
                    
                    if (showProgressiveLoading) {
                        // Show components progressively with stagger
                        setTimeout(() => setShowLoading(false), staggerDelay * totalOperations);
                    } else {
                        // Show all components at once
                        setTimeout(() => setShowLoading(false), 100);
                    }
                } else {
                    setShowLoading(false);
                    setShowSkeletons(false);
                }

                setLoadingProgress(100);
                
                // Track successful coordination (simplified call)
                operationTimer();
            };

            if (shouldWaitMinimum) {
                const remainingTime = minimumLoadingTime - totalDuration;
                console.log(`⏱️ [LOADING] Enforcing minimum loading time (+${remainingTime.toFixed(2)}ms)`);
                setTimeout(finishLoading, remainingTime);
            } else {
                finishLoading();
            }
        }

        return () => {
            // Cleanup if component unmounts during loading (simplified call)
            if (showLoading) {
                operationTimer();
            }
        };
    }, [
        isAnyLoading, 
        showLoading, 
        completedCount, 
        currentDataLoading, 
        comparisonDataLoading, 
        chartDataLoading,
        minimumLoadingTime,
        coordinateSkeletons,
        showProgressiveLoading,
        staggerDelay
    ]);

    const markOperationComplete = (operation: string) => {
        if (!completedOperations.includes(operation)) {
            const duration = performance.now() - (operationStartTimes[operation] || loadingStartTime);
            
            setCompletedOperations(prev => [...prev, operation]);
            setOperationTimings(prev => ({ ...prev, [operation]: duration }));
            
            console.log(`🏁 [LOADING] Manually marked operation complete: ${operation} (${duration.toFixed(2)}ms)`);
        }
    };

    return {
        showLoading,
        showSkeletons: coordinateSkeletons ? showSkeletons : isAnyLoading,
        loadingProgress,
        slowestOperation,
        completedOperations,
        metrics: {
            totalStartTime: loadingStartTime,
            operationTimings,
            coordinationOverhead: loadingStartTime > 0 ? 
                (performance.now() - loadingStartTime) - Math.max(...Object.values(operationTimings)) : 0
        },
        markOperationComplete
    };
}

// Monthly Loading Coordinator - specialized version for monthly components
export function useMonthlyLoadingCoordinator(
    currentDataLoading: boolean,
    comparisonDataLoading: boolean, 
    chartDataLoading: boolean,
    options: UnifiedLoadingOptions = {}
): LoadingState & { markOperationComplete: (operation: string) => void } {
    const {
        minimumLoadingTime = 1000, // Slightly longer for monthly data
        coordinateSkeletons = true,
        showProgressiveLoading = false,
        staggerDelay = 250
    } = options;

    const [showLoading, setShowLoading] = useState(false);
    const [showSkeletons, setShowSkeletons] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [slowestOperation, setSlowestOperation] = useState<string>('');
    const [completedOperations, setCompletedOperations] = useState<string[]>([]);
    const [loadingStartTime, setLoadingStartTime] = useState<number>(0);
    const [operationTimings, setOperationTimings] = useState<Record<string, number>>({});
    const [operationStartTimes, setOperationStartTimes] = useState<Record<string, number>>({});

    // Track individual loading states for monthly operations
    const operations: LoadingOperations = {
        'current-month-data': currentDataLoading,
        'comparison-month-data': comparisonDataLoading,
        'chart-month-data': chartDataLoading
    };

    const activeOperations = Object.entries(operations)
        .filter(([, isLoading]) => isLoading)
        .map(([operation]) => operation);
    
    const isAnyLoading = activeOperations.length > 0;
    const totalOperations = Object.keys(operations).length;
    const completedCount = completedOperations.length;

    useEffect(() => {
        const operationTimer = trackOperation('monthly-loading-coordination', {
            coordinateSkeletons,
            showProgressiveLoading,
            minimumLoadingTime
        });

        // Start loading coordination
        if (isAnyLoading && !showLoading) {
            const startTime = performance.now();
            setLoadingStartTime(startTime);
            setShowLoading(true);
            setShowSkeletons(true);
            setLoadingProgress(0);
            setCompletedOperations([]);
            setSlowestOperation('');

            console.log('🔄 [MONTHLY-LOADING] Starting unified monthly loading coordination', {
                activeOperations,
                coordinateSkeletons,
                minimumLoadingTime: `${minimumLoadingTime}ms`,
                timestamp: new Date().toISOString()
            });

            // Track operation start times
            const startTimes: Record<string, number> = {};
            activeOperations.forEach(op => {
                startTimes[op] = startTime;
            });
            setOperationStartTimes(startTimes);
        }

        // Update loading progress and track completed operations
        if (showLoading) {
            const newCompletedOps: string[] = [];
            const newTimings: Record<string, number> = { ...operationTimings };
            let slowestOp = slowestOperation;
            let maxDuration = 0;

            Object.entries(operations).forEach(([operation, isLoading]) => {
                const wasLoading = !completedOperations.includes(operation);
                const justCompleted = wasLoading && !isLoading;

                if (justCompleted) {
                    const duration = performance.now() - (operationStartTimes[operation] || loadingStartTime);
                    newTimings[operation] = duration;
                    newCompletedOps.push(operation);

                    if (duration > maxDuration) {
                        maxDuration = duration;
                        slowestOp = operation;
                    }

                    console.log(`✅ [MONTHLY-LOADING] Operation completed: ${operation} (${duration.toFixed(2)}ms)`, {
                        operation,
                        duration: `${duration.toFixed(2)}ms`,
                        totalCompleted: completedOperations.length + 1,
                        totalOperations
                    });
                }
            });

            if (newCompletedOps.length > 0) {
                setCompletedOperations(prev => [...prev, ...newCompletedOps]);
                setOperationTimings(newTimings);
                if (slowestOp) {
                    setSlowestOperation(slowestOp);
                }
            }

            // Update progress
            const currentProgress = (completedCount / totalOperations) * 100;
            setLoadingProgress(currentProgress);
        }

        // End loading coordination
        if (!isAnyLoading && showLoading) {
            const totalDuration = performance.now() - loadingStartTime;
            const shouldWaitMinimum = totalDuration < minimumLoadingTime;

            const finishLoading = () => {
                console.log('🎉 [MONTHLY-LOADING] All monthly operations completed', {
                    totalDuration: `${totalDuration.toFixed(2)}ms`,
                    slowestOperation,
                    operationTimings,
                    coordinationOverhead: `${(totalDuration - Math.max(...Object.values(operationTimings))).toFixed(2)}ms`,
                    minimumTimeEnforced: shouldWaitMinimum
                });

                if (coordinateSkeletons) {
                    // Hide all skeletons simultaneously
                    setShowSkeletons(false);
                    
                    if (showProgressiveLoading) {
                        // Show components progressively with stagger
                        setTimeout(() => setShowLoading(false), staggerDelay * totalOperations);
                    } else {
                        // Show all components at once
                        setTimeout(() => setShowLoading(false), 100);
                    }
                } else {
                    setShowLoading(false);
                    setShowSkeletons(false);
                }

                setLoadingProgress(100);
                
                // Track successful coordination (simplified call)
                operationTimer();
            };

            if (shouldWaitMinimum) {
                const remainingTime = minimumLoadingTime - totalDuration;
                console.log(`⏱️ [MONTHLY-LOADING] Enforcing minimum loading time (+${remainingTime.toFixed(2)}ms)`);
                setTimeout(finishLoading, remainingTime);
            } else {
                finishLoading();
            }
        }

        return () => {
            // Cleanup if component unmounts during loading (simplified call)
            if (showLoading) {
                operationTimer();
            }
        };
    }, [
        isAnyLoading, 
        showLoading, 
        completedCount, 
        currentDataLoading, 
        comparisonDataLoading, 
        chartDataLoading,
        minimumLoadingTime,
        coordinateSkeletons,
        showProgressiveLoading,
        staggerDelay
    ]);

    const markOperationComplete = (operation: string) => {
        if (!completedOperations.includes(operation)) {
            const duration = performance.now() - (operationStartTimes[operation] || loadingStartTime);
            
            setCompletedOperations(prev => [...prev, operation]);
            setOperationTimings(prev => ({ ...prev, [operation]: duration }));
            
            console.log(`🏁 [MONTHLY-LOADING] Manually marked operation complete: ${operation} (${duration.toFixed(2)}ms)`);
        }
    };

    return {
        showLoading,
        showSkeletons: coordinateSkeletons ? showSkeletons : isAnyLoading,
        loadingProgress,
        slowestOperation,
        completedOperations,
        metrics: {
            totalStartTime: loadingStartTime,
            operationTimings,
            coordinationOverhead: loadingStartTime > 0 ? 
                (performance.now() - loadingStartTime) - Math.max(...Object.values(operationTimings)) : 0
        },
        markOperationComplete
    };
}

// Generic unified loading coordinator for any operations
export function useUnifiedLoadingState(
    operations: Record<string, boolean>,
    options: UnifiedLoadingOptions = {}
): LoadingState & { 
    markOperationComplete: (operation: string) => void;
    getOperationStatus: (operation: string) => 'loading' | 'completed' | 'not-started';
} {
    const {
        minimumLoadingTime = 500,
        coordinateSkeletons = true,
        showProgressiveLoading = false,
        staggerDelay = 150
    } = options;

    const [showLoading, setShowLoading] = useState(false);
    const [showSkeletons, setShowSkeletons] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [slowestOperation, setSlowestOperation] = useState<string>('');
    const [completedOperations, setCompletedOperations] = useState<string[]>([]);
    const [loadingStartTime, setLoadingStartTime] = useState<number>(0);
    const [operationTimings, setOperationTimings] = useState<Record<string, number>>({});
    const [previousOperations, setPreviousOperations] = useState<Record<string, boolean>>({});

    const activeOperations = Object.entries(operations)
        .filter(([, isLoading]) => isLoading)
        .map(([operation]) => operation);
    
    const isAnyLoading = activeOperations.length > 0;
    const totalOperations = Object.keys(operations).length;
    const completedCount = completedOperations.length;

    useEffect(() => {
        // Detect newly completed operations
        const newlyCompleted: string[] = [];
        const currentTime = performance.now();
        
        Object.entries(operations).forEach(([operation, isCurrentlyLoading]) => {
            const wasLoading = previousOperations[operation];
            const justCompleted = wasLoading && !isCurrentlyLoading;
            
            if (justCompleted && !completedOperations.includes(operation)) {
                const duration = loadingStartTime > 0 ? currentTime - loadingStartTime : 0;
                newlyCompleted.push(operation);
                
                setOperationTimings(prev => ({ ...prev, [operation]: duration }));
                
                console.log(`✨ [UNIFIED] Operation completed: ${operation}`, {
                    duration: `${duration.toFixed(2)}ms`,
                    progress: `${((completedOperations.length + 1) / totalOperations * 100).toFixed(1)}%`
                });
            }
        });

        if (newlyCompleted.length > 0) {
            setCompletedOperations(prev => [...prev, ...newlyCompleted]);
        }

        // Start loading if any operation becomes active
        if (isAnyLoading && !showLoading) {
            setLoadingStartTime(currentTime);
            setShowLoading(true);
            setShowSkeletons(true);
            setLoadingProgress(0);
            setCompletedOperations([]);
            setSlowestOperation('');
            
            console.log('🚀 [UNIFIED] Starting coordinated loading', {
                operations: activeOperations,
                coordinateSkeletons,
                totalOperations
            });
        }

        // End loading when all operations complete
        if (!isAnyLoading && showLoading) {
            const totalDuration = currentTime - loadingStartTime;
            const shouldWaitMinimum = totalDuration < minimumLoadingTime;

            const finishLoading = () => {
                if (coordinateSkeletons) {
                    setShowSkeletons(false);
                }
                
                setTimeout(() => {
                    setShowLoading(false);
                    setLoadingProgress(100);
                    
                    // Find slowest operation
                    const maxDuration = Math.max(...Object.values(operationTimings));
                    const slowest = Object.entries(operationTimings)
                        .find(([, duration]) => duration === maxDuration)?.[0] || '';
                    setSlowestOperation(slowest);
                    
                    console.log('🎯 [UNIFIED] All operations completed', {
                        totalDuration: `${totalDuration.toFixed(2)}ms`,
                        slowestOperation: slowest,
                        operationTimings
                    });
                }, showProgressiveLoading ? staggerDelay : 50);
            };

            if (shouldWaitMinimum) {
                setTimeout(finishLoading, minimumLoadingTime - totalDuration);
            } else {
                finishLoading();
            }
        }

        // Update progress
        const progress = totalOperations > 0 ? (completedCount / totalOperations) * 100 : 0;
        setLoadingProgress(progress);

        setPreviousOperations(operations);
    }, [operations, isAnyLoading, showLoading, completedCount, minimumLoadingTime, coordinateSkeletons]);

    const markOperationComplete = (operation: string) => {
        if (!completedOperations.includes(operation)) {
            const duration = performance.now() - loadingStartTime;
            setCompletedOperations(prev => [...prev, operation]);
            setOperationTimings(prev => ({ ...prev, [operation]: duration }));
        }
    };

    const getOperationStatus = (operation: string): 'loading' | 'completed' | 'not-started' => {
        if (completedOperations.includes(operation)) return 'completed';
        if (operations[operation]) return 'loading';
        return 'not-started';
    };

    return {
        showLoading,
        showSkeletons: coordinateSkeletons ? showSkeletons : isAnyLoading,
        loadingProgress,
        slowestOperation,
        completedOperations,
        metrics: {
            totalStartTime: loadingStartTime,
            operationTimings,
            coordinationOverhead: loadingStartTime > 0 ? 
                (performance.now() - loadingStartTime) - Math.max(...Object.values(operationTimings)) : 0
        },
        markOperationComplete,
        getOperationStatus
    };
}