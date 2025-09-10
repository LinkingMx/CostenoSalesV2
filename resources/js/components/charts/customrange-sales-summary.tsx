import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Calendar, Building, Users } from 'lucide-react';
import { CustomRangeSummaryData, CustomRangeData, AllBranchesSummaryData } from '@/types/custom-range';
import { cn } from '@/lib/utils';

interface CustomRangeSalesSummaryProps {
    startDate: string;
    endDate: string;
    summaryData?: CustomRangeSummaryData;
    allBranchesSummaryData?: AllBranchesSummaryData;
    data?: CustomRangeData | null;
    error?: Error | null;
    className?: string;
}

export function CustomRangeSalesSummary({ 
    startDate, 
    endDate, 
    summaryData, 
    allBranchesSummaryData,
    data,
    error,
    className 
}: CustomRangeSalesSummaryProps) {
    // Preferir datos de todas las sucursales cuando están disponibles
    const useAllBranchesData = allBranchesSummaryData && allBranchesSummaryData.totalSales > 0;
    
    const totalSales = useAllBranchesData ? allBranchesSummaryData.totalSales : (data?.data?.sales?.total ?? 0);
    const subtotal = data?.data?.sales?.subtotal ?? 0;
    const totalTickets = useAllBranchesData ? allBranchesSummaryData.totalTickets : 0;
    const branchCount = useAllBranchesData ? allBranchesSummaryData.branchCount : 0;
    const averageTicket = useAllBranchesData ? allBranchesSummaryData.averageTicket : 0;
    
    // Usar los datos de summary apropiados
    const currentSummary = useAllBranchesData ? allBranchesSummaryData : summaryData;
    const { dailyAverage, dayCount, periodDescription } = currentSummary || {
        dailyAverage: 0,
        dayCount: 0,
        periodDescription: ''
    };

    // Formatear números
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Loading handled centrally in dashboard

    if (error) {
        return (
            <Card className={cn('border-red-200 dark:border-red-800', className)}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-red-600 dark:text-red-400">
                        Error en Resumen Personalizado
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-red-600 dark:text-red-400">
                        {error.message || 'Error al cargar los datos del resumen personalizado'}
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn('w-full', className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Resumen de Ventas Personalizado
                </CardTitle>
                <div className="rounded-full p-2 bg-blue-50 dark:bg-blue-900/20">
                    <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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

                    {/* Estadísticas adicionales cuando tenemos datos de todas las sucursales */}
                    {useAllBranchesData && (
                        <>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Total Tickets:</span>
                                <span className="text-sm font-medium">
                                    {totalTickets.toLocaleString()}
                                </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Ticket Promedio:</span>
                                <span className="text-sm font-medium">
                                    {formatCurrency(averageTicket)}
                                </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Sucursales:</span>
                                <span className="text-sm font-medium">
                                    {branchCount}
                                </span>
                            </div>
                        </>
                    )}

                    {/* Subtotal - solo mostrar si no tenemos datos completos */}
                    {!useAllBranchesData && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Subtotal:</span>
                            <span className="text-sm font-medium">
                                {formatCurrency(subtotal)}
                            </span>
                        </div>
                    )}

                    {/* Información del período personalizado */}
                    <div className="flex items-center space-x-2 pt-2 border-t">
                        {useAllBranchesData ? (
                            <Building className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        )}
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                    {useAllBranchesData ? 'Todas las sucursales' : 'vs. período anterior'}
                                </span>
                                <span className="text-xs font-medium text-gray-500">
                                    {useAllBranchesData ? `${branchCount} ubicaciones` : 'No disponible'}
                                </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Promedio diario: {formatCurrency(dailyAverage)} ({dayCount} {dayCount === 1 ? 'día' : 'días'})
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Loading state component for CustomRangeSalesSummary
 */
export function CustomRangeSalesSummaryLoading({ className = '' }: { className?: string }) {
    return (
        <Card className={cn('w-full', className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                <div className="rounded-full p-2 bg-muted animate-pulse">
                    <div className="h-4 w-4 bg-muted-foreground/20 rounded" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div>
                        <div className="h-8 w-40 bg-muted rounded animate-pulse" />
                        <div className="h-3 w-32 bg-muted rounded animate-pulse mt-1" />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="pt-2 border-t">
                        <div className="flex items-center space-x-2">
                            <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                                    <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                                </div>
                                <div className="h-3 w-36 bg-muted rounded animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Error state component for CustomRangeSalesSummary
 */
export function CustomRangeSalesSummaryError({ 
    error, 
    onRetry, 
    className = '' 
}: { 
    error: string; 
    onRetry?: () => void;
    className?: string;
}) {
    return (
        <Card className={cn('w-full border-red-200 dark:border-red-800', className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-red-600 dark:text-red-400">
                    Error en Resumen Personalizado
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <p className="text-sm text-red-600 dark:text-red-400">
                        {error}
                    </p>
                    {onRetry && (
                        <button 
                            onClick={onRetry}
                            className="text-sm text-primary hover:text-primary/80 underline font-medium"
                        >
                            Reintentar
                        </button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}