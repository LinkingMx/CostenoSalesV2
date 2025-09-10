import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useMainDashboardData } from '@/hooks/use-main-dashboard-data';
import { cn } from '@/lib/utils';

interface WeeklySalesSummaryProps {
    startDate: string;
    endDate: string;
    className?: string;
}

export function WeeklySalesSummary({ startDate, endDate, className }: WeeklySalesSummaryProps) {
    // Fetch data from real API with comparison
    const {
        data: apiData,
        error,
        percentageChange: apiPercentageChange,
        previousAmount: apiPreviousAmount,
    } = useMainDashboardData(startDate, endDate);

    // Use API data
    const totalSales = apiData?.data?.sales?.total ?? 0;
    const subtotal = apiData?.data?.sales?.subtotal ?? 0;
    const percentageChange = apiPercentageChange ?? 0;
    const previousAmount = apiPreviousAmount ?? 0;

    // Determinar color e icono del trend basado en el cambio porcentual
    const getTrendInfo = () => {
        if (percentageChange === null || percentageChange === undefined) {
            return { icon: Minus, color: 'text-gray-500', bgColor: 'bg-gray-50 dark:bg-gray-900' };
        }

        if (percentageChange > 0) {
            return { 
                icon: TrendingUp, 
                color: 'text-green-600 dark:text-green-400', 
                bgColor: 'bg-green-50 dark:bg-green-900/20' 
            };
        } else if (percentageChange < 0) {
            return { 
                icon: TrendingDown, 
                color: 'text-red-600 dark:text-red-400', 
                bgColor: 'bg-red-50 dark:bg-red-900/20' 
            };
        } else {
            return { icon: Minus, color: 'text-gray-500', bgColor: 'bg-gray-50 dark:bg-gray-900' };
        }
    };

    const { icon: TrendIcon, color: trendColor, bgColor: trendBgColor } = getTrendInfo();

    // Formatear números
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatPercentage = (value: number | null) => {
        if (value === null || value === undefined) return 'N/A';
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(1)}%`;
    };


    // Loading handled centrally in dashboard

    if (error) {
        return (
            <Card className={cn('border-red-200 dark:border-red-800', className)}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-red-600 dark:text-red-400">
                        Error en Resumen Semanal
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-red-600 dark:text-red-400">
                        {error.message || 'Error al cargar los datos del resumen semanal'}
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn('w-full', className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Resumen de Ventas Semanal
                </CardTitle>
                <div className={cn('rounded-full p-2', trendBgColor)}>
                    <TrendIcon className={cn('h-4 w-4', trendColor)} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {/* Ventas Totales */}
                    <div>
                        <div className="text-2xl font-bold">
                            {formatCurrency(totalSales)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total del {startDate} al {endDate}
                        </p>
                    </div>

                    {/* Subtotal */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Subtotal:</span>
                        <span className="text-sm font-medium">
                            {formatCurrency(subtotal)}
                        </span>
                    </div>

                    {/* Comparación con semana anterior */}
                    <div className="flex items-center space-x-2 pt-2 border-t">
                        <TrendIcon className={cn('h-4 w-4', trendColor)} />
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                    vs. semana anterior
                                </span>
                                <span className={cn('text-xs font-medium', trendColor)}>
                                    {formatPercentage(percentageChange)}
                                </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Anterior: {formatCurrency(previousAmount)}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}