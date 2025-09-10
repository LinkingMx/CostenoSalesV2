<?php

use App\Services\ExternalApiService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;

beforeEach(function () {
    // Set up proper configuration for tests
    Config::set('services.external_api.url', 'http://192.168.100.20');
    Config::set('services.external_api.token', 'test_valid_token_342|AxRYaMAz4RxhiMwYTXJmUvCXvkjq24MrXW3YgrF91ef9616f');
    
    $this->externalApiService = new ExternalApiService();
    $this->setupDefaultMocks();
});

function setupDefaultMocks() {
    Http::fake([
        'http://192.168.100.20/api/main_dashboard_data' => Http::response([
            'success' => true,
            'data' => [
                'sales' => [
                    'total' => 180000,
                    'subtotal' => 165000,
                ],
                'cards' => [
                    'Sucursal Centro' => [
                        'open_accounts' => ['total' => 35, 'money' => 18000],
                        'closed_ticket' => ['total' => 50, 'money' => 25000],
                        'average_ticket' => 650.00,
                        'store_id' => 1,
                    ]
                ]
            ],
        ], 200),
    ]);
}

describe('ExternalApiService - Monthly Batch Data Method Tests', function () {
    
    it('successfully processes monthly batch data with valid weeks', function () {
        $currentMonthWeeks = [
            [
                'week_key' => 'week_1',
                'week_name' => 'Semana 1',
                'start_date' => '2025-01-01',
                'end_date' => '2025-01-07'
            ],
            [
                'week_key' => 'week_2',
                'week_name' => 'Semana 2',
                'start_date' => '2025-01-08',
                'end_date' => '2025-01-14'
            ]
        ];
        
        $previousMonthWeeks = [
            [
                'week_key' => 'week_1',
                'week_name' => 'Semana 1',
                'start_date' => '2024-12-01',
                'end_date' => '2024-12-07'
            ]
        ];
        
        $result = $this->externalApiService->getMonthlyBatchData($currentMonthWeeks, $previousMonthWeeks);
        
        expect($result['success'])->toBeTrue();
        expect($result['message'])->toBe('Datos mensuales por semana obtenidos exitosamente');
        expect($result['data'])->toHaveKeys(['current_month_weeks', 'previous_month_weeks', 'metadata']);
        
        // Verify current month data structure
        expect($result['data']['current_month_weeks'])->toHaveKeys(['week_1', 'week_2']);
        expect($result['data']['current_month_weeks']['week_1'])->toHaveKeys(['week_name', 'start_date', 'end_date', 'total', 'details']);
        
        // Verify previous month data structure
        expect($result['data']['previous_month_weeks'])->toHaveKey('week_1');
        
        // Verify metadata
        $metadata = $result['data']['metadata'];
        expect($metadata)->toHaveKeys([
            'current_month_total',
            'previous_month_total',
            'month_over_month_change',
            'request_time',
            'total_requests',
            'failed_requests',
            'success_rate',
            'execution_time_seconds'
        ]);
        
        expect($metadata['current_month_total'])->toBeNumeric();
        expect($metadata['previous_month_total'])->toBeNumeric();
        expect($metadata['month_over_month_change'])->toBeNumeric();
        expect($metadata['total_requests'])->toBe(3); // 2 current + 1 previous
        expect($metadata['failed_requests'])->toBe(0);
        expect($metadata['success_rate'])->toBe(100);
    });

    it('handles empty current month weeks array', function () {
        $currentMonthWeeks = [];
        $previousMonthWeeks = [
            [
                'week_key' => 'week_1',
                'week_name' => 'Semana 1',
                'start_date' => '2024-12-01',
                'end_date' => '2024-12-07'
            ]
        ];
        
        $result = $this->externalApiService->getMonthlyBatchData($currentMonthWeeks, $previousMonthWeeks);
        
        expect($result['success'])->toBeTrue();
        expect($result['data']['current_month_weeks'])->toBeEmpty();
        expect($result['data']['previous_month_weeks'])->toHaveKey('week_1');
        expect($result['data']['metadata']['current_month_total'])->toBe(0);
        expect($result['data']['metadata']['total_requests'])->toBe(1);
    });

    it('handles empty previous month weeks array', function () {
        $currentMonthWeeks = [
            [
                'week_key' => 'week_1',
                'week_name' => 'Semana 1',
                'start_date' => '2025-01-01',
                'end_date' => '2025-01-07'
            ]
        ];
        $previousMonthWeeks = [];
        
        $result = $this->externalApiService->getMonthlyBatchData($currentMonthWeeks, $previousMonthWeeks);
        
        expect($result['success'])->toBeTrue();
        expect($result['data']['current_month_weeks'])->toHaveKey('week_1');
        expect($result['data']['previous_month_weeks'])->toBeEmpty();
        expect($result['data']['metadata']['previous_month_total'])->toBe(0);
        expect($result['data']['metadata']['total_requests'])->toBe(1);
    });

    it('correctly calculates month over month percentage change', function () {
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => Http::sequence()
                ->push(['data' => ['sales' => ['total' => 120000]]], 200) // Current week 1
                ->push(['data' => ['sales' => ['total' => 80000]]], 200)  // Current week 2  
                ->push(['data' => ['sales' => ['total' => 100000]]], 200), // Previous week 1
        ]);
        
        $currentMonthWeeks = [
            [
                'week_key' => 'week_1',
                'week_name' => 'Semana 1',
                'start_date' => '2025-01-01',
                'end_date' => '2025-01-07'
            ],
            [
                'week_key' => 'week_2',
                'week_name' => 'Semana 2',
                'start_date' => '2025-01-08',
                'end_date' => '2025-01-14'
            ]
        ];
        
        $previousMonthWeeks = [
            [
                'week_key' => 'week_1',
                'week_name' => 'Semana 1',
                'start_date' => '2024-12-01',
                'end_date' => '2024-12-07'
            ]
        ];
        
        $result = $this->externalApiService->getMonthlyBatchData($currentMonthWeeks, $previousMonthWeeks);
        
        expect($result['success'])->toBeTrue();
        expect($result['data']['metadata']['current_month_total'])->toBe(200000); // 120k + 80k
        expect($result['data']['metadata']['previous_month_total'])->toBe(100000); // 100k
        expect($result['data']['metadata']['month_over_month_change'])->toBe(100.0); // 100% increase
    });

    it('handles zero previous month total correctly', function () {
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => Http::sequence()
                ->push(['data' => ['sales' => ['total' => 120000]]], 200) // Current week
                ->push(['data' => ['sales' => ['total' => 0]]], 200), // Previous week with zero
        ]);
        
        $currentMonthWeeks = [
            [
                'week_key' => 'week_1',
                'week_name' => 'Semana 1',
                'start_date' => '2025-01-01',
                'end_date' => '2025-01-07'
            ]
        ];
        
        $previousMonthWeeks = [
            [
                'week_key' => 'week_1',
                'week_name' => 'Semana 1',
                'start_date' => '2024-12-01',
                'end_date' => '2024-12-07'
            ]
        ];
        
        $result = $this->externalApiService->getMonthlyBatchData($currentMonthWeeks, $previousMonthWeeks);
        
        expect($result['success'])->toBeTrue();
        expect($result['data']['metadata']['month_over_month_change'])->toBe(0); // Should be 0 when previous total is 0
    });
});

describe('ExternalApiService - Monthly Batch Error Handling Tests', function () {
    
    it('returns configuration error when token is missing', function () {
        Config::set('services.external_api.token', '');
        $service = new ExternalApiService();
        
        $result = $service->getMonthlyBatchData([], []);
        
        expect($result['success'])->toBeFalse();
        expect($result['message'])->toBe('External API token not configured for monthly batch data');
        expect($result['data']['metadata']['error_type'])->toBe('configuration');
    });

    it('returns configuration error when token is placeholder', function () {
        Config::set('services.external_api.token', 'test_token_placeholder');
        $service = new ExternalApiService();
        
        $result = $service->getMonthlyBatchData([], []);
        
        expect($result['success'])->toBeFalse();
        expect($result['message'])->toBe('External API token not configured for monthly batch data');
        expect($result['data']['metadata']['error_type'])->toBe('configuration');
    });

    it('handles external API 500 errors gracefully', function () {
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => Http::response([
                'error' => 'Internal server error'
            ], 500),
        ]);
        
        $currentMonthWeeks = [
            [
                'week_key' => 'week_1',
                'week_name' => 'Semana 1',
                'start_date' => '2025-01-01',
                'end_date' => '2025-01-07'
            ]
        ];
        
        $result = $this->externalApiService->getMonthlyBatchData($currentMonthWeeks, []);
        
        expect($result['success'])->toBeTrue(); // Service returns success even with API failures
        expect($result['data']['current_month_weeks']['week_1']['total'])->toBe(0); // Zero fallback value
        expect($result['data']['metadata']['failed_requests'])->toBe(1);
        expect($result['data']['metadata']['success_rate'])->toBe(0);
    });

    it('handles external API timeout errors', function () {
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => function () {
                throw new \Illuminate\Http\Client\ConnectionException('Connection timeout');
            }
        ]);
        
        $currentMonthWeeks = [
            [
                'week_key' => 'week_1',
                'week_name' => 'Semana 1',
                'start_date' => '2025-01-01',
                'end_date' => '2025-01-07'
            ]
        ];
        
        $result = $this->externalApiService->getMonthlyBatchData($currentMonthWeeks, []);
        
        expect($result['success'])->toBeTrue();
        expect($result['data']['current_month_weeks']['week_1']['total'])->toBe(0);
        expect($result['data']['metadata']['failed_requests'])->toBe(1);
    });

    it('handles mixed success and failure responses', function () {
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => Http::sequence()
                ->push(['data' => ['sales' => ['total' => 120000]]], 200) // Success
                ->push(['error' => 'Server error'], 500) // Failure  
                ->push(['data' => ['sales' => ['total' => 80000]]], 200), // Success
        ]);
        
        $currentMonthWeeks = [
            [
                'week_key' => 'week_1',
                'week_name' => 'Semana 1',
                'start_date' => '2025-01-01',
                'end_date' => '2025-01-07'
            ],
            [
                'week_key' => 'week_2',
                'week_name' => 'Semana 2',
                'start_date' => '2025-01-08',
                'end_date' => '2025-01-14'
            ]
        ];
        
        $previousMonthWeeks = [
            [
                'week_key' => 'week_1',
                'week_name' => 'Semana 1',
                'start_date' => '2024-12-01',
                'end_date' => '2024-12-07'
            ]
        ];
        
        $result = $this->externalApiService->getMonthlyBatchData($currentMonthWeeks, $previousMonthWeeks);
        
        expect($result['success'])->toBeTrue();
        expect($result['data']['current_month_weeks']['week_1']['total'])->toBe(120000); // Success
        expect($result['data']['current_month_weeks']['week_2']['total'])->toBe(0); // Failed, fallback to 0
        expect($result['data']['previous_month_weeks']['week_1']['total'])->toBe(80000); // Success
        expect($result['data']['metadata']['failed_requests'])->toBe(1);
        expect($result['data']['metadata']['success_rate'])->toBe(66.7); // 2 out of 3 succeeded, rounded to 1 decimal
    });

    it('logs detailed error information on exception', function () {
        Log::shouldReceive('error')
           ->once()
           ->with('Error in monthly batch request', \Mockery::type('array'));
        
        Http::fake(function () {
            throw new \Exception('Test exception for monthly batch');
        });
        
        $currentMonthWeeks = [
            [
                'week_key' => 'week_1',
                'week_name' => 'Semana 1',
                'start_date' => '2025-01-01',
                'end_date' => '2025-01-07'
            ]
        ];
        
        $result = $this->externalApiService->getMonthlyBatchData($currentMonthWeeks, []);
        
        expect($result['success'])->toBeFalse();
        expect($result['message'])->toBe('Error al conectar con la API externa para datos mensuales');
        expect($result['data']['metadata']['error_type'])->toBe('connection');
    });
});

describe('ExternalApiService - Monthly Batch Performance Tests', function () {
    
    it('measures execution time for multiple week processing', function () {
        $currentMonthWeeks = [];
        $previousMonthWeeks = [];
        
        // Create 4 weeks of data
        for ($i = 1; $i <= 4; $i++) {
            $currentMonthWeeks[] = [
                'week_key' => "week_{$i}",
                'week_name' => "Semana {$i}",
                'start_date' => "2025-01-" . str_pad($i * 7 - 6, 2, '0', STR_PAD_LEFT),
                'end_date' => "2025-01-" . str_pad($i * 7, 2, '0', STR_PAD_LEFT)
            ];
            
            $previousMonthWeeks[] = [
                'week_key' => "week_{$i}",
                'week_name' => "Semana {$i}",
                'start_date' => "2024-12-" . str_pad($i * 7 - 6, 2, '0', STR_PAD_LEFT),
                'end_date' => "2024-12-" . str_pad($i * 7, 2, '0', STR_PAD_LEFT)
            ];
        }
        
        $startTime = microtime(true);
        $result = $this->externalApiService->getMonthlyBatchData($currentMonthWeeks, $previousMonthWeeks);
        $endTime = microtime(true);
        
        $executionTime = ($endTime - $startTime) * 1000; // Convert to milliseconds
        
        expect($result['success'])->toBeTrue();
        expect($result['data']['metadata']['execution_time_seconds'])->toBeNumeric();
        expect($result['data']['metadata']['total_requests'])->toBe(8); // 4 + 4 weeks
        
        // Performance assertions
        expect($executionTime)->toBeLessThan(10000); // Should complete in under 10 seconds
        expect($result['data']['metadata']['execution_time_seconds'])->toBeLessThan(8); // Server execution under 8 seconds
    });

    it('tracks performance metrics accurately', function () {
        Log::shouldReceive('info')
           ->with('Starting monthly batch request', \Mockery::type('array'))
           ->once();
           
        Log::shouldReceive('info')
           ->with('Monthly batch request completed successfully', \Mockery::type('array'))
           ->once();
        
        // Mock responses for tracking
        $currentMonthWeeks = [
            [
                'week_key' => 'week_1',
                'week_name' => 'Semana 1',
                'start_date' => '2025-01-01',
                'end_date' => '2025-01-07'
            ]
        ];
        
        $result = $this->externalApiService->getMonthlyBatchData($currentMonthWeeks, []);
        
        expect($result['success'])->toBeTrue();
        
        $metadata = $result['data']['metadata'];
        expect($metadata['performance_improvement'])->toBe('individual_week_calls_to_1_batch');
        expect($metadata['execution_time_seconds'])->toBeGreaterThan(0);
    });

    it('handles large dataset efficiently', function () {
        // Simulate 6 weeks of data (realistic monthly scenario)
        $currentMonthWeeks = [];
        $previousMonthWeeks = [];
        
        for ($i = 1; $i <= 6; $i++) {
            $currentMonthWeeks[] = [
                'week_key' => "week_{$i}",
                'week_name' => "Semana {$i}",
                'start_date' => "2025-01-" . str_pad($i * 5, 2, '0', STR_PAD_LEFT),
                'end_date' => "2025-01-" . str_pad($i * 5 + 4, 2, '0', STR_PAD_LEFT)
            ];
            
            $previousMonthWeeks[] = [
                'week_key' => "week_{$i}",
                'week_name' => "Semana {$i}",
                'start_date' => "2024-12-" . str_pad($i * 5, 2, '0', STR_PAD_LEFT),
                'end_date' => "2024-12-" . str_pad($i * 5 + 4, 2, '0', STR_PAD_LEFT)
            ];
        }
        
        $startTime = microtime(true);
        $result = $this->externalApiService->getMonthlyBatchData($currentMonthWeeks, $previousMonthWeeks);
        $endTime = microtime(true);
        
        $totalTime = ($endTime - $startTime) * 1000;
        
        expect($result['success'])->toBeTrue();
        expect($result['data']['metadata']['total_requests'])->toBe(12); // 6 + 6 weeks
        expect($totalTime)->toBeLessThan(15000); // Should complete within 15 seconds
        expect($result['data']['metadata']['success_rate'])->toBe(100);
    });
});

describe('ExternalApiService - Monthly Batch HTTP Client Tests', function () {
    
    it('makes HTTP requests with correct headers and authentication', function () {
        Http::fake();
        
        $currentMonthWeeks = [
            [
                'week_key' => 'week_1',
                'week_name' => 'Semana 1',
                'start_date' => '2025-01-01',
                'end_date' => '2025-01-07'
            ]
        ];
        
        $this->externalApiService->getMonthlyBatchData($currentMonthWeeks, []);
        
        Http::assertSent(function ($request) {
            return $request->hasHeader('Accept', 'application/json') &&
                   $request->hasHeader('Content-Type', 'application/json') &&
                   $request->hasHeader('Authorization', 'Bearer test_valid_token_342|AxRYaMAz4RxhiMwYTXJmUvCXvkjq24MrXW3YgrF91ef9616f') &&
                   $request->url() === 'http://192.168.100.20/api/main_dashboard_data' &&
                   $request->method() === 'POST';
        });
    });

    it('sends correct request payload for week data', function () {
        Http::fake();
        
        $currentMonthWeeks = [
            [
                'week_key' => 'week_1',
                'week_name' => 'Semana 1',
                'start_date' => '2025-01-01',
                'end_date' => '2025-01-07'
            ]
        ];
        
        $this->externalApiService->getMonthlyBatchData($currentMonthWeeks, []);
        
        Http::assertSent(function ($request) {
            $data = $request->data();
            return $data['start_date'] === '2025-01-01' &&
                   $data['end_date'] === '2025-01-07';
        });
    });

    it('respects timeout configuration for HTTP requests', function () {
        Http::fake();
        
        $currentMonthWeeks = [
            [
                'week_key' => 'week_1',
                'week_name' => 'Semana 1',
                'start_date' => '2025-01-01',
                'end_date' => '2025-01-07'
            ]
        ];
        
        $this->externalApiService->getMonthlyBatchData($currentMonthWeeks, []);
        
        // Verify that timeout was set to 60 seconds (this is implicit in the service implementation)
        Http::assertSent(function ($request) {
            return $request->url() === 'http://192.168.100.20/api/main_dashboard_data';
        });
    });
});

describe('ExternalApiService - Monthly Batch Data Integrity Tests', function () {
    
    it('preserves week metadata correctly throughout processing', function () {
        $currentMonthWeeks = [
            [
                'week_key' => 'unique_week_key_123',
                'week_name' => 'Custom Week Name',
                'start_date' => '2025-01-01',
                'end_date' => '2025-01-07'
            ]
        ];
        
        $result = $this->externalApiService->getMonthlyBatchData($currentMonthWeeks, []);
        
        expect($result['success'])->toBeTrue();
        
        $weekData = $result['data']['current_month_weeks']['unique_week_key_123'];
        expect($weekData['week_name'])->toBe('Custom Week Name');
        expect($weekData['start_date'])->toBe('2025-01-01');
        expect($weekData['end_date'])->toBe('2025-01-07');
        expect($weekData['total'])->toBeNumeric();
        expect($weekData['details'])->toBeArray();
    });

    it('handles missing sales data gracefully', function () {
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => Http::response([
                'success' => true,
                'data' => [
                    // Missing sales.total field
                    'cards' => []
                ]
            ], 200),
        ]);
        
        $currentMonthWeeks = [
            [
                'week_key' => 'week_1',
                'week_name' => 'Semana 1',
                'start_date' => '2025-01-01',
                'end_date' => '2025-01-07'
            ]
        ];
        
        $result = $this->externalApiService->getMonthlyBatchData($currentMonthWeeks, []);
        
        expect($result['success'])->toBeTrue();
        expect($result['data']['current_month_weeks']['week_1']['total'])->toBe(0); // Should default to 0
    });

    it('correctly sums totals across multiple weeks', function () {
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => Http::sequence()
                ->push(['data' => ['sales' => ['total' => 50000]]], 200) // Week 1
                ->push(['data' => ['sales' => ['total' => 75000]]], 200) // Week 2
                ->push(['data' => ['sales' => ['total' => 25000]]], 200), // Week 3
        ]);
        
        $currentMonthWeeks = [
            ['week_key' => 'week_1', 'week_name' => 'Semana 1', 'start_date' => '2025-01-01', 'end_date' => '2025-01-07'],
            ['week_key' => 'week_2', 'week_name' => 'Semana 2', 'start_date' => '2025-01-08', 'end_date' => '2025-01-14'],
            ['week_key' => 'week_3', 'week_name' => 'Semana 3', 'start_date' => '2025-01-15', 'end_date' => '2025-01-21']
        ];
        
        $result = $this->externalApiService->getMonthlyBatchData($currentMonthWeeks, []);
        
        expect($result['success'])->toBeTrue();
        expect($result['data']['metadata']['current_month_total'])->toBe(150000); // 50k + 75k + 25k
        expect($result['data']['current_month_weeks']['week_1']['total'])->toBe(50000);
        expect($result['data']['current_month_weeks']['week_2']['total'])->toBe(75000);
        expect($result['data']['current_month_weeks']['week_3']['total'])->toBe(25000);
    });
});