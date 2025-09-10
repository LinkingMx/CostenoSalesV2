import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { AdaptiveSkeleton } from '@/components/ui/adaptive-skeleton';
import { isTodayIncludedInRange } from '@/utils/date-utils';
import { type BranchDetailData } from '@/types/branch-detail';

interface BranchData {
    store_id: number;
    brand?: string;
    region?: string;
    operational_address?: string;
    general_address?: string;
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
}

interface MainDashboardData {
    success: boolean;
    message: string;
    data: {
        sales: {
            total: number;
            subtotal: number;
        };
        cards: Record<string, BranchData>;
    };
}

interface MonthlyBranchSummaryAccordionOptimizedProps {
    startDate?: string;
    endDate?: string;
    currentData: MainDashboardData | null;
    comparisonData: MainDashboardData | null;
    isLoading?: boolean;
    error?: Error | null;
    className?: string;
    onBranchDetailsClick?: (branchData: BranchDetailData) => void;
}

/**
 * OPTIMIZED Monthly Branch Summary Accordion Component
 * - Receives data from unified hook (no separate API calls)
 * - Coordinated loading state with other monthly components  
 * - Improved performance through data sharing
 */
export function MonthlyBranchSummaryAccordionOptimized({
    startDate,
    endDate,
    currentData,
    comparisonData,
    isLoading = false,
    error = null,
    className,
    onBranchDetailsClick
}: MonthlyBranchSummaryAccordionOptimizedProps) {
    const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());
    
    // Check if today is included in the date range to show/hide "Abiertas" section
    const showOpenAccounts = startDate && endDate ? isTodayIncludedInRange(startDate, endDate) : true;

    // Toggle branch expansion
    const toggleBranch = (branchName: string) => {
        const newExpanded = new Set(expandedBranches);
        if (newExpanded.has(branchName)) {
            newExpanded.delete(branchName);
        } else {
            newExpanded.add(branchName);
        }
        setExpandedBranches(newExpanded);
    };

    // Loading state is now coordinated with other components
    if (isLoading) {
        return (
            <AdaptiveSkeleton
                type="accordion"
                className="w-full"
                itemCount={6}
            />
        );
    }

    // Error state
    if (error) {
        return (
            <Card className={`${className} overflow-hidden border-0 bg-transparent shadow-none`}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        Resumen por Sucursal - Mensual
                    </CardTitle>
                </CardHeader>
                <CardContent className="pb-2 pt-4">
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-sm text-red-600 dark:text-red-400">
                            Error al cargar los datos: {error.message}
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // No data state
    if (!currentData?.data?.cards) {
        return (
            <Card className={`${className} overflow-hidden border-0 bg-transparent shadow-none`}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        Resumen por Sucursal - Mensual
                    </CardTitle>
                </CardHeader>
                <CardContent className="pb-2 pt-4">
                    <div className="flex items-center justify-center py-12 text-sm text-slate-500 dark:text-slate-400">
                        No hay datos disponibles para el período seleccionado
                    </div>
                </CardContent>
            </Card>
        );
    }

    const currentBranches = currentData.data.cards;
    const comparisonBranches = comparisonData?.data?.cards || {};

    // Format number consistently with other accordions
    const formatNumber = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    // Calculate branch percentage change for comparison with previous month
    const calculateBranchPercentageChange = (branchName: string, currentTotal: number) => {
        if (!comparisonData?.data?.cards) return { percentage: 0, hasComparison: false };
        
        const previousBranchData = comparisonData.data.cards[branchName] as BranchData | undefined;
        if (!previousBranchData) return { percentage: 0, hasComparison: false };
        
        const previousTotal = (previousBranchData.open_accounts?.money || 0) + (previousBranchData.closed_ticket?.money || 0);
        
        if (previousTotal === 0) return { percentage: 0, hasComparison: false };
        
        const change = ((currentTotal - previousTotal) / previousTotal) * 100;
        return { 
            percentage: Math.round(change * 10) / 10, // Round to 1 decimal
            hasComparison: true 
        };
    };

    // Get percentage color and arrow (consistent with daily/weekly accordions)
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

    // Get branches and sort them by total sales (descending) - consistent with daily/weekly
    const branchEntries = Object.entries(currentBranches as Record<string, BranchData>)
        .sort(([, branchA], [, branchB]) => {
            const totalSalesA = (branchA.open_accounts?.money || 0) + (branchA.closed_ticket?.money || 0);
            const totalSalesB = (branchB.open_accounts?.money || 0) + (branchB.closed_ticket?.money || 0);
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
                const totalSales = (branchData.open_accounts?.money || 0) + (branchData.closed_ticket?.money || 0);
                const totalTickets = (branchData.open_accounts?.total || 0) + (branchData.closed_ticket?.total || 0);
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
                                        {/* Abiertas - Only show if today is included in date range */}
                                        {showOpenAccounts && (
                                            <div className="flex items-center justify-between rounded-lg bg-[#E7D2BA]/50 px-3 py-2 dark:bg-[#E7D2BA]/20">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-6 w-6 items-center justify-center rounded bg-[#E7D2BA] dark:bg-[#E7D2BA]">
                                                        <span className="text-xs font-bold text-[#6B5B47] dark:text-[#6B5B47]">A</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-[#6B5B47] dark:text-[#E7D2BA]">
                                                            Abiertas
                                                        </p>
                                                        <p className="text-xs text-[#8B7355] dark:text-[#D4C4A8]">
                                                            Cuentas pendientes
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-[#6B5B47] dark:text-[#E7D2BA]">
                                                        ${formatNumber(branchData.open_accounts?.money || 0)}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Cerradas */}
                                        <div className="flex items-center justify-between rounded-lg bg-[#DABE9C]/50 px-3 py-2 dark:bg-[#DABE9C]/20">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-[#DABE9C] dark:bg-[#DABE9C]">
                                                    <span className="text-xs font-bold text-[#6B5B47] dark:text-[#6B5B47]">C</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-[#6B5B47] dark:text-[#DABE9C]">
                                                        Cerradas
                                                    </p>
                                                    <p className="text-xs text-[#8B7355] dark:text-[#C7A882]">
                                                        {showOpenAccounts ? 'Ventas completadas' : 'Ventas'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-[#6B5B47] dark:text-[#DABE9C]">
                                                    ${formatNumber(branchData.closed_ticket?.money || 0)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Promedio */}
                                        <div className="flex items-center justify-between rounded-lg bg-[#F6DABA]/50 px-3 py-2 dark:bg-[#F6DABA]/20">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-[#F6DABA] dark:bg-[#F6DABA]">
                                                    <span className="text-xs font-bold text-[#6B5B47] dark:text-[#6B5B47]">P</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-[#6B5B47] dark:text-[#F6DABA]">
                                                        Promedio
                                                    </p>
                                                    <p className="text-xs text-[#8B7355] dark:text-[#E8C8A2]">
                                                        Por ticket
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-[#6B5B47] dark:text-[#F6DABA]">
                                                    ${formatNumber(branchData.average_ticket || 0)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Footer con total de tickets */}
                                        <div className="flex items-center justify-between pt-3">
                                            <span className="text-xs text-slate-500 dark:text-slate-400">Total de tickets: {totalTickets}</span>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onBranchDetailsClick) {
                                                        const detailData: BranchDetailData = {
                                                            branchName,
                                                            storeId: branchData.store_id,
                                                            totalSales,
                                                            openAccounts: {
                                                                total: branchData.open_accounts?.total || 0,
                                                                money: branchData.open_accounts?.money || 0,
                                                            },
                                                            closedTickets: {
                                                                total: branchData.closed_ticket?.total || 0,
                                                                money: branchData.closed_ticket?.money || 0,
                                                            },
                                                            averageTicket: branchData.average_ticket || 0,
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
                                </CardContent>
                            </CollapsibleContent>
                        </Card>
                    </Collapsible>
                );
            })}
        </div>
    );
}