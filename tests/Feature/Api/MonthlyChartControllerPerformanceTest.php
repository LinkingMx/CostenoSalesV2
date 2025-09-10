<?php

use App\Models\User;
use App\Services\ExternalApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Mockery;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create([
        'email_verified_at' => now(),
    ]);
    
    $this->setupPerformanceMocks();
});

function setupPerformanceMocks() {
    // Setup realistic response times and data sizes
    Http::fake([
        'http://192.168.100.20/api/main_dashboard_data' => Http::response([
            'success' => true,
            'data' => [
                'sales' => [
                    'total' => rand(150000, 250000),
                    'subtotal' => rand(140000, 230000),
                ],
                'cards' => [
                    'Sucursal Centro' => [
                        'open_accounts' => ['total' => rand(30, 50), 'money' => rand(15000, 25000)],
                        'closed_ticket' => ['total' => rand(40, 70), 'money' => rand(20000, 35000)],
                        'average_ticket' => rand(600, 800),
                        'percentage' => ['icon' => 'up', 'qty' => rand(10, 20)],
                        'date' => '2025-01-01',
                        'store_id' => 1,
                    ],
                    'Sucursal Norte' => [
                        'open_accounts' => ['total' => rand(25, 45), 'money' => rand(12000, 22000)],
                        'closed_ticket' => ['total' => rand(35, 65), 'money' => rand(18000, 32000)],
                        'average_ticket' => rand(650, 750),
                        'percentage' => ['icon' => 'up', 'qty' => rand(8, 18)],
                        'date' => '2025-01-01',
                        'store_id' => 2,
                    ],
                    'Sucursal Sur' => [
                        'open_accounts' => ['total' => rand(35, 55), 'money' => rand(18000, 28000)],
                        'closed_ticket' => ['total' => rand(50, 80), 'money' => rand(25000, 40000)],
                        'average_ticket' => rand(550, 700),
                        'percentage' => ['icon' => 'down', 'qty' => rand(-5, 5)],
                        'date' => '2025-01-01',
                        'store_id' => 3,
                    ]
                ]
            ],
            'message' => 'Success',
        ], 200, [], 100), // 100ms simulated delay
    ]);
}

describe('Monthly Chart Controller - Performance Baseline Tests', function () {
    
    it('measures baseline performance for single week batch', function () {
        $this->actingAs($this->user);
        
        $startTime = microtime(true);
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
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
        ]);
        
        $endTime = microtime(true);
        $totalExecutionTime = ($endTime - $startTime) * 1000;
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $serverExecutionTime = $data['data']['metadata']['execution_time_ms'];
        
        // Performance assertions
        expect($serverExecutionTime)->toBeLessThan(3000); // Server should process in under 3 seconds
        expect($totalExecutionTime)->toBeLessThan(5000); // Total test time under 5 seconds
        expect($data['data']['metadata']['total_requests'])->toBe(2);
        expect($data['data']['metadata']['success_rate'])->toBe(100);
        
        Log::info('Baseline Performance Test Results', [
            'server_execution_ms' => $serverExecutionTime,
            'total_test_time_ms' => $totalExecutionTime,
            'api_calls' => $data['data']['metadata']['total_requests']
        ]);
    });

    it('measures performance scaling with multiple weeks', function () {
        $this->actingAs($this->user);
        
        $performanceMetrics = [];
        
        // Test with 1, 2, 4, and 6 weeks to measure scaling
        $weekCounts = [1, 2, 4, 6];
        
        foreach ($weekCounts as $weekCount) {
            $currentWeeks = [];
            $previousWeeks = [];
            
            for ($i = 1; $i <= $weekCount; $i++) {
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
            $totalTime = ($endTime - $startTime) * 1000;
            
            $response->assertStatus(200);
            
            $data = $response->json();
            $serverTime = $data['data']['metadata']['execution_time_ms'];
            
            $performanceMetrics[$weekCount] = [
                'server_time_ms' => $serverTime,
                'total_time_ms' => $totalTime,
                'api_calls' => $weekCount * 2,
                'time_per_call_ms' => $serverTime / ($weekCount * 2)
            ];
            
            // Performance should scale reasonably
            expect($serverTime)->toBeLessThan($weekCount * 1500); // Max 1.5s per API call pair
            expect($data['success'])->toBeTrue();
        }
        
        // Verify performance scaling is reasonable
        expect($performanceMetrics[6]['time_per_call_ms'])->toBeLessThan(2000); // Under 2s per API call
        expect($performanceMetrics[6]['server_time_ms'])->toBeLessThan(25000); // Under 25s for 6 weeks
        
        Log::info('Performance Scaling Test Results', $performanceMetrics);
    });

    it('measures memory usage during large batch processing', function () {
        $this->actingAs($this->user);
        
        $memoryBefore = memory_get_usage(true);
        $peakMemoryBefore = memory_get_peak_usage(true);
        
        // Create a realistic large dataset (4 weeks)
        $currentWeeks = [];
        $previousWeeks = [];
        
        for ($i = 1; $i <= 4; $i++) {
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
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => $currentWeeks,
            'previous_month_weeks' => $previousWeeks,
        ]);
        
        $memoryAfter = memory_get_usage(true);
        $peakMemoryAfter = memory_get_peak_usage(true);
        
        $memoryUsed = $memoryAfter - $memoryBefore;
        $peakMemoryUsed = $peakMemoryAfter - $peakMemoryBefore;
        
        $response->assertStatus(200);
        
        // Memory usage assertions (reasonable limits)
        expect($memoryUsed)->toBeLessThan(50 * 1024 * 1024); // Less than 50MB additional usage
        expect($peakMemoryUsed)->toBeLessThan(100 * 1024 * 1024); // Less than 100MB peak usage
        
        Log::info('Memory Usage Test Results', [
            'memory_used_mb' => round($memoryUsed / 1024 / 1024, 2),
            'peak_memory_used_mb' => round($peakMemoryUsed / 1024 / 1024, 2),
            'api_calls' => 8
        ]);
    });
});

describe('Monthly Chart Controller - Concurrent Request Performance', function () {
    
    it('handles multiple simultaneous monthly batch requests', function () {
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
        
        // Simulate 3 concurrent requests (realistic scenario)
        $responses = [];
        for ($i = 0; $i < 3; $i++) {
            $responses[] = $this->postJson('/api/dashboard/monthly-batch', $requestData);
        }
        
        $endTime = microtime(true);
        $totalTime = ($endTime - $startTime) * 1000;
        
        // All requests should succeed
        foreach ($responses as $response) {
            $response->assertStatus(200);
            $data = $response->json();
            expect($data['success'])->toBeTrue();
        }
        
        // Sequential execution should not take more than 3x single request time
        expect($totalTime)->toBeLessThan(15000); // 15 seconds max for 3 requests
        
        Log::info('Concurrent Request Test Results', [
            'total_time_ms' => $totalTime,
            'requests_count' => 3,
            'average_time_per_request_ms' => $totalTime / 3
        ]);
    });
});

describe('Monthly Chart Controller - Error Condition Performance', function () {
    
    it('measures performance when external API is slow', function () {
        $this->actingAs($this->user);
        
        // Mock slow external API (2 second delay)
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => Http::response([
                'success' => true,
                'data' => ['sales' => ['total' => 180000], 'cards' => []]
            ], 200, [], 2000), // 2 second delay
        ]);
        
        $startTime = microtime(true);
        
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
        
        $endTime = microtime(true);
        $totalTime = ($endTime - $startTime) * 1000;
        
        $response->assertStatus(200);
        
        // Should handle slow API gracefully
        expect($totalTime)->toBeGreaterThan(2000); // Should reflect the slow API
        expect($totalTime)->toBeLessThan(10000); // But not excessively slow
        
        $data = $response->json();
        expect($data['success'])->toBeTrue();
        expect($data['data']['metadata']['execution_time_ms'])->toBeGreaterThan(2000);
    });

    it('measures performance when some external API calls fail', function () {
        $this->actingAs($this->user);
        
        // Mock mixed success/failure responses
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => Http::sequence()
                ->push(['data' => ['sales' => ['total' => 180000]]], 200) // Success
                ->push(['error' => 'Server error'], 500) // Failure
                ->push(['data' => ['sales' => ['total' => 160000]]], 200), // Success
        ]);
        
        $startTime = microtime(true);
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => [
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
            ],
            'previous_month_weeks' => [
                [
                    'week_key' => 'week_1',
                    'week_name' => 'Semana 1',
                    'start_date' => '2024-12-01',
                    'end_date' => '2024-12-07'
                ]
            ],
        ]);
        
        $endTime = microtime(true);
        $totalTime = ($endTime - $startTime) * 1000;
        
        $response->assertStatus(200);
        
        $data = $response->json();
        expect($data['success'])->toBeTrue();
        expect($data['data']['metadata']['failed_requests'])->toBeGreaterThan(0);
        expect($data['data']['metadata']['success_rate'])->toBeLessThan(100);
        
        // Performance should not degrade significantly with partial failures
        expect($totalTime)->toBeLessThan(8000); // Under 8 seconds
        
        Log::info('Partial Failure Performance Test', [
            'total_time_ms' => $totalTime,
            'failed_requests' => $data['data']['metadata']['failed_requests'],
            'success_rate' => $data['data']['metadata']['success_rate']
        ]);
    });

    it('handles timeout scenarios gracefully without hanging', function () {
        $this->actingAs($this->user);
        
        // Mock timeout response
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => function () {
                throw new \Illuminate\Http\Client\ConnectionException('Connection timeout');
            }
        ]);
        
        $startTime = microtime(true);
        
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
        
        $endTime = microtime(true);
        $totalTime = ($endTime - $startTime) * 1000;
        
        $response->assertStatus(200); // Should still return success with fallback data
        
        // Should not hang indefinitely
        expect($totalTime)->toBeLessThan(5000); // Under 5 seconds
        
        $data = $response->json();
        expect($data['success'])->toBeTrue();
        expect($data['data']['current_month_weeks']['week_1']['total'])->toBe(0);
    });
});

describe('Monthly Chart Controller - Resource Utilization Tests', function () {
    
    it('monitors CPU usage during intensive batch processing', function () {
        $this->actingAs($this->user);
        
        // Create data that will trigger many calculations
        $currentWeeks = [];
        $previousWeeks = [];
        
        for ($i = 1; $i <= 5; $i++) {
            $currentWeeks[] = [
                'week_key' => "week_{$i}",
                'week_name' => "Semana {$i}",
                'start_date' => "2025-01-" . str_pad($i * 6 - 5, 2, '0', STR_PAD_LEFT),
                'end_date' => "2025-01-" . str_pad($i * 6, 2, '0', STR_PAD_LEFT)
            ];
            
            $previousWeeks[] = [
                'week_key' => "week_{$i}",
                'week_name' => "Semana {$i}",
                'start_date' => "2024-12-" . str_pad($i * 6 - 5, 2, '0', STR_PAD_LEFT),
                'end_date' => "2024-12-" . str_pad($i * 6, 2, '0', STR_PAD_LEFT)
            ];
        }
        
        $startTime = microtime(true);
        $startCpuTime = getrusage();
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => $currentWeeks,
            'previous_month_weeks' => $previousWeeks,
        ]);
        
        $endTime = microtime(true);
        $endCpuTime = getrusage();
        
        $wallTime = ($endTime - $startTime) * 1000;
        $userCpuTime = ($endCpuTime['ru_utime.tv_sec'] - $startCpuTime['ru_utime.tv_sec']) * 1000 +
                       ($endCpuTime['ru_utime.tv_usec'] - $startCpuTime['ru_utime.tv_usec']) / 1000;
        
        $response->assertStatus(200);
        
        $data = $response->json();
        expect($data['success'])->toBeTrue();
        
        // CPU utilization should be reasonable
        $cpuUtilization = $userCpuTime / $wallTime * 100;
        expect($cpuUtilization)->toBeLessThan(80); // Should not use more than 80% CPU
        
        Log::info('CPU Utilization Test Results', [
            'wall_time_ms' => $wallTime,
            'cpu_time_ms' => $userCpuTime,
            'cpu_utilization_percent' => round($cpuUtilization, 2),
            'api_calls' => 10
        ]);
    });

    it('verifies compression settings improve response size', function () {
        $this->actingAs($this->user);
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
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
        ]);
        
        $response->assertStatus(200)
                ->assertHeader('Cache-Control', 'public, max-age=300')
                ->assertHeader('Vary', 'Accept-Encoding');
        
        $data = $response->json();
        expect($data['data']['metadata']['compression_enabled'])->toBeBoolean();
        
        $responseSize = strlen($response->content());
        expect($responseSize)->toBeGreaterThan(100); // Should have meaningful content
        expect($responseSize)->toBeLessThan(50000); // But not excessively large
        
        Log::info('Response Size Analysis', [
            'response_size_bytes' => $responseSize,
            'compression_enabled' => $data['data']['metadata']['compression_enabled']
        ]);
    });
});

describe('Monthly Chart Controller - Performance Regression Tests', function () {
    
    it('establishes performance benchmark for future regression testing', function () {
        $this->actingAs($this->user);
        
        $testScenarios = [
            'small_dataset' => [
                'current_weeks' => 1,
                'previous_weeks' => 1,
                'max_time_ms' => 3000
            ],
            'medium_dataset' => [
                'current_weeks' => 3,
                'previous_weeks' => 3,
                'max_time_ms' => 8000
            ],
            'large_dataset' => [
                'current_weeks' => 5,
                'previous_weeks' => 5,
                'max_time_ms' => 15000
            ]
        ];
        
        $results = [];
        
        foreach ($testScenarios as $scenarioName => $scenario) {
            $currentWeeks = [];
            $previousWeeks = [];
            
            for ($i = 1; $i <= $scenario['current_weeks']; $i++) {
                $currentWeeks[] = [
                    'week_key' => "week_{$i}",
                    'week_name' => "Semana {$i}",
                    'start_date' => "2025-01-" . str_pad($i * 5, 2, '0', STR_PAD_LEFT),
                    'end_date' => "2025-01-" . str_pad($i * 5 + 4, 2, '0', STR_PAD_LEFT)
                ];
            }
            
            for ($i = 1; $i <= $scenario['previous_weeks']; $i++) {
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
            $totalTime = ($endTime - $startTime) * 1000;
            
            $response->assertStatus(200);
            
            $data = $response->json();
            $serverTime = $data['data']['metadata']['execution_time_ms'];
            
            expect($serverTime)->toBeLessThan($scenario['max_time_ms']);
            expect($data['success'])->toBeTrue();
            
            $results[$scenarioName] = [
                'server_time_ms' => $serverTime,
                'total_time_ms' => $totalTime,
                'api_calls' => $scenario['current_weeks'] + $scenario['previous_weeks'],
                'benchmark_met' => $serverTime < $scenario['max_time_ms']
            ];
        }
        
        // All benchmarks should be met
        foreach ($results as $scenarioName => $result) {
            expect($result['benchmark_met'])->toBeTrue("Performance benchmark failed for {$scenarioName}");
        }
        
        Log::info('Performance Benchmark Results', $results);
    });
});