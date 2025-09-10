import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Building } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TopBranchData, AllBranchData } from '@/types/custom-range';
import { cn } from '@/lib/utils';
import { isTodayIncludedInRange } from '@/utils/date-utils';
import { type BranchDetailData } from '@/types/branch-detail';

interface CustomRangeBranchSummaryProps {
    topBranches?: TopBranchData[];
    allBranches?: AllBranchData[];
    startDate: string;
    endDate: string;
    className?: string;
    onBranchDetailsClick?: (branchData: BranchDetailData) => void;
}

/**
 * Branch summary accordion for custom date ranges
 * Follows the same design pattern as BranchSummaryAccordion but WITHOUT comparison badges
 * Now shows ALL branches (not just top 5) when allBranches data is available
 */
export function CustomRangeBranchSummary({ 
    topBranches, 
    allBranches,
    startDate,
    endDate,
    className = '',
    onBranchDetailsClick
}: CustomRangeBranchSummaryProps) {
    const [expandedBranches, setExpandedBranches] = useState<Set<number>>(new Set());
    
    // Prefer allBranches data when available, fallback to topBranches
    const branchesData = allBranches && allBranches.length > 0 ? allBranches : topBranches || [];
    const useAllBranchesData = allBranches && allBranches.length > 0;
    
    // Check if today is included in the date range to show/hide "Abiertas" section
    const showOpenAccounts = isTodayIncludedInRange(startDate, endDate);
    
    const formatNumber = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const toggleBranch = (index: number) => {
        const newExpanded = new Set(expandedBranches);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedBranches(newExpanded);
    };
    
    // Don't render if no branches data
    if (!branchesData || branchesData.length === 0) {
        return (
            <Card className={cn("overflow-hidden border-0 bg-transparent shadow-none", className)}>
                <CardContent className="px-4 pt-1 pb-1">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        No hay datos de sucursales disponibles
                    </p>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <div className={cn("space-y-2", className)}>
            {/* Header with summary when showing all branches */}
            {useAllBranchesData && (
                <Card className="overflow-hidden border border-slate-200/50 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-slate-700/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            Todas las Sucursales ({branchesData.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                            Mostrando el rendimiento completo de todas las ubicaciones ordenadas por ventas totales
                        </p>
                    </CardContent>
                </Card>
            )}
            
            {branchesData.map((branch, index) => {
                const isExpanded = expandedBranches.has(index);

                return (
                    <Collapsible key={`branch-${index}`} open={isExpanded} onOpenChange={() => toggleBranch(index)}>
                        <Card className="overflow-hidden border border-slate-200/50 bg-white/50 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
                            <CollapsibleTrigger className="w-full">
                                <CardContent className="px-4 py-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 dark:bg-slate-100">
                                                <span className="text-xs font-bold text-white dark:text-slate-900">
                                                    {branch.rank}
                                                </span>
                                            </div>
                                            <div className="text-left">
                                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                                    {useAllBranchesData ? (branch as AllBranchData).branchName : branch.name}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    {branch.percentage.toFixed(1)}% del total
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                                    ${formatNumber(branch.total)}
                                                </p>
                                                {/* NO badges comparativos aquí - siguiendo especificación */}
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
                                                    {branch.openAccounts.toLocaleString()}
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
                                                    {branch.closedTickets.toLocaleString()}
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
                                                    ${formatNumber(branch.averageTicket)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Footer con total de tickets */}
                                        <div className="space-y-3 pt-3">
                                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                                <span>Total de tickets: {branch.openAccounts + branch.closedTickets}</span>
                                                <span>Ranking: #{branch.rank} de {branchesData.length}</span>
                                            </div>
                                            <div className="flex items-center justify-center">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (onBranchDetailsClick) {
                                                            const allBranchData = branch as AllBranchData;
                                                            const detailData: BranchDetailData = {
                                                                branchName: useAllBranchesData ? allBranchData.branchName : branch.name,
                                                                storeId: useAllBranchesData ? allBranchData.storeId : 0,
                                                                totalSales: useAllBranchesData ? allBranchData.totalRevenue : branch.total,
                                                                openAccounts: {
                                                                    total: branch.openAccounts,
                                                                    money: useAllBranchesData ? allBranchData.openAmount : 0,
                                                                },
                                                                closedTickets: {
                                                                    total: branch.closedTickets,
                                                                    money: useAllBranchesData ? allBranchData.closedAmount : 0,
                                                                },
                                                                averageTicket: branch.averageTicket,
                                                                percentage: {
                                                                    icon: '→',
                                                                    qty: '0',
                                                                },
                                                                brand: undefined,
                                                                region: undefined,
                                                                operationalAddress: undefined,
                                                                generalAddress: undefined,
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

/**
 * Loading state component for CustomRangeBranchSummary
 */
export function CustomRangeBranchSummaryLoading({ className = '' }: { className?: string }) {
    return (
        <div className={className}>
            <div className="mb-3">
                <div className="h-4 w-32 bg-muted rounded animate-pulse mb-1" />
                <div className="h-3 w-48 bg-muted rounded animate-pulse" />
            </div>
            
            <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="border border-border/40 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-6 h-6 bg-muted rounded-full animate-pulse" />
                                <div>
                                    <div className="h-4 w-24 bg-muted rounded animate-pulse mb-1" />
                                    <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="h-4 w-20 bg-muted rounded animate-pulse mb-1" />
                                <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}