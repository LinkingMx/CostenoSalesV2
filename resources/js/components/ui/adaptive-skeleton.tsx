import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type SkeletonType = 'chart' | 'card' | 'accordion' | 'list' | 'custom';

interface AdaptiveSkeletonProps {
    type: SkeletonType;
    className?: string;
    // Chart skeleton props
    showTitle?: boolean;
    showLegend?: boolean;
    height?: string;
    // Card skeleton props  
    showPercentage?: boolean;
    // Accordion/list skeleton props
    itemCount?: number;
    // Custom skeleton props
    children?: React.ReactNode;
}

export function AdaptiveSkeleton({ 
    type,
    className,
    showTitle = true,
    showLegend = true,
    height = "h-[400px]",
    showPercentage = true,
    itemCount = 3,
    children
}: AdaptiveSkeletonProps) {
    
    if (type === 'chart') {
        return (
            <Card className={cn("overflow-hidden border-0 bg-transparent shadow-none", className)}>
                <CardHeader className="px-4 pt-3 pb-1">
                    {showTitle && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-5 w-5 rounded-full" />
                                <Skeleton className="h-6 w-48" />
                            </div>
                            
                            {showLegend && (
                                <div className="flex items-center justify-center gap-8 rounded-lg border border-slate-200/30 bg-slate-50/50 px-4 py-3 dark:border-slate-700/30 dark:bg-slate-800/20">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="flex items-center gap-1.5">
                                            <Skeleton className="h-3 w-3 rounded-full" />
                                            <Skeleton className="h-4 w-16" />
                                        </div>
                                        <Skeleton className="h-5 w-12" />
                                    </div>
                                    <div className="h-8 w-px bg-slate-300 dark:bg-slate-600"></div>
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="flex items-center gap-1.5">
                                            <Skeleton className="h-3 w-3 rounded-full" />
                                            <Skeleton className="h-4 w-20" />
                                        </div>
                                        <Skeleton className="h-5 w-12" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardHeader>
                <CardContent className={cn("px-4 pb-4", height)}>
                    <div className="relative h-full w-full">
                        {/* Grid lines - matching actual chart */}
                        <div className="absolute inset-0">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} 
                                    className="absolute w-full border-t border-slate-200/50 dark:border-slate-700/50" 
                                    style={{ top: `${i * 25}%` }} 
                                />
                            ))}
                        </div>
                        
                        {/* Animated dual line placeholders */}
                        <div className="absolute inset-0">
                            {/* Primary line skeleton */}
                            <div className="absolute inset-0 flex items-center" style={{ top: '40%' }}>
                                <div className="relative h-px w-full overflow-hidden">
                                    <div 
                                        className="absolute left-0 top-0 h-1 w-full rounded-full animate-pulse"
                                        style={{ 
                                            transform: 'scaleY(4)',
                                            background: 'linear-gradient(90deg, transparent 0%, hsl(var(--chart-1) / 0.4) 20%, hsl(var(--chart-1) / 0.7) 50%, hsl(var(--chart-1) / 0.4) 80%, transparent 100%)'
                                        }} 
                                    />
                                </div>
                            </div>
                            
                            {/* Secondary line skeleton */}
                            <div className="absolute inset-0 flex items-center" style={{ top: '60%' }}>
                                <div className="relative h-px w-full overflow-hidden">
                                    <div 
                                        className="absolute left-0 top-0 h-1 w-full rounded-full animate-pulse"
                                        style={{ 
                                            transform: 'scaleY(3)',
                                            background: 'linear-gradient(90deg, transparent 0%, hsl(var(--chart-2) / 0.3) 20%, hsl(var(--chart-2) / 0.5) 50%, hsl(var(--chart-2) / 0.3) 80%, transparent 100%)',
                                            animationDelay: '0.2s'
                                        }} 
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {/* X-axis labels - 24 hour markers */}
                        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <Skeleton key={i} className="h-3 w-6" />
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (type === 'card') {
        return (
            <Card className={cn("p-4", className)}>
                <CardContent className="p-0 space-y-3">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-24" />
                        {showPercentage && <Skeleton className="h-4 w-12" />}
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (type === 'accordion') {
        return (
            <Card className={cn("overflow-hidden border-0 bg-transparent shadow-none", className)}>
                <CardHeader className="px-4 pt-3 pb-1">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-5 rounded-full" />
                        <Skeleton className="h-6 w-40" />
                    </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                    <div className="space-y-2">
                        {Array.from({ length: itemCount }).map((_, i) => (
                            <div key={i} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-4 w-4" />
                                        <Skeleton className="h-4 w-32" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-4 w-16" />
                                        <Skeleton className="h-4 w-4" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (type === 'list') {
        return (
            <div className={cn("space-y-3", className)}>
                {Array.from({ length: itemCount }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (type === 'custom') {
        return (
            <div className={className}>
                {children}
            </div>
        );
    }

    return null;
}

// Simple loading spinner for inline use
export function LoadingSpinner({ className }: { className?: string }) {
    return (
        <div className={cn("flex items-center justify-center", className)}>
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
    );
}

// Loading state for text
export function LoadingText({ text = "Cargando..." }: { text?: string }) {
    return (
        <div className="flex items-center space-x-2">
            <LoadingSpinner className="h-4 w-4" />
            <span className="text-sm text-muted-foreground">{text}</span>
        </div>
    );
}