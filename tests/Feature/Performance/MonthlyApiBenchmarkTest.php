<?php

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create([
        'email_verified_at' => now(),
    ]);
    
    // Set up performance-realistic HTTP mocks
    $this->setupPerformanceRealisticMocks();
    
    // Define performance benchmarks
    $this->benchmarks = [
        'single_week_batch' => [
            'max_time_ms' => 2000,
            'target_time_ms' => 1000,
            'description' => 'Single week batch request'
        ],
        'small_monthly_batch' => [
            'max_time_ms' => 3000,
            'target_time_ms' => 2000,
            'description' => '2-3 weeks monthly batch'
        ],
        'medium_monthly_batch' => [
            'max_time_ms' => 6000,
            'target_time_ms' => 4000,
            'description' => '4-5 weeks monthly batch'
        ],
        'large_monthly_batch' => [
            'max_time_ms' => 12000,
            'target_time_ms' => 8000,
            'description' => '6+ weeks monthly batch'
        ],
        'concurrent_requests' => [
            'max_time_ms' => 15000,
            'target_time_ms' => 10000,
            'description' => '3 concurrent requests'
        ]
    ];
});

function setupPerformanceRealisticMocks() {
    // Mock external API with realistic delays and response sizes
    Http::fake([
        'http://192.168.100.20/api/main_dashboard_data' => function ($request) {
            // Simulate realistic API delays based on request complexity
            $baseDelay = 150; // Base 150ms delay
            $randomDelay = rand(50, 200); // Add 50-200ms random delay
            
            // Larger response for more data
            $responseData = [
                'success' => true,
                'data' => [
                    'sales' => [
                        'total' => rand(150000, 300000),
                        'subtotal' => rand(140000, 280000),
                        'commission' => rand(5000, 15000),
                        'tax' => rand(15000, 30000),
                    ],
                    'cards' => []
                ],
                'message' => 'Success',
                'timestamp' => now()->toISOString(),
                'processing_time_ms' => $baseDelay + $randomDelay
            ];
            
            // Add realistic branch data
            $branches = ['Centro', 'Norte', 'Sur', 'Este', 'Oeste', 'Mall', 'Outlet'];
            foreach ($branches as $index => $branch) {
                $responseData['data']['cards']["Sucursal {$branch}"] = [
                    'open_accounts' => [
                        'total' => rand(25, 60),
                        'money' => rand(12000, 35000)
                    ],
                    'closed_ticket' => [
                        'total' => rand(40, 80),
                        'money' => rand(20000, 50000)
                    ],
                    'average_ticket' => rand(500, 900),
                    'percentage' => [
                        'icon' => rand(0, 1) ? 'up' : 'down',
                        'qty' => rand(-10, 20)
                    ],
                    'date' => now()->format('Y-m-d'),
                    'store_id' => $index + 1,
                    'details' => [
                        'products_sold' => rand(100, 500),
                        'customers_served' => rand(50, 200),
                        'peak_hour' => rand(12, 18) . ':00',
                        'staff_count' => rand(5, 15)
                    ]
                ];
            }
            
            // Simulate network delay
            usleep(($baseDelay + $randomDelay) * 1000); // Convert to microseconds
            
            return Http::response($responseData, 200);
        }
    ]);
}

describe('Monthly API Performance Benchmarks - Response Time Tests', function () {
    
    it('benchmarks single week monthly batch request performance', function () {
        $this->actingAs($this->user);
        
        $currentWeeks = [
            [
                'week_key' => 'week_1',
                'week_name' => 'Semana 1',
                'start_date' => '2025-01-01',
                'end_date' => '2025-01-07'
            ]
        ];
        
        $previousWeeks = [
            [
                'week_key' => 'week_1',
                'week_name' => 'Semana 1',
                'start_date' => '2024-12-01',
                'end_date' => '2024-12-07'
            ]
        ];
        
        // Measure performance
        $startTime = microtime(true);
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => $currentWeeks,
            'previous_month_weeks' => $previousWeeks,
        ]);
        
        $endTime = microtime(true);
        $executionTime = ($endTime - $startTime) * 1000;
        
        $benchmark = $this->benchmarks['single_week_batch'];
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $serverExecutionTime = $data['data']['metadata']['execution_time_ms'];
        
        // Performance assertions
        expect($executionTime)->toBeLessThan($benchmark['max_time_ms']);
        expect($serverExecutionTime)->toBeLessThan($benchmark['target_time_ms']);
        
        // Log performance metrics
        Log::info('Single Week Batch Performance Benchmark', [
            'total_execution_time_ms' => round($executionTime, 2),
            'server_execution_time_ms' => $serverExecutionTime,
            'target_time_ms' => $benchmark['target_time_ms'],
            'max_time_ms' => $benchmark['max_time_ms'],
            'performance_rating' => $executionTime < $benchmark['target_time_ms'] ? 'EXCELLENT' : 
                                   ($executionTime < $benchmark['max_time_ms'] ? 'GOOD' : 'POOR'),
            'api_calls' => 2
        ]);
        
        // Detailed assertions
        expect($data['success'])->toBeTrue();
        expect($data['data']['metadata']['total_requests'])->toBe(2);
        expect($data['data']['metadata']['success_rate'])->toBe(100);
    });
    
    it('benchmarks small monthly batch (2-3 weeks) performance', function () {
        $this->actingAs($this->user);
        
        $currentWeeks = [];
        $previousWeeks = [];
        
        for ($i = 1; $i <= 3; $i++) {
            $currentWeeks[] = [
                'week_key' => "week_{$i}",
                'week_name' => "Semana {$i}",
                'start_date' => "2025-01-" . str_pad($i * 7 - 6, 2, '0', STR_PAD_LEFT),
                'end_date' => "2025-01-" . str_pad($i * 7, 2, '0', STR_PAD_LEFT)
            ];
            
            $previousWeeks[] = [
                'week_key' => "week_{$i}",
                'week_name' => "Semana {$i}",
                'start_date' => "2024-12-" . str_pad($i * 7 - 6, 2, '0', STR_PAD_LEFT),
                'end_date' => "2024-12-" . str_pad($i * 7, 2, '0', STR_PAD_LEFT)
            ];
        }
        
        $startTime = microtime(true);
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => $currentWeeks,
            'previous_month_weeks' => $previousWeeks,
        ]);
        
        $endTime = microtime(true);
        $executionTime = ($endTime - $startTime) * 1000;
        
        $benchmark = $this->benchmarks['small_monthly_batch'];
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $serverExecutionTime = $data['data']['metadata']['execution_time_ms'];
        
        expect($executionTime)->toBeLessThan($benchmark['max_time_ms']);
        expect($serverExecutionTime)->toBeLessThan($benchmark['target_time_ms']);
        
        Log::info('Small Monthly Batch Performance Benchmark', [
            'total_execution_time_ms' => round($executionTime, 2),
            'server_execution_time_ms' => $serverExecutionTime,
            'weeks_processed' => 6,
            'api_calls' => 6,
            'performance_rating' => $executionTime < $benchmark['target_time_ms'] ? 'EXCELLENT' : 
                                   ($executionTime < $benchmark['max_time_ms'] ? 'GOOD' : 'POOR')
        ]);
        
        expect($data['data']['metadata']['total_requests'])->toBe(6);
    });
    
    it('benchmarks medium monthly batch (4-5 weeks) performance', function () {
        $this->actingAs($this->user);
        
        $currentWeeks = [];
        $previousWeeks = [];
        
        for ($i = 1; $i <= 5; $i++) {
            $currentWeeks[] = [
                'week_key' => "week_{$i}",
                'week_name' => "Semana {$i}",
                'start_date' => "2025-01-" . str_pad($i * 6, 2, '0', STR_PAD_LEFT),
                'end_date' => "2025-01-" . str_pad($i * 6 + 5, 2, '0', STR_PAD_LEFT)
            ];
            
            $previousWeeks[] = [
                'week_key' => "week_{$i}",
                'week_name' => "Semana {$i}",
                'start_date' => "2024-12-" . str_pad($i * 6, 2, '0', STR_PAD_LEFT),
                'end_date' => "2024-12-" . str_pad($i * 6 + 5, 2, '0', STR_PAD_LEFT)
            ];
        }
        
        $startTime = microtime(true);
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => $currentWeeks,
            'previous_month_weeks' => $previousWeeks,
        ]);
        
        $endTime = microtime(true);
        $executionTime = ($endTime - $startTime) * 1000;
        
        $benchmark = $this->benchmarks['medium_monthly_batch'];
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $serverExecutionTime = $data['data']['metadata']['execution_time_ms'];
        
        expect($executionTime)->toBeLessThan($benchmark['max_time_ms']);
        expect($serverExecutionTime)->toBeLessThan($benchmark['target_time_ms']);
        
        Log::info('Medium Monthly Batch Performance Benchmark', [
            'total_execution_time_ms' => round($executionTime, 2),
            'server_execution_time_ms' => $serverExecutionTime,
            'weeks_processed' => 10,
            'api_calls' => 10,
            'time_per_api_call_ms' => round($serverExecutionTime / 10, 2),
            'performance_rating' => $executionTime < $benchmark['target_time_ms'] ? 'EXCELLENT' : 
                                   ($executionTime < $benchmark['max_time_ms'] ? 'GOOD' : 'POOR')
        ]);
        
        expect($data['data']['metadata']['total_requests'])->toBe(10);
    });
    
    it('benchmarks large monthly batch (6+ weeks) performance', function () {
        $this->actingAs($this->user);
        
        $currentWeeks = [];
        $previousWeeks = [];
        
        for ($i = 1; $i <= 6; $i++) {
            $currentWeeks[] = [
                'week_key' => "week_{$i}",
                'week_name' => "Semana {$i}",
                'start_date' => "2025-01-" . str_pad($i * 5, 2, '0', STR_PAD_LEFT),
                'end_date' => "2025-01-" . str_pad($i * 5 + 4, 2, '0', STR_PAD_LEFT)
            ];
            
            $previousWeeks[] = [
                'week_key' => "week_{$i}",
                'week_name' => "Semana {$i}",
                'start_date' => "2024-12-" . str_pad($i * 5, 2, '0', STR_PAD_LEFT),
                'end_date' => "2024-12-" . str_pad($i * 5 + 4, 2, '0', STR_PAD_LEFT)
            ];
        }
        
        $startTime = microtime(true);
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => $currentWeeks,
            'previous_month_weeks' => $previousWeeks,
        ]);
        
        $endTime = microtime(true);
        $executionTime = ($endTime - $startTime) * 1000;
        
        $benchmark = $this->benchmarks['large_monthly_batch'];
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $serverExecutionTime = $data['data']['metadata']['execution_time_ms'];
        
        expect($executionTime)->toBeLessThan($benchmark['max_time_ms']);
        expect($serverExecutionTime)->toBeLessThan($benchmark['target_time_ms']);
        
        Log::info('Large Monthly Batch Performance Benchmark', [
            'total_execution_time_ms' => round($executionTime, 2),
            'server_execution_time_ms' => $serverExecutionTime,
            'weeks_processed' => 12,
            'api_calls' => 12,
            'time_per_api_call_ms' => round($serverExecutionTime / 12, 2),
            'performance_rating' => $executionTime < $benchmark['target_time_ms'] ? 'EXCELLENT' : 
                                   ($executionTime < $benchmark['max_time_ms'] ? 'GOOD' : 'POOR')
        ]);
        
        expect($data['data']['metadata']['total_requests'])->toBe(12);
        expect($data['data']['metadata']['success_rate'])->toBe(100);
    });
});

describe('Monthly API Performance Benchmarks - Concurrent Request Tests', function () {
    
    it('benchmarks concurrent monthly batch requests performance', function () {
        $this->actingAs($this->user);
        
        $requestData = [
            'current_month_weeks' => [
                [
                    'week_key' => 'week_1',
                    'week_name' => 'Semana 1',
                    'start_date' => '2025-01-01',
                    'end_date' => '2025-01-07'
                ]
            ],
            'previous_month_weeks' => [
                [
                    'week_key' => 'week_1',
                    'week_name' => 'Semana 1',
                    'start_date' => '2024-12-01',
                    'end_date' => '2024-12-07'
                ]
            ],
        ];
        
        $startTime = microtime(true);
        
        // Simulate 3 concurrent requests
        $responses = [];
        for ($i = 0; $i < 3; $i++) {
            $responses[] = $this->postJson('/api/dashboard/monthly-batch', $requestData);
        }
        
        $endTime = microtime(true);
        $totalExecutionTime = ($endTime - $startTime) * 1000;
        
        $benchmark = $this->benchmarks['concurrent_requests'];
        
        // All requests should succeed
        foreach ($responses as $index => $response) {
            $response->assertStatus(200);
            $data = $response->json();
            expect($data['success'])->toBeTrue();
        }
        
        expect($totalExecutionTime)->toBeLessThan($benchmark['max_time_ms']);
        
        $averageTimePerRequest = $totalExecutionTime / 3;
        
        Log::info('Concurrent Requests Performance Benchmark', [
            'total_execution_time_ms' => round($totalExecutionTime, 2),
            'average_time_per_request_ms' => round($averageTimePerRequest, 2),
            'concurrent_requests' => 3,
            'target_time_ms' => $benchmark['target_time_ms'],
            'max_time_ms' => $benchmark['max_time_ms'],
            'performance_rating' => $totalExecutionTime < $benchmark['target_time_ms'] ? 'EXCELLENT' : 
                                   ($totalExecutionTime < $benchmark['max_time_ms'] ? 'GOOD' : 'POOR')
        ]);
    });
    
    it('benchmarks mixed concurrent requests (different sizes)', function () {
        $this->actingAs($this->user);
        
        // Request 1: Small (1 week)
        $request1 = [
            'current_month_weeks' => [
                ['week_key' => 'week_1', 'week_name' => 'Semana 1', 'start_date' => '2025-01-01', 'end_date' => '2025-01-07']
            ],
            'previous_month_weeks' => []
        ];
        
        // Request 2: Medium (3 weeks)
        $request2 = [
            'current_month_weeks' => [
                ['week_key' => 'week_1', 'week_name' => 'Semana 1', 'start_date' => '2025-01-01', 'end_date' => '2025-01-07'],
                ['week_key' => 'week_2', 'week_name' => 'Semana 2', 'start_date' => '2025-01-08', 'end_date' => '2025-01-14'],
                ['week_key' => 'week_3', 'week_name' => 'Semana 3', 'start_date' => '2025-01-15', 'end_date' => '2025-01-21']
            ],
            'previous_month_weeks' => []
        ];
        
        // Request 3: Large (5 weeks)
        $request3 = [
            'current_month_weeks' => [],
            'previous_month_weeks' => []
        ];
        
        for ($i = 1; $i <= 5; $i++) {
            $request3['current_month_weeks'][] = [
                'week_key' => "week_{$i}",
                'week_name' => "Semana {$i}",
                'start_date' => "2025-01-" . str_pad($i * 5, 2, '0', STR_PAD_LEFT),
                'end_date' => "2025-01-" . str_pad($i * 5 + 4, 2, '0', STR_PAD_LEFT)
            ];
        }
        
        $startTime = microtime(true);
        
        $responses = [
            $this->postJson('/api/dashboard/monthly-batch', $request1),
            $this->postJson('/api/dashboard/monthly-batch', $request2),
            $this->postJson('/api/dashboard/monthly-batch', $request3)
        ];
        
        $endTime = microtime(true);
        $totalExecutionTime = ($endTime - $startTime) * 1000;
        
        foreach ($responses as $response) {
            $response->assertStatus(200);
        }
        
        expect($totalExecutionTime)->toBeLessThan(20000); // 20 seconds for mixed load
        
        Log::info('Mixed Concurrent Requests Performance Benchmark', [
            'total_execution_time_ms' => round($totalExecutionTime, 2),
            'request_sizes' => [1, 3, 5],
            'total_weeks_processed' => 9
        ]);
    });
});

describe('Monthly API Performance Benchmarks - Memory and Resource Tests', function () {
    
    it('benchmarks memory usage during large batch processing', function () {
        $this->actingAs($this->user);
        
        $memoryBefore = memory_get_usage(true);
        $peakMemoryBefore = memory_get_peak_usage(true);
        
        // Create a realistic large dataset
        $currentWeeks = [];
        $previousWeeks = [];
        
        for ($i = 1; $i <= 6; $i++) {
            $currentWeeks[] = [
                'week_key' => "week_{$i}",
                'week_name' => "Semana {$i} del Mes Actual",
                'start_date' => "2025-01-" . str_pad($i * 5, 2, '0', STR_PAD_LEFT),
                'end_date' => "2025-01-" . str_pad($i * 5 + 4, 2, '0', STR_PAD_LEFT)
            ];
            
            $previousWeeks[] = [
                'week_key' => "week_{$i}",
                'week_name' => "Semana {$i} del Mes Anterior",
                'start_date' => "2024-12-" . str_pad($i * 5, 2, '0', STR_PAD_LEFT),
                'end_date' => "2024-12-" . str_pad($i * 5 + 4, 2, '0', STR_PAD_LEFT)
            ];
        }
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => $currentWeeks,
            'previous_month_weeks' => $previousWeeks,
        ]);
        
        $memoryAfter = memory_get_usage(true);
        $peakMemoryAfter = memory_get_peak_usage(true);
        
        $memoryUsed = $memoryAfter - $memoryBefore;
        $peakMemoryUsed = $peakMemoryAfter - $peakMemoryBefore;
        
        $response->assertStatus(200);
        
        // Memory usage assertions
        expect($memoryUsed)->toBeLessThan(50 * 1024 * 1024); // Less than 50MB
        expect($peakMemoryUsed)->toBeLessThan(100 * 1024 * 1024); // Less than 100MB peak
        
        Log::info('Memory Usage Performance Benchmark', [
            'memory_used_mb' => round($memoryUsed / 1024 / 1024, 2),
            'peak_memory_used_mb' => round($peakMemoryUsed / 1024 / 1024, 2),
            'weeks_processed' => 12,
            'api_calls' => 12
        ]);
    });
    
    it('benchmarks database query performance during batch processing', function () {
        $this->actingAs($this->user);
        
        // Enable query logging
        DB::enableQueryLog();
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => [
                [
                    'week_key' => 'week_1',
                    'week_name' => 'Semana 1',
                    'start_date' => '2025-01-01',
                    'end_date' => '2025-01-07'
                ]
            ],
            'previous_month_weeks' => [],
        ]);
        
        $queries = DB::getQueryLog();
        DB::disableQueryLog();
        
        $response->assertStatus(200);
        
        // Analyze query performance
        $totalQueryTime = array_sum(array_column($queries, 'time'));
        $queryCount = count($queries);
        
        expect($queryCount)->toBeLessThan(20); // Should not generate excessive queries
        expect($totalQueryTime)->toBeLessThan(500); // Total query time under 500ms
        
        Log::info('Database Query Performance Benchmark', [
            'total_queries' => $queryCount,
            'total_query_time_ms' => $totalQueryTime,
            'average_query_time_ms' => $queryCount > 0 ? round($totalQueryTime / $queryCount, 2) : 0,
            'queries' => array_map(function($query) {
                return [
                    'sql' => substr($query['query'], 0, 100) . '...',
                    'time_ms' => $query['time']
                ];
            }, $queries)
        ]);
    });
});

describe('Monthly API Performance Benchmarks - Edge Case Performance', function () {
    
    it('benchmarks performance with external API failures', function () {
        $this->actingAs($this->user);
        
        // Mock external API to fail some requests
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => Http::sequence()
                ->push(['data' => ['sales' => ['total' => 180000]]], 200, [], 200) // Success
                ->push(['error' => 'Server error'], 500, [], 300) // Failure after delay
                ->push(['data' => ['sales' => ['total' => 160000]]], 200, [], 150), // Success
        ]);
        
        $startTime = microtime(true);
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => [
                ['week_key' => 'week_1', 'week_name' => 'Semana 1', 'start_date' => '2025-01-01', 'end_date' => '2025-01-07'],
                ['week_key' => 'week_2', 'week_name' => 'Semana 2', 'start_date' => '2025-01-08', 'end_date' => '2025-01-14']
            ],
            'previous_month_weeks' => [
                ['week_key' => 'week_1', 'week_name' => 'Semana 1', 'start_date' => '2024-12-01', 'end_date' => '2024-12-07']
            ],
        ]);
        
        $endTime = microtime(true);
        $executionTime = ($endTime - $startTime) * 1000;
        
        $response->assertStatus(200);
        
        $data = $response->json();
        expect($data['success'])->toBeTrue();
        expect($data['data']['metadata']['failed_requests'])->toBeGreaterThan(0);
        
        // Performance should not degrade excessively with failures
        expect($executionTime)->toBeLessThan(8000); // Should complete within 8 seconds
        
        Log::info('Error Handling Performance Benchmark', [
            'execution_time_ms' => round($executionTime, 2),
            'failed_requests' => $data['data']['metadata']['failed_requests'],
            'success_rate' => $data['data']['metadata']['success_rate']
        ]);
    });
    
    it('benchmarks performance with slow external API', function () {
        $this->actingAs($this->user);
        
        // Mock slow external API
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => Http::response([
                'success' => true,
                'data' => ['sales' => ['total' => 180000], 'cards' => []]
            ], 200, [], 1500), // 1.5 second delay per request
        ]);
        
        $startTime = microtime(true);
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => [
                ['week_key' => 'week_1', 'week_name' => 'Semana 1', 'start_date' => '2025-01-01', 'end_date' => '2025-01-07']
            ],
            'previous_month_weeks' => [],
        ]);
        
        $endTime = microtime(true);
        $executionTime = ($endTime - $startTime) * 1000;
        
        $response->assertStatus(200);
        
        // Should reflect the slow API but complete successfully
        expect($executionTime).toBeGreaterThan(1500); // Should reflect the slow API
        expect($executionTime).toBeLessThan(5000); // But not hang indefinitely
        
        Log::info('Slow API Performance Benchmark', [
            'execution_time_ms' => round($executionTime, 2),
            'api_delay_ms' => 1500,
            'requests_made' => 1
        ]);
    });
});

describe('Monthly API Performance Benchmarks - Regression Testing', function () {
    
    it('runs comprehensive performance regression test suite', function () {
        $this->actingAs($this->user);
        
        $regressionResults = [];
        
        // Test 1: Single week batch
        $startTime = microtime(true);
        $response1 = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => [
                ['week_key' => 'week_1', 'week_name' => 'Semana 1', 'start_date' => '2025-01-01', 'end_date' => '2025-01-07']
            ],
            'previous_month_weeks' => []
        ]);
        $regressionResults['single_week'] = [
            'time_ms' => (microtime(true) - $startTime) * 1000,
            'benchmark_ms' => $this->benchmarks['single_week_batch']['target_time_ms'],
            'passed' => $response1->status() === 200
        ];
        
        // Test 2: Medium batch
        $startTime = microtime(true);
        $mediumWeeks = [];
        for ($i = 1; $i <= 4; $i++) {
            $mediumWeeks[] = [
                'week_key' => "week_{$i}",
                'week_name' => "Semana {$i}",
                'start_date' => "2025-01-" . str_pad($i * 7, 2, '0', STR_PAD_LEFT),
                'end_date' => "2025-01-" . str_pad($i * 7 + 6, 2, '0', STR_PAD_LEFT)
            ];
        }
        
        $response2 = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => $mediumWeeks,
            'previous_month_weeks' => []
        ]);
        $regressionResults['medium_batch'] = [
            'time_ms' => (microtime(true) - $startTime) * 1000,
            'benchmark_ms' => $this->benchmarks['medium_monthly_batch']['target_time_ms'],
            'passed' => $response2->status() === 200
        ];
        
        // Test 3: Concurrent requests
        $startTime = microtime(true);
        $concurrentResponses = [];
        for ($i = 0; $i < 3; $i++) {
            $concurrentResponses[] = $this->postJson('/api/dashboard/monthly-batch', [
                'current_month_weeks' => [
                    ['week_key' => 'week_1', 'week_name' => 'Semana 1', 'start_date' => '2025-01-01', 'end_date' => '2025-01-07']
                ],
                'previous_month_weeks' => []
            ]);
        }
        $regressionResults['concurrent'] = [
            'time_ms' => (microtime(true) - $startTime) * 1000,
            'benchmark_ms' => $this->benchmarks['concurrent_requests']['target_time_ms'],
            'passed' => collect($concurrentResponses)->every(fn($r) => $r->status() === 200)
        ];
        
        // Analyze regression results
        $allBenchmarksMet = collect($regressionResults)->every(function($result) {
            return $result['passed'] && $result['time_ms'] < $result['benchmark_ms'];
        });
        
        $performanceScore = collect($regressionResults)->average(function($result) {
            return min(100, ($result['benchmark_ms'] / $result['time_ms']) * 100);
        });
        
        Log::info('Performance Regression Test Results', [
            'all_benchmarks_met' => $allBenchmarksMet,
            'performance_score' => round($performanceScore, 1),
            'results' => $regressionResults,
            'status' => $allBenchmarksMet ? 'PASS' : 'FAIL'
        ]);
        
        // Assertions
        expect($allBenchmarksMet)->toBeTrue();
        expect($performanceScore)->toBeGreaterThan(80); // At least 80% performance score
        
        foreach ($regressionResults as $testName => $result) {
            expect($result['passed'])->toBeTrue("Test {$testName} should pass");
            expect($result['time_ms'])->toBeLessThan($result['benchmark_ms'], 
                "Test {$testName} should meet performance benchmark");
        }
    });
});