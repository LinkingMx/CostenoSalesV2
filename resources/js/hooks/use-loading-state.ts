import { useState, useEffect, useRef } from 'react';

/**
 * Configuration options for loading state hooks
 */
interface UseLoadingStateOptions {
    /** Minimum time to show loading state in milliseconds (default: 500ms) */
    minimumLoadingTime?: number;
}

/**
 * Loading state result interface
 */
interface LoadingState {
    /** Raw loading state from external source */
    isLoading: boolean;
    /** Computed loading state with minimum duration applied */
    showLoading: boolean;
}

/**
 * Simple, unified loading state hook that prevents flickering and improves UX
 * 
 * This hook replaces complex loading coordinators with a simple, performant solution:
 * - Prevents loading state flickering by enforcing minimum display duration
 * - Handles memory leaks properly with timeout cleanup
 * - Provides consistent UX across all dashboard components
 * - Optimized for performance with minimal re-renders
 * 
 * @param isLoading - The raw loading state from data fetching
 * @param options - Configuration options for loading behavior
 * @returns LoadingState object with computed showLoading flag
 * 
 * @example
 * ```typescript
 * const { showLoading } = useLoadingState(query.isLoading, {
 *   minimumLoadingTime: 500 // Show loading for at least 500ms
 * });
 * 
 * if (showLoading) {
 *   return <AdaptiveSkeleton type="chart" />;
 * }
 * ```
 */
export function useLoadingState(
    isLoading: boolean, 
    options: UseLoadingStateOptions = {}
): LoadingState {
    const { minimumLoadingTime = 500 } = options;
    
    const [showLoading, setShowLoading] = useState(isLoading);
    const startTimeRef = useRef<number | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    useEffect(() => {
        if (isLoading) {
            // Starting to load
            startTimeRef.current = Date.now();
            setShowLoading(true);
        } else {
            // Finished loading - respect minimum time
            if (startTimeRef.current) {
                const elapsed = Date.now() - startTimeRef.current;
                const remainingTime = Math.max(0, minimumLoadingTime - elapsed);
                
                if (remainingTime > 0) {
                    // Clear any existing timeout
                    if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current);
                    }
                    
                    // Wait for minimum time before hiding loading
                    timeoutRef.current = setTimeout(() => {
                        setShowLoading(false);
                        timeoutRef.current = null;
                    }, remainingTime);
                } else {
                    // Minimum time already passed
                    setShowLoading(false);
                }
            } else {
                // No start time recorded, hide immediately
                setShowLoading(false);
            }
        }
        
        // Cleanup timeout on unmount or when dependencies change
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, [isLoading, minimumLoadingTime]);
    
    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);
    
    return {
        isLoading,
        showLoading
    };
}

/**
 * Hook for coordinating multiple loading states with unified UX
 * 
 * Perfect for dashboard views that need to coordinate multiple API calls
 * while maintaining a consistent loading experience. This hook:
 * - Combines multiple loading states into a single coordinated state
 * - Applies minimum loading time to prevent rapid flickering
 * - Optimizes for scenarios where multiple data sources load at different speeds
 * 
 * @param loadingStates - Array of individual loading states to coordinate
 * @param options - Configuration options for loading behavior
 * @returns LoadingState object with combined loading logic
 * 
 * @example
 * ```typescript
 * const { showLoading } = useMultipleLoadingState([
 *   dashboardQuery.isLoading,
 *   chartsQuery.isLoading,
 *   summaryQuery.isLoading
 * ], { minimumLoadingTime: 500 });
 * 
 * // Will show loading until ALL queries complete and minimum time elapses
 * ```
 */
export function useMultipleLoadingState(
    loadingStates: boolean[], 
    options: UseLoadingStateOptions = {}
): LoadingState {
    const anyLoading = loadingStates.some(state => state);
    return useLoadingState(anyLoading, options);
}

/**
 * Enhanced loading state hook with data validation and display logic
 * 
 * This hook extends the basic loading state with data-aware logic,
 * perfect for components that need to coordinate loading states with
 * actual data availability. Features:
 * - Combines loading state with data presence validation
 * - Provides shouldShow flag for conditional rendering
 * - Prevents displaying components with missing data
 * - Optimized for React component lifecycle patterns
 * 
 * @param data - The data being loaded (null/undefined indicates no data)
 * @param isLoading - Whether data is currently being fetched
 * @param options - Configuration options for loading behavior
 * @returns Extended LoadingState with data validation flags
 * 
 * @example
 * ```typescript
 * const { showLoading, shouldShow, hasData } = useDataLoadingState(
 *   chartData,
 *   query.isLoading,
 *   { minimumLoadingTime: 500 }
 * );
 * 
 * if (showLoading) return <AdaptiveSkeleton />;
 * if (!shouldShow) return <EmptyState />;
 * return <Chart data={chartData} />;
 * ```
 */
export function useDataLoadingState<T>(
    data: T | null | undefined,
    isLoading: boolean,
    options: UseLoadingStateOptions = {}
): LoadingState & { hasData: boolean; shouldShow: boolean } {
    const hasData = data != null && !isLoading;
    const { showLoading } = useLoadingState(isLoading, options);
    
    return {
        isLoading,
        showLoading,
        hasData,
        shouldShow: !showLoading && hasData
    };
}