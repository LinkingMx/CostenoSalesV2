import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useMainDashboardData } from '@/hooks/use-main-dashboard-data';

interface BranchData {
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
    brand?: string;
    region?: string;
    operational_address?: string;
    general_address?: string;
}

interface WeeklyBranchSummaryAccordionProps {
    startDate: string;
    endDate: string;
    className?: string;
}

export function WeeklyBranchSummaryAccordion({ startDate, endDate, className }: WeeklyBranchSummaryAccordionProps) {
    const { data, loading, error, comparisonData } = useMainDashboardData(startDate, endDate);
    const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());

    const formatNumber = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
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

    const toggleBranch = (branchName: string) => {
        const newExpanded = new Set(expandedBranches);
        if (newExpanded.has(branchName)) {
            newExpanded.delete(branchName);
        } else {
            newExpanded.add(branchName);
        }
        setExpandedBranches(newExpanded);
    };

    const getPercentageColor = (percentage: number) => {
        if (percentage > 0) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        if (percentage < 0) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    };

    const getPercentageArrow = (percentage: number) => {
        if (percentage > 0) return '↗';
        if (percentage < 0) return '↘';
        return '→';
    };

    const calculateBranchPercentageChange = (branchName: string, currentTotal: number) => {
        if (!comparisonData?.data?.cards) return { percentage: 0, hasComparison: false };
        
        const previousBranchData = comparisonData.data.cards[branchName] as BranchData | undefined;
        if (!previousBranchData) return { percentage: 0, hasComparison: false };
        
        const previousTotal = previousBranchData.open_accounts.money + previousBranchData.closed_ticket.money;
        
        if (previousTotal === 0) return { percentage: 0, hasComparison: false };
        
        const change = ((currentTotal - previousTotal) / previousTotal) * 100;
        return { 
            percentage: Math.round(change * 10) / 10, // Round to 1 decimal
            hasComparison: true 
        };
    };

    if (loading) {
        return (
            <Card className={`${className} overflow-hidden border-0 bg-transparent shadow-none`}>
                <CardContent className="flex h-40 items-center justify-center px-4 pt-1 pb-1">
                    <div className="space-y-2 text-center">
                        <div className="relative">
                            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                            </div>
                        </div>
                        <p className="text-sm font-medium">Cargando sucursales...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className={`${className} overflow-hidden border-0 bg-transparent shadow-none`}>
                <CardContent className="px-4 pt-1 pb-1">
                    <p className="text-sm text-red-600 dark:text-red-400">
                        Error al cargar datos de sucursales: {error.message}
                    </p>
                </CardContent>
            </Card>
        );
    }

    const branches = data?.data?.cards || {};
    const branchEntries = Object.entries(branches as Record<string, BranchData>)
        .sort(([, branchA], [, branchB]) => {
            const totalSalesA = branchA.open_accounts.money + branchA.closed_ticket.money;
            const totalSalesB = branchB.open_accounts.money + branchB.closed_ticket.money;
            return totalSalesB - totalSalesA; // Mayor a menor
        });

    if (branchEntries.length === 0) {
        return (
            <Card className={`${className} overflow-hidden border-0 bg-transparent shadow-none`}>
                <CardContent className="px-4 pt-1 pb-1">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        No hay datos de sucursales disponibles
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className={`${className} space-y-2`}>
            {branchEntries.map(([branchName, branchData]) => {
                const totalSales = branchData.open_accounts.money + branchData.closed_ticket.money;
                const totalTickets = branchData.open_accounts.total + branchData.closed_ticket.total;
                const { percentage: percentageValue, hasComparison } = calculateBranchPercentageChange(branchName, totalSales);
                const isExpanded = expandedBranches.has(branchName);

                return (
                    <Collapsible key={branchName} open={isExpanded} onOpenChange={() => toggleBranch(branchName)}>
                        <Card className="overflow-hidden border border-slate-200/50 bg-white/50 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
                            <CollapsibleTrigger className="w-full">
                                <CardContent className="px-4 py-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 dark:bg-slate-100">
                                                <span className="text-xs font-bold text-white dark:text-slate-900">
                                                    {branchName.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="text-left">
                                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                                    {branchName}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    ID: {branchData.store_id}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                                    ${formatNumber(totalSales)}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    {hasComparison && percentageValue !== 0 && (
                                                        <span
                                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getPercentageColor(percentageValue)}`}
                                                        >
                                                            {getPercentageArrow(percentageValue)} {Math.abs(percentageValue)}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center">
                                                {isExpanded ? (
                                                    <ChevronUp className="h-4 w-4 text-slate-500" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4 text-slate-500" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                                <CardContent className="px-4 pb-4 pt-0">
                                    <div className="space-y-3 border-t border-slate-200/30 pt-3 dark:border-slate-700/30">
                                        {/* Abiertas */}
                                        <div className="flex items-center justify-between rounded-lg bg-blue-50/50 px-3 py-2 dark:bg-blue-900/20">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-100 dark:bg-blue-800">
                                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-200">A</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                                        Abiertas
                                                    </p>
                                                    <p className="text-xs text-blue-600 dark:text-blue-300">
                                                        Cuentas pendientes
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                                                    ${formatNumber(branchData.open_accounts.money)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Cerradas */}
                                        <div className="flex items-center justify-between rounded-lg bg-green-50/50 px-3 py-2 dark:bg-green-900/20">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-green-100 dark:bg-green-800">
                                                    <span className="text-xs font-bold text-green-600 dark:text-green-200">C</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                                                        Cerradas
                                                    </p>
                                                    <p className="text-xs text-green-600 dark:text-green-300">
                                                        Ventas completadas
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-green-900 dark:text-green-100">
                                                    ${formatNumber(branchData.closed_ticket.money)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Promedio */}
                                        <div className="flex items-center justify-between rounded-lg bg-purple-50/50 px-3 py-2 dark:bg-purple-900/20">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-purple-100 dark:bg-purple-800">
                                                    <span className="text-xs font-bold text-purple-600 dark:text-purple-200">P</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                                                        Promedio
                                                    </p>
                                                    <p className="text-xs text-purple-600 dark:text-purple-300">
                                                        Por ticket
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                                                    ${formatNumber(branchData.average_ticket)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Footer con total de tickets */}
                                        <div className="flex items-center justify-between pt-2 text-xs text-slate-500 dark:text-slate-400">
                                            <span>Total de tickets: {totalTickets}</span>
                                            <button className="flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                                                Ver Detalles
                                                <span>→</span>
                                            </button>
                                        </div>
                                    </div>
                                </CardContent>
                            </CollapsibleContent>
                        </Card>
                    </Collapsible>
                );
            })}
        </div>
    );
}