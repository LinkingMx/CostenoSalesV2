import { useState, useEffect } from 'react';

interface WeekData {
    week: string;
    weekName: string;
    current: number;
    previous: number;
}

interface UseMonthlyChartDataResult {
    data: WeekData[];
    loading: boolean;
    error: Error | null;
    refetch: () => void;
}

export function useMonthlyChartDataSimple(startDate: string, endDate: string): UseMonthlyChartDataResult {
    const [data, setData] = useState<WeekData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    
    // Don't make API calls if dates are empty
    const shouldFetch = startDate && endDate && startDate.trim() !== '' && endDate.trim() !== '';

    useEffect(() => {
        if (!shouldFetch) {
            setData([]);
            setLoading(false);
            setError(null);
            return;
        }

        // Show loading state
        setLoading(true);
        setError(null);

        // Simulate API delay for better UX
        const timeout = setTimeout(() => {
            // Create demo data for 4 weeks
            const demoData: WeekData[] = [];
            for (let i = 0; i < 4; i++) {
                demoData.push({
                    week: `Sem ${i + 1}`,
                    weekName: `Semana ${i + 1}`,
                    current: Math.floor(Math.random() * 400000) + 200000,
                    previous: Math.floor(Math.random() * 400000) + 200000,
                });
            }
            
            setData(demoData);
            setLoading(false);
        }, 1000); // 1 second delay for realistic loading

        return () => clearTimeout(timeout);
    }, [shouldFetch, startDate, endDate]);

    const refetch = () => {
        if (shouldFetch) {
            setLoading(true);
            // Re-trigger the effect
        }
    };

    return {
        data,
        loading,
        error,
        refetch,
    };
}