/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { useLoadingState, useMultipleLoadingState, useDataLoadingState } from '@/hooks/use-loading-state';

// Mock timer functions for controlled testing
beforeAll(() => {
    jest.useFakeTimers();
});

afterAll(() => {
    jest.useRealTimers();
});

afterEach(() => {
    jest.clearAllTimers();
});

describe('useLoadingState Hook', () => {
    describe('Basic Functionality', () => {
        it('should initialize with loading state matching input', () => {
            const { result } = renderHook(() => useLoadingState(true));
            
            expect(result.current.isLoading).toBe(true);
            expect(result.current.showLoading).toBe(true);
        });

        it('should initialize with non-loading state', () => {
            const { result } = renderHook(() => useLoadingState(false));
            
            expect(result.current.isLoading).toBe(false);
            expect(result.current.showLoading).toBe(false);
        });

        it('should show loading immediately when loading starts', () => {
            const { result, rerender } = renderHook(
                ({ isLoading }) => useLoadingState(isLoading),
                { initialProps: { isLoading: false } }
            );

            expect(result.current.showLoading).toBe(false);

            rerender({ isLoading: true });

            expect(result.current.showLoading).toBe(true);
            expect(result.current.isLoading).toBe(true);
        });

        it('should respect minimum loading time when hiding loading', () => {
            const { result, rerender } = renderHook(
                ({ isLoading }) => useLoadingState(isLoading, { minimumLoadingTime: 500 }),
                { initialProps: { isLoading: false } }
            );

            // Start loading
            rerender({ isLoading: true });
            expect(result.current.showLoading).toBe(true);

            // Finish loading quickly (before minimum time)
            act(() => {
                jest.advanceTimersByTime(100); // Only 100ms elapsed
            });

            rerender({ isLoading: false });

            // Should still show loading (minimum time not met)
            expect(result.current.showLoading).toBe(true);

            // Advance to minimum time
            act(() => {
                jest.advanceTimersByTime(400); // Total 500ms
            });

            // Now should hide loading
            expect(result.current.showLoading).toBe(false);
        });

        it('should hide loading immediately if minimum time already passed', () => {
            const { result, rerender } = renderHook(
                ({ isLoading }) => useLoadingState(isLoading, { minimumLoadingTime: 500 }),
                { initialProps: { isLoading: false } }
            );

            // Start loading
            rerender({ isLoading: true });

            // Wait longer than minimum time
            act(() => {
                jest.advanceTimersByTime(600);
            });

            // Finish loading
            rerender({ isLoading: false });

            // Should hide immediately since minimum time passed
            expect(result.current.showLoading).toBe(false);
        });
    });

    describe('Minimum Loading Time Options', () => {
        it('should use default minimum time of 500ms', () => {
            const { result, rerender } = renderHook(
                ({ isLoading }) => useLoadingState(isLoading),
                { initialProps: { isLoading: false } }
            );

            rerender({ isLoading: true });
            
            act(() => {
                jest.advanceTimersByTime(100);
            });

            rerender({ isLoading: false });
            expect(result.current.showLoading).toBe(true);

            act(() => {
                jest.advanceTimersByTime(400); // Total 500ms
            });

            expect(result.current.showLoading).toBe(false);
        });

        it('should respect custom minimum loading time', () => {
            const { result, rerender } = renderHook(
                ({ isLoading }) => useLoadingState(isLoading, { minimumLoadingTime: 1000 }),
                { initialProps: { isLoading: false } }
            );

            rerender({ isLoading: true });
            
            act(() => {
                jest.advanceTimersByTime(100);
            });

            rerender({ isLoading: false });
            expect(result.current.showLoading).toBe(true);

            // Should still be loading after 500ms (default time)
            act(() => {
                jest.advanceTimersByTime(400);
            });
            expect(result.current.showLoading).toBe(true);

            // Should hide after custom time (1000ms total)
            act(() => {
                jest.advanceTimersByTime(500);
            });
            expect(result.current.showLoading).toBe(false);
        });

        it('should handle zero minimum loading time', () => {
            const { result, rerender } = renderHook(
                ({ isLoading }) => useLoadingState(isLoading, { minimumLoadingTime: 0 }),
                { initialProps: { isLoading: false } }
            );

            rerender({ isLoading: true });
            rerender({ isLoading: false });

            // Should hide immediately with zero minimum time
            expect(result.current.showLoading).toBe(false);
        });
    });

    describe('Memory Leak Prevention', () => {
        it('should cleanup timeout on unmount', () => {
            const { result, rerender, unmount } = renderHook(
                ({ isLoading }) => useLoadingState(isLoading),
                { initialProps: { isLoading: false } }
            );

            // Start loading and finish quickly
            rerender({ isLoading: true });
            
            act(() => {
                jest.advanceTimersByTime(100);
            });

            rerender({ isLoading: false });
            expect(result.current.showLoading).toBe(true);

            // Spy on clearTimeout to verify cleanup
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

            // Unmount before timeout completes
            unmount();

            expect(clearTimeoutSpy).toHaveBeenCalled();
            clearTimeoutSpy.mockRestore();
        });

        it('should clear previous timeout when loading state changes rapidly', () => {
            const { result, rerender } = renderHook(
                ({ isLoading }) => useLoadingState(isLoading),
                { initialProps: { isLoading: false } }
            );

            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

            // First loading cycle
            rerender({ isLoading: true });
            act(() => {
                jest.advanceTimersByTime(100);
            });
            rerender({ isLoading: false });

            // Second loading cycle before first timeout completes
            rerender({ isLoading: true });
            act(() => {
                jest.advanceTimersByTime(100);
            });
            rerender({ isLoading: false });

            // Should have cleared previous timeout
            expect(clearTimeoutSpy).toHaveBeenCalled();
            clearTimeoutSpy.mockRestore();
        });

        it('should handle multiple rapid state changes without memory leaks', () => {
            const { result, rerender } = renderHook(
                ({ isLoading }) => useLoadingState(isLoading),
                { initialProps: { isLoading: false } }
            );

            // Simulate rapid state changes
            for (let i = 0; i < 10; i++) {
                rerender({ isLoading: true });
                act(() => {
                    jest.advanceTimersByTime(50);
                });
                rerender({ isLoading: false });
            }

            // Should still be responsive after rapid changes
            expect(result.current.isLoading).toBe(false);
        });
    });

    describe('Edge Cases', () => {
        it('should handle case where no start time is recorded', () => {
            const { result, rerender } = renderHook(
                ({ isLoading }) => useLoadingState(isLoading),
                { initialProps: { isLoading: false } }
            );

            // Finish loading without starting (edge case)
            rerender({ isLoading: false });

            expect(result.current.showLoading).toBe(false);
        });

        it('should handle negative remaining time gracefully', () => {
            // This tests the Math.max(0, remainingTime) logic
            const { result, rerender } = renderHook(
                ({ isLoading }) => useLoadingState(isLoading, { minimumLoadingTime: 100 }),
                { initialProps: { isLoading: false } }
            );

            rerender({ isLoading: true });
            
            // Wait much longer than minimum time
            act(() => {
                jest.advanceTimersByTime(1000);
            });

            rerender({ isLoading: false });

            // Should hide immediately (negative remaining time)
            expect(result.current.showLoading).toBe(false);
        });
    });
});

describe('useMultipleLoadingState Hook', () => {
    it('should return loading when any state is loading', () => {
        const { result, rerender } = renderHook(
            ({ states }) => useMultipleLoadingState(states),
            { initialProps: { states: [false, false, false] } }
        );

        expect(result.current.isLoading).toBe(false);
        expect(result.current.showLoading).toBe(false);

        // One loading state becomes true
        rerender({ states: [false, true, false] });

        expect(result.current.isLoading).toBe(true);
        expect(result.current.showLoading).toBe(true);
    });

    it('should return false when all states are false', () => {
        const { result } = renderHook(() => 
            useMultipleLoadingState([false, false, false])
        );

        expect(result.current.isLoading).toBe(false);
        expect(result.current.showLoading).toBe(false);
    });

    it('should return true when multiple states are loading', () => {
        const { result } = renderHook(() => 
            useMultipleLoadingState([true, false, true])
        );

        expect(result.current.isLoading).toBe(true);
        expect(result.current.showLoading).toBe(true);
    });

    it('should respect minimum loading time with multiple states', () => {
        const { result, rerender } = renderHook(
            ({ states }) => useMultipleLoadingState(states, { minimumLoadingTime: 500 }),
            { initialProps: { states: [false, false] } }
        );

        // Start loading
        rerender({ states: [true, false] });
        expect(result.current.showLoading).toBe(true);

        act(() => {
            jest.advanceTimersByTime(100);
        });

        // Stop all loading
        rerender({ states: [false, false] });
        expect(result.current.showLoading).toBe(true); // Still showing due to minimum time

        act(() => {
            jest.advanceTimersByTime(400);
        });

        expect(result.current.showLoading).toBe(false);
    });

    it('should handle empty loading states array', () => {
        const { result } = renderHook(() => useMultipleLoadingState([]));

        expect(result.current.isLoading).toBe(false);
        expect(result.current.showLoading).toBe(false);
    });
});

describe('useDataLoadingState Hook', () => {
    it('should detect when data is available', () => {
        const mockData = { id: 1, name: 'Test' };
        
        const { result } = renderHook(() => 
            useDataLoadingState(mockData, false)
        );

        expect(result.current.hasData).toBe(true);
        expect(result.current.shouldShow).toBe(true);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.showLoading).toBe(false);
    });

    it('should detect when data is not available', () => {
        const { result } = renderHook(() => 
            useDataLoadingState(null, false)
        );

        expect(result.current.hasData).toBe(false);
        expect(result.current.shouldShow).toBe(false);
    });

    it('should handle loading state with data', () => {
        const mockData = { id: 1, name: 'Test' };
        
        const { result } = renderHook(() => 
            useDataLoadingState(mockData, true)
        );

        expect(result.current.hasData).toBe(false); // Data present but loading
        expect(result.current.shouldShow).toBe(false);
        expect(result.current.isLoading).toBe(true);
        expect(result.current.showLoading).toBe(true);
    });

    it('should handle undefined data', () => {
        const { result } = renderHook(() => 
            useDataLoadingState(undefined, false)
        );

        expect(result.current.hasData).toBe(false);
        expect(result.current.shouldShow).toBe(false);
    });

    it('should handle loading transition with minimum time', () => {
        const { result, rerender } = renderHook(
            ({ data, loading }) => useDataLoadingState(data, loading, { minimumLoadingTime: 500 }),
            { initialProps: { data: null, loading: true } }
        );

        expect(result.current.showLoading).toBe(true);
        expect(result.current.shouldShow).toBe(false);

        act(() => {
            jest.advanceTimersByTime(100);
        });

        // Data arrives quickly
        const mockData = { id: 1, name: 'Test' };
        rerender({ data: mockData, loading: false });

        // Should still be showing loading due to minimum time
        expect(result.current.showLoading).toBe(true);
        expect(result.current.shouldShow).toBe(false);

        act(() => {
            jest.advanceTimersByTime(400);
        });

        // Now should show data
        expect(result.current.showLoading).toBe(false);
        expect(result.current.shouldShow).toBe(true);
        expect(result.current.hasData).toBe(true);
    });

    it('should handle empty array as valid data', () => {
        const emptyArray: any[] = [];
        
        const { result } = renderHook(() => 
            useDataLoadingState(emptyArray, false)
        );

        expect(result.current.hasData).toBe(true); // Empty array is valid data
        expect(result.current.shouldShow).toBe(true);
    });

    it('should handle empty object as valid data', () => {
        const emptyObject = {};
        
        const { result } = renderHook(() => 
            useDataLoadingState(emptyObject, false)
        );

        expect(result.current.hasData).toBe(true); // Empty object is valid data
        expect(result.current.shouldShow).toBe(true);
    });

    it('should handle zero as valid data', () => {
        const { result } = renderHook(() => 
            useDataLoadingState(0, false)
        );

        expect(result.current.hasData).toBe(true); // Zero is valid data
        expect(result.current.shouldShow).toBe(true);
    });

    it('should handle empty string as valid data', () => {
        const { result } = renderHook(() => 
            useDataLoadingState('', false)
        );

        expect(result.current.hasData).toBe(true); // Empty string is valid data
        expect(result.current.shouldShow).toBe(true);
    });
});

describe('Hook Performance and Stability', () => {
    it('should not cause unnecessary re-renders with stable options', () => {
        const options = { minimumLoadingTime: 500 };
        let renderCount = 0;

        const { rerender } = renderHook(
            ({ isLoading }) => {
                renderCount++;
                return useLoadingState(isLoading, options);
            },
            { initialProps: { isLoading: false } }
        );

        const initialRenderCount = renderCount;

        // Re-render with same props
        rerender({ isLoading: false });

        // Should not cause additional renders beyond React's normal behavior
        expect(renderCount).toBeLessThanOrEqual(initialRenderCount + 1);
    });

    it('should handle rapid loading state changes efficiently', () => {
        const { result, rerender } = renderHook(
            ({ isLoading }) => useLoadingState(isLoading),
            { initialProps: { isLoading: false } }
        );

        // Rapid state changes
        const changes = [true, false, true, false, true, false];
        
        changes.forEach((loading) => {
            rerender({ isLoading: loading });
            act(() => {
                jest.advanceTimersByTime(10);
            });
        });

        // Should still be responsive
        expect(result.current.isLoading).toBe(false);
    });
});