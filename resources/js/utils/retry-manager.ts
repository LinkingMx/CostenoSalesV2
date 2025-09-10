// Advanced retry manager with exponential backoff
interface RetryOptions {
    maxAttempts?: number;
    baseDelay?: number; // Base delay in milliseconds
    maxDelay?: number; // Maximum delay in milliseconds
    backoffFactor?: number; // Exponential backoff multiplier
    jitter?: boolean; // Add random jitter to prevent thundering herd
    retryCondition?: (error: Error) => boolean; // Function to determine if error is retryable
}

interface RetryState {
    attempt: number;
    totalDelay: number;
    errors: Error[];
}

class RetryManager {
    private readonly defaultOptions: Required<RetryOptions> = {
        maxAttempts: 3,
        baseDelay: 1000, // 1 second
        maxDelay: 30000, // 30 seconds
        backoffFactor: 2,
        jitter: true,
        retryCondition: (error: Error) => this.isRetryableError(error)
    };

    constructor(private options: RetryOptions = {}) {
        this.options = { ...this.defaultOptions, ...options };
    }

    private isRetryableError(error: Error): boolean {
        const message = error.message.toLowerCase();
        
        // Retry on network errors, timeouts, and server errors
        const retryablePatterns = [
            'network',
            'timeout',
            'fetch',
            'connection',
            '500', '502', '503', '504', // Server errors
            'sobrecargado',
            'tardó demasiado',
            'maximum execution time',
            'abort'
        ];

        // Don't retry on client errors or auth issues
        const nonRetryablePatterns = [
            '400', '401', '403', '404', '422', // Client errors
            'unauthorized',
            'forbidden',
            'sesión ha expirado',
            'csrf'
        ];

        const isNonRetryable = nonRetryablePatterns.some(pattern => 
            message.includes(pattern)
        );
        
        if (isNonRetryable) {
            console.log(`🔄 Retry: Non-retryable error detected: ${error.message}`);
            return false;
        }

        const isRetryable = retryablePatterns.some(pattern => 
            message.includes(pattern)
        );
        
        console.log(`🔄 Retry: Error ${isRetryable ? 'IS' : 'IS NOT'} retryable: ${error.message}`);
        return isRetryable;
    }

    private calculateDelay(attempt: number): number {
        const { baseDelay, backoffFactor, maxDelay, jitter } = this.options as Required<RetryOptions>;
        
        // Calculate exponential backoff delay
        let delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);
        
        // Add jitter to prevent thundering herd problem
        if (jitter) {
            // Add random jitter between 0% and 25% of the delay
            const jitterAmount = delay * 0.25 * Math.random();
            delay += jitterAmount;
        }
        
        return Math.floor(delay);
    }

    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async executeWithRetry<T>(
        operation: () => Promise<T>,
        operationName: string = 'Operation'
    ): Promise<T> {
        const { maxAttempts, retryCondition } = this.options as Required<RetryOptions>;
        const state: RetryState = {
            attempt: 0,
            totalDelay: 0,
            errors: []
        };

        console.log(`🔄 Retry: Starting ${operationName} (max attempts: ${maxAttempts})`);

        while (state.attempt < maxAttempts) {
            state.attempt++;
            
            try {
                const startTime = Date.now();
                const result = await operation();
                const executionTime = Date.now() - startTime;
                
                console.log(`✅ Retry: ${operationName} succeeded on attempt ${state.attempt}/${maxAttempts} (${executionTime}ms)`);
                
                // Log retry statistics if this wasn't the first attempt
                if (state.attempt > 1) {
                    console.log(`🔄 Retry: Recovery stats - Total delay: ${state.totalDelay}ms, Attempts: ${state.attempt}`);
                }
                
                return result;
            } catch (error) {
                const currentError = error instanceof Error ? error : new Error(String(error));
                state.errors.push(currentError);

                console.log(`❌ Retry: ${operationName} failed on attempt ${state.attempt}/${maxAttempts}: ${currentError.message}`);

                // Check if error is retryable
                if (!retryCondition(currentError)) {
                    console.log(`🔄 Retry: Error is not retryable, giving up`);
                    throw currentError;
                }

                // If this was the last attempt, throw the error
                if (state.attempt >= maxAttempts) {
                    console.log(`🔄 Retry: Max attempts (${maxAttempts}) reached, giving up`);
                    
                    // Create a comprehensive error with retry history
                    const retryError = new Error(
                        `${operationName} failed after ${maxAttempts} attempts. Last error: ${currentError.message}`
                    );
                    (retryError as any).retryHistory = {
                        attempts: state.attempt,
                        totalDelay: state.totalDelay,
                        errors: state.errors.map(e => e.message)
                    };
                    
                    throw retryError;
                }

                // Calculate delay for next attempt
                const delay = this.calculateDelay(state.attempt);
                state.totalDelay += delay;
                
                console.log(`🔄 Retry: Waiting ${delay}ms before attempt ${state.attempt + 1}/${maxAttempts}`);
                await this.sleep(delay);
            }
        }

        // This should never be reached, but TypeScript requires it
        throw new Error(`${operationName} failed unexpectedly`);
    }
}

// Predefined retry configurations for different scenarios
export const retryConfigs = {
    // For critical data fetching (monthly/weekly data)
    critical: new RetryManager({
        maxAttempts: 5,
        baseDelay: 2000,
        maxDelay: 30000,
        backoffFactor: 2,
        jitter: true
    }),
    
    // For real-time data (daily/hourly updates)
    realtime: new RetryManager({
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffFactor: 1.5,
        jitter: true
    }),
    
    // For background operations that can be more patient
    background: new RetryManager({
        maxAttempts: 7,
        baseDelay: 5000,
        maxDelay: 60000,
        backoffFactor: 1.8,
        jitter: true
    }),
    
    // For user-initiated actions (quick feedback needed)
    interactive: new RetryManager({
        maxAttempts: 2,
        baseDelay: 500,
        maxDelay: 2000,
        backoffFactor: 2,
        jitter: false
    })
};

// Helper function to wrap fetch with retry logic
export async function fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retryManager: RetryManager = retryConfigs.critical
): Promise<Response> {
    return retryManager.executeWithRetry(async () => {
        const response = await fetch(url, options);
        
        // Throw error for HTTP error status codes to trigger retry
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response;
    }, `Fetch ${url}`);
}

export { RetryManager };