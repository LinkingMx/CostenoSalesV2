import { router } from '@inertiajs/react';
import { HoursChartApiResponse, HoursChartApiRequest } from '@/types/chart-types';

class ChartApiService {
    private baseUrl = '/api/dashboard';

    async getHoursChart(date: string): Promise<HoursChartApiResponse> {
        try {
            // First try with fetch API
            return await this.fetchHoursChart(date);
        } catch (error) {
            // If fetch fails with session issues, try with Inertia for better session handling
            if (error instanceof Error && error.message.includes('Sesión expirada')) {
                console.warn('Session expired with fetch, trying Inertia method');
                return await this.getHoursChartViaInertia(date);
            }
            throw error;
        }
    }

    private async fetchHoursChart(date: string): Promise<HoursChartApiResponse> {
        const token = this.getCsrfToken();
        
        if (!token) {
            throw new Error('Token CSRF no encontrado. Por favor, recarga la página.');
        }
        
        const response = await fetch(`${this.baseUrl}/get-hours-chart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': token,
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'include', // Changed from 'same-origin' to 'include'
            body: JSON.stringify({ date } as HoursChartApiRequest),
        });

        if (!response.ok) {
            if (response.status === 419) {
                throw new Error('Sesión expirada. Por favor, recarga la página.');
            }
            
            if (response.status === 401) {
                throw new Error('No autorizado. Por favor, inicia sesión nuevamente.');
            }
            
            if (response.status === 422) {
                const errorData = await response.json().catch(() => ({}));
                const errors = errorData.errors || {};
                const firstError = Object.values(errors)[0];
                throw new Error(Array.isArray(firstError) ? firstError[0] : 'Error de validación');
            }
            
            if (response.status >= 500) {
                throw new Error('Error del servidor. Por favor, inténtalo más tarde.');
            }
            
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.message || 
                `Error HTTP ${response.status}: ${response.statusText}`
            );
        }

        const data: HoursChartApiResponse = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Error al obtener los datos de la gráfica');
        }

        return data;
    }

    private getCsrfToken(): string {
        // Try multiple ways to get CSRF token
        let token = '';
        
        // Method 1: Meta tag
        const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
        if (meta?.content) {
            token = meta.content;
        }
        
        // Method 2: Form token (if available)
        if (!token) {
            const hiddenInput = document.querySelector('input[name="_token"]') as HTMLInputElement;
            if (hiddenInput?.value) {
                token = hiddenInput.value;
            }
        }
        
        // Method 3: Global variable (Inertia often sets this)
        if (!token && (window as any).Laravel?.csrfToken) {
            token = (window as any).Laravel.csrfToken;
        }
        
        return token;
    }

    // Alternative method using Inertia's router for consistency
    async getHoursChartViaInertia(date: string): Promise<HoursChartApiResponse> {
        return new Promise((resolve, reject) => {
            router.post(`${this.baseUrl}/get-hours-chart`, 
                { date },
                {
                    onSuccess: (data: any) => {
                        // Handle successful response from Inertia
                        if (data && data.success) {
                            resolve(data as HoursChartApiResponse);
                        } else {
                            reject(new Error(data?.message || 'Respuesta inválida del servidor'));
                        }
                    },
                    onError: (errors: any) => {
                        console.error('Inertia request failed:', errors);
                        
                        // Handle validation errors
                        if (errors && typeof errors === 'object') {
                            const firstError = Object.values(errors)[0];
                            const errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
                            reject(new Error(errorMessage as string || 'Error de validación'));
                        } else {
                            reject(new Error('Error al procesar la solicitud'));
                        }
                    },
                    onFinish: () => {
                        // Clean up if needed
                    },
                    preserveState: true,
                    preserveScroll: true,
                    only: [], // Don't update any page props, just handle the response
                }
            );
        });
    }

    // Method to test API connectivity (for debugging)
    async testConnection(): Promise<boolean> {
        try {
            const response = await fetch('/api/dashboard/periods', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}

export const chartApiService = new ChartApiService();
export default chartApiService;