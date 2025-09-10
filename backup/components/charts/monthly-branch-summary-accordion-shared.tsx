import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { AdaptiveSkeleton } from '@/components/ui/adaptive-skeleton';
import { type BranchDetailData } from '@/types/branch-detail';

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

interface MonthlyBranchSummaryAccordionSharedProps {
    startDate: string;
    endDate: string;
    className?: string;
    // Props para recibir los datos ya fetched de useSharedMonthlyData
    currentData: MainDashboardData | null;
    comparisonData: MainDashboardData | null;
    isLoading?: boolean;
    error?: Error | null;
    onBranchDetailsClick?: (branchData: BranchDetailData) => void;
}

/**
 * Componente Monthly Branch Summary Accordion OPTIMIZADO CON DATOS COMPARTIDOS
 * 
 * ✅ ANTES: branchCount × 2 API calls (ej: 112 sucursales × 2 = 224 requests)
 * ✅ DESPUÉS: 0 API calls - usa datos compartidos de useSharedMonthlyData
 * 
 * Este componente consume los datos ya fetched por useSharedMonthlyData
 * y NO hace llamadas API adicionales.
 */
export function MonthlyBranchSummaryAccordionShared({
    startDate,
    className,
    currentData,
    comparisonData,
    isLoading = false,
    error = null,
    onBranchDetailsClick
}: MonthlyBranchSummaryAccordionSharedProps) {
    const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());

    const formatNumber = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
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
        if (percentage > 0) return 'bg-[#897053] text-white';
        if (percentage < 0) return 'bg-[#D58B35] text-white';
        return 'bg-gray-500 text-white';
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
            percentage: Math.round(change * 10) / 10, // Redondear a 1 decimal
            hasComparison: true 
        };
    };

    if (isLoading) {
        return (
            <AdaptiveSkeleton 
                type="accordion" 
                className={className}
                showTitle={true}
                itemCount={3}
            />
        );
    }

    if (error) {
        return (
            <Card className={`${className} overflow-hidden border-0 bg-transparent shadow-none`}>
                <CardContent className="px-4 pt-1 pb-1">
                    <p className="text-sm text-red-600 dark:text-red-400">
                        Error al cargar datos mensuales de sucursales: {error.message}
                    </p>
                </CardContent>
            </Card>
        );
    }

    const branches = currentData?.data?.cards || {};
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
                        No hay datos mensuales de sucursales disponibles
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
                                                    ID: {branchData.store_id} • Mes: {startDate}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                                    {formatNumber(totalSales)}
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
                                        {/* Cuentas Abiertas */}
                                        <div className="flex items-center justify-between rounded-lg bg-[#E7D2BA]/50 px-3 py-2 dark:bg-[#E7D2BA]/20">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-[#E7D2BA] dark:bg-[#E7D2BA]">
                                                    <span className="text-xs font-bold text-[#6B5B47] dark:text-[#6B5B47]">A</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-[#6B5B47] dark:text-[#E7D2BA]">
                                                        Cuentas Abiertas
                                                    </p>
                                                    <p className="text-xs text-[#8B7355] dark:text-[#D4C4A8]">
                                                        {branchData.open_accounts.total} cuentas pendientes
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-[#6B5B47] dark:text-[#E7D2BA]">
                                                    {formatNumber(branchData.open_accounts.money)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Tickets Cerrados */}
                                        <div className="flex items-center justify-between rounded-lg bg-[#DABE9C]/50 px-3 py-2 dark:bg-[#DABE9C]/20">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-[#DABE9C] dark:bg-[#DABE9C]">
                                                    <span className="text-xs font-bold text-[#6B5B47] dark:text-[#6B5B47]">C</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-[#6B5B47] dark:text-[#DABE9C]">
                                                        Tickets Cerrados
                                                    </p>
                                                    <p className="text-xs text-[#8B7355] dark:text-[#C7A882]">
                                                        {branchData.closed_ticket.total} ventas completadas
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-[#6B5B47] dark:text-[#DABE9C]">
                                                    {formatNumber(branchData.closed_ticket.money)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Promedio por Ticket */}
                                        <div className="flex items-center justify-between rounded-lg bg-[#F6DABA]/50 px-3 py-2 dark:bg-[#F6DABA]/20">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-[#F6DABA] dark:bg-[#F6DABA]">
                                                    <span className="text-xs font-bold text-[#6B5B47] dark:text-[#6B5B47]">P</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-[#6B5B47] dark:text-[#F6DABA]">
                                                        Promedio por Ticket
                                                    </p>
                                                    <p className="text-xs text-[#8B7355] dark:text-[#E8C8A2]">
                                                        Valor medio mensual
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-[#6B5B47] dark:text-[#F6DABA]">
                                                    {formatNumber(branchData.average_ticket)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Footer con métricas mensuales adicionales */}
                                        <div className="border-t pt-3 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                                            <div className="flex items-center justify-between">
                                                <span>Total tickets del mes:</span>
                                                <span className="font-medium">{totalTickets}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span>Promedio diario:</span>
                                                <span className="font-medium">{formatNumber(totalSales / 30)}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span>Tickets por día:</span>
                                                <span className="font-medium">{Math.round(totalTickets / 30)}</span>
                                            </div>
                                            
                                            {/* Footer con botón Ver Detalles */}
                                            <div className="flex items-center justify-end pt-2">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (onBranchDetailsClick) {
                                                            const detailData: BranchDetailData = {
                                                                branchName,
                                                                storeId: branchData.store_id,
                                                                totalSales,
                                                                openAccounts: {
                                                                    total: branchData.open_accounts.total,
                                                                    money: branchData.open_accounts.money,
                                                                },
                                                                closedTickets: {
                                                                    total: branchData.closed_ticket.total,
                                                                    money: branchData.closed_ticket.money,
                                                                },
                                                                averageTicket: branchData.average_ticket,
                                                                percentage: branchData.percentage,
                                                                brand: branchData.brand,
                                                                region: branchData.region,
                                                                operationalAddress: branchData.operational_address,
                                                                generalAddress: branchData.general_address,
                                                            };
                                                            onBranchDetailsClick(detailData);
                                                        }
                                                    }}
                                                    className="flex items-center gap-2 rounded-lg bg-[#897053] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6B5B47] focus:ring-2 focus:ring-[#897053]/50 focus:outline-none touch-manipulation"
                                                >
                                                    Ver Detalles
                                                    <span className="text-xs">→</span>
                                                </button>
                                            </div>
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