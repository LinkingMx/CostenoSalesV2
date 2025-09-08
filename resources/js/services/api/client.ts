// API Client for Costeno Sales V2
// Base HTTP client with authentication and error handling

import type { ApiClientConfig, ApiResponse, RequestOptions } from '@/types/api';

class ApiClient {
  private baseUrl: string;
  private authToken: string;
  private timeout: number;
  private maxRetries: number;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.authToken = config.authToken;
    this.timeout = config.timeout || 30000; // 30 seconds default
    this.maxRetries = config.retries || 3;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authToken}`,
      ...options.headers,
    };

    const requestConfig: RequestInit = {
      method: options.method || 'GET',
      headers,
      signal: options.signal || controller.signal,
      ...options,
    };

    if (options.body && (requestConfig.method === 'POST' || requestConfig.method === 'PUT' || requestConfig.method === 'PATCH')) {
      requestConfig.body = typeof options.body === 'string' 
        ? options.body 
        : JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, requestConfig);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - please try again');
        }
        throw new Error(`Network error: ${error.message}`);
      }
      
      throw new Error('An unexpected error occurred');
    }
  }

  private async retryRequest<T>(
    endpoint: string,
    options: RequestOptions = {},
    retryCount = 0
  ): Promise<ApiResponse<T>> {
    try {
      return await this.makeRequest<T>(endpoint, options);
    } catch (error) {
      if (retryCount < this.maxRetries && this.shouldRetry(error)) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryRequest<T>(endpoint, options, retryCount + 1);
      }
      throw error;
    }
  }

  private shouldRetry(error: unknown): boolean {
    if (error instanceof Error) {
      // Retry on network errors but not on client errors (4xx)
      return !error.message.includes('HTTP 4');
    }
    return true;
  }

  // Public methods for different HTTP verbs
  async get<T>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.retryRequest<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.retryRequest<T>(endpoint, { ...options, method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.retryRequest<T>(endpoint, { ...options, method: 'PUT', body });
  }

  async patch<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.retryRequest<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  async delete<T>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.retryRequest<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Create and export configured API client instance
export const apiClient = new ApiClient({
  baseUrl: 'http://192.168.100.20',
  authToken: '342|AxRYaMAz4RxhiMwYTXJmUvCXvkjq24MrXW3YgrF91ef9616f',
  timeout: 30000,
  retries: 3,
});

export default apiClient;