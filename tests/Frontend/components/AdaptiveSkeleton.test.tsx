/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AdaptiveSkeleton, LoadingSpinner, LoadingText } from '@/components/ui/adaptive-skeleton';

// Mock the UI components
jest.mock('@/components/ui/card', () => ({
    Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div data-testid="card" className={className}>{children}</div>
    ),
    CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div data-testid="card-content" className={className}>{children}</div>
    ),
    CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div data-testid="card-header" className={className}>{children}</div>
    ),
}));

jest.mock('@/components/ui/skeleton', () => ({
    Skeleton: ({ className }: { className?: string }) => (
        <div data-testid="skeleton" className={className} />
    ),
}));

jest.mock('@/lib/utils', () => ({
    cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
}));

describe('AdaptiveSkeleton Component', () => {
    describe('Chart Skeleton Type', () => {
        it('should render chart skeleton with default props', () => {
            render(<AdaptiveSkeleton type="chart" />);
            
            expect(screen.getByTestId('card')).toBeInTheDocument();
            expect(screen.getByTestId('card-header')).toBeInTheDocument();
            expect(screen.getByTestId('card-content')).toBeInTheDocument();
            
            // Should have multiple skeleton elements for chart structure
            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(10);
        });

        it('should render chart skeleton with title and legend by default', () => {
            render(<AdaptiveSkeleton type="chart" />);
            
            // Should have skeleton elements for title and legend
            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(15); // Title + legend + chart elements
        });

        it('should hide title when showTitle is false', () => {
            render(<AdaptiveSkeleton type="chart" showTitle={false} />);
            
            const header = screen.getByTestId('card-header');
            expect(header.children.length).toBe(0);
        });

        it('should hide legend when showLegend is false', () => {
            render(<AdaptiveSkeleton type="chart" showLegend={false} />);
            
            // Should have fewer skeleton elements without legend
            const skeletons = screen.getAllByTestId('skeleton');
            const headerSkeletons = screen.getByTestId('card-header').querySelectorAll('[data-testid="skeleton"]');
            
            // Should only have title skeleton, not legend skeletons
            expect(headerSkeletons.length).toBe(2); // Icon + title
        });

        it('should apply custom height to chart content', () => {
            render(<AdaptiveSkeleton type="chart" height="h-[600px]" />);
            
            const content = screen.getByTestId('card-content');
            expect(content.className).toContain('h-[600px]');
        });

        it('should apply custom className to chart', () => {
            render(<AdaptiveSkeleton type="chart" className="custom-chart-class" />);
            
            const card = screen.getByTestId('card');
            expect(card.className).toContain('custom-chart-class');
        });

        it('should render chart grid lines and axis labels', () => {
            render(<AdaptiveSkeleton type="chart" />);
            
            // Chart should have y-axis labels (6 elements)
            const content = screen.getByTestId('card-content');
            const yAxisLabels = content.querySelectorAll('.absolute.left-0 [data-testid="skeleton"]');
            expect(yAxisLabels.length).toBe(6);

            // Chart should have x-axis labels (8 elements)
            const xAxisLabels = content.querySelectorAll('.mt-2.flex.justify-between [data-testid="skeleton"]');
            expect(xAxisLabels.length).toBe(8);
        });
    });

    describe('Card Skeleton Type', () => {
        it('should render card skeleton with default props', () => {
            render(<AdaptiveSkeleton type="card" />);
            
            expect(screen.getByTestId('card')).toBeInTheDocument();
            expect(screen.getByTestId('card-content')).toBeInTheDocument();
            
            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBe(4); // Title, percentage, value, description
        });

        it('should show percentage skeleton by default', () => {
            render(<AdaptiveSkeleton type="card" />);
            
            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBe(4);
        });

        it('should hide percentage when showPercentage is false', () => {
            render(<AdaptiveSkeleton type="card" showPercentage={false} />);
            
            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBe(3); // One less for percentage
        });

        it('should apply custom className to card', () => {
            render(<AdaptiveSkeleton type="card" className="custom-card-class" />);
            
            const card = screen.getByTestId('card');
            expect(card.className).toContain('custom-card-class');
        });
    });

    describe('Accordion Skeleton Type', () => {
        it('should render accordion skeleton with default item count', () => {
            render(<AdaptiveSkeleton type="accordion" />);
            
            expect(screen.getByTestId('card')).toBeInTheDocument();
            expect(screen.getByTestId('card-header')).toBeInTheDocument();
            expect(screen.getByTestId('card-content')).toBeInTheDocument();
            
            // Default itemCount is 3, so should have 3 accordion items
            const content = screen.getByTestId('card-content');
            const accordionItems = content.querySelectorAll('.rounded-lg.border');
            expect(accordionItems.length).toBe(3);
        });

        it('should render custom number of accordion items', () => {
            render(<AdaptiveSkeleton type="accordion" itemCount={5} />);
            
            const content = screen.getByTestId('card-content');
            const accordionItems = content.querySelectorAll('.rounded-lg.border');
            expect(accordionItems.length).toBe(5);
        });

        it('should render zero accordion items when itemCount is 0', () => {
            render(<AdaptiveSkeleton type="accordion" itemCount={0} />);
            
            const content = screen.getByTestId('card-content');
            const accordionItems = content.querySelectorAll('.rounded-lg.border');
            expect(accordionItems.length).toBe(0);
        });

        it('should apply custom className to accordion', () => {
            render(<AdaptiveSkeleton type="accordion" className="custom-accordion-class" />);
            
            const card = screen.getByTestId('card');
            expect(card.className).toContain('custom-accordion-class');
        });
    });

    describe('List Skeleton Type', () => {
        it('should render list skeleton with default item count', () => {
            render(<AdaptiveSkeleton type="list" />);
            
            // Default itemCount is 3
            const listItems = screen.getByRole('generic').querySelectorAll('.flex.items-center.space-x-3');
            expect(listItems.length).toBe(3);
        });

        it('should render custom number of list items', () => {
            render(<AdaptiveSkeleton type="list" itemCount={7} />);
            
            const listItems = screen.getByRole('generic').querySelectorAll('.flex.items-center.space-x-3');
            expect(listItems.length).toBe(7);
        });

        it('should apply custom className to list', () => {
            render(<AdaptiveSkeleton type="list" className="custom-list-class" />);
            
            const list = screen.getByRole('generic');
            expect(list.className).toContain('custom-list-class');
        });

        it('should render each list item with avatar and text skeletons', () => {
            render(<AdaptiveSkeleton type="list" itemCount={1} />);
            
            // Each list item should have 3 skeletons: avatar + 2 text lines
            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBe(3);
        });
    });

    describe('Custom Skeleton Type', () => {
        it('should render custom skeleton with children', () => {
            const customContent = <div data-testid="custom-content">Custom Loading Content</div>;
            
            render(<AdaptiveSkeleton type="custom">{customContent}</AdaptiveSkeleton>);
            
            expect(screen.getByTestId('custom-content')).toBeInTheDocument();
            expect(screen.getByText('Custom Loading Content')).toBeInTheDocument();
        });

        it('should apply custom className to custom skeleton', () => {
            render(
                <AdaptiveSkeleton type="custom" className="custom-skeleton-class">
                    <div>Custom content</div>
                </AdaptiveSkeleton>
            );
            
            const customContainer = screen.getByRole('generic');
            expect(customContainer.className).toContain('custom-skeleton-class');
        });

        it('should render empty custom skeleton without children', () => {
            render(<AdaptiveSkeleton type="custom" className="empty-custom" />);
            
            const customContainer = screen.getByRole('generic');
            expect(customContainer.className).toContain('empty-custom');
            expect(customContainer.children.length).toBe(0);
        });
    });

    describe('Invalid Type Handling', () => {
        it('should return null for unknown skeleton type', () => {
            // @ts-ignore - Testing invalid type
            const { container } = render(<AdaptiveSkeleton type="invalid-type" />);
            
            expect(container.firstChild).toBeNull();
        });
    });

    describe('Accessibility and Styling', () => {
        it('should apply proper card styling for chart skeleton', () => {
            render(<AdaptiveSkeleton type="chart" />);
            
            const card = screen.getByTestId('card');
            expect(card.className).toContain('overflow-hidden');
            expect(card.className).toContain('border-0');
            expect(card.className).toContain('bg-transparent');
            expect(card.className).toContain('shadow-none');
        });

        it('should apply proper styling for accordion items', () => {
            render(<AdaptiveSkeleton type="accordion" />);
            
            const content = screen.getByTestId('card-content');
            const accordionItems = content.querySelectorAll('.rounded-lg.border');
            
            accordionItems.forEach(item => {
                expect(item.className).toContain('rounded-lg');
                expect(item.className).toContain('border');
                expect(item.className).toContain('p-4');
            });
        });

        it('should render proper structure for chart legend', () => {
            render(<AdaptiveSkeleton type="chart" showLegend={true} />);
            
            const header = screen.getByTestId('card-header');
            const legendContainer = header.querySelector('.rounded-lg.border.border-slate-200\\/30');
            
            expect(legendContainer).toBeInTheDocument();
            expect(legendContainer?.className).toContain('bg-slate-50/50');
        });
    });
});

describe('LoadingSpinner Component', () => {
    it('should render loading spinner with default styling', () => {
        render(<LoadingSpinner />);
        
        const spinner = screen.getByRole('generic');
        expect(spinner.className).toContain('flex');
        expect(spinner.className).toContain('items-center');
        expect(spinner.className).toContain('justify-center');
        
        const spinnerIcon = spinner.firstChild;
        expect(spinnerIcon).toHaveClass('animate-spin');
        expect(spinnerIcon).toHaveClass('rounded-full');
        expect(spinnerIcon).toHaveClass('border-2');
    });

    it('should apply custom className to spinner', () => {
        render(<LoadingSpinner className="custom-spinner-class" />);
        
        const spinner = screen.getByRole('generic');
        expect(spinner.className).toContain('custom-spinner-class');
    });

    it('should have proper spinner icon styling', () => {
        render(<LoadingSpinner />);
        
        const spinner = screen.getByRole('generic');
        const icon = spinner.firstChild as HTMLElement;
        
        expect(icon.className).toContain('h-6');
        expect(icon.className).toContain('w-6');
        expect(icon.className).toContain('border-primary');
        expect(icon.className).toContain('border-t-transparent');
    });
});

describe('LoadingText Component', () => {
    it('should render loading text with default message', () => {
        render(<LoadingText />);
        
        expect(screen.getByText('Cargando...')).toBeInTheDocument();
    });

    it('should render loading text with custom message', () => {
        render(<LoadingText text="Loading custom message..." />);
        
        expect(screen.getByText('Loading custom message...')).toBeInTheDocument();
        expect(screen.queryByText('Cargando...')).not.toBeInTheDocument();
    });

    it('should render loading text with spinner', () => {
        render(<LoadingText />);
        
        const container = screen.getByRole('generic');
        expect(container.className).toContain('flex');
        expect(container.className).toContain('items-center');
        expect(container.className).toContain('space-x-2');
        
        // Should contain both spinner and text
        const spinnerIcon = container.querySelector('.animate-spin');
        expect(spinnerIcon).toBeInTheDocument();
        expect(screen.getByText('Cargando...')).toBeInTheDocument();
    });

    it('should have proper text styling', () => {
        render(<LoadingText />);
        
        const text = screen.getByText('Cargando...');
        expect(text.className).toContain('text-sm');
        expect(text.className).toContain('text-muted-foreground');
    });

    it('should have proper spinner size in loading text', () => {
        render(<LoadingText />);
        
        const container = screen.getByRole('generic');
        const spinnerIcon = container.querySelector('.animate-spin') as HTMLElement;
        
        expect(spinnerIcon.className).toContain('h-4');
        expect(spinnerIcon.className).toContain('w-4');
    });
});

describe('Component Integration', () => {
    it('should work with all skeleton types in sequence', () => {
        const skeletonTypes: Array<'chart' | 'card' | 'accordion' | 'list' | 'custom'> = 
            ['chart', 'card', 'accordion', 'list', 'custom'];
        
        skeletonTypes.forEach(type => {
            const { unmount } = render(<AdaptiveSkeleton type={type} />);
            // Should render without errors
            unmount();
        });
    });

    it('should handle prop combinations correctly', () => {
        render(
            <AdaptiveSkeleton 
                type="chart" 
                className="combined-test"
                showTitle={false}
                showLegend={true}
                height="h-[800px]"
            />
        );
        
        const card = screen.getByTestId('card');
        const content = screen.getByTestId('card-content');
        
        expect(card.className).toContain('combined-test');
        expect(content.className).toContain('h-[800px]');
    });

    it('should maintain performance with large item counts', () => {
        const startTime = performance.now();
        
        render(<AdaptiveSkeleton type="accordion" itemCount={100} />);
        
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        // Should render large lists efficiently (under 100ms)
        expect(renderTime).toBeLessThan(100);
        
        // Should actually render all items
        const content = screen.getByTestId('card-content');
        const items = content.querySelectorAll('.rounded-lg.border');
        expect(items.length).toBe(100);
    });
});