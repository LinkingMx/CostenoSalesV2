<?php

namespace App\Services;

use Carbon\Carbon;
use Exception;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Dashboard API Service for Costeno Sales V2
 * Service for fetching dashboard data from external API
 */
class DashboardApiService
{
    private const API_ENDPOINT = 'http://192.168.100.20/api/main_dashboard_data';
    private const AUTH_TOKEN = '342|AxRYaMAz4RxhiMwYTXJmUvCXvkjq24MrXW3YgrF91ef9616f';
    private const TIMEOUT = 30; // seconds
    private const MAX_RETRIES = 3;

    /**
     * Fetch dashboard data for a specific date range
     */
    public function getDashboardData(string $startDate, string $endDate): array
    {
        $this->validateDateRange($startDate, $endDate);

        $request = [
            'start_date' => $startDate,
            'end_date' => $endDate,
        ];

        return $this->makeApiRequest($request);
    }

    /**
     * Get dashboard data for predefined period
     */
    public function getDashboardDataForPeriod(string $period): array
    {
        $dateRange = $this->createDateRange($period);
        return $this->getDashboardData($dateRange['start_date'], $dateRange['end_date']);
    }

    /**
     * Create date range from predefined period
     */
    public function createDateRange(string $period): array
    {
        $today = Carbon::today();

        return match ($period) {
            'today' => [
                'start_date' => $today->toDateString(),
                'end_date' => $today->toDateString(),
            ],
            'yesterday' => [
                'start_date' => $today->copy()->subDay()->toDateString(),
                'end_date' => $today->copy()->subDay()->toDateString(),
            ],
            'last_7_days' => [
                'start_date' => $today->copy()->subDays(7)->toDateString(),
                'end_date' => $today->toDateString(),
            ],
            'last_30_days' => [
                'start_date' => $today->copy()->subDays(30)->toDateString(),
                'end_date' => $today->toDateString(),
            ],
            'last_90_days' => [
                'start_date' => $today->copy()->subDays(90)->toDateString(),
                'end_date' => $today->toDateString(),
            ],
            'this_month' => [
                'start_date' => $today->copy()->startOfMonth()->toDateString(),
                'end_date' => $today->toDateString(),
            ],
            'last_month' => [
                'start_date' => $today->copy()->subMonth()->startOfMonth()->toDateString(),
                'end_date' => $today->copy()->subMonth()->endOfMonth()->toDateString(),
            ],
            'this_year' => [
                'start_date' => $today->copy()->startOfYear()->toDateString(),
                'end_date' => $today->toDateString(),
            ],
            default => throw new Exception("Unsupported period: {$period}"),
        };
    }

    /**
     * Validate date range format and logic
     */
    public function validateDateRange(string $startDate, string $endDate): void
    {
        // Check date format (YYYY-MM-DD)
        if (!$this->isValidDateFormat($startDate)) {
            throw new Exception("Invalid start_date format. Expected YYYY-MM-DD, got: {$startDate}");
        }

        if (!$this->isValidDateFormat($endDate)) {
            throw new Exception("Invalid end_date format. Expected YYYY-MM-DD, got: {$endDate}");
        }

        // Parse dates
        try {
            $startDateObj = Carbon::createFromFormat('Y-m-d', $startDate);
            $endDateObj = Carbon::createFromFormat('Y-m-d', $endDate);
        } catch (Exception $e) {
            throw new Exception("Invalid date format: {$e->getMessage()}");
        }

        // Check date logic
        if ($startDateObj->gt($endDateObj)) {
            throw new Exception("start_date ({$startDate}) cannot be after end_date ({$endDate})");
        }

        // Check if start date is not in the future
        if ($startDateObj->gt(Carbon::today())) {
            throw new Exception("start_date ({$startDate}) cannot be in the future");
        }
    }

    /**
     * Get available predefined periods
     */
    public function getAvailablePeriods(): array
    {
        return [
            ['value' => 'today', 'label' => 'Today'],
            ['value' => 'yesterday', 'label' => 'Yesterday'],
            ['value' => 'last_7_days', 'label' => 'Last 7 Days'],
            ['value' => 'last_30_days', 'label' => 'Last 30 Days'],
            ['value' => 'last_90_days', 'label' => 'Last 90 Days'],
            ['value' => 'this_month', 'label' => 'This Month'],
            ['value' => 'last_month', 'label' => 'Last Month'],
            ['value' => 'this_year', 'label' => 'This Year'],
        ];
    }

    /**
     * Make HTTP request to external API with retry logic
     */
    private function makeApiRequest(array $request, int $retryCount = 0): array
    {
        try {
            Log::info('Making dashboard API request', [
                'request' => $request,
                'retry_count' => $retryCount,
            ]);

            $response = Http::timeout(self::TIMEOUT)
                ->withHeaders([
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json',
                    'Authorization' => 'Bearer ' . self::AUTH_TOKEN,
                ])
                ->post(self::API_ENDPOINT, $request);

            if ($response->successful()) {
                $data = $response->json();
                
                if (!isset($data['success']) || !$data['success']) {
                    throw new Exception('API returned unsuccessful response');
                }

                return $data['data'] ?? $data;
            }

            throw new Exception("HTTP {$response->status()}: {$response->reason()}");

        } catch (Exception $e) {
            Log::error('Dashboard API request failed', [
                'error' => $e->getMessage(),
                'request' => $request,
                'retry_count' => $retryCount,
            ]);

            // Retry logic
            if ($retryCount < self::MAX_RETRIES && $this->shouldRetry($e)) {
                $delay = pow(2, $retryCount) * 1000000; // Exponential backoff in microseconds
                usleep($delay);
                return $this->makeApiRequest($request, $retryCount + 1);
            }

            throw new Exception("Failed to fetch dashboard data: {$e->getMessage()}");
        }
    }

    /**
     * Determine if request should be retried
     */
    private function shouldRetry(Exception $e): bool
    {
        // Don't retry on client errors (4xx)
        if (strpos($e->getMessage(), 'HTTP 4') !== false) {
            return false;
        }

        return true;
    }

    /**
     * Check if date string matches YYYY-MM-DD format
     */
    private function isValidDateFormat(string $date): bool
    {
        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) === 1;
    }
}