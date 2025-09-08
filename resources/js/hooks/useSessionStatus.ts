import { useEffect, useState } from 'react';
import { usePage, router } from '@inertiajs/react';

interface SessionStatus {
    lifetime: number;
    remaining: number;
    status: 'active' | 'inactive';
    warning: boolean;
    percentage: number;
}

export function useSessionStatus() {
    const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
    const { props } = usePage();

    useEffect(() => {
        const updateSessionStatus = (headers: Record<string, string>) => {
            const lifetime = parseInt(headers['x-session-lifetime']) || 0;
            const remaining = parseInt(headers['x-session-remaining']) || 0;
            const status = headers['x-session-status'] || 'inactive';
            const warning = headers['x-session-warning'] === 'expiring-soon';
            
            const percentage = lifetime > 0 ? Math.max(0, (remaining / lifetime) * 100) : 0;

            setSessionStatus({
                lifetime,
                remaining,
                status: status as 'active' | 'inactive',
                warning,
                percentage
            });
        };

        // Intercept Inertia.js requests to capture session headers
        const removeInterceptor = router.on('success', (event) => {
            const response = (event.detail as any).response;
            if (response && response.headers) {
                const headers: Record<string, string> = {};
                
                // Get session headers from response
                if (response.headers.get) {
                    headers['x-session-lifetime'] = response.headers.get('X-Session-Lifetime') || '';
                    headers['x-session-remaining'] = response.headers.get('X-Session-Remaining') || '';
                    headers['x-session-status'] = response.headers.get('X-Session-Status') || '';
                    headers['x-session-warning'] = response.headers.get('X-Session-Warning') || '';
                } else {
                    // Fallback for different response formats
                    Object.keys(response.headers).forEach(key => {
                        const lowerKey = key.toLowerCase();
                        if (lowerKey.startsWith('x-session-')) {
                            headers[lowerKey] = response.headers[key];
                        }
                    });
                }

                updateSessionStatus(headers);
            }
        });

        // Initial session status check via AJAX
        const checkSessionStatus = () => {
            fetch('/dashboard', {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                }
            }).then(response => {
                const headers: Record<string, string> = {};
                headers['x-session-lifetime'] = response.headers.get('X-Session-Lifetime') || '';
                headers['x-session-remaining'] = response.headers.get('X-Session-Remaining') || '';
                headers['x-session-status'] = response.headers.get('X-Session-Status') || '';
                headers['x-session-warning'] = response.headers.get('X-Session-Warning') || '';
                
                updateSessionStatus(headers);
            }).catch(() => {
                // Silently fail - session status will remain null
            });
        };

        checkSessionStatus();

        return () => {
            removeInterceptor();
        };
    }, []);

    return sessionStatus;
}