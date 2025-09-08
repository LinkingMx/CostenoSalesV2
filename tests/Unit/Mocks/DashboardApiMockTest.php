<?php

use App\Services\DashboardApiService;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\Client\Response;

describe('Dashboard API Mocking Strategies', function () {
    beforeEach(function () {
        $this->service = new DashboardApiService();
    });

    describe('Mock Response Scenarios', function () {
        it('mocks successful response with complete data structure', function () {
            $mockData = [
                'success' => true,
                'data' => [
                    'total_sales' => 15432.50,
                    'total_revenue' => 89234.75,
                    'average_order_value' => 125.45,
                    'sales_count' => 123,
                    'total_customers' => 456,
                    'new_customers' => 23,
                    'returning_customers' => 100,
                    'products_sold' => 789,
                    'top_selling_products' => [
                        [
                            'product_id' => 1,
                            'product_name' => 'Widget A',
                            'quantity_sold' => 45,
                            'revenue' => 2250.00,
                            'profit' => 900.00,
                        ],
                        [
                            'product_id' => 2,
                            'product_name' => 'Widget B',
                            'quantity_sold' => 32,
                            'revenue' => 1600.00,
                            'profit' => 640.00,
                        ],
                    ],
                    'low_stock_products' => [
                        [
                            'product_id' => 10,
                            'product_name' => 'Critical Item',
                            'current_stock' => 2,
                            'minimum_stock' => 10,
                            'status' => 'critical',
                        ],
                    ],
                    'gross_profit' => 45000.00,
                    'net_profit' => 38000.00,
                    'profit_margin' => 0.42,
                    'daily_sales' => [
                        [
                            'date' => '2024-01-14',
                            'sales' => 850.00,
                            'revenue' => 6800.00,
                            'orders' => 8,
                        ],
                        [
                            'date' => '2024-01-15',
                            'sales' => 950.00,
                            'revenue' => 7600.00,
                            'orders' => 10,
                        ],
                    ],
                    'monthly_comparison' => [
                        'current_month' => [
                            'sales' => 15000.00,
                            'revenue' => 120000.00,
                            'orders' => 150,
                        ],
                        'previous_month' => [
                            'sales' => 12000.00,
                            'revenue' => 96000.00,
                            'orders' => 120,
                        ],
                        'growth_percentage' => [
                            'sales' => 25.0,
                            'revenue' => 25.0,
                            'orders' => 25.0,
                        ],
                    ],
                    'pending_orders' => 15,
                    'completed_orders' => 108,
                    'cancelled_orders' => 5,
                ],
                'message' => 'Data retrieved successfully',
                'timestamp' => '2024-01-15T12:00:00Z',
            ];

            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response($mockData, 200),
            ]);

            $result = $this->service->getDashboardData('2024-01-01', '2024-01-15');

            expect($result)->toBe($mockData['data']);
            expect($result['top_selling_products'])->toHaveCount(2);
            expect($result['daily_sales'])->toHaveCount(2);
            expect($result['monthly_comparison'])->toHaveKeys(['current_month', 'previous_month', 'growth_percentage']);
        });

        it('mocks different HTTP status codes and error responses', function () {
            $errorScenarios = [
                [
                    'status' => 400,
                    'response' => ['error' => 'Bad Request', 'message' => 'Invalid date format'],
                    'shouldRetry' => false,
                ],
                [
                    'status' => 401,
                    'response' => ['error' => 'Unauthorized', 'message' => 'Invalid token'],
                    'shouldRetry' => false,
                ],
                [
                    'status' => 500,
                    'response' => ['error' => 'Internal Server Error', 'message' => 'Database connection failed'],
                    'shouldRetry' => true,
                ],
                [
                    'status' => 503,
                    'response' => ['error' => 'Service Unavailable', 'message' => 'Maintenance mode'],
                    'shouldRetry' => true,
                ],
            ];

            foreach ($errorScenarios as $scenario) {
                Http::fake([
                    'http://192.168.100.20/api/main_dashboard_data' => Http::response(
                        $scenario['response'], 
                        $scenario['status']
                    ),
                ]);

                expect(fn() => $this->service->getDashboardData('2024-01-01', '2024-01-15'))
                    ->toThrow(Exception::class);

                $expectedCallCount = $scenario['shouldRetry'] ? 4 : 1; // Initial + 3 retries
                Http::assertSentCount($expectedCallCount);

                // Reset for next iteration
                Http::fake();
            }
        });

        it('mocks network timeout and connection errors', function () {
            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => function () {
                    throw new \Illuminate\Http\Client\ConnectionException('Connection timeout');
                },
            ]);

            expect(fn() => $this->service->getDashboardData('2024-01-01', '2024-01-15'))
                ->toThrow(Exception::class);

            // Should retry 3 times + initial attempt
            Http::assertSentCount(4);
        });

        it('mocks partial success responses', function () {
            $partialResponseData = [
                'success' => true,
                'data' => [
                    'total_sales' => 1500.00,
                    'total_revenue' => 12000.00,
                    // Missing other fields that might be optional
                ],
                'message' => 'Partial data available',
            ];

            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response($partialResponseData, 200),
            ]);

            $result = $this->service->getDashboardData('2024-01-01', '2024-01-15');

            expect($result)->toBe($partialResponseData['data']);
            expect($result)->toHaveKey('total_sales');
            expect($result)->toHaveKey('total_revenue');
        });
    });

    describe('Sequence-based Mocking for Retry Logic', function () {
        it('tests retry logic with progressive failure then success', function () {
            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::sequence()
                    ->push(['error' => 'Server overloaded'], 503)
                    ->push(['error' => 'Temporary unavailable'], 503)  
                    ->push(['success' => true, 'data' => ['total_sales' => 1000.00]], 200),
            ]);

            $startTime = microtime(true);
            $result = $this->service->getDashboardData('2024-01-01', '2024-01-15');
            $endTime = microtime(true);

            expect($result)->toBe(['total_sales' => 1000.00]);
            
            // Should have taken time due to exponential backoff (1s + 2s = 3s minimum)
            expect($endTime - $startTime)->toBeGreaterThan(3);
            
            Http::assertSentCount(3);
        });

        it('tests maximum retry limit enforcement', function () {
            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::sequence()
                    ->push(['error' => 'Server error'], 500)
                    ->push(['error' => 'Server error'], 500)
                    ->push(['error' => 'Server error'], 500)
                    ->push(['error' => 'Server error'], 500)
                    ->push(['success' => true, 'data' => ['total_sales' => 1000.00]], 200), // Should not reach this
            ]);

            expect(fn() => $this->service->getDashboardData('2024-01-01', '2024-01-15'))
                ->toThrow(Exception::class);

            // Should only try 4 times (initial + 3 retries) and not reach the 5th success
            Http::assertSentCount(4);
        });

        it('tests different error types in sequence', function () {
            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::sequence()
                    ->push(['error' => 'Rate limited'], 429) // Should retry
                    ->push(['error' => 'Bad request'], 400)   // Should not retry after this
                    ->push(['success' => true, 'data' => ['total_sales' => 1000.00]], 200),
            ]);

            expect(fn() => $this->service->getDashboardData('2024-01-01', '2024-01-15'))
                ->toThrow(Exception::class);

            // Should only try twice (initial 429, then 400 which stops retries)
            Http::assertSentCount(2);
        });
    });

    describe('Advanced Mock Scenarios', function () {
        it('mocks request inspection and conditional responses', function () {
            Http::fake(function ($request) {
                // Inspect request data and return different responses based on date range
                $data = $request->data();
                $startDate = $data['start_date'] ?? '';
                $endDate = $data['end_date'] ?? '';

                if ($startDate === '2024-01-01' && $endDate === '2024-01-01') {
                    // Single day - return minimal data
                    return Http::response([
                        'success' => true,
                        'data' => [
                            'total_sales' => 100.00,
                            'sales_count' => 1,
                            'total_customers' => 1,
                        ],
                    ], 200);
                }

                if ($startDate === '2024-01-01' && $endDate === '2024-01-31') {
                    // Full month - return comprehensive data
                    return Http::response([
                        'success' => true,
                        'data' => [
                            'total_sales' => 50000.00,
                            'sales_count' => 500,
                            'total_customers' => 250,
                            'daily_sales' => array_fill(0, 31, [
                                'date' => '2024-01-01',
                                'sales' => 1612.90,
                                'revenue' => 12903.20,
                                'orders' => 16,
                            ]),
                        ],
                    ], 200);
                }

                // Default response for any other date range
                return Http::response(['error' => 'No data available for this range'], 404);
            });

            // Test single day
            $singleDayResult = $this->service->getDashboardData('2024-01-01', '2024-01-01');
            expect($singleDayResult['total_sales'])->toBe(100.00);

            // Test full month
            $monthResult = $this->service->getDashboardData('2024-01-01', '2024-01-31');
            expect($monthResult['total_sales'])->toBe(50000.00);
            expect($monthResult['daily_sales'])->toHaveCount(31);

            // Test unsupported range
            expect(fn() => $this->service->getDashboardData('2024-02-01', '2024-02-15'))
                ->toThrow(Exception::class);
        });

        it('mocks realistic API latency and response times', function () {
            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => function () {
                    // Simulate realistic API latency (500ms - 2000ms)
                    $latency = rand(500, 2000);
                    usleep($latency * 1000); // Convert to microseconds

                    return Http::response([
                        'success' => true,
                        'data' => [
                            'total_sales' => 1500.00,
                            'processing_time_ms' => $latency,
                        ],
                    ], 200);
                },
            ]);

            $startTime = microtime(true);
            $result = $this->service->getDashboardData('2024-01-01', '2024-01-15');
            $endTime = microtime(true);

            $actualLatency = ($endTime - $startTime) * 1000; // Convert to milliseconds

            expect($actualLatency)->toBeGreaterThan(500);
            expect($result['total_sales'])->toBe(1500.00);
        });

        it('mocks authentication token validation', function () {
            Http::fake(function ($request) {
                $authHeader = $request->header('Authorization');
                
                if ($authHeader !== 'Bearer 342|AxRYaMAz4RxhiMwYTXJmUvCXvkjq24MrXW3YgrF91ef9616f') {
                    return Http::response(['error' => 'Invalid token'], 401);
                }

                return Http::response([
                    'success' => true,
                    'data' => ['total_sales' => 1500.00],
                ], 200);
            });

            // Should succeed with correct token (configured in service)
            $result = $this->service->getDashboardData('2024-01-01', '2024-01-15');
            expect($result['total_sales'])->toBe(1500.00);
        });

        it('mocks response with missing or null data fields', function () {
            $responsesWithMissingData = [
                // Null data field
                [
                    'success' => true,
                    'data' => null,
                    'message' => 'No data available',
                ],
                // Missing data field
                [
                    'success' => true,
                    'message' => 'Success but no data field',
                ],
                // Empty data object
                [
                    'success' => true,
                    'data' => [],
                ],
                // Data with some null fields
                [
                    'success' => true,
                    'data' => [
                        'total_sales' => 1500.00,
                        'total_revenue' => null,
                        'sales_count' => 0,
                    ],
                ],
            ];

            foreach ($responsesWithMissingData as $response) {
                Http::fake([
                    'http://192.168.100.20/api/main_dashboard_data' => Http::response($response, 200),
                ]);

                if ($response['data'] === null || !isset($response['data'])) {
                    expect(fn() => $this->service->getDashboardData('2024-01-01', '2024-01-15'))
                        ->toThrow(Exception::class);
                } else {
                    $result = $this->service->getDashboardData('2024-01-01', '2024-01-15');
                    expect($result)->toBe($response['data']);
                }
            }
        });
    });

    describe('Mock Data Factories and Builders', function () {
        it('uses factory pattern for consistent test data', function () {
            $factory = new DashboardDataFactory();
            
            $mockData = $factory
                ->withSales(5000.00)
                ->withCustomers(100)
                ->withProducts([
                    ['name' => 'Product A', 'sales' => 2000.00],
                    ['name' => 'Product B', 'sales' => 3000.00],
                ])
                ->build();

            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response([
                    'success' => true,
                    'data' => $mockData,
                ], 200),
            ]);

            $result = $this->service->getDashboardData('2024-01-01', '2024-01-15');

            expect($result['total_sales'])->toBe(5000.00);
            expect($result['total_customers'])->toBe(100);
            expect($result['top_selling_products'])->toHaveCount(2);
        });

        it('generates realistic mock data for stress testing', function () {
            $factory = new DashboardDataFactory();
            
            // Generate large dataset for performance testing
            $mockData = $factory
                ->withLargeDailySalesData(365) // Full year of daily data
                ->withManyProducts(100)        // 100 products
                ->build();

            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response([
                    'success' => true,
                    'data' => $mockData,
                ], 200),
            ]);

            $result = $this->service->getDashboardData('2024-01-01', '2024-12-31');

            expect($result['daily_sales'])->toHaveCount(365);
            expect($result['top_selling_products'])->toHaveCount(100);
        });
    });
});

/**
 * Factory class for creating consistent dashboard test data
 */
class DashboardDataFactory
{
    private array $data = [
        'total_sales' => 0,
        'total_revenue' => 0,
        'average_order_value' => 0,
        'sales_count' => 0,
        'total_customers' => 0,
        'new_customers' => 0,
        'returning_customers' => 0,
        'products_sold' => 0,
        'top_selling_products' => [],
        'low_stock_products' => [],
        'gross_profit' => 0,
        'net_profit' => 0,
        'profit_margin' => 0,
        'daily_sales' => [],
        'monthly_comparison' => [
            'current_month' => ['sales' => 0, 'revenue' => 0, 'orders' => 0],
            'previous_month' => ['sales' => 0, 'revenue' => 0, 'orders' => 0],
            'growth_percentage' => ['sales' => 0, 'revenue' => 0, 'orders' => 0],
        ],
        'pending_orders' => 0,
        'completed_orders' => 0,
        'cancelled_orders' => 0,
    ];

    public function withSales(float $amount): self
    {
        $this->data['total_sales'] = $amount;
        return $this;
    }

    public function withCustomers(int $count): self
    {
        $this->data['total_customers'] = $count;
        return $this;
    }

    public function withProducts(array $products): self
    {
        $this->data['top_selling_products'] = array_map(function ($product, $index) {
            return [
                'product_id' => $index + 1,
                'product_name' => $product['name'],
                'quantity_sold' => rand(10, 100),
                'revenue' => $product['sales'],
                'profit' => $product['sales'] * 0.4,
            ];
        }, $products, array_keys($products));
        
        return $this;
    }

    public function withLargeDailySalesData(int $days): self
    {
        $this->data['daily_sales'] = array_map(function ($day) {
            $date = \Carbon\Carbon::create(2024, 1, 1)->addDays($day);
            return [
                'date' => $date->format('Y-m-d'),
                'sales' => rand(100, 1000),
                'revenue' => rand(800, 8000),
                'orders' => rand(5, 50),
            ];
        }, range(0, $days - 1));
        
        return $this;
    }

    public function withManyProducts(int $count): self
    {
        $this->data['top_selling_products'] = array_map(function ($index) {
            return [
                'product_id' => $index + 1,
                'product_name' => "Product " . chr(65 + ($index % 26)),
                'quantity_sold' => rand(1, 200),
                'revenue' => rand(100, 5000),
                'profit' => rand(50, 2000),
            ];
        }, range(0, $count - 1));
        
        return $this;
    }

    public function build(): array
    {
        return $this->data;
    }
}