import { Card, CardContent } from '@/components/ui/card';

interface MainDashboardData {
    success: boolean;
    message: string;
    data: {
        sales: {
            total: number;
            subtotal: number;
        };
        cards: Record<string, any>;
    };
}

interface WeeklySalesSummaryOptimizedProps {
    startDate: string;
    endDate: string;
    className?: string;
    // Props para recibir los datos ya fetched, no hacer más API calls
    currentData: MainDashboardData | null;
    comparisonData: MainDashboardData | null;
    percentageChange: number | null;
    previousAmount: number | null;
    isLoading?: boolean;
    error?: Error | null;
}

export function WeeklySalesSummaryOptimized({ 
    startDate, 
    endDate, 
    className,
    currentData,
    comparisonData,
    percentageChange,
    previousAmount,
    isLoading = false,
    error = null
}: WeeklySalesSummaryOptimizedProps) {
    // Usar datos ya fetched - NO hacer más API calls
    const totalSales = currentData?.data?.sales?.total ?? 0;
    const changePercentage = percentageChange ?? 0;
    const prevAmount = previousAmount ?? 0;

    const formatNumber = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const getPercentageColor = (percentage: number) => {
        if (percentage > 0) return 'bg-green-500';
        if (percentage < 0) return 'bg-red-500';
        return 'bg-gray-500';
    };

    const getPercentageArrow = (percentage: number) => {
        if (percentage > 0) return '↗';
        if (percentage < 0) return '↘';
        return '→';
    };

    const formatDateRange = (start: string, end: string) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        const startFormatted = startDate.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
        });
        
        const endFormatted = endDate.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
        
        return `${startFormatted} - ${endFormatted}`;
    };

    if (error) {
        return (
            <Card className={`${className} overflow-hidden border-0 bg-transparent shadow-none`}>
                <CardContent className="px-4 pt-1 pb-1">
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                                {formatNumber(0)}
                            </span>
                        </div>
                        <p className="text-sm text-red-600 dark:text-red-400">
                            Error al cargar los datos: {error.message}
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={`${className} overflow-hidden border-0 bg-transparent shadow-none`}>
            <CardContent className="px-4 pt-1 pb-1">
                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <p>Venta Semanal:</p>
                        {!isLoading && (
                            <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                                ⚡ Optimizado - Sin API calls extra
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            {formatNumber(totalSales)}
                        </span>
                        {changePercentage !== 0 && (
                            <div
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium text-white ${getPercentageColor(changePercentage)}`}
                            >
                                {getPercentageArrow(changePercentage)} {Math.abs(changePercentage).toFixed(1)}%
                            </div>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-600 dark:text-slate-300">{formatNumber(prevAmount)}</span>{' '}
                        {prevAmount ? 'Misma semana anterior' : 'Comparación anterior'}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}