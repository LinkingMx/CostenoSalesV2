import { Info, RefreshCw } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { addMonths } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useMonthlyChartDataSimple } from '@/hooks/use-monthly-chart-data-simple';
import { useMainDashboardData } from '@/hooks/use-main-dashboard-data';

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

interface MonthlyLineChartProps {
    startDate: string;
    endDate: string;
    title?: string;
    description?: string;
    className?: string;
}

export function MonthlyLineChart({ 
    startDate, 
    endDate,
    title = 'Gráfica Mensual',
    description,
    className 
}: MonthlyLineChartProps) {
    const { data, loading, error, refetch } = useMonthlyChartDataSimple(startDate, endDate);

    const TitleWithIcon = () => {
        // Use the same data source as MonthlySalesSummary for consistency
        // Get totals from the main API call instead of summing individual weeks
        const { data: currentMonthApiData } = useMainDashboardData(startDate, endDate);
        const previousMonthStart = addMonths(new Date(startDate), -1).toISOString().split('T')[0];
        const previousMonthEnd = addMonths(new Date(endDate), -1).toISOString().split('T')[0];
        const { data: previousMonthApiData } = useMainDashboardData(previousMonthStart, previousMonthEnd);
        
        // Get totals from API calls for the full periods (same as MonthlySalesSummary)
        const currentTotal = currentMonthApiData?.data?.sales?.total || 0;
        const previousTotal = previousMonthApiData?.data?.sales?.total || 0;
        
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
                {data && data.length > 0 && (
                    <div className="flex items-center justify-center gap-8 rounded-lg border border-slate-200/30 bg-slate-50/50 px-4 py-3 dark:border-slate-700/30 dark:bg-slate-800/20">
                        <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1.5">
                                <div className="h-3 w-3 rounded-full bg-blue-600"></div>
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Mes Actual</span>
                            </div>
                            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatNumber(currentTotal)}</span>
                        </div>

                        <div className="h-8 w-px bg-slate-300 dark:bg-slate-600"></div>

                        <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1.5">
                                <div className="h-3 w-3 rounded-full bg-orange-600"></div>
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Mes Anterior</span>
                            </div>
                            <span className="text-lg font-bold text-slate-500 dark:text-slate-400">{formatNumber(previousTotal)}</span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Loading handled centrally in dashboard

    if (error) {
        return (
            <Card className={`${className} overflow-hidden border-0 bg-transparent shadow-none`}>
                <CardHeader className="px-4 pb-1">
                    <TitleWithIcon />
                </CardHeader>
                <CardContent className="flex h-40 items-center justify-center">
                    <div className="max-w-sm space-y-1 text-center">
                        <div className="relative">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="font-medium text-red-600">Error al cargar los datos</p>
                            <p className="text-sm text-muted-foreground">{error.message}</p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => refetch()}
                            className="gap-2 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Reintentar
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Card className={`${className} overflow-hidden border-0 bg-transparent shadow-none`}>
                <CardHeader className="px-4 pt-3 pb-1">
                    <TitleWithIcon />
                </CardHeader>
                <CardContent className="flex h-40 items-center justify-center">
                    <div className="max-w-sm space-y-1 text-center">
                        <div className="relative">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10">
                                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                                    />
                                </svg>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="font-medium">Sin datos disponibles</p>
                            <p className="text-sm text-muted-foreground">No hay información para mostrar en este mes</p>
                        </div>
                        <Button variant="outline" onClick={() => refetch()} className="gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Recargar
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={`${className} overflow-hidden border-0 bg-transparent shadow-none`}>
            <CardHeader className="px-4 pt-3 pb-1">
                <TitleWithIcon />
            </CardHeader>
            <CardContent className="px-4 pt-0 pb-1">
                <ChartContainer config={chartConfig} className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{
                                left: 8,
                                right: 8,
                                top: 2,
                                bottom: 25,
                            }}
                        >
                            <CartesianGrid strokeDasharray="2 2" stroke="#94a3b8" strokeOpacity={0.6} horizontal={true} vertical={false} />
                            <XAxis
                                dataKey="week"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={15}
                                interval={0}
                                tick={{ fontSize: 10, fill: '#64748b', fontWeight: '500' }}
                            />
                            <YAxis hide />
                            <ChartTooltip
                                content={({ active, payload, label }) => {
                                    if (!active || !payload?.length) return null;

                                    const weekData = data.find(d => d.week === label);
                                    
                                    return (
                                        <div className="min-w-[160px] rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95">
                                            <p className="mb-2 text-center font-semibold text-slate-900 dark:text-slate-100">
                                                {weekData?.weekName || label}
                                            </p>
                                            <div className="space-y-2">
                                                {payload.map((entry, index) => (
                                                    <div key={index} className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="h-3 w-3 flex-shrink-0 rounded-full"
                                                                style={{ backgroundColor: entry.color }}
                                                            />
                                                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                                                {entry.name === 'current' ? 'Mes Actual' : 'Mes Anterior'}
                                                            </span>
                                                        </div>
                                                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                            {Number(entry.value).toLocaleString('es-ES')}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                            <Line
                                dataKey="current"
                                type="monotone"
                                stroke="#2563eb"
                                strokeWidth={4}
                                dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
                                activeDot={{ r: 5, stroke: '#2563eb', strokeWidth: 2, fill: 'white' }}
                            />
                            <Line
                                dataKey="previous"
                                type="monotone"
                                stroke="#ea580c"
                                strokeWidth={3}
                                strokeDasharray="6 4"
                                dot={{ r: 3.5, fill: '#ea580c', strokeWidth: 0 }}
                                activeDot={{ r: 4, stroke: '#ea580c', strokeWidth: 2, fill: 'white' }}
                                opacity={0.8}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}