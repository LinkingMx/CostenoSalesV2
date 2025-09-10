/**
 * Types for Custom Date Range Components
 * Used for date ranges that are not single day, weekly, or monthly
 */

export interface CustomRangeData {
    success: boolean;
    message: string;
    data: {
        sales: {
            total: number;
            subtotal: number;
        };
        cards: Record<string, BranchCardData>;
    };
}

export interface BranchCardData {
    open_accounts: {
        total: number;
        money: number;
    };
    closed_ticket: {
        total: number;
        money: number;
    };
    average_ticket: number;
    date: string;
    store_id: number;
    brand?: string;
    region?: string;
}

export interface TopBranchData {
    name: string;
    total: number;
    openAccounts: number;
    closedTickets: number;
    averageTicket: number;
    rank: number;
    percentage: number;
}

// Extended interface for all branches data (not just top 5)
export interface AllBranchData {
    name: string;
    branchName: string;
    storeId: number;
    total: number;
    totalRevenue: number;
    openAccounts: number;
    openAmount: number;
    closedTickets: number;
    closedAmount: number;
    averageTicket: number;
    rank: number;
    percentage: number;
}

export interface CustomRangeChartData {
    date: string;
    [branchName: string]: number | string; // Dynamic branch keys for top 5 branches
}

export interface CustomRangeSummaryData {
    totalSales: number;
    dailyAverage: number;
    dayCount: number;
    periodDescription: string;
}

// Enhanced summary data that includes metrics from all branches
export interface AllBranchesSummaryData {
    totalSales: number;
    totalTickets: number;
    totalOpenAccounts: number;
    totalClosedTickets: number;
    averageTicket: number;
    branchCount: number;
    topBranchPercentage: number; // Percentage of sales from top branch
    dailyAverage: number;
    dayCount: number;
    periodDescription: string;
}

export interface CustomRangeMetrics {
    totalOpenAccounts: number;
    totalClosedTickets: number;
    averageTicket: number;
    topBranches: TopBranchData[];
    periodSummary: CustomRangeSummaryData;
}

// Error states for custom ranges
export const CUSTOM_RANGE_ERROR_MESSAGES = {
    RANGE_TOO_LARGE: 'El rango seleccionado es muy amplio. Máximo 90 días.',
    NO_DATA: 'No hay datos disponibles para el rango seleccionado.',
    API_ERROR: 'Error al cargar los datos. Por favor, intente nuevamente.',
    INVALID_DATES: 'Las fechas seleccionadas no son válidas.',
    RANGE_TOO_SMALL: 'El rango debe ser de al menos 2 días.'
} as const;

export type CustomRangeErrorType = keyof typeof CUSTOM_RANGE_ERROR_MESSAGES;