// Advanced cache manager for dashboard data
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiryTime: number;
    requestId: string;
}

interface CacheOptions {
    ttl?: number; // Time to live in milliseconds
    maxSize?: number; // Maximum cache entries
    staleWhileRevalidate?: boolean; // Allow stale data while revalidating
}

class CacheManager {
    private cache = new Map<string, CacheEntry<any>>();
    private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
    private readonly maxSize = 100;
    
    constructor(private options: CacheOptions = {}) {}
    
    generateKey(prefix: string, params: Record<string, any>): string {
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');
        return `${prefix}:${sortedParams}`;
    }
    
    set<T>(key: string, data: T, requestId: string, customTTL?: number): void {
        const ttl = customTTL || this.options.ttl || this.defaultTTL;
        const now = Date.now();
        
        // Evict oldest entries if cache is full
        if (this.cache.size >= (this.options.maxSize || this.maxSize)) {
            const oldestKey = Array.from(this.cache.entries())
                .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
            this.cache.delete(oldestKey);
        }
        
        this.cache.set(key, {
            data,
            timestamp: now,
            expiryTime: now + ttl,
            requestId
        });
        
        console.log(`🗄️ Cache: Stored data for key '${key}' (TTL: ${ttl}ms, RequestID: ${requestId})`);
    }
    
    get<T>(key: string): { data: T; isStale: boolean } | null {
        const entry = this.cache.get(key) as CacheEntry<T> | undefined;
        
        if (!entry) {
            console.log(`🗄️ Cache: Miss for key '${key}'`);
            return null;
        }
        
        const now = Date.now();
        const isExpired = now > entry.expiryTime;
        const isStale = isExpired && this.options.staleWhileRevalidate;
        
        if (isExpired && !this.options.staleWhileRevalidate) {
            console.log(`🗄️ Cache: Expired entry for key '${key}', removing`);
            this.cache.delete(key);
            return null;
        }
        
        console.log(`🗄️ Cache: Hit for key '${key}' (Age: ${now - entry.timestamp}ms, Stale: ${isStale})`);
        return {
            data: entry.data,
            isStale: isStale || false
        };
    }
    
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;
        
        const now = Date.now();
        if (now > entry.expiryTime && !this.options.staleWhileRevalidate) {
            this.cache.delete(key);
            return false;
        }
        
        return true;
    }
    
    invalidate(keyPattern: string): number {
        let removed = 0;
        const regex = new RegExp(keyPattern.replace(/\*/g, '.*'));
        
        for (const [key] of this.cache) {
            if (regex.test(key)) {
                this.cache.delete(key);
                removed++;
                console.log(`🗄️ Cache: Invalidated key '${key}'`);
            }
        }
        
        console.log(`🗄️ Cache: Invalidated ${removed} entries matching pattern '${keyPattern}'`);
        return removed;
    }
    
    clear(): void {
        const size = this.cache.size;
        this.cache.clear();
        console.log(`🗄️ Cache: Cleared ${size} entries`);
    }
    
    getStats() {
        const entries = Array.from(this.cache.values());
        const now = Date.now();
        
        return {
            totalEntries: entries.length,
            expiredEntries: entries.filter(entry => now > entry.expiryTime).length,
            totalSize: this.cache.size,
            oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : null,
            newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : null
        };
    }
}

// Singleton cache instances
export const monthlyDataCache = new CacheManager({
    ttl: 10 * 60 * 1000, // 10 minutes for monthly data
    maxSize: 50,
    staleWhileRevalidate: true
});

export const weeklyDataCache = new CacheManager({
    ttl: 5 * 60 * 1000, // 5 minutes for weekly data
    maxSize: 100,
    staleWhileRevalidate: true
});

export const dailyDataCache = new CacheManager({
    ttl: 2 * 60 * 1000, // 2 minutes for daily data
    maxSize: 200,
    staleWhileRevalidate: true
});

// Helper function for cache key generation
export function createCacheKey(prefix: string, params: Record<string, any>): string {
    return monthlyDataCache.generateKey(prefix, params);
}

// Helper to invalidate related cache entries
export function invalidateRelatedCache(dateRange: { start: string; end: string }) {
    const patterns = [
        `monthly:*start_date=${dateRange.start}*`,
        `weekly:*start_date=${dateRange.start}*`,
        `daily:*date=${dateRange.start}*`,
        `main-dashboard:*start_date=${dateRange.start}*`
    ];
    
    let totalInvalidated = 0;
    patterns.forEach(pattern => {
        totalInvalidated += monthlyDataCache.invalidate(pattern);
        totalInvalidated += weeklyDataCache.invalidate(pattern);
        totalInvalidated += dailyDataCache.invalidate(pattern);
    });
    
    console.log(`🗄️ Cache: Invalidated ${totalInvalidated} entries for date range ${dateRange.start} to ${dateRange.end}`);
    return totalInvalidated;
}

export { CacheManager };