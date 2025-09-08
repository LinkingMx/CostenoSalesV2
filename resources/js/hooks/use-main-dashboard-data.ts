import { useState, useEffect, useCallback } from 'react';

interface MainDashboardData {
    success: boolean;
    message: string;
    data: {
        sales: {
            total: number;
            subtotal: number;
        };
        cards: Record<string, {
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
            store_id: number;
            brand?: string;
            region?: string;
            operational_address?: string;
            general_address?: string;
        }>;
    };
}

interface UseMainDashboardDataResult {
    data: MainDashboardData | null;
    comparisonData: MainDashboardData | null;
    loading: boolean;
    error: Error | null;
    percentageChange: number | null;
    previousAmount: number | null;
    refetch: () => Promise<void>;
}

export function useMainDashboardData(startDate?: string, endDate?: string): UseMainDashboardDataResult {
    const [data, setData] = useState<MainDashboardData | null>(null);
    const [comparisonData, setComparisonData] = useState<MainDashboardData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [percentageChange, setPercentageChange] = useState<number | null>(null);
    const [previousAmount, setPreviousAmount] = useState<number | null>(null);

    const getCsrfToken = (): string => {
        let token = '';
        
        // Try multiple methods to get CSRF token
        const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
        if (meta?.content) {
            token = meta.content;
        }
        
        if (!token) {
            const tokenInput = document.querySelector('input[name="_token"]') as HTMLInputElement;
            if (tokenInput?.value) {
                token = tokenInput.value;
            }
        }
        
        if (!token) {
            const cookieMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
            if (cookieMatch) {
                token = decodeURIComponent(cookieMatch[1]);
            }
        }
        
        return token;
    };

    // Calculate previous week same day
    const getPreviousWeekDate = (dateString: string) => {
        const date = new Date(dateString);
        const previousWeek = new Date(date);
        previousWeek.setDate(date.getDate() - 7);
        return previousWeek.toISOString().split('T')[0];
    };

    const fetchData = useCallback(async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            const csrfToken = getCsrfToken();
            
            // Build URL for current data
            const url = new URL('/api/dashboard/main-data', window.location.origin);
            if (startDate) {
                url.searchParams.append('start_date', startDate);
            }
            if (endDate) {
                url.searchParams.append('end_date', endDate);
            }
            
            // Fetch current data
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            });

            if (!response.ok) {
                if (response.status === 419) {
                    // Session expired, try to reload page
                    window.location.reload();
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Error al obtener los datos del dashboard');
            }

            setData(result);

            // If we have start date, fetch comparison data (previous week same day)
            if (startDate) {
                const previousWeekDate = getPreviousWeekDate(startDate);
                const comparisonEndDate = endDate ? getPreviousWeekDate(endDate) : previousWeekDate;
                
                // Build URL for comparison data
                const comparisonUrl = new URL('/api/dashboard/main-data', window.location.origin);
                comparisonUrl.searchParams.append('start_date', previousWeekDate);
                comparisonUrl.searchParams.append('end_date', comparisonEndDate);
                
                try {
                    const comparisonResponse = await fetch(comparisonUrl.toString(), {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': csrfToken,
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        credentials: 'same-origin'
                    });

                    if (comparisonResponse.ok) {
                        const comparisonResult = await comparisonResponse.json();
                        if (comparisonResult.success) {
                            setComparisonData(comparisonResult);
                            
                            // Calculate percentage change
                            const currentTotal = result.data?.sales?.total || 0;
                            const previousTotal = comparisonResult.data?.sales?.total || 0;
                            
                            if (previousTotal > 0) {
                                const change = ((currentTotal - previousTotal) / previousTotal) * 100;
                                setPercentageChange(Math.round(change * 10) / 10); // Round to 1 decimal
                            }
                            setPreviousAmount(previousTotal);
                        }
                    }
                } catch (comparisonErr) {
                    // If comparison fails, continue with main data
                    console.warn('Failed to fetch comparison data:', comparisonErr);
                }
            }

        } catch (err) {
            console.error('Error fetching main dashboard data:', err);
            setError(err instanceof Error ? err : new Error('Error desconocido'));
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        // Only fetch if we have valid dates and they're not empty
        if (startDate && endDate && startDate.trim() !== '' && endDate.trim() !== '') {
            fetchData();
        } else {
            // Reset state if dates are invalid
            setData(null);
            setComparisonData(null);
            setLoading(false);
            setError(null);
            setPercentageChange(null);
            setPreviousAmount(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate]); // Only depend on dates, not fetchData to prevent infinite loops

    return {
        data,
        comparisonData,
        loading,
        error,
        percentageChange,
        previousAmount,
        refetch: fetchData,
    };
}