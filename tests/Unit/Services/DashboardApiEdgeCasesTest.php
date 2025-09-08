<?php

use App\Services\DashboardApiService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;

describe('Dashboard API Edge Cases and Boundary Conditions', function () {
    beforeEach(function () {
        $this->service = new DashboardApiService();
    });

    describe('Date Edge Cases', function () {
        it('handles leap year February 29th correctly', function () {
            Carbon::setTestNow(Carbon::create(2024, 3, 1)); // 2024 is a leap year
            
            expect(fn() => $this->service->validateDateRange('2024-02-29', '2024-02-29'))
                ->not->toThrow();
        });

        it('rejects February 29th in non-leap years', function () {
            Carbon::setTestNow(Carbon::create(2023, 3, 1)); // 2023 is not a leap year
            
            expect(fn() => $this->service->validateDateRange('2023-02-29', '2023-02-29'))
                ->toThrow(Exception::class);
        });

        it('handles century year leap year rules correctly', function () {
            Carbon::setTestNow(Carbon::create(2000, 3, 1)); // 2000 is a leap year (divisible by 400)
            
            expect(fn() => $this->service->validateDateRange('2000-02-29', '2000-02-29'))
                ->not->toThrow();
                
            Carbon::setTestNow(Carbon::create(1900, 3, 1)); // 1900 is not a leap year (divisible by 100, not 400)
            
            expect(fn() => $this->service->validateDateRange('1900-02-29', '1900-02-29'))
                ->toThrow(Exception::class);
        });

        it('handles month boundaries correctly for different months', function () {
            $monthTests = [
                ['2024-01-31', '2024-01-31'], // January has 31 days
                ['2024-02-29', '2024-02-29'], // February in leap year
                ['2024-03-31', '2024-03-31'], // March has 31 days
                ['2024-04-30', '2024-04-30'], // April has 30 days
                ['2024-05-31', '2024-05-31'], // May has 31 days
                ['2024-06-30', '2024-06-30'], // June has 30 days
                ['2024-07-31', '2024-07-31'], // July has 31 days
                ['2024-08-31', '2024-08-31'], // August has 31 days
                ['2024-09-30', '2024-09-30'], // September has 30 days
                ['2024-10-31', '2024-10-31'], // October has 31 days
                ['2024-11-30', '2024-11-30'], // November has 30 days
                ['2024-12-31', '2024-12-31'], // December has 31 days
            ];

            Carbon::setTestNow(Carbon::create(2024, 12, 31));

            foreach ($monthTests as [$startDate, $endDate]) {
                expect(fn() => $this->service->validateDateRange($startDate, $endDate))
                    ->not->toThrow("Failed for date: {$startDate}");
            }
        });

        it('rejects invalid month day combinations', function () {
            Carbon::setTestNow(Carbon::create(2024, 12, 31));
            
            $invalidDates = [
                '2024-02-30', // February doesn't have 30 days
                '2024-04-31', // April doesn't have 31 days
                '2024-06-31', // June doesn't have 31 days
                '2024-09-31', // September doesn't have 31 days
                '2024-11-31', // November doesn't have 31 days
                '2024-13-01', // Invalid month
                '2024-00-01', // Invalid month
                '2024-01-32', // Invalid day
                '2024-01-00', // Invalid day
            ];

            foreach ($invalidDates as $invalidDate) {
                expect(fn() => $this->service->validateDateRange($invalidDate, $invalidDate))
                    ->toThrow(Exception::class, "Should reject invalid date: {$invalidDate}");
            }
        });
    });

    describe('Time Zone and DST Edge Cases', function () {
        it('handles daylight saving time transitions correctly', function () {
            // Test during DST transition periods
            $dstDates = [
                '2024-03-10', // DST starts in US (second Sunday in March)
                '2024-11-03', // DST ends in US (first Sunday in November)
            ];

            foreach ($dstDates as $date) {
                $range = $this->service->createDateRange('today');
                expect($range['start_date'])->toMatch('/^\d{4}-\d{2}-\d{2}$/');
                expect($range['end_date'])->toMatch('/^\d{4}-\d{2}-\d{2}$/');
            }
        });

        it('maintains consistency across different time zones', function () {
            // Test that date ranges are consistent regardless of system timezone
            $originalTimezone = date_default_timezone_get();
            
            $timezones = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];
            $results = [];

            foreach ($timezones as $timezone) {
                date_default_timezone_set($timezone);
                Carbon::setTestNow(Carbon::create(2024, 6, 15, 12, 0, 0, $timezone));
                
                $range = $this->service->createDateRange('today');
                $results[$timezone] = $range;
            }

            date_default_timezone_set($originalTimezone);

            // All should return the same date (2024-06-15) despite different timezones
            foreach ($results as $timezone => $range) {
                expect($range['start_date'])->toBe('2024-06-15', "Failed for timezone: {$timezone}");
                expect($range['end_date'])->toBe('2024-06-15', "Failed for timezone: {$timezone}");
            }
        });
    });

    describe('Extreme Date Ranges', function () {
        it('handles very large date ranges', function () {
            Carbon::setTestNow(Carbon::create(2024, 12, 31));
            
            // 100-year range
            expect(fn() => $this->service->validateDateRange('1924-01-01', '2024-12-31'))
                ->not->toThrow();
        });

        it('handles single-day ranges', function () {
            Carbon::setTestNow(Carbon::create(2024, 6, 15));
            
            expect(fn() => $this->service->validateDateRange('2024-06-15', '2024-06-15'))
                ->not->toThrow();
        });

        it('handles maximum valid date ranges', function () {
            Carbon::setTestNow(Carbon::create(9999, 12, 31));
            
            expect(fn() => $this->service->validateDateRange('0001-01-01', '9999-12-31'))
                ->not->toThrow();
        });
    });

    describe('Period Edge Cases', function () {
        it('handles period calculations at year boundaries', function () {
            // Test on January 1st
            Carbon::setTestNow(Carbon::create(2024, 1, 1));
            
            $range = $this->service->createDateRange('last_month');
            expect($range['start_date'])->toBe('2023-12-01');
            expect($range['end_date'])->toBe('2023-12-31');

            $range = $this->service->createDateRange('this_year');
            expect($range['start_date'])->toBe('2024-01-01');
            expect($range['end_date'])->toBe('2024-01-01');
        });

        it('handles period calculations at month boundaries', function () {
            // Test on first day of March
            Carbon::setTestNow(Carbon::create(2024, 3, 1));
            
            $range = $this->service->createDateRange('last_month');
            expect($range['start_date'])->toBe('2024-02-01');
            expect($range['end_date'])->toBe('2024-02-29'); // Leap year

            $range = $this->service->createDateRange('this_month');
            expect($range['start_date'])->toBe('2024-03-01');
            expect($range['end_date'])->toBe('2024-03-01');
        });

        it('handles edge case of last day of month', function () {
            // Test on February 29th (leap year)
            Carbon::setTestNow(Carbon::create(2024, 2, 29));
            
            $range = $this->service->createDateRange('this_month');
            expect($range['start_date'])->toBe('2024-02-01');
            expect($range['end_date'])->toBe('2024-02-29');
        });
    });

    describe('API Response Edge Cases', function () {
        it('handles extremely large response payloads', function () {
            // Mock response with very large data arrays
            $largeData = [
                'success' => true,
                'data' => [
                    'total_sales' => 1000000.00,
                    'daily_sales' => array_fill(0, 10000, [
                        'date' => '2024-01-01',
                        'sales' => 100.00,
                        'revenue' => 800.00,
                        'orders' => 5,
                    ]),
                    'top_selling_products' => array_fill(0, 1000, [
                        'product_id' => 1,
                        'product_name' => 'Test Product',
                        'quantity_sold' => 50,
                        'revenue' => 2500.00,
                        'profit' => 1000.00,
                    ]),
                ],
            ];

            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response($largeData, 200),
            ]);

            $result = $this->service->getDashboardData('2024-01-01', '2024-01-15');

            expect($result['daily_sales'])->toHaveCount(10000);
            expect($result['top_selling_products'])->toHaveCount(1000);
        });

        it('handles response with unusual numeric values', function () {
            $edgeCaseData = [
                'success' => true,
                'data' => [
                    'total_sales' => 0.0,                    // Zero sales
                    'total_revenue' => -1500.50,             // Negative revenue (refunds)
                    'average_order_value' => PHP_FLOAT_MAX,  // Maximum float value
                    'profit_margin' => -0.99,                // Deep loss
                    'sales_count' => PHP_INT_MAX,            // Maximum integer
                ],
            ];

            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response($edgeCaseData, 200),
            ]);

            $result = $this->service->getDashboardData('2024-01-01', '2024-01-15');

            expect($result['total_sales'])->toBe(0.0);
            expect($result['total_revenue'])->toBe(-1500.50);
            expect($result['profit_margin'])->toBe(-0.99);
        });

        it('handles response with very long strings', function () {
            $longString = str_repeat('A', 10000); // 10KB string
            
            $data = [
                'success' => true,
                'data' => [
                    'total_sales' => 1500.00,
                    'top_selling_products' => [
                        [
                            'product_id' => 1,
                            'product_name' => $longString,
                            'quantity_sold' => 50,
                            'revenue' => 2500.00,
                            'profit' => 1000.00,
                        ],
                    ],
                ],
            ];

            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response($data, 200),
            ]);

            $result = $this->service->getDashboardData('2024-01-01', '2024-01-15');

            expect(strlen($result['top_selling_products'][0]['product_name']))->toBe(10000);
        });
    });

    describe('Memory and Performance Edge Cases', function () {
        it('handles multiple concurrent requests without memory leaks', function () {
            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response([
                    'success' => true,
                    'data' => ['total_sales' => 1500.00],
                ], 200),
            ]);

            $memoryBefore = memory_get_usage();

            // Simulate multiple requests
            for ($i = 0; $i < 100; $i++) {
                $this->service->getDashboardData('2024-01-01', '2024-01-15');
            }

            $memoryAfter = memory_get_usage();
            $memoryIncrease = $memoryAfter - $memoryBefore;

            // Memory increase should be reasonable (less than 10MB for 100 requests)
            expect($memoryIncrease)->toBeLessThan(10 * 1024 * 1024);
            
            Http::assertSentCount(100);
        });

        it('handles rapid successive requests', function () {
            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response([
                    'success' => true,
                    'data' => ['total_sales' => 1500.00],
                ], 200),
            ]);

            $startTime = microtime(true);
            
            // 50 rapid requests
            for ($i = 0; $i < 50; $i++) {
                $this->service->getDashboardData('2024-01-01', '2024-01-15');
            }
            
            $endTime = microtime(true);
            $totalTime = $endTime - $startTime;

            // Should complete all requests within reasonable time (10 seconds)
            expect($totalTime)->toBeLessThan(10);
            
            Http::assertSentCount(50);
        });
    });

    describe('Character Encoding Edge Cases', function () {
        it('handles response with special characters and emojis', function () {
            $specialData = [
                'success' => true,
                'data' => [
                    'total_sales' => 1500.00,
                    'top_selling_products' => [
                        [
                            'product_id' => 1,
                            'product_name' => '特殊字符产品 🚀 émojis & símbolos',
                            'quantity_sold' => 50,
                            'revenue' => 2500.00,
                            'profit' => 1000.00,
                        ],
                    ],
                ],
            ];

            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response($specialData, 200),
            ]);

            $result = $this->service->getDashboardData('2024-01-01', '2024-01-15');

            expect($result['top_selling_products'][0]['product_name'])
                ->toBe('特殊字符产品 🚀 émojis & símbolos');
        });

        it('handles response with escaped characters', function () {
            $escapedData = [
                'success' => true,
                'data' => [
                    'total_sales' => 1500.00,
                    'message' => "Product \"Quotes\" and 'Apostrophes' and \t\n\r special chars",
                ],
            ];

            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response($escapedData, 200),
            ]);

            $result = $this->service->getDashboardData('2024-01-01', '2024-01-15');

            expect($result['message'])->toContain('"Quotes"');
            expect($result['message'])->toContain("'Apostrophes'");
        });
    });

    afterEach(function () {
        Carbon::setTestNow(); // Reset Carbon test time
    });
});