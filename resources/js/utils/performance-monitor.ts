// Advanced performance monitoring system for dashboard operations
interface PerformanceMetric {
    name: string;
    duration: number;
    timestamp: number;
    metadata?: Record<string, any>;
    success: boolean;
    error?: string;
}

interface NetworkMetric extends PerformanceMetric {
    url: string;
    method: string;
    status?: number;
    responseSize?: number;
    cacheHit?: boolean;
    retryCount?: number;
}

interface ComponentMetric extends PerformanceMetric {
    component: string;
    operation: 'render' | 'mount' | 'update' | 'unmount';
    props?: Record<string, any>;
}

class PerformanceMonitor {
    private metrics: PerformanceMetric[] = [];
    private readonly maxMetrics = 1000;
    private sessionId: string;
    private startTime: number;
    
    constructor() {
        this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        this.startTime = performance.now();
        
        // Log browser performance info on initialization
        this.logBrowserInfo();
    }
    
    private logBrowserInfo() {
        const nav = performance.navigation;
        const timing = performance.timing;
        
        console.log('🚀 Performance Monitor: Initialized', {
            sessionId: this.sessionId,
            userAgent: navigator.userAgent,
            connection: (navigator as any).connection?.effectiveType || 'unknown',
            memory: (performance as any).memory ? {
                used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)
            } : 'unavailable',
            pageLoad: {
                type: nav.type === 0 ? 'navigate' : nav.type === 1 ? 'reload' : nav.type === 2 ? 'back_forward' : 'reserved',
                domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                loadComplete: timing.loadEventEnd - timing.navigationStart
            }
        });
    }
    
    startTimer(name: string, metadata?: Record<string, any>): () => PerformanceMetric {
        const startTime = performance.now();
        const startTimestamp = Date.now();
        
        return (success = true, error?: string, additionalMetadata?: Record<string, any>) => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            const metric: PerformanceMetric = {
                name,
                duration,
                timestamp: startTimestamp,
                metadata: { ...metadata, ...additionalMetadata },
                success,
                error
            };
            
            this.addMetric(metric);
            
            // Log significant operations
            if (duration > 1000 || !success) {
                const emoji = success ? '⚡' : '⚠️';
                const status = success ? 'completed' : 'failed';
                console.log(`${emoji} Performance: ${name} ${status} in ${duration.toFixed(2)}ms`, {
                    metadata: metric.metadata,
                    error,
                    sessionId: this.sessionId
                });
            }
            
            return metric;
        };
    }
    
    trackNetworkRequest(url: string, method: string = 'GET', metadata?: Record<string, any>) {
        const timer = this.startTimer(`network_${method.toLowerCase()}_${url}`, { url, method, ...metadata });
        
        return {
            success: (status: number, responseSize?: number, cacheHit?: boolean, retryCount?: number) => {
                return timer(true, undefined, {
                    status,
                    responseSize,
                    cacheHit,
                    retryCount,
                    type: 'network'
                }) as NetworkMetric;
            },
            failure: (error: string, status?: number, retryCount?: number) => {
                return timer(false, error, {
                    status,
                    retryCount,
                    type: 'network'
                }) as NetworkMetric;
            }
        };
    }
    
    trackComponent(component: string, operation: 'render' | 'mount' | 'update' | 'unmount', props?: Record<string, any>) {
        const timer = this.startTimer(`component_${operation}_${component}`, { component, operation, props });
        
        return (success = true, error?: string) => {
            return timer(success, error, { type: 'component' }) as ComponentMetric;
        };
    }
    
    private addMetric(metric: PerformanceMetric) {
        this.metrics.push(metric);
        
        // Keep only the most recent metrics
        if (this.metrics.length > this.maxMetrics) {
            this.metrics = this.metrics.slice(-this.maxMetrics);
        }
        
        // Emit metric event for external monitoring
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('dashboard-metric', { detail: metric }));
        }
    }
    
    getMetrics(filter?: {
        name?: string;
        type?: string;
        success?: boolean;
        timeRange?: { start: number; end: number };
    }): PerformanceMetric[] {
        let filtered = [...this.metrics];
        
        if (filter) {
            if (filter.name) {
                filtered = filtered.filter(m => m.name.includes(filter.name!));
            }
            if (filter.type) {
                filtered = filtered.filter(m => m.metadata?.type === filter.type);
            }
            if (filter.success !== undefined) {
                filtered = filtered.filter(m => m.success === filter.success);
            }
            if (filter.timeRange) {
                filtered = filtered.filter(m => 
                    m.timestamp >= filter.timeRange!.start && 
                    m.timestamp <= filter.timeRange!.end
                );
            }
        }
        
        return filtered.sort((a, b) => b.timestamp - a.timestamp);
    }
    
    generateReport(timeRange?: { start: number; end: number }) {
        const metrics = this.getMetrics({ timeRange });
        
        if (metrics.length === 0) {
            return { message: 'No metrics available for the specified time range' };
        }
        
        // Group metrics by type
        const networkMetrics = metrics.filter(m => m.metadata?.type === 'network') as NetworkMetric[];
        const componentMetrics = metrics.filter(m => m.metadata?.type === 'component') as ComponentMetric[];
        
        // Calculate statistics
        const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
        const averageDuration = totalDuration / metrics.length;
        const successRate = (metrics.filter(m => m.success).length / metrics.length) * 100;
        
        const report = {
            sessionId: this.sessionId,
            sessionDuration: performance.now() - this.startTime,
            timeRange: timeRange ? `${new Date(timeRange.start).toISOString()} - ${new Date(timeRange.end).toISOString()}` : 'All time',
            summary: {
                totalOperations: metrics.length,
                totalDuration: Math.round(totalDuration),
                averageDuration: Math.round(averageDuration),
                successRate: Math.round(successRate * 100) / 100,
                failedOperations: metrics.filter(m => !m.success).length
            },
            network: {
                totalRequests: networkMetrics.length,
                averageResponseTime: networkMetrics.length > 0 ? 
                    Math.round(networkMetrics.reduce((sum, m) => sum + m.duration, 0) / networkMetrics.length) : 0,
                cacheHitRate: networkMetrics.length > 0 ?
                    Math.round((networkMetrics.filter(m => m.cacheHit).length / networkMetrics.length) * 100) : 0,
                retriesCount: networkMetrics.reduce((sum, m) => sum + (m.retryCount || 0), 0),
                errorsByStatus: this.groupBy(
                    networkMetrics.filter(m => !m.success),
                    m => String(m.status || 'unknown')
                )
            },
            components: {
                totalOperations: componentMetrics.length,
                renderOperations: componentMetrics.filter(m => m.operation === 'render').length,
                mountOperations: componentMetrics.filter(m => m.operation === 'mount').length,
                slowestComponents: componentMetrics
                    .sort((a, b) => b.duration - a.duration)
                    .slice(0, 5)
                    .map(m => ({ component: m.component, duration: Math.round(m.duration) }))
            },
            slowestOperations: metrics
                .sort((a, b) => b.duration - a.duration)
                .slice(0, 10)
                .map(m => ({
                    name: m.name,
                    duration: Math.round(m.duration),
                    success: m.success,
                    timestamp: new Date(m.timestamp).toISOString()
                })),
            errors: metrics
                .filter(m => !m.success)
                .map(m => ({
                    name: m.name,
                    error: m.error,
                    timestamp: new Date(m.timestamp).toISOString(),
                    metadata: m.metadata
                }))
        };
        
        return report;
    }
    
    private groupBy<T, K extends keyof any>(array: T[], key: (item: T) => K): Record<K, number> {
        return array.reduce((result, item) => {
            const group = key(item);
            result[group] = (result[group] || 0) + 1;
            return result;
        }, {} as Record<K, number>);
    }
    
    exportMetrics(format: 'json' | 'csv' = 'json') {
        const metrics = this.getMetrics();
        
        if (format === 'csv') {
            const headers = ['timestamp', 'name', 'duration', 'success', 'error', 'metadata'];
            const rows = metrics.map(m => [
                new Date(m.timestamp).toISOString(),
                m.name,
                m.duration,
                m.success,
                m.error || '',
                JSON.stringify(m.metadata || {})
            ]);
            
            return [headers, ...rows].map(row => row.join(',')).join('\n');
        }
        
        return JSON.stringify({
            sessionId: this.sessionId,
            exportedAt: new Date().toISOString(),
            metrics
        }, null, 2);
    }
    
    clear() {
        const count = this.metrics.length;
        this.metrics = [];
        console.log(`🗑️ Performance Monitor: Cleared ${count} metrics`);
    }
    
    // Log performance summary to console
    logSummary() {
        const report = this.generateReport();
        console.log('📊 Performance Monitor: Session Summary', report);
    }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Global performance tracking functions
export const trackOperation = (name: string, metadata?: Record<string, any>) =>
    performanceMonitor.startTimer(name, metadata);

export const trackNetworkRequest = (url: string, method?: string, metadata?: Record<string, any>) =>
    performanceMonitor.trackNetworkRequest(url, method, metadata);

export const trackComponent = (component: string, operation: ComponentMetric['operation'], props?: Record<string, any>) =>
    performanceMonitor.trackComponent(component, operation, props);

// Auto-log summary on page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        performanceMonitor.logSummary();
    });
    
    // Expose to global scope for debugging
    (window as any).__performanceMonitor = performanceMonitor;
}