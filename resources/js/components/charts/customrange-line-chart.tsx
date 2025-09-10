import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartConfig } from '@/components/ui/chart';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TopBranchData } from '@/types/custom-range';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

interface CustomRangeBarChartProps {
    startDate: string;
    endDate: string;
    topBranches: TopBranchData[];
    className?: string;
}

interface BranchChartData {
    name: string;
    total: number;
    rank: number;
    percentage: number;
}

/**
 * Transform top branches data for bar chart visualization
 */
function useBranchChartData(topBranches: TopBranchData[]) {
    const data = useMemo(() => {
        return topBranches.map((branch, index) => ({
            name: branch.name,
            total: branch.total,
            rank: branch.rank,
            percentage: branch.percentage
        }));
    }, [topBranches]);
    
    return { data };
}

/**
 * Custom range bar chart showing top 5 branches comparison
 * NO comparison with previous periods
 */
export function CustomRangeBarChart({
    startDate,
    endDate,
    topBranches,
    className = ''
}: CustomRangeBarChartProps) {
    const { data } = useBranchChartData(topBranches);
    
    const formatNumber = (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };
    
    // Brown color palette for bars - similar to the accordion colors
    const brownColors = ['#8B7355', '#A0846D', '#B89685', '#C7A882', '#D4C4A8'];
    
    // Create chart configuration using brown palette
    const chartConfig = useMemo(() => {
        const config: Record<string, { label: string; color: string }> = {
            total: {
                label: 'Ventas Totales',
                color: '#8B7355'
            }
        };
        
        return config;
    }, []);

    if (topBranches.length === 0) {
        return (
            <Card className={cn("overflow-hidden border border-slate-200/50 bg-white/50 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50", className)}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        Top Sucursales - Comparación
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400">
                        No hay datos suficientes para mostrar la gráfica
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const periodDescription = format(new Date(startDate), "d 'de' MMM", { locale: es }) + 
                            ' al ' + 
                            format(new Date(endDate), "d 'de' MMM yyyy", { locale: es });
                            
    const totalSales = data.reduce((sum, branch) => sum + branch.total, 0);

    return (
        <Card className={cn("overflow-hidden border border-slate-200/50 bg-white/50 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50", className)}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Info className="h-5 w-5 cursor-pointer text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300" />
                        </PopoverTrigger>
                        <PopoverContent side="right" className="max-w-xs p-3">
                            <p className="text-sm">
                                <strong>Análisis de Rango Personalizado:</strong> Muestra las sucursales con mejor rendimiento en el período seleccionado. 
                                Ideal para analizar períodos específicos sin comparación histórica, enfocándose en el ranking actual de sucursales.
                            </p>
                        </PopoverContent>
                    </Popover>
                    Top {topBranches.length} Sucursales - Comparación
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                    Ventas del período {periodDescription} • Total: ${formatNumber(totalSales)}
                </CardDescription>
            </CardHeader>
            
            <CardContent>
                <ChartContainer
                    config={chartConfig}
                    className="min-h-80 w-full"
                >
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                            data={data}
                            margin={{
                                top: 20,
                                right: 30,
                                left: 20,
                                bottom: 60
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis 
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                                interval={0}
                            />
                            <YAxis 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                            />
                            
                            <ChartTooltip 
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0]?.payload;
                                        return (
                                            <div className="rounded-lg border bg-background p-3 shadow-sm">
                                                <div className="grid gap-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">
                                                            #{data?.rank} {label}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div 
                                                            className="h-3 w-3 rounded-full" 
                                                            style={{ backgroundColor: brownColors[(data?.rank - 1) || 0] }}
                                                        />
                                                        <span className="text-sm">Ventas Totales</span>
                                                        <span className="font-mono text-sm font-semibold ml-auto">
                                                            ${formatNumber(Number(payload[0]?.value))}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {data?.percentage.toFixed(1)}% del total
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            
                            <Bar 
                                dataKey="total"
                                radius={[4, 4, 0, 0]}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={brownColors[index] || brownColors[0]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
                
                {/* Chart summary */}
                <div className="mt-4 pt-4 border-t border-slate-200/30 dark:border-slate-700/30">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {data.map((branch, index) => (
                            <div key={index} className="flex flex-col items-center gap-1">
                                <div 
                                    className="h-4 w-4 rounded-full" 
                                    style={{ backgroundColor: brownColors[index] || brownColors[0] }}
                                />
                                <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                    #{branch.rank}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 text-center">
                                    {branch.name}
                                </span>
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    {branch.percentage.toFixed(1)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Keep the old export name for compatibility
export { CustomRangeBarChart as CustomRangeLineChart };