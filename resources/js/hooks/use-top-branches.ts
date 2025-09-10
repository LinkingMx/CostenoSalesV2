import { useMemo } from 'react';
import { BranchCardData, TopBranchData } from '../types/custom-range';

/**
 * Hook for calculating and ranking top 5 branches from branch data
 * Used by custom range components to filter and display only the best performing branches
 */
export function useTopBranches(branchData: Record<string, BranchCardData> | undefined): TopBranchData[] {
    return useMemo(() => {
        if (!branchData || typeof branchData !== 'object') {
            return [];
        }

        // Convert branch data to array and calculate totals
        const branches = Object.entries(branchData)
            .map(([name, data]) => {
                const totalSales = (data.open_accounts?.money || 0) + (data.closed_ticket?.money || 0);
                
                return {
                    name: name.trim(),
                    total: totalSales,
                    openAccounts: data.open_accounts?.total || 0,
                    closedTickets: data.closed_ticket?.total || 0,
                    averageTicket: data.average_ticket || 0,
                    rank: 0, // Will be set after sorting
                    percentage: 0 // Will be calculated after getting top 5
                };
            })
            .filter(branch => branch.total > 0) // Only include branches with sales
            .sort((a, b) => b.total - a.total); // Sort by total sales (descending)

        // Get only top 5 branches
        const top5Branches = branches.slice(0, 5);

        // Calculate total of top 5 for percentage calculation
        const top5Total = top5Branches.reduce((sum, branch) => sum + branch.total, 0);

        // Add rank and percentage to top 5 branches
        return top5Branches.map((branch, index) => ({
            ...branch,
            rank: index + 1,
            percentage: top5Total > 0 ? (branch.total / top5Total) * 100 : 0
        }));
    }, [branchData]);
}

/**
 * Utility function to format branch name for display
 */
export function formatBranchName(name: string): string {
    if (!name) return 'Sin nombre';
    
    // Remove common prefixes and clean up the name
    return name
        .replace(/^(sucursal|branch|tienda|store)\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Utility function to get branch color for charts
 */
export function getBranchColor(rank: number): string {
    const colors = [
        'hsl(var(--chart-1))', // Rank 1 - Primary color
        'hsl(var(--chart-2))', // Rank 2 - Secondary color  
        'hsl(var(--chart-3))', // Rank 3 - Third color
        'hsl(var(--chart-4))', // Rank 4 - Fourth color
        'hsl(var(--chart-5))', // Rank 5 - Fifth color
    ];
    
    return colors[rank - 1] || colors[4]; // Fallback to last color
}

/**
 * Hook to validate if we have enough data for top branches display
 */
export function useTopBranchesValidation(topBranches: TopBranchData[]) {
    return useMemo(() => {
        const hasData = topBranches.length > 0;
        const hasMinimumBranches = topBranches.length >= 3; // At least 3 branches recommended
        const hasMeaningfulData = topBranches.some(branch => branch.total > 0);
        
        return {
            hasData,
            hasMinimumBranches,
            hasMeaningfulData,
            isValid: hasData && hasMeaningfulData,
            branchCount: topBranches.length
        };
    }, [topBranches]);
}