import { Info, RefreshCw } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AdaptiveSkeleton } from '@/components/ui/adaptive-skeleton';

const chartConfig = {
    current: {
        label: 'Mes Actual',
        color: 'var(--chart-1)',
    },
    previous: {
        label: 'Mes Anterior',
        color: 'var(--chart-2)',
    },
} satisfies ChartConfig;

interface MonthlyChartData {
    week: string;
    weekLabel: string;
    current: number;
    previous: number;
}

interface MonthlyLineChartOptimizedProps {
    chartData: MonthlyChartData[] | any | null;
    isLoading?: boolean;
    error?: Error | null;
    onRefresh?: () => void;
    className?: string;
    currentTotal?: number;
    previousTotal?: number;
}

/**
 * OPTIMIZED Monthly Line Chart Component
 * - Receives data from unified hook (no separate API calls)
 * - Coordinated loading state with other monthly components
 * - Improved performance through data sharing
 */
export function MonthlyLineChartOptimized({ 
    chartData,
    isLoading = false,
    error = null,
    onRefresh,
    className,
    currentTotal = 0,
    previousTotal = 0
}: MonthlyLineChartOptimizedProps) {
    
    const TitleWithIcon = () => {
        // Use passed totals or calculate from chart data
        const currentTotalCalc = chartData?.reduce?.((sum: number, week: any) => sum + (week.current || 0), 0) || currentTotal;
        const previousTotalCalc = chartData?.reduce?.((sum: number, week: any) => sum + (week.previous || 0), 0) || previousTotal;
        
        const formatNumber = (num: number) => {
            return new Intl.NumberFormat('en-US').format(Math.round(num));
        };
        
        return (
            <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Info className="h-5 w-5 cursor-pointer text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300" />
                        </PopoverTrigger>
                        <PopoverContent side="right" className="max-w-xs p-3">
                            <p className="text-sm">
                                Esta gráfica muestra el análisis de ventas por semanas del mes, comparando el mes seleccionado con el mes anterior.
                            </p>
                        </PopoverContent>
                    </Popover>
                    Análisis mensual
                </CardTitle>

                {/* Chart Legend */}
                {(chartData && chartData.length > 0) || (currentTotalCalc > 0 || previousTotalCalc > 0) ? (
                    <div className="flex items-center justify-center gap-8 rounded-lg border border-slate-200/30 bg-slate-50/50 px-4 py-3 dark:border-slate-700/30 dark:bg-slate-800/20">
                        <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1.5">
                                <div className="h-3 w-3 rounded-full bg-[#897053]"></div>
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Mes Actual</span>
                            </div>
                            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatNumber(currentTotalCalc)}</span>
                        </div>

                        <div className="h-8 w-px bg-slate-300 dark:bg-slate-600"></div>

                        <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1.5">
                                <div className="h-3 w-3 rounded-full bg-[#D58B35]"></div>
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Mes Anterior</span>
                            </div>
                            <span className="text-lg font-bold text-slate-500 dark:text-slate-400">{formatNumber(previousTotalCalc)}</span>
                        </div>
                    </div>
                ) : null}
            </div>
        );
    };

    // Loading state is now coordinated with other components
    if (isLoading) {
        return (
            <AdaptiveSkeleton 
                type="chart" 
                className="overflow-hidden border-0 bg-transparent shadow-none"
                showTitle={true}
                showLegend={true}
                height="h-40"
            />
        );
    }

    // Error state
    if (error) {
        return (
            <Card className={`${className} overflow-hidden border-0 bg-transparent shadow-none`}>
                <CardHeader className="pb-2">
                    <TitleWithIcon />
                </CardHeader>
                <CardContent className="pb-2 pt-4">
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p className="mb-4 text-sm text-red-600 dark:text-red-400">
                            Error al cargar la gráfica: {error.message}
                        </p>
                        {onRefresh && (
                            <Button
                                onClick={onRefresh}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Reintentar
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    // No data state
    if (!chartData || (Array.isArray(chartData) && chartData.length === 0)) {
        return (
            <Card className={`${className} overflow-hidden border-0 bg-transparent shadow-none`}>
                <CardHeader className="pb-2">
                    <TitleWithIcon />
                </CardHeader>
                <CardContent className="pb-2 pt-4">
                    <div className="flex items-center justify-center py-12 text-sm text-slate-500 dark:text-slate-400">
                        No hay datos disponibles para el período seleccionado
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Process chart data if it's from monthly batch API
    let processedChartData = chartData;
    if (chartData && !Array.isArray(chartData) && chartData.data) {
        // Transform batch API response to chart format
        processedChartData = Object.entries(chartData.data.current_month || {}).map(([weekKey, weekData]: [string, any], index) => {
            const previousWeekData = Object.values(chartData.data.previous_month || {})[index] as any;
            
            return {
                week: `S${index + 1}`,
                weekLabel: `Semana ${index + 1}`,
                current: weekData?.total || 0,
                previous: previousWeekData?.total || 0
            };
        });
    }

    // Custom tooltip for better UX
    const CustomTooltipContent = ({ active, payload }: any) => {
        if (!active || !payload || payload.length === 0) return null;

        const data = payload[0].payload;
        const formatValue = (value: number) => {
            return new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(value);
        };

        return (
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <p className="mb-2 font-semibold text-slate-900 dark:text-slate-100">
                    {data.weekLabel || data.week}
                </p>
                <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-[#897053]"></div>
                        <span className="text-slate-600 dark:text-slate-400">Actual:</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                            {formatValue(data.current)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-[#D58B35]"></div>
                        <span className="text-slate-600 dark:text-slate-400">Anterior:</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                            {formatValue(data.previous)}
                        </span>
                    </div>
                    {data.current !== data.previous && (
                        <div className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-700">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                Diferencia: {data.current > data.previous ? '+' : ''}
                                {formatValue(data.current - data.previous)} (
                                {data.previous > 0
                                    ? `${((data.current - data.previous) / data.previous * 100).toFixed(1)}%`
                                    : 'N/A'}
                                )
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <Card className={`${className} overflow-hidden border-0 bg-transparent shadow-none`}>
            <CardHeader className="pb-2">
                <TitleWithIcon />
            </CardHeader>
            <CardContent className="pb-2 pt-4">
                <ChartContainer config={chartConfig}>
                    <ResponsiveContainer width="100%" height={160}>
                        <LineChart
                            data={processedChartData}
                            margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                        >
                            <CartesianGrid 
                                strokeDasharray="3 3" 
                                className="stroke-slate-200/50 dark:stroke-slate-700/50" 
                                vertical={false}
                            />
                            <XAxis
                                dataKey="week"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tick={false}
                                width={0}
                            />
                            <ChartTooltip content={<CustomTooltipContent />} />
                            <Line
                                type="monotone"
                                dataKey="current"
                                strokeWidth={4}
                                stroke="#897053"
                                dot={{ r: 4, fill: '#897053', strokeWidth: 0 }}
                                activeDot={{ r: 5, stroke: '#897053', strokeWidth: 2, fill: 'white' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="previous"
                                strokeWidth={3}
                                stroke="#D58B35"
                                strokeDasharray="6 4"
                                dot={{ r: 3.5, fill: '#D58B35', strokeWidth: 0 }}
                                activeDot={{ r: 4, stroke: '#D58B35', strokeWidth: 2, fill: 'white' }}
                                opacity={0.8}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}