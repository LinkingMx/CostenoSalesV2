import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AdaptiveSkeleton } from '@/components/ui/adaptive-skeleton';
import { cn } from '@/lib/utils';

/**
 * Props interface for DailySalesSummary component
 * Supports both direct prop data and API data consumption
 */
interface DailySalesSummaryProps {
    /** Start date in YYYY-MM-DD format */
    date: string;
    /** End date in YYYY-MM-DD format (optional, defaults to same as start date) */
    endDate?: string;
    /** Direct sales total override (used when not fetching from API) */
    totalSales?: number;
    /** Direct percentage change override */
    percentageChange?: number;
    /** Comparison text to display */
    comparisonText?: string;
    /** Additional CSS classes */
    className?: string;
    /** Whether component is in loading state (controlled externally) */
    isLoading?: boolean;
    /** Error object if there's an issue with data */
    error?: Error | null;
    /** Dashboard data from unified hook */
    dashboardData?: any;
    /** Comparison data for percentage calculations */
    dashboardComparisonData?: any;
    /** Pre-calculated percentage change from unified hook */
    dashboardPercentageChange?: number | null;
    /** Previous amount for comparison display */
    dashboardPreviousAmount?: number | null;
}

/**
 * Daily Sales Summary Component
 * Displays total sales for a single day with comparison to previous week
 * 
 * Features:
 * - Responsive design with mobile-first approach
 * - Automatic percentage change calculation and color coding
 * - Consistent loading states with skeleton UI
 * - Error handling with user-friendly messages
 * - Optimized for performance with memoized calculations
 * 
 * @param props - Component props including dates, data, and display options
 * @returns JSX element representing the daily sales summary
 */
export function DailySalesSummary({
    date,
    endDate,
    totalSales: propTotalSales,
    percentageChange: propPercentageChange = 0,
    comparisonText = 'Mismo día semana anterior al de ayer.',
    className,
    isLoading = false,
    error = null,
    dashboardData,
    dashboardComparisonData,
    dashboardPercentageChange,
    dashboardPreviousAmount,
}: DailySalesSummaryProps) {

    // Use unified hook data if available, otherwise fall back to props
    const totalSales = dashboardData?.data?.sales?.total ?? propTotalSales ?? 0;
    const subtotal = dashboardData?.data?.sales?.subtotal ?? 0;
    const percentageChange = dashboardPercentageChange ?? propPercentageChange;
    const previousAmount = dashboardPreviousAmount ?? Math.round(totalSales * (1 - (propPercentageChange || 0) / 100));

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

    // Show skeleton loading state for better UX
    if (isLoading) {
        return (
            <AdaptiveSkeleton 
                type="card" 
                className={cn("overflow-hidden border-0 bg-transparent shadow-none", className)}
                showPercentage={true}
            />
        );
    }

    // Manejar estados de loading y error
    if (error) {
        return (
            <Card className={cn('border-red-200 dark:border-red-800', className)}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-red-600 dark:text-red-400">
                        Error en Resumen Diario
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-red-600 dark:text-red-400">
                        {error.message || 'Error al cargar los datos del resumen diario'}
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn('w-full', className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Resumen de Ventas Diario
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
                                `Total del ${date}${endDate && endDate !== date ? ` al ${endDate}` : ''}`
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

                    {/* Comparación con día anterior de la semana pasada */}
                    {!isLoading && (
                        <div className="flex items-center space-x-2 pt-2 border-t">
                            <TrendIcon className={cn('h-4 w-4', trendColor)} />
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">
                                        vs. día anterior
                                    </span>
                                    <span className={cn('text-xs font-medium', trendColor)}>
                                        {formatPercentage(percentageChange)}
                                    </span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    Anterior: {formatCurrency(previousAmount || 0)}
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
