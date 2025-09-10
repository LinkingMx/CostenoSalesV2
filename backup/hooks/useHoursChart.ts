import { useState, useEffect, useCallback } from 'react';
import { chartApiService } from '@/services/chart-api';
import { HourData, HoursChartError, UseHoursChartState, HoursChartApiResponse } from '@/types/chart-types';

// Transform API response to chart data format
function transformApiData(apiResponse: HoursChartApiResponse): HourData[] {
    if (!apiResponse.success || !apiResponse.data) {
        return [];
    }

    // Get all date keys and sort them (oldest to newest)
    const dateKeys = Object.keys(apiResponse.data).sort();
    
    // Take the last 2 dates (most recent)
    const lastTwoDates = dateKeys.slice(-2);
    
    if (lastTwoDates.length < 2) {
        // If we only have one date, use it as current and set previous to 0
        const singleDate = lastTwoDates[0];
        const singleDateData = apiResponse.data[singleDate];
        
        return Object.entries(singleDateData).map(([hour, value]) => ({
            hour,
            current: value,
            previous: 0,
            timestamp: `${singleDate} ${hour}:00`
        }));
    }

    const [previousDate, currentDate] = lastTwoDates;
    const currentData = apiResponse.data[currentDate];
    const previousData = apiResponse.data[previousDate];

    // Use the order from the API data (which comes from the most recent date)
    // The API determines the natural business hour flow
    const apiHours = Object.keys(currentData).length > 0 ? Object.keys(currentData) : Object.keys(previousData);
    
    // Get all unique hours from both datasets but maintain API order
    const allHours = new Set([...apiHours]);
    
    // Add any missing hours from previous data at the end
    Object.keys(previousData).forEach(hour => {
        if (!allHours.has(hour)) {
            allHours.add(hour);
        }
    });

    // Convert to array maintaining the original API order
    const sortedHours = Array.from(allHours);

    return sortedHours.map(hour => ({
        hour,
        current: currentData[hour] || 0,
        previous: previousData[hour] || 0,
        timestamp: `${currentDate} ${hour}:00`
    }));
}

export function useHoursChart(initialDate?: string): UseHoursChartState {
    const [data, setData] = useState<HourData[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<HoursChartError | null>(null);

    const fetchData = useCallback(async (date: string) => {
        if (!date) return;

        setLoading(true);
        setError(null);

        try {
            const apiResponse = await chartApiService.getHoursChart(date);
            const transformedData = transformApiData(apiResponse);
            setData(transformedData);
        } catch (err) {
            const error: HoursChartError = {
                message: err instanceof Error ? err.message : 'Error desconocido',
                status: err instanceof Error && 'status' in err ? (err as any).status : undefined
            };
            setError(error);
            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const refetch = useCallback(async (date?: string) => {
        const targetDate = date || getCurrentDate();
        await fetchData(targetDate);
    }, [fetchData]);

    // Initial fetch effect
    useEffect(() => {
        const targetDate = initialDate || getCurrentDate();
        fetchData(targetDate);
    }, [initialDate, fetchData]);

    return {
        data,
        loading,
        error,
        refetch
    };
}

// Helper function to get current date in YYYY-MM-DD format
function getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
}

// Custom hook variant that accepts a reactive date
export function useHoursChartWithDate(date: string): UseHoursChartState {
    const [data, setData] = useState<HourData[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<HoursChartError | null>(null);

    const fetchData = useCallback(async (targetDate: string) => {
        if (!targetDate) return;

        setLoading(true);
        setError(null);

        try {
            const apiResponse = await chartApiService.getHoursChart(targetDate);
            const transformedData = transformApiData(apiResponse);
            setData(transformedData);
        } catch (err) {
            const error: HoursChartError = {
                message: err instanceof Error ? err.message : 'Error desconocido',
                status: err instanceof Error && 'status' in err ? (err as any).status : undefined
            };
            setError(error);
            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const refetch = useCallback(async (newDate?: string) => {
        const targetDate = newDate || date;
        await fetchData(targetDate);
    }, [fetchData, date]);

    // Fetch data whenever date changes
    useEffect(() => {
        fetchData(date);
    }, [date, fetchData]);

    return {
        data,
        loading,
        error,
        refetch
    };
}

// Export utility function for other components
export { getCurrentDate };