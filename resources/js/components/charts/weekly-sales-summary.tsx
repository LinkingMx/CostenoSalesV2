import { RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useMainDashboardData } from '@/hooks/use-main-dashboard-data';

interface WeeklySalesSummaryProps {
    startDate: string;
    endDate: string;
    className?: string;
}

export function WeeklySalesSummary({ startDate, endDate, className }: WeeklySalesSummaryProps) {
    // Fetch data from real API with comparison
    const {
        data: apiData,
        loading,
        error,
        percentageChange: apiPercentageChange,
        previousAmount: apiPreviousAmount,
    } = useMainDashboardData(startDate, endDate);

    // Use API data
    const totalSales = apiData?.data?.sales?.total ?? 0;
    const percentageChange = apiPercentageChange ?? 0;
    const previousAmount = apiPreviousAmount ?? 0;

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

    // Loading handled centrally in dashboard

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
                    <p>Venta Semanal:</p>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            {formatNumber(totalSales)}
                        </span>
                        {percentageChange !== 0 && (
                            <div
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium text-white ${getPercentageColor(percentageChange)}`}
                            >
                                {getPercentageArrow(percentageChange)} {Math.abs(percentageChange).toFixed(1)}%
                            </div>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-600 dark:text-slate-300">{formatNumber(previousAmount)}</span>{' '}
                        {apiPreviousAmount ? 'Misma semana anterior' : 'Comparación anterior'}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}