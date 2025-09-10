import { useMemo } from 'react';
import { BranchCardData, AllBranchData, AllBranchesSummaryData } from '../types/custom-range';

/**
 * Hook for calculating and ranking ALL branches from branch data
 * Unlike useTopBranches, this returns complete data for all branches
 */
export function useAllBranches(branchData: Record<string, BranchCardData> | undefined): {
    allBranches: AllBranchData[];
    summaryData: AllBranchesSummaryData;
} {
    return useMemo(() => {
        if (!branchData || typeof branchData !== 'object') {
            return {
                allBranches: [],
                summaryData: {
                    totalSales: 0,
                    totalTickets: 0,
                    totalOpenAccounts: 0,
                    totalClosedTickets: 0,
                    averageTicket: 0,
                    branchCount: 0,
                    topBranchPercentage: 0,
                    dailyAverage: 0,
                    dayCount: 0,
                    periodDescription: '',
                }
            };
        }

        // Convert branch data to array and calculate totals
        const branches = Object.entries(branchData)
            .map(([name, data]) => {
                const totalSales = (data.open_accounts?.money || 0) + (data.closed_ticket?.money || 0);
                const totalTickets = (data.open_accounts?.total || 0) + (data.closed_ticket?.total || 0);
                
                return {
                    name: name.trim(),
                    branchName: name.trim(),
                    storeId: data.store_id || 0,
                    total: totalSales,
                    totalRevenue: totalSales,
                    openAccounts: data.open_accounts?.total || 0,
                    openAmount: data.open_accounts?.money || 0,
                    closedTickets: data.closed_ticket?.total || 0,
                    closedAmount: data.closed_ticket?.money || 0,
                    averageTicket: data.average_ticket || 0,
                    rank: 0, // Will be set after sorting
                    percentage: 0 // Will be calculated after getting totals
                };
            })
            .filter(branch => branch.total > 0) // Only include branches with sales
            .sort((a, b) => b.total - a.total); // Sort by total sales (descending)

        // Calculate total values across ALL branches
        const totalSales = branches.reduce((sum, branch) => sum + branch.total, 0);
        const totalOpenAccounts = branches.reduce((sum, branch) => sum + branch.openAccounts, 0);
        const totalClosedTickets = branches.reduce((sum, branch) => sum + branch.closedTickets, 0);
        const totalTickets = totalOpenAccounts + totalClosedTickets;
        
        // Calculate average ticket across all branches (weighted by tickets)
        const averageTicket = totalTickets > 0 ? totalSales / totalTickets : 0;
        
        // Calculate percentage for each branch and assign ranks
        const allBranches = branches.map((branch, index) => ({
            ...branch,
            rank: index + 1,
            percentage: totalSales > 0 ? (branch.total / totalSales) * 100 : 0
        }));

        // Summary data for all branches
        const summaryData: AllBranchesSummaryData = {
            totalSales,
            totalTickets,
            totalOpenAccounts,
            totalClosedTickets,
            averageTicket,
            branchCount: branches.length,
            topBranchPercentage: allBranches.length > 0 ? allBranches[0].percentage : 0,
            dailyAverage: 0, // Will be calculated in the parent hook
            dayCount: 0, // Will be calculated in the parent hook
            periodDescription: '', // Will be calculated in the parent hook
        };

        return {
            allBranches,
            summaryData
        };
    }, [branchData]);
}

/**
 * Utility function to get top N branches from all branches data
 */
export function getTopBranches(allBranches: AllBranchData[], count: number = 5): AllBranchData[] {
    return allBranches.slice(0, count);
}

/**
 * Utility function to format branch statistics
 */
export function formatBranchStats(branch: AllBranchData): {
    formattedRevenue: string;
    formattedAverage: string;
    totalTickets: number;
    salesPercentage: string;
} {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return {
        formattedRevenue: formatCurrency(branch.total),
        formattedAverage: formatCurrency(branch.averageTicket),
        totalTickets: branch.openAccounts + branch.closedTickets,
        salesPercentage: `${branch.percentage.toFixed(1)}%`,
    };
}

/**
 * Utility function to analyze branch performance distribution
 */
export function analyzeBranchDistribution(allBranches: AllBranchData[]): {
    topTier: AllBranchData[]; // Top 20% of branches
    midTier: AllBranchData[]; // Middle 60% of branches
    bottomTier: AllBranchData[]; // Bottom 20% of branches
    performanceMetrics: {
        topTierSalesPercentage: number;
        averageBranchSales: number;
        medianBranchSales: number;
    };
} {
    if (allBranches.length === 0) {
        return {
            topTier: [],
            midTier: [],
            bottomTier: [],
            performanceMetrics: {
                topTierSalesPercentage: 0,
                averageBranchSales: 0,
                medianBranchSales: 0,
            }
        };
    }

    const branchCount = allBranches.length;
    const topTierCount = Math.ceil(branchCount * 0.2);
    const bottomTierCount = Math.ceil(branchCount * 0.2);
    
    const topTier = allBranches.slice(0, topTierCount);
    const bottomTier = allBranches.slice(-bottomTierCount);
    const midTier = allBranches.slice(topTierCount, branchCount - bottomTierCount);

    // Calculate performance metrics
    const totalSales = allBranches.reduce((sum, branch) => sum + branch.total, 0);
    const topTierSales = topTier.reduce((sum, branch) => sum + branch.total, 0);
    const averageBranchSales = totalSales / branchCount;
    
    // Calculate median
    const sortedSales = allBranches.map(b => b.total).sort((a, b) => a - b);
    const midIndex = Math.floor(sortedSales.length / 2);
    const medianBranchSales = sortedSales.length % 2 === 0 
        ? (sortedSales[midIndex - 1] + sortedSales[midIndex]) / 2 
        : sortedSales[midIndex];

    return {
        topTier,
        midTier,
        bottomTier,
        performanceMetrics: {
            topTierSalesPercentage: totalSales > 0 ? (topTierSales / totalSales) * 100 : 0,
            averageBranchSales,
            medianBranchSales,
        }
    };
}