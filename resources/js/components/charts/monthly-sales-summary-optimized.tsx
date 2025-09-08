import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MainDashboardData {
    success: boolean;
    message: string;
    data: {
        sales: {
            total: number;
            subtotal: number;
        };
        cards: Record<string, {
            open_accounts: {
                total: number;
                money: number;
            };
            closed_ticket: {
                total: number;
                money: number;
            };
            average_ticket: number;
            percentage: {
                icon: string;
                qty: string;
            };
            date: string;
            store_id: number;
        }>;
    };
}

interface MonthlySalesSummaryOptimizedProps {
    startDate: string;
    endDate: string;
    className?: string;
    // Props para recibir los datos ya fetched de useSharedMonthlyData
    currentData: MainDashboardData | null;
    comparisonData: MainDashboardData | null;
    percentageChange: number | null;
    previousAmount: number;
    isLoading?: boolean;
    error?: Error | null;
}

/**
 * Componente Monthly Sales Summary OPTIMIZADO
 * 
 * ✅ ANTES: 2 API calls individuales
 * ✅ DESPUÉS: 0 API calls - usa datos compartidos de useSharedMonthlyData
 * 
 * Este componente consume los datos ya fetched por useSharedMonthlyData
 * y NO hace llamadas API adicionales.
 */
export function MonthlySalesSummaryOptimized({ 
    startDate, 
    endDate, 
    className,
    currentData,
    comparisonData,
    percentageChange,
    previousAmount,
    isLoading = false,
    error = null
}: MonthlySalesSummaryOptimizedProps) {

    // Usar datos ya fetched - NO hacer más API calls
    const totalSales = currentData?.data?.sales?.total ?? 0;
    const subtotal = currentData?.data?.sales?.subtotal ?? 0;

    // Determinar color e icono del trend basado en el cambio porcentual
    const getTrendInfo = () => {
        if (percentageChange === null) {
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
        if (value === null) return 'N/A';
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(1)}%`;
    };

    // Manejar estados de loading y error
    if (error) {
        return (
            <Card className={cn('border-red-200 dark:border-red-800', className)}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-red-600 dark:text-red-400">
                        Error en Resumen Mensual
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-red-600 dark:text-red-400">
                        {error.message || 'Error al cargar los datos del resumen mensual'}
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn('w-full', className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Resumen de Ventas Mensual
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
                            {isLoading ? (
                                <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-32 rounded" />
                            ) : (
                                formatCurrency(totalSales)
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {isLoading ? (
                                <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 w-24 rounded mt-1" />
                            ) : (
                                `Total del ${startDate} al ${endDate}`
                            )}
                        </p>
                    </div>

                    {/* Subtotal */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Subtotal:</span>
                        <span className="text-sm font-medium">
                            {isLoading ? (
                                <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 w-20 rounded" />
                            ) : (
                                formatCurrency(subtotal)
                            )}
                        </span>
                    </div>

                    {/* Comparación con mes anterior */}
                    {!isLoading && (
                        <div className="flex items-center space-x-2 pt-2 border-t">
                            <TrendIcon className={cn('h-4 w-4', trendColor)} />
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">
                                        vs. mes anterior
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
                    )}

                    {/* Loading state para comparación */}
                    {isLoading && (
                        <div className="pt-2 border-t space-y-2">
                            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 w-full rounded" />
                            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-3 w-3/4 rounded" />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}