<?php

use App\Services\DashboardApiService;
use Carbon\Carbon;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

describe('DashboardApiService', function () {
    beforeEach(function () {
        $this->service = new DashboardApiService();
        Carbon::setTestNow(Carbon::create(2024, 1, 15, 12, 0, 0)); // Monday, Jan 15, 2024
    });

    afterEach(function () {
        Carbon::setTestNow(); // Reset Carbon test time
    });

    describe('Date Range Creation', function () {
        it('creates correct date range for today', function () {
            $range = $this->service->createDateRange('today');
            
            expect($range)->toBe([
                'start_date' => '2024-01-15',
                'end_date' => '2024-01-15',
            ]);
        });

        it('creates correct date range for yesterday', function () {
            $range = $this->service->createDateRange('yesterday');
            
            expect($range)->toBe([
                'start_date' => '2024-01-14',
                'end_date' => '2024-01-14',
            ]);
        });

        it('creates correct date range for last 7 days', function () {
            $range = $this->service->createDateRange('last_7_days');
            
            expect($range)->toBe([
                'start_date' => '2024-01-08',
                'end_date' => '2024-01-15',
            ]);
        });

        it('creates correct date range for last 30 days', function () {
            $range = $this->service->createDateRange('last_30_days');
            
            expect($range)->toBe([
                'start_date' => '2023-12-16',
                'end_date' => '2024-01-15',
            ]);
        });

        it('creates correct date range for last 90 days', function () {
            $range = $this->service->createDateRange('last_90_days');
            
            expect($range)->toBe([
                'start_date' => '2023-10-17',
                'end_date' => '2024-01-15',
            ]);
        });

        it('creates correct date range for this month', function () {
            $range = $this->service->createDateRange('this_month');
            
            expect($range)->toBe([
                'start_date' => '2024-01-01',
                'end_date' => '2024-01-15',
            ]);
        });

        it('creates correct date range for last month', function () {
            $range = $this->service->createDateRange('last_month');
            
            expect($range)->toBe([
                'start_date' => '2023-12-01',
                'end_date' => '2023-12-31',
            ]);
        });

        it('creates correct date range for this year', function () {
            $range = $this->service->createDateRange('this_year');
            
            expect($range)->toBe([
                'start_date' => '2024-01-01',
                'end_date' => '2024-01-15',
            ]);
        });

        it('throws exception for unsupported period', function () {
            expect(fn() => $this->service->createDateRange('invalid_period'))
                ->toThrow(Exception::class, 'Unsupported period: invalid_period');
        });
    });

    describe('Date Validation', function () {
        it('validates correct date format', function () {
            expect(fn() => $this->service->validateDateRange('2024-01-01', '2024-01-15'))
                ->not->toThrow();
        });

        it('throws exception for invalid start date format', function () {
            expect(fn() => $this->service->validateDateRange('2024/01/01', '2024-01-15'))
                ->toThrow(Exception::class, 'Invalid start_date format. Expected YYYY-MM-DD, got: 2024/01/01');
        });

        it('throws exception for invalid end date format', function () {
            expect(fn() => $this->service->validateDateRange('2024-01-01', '01-15-2024'))
                ->toThrow(Exception::class, 'Invalid end_date format. Expected YYYY-MM-DD, got: 01-15-2024');
        });

        it('throws exception when start date is after end date', function () {
            expect(fn() => $this->service->validateDateRange('2024-01-15', '2024-01-10'))
                ->toThrow(Exception::class, 'start_date (2024-01-15) cannot be after end_date (2024-01-10)');
        });

        it('throws exception when start date is in the future', function () {
            expect(fn() => $this->service->validateDateRange('2024-01-16', '2024-01-16'))
                ->toThrow(Exception::class, 'start_date (2024-01-16) cannot be in the future');
        });

        it('allows end date to be in the future if start date is valid', function () {
            expect(fn() => $this->service->validateDateRange('2024-01-15', '2024-01-20'))
                ->not->toThrow();
        });

        it('throws exception for invalid date values', function () {
            expect(fn() => $this->service->validateDateRange('2024-13-01', '2024-01-15'))
                ->toThrow(Exception::class);
        });

        it('validates leap year dates correctly', function () {
            Carbon::setTestNow(Carbon::create(2024, 3, 1)); // 2024 is a leap year
            
            expect(fn() => $this->service->validateDateRange('2024-02-29', '2024-02-29'))
                ->not->toThrow();
        });

        it('rejects invalid leap year dates', function () {
            Carbon::setTestNow(Carbon::create(2023, 3, 1)); // 2023 is not a leap year
            
            expect(fn() => $this->service->validateDateRange('2023-02-29', '2023-02-29'))
                ->toThrow(Exception::class);
        });
    });

    describe('Available Periods', function () {
        it('returns all expected periods with labels', function () {
            $periods = $this->service->getAvailablePeriods();
            
            expect($periods)->toHaveCount(8);
            expect($periods[0])->toBe(['value' => 'today', 'label' => 'Today']);
            expect($periods[1])->toBe(['value' => 'yesterday', 'label' => 'Yesterday']);
            expect($periods[2])->toBe(['value' => 'last_7_days', 'label' => 'Last 7 Days']);
            expect($periods[3])->toBe(['value' => 'last_30_days', 'label' => 'Last 30 Days']);
            expect($periods[4])->toBe(['value' => 'last_90_days', 'label' => 'Last 90 Days']);
            expect($periods[5])->toBe(['value' => 'this_month', 'label' => 'This Month']);
            expect($periods[6])->toBe(['value' => 'last_month', 'label' => 'Last Month']);
            expect($periods[7])->toBe(['value' => 'this_year', 'label' => 'This Year']);
        });
    });

    describe('API Request Handling', function () {

        it('makes successful API request and returns data', function () {
            $mockResponseData = [
                'success' => true,
                'data' => [
                    'total_sales' => 1500.50,
                    'total_revenue' => 12000.75,
                    'average_order_value' => 85.25,
                    'sales_count' => 18,
                    'total_customers' => 150,
                    'new_customers' => 5,
                    'returning_customers' => 13,
                    'products_sold' => 45,
                    'gross_profit' => 8000.00,
                    'net_profit' => 6500.00,
                    'profit_margin' => 0.54,
                    'pending_orders' => 3,
                    'completed_orders' => 15,
                    'cancelled_orders' => 0,
                ],
            ];

            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response($mockResponseData, 200),
            ]);

            $data = $this->service->getDashboardData('2024-01-01', '2024-01-15');

            expect($data)->toBe($mockResponseData['data']);
            
            Http::assertSent(function ($request) {
                return $request->url() === 'http://192.168.100.20/api/main_dashboard_data'
                    && $request->method() === 'POST'
                    && $request->hasHeader('Authorization', 'Bearer 342|AxRYaMAz4RxhiMwYTXJmUvCXvkjq24MrXW3YgrF91ef9616f')
                    && $request->hasHeader('Accept', 'application/json')
                    && $request->hasHeader('Content-Type', 'application/json')
                    && $request->data() === [
                        'start_date' => '2024-01-01',
                        'end_date' => '2024-01-15',
                    ];
            });
        });

        it('handles API response without data wrapper', function () {
            $mockResponseData = [
                'success' => true,
                'total_sales' => 1500.50,
                'total_revenue' => 12000.75,
            ];

            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response($mockResponseData, 200),
            ]);

            $data = $this->service->getDashboardData('2024-01-01', '2024-01-15');

            expect($data)->toBe($mockResponseData);
        });

        it('throws exception when API returns unsuccessful response', function () {
            $mockResponseData = [
                'success' => false,
                'message' => 'Invalid date range',
            ];

            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response($mockResponseData, 200),
            ]);

            expect(fn() => $this->service->getDashboardData('2024-01-01', '2024-01-15'))
                ->toThrow(Exception::class, 'Failed to fetch dashboard data: API returned unsuccessful response');
        });

        it('throws exception on HTTP error status', function () {
            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response([], 500, ['reason' => 'Internal Server Error']),
            ]);

            expect(fn() => $this->service->getDashboardData('2024-01-01', '2024-01-15'))
                ->toThrow(Exception::class);
        });

        it('performs exponential backoff retry on network errors', function () {
            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::sequence()
                    ->push([], 500) // First attempt fails
                    ->push([], 500) // Second attempt fails
                    ->push(['success' => true, 'data' => ['test' => 'data']], 200), // Third attempt succeeds
            ]);

            $startTime = microtime(true);
            $data = $this->service->getDashboardData('2024-01-01', '2024-01-15');
            $endTime = microtime(true);

            expect($data)->toBe(['test' => 'data']);
            
            // Should have taken at least 3 seconds due to exponential backoff (1s + 2s)
            expect($endTime - $startTime)->toBeGreaterThan(3);
            
            Http::assertSentCount(3);
        });

        it('stops retrying after max attempts', function () {
            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response([], 500),
            ]);

            expect(fn() => $this->service->getDashboardData('2024-01-01', '2024-01-15'))
                ->toThrow(Exception::class, 'Failed to fetch dashboard data');

            // Should have tried 4 times (initial + 3 retries)
            Http::assertSentCount(4);
        });

        it('does not retry on client errors (4xx)', function () {
            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response(['error' => 'Bad Request'], 400),
            ]);

            expect(fn() => $this->service->getDashboardData('2024-01-01', '2024-01-15'))
                ->toThrow(Exception::class);

            // Should only try once (no retries on 4xx errors)
            Http::assertSentCount(1);
        });

        it('handles timeout correctly', function () {
            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => function () {
                    sleep(31); // Longer than 30 second timeout
                    return Http::response(['success' => true, 'data' => []], 200);
                },
            ]);

            expect(fn() => $this->service->getDashboardData('2024-01-01', '2024-01-15'))
                ->toThrow(Exception::class);
        });
    });

    describe('Period-based Data Fetching', function () {

        it('fetches data for predefined period successfully', function () {
            $mockResponseData = [
                'success' => true,
                'data' => ['total_sales' => 1000.00],
            ];

            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response($mockResponseData, 200),
            ]);

            $data = $this->service->getDashboardDataForPeriod('today');

            expect($data)->toBe($mockResponseData['data']);
            
            Http::assertSent(function ($request) {
                return $request->data() === [
                    'start_date' => '2024-01-15',
                    'end_date' => '2024-01-15',
                ];
            });
        });

        it('throws exception for invalid period', function () {
            expect(fn() => $this->service->getDashboardDataForPeriod('invalid_period'))
                ->toThrow(Exception::class, 'Unsupported period: invalid_period');
        });
    });

    describe('Edge Cases and Error Scenarios', function () {

        it('handles empty response gracefully', function () {
            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response(null, 200),
            ]);

            expect(fn() => $this->service->getDashboardData('2024-01-01', '2024-01-15'))
                ->toThrow(Exception::class);
        });

        it('handles malformed JSON response', function () {
            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response('invalid json{', 200),
            ]);

            expect(fn() => $this->service->getDashboardData('2024-01-01', '2024-01-15'))
                ->toThrow(Exception::class);
        });

        it('validates date range before making API request', function () {
            Http::fake(); // No need to define response since validation should fail first

            expect(fn() => $this->service->getDashboardData('invalid-date', '2024-01-15'))
                ->toThrow(Exception::class, 'Invalid start_date format');

            Http::assertNothingSent();
        });

        it('handles very large date ranges', function () {
            $mockResponseData = [
                'success' => true,
                'data' => ['total_sales' => 10000.00],
            ];

            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response($mockResponseData, 200),
            ]);

            // Test with a 10-year range
            $data = $this->service->getDashboardData('2014-01-01', '2024-01-01');

            expect($data)->toBe($mockResponseData['data']);
        });
    });

    describe('Month Boundary Edge Cases', function () {
        it('handles end of month correctly for last_month period', function () {
            // Test on March 31st to check February handling
            Carbon::setTestNow(Carbon::create(2024, 3, 31, 12, 0, 0));

            $range = $this->service->createDateRange('last_month');

            expect($range)->toBe([
                'start_date' => '2024-02-01',
                'end_date' => '2024-02-29', // 2024 is a leap year
            ]);
        });

        it('handles non-leap year February correctly', function () {
            Carbon::setTestNow(Carbon::create(2023, 3, 31, 12, 0, 0));

            $range = $this->service->createDateRange('last_month');

            expect($range)->toBe([
                'start_date' => '2023-02-01',
                'end_date' => '2023-02-28', // 2023 is not a leap year
            ]);
        });

        it('handles year boundary for this_year period', function () {
            Carbon::setTestNow(Carbon::create(2024, 12, 31, 12, 0, 0));

            $range = $this->service->createDateRange('this_year');

            expect($range)->toBe([
                'start_date' => '2024-01-01',
                'end_date' => '2024-12-31',
            ]);
        });
    });
});