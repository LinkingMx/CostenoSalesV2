import { useState } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';

import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// Hook que hace EXACTAMENTE 2 calls
import { useSharedWeeklyData } from '@/hooks/use-shared-weekly-data';

// Componentes originales (múltiples calls)
import { WeeklySalesSummary } from '@/components/charts/weekly-sales-summary';
import { WeeklyBranchSummaryAccordion } from '@/components/charts/weekly-branch-summary-accordion';

// Componente optimizado (usa datos compartidos)
import { WeeklySalesSummaryOptimized } from '@/components/charts/weekly-sales-summary-optimized';

/**
 * Demo que muestra la diferencia entre:
 * - Múltiples componentes haciendo sus propios API calls
 * - Un solo hook compartido haciendo EXACTAMENTE 2 calls que todos usan
 */
export default function TwoCallsDemo() {
    // Fechas para la prueba
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const endOfCurrentWeek = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
    
    const weekStart = format(startOfCurrentWeek, 'yyyy-MM-dd');
    const weekEnd = format(endOfCurrentWeek, 'yyyy-MM-dd');

    // **ESTE HOOK HACE EXACTAMENTE 2 API CALLS**
    // Call 1: start_date: 2025-09-01, end_date: 2025-09-07
    // Call 2: start_date: 2025-08-25, end_date: 2025-08-31 (semana anterior)
    const { 
        currentData, 
        comparisonData, 
        isLoading, 
        error, 
        percentageChange, 
        previousAmount 
    } = useSharedWeeklyData(weekStart, weekEnd);

    const [showApiCalls, setShowApiCalls] = useState(false);
    const [activeTab, setActiveTab] = useState<'optimized' | 'original'>('optimized');

    return (
        <AppLayout>
            <div className="container mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold">Demo: Optimización a SOLO 2 API Calls</h1>
                    <p className="text-muted-foreground">
                        Comparación: Múltiples calls vs 2 calls exactos
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                        Período: {weekStart} a {weekEnd}
                    </p>
                </div>

                {/* API Calls Explanation */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>📡 Llamadas API Requeridas</CardTitle>
                            <Button 
                                onClick={() => setShowApiCalls(!showApiCalls)} 
                                variant="outline"
                                size="sm"
                            >
                                {showApiCalls ? 'Ocultar' : 'Mostrar'} Detalles
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 dark:bg-green-900/20 dark:border-green-800">
                                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                                    ✅ Solución Optimizada: 2 Calls
                                </h4>
                                <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                                    <div className="font-mono bg-green-100 p-2 rounded dark:bg-green-800/50">
                                        <strong>Call 1:</strong> Período Actual<br />
                                        start_date: "{weekStart}"<br />
                                        end_date: "{weekEnd}"
                                    </div>
                                    <div className="font-mono bg-green-100 p-2 rounded dark:bg-green-800/50">
                                        <strong>Call 2:</strong> Período Comparación<br />
                                        start_date: "{format(new Date(weekStart).getTime() - 7 * 24 * 60 * 60 * 1000, 'yyyy-MM-dd')}"<br />
                                        end_date: "{format(new Date(weekEnd).getTime() - 7 * 24 * 60 * 60 * 1000, 'yyyy-MM-dd')}"
                                    </div>
                                    <p className="font-medium">
                                        Total: <span className="text-green-600">2 API calls</span> para todos los componentes
                                    </p>
                                </div>
                            </div>
                            
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
                                <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                                    ❌ Problema Original: Múltiples Calls
                                </h4>
                                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                                    <li>• WeeklySalesSummary: 2 calls</li>
                                    <li>• WeeklyLineChart: ~14 calls</li>
                                    <li>• WeeklyBranchSummaryAccordion: ~224 calls</li>
                                    <li>• Otros componentes: ~10 calls</li>
                                    <li className="font-medium pt-2 border-t border-red-300">
                                        Total: <span className="text-red-600">~250 API calls</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        
                        {showApiCalls && (
                            <div className="mt-4 p-4 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                                <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                                    Estado Actual de los 2 Calls:
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <strong>Call 1 - Datos Actuales:</strong>
                                        <pre className="bg-blue-100 p-2 rounded mt-1 text-xs dark:bg-blue-800/50">
{currentData ? JSON.stringify({
    success: currentData.success,
    sales_total: currentData.data?.sales?.total || 0,
    branches_count: Object.keys(currentData.data?.cards || {}).length
}, null, 2) : 'Cargando...'}
                                        </pre>
                                    </div>
                                    <div>
                                        <strong>Call 2 - Datos Comparación:</strong>
                                        <pre className="bg-blue-100 p-2 rounded mt-1 text-xs dark:bg-blue-800/50">
{comparisonData ? JSON.stringify({
    success: comparisonData.success,
    sales_total: comparisonData.data?.sales?.total || 0,
    branches_count: Object.keys(comparisonData.data?.cards || {}).length
}, null, 2) : 'Cargando...'}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Loading State */}
                {isLoading && (
                    <Card>
                        <CardContent className="flex h-32 items-center justify-center">
                            <div className="space-y-2 text-center">
                                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                </div>
                                <p className="text-sm font-medium">Ejecutando exactamente 2 API calls...</p>
                                <p className="text-xs text-muted-foreground">
                                    En lugar de ~250 calls individuales
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Error State */}
                {error && (
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-red-600 dark:text-red-400">
                                Error en uno de los 2 API calls: {error.message}
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Components Comparison */}
                {!isLoading && !error && (
                    <>
                        <div className="w-full">
                            <div className="flex w-full rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                                <button 
                                    onClick={() => setActiveTab('optimized')}
                                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                        activeTab === 'optimized' 
                                            ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100' 
                                            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                                    }`}
                                >
                                    ⚡ Componentes Optimizados (2 Calls)
                                </button>
                                <button 
                                    onClick={() => setActiveTab('original')}
                                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                        activeTab === 'original' 
                                            ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100' 
                                            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                                    }`}
                                >
                                    🐌 Componentes Originales (250+ Calls)
                                </button>
                            </div>
                            
                            {/* Optimized Components */}
                            {activeTab === 'optimized' && (
                                <div className="space-y-6 mt-6">
                                <Card className="border-green-200 dark:border-green-800">
                                    <CardHeader className="bg-green-50 dark:bg-green-900/20">
                                        <CardTitle className="text-green-800 dark:text-green-200">
                                            ⚡ Componentes Optimizados
                                        </CardTitle>
                                        <p className="text-sm text-green-600 dark:text-green-400">
                                            Todos estos componentes usan los mismos 2 calls API, no hacen calls adicionales.
                                        </p>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-4">
                                        <div className="bg-green-50 border border-green-200 rounded p-3 dark:bg-green-900/20 dark:border-green-800">
                                            <div className="flex items-center justify-between mb-2">
                                                <h5 className="font-medium">WeeklySalesSummary Optimizado</h5>
                                                <span className="text-xs text-green-600 font-mono">0 API calls extra</span>
                                            </div>
                                            
                                            <WeeklySalesSummaryOptimized
                                                startDate={weekStart}
                                                endDate={weekEnd}
                                                currentData={currentData}
                                                comparisonData={comparisonData}
                                                percentageChange={percentageChange}
                                                previousAmount={previousAmount}
                                                isLoading={isLoading}
                                                error={error}
                                                className="w-full"
                                            />
                                        </div>

                                        <div className="bg-green-50 border border-green-200 rounded p-3 dark:bg-green-900/20 dark:border-green-800">
                                            <div className="flex items-center justify-between mb-2">
                                                <h5 className="font-medium">Resumen de Datos Compartidos</h5>
                                                <span className="text-xs text-green-600 font-mono">Datos de los 2 calls</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="font-medium">Período Actual:</p>
                                                    <p>Ventas: ${currentData?.data?.sales?.total?.toLocaleString() || 0}</p>
                                                    <p>Sucursales: {Object.keys(currentData?.data?.cards || {}).length}</p>
                                                </div>
                                                <div>
                                                    <p className="font-medium">Período Comparación:</p>
                                                    <p>Ventas: ${comparisonData?.data?.sales?.total?.toLocaleString() || 0}</p>
                                                    <p>Cambio: {percentageChange ? `${percentageChange}%` : 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                </div>
                            )}

                            {/* Original Components */}
                            {activeTab === 'original' && (
                                <div className="space-y-6 mt-6">
                                <Card className="border-red-200 dark:border-red-800">
                                    <CardHeader className="bg-red-50 dark:bg-red-900/20">
                                        <CardTitle className="text-red-800 dark:text-red-200">
                                            🚨 Componentes Originales - PROBLEMA
                                        </CardTitle>
                                        <p className="text-sm text-red-600 dark:text-red-400">
                                            Cada componente hace sus propias llamadas API, resultando en ~250 calls.
                                        </p>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4 dark:bg-yellow-900/20 dark:border-yellow-800">
                                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                                ⚠️ <strong>Advertencia:</strong> Los componentes a continuación harán múltiples API calls independientes. 
                                                Esto es exactamente lo que queremos evitar.
                                            </p>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div className="bg-red-50 border border-red-200 rounded p-3 dark:bg-red-900/20 dark:border-red-800">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h5 className="font-medium">WeeklySalesSummary Original</h5>
                                                    <span className="text-xs text-red-600 font-mono">2 API calls independientes</span>
                                                </div>
                                                
                                                <WeeklySalesSummary
                                                    startDate={weekStart}
                                                    endDate={weekEnd}
                                                    className="w-full"
                                                />
                                            </div>

                                            <div className="bg-red-50 border border-red-200 rounded p-3 dark:bg-red-900/20 dark:border-red-800">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h5 className="font-medium">WeeklyBranchSummaryAccordion Original</h5>
                                                    <span className="text-xs text-red-600 font-mono">~224 API calls</span>
                                                </div>
                                                <div className="text-xs text-red-600 mb-2">
                                                    Este componente por sí solo hace ~224 requests (112 sucursales × 2 períodos)
                                                </div>
                                                
                                                <div className="max-h-40 overflow-y-auto">
                                                    <WeeklyBranchSummaryAccordion
                                                        startDate={weekStart}
                                                        endDate={weekEnd}
                                                        className="w-full"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle>📊 Resumen de la Optimización</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="text-center">
                                        <p className="text-sm text-muted-foreground">Calls Originales</p>
                                        <p className="text-3xl font-bold text-red-600">~250</p>
                                        <p className="text-xs text-muted-foreground">Múltiples componentes haciendo calls independientes</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm text-muted-foreground">Calls Optimizados</p>
                                        <p className="text-3xl font-bold text-green-600">2</p>
                                        <p className="text-xs text-muted-foreground">Hook compartido para todos los componentes</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm text-muted-foreground">Mejora</p>
                                        <p className="text-3xl font-bold text-blue-600">99.2%</p>
                                        <p className="text-xs text-muted-foreground">Reducción en API calls</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </AppLayout>
    );
}