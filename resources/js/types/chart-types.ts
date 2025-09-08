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