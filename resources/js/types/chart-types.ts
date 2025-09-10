export interface HourData {
    hour: string; // Format: "00:00", "01:00", etc.
    current: number; // Value for current day
    previous: number; // Value for same day previous week
    timestamp: string; // Full timestamp: "2025-08-20 00:00:00"
}

export interface HoursChartApiResponse {
    success: boolean;
    message: string;
    data: {
        [date: string]: {
            [hour: string]: number; // Format: {"07:00": 7958, "08:00": 12925, ...}
        };
    };
}

export interface HoursChartData {
    success: boolean;
    data: HourData[];
    currentDate: string; // Format: "2025-08-20"
    previousDate: string; // Format: "2025-08-13" (same day previous week)
    message?: string;
    error?: string;
}

export interface HoursChartApiRequest {
    date: string; // Format: "2025-08-20"
}

export interface HoursChartError {
    message: string;
    status?: number;
}

export interface UseHoursChartState {
    data: HourData[] | null;
    loading: boolean;
    error: HoursChartError | null;
    refetch: (date?: string) => Promise<void>;
}

// Weekly Batch API Types
export interface WeeklyBatchApiRequest {
    current_week: string[]; // Array of 7 date strings (YYYY-MM-DD)
    previous_week: string[]; // Array of 7 date strings (YYYY-MM-DD)
}

export interface WeeklyBatchDayData {
    total: number; // Total sales for the day
    details: {
        sales?: {
            total: number;
            subtotal: number;
        };
        cards?: Record<string, any>;
        [key: string]: any; // Flexible for additional data
    };
}

export interface WeeklyBatchMetadata {
    current_week_total: number;
    previous_week_total: number;
    week_over_week_change: number; // Percentage change
    request_time: string; // ISO timestamp
    cache_hit: boolean;
    total_requests?: number;
    failed_requests?: number;
    success_rate?: number;
    execution_time_ms?: number;
    execution_time_seconds?: number;
    performance_improvement?: string;
    demo_data?: boolean;
    is_fallback?: boolean;
    error_occurred?: boolean;
    fallback_available?: boolean;
}

export interface WeeklyBatchApiResponse {
    success: boolean;
    message: string;
    data: {
        current_week: Record<string, WeeklyBatchDayData>; // Key: YYYY-MM-DD, Value: day data
        previous_week: Record<string, WeeklyBatchDayData>;
        metadata: WeeklyBatchMetadata;
    };
}

export class WeeklyBatchError extends Error {
    public status?: number;
    public errors?: Record<string, string[]>;

    constructor(message: string, status?: number, errors?: Record<string, string[]>) {
        super(message);
        this.name = 'WeeklyBatchError';
        this.status = status;
        this.errors = errors;
    }
}

export interface UseWeeklyBatchState {
    data: WeeklyBatchApiResponse['data'] | null;
    loading: boolean;
    error: WeeklyBatchError | null;
    refetch: () => Promise<void>;
}