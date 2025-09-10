export interface BranchDetailData {
  branchName: string;
  storeId: number;
  totalSales: number;
  openAccounts: {
    total: number;
    money: number;
  };
  closedTickets: {
    total: number;
    money: number;
  };
  averageTicket: number;
  percentage?: {
    icon: string;
    qty: string;
  };
  brand?: string;
  region?: string;
  operationalAddress?: string;
  generalAddress?: string;
}

export interface BranchDetailDrawerProps {
  isOpen: boolean;
  branchData: BranchDetailData | null;
  onClose: () => void;
}

export type ChartPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface ChartPeriodOption {
  value: ChartPeriod;
  label: string;
}