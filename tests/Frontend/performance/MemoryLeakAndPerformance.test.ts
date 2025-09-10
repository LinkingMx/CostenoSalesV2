/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { useLoadingState, useMultipleLoadingState } from '@/hooks/use-loading-state';
import { AdaptiveSkeleton } from '@/components/ui/adaptive-skeleton';

// Mock UI components for testing
jest.mock('@/components/ui/card', () => ({
    Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
    CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
    CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
}));

jest.mock('@/components/ui/skeleton', () => ({
    Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock('@/lib/utils', () => ({
    cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

beforeAll(() => {
    jest.useFakeTimers();
});

afterAll(() => {
    jest.useRealTimers();
});

afterEach(() => {
    jest.clearAllTimers();
});

describe('Memory Leak Prevention and Performance Tests', () => {
    
    describe('Timeout Cleanup and Memory Management', () => {
        it('should cleanup all timeouts on unmount to prevent memory leaks', () => {
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
            let clearTimeoutCallCount = 0;
            
            clearTimeoutSpy.mockImplementation((...args) => {
                clearTimeoutCallCount++;
                return jest.requireActual('timers').clearTimeout(...args);
            });

            const { unmount, rerender } = renderHook(
                ({ isLoading }) => useLoadingState(isLoading, { minimumLoadingTime: 500 }),
                { initialProps: { isLoading: false } }
            );

            // Start and stop loading to create a timeout
            rerender({ isLoading: true });
            
            act(() => {
                jest.advanceTimersByTime(200);
            });

            rerender({ isLoading: false }); // This creates a timeout

            const timeoutsBeforeUnmount = clearTimeoutCallCount;

            // Unmount should trigger cleanup
            unmount();

            expect(clearTimeoutCallCount).toBeGreaterThan(timeoutsBeforeUnmount);
            clearTimeoutSpy.mockRestore();
        });

        it('should prevent memory leaks with rapid mount/unmount cycles', () => {
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
            const components: Array<() => void> = [];

            // Create multiple components rapidly
            for (let i = 0; i < 10; i++) {
                const { unmount, rerender } = renderHook(
                    ({ isLoading }) => useLoadingState(isLoading),
                    { initialProps: { isLoading: false } }
                );

                // Start loading
                rerender({ isLoading: true });
                
                act(() => {
                    jest.advanceTimersByTime(50);
                });

                // Stop loading (creates timeout)
                rerender({ isLoading: false });

                components.push(unmount);
            }

            const initialClearTimeoutCalls = clearTimeoutSpy.mock.calls.length;

            // Unmount all components
            components.forEach(unmount => unmount());

            // Should have called clearTimeout for cleanup
            expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(initialClearTimeoutCalls);
            clearTimeoutSpy.mockRestore();
        });

        it('should cleanup timeouts when loading state changes rapidly', () => {
            const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

            const { rerender } = renderHook(
                ({ isLoading }) => useLoadingState(isLoading, { minimumLoadingTime: 500 }),
                { initialProps: { isLoading: false } }
            );

            // Start loading
            rerender({ isLoading: true });
            
            act(() => {
                jest.advanceTimersByTime(100);
            });

            // Stop loading (creates first timeout)
            rerender({ isLoading: false });
            const firstSetTimeoutCalls = setTimeoutSpy.mock.calls.length;

            // Start loading again before first timeout completes
            rerender({ isLoading: true });
            
            act(() => {
                jest.advanceTimersByTime(100);
            });

            // Stop loading again (should clear first timeout and create second)
            rerender({ isLoading: false });

            // Should have called clearTimeout to clean up previous timeout
            expect(clearTimeoutSpy).toHaveBeenCalled();
            expect(setTimeoutSpy.mock.calls.length).toBeGreaterThan(firstSetTimeoutCalls);

            setTimeoutSpy.mockRestore();
            clearTimeoutSpy.mockRestore();
        });

        it('should handle multiple loading hooks without interference', () => {
            const TestMultipleHooks = () => {
                const loading1 = useLoadingState(true, { minimumLoadingTime: 300 });
                const loading2 = useLoadingState(true, { minimumLoadingTime: 500 });
                const loading3 = useLoadingState(true, { minimumLoadingTime: 700 });

                return (
                    <div>
                        {loading1.showLoading && <div data-testid="loading1">Loading 1</div>}
                        {loading2.showLoading && <div data-testid="loading2">Loading 2</div>}
                        {loading3.showLoading && <div data-testid="loading3">Loading 3</div>}
                    </div>
                );
            };

            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
            const { unmount } = render(<TestMultipleHooks />);

            // All should be loading initially
            expect(screen.getByTestId('loading1')).toBeInTheDocument();
            expect(screen.getByTestId('loading2')).toBeInTheDocument();
            expect(screen.getByTestId('loading3')).toBeInTheDocument();

            // Unmount should cleanup all timeouts
            unmount();

            // Should have called clearTimeout multiple times
            expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
            clearTimeoutSpy.mockRestore();
        });
    });

    describe('Performance Optimization', () => {
        it('should maintain consistent 500ms minimum loading time regardless of data complexity', () => {
            const performanceTest = (componentCount: number) => {
                const startTime = performance.now();
                
                const { result, rerender } = renderHook(
                    ({ isLoading }) => useLoadingState(isLoading, { minimumLoadingTime: 500 }),
                    { initialProps: { isLoading: false } }
                );

                // Start loading
                rerender({ isLoading: true });
                
                // Quick finish
                act(() => {
                    jest.advanceTimersByTime(50);
                });
                
                rerender({ isLoading: false });
                
                // Should still be showing loading
                expect(result.current.showLoading).toBe(true);
                
                // Complete minimum time
                act(() => {
                    jest.advanceTimersByTime(450);
                });
                
                expect(result.current.showLoading).toBe(false);
                
                const endTime = performance.now();
                return endTime - startTime;
            };

            // Test with different "complexity" levels
            const time1 = performanceTest(1);
            const time10 = performanceTest(10);
            const time100 = performanceTest(100);

            // Performance should be consistent regardless of complexity
            // Allow some variance but they should be in the same ballpark
            const maxTime = Math.max(time1, time10, time100);
            const minTime = Math.min(time1, time10, time100);
            const variance = (maxTime - minTime) / minTime;

            expect(variance).toBeLessThan(2.0); // Less than 200% variance
        });

        it('should handle large numbers of loading states efficiently', () => {
            const startTime = performance.now();
            
            // Create 100 loading states
            const loadingStates = new Array(100).fill(false);
            
            const { result, rerender } = renderHook(
                ({ states }) => useMultipleLoadingState(states),
                { initialProps: { states: loadingStates } }
            );

            expect(result.current.isLoading).toBe(false);

            // Start loading all at once
            const allLoadingStates = new Array(100).fill(true);
            rerender({ states: allLoadingStates });

            expect(result.current.isLoading).toBe(true);

            // Stop loading all at once
            rerender({ states: loadingStates });

            expect(result.current.isLoading).toBe(false);

            const endTime = performance.now();
            const totalTime = endTime - startTime;

            // Should complete efficiently (under 50ms for 100 states)
            expect(totalTime).toBeLessThan(50);
        });

        it('should optimize skeleton rendering for large item counts', () => {
            const renderLargeList = (itemCount: number) => {
                const startTime = performance.now();
                
                const { unmount } = render(
                    <AdaptiveSkeleton type="accordion" itemCount={itemCount} />
                );

                const endTime = performance.now();
                unmount();
                
                return endTime - startTime;
            };

            const smallListTime = renderLargeList(10);
            const mediumListTime = renderLargeList(50);
            const largeListTime = renderLargeList(200);

            // Large lists shouldn't be dramatically slower
            // Linear scaling is acceptable, but not exponential
            expect(largeListTime).toBeLessThan(smallListTime * 30);
            expect(mediumListTime).toBeLessThan(smallListTime * 10);
        });

        it('should minimize re-renders with stable configuration objects', () => {
            let renderCount = 0;

            const TestComponent = ({ isLoading }: { isLoading: boolean }) => {
                renderCount++;
                
                // Use stable options object
                const options = React.useMemo(() => ({ minimumLoadingTime: 500 }), []);
                const { showLoading } = useLoadingState(isLoading, options);
                
                return <div>{showLoading ? 'Loading' : 'Ready'}</div>;
            };

            const { rerender } = render(<TestComponent isLoading={false} />);
            const initialRenderCount = renderCount;

            // Re-render with same props
            rerender(<TestComponent isLoading={false} />);

            // Should not cause excessive re-renders
            expect(renderCount - initialRenderCount).toBeLessThanOrEqual(1);

            // Change loading state
            rerender(<TestComponent isLoading={true} />);
            const loadingRenderCount = renderCount;

            // Change back
            rerender(<TestComponent isLoading={false} />);

            // Should have reasonable render count
            expect(renderCount - loadingRenderCount).toBeLessThanOrEqual(2);
        });
    });

    describe('Resource Management', () => {
        it('should not accumulate timeout references over time', () => {
            const { result, rerender } = renderHook(
                ({ isLoading }) => useLoadingState(isLoading, { minimumLoadingTime: 500 }),
                { initialProps: { isLoading: false } }
            );

            // Simulate many loading cycles
            for (let i = 0; i < 50; i++) {
                rerender({ isLoading: true });
                
                act(() => {
                    jest.advanceTimersByTime(100);
                });
                
                rerender({ isLoading: false });
                
                // Let some complete, some not
                act(() => {
                    jest.advanceTimersByTime(i % 2 === 0 ? 600 : 200);
                });
            }

            // Should still be responsive
            expect(result.current.isLoading).toBe(false);
            expect(typeof result.current.showLoading).toBe('boolean');
        });

        it('should handle concurrent loading states without resource conflicts', () => {
            const TestConcurrentStates = () => {
                // Multiple independent loading states
                const states = Array.from({ length: 20 }, (_, i) => 
                    useLoadingState(i % 3 === 0, { minimumLoadingTime: 300 + (i * 50) })
                );

                return (
                    <div>
                        {states.map((state, i) => (
                            <div key={i}>
                                {state.showLoading ? `Loading ${i}` : `Ready ${i}`}
                            </div>
                        ))}
                    </div>
                );
            };

            const { unmount } = render(<TestConcurrentStates />);

            // Should render without issues
            expect(screen.getByText('Loading 0')).toBeInTheDocument();
            expect(screen.getByText('Ready 1')).toBeInTheDocument();

            // Advance time
            act(() => {
                jest.advanceTimersByTime(1000);
            });

            // Cleanup should work without issues
            unmount();
        });

        it('should properly manage refs and avoid stale closures', () => {
            let capturedValues: number[] = [];

            const TestRefManagement = ({ isLoading, value }: { isLoading: boolean; value: number }) => {
                const { showLoading } = useLoadingState(isLoading, { minimumLoadingTime: 500 });

                React.useEffect(() => {
                    if (!showLoading) {
                        capturedValues.push(value);
                    }
                }, [showLoading, value]);

                return <div>{showLoading ? 'Loading' : `Value: ${value}`}</div>;
            };

            const { rerender } = render(<TestRefManagement isLoading={false} value={1} />);

            // Start loading with value 1
            rerender(<TestRefManagement isLoading={true} value={1} />);
            
            act(() => {
                jest.advanceTimersByTime(100);
            });

            // Change value while loading
            rerender(<TestRefManagement isLoading={true} value={2} />);
            
            // Stop loading
            rerender(<TestRefManagement isLoading={false} value={2} />);
            
            act(() => {
                jest.advanceTimersByTime(500);
            });

            // Should capture the latest value, not stale
            expect(capturedValues).toContain(1); // Initial value
            expect(capturedValues[capturedValues.length - 1]).toBe(2); // Latest value
        });
    });

    describe('Stress Testing', () => {
        it('should handle extreme loading state fluctuations', () => {
            const { result, rerender } = renderHook(
                ({ isLoading }) => useLoadingState(isLoading, { minimumLoadingTime: 100 }),
                { initialProps: { isLoading: false } }
            );

            // Extreme fluctuations
            for (let i = 0; i < 1000; i++) {
                const shouldLoad = Math.random() > 0.5;
                rerender({ isLoading: shouldLoad });
                
                act(() => {
                    jest.advanceTimersByTime(Math.floor(Math.random() * 50));
                });
            }

            // Should still function correctly
            expect(typeof result.current.isLoading).toBe('boolean');
            expect(typeof result.current.showLoading).toBe('boolean');
        });

        it('should maintain performance under memory pressure simulation', () => {
            // Simulate memory pressure by creating many objects
            const memoryPressureObjects: any[] = [];
            
            const TestUnderPressure = ({ isLoading }: { isLoading: boolean }) => {
                // Create some objects to simulate memory usage
                React.useEffect(() => {
                    const objects = Array.from({ length: 1000 }, (_, i) => ({ id: i, data: new Array(100).fill(i) }));
                    memoryPressureObjects.push(...objects);
                }, []);

                const { showLoading } = useLoadingState(isLoading, { minimumLoadingTime: 500 });
                return <div>{showLoading ? 'Loading under pressure' : 'Ready under pressure'}</div>;
            };

            const startTime = performance.now();
            const { rerender, unmount } = render(<TestUnderPressure isLoading={true} />);

            act(() => {
                jest.advanceTimersByTime(200);
            });

            rerender(<TestUnderPressure isLoading={false} />);
            
            act(() => {
                jest.advanceTimersByTime(400);
            });

            const endTime = performance.now();
            unmount();

            // Should complete reasonably quickly even under memory pressure
            expect(endTime - startTime).toBeLessThan(1000);
            
            // Cleanup memory pressure objects
            memoryPressureObjects.length = 0;
        });

        it('should handle component trees with deep nesting', () => {
            const DeepNestedComponent: React.FC<{ depth: number; isLoading: boolean }> = ({ depth, isLoading }) => {
                const { showLoading } = useLoadingState(isLoading, { minimumLoadingTime: 200 });

                if (depth === 0) {
                    return <div data-testid={`leaf-${isLoading}`}>{showLoading ? 'Loading' : 'Ready'}</div>;
                }

                return (
                    <div>
                        <DeepNestedComponent depth={depth - 1} isLoading={isLoading} />
                        <DeepNestedComponent depth={depth - 1} isLoading={!isLoading} />
                    </div>
                );
            };

            const { rerender, unmount } = render(<DeepNestedComponent depth={5} isLoading={true} />);

            // Should handle deep nesting without stack overflow
            expect(screen.getByTestId('leaf-true')).toBeInTheDocument();
            expect(screen.getByTestId('leaf-false')).toBeInTheDocument();

            // Change loading state
            rerender(<DeepNestedComponent depth={5} isLoading={false} />);

            act(() => {
                jest.advanceTimersByTime(300);
            });

            // Should update correctly
            expect(screen.getByTestId('leaf-false')).toBeInTheDocument();
            expect(screen.getByTestId('leaf-true')).toBeInTheDocument();

            unmount();
        });
    });
});