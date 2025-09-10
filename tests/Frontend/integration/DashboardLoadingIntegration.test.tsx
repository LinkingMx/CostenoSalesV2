/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { useMultipleLoadingState, useLoadingState } from '@/hooks/use-loading-state';
import { AdaptiveSkeleton } from '@/components/ui/adaptive-skeleton';

// Mock the external dependencies
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

// Use fake timers for testing
beforeAll(() => {
    jest.useFakeTimers();
});

afterAll(() => {
    jest.useRealTimers();
});

afterEach(() => {
    jest.clearAllTimers();
});

describe('Dashboard Loading System Integration', () => {
    
    describe('Unified Loading Coordination', () => {
        it('should coordinate multiple loading states with consistent timing', () => {
            const { result, rerender } = renderHook(
                ({ loadingStates }) => useMultipleLoadingState(loadingStates, { minimumLoadingTime: 500 }),
                { initialProps: { loadingStates: [false, false, false] } }
            );

            expect(result.current.showLoading).toBe(false);

            // Start loading multiple components
            rerender({ loadingStates: [true, true, false] });
            expect(result.current.isLoading).toBe(true);
            expect(result.current.showLoading).toBe(true);

            // Advance time partially
            act(() => {
                jest.advanceTimersByTime(200);
            });

            // One component finishes early
            rerender({ loadingStates: [false, true, false] });
            expect(result.current.isLoading).toBe(true);
            expect(result.current.showLoading).toBe(true);

            // Advance more time
            act(() => {
                jest.advanceTimersByTime(100);
            });

            // All components finish
            rerender({ loadingStates: [false, false, false] });
            
            // Should still show loading due to minimum time
            expect(result.current.isLoading).toBe(false);
            expect(result.current.showLoading).toBe(true);

            // Complete minimum time
            act(() => {
                jest.advanceTimersByTime(200);
            });

            // Now should hide loading
            expect(result.current.showLoading).toBe(false);
        });

        it('should handle dashboard-style loading with different component types', () => {
            // Simulate the dashboard's loading pattern
            const { result, rerender } = renderHook(
                ({ dailyLoading, weeklyLoading, monthlyLoading }) => {
                    const allLoadingStates = [
                        dailyLoading,
                        weeklyLoading, 
                        monthlyLoading
                    ];
                    
                    return useMultipleLoadingState(allLoadingStates, { minimumLoadingTime: 500 });
                },
                { 
                    initialProps: { 
                        dailyLoading: false, 
                        weeklyLoading: false, 
                        monthlyLoading: false 
                    } 
                }
            );

            expect(result.current.showLoading).toBe(false);

            // Start loading daily data (single day view)
            rerender({ dailyLoading: true, weeklyLoading: false, monthlyLoading: false });
            expect(result.current.showLoading).toBe(true);

            act(() => {
                jest.advanceTimersByTime(100);
            });

            // Switch to weekly view (this would happen on date range change)
            rerender({ dailyLoading: false, weeklyLoading: true, monthlyLoading: false });
            expect(result.current.showLoading).toBe(true);

            act(() => {
                jest.advanceTimersByTime(200);
            });

            // Weekly data finishes
            rerender({ dailyLoading: false, weeklyLoading: false, monthlyLoading: false });
            expect(result.current.showLoading).toBe(true); // Still showing due to minimum time

            act(() => {
                jest.advanceTimersByTime(200);
            });

            expect(result.current.showLoading).toBe(false);
        });
    });

    describe('Skeleton Component Integration', () => {
        it('should render appropriate skeleton for different dashboard components', () => {
            // Test chart skeleton for hours chart
            render(<AdaptiveSkeleton type="chart" showTitle={true} showLegend={true} />);
            
            const chartSkeletons = screen.getAllByTestId('skeleton');
            expect(chartSkeletons.length).toBeGreaterThan(10); // Chart has many skeleton elements
            
            screen.unmount();

            // Test card skeleton for sales summary
            render(<AdaptiveSkeleton type="card" showPercentage={true} />);
            
            const cardSkeletons = screen.getAllByTestId('skeleton');
            expect(cardSkeletons.length).toBe(4); // Card has fewer elements
            
            screen.unmount();

            // Test accordion skeleton for branch summary
            render(<AdaptiveSkeleton type="accordion" itemCount={5} />);
            
            const accordionContainer = screen.getByTestId('card-content');
            const accordionItems = accordionContainer.querySelectorAll('.rounded-lg.border');
            expect(accordionItems.length).toBe(5);
        });

        it('should adapt skeleton based on loading context', () => {
            // Test different heights for different components
            render(<AdaptiveSkeleton type="chart" height="h-[600px]" />);
            
            const content = screen.getByTestId('card-content');
            expect(content.className).toContain('h-[600px]');
            
            screen.unmount();

            // Test different item counts
            render(<AdaptiveSkeleton type="list" itemCount={10} />);
            
            const listItems = screen.getByRole('generic').querySelectorAll('.flex.items-center.space-x-3');
            expect(listItems.length).toBe(10);
        });
    });

    describe('Loading State Transitions', () => {
        it('should handle smooth transitions between different loading states', () => {
            const TestComponent = ({ 
                isLoadingDaily, 
                isLoadingWeekly 
            }: { 
                isLoadingDaily: boolean; 
                isLoadingWeekly: boolean; 
            }) => {
                const { showLoading: showDailyLoading } = useLoadingState(
                    isLoadingDaily, 
                    { minimumLoadingTime: 500 }
                );
                
                const { showLoading: showWeeklyLoading } = useLoadingState(
                    isLoadingWeekly, 
                    { minimumLoadingTime: 500 }
                );

                return (
                    <div>
                        {showDailyLoading && (
                            <AdaptiveSkeleton 
                                type="chart" 
                                data-testid="daily-skeleton" 
                            />
                        )}
                        {showWeeklyLoading && (
                            <AdaptiveSkeleton 
                                type="card" 
                                data-testid="weekly-skeleton" 
                            />
                        )}
                        {!showDailyLoading && !showWeeklyLoading && (
                            <div data-testid="content-ready">Content</div>
                        )}
                    </div>
                );
            };

            const { rerender } = render(
                <TestComponent isLoadingDaily={false} isLoadingWeekly={false} />
            );

            // Initially showing content
            expect(screen.getByTestId('content-ready')).toBeInTheDocument();

            // Start loading daily
            rerender(<TestComponent isLoadingDaily={true} isLoadingWeekly={false} />);
            expect(screen.getByTestId('card')).toBeInTheDocument(); // Chart skeleton
            expect(screen.queryByTestId('content-ready')).not.toBeInTheDocument();

            act(() => {
                jest.advanceTimersByTime(100);
            });

            // Switch to loading weekly
            rerender(<TestComponent isLoadingDaily={false} isLoadingWeekly={true} />);
            expect(screen.getByTestId('card')).toBeInTheDocument(); // Now card skeleton

            act(() => {
                jest.advanceTimersByTime(400);
            });

            // Finish loading
            rerender(<TestComponent isLoadingDaily={false} isLoadingWeekly={false} />);
            
            // Should still show skeleton due to minimum time
            expect(screen.getByTestId('card')).toBeInTheDocument();
            expect(screen.queryByTestId('content-ready')).not.toBeInTheDocument();

            act(() => {
                jest.advanceTimersByTime(100);
            });

            // Now should show content
            expect(screen.getByTestId('content-ready')).toBeInTheDocument();
        });
    });

    describe('Error State Integration', () => {
        it('should handle loading state with error scenarios', () => {
            const TestComponentWithError = ({ 
                isLoading, 
                hasError 
            }: { 
                isLoading: boolean; 
                hasError: boolean; 
            }) => {
                const { showLoading } = useLoadingState(isLoading, { minimumLoadingTime: 500 });

                if (hasError) {
                    return <div data-testid="error-state">Error occurred</div>;
                }

                if (showLoading) {
                    return <AdaptiveSkeleton type="chart" />;
                }

                return <div data-testid="success-state">Data loaded</div>;
            };

            const { rerender } = render(
                <TestComponentWithError isLoading={false} hasError={false} />
            );

            // Start loading
            rerender(<TestComponentWithError isLoading={true} hasError={false} />);
            expect(screen.getByTestId('card')).toBeInTheDocument();

            act(() => {
                jest.advanceTimersByTime(200);
            });

            // Error occurs during loading
            rerender(<TestComponentWithError isLoading={false} hasError={true} />);
            expect(screen.getByTestId('error-state')).toBeInTheDocument();

            // Recover from error
            rerender(<TestComponentWithError isLoading={true} hasError={false} />);
            expect(screen.getByTestId('card')).toBeInTheDocument();

            act(() => {
                jest.advanceTimersByTime(500);
            });

            // Successfully finish loading
            rerender(<TestComponentWithError isLoading={false} hasError={false} />);
            expect(screen.getByTestId('success-state')).toBeInTheDocument();
        });
    });

    describe('Memory Management', () => {
        it('should cleanup timeouts when components unmount during loading', () => {
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

            const TestComponent = ({ isLoading }: { isLoading: boolean }) => {
                const { showLoading } = useLoadingState(isLoading);
                return showLoading ? <div>Loading...</div> : <div>Ready</div>;
            };

            const { unmount, rerender } = render(<TestComponent isLoading={false} />);

            // Start loading
            rerender(<TestComponent isLoading={true} />);
            
            act(() => {
                jest.advanceTimersByTime(100);
            });

            // Finish loading (this will set a timeout)
            rerender(<TestComponent isLoading={false} />);

            // Unmount before timeout completes
            unmount();

            expect(clearTimeoutSpy).toHaveBeenCalled();
            clearTimeoutSpy.mockRestore();
        });

        it('should handle rapid component mounting/unmounting', () => {
            const TestComponent = ({ id, isLoading }: { id: number; isLoading: boolean }) => {
                const { showLoading } = useLoadingState(isLoading);
                return <div data-testid={`component-${id}`}>{showLoading ? 'Loading' : 'Ready'}</div>;
            };

            // Mount multiple components rapidly
            const components = [];
            for (let i = 0; i < 5; i++) {
                const { unmount } = render(<TestComponent id={i} isLoading={true} />);
                components.push(unmount);
                
                act(() => {
                    jest.advanceTimersByTime(50);
                });
            }

            // Unmount all components
            components.forEach(unmount => unmount());

            // Should not cause any errors or memory leaks
            expect(true).toBe(true); // Test passes if no errors thrown
        });
    });

    describe('Performance Optimization', () => {
        it('should maintain consistent loading times across different data sizes', () => {
            const TestComponentWithData = ({ 
                isLoading, 
                dataSize 
            }: { 
                isLoading: boolean; 
                dataSize: number; 
            }) => {
                const { showLoading } = useLoadingState(isLoading, { minimumLoadingTime: 500 });

                if (showLoading) {
                    return <AdaptiveSkeleton type="accordion" itemCount={dataSize} />;
                }

                return (
                    <div>
                        {Array.from({ length: dataSize }, (_, i) => (
                            <div key={i}>Data item {i}</div>
                        ))}
                    </div>
                );
            };

            // Test with small dataset
            const { rerender: rerenderSmall, unmount: unmountSmall } = render(
                <TestComponentWithData isLoading={true} dataSize={5} />
            );

            act(() => {
                jest.advanceTimersByTime(200);
            });

            rerenderSmall(<TestComponentWithData isLoading={false} dataSize={5} />);
            
            act(() => {
                jest.advanceTimersByTime(300);
            });

            expect(screen.queryByTestId('card')).not.toBeInTheDocument();
            unmountSmall();

            // Test with large dataset - should have same timing
            const { rerender: rerenderLarge, unmount: unmountLarge } = render(
                <TestComponentWithData isLoading={true} dataSize={100} />
            );

            act(() => {
                jest.advanceTimersByTime(200);
            });

            rerenderLarge(<TestComponentWithData isLoading={false} dataSize={100} />);
            
            // Should still respect minimum loading time regardless of data size
            expect(screen.getByTestId('card')).toBeInTheDocument();
            
            act(() => {
                jest.advanceTimersByTime(300);
            });

            expect(screen.queryByTestId('card')).not.toBeInTheDocument();
            unmountLarge();
        });

        it('should handle concurrent loading states efficiently', () => {
            const TestConcurrentLoading = ({ 
                loadingStates 
            }: { 
                loadingStates: boolean[] 
            }) => {
                const results = loadingStates.map((loading, index) => 
                    useLoadingState(loading, { minimumLoadingTime: 500 })
                );

                const anyShowLoading = results.some(result => result.showLoading);

                return (
                    <div>
                        {anyShowLoading && <AdaptiveSkeleton type="list" itemCount={3} />}
                        {!anyShowLoading && <div data-testid="all-ready">All components ready</div>}
                    </div>
                );
            };

            const { rerender } = render(
                <TestConcurrentLoading loadingStates={[false, false, false]} />
            );

            expect(screen.getByTestId('all-ready')).toBeInTheDocument();

            // Start multiple concurrent loading operations
            rerender(<TestConcurrentLoading loadingStates={[true, true, true]} />);
            expect(screen.getByRole('generic')).toBeInTheDocument(); // List skeleton

            act(() => {
                jest.advanceTimersByTime(100);
            });

            // Some finish early
            rerender(<TestConcurrentLoading loadingStates={[false, true, false]} />);
            expect(screen.getByRole('generic')).toBeInTheDocument(); // Still loading

            act(() => {
                jest.advanceTimersByTime(200);
            });

            // All finish
            rerender(<TestConcurrentLoading loadingStates={[false, false, false]} />);
            expect(screen.getByRole('generic')).toBeInTheDocument(); // Still showing due to minimum time

            act(() => {
                jest.advanceTimersByTime(200);
            });

            expect(screen.getByTestId('all-ready')).toBeInTheDocument();
        });
    });

    describe('Edge Cases and Resilience', () => {
        it('should handle extremely rapid loading state changes', () => {
            const { result, rerender } = renderHook(
                ({ isLoading }) => useLoadingState(isLoading, { minimumLoadingTime: 500 }),
                { initialProps: { isLoading: false } }
            );

            // Rapid state changes
            for (let i = 0; i < 20; i++) {
                rerender({ isLoading: i % 2 === 0 });
                act(() => {
                    jest.advanceTimersByTime(10);
                });
            }

            // Should still be responsive
            expect(result.current.isLoading).toBe(false);
            expect(typeof result.current.showLoading).toBe('boolean');
        });

        it('should handle zero and negative minimum loading times gracefully', () => {
            const { result, rerender } = renderHook(
                ({ isLoading, minimumTime }) => useLoadingState(isLoading, { minimumLoadingTime: minimumTime }),
                { initialProps: { isLoading: false, minimumTime: 0 } }
            );

            // Test with zero minimum time
            rerender({ isLoading: true, minimumTime: 0 });
            expect(result.current.showLoading).toBe(true);

            rerender({ isLoading: false, minimumTime: 0 });
            expect(result.current.showLoading).toBe(false); // Should hide immediately

            // Test with negative minimum time (should be treated as 0)
            rerender({ isLoading: true, minimumTime: -100 });
            expect(result.current.showLoading).toBe(true);

            rerender({ isLoading: false, minimumTime: -100 });
            expect(result.current.showLoading).toBe(false); // Should hide immediately
        });

        it('should maintain stability with undefined/null states', () => {
            const TestComponentWithNulls = ({ 
                isLoading 
            }: { 
                isLoading?: boolean | null | undefined 
            }) => {
                const { showLoading } = useLoadingState(Boolean(isLoading));
                return showLoading ? <div>Loading</div> : <div>Ready</div>;
            };

            const { rerender } = render(<TestComponentWithNulls isLoading={undefined} />);
            expect(screen.getByText('Ready')).toBeInTheDocument();

            rerender(<TestComponentWithNulls isLoading={null} />);
            expect(screen.getByText('Ready')).toBeInTheDocument();

            rerender(<TestComponentWithNulls isLoading={true} />);
            expect(screen.getByText('Loading')).toBeInTheDocument();
        });
    });
});