<?php

use App\Models\User;
use App\Services\ExternalApiService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create([
        'email_verified_at' => now(),
    ]);
    
    // Set up comprehensive integration test mocks
    $this->setupIntegrationMocks();
    
    // Test scenarios for different monthly periods
    $this->monthlyScenarios = [
        'january_2025' => [
            'current_start' => '2025-01-01',
            'current_end' => '2025-01-31',
            'previous_start' => '2024-12-01',
            'previous_end' => '2024-12-31',
            'expected_weeks' => 5
        ],
        'february_2025' => [
            'current_start' => '2025-02-01',
            'current_end' => '2025-02-28',
            'previous_start' => '2025-01-01',
            'previous_end' => '2025-01-31',
            'expected_weeks' => 4
        ],
        'march_2025' => [
            'current_start' => '2025-03-01',
            'current_end' => '2025-03-31',
            'previous_start' => '2025-02-01',
            'previous_end' => '2025-02-28',
            'expected_weeks' => 5
        ]
    ];
});

function setupIntegrationMocks() {
    // Mock comprehensive external API responses with realistic data
    Http::fake([
        'http://192.168.100.20/api/main_dashboard_data' => function ($request) {
            $requestData = $request->data();
            $startDate = $requestData['start_date'] ?? null;
            $endDate = $requestData['end_date'] ?? null;
            
            // Generate realistic data based on date range
            $baseTotal = 180000;
            $variationFactor = 1 + (crc32($startDate . $endDate) % 40 - 20) / 100; // ±20% variation
            $total = (int) ($baseTotal * $variationFactor);
            
            return Http::response([
                'success' => true,
                'data' => [
                    'sales' => [
                        'total' => $total,
                        'subtotal' => (int) ($total * 0.92),
                        'commission' => (int) ($total * 0.03),
                        'tax' => (int) ($total * 0.05),
                    ],
                    'cards' => [
                        'Sucursal Centro' => [
                            'open_accounts' => ['total' => rand(30, 50), 'money' => rand(15000, 25000)],
                            'closed_ticket' => ['total' => rand(40, 70), 'money' => rand(20000, 35000)],
                            'average_ticket' => rand(600, 800),
                            'percentage' => ['icon' => 'up', 'qty' => rand(10, 20)],
                            'date' => $startDate,
                            'store_id' => 1,
                        ],
                        'Sucursal Norte' => [
                            'open_accounts' => ['total' => rand(25, 45), 'money' => rand(12000, 22000)],
                            'closed_ticket' => ['total' => rand(35, 65), 'money' => rand(18000, 32000)],
                            'average_ticket' => rand(650, 750),
                            'percentage' => ['icon' => 'up', 'qty' => rand(8, 18)],
                            'date' => $startDate,
                            'store_id' => 2,
                        ],
                        'Sucursal Sur' => [
                            'open_accounts' => ['total' => rand(35, 55), 'money' => rand(18000, 28000)],
                            'closed_ticket' => ['total' => rand(50, 80), 'money' => rand(25000, 40000)],
                            'average_ticket' => rand(550, 700),
                            'percentage' => ['icon' => rand(0, 1) ? 'up' : 'down', 'qty' => rand(-5, 15)],
                            'date' => $startDate,
                            'store_id' => 3,
                        ]
                    ]
                ],
                'message' => 'Success',
                'timestamp' => now()->toISOString(),
                'request_info' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'processing_time_ms' => rand(100, 300)
                ]
            ], 200, [], rand(100, 300)); // Random delay between 100-300ms
        }
    ]);
}

describe('Monthly Data Flow Integration - End-to-End Tests', function () {
    
    it('completes full monthly data flow for January 2025', function () {
        $this->actingAs($this->user);
        
        $scenario = $this->monthlyScenarios['january_2025'];
        
        Log::info('Starting full monthly data flow integration test', [
            'scenario' => 'january_2025',
            'period' => $scenario['current_start'] . ' to ' . $scenario['current_end'],
            'user_id' => $this->user->id
        ]);
        
        // Step 1: Test main dashboard data endpoints
        $currentDataResponse = $this->getJson("/api/dashboard/main-data?" . http_build_query([
            'start_date' => $scenario['current_start'],
            'end_date' => $scenario['current_end'],
        ]));
        
        $previousDataResponse = $this->getJson("/api/dashboard/main-data?" . http_build_query([
            'start_date' => $scenario['previous_start'],
            'end_date' => $scenario['previous_end'],
        ]));
        
        // Verify main data endpoints work
        $currentDataResponse->assertStatus(200);
        $previousDataResponse->assertStatus(200);
        
        $currentData = $currentDataResponse->json();
        $previousData = $previousDataResponse->json();
        
        expect($currentData['success'])->toBeTrue();
        expect($previousData['success'])->toBeTrue();
        expect($currentData['data']['sales']['total'])->toBeNumeric();
        expect($previousData['data']['sales']['total'])->toBeNumeric();
        
        // Step 2: Generate week data for monthly batch
        $currentWeeks = $this->generateWeeksForPeriod($scenario['current_start'], $scenario['current_end']);
        $previousWeeks = $this->generateWeeksForPeriod($scenario['previous_start'], $scenario['previous_end']);
        
        expect(count($currentWeeks))->toBe($scenario['expected_weeks']);
        expect(count($previousWeeks))->toBeGreaterThanOrEqual(4); // At least 4 weeks
        
        // Step 3: Test monthly batch API
        $batchResponse = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => $currentWeeks,
            'previous_month_weeks' => $previousWeeks,
        ]);
        
        $batchResponse->assertStatus(200);
        $batchData = $batchResponse->json();
        
        expect($batchData['success'])->toBeTrue();
        expect($batchData['data']['current_month_weeks'])->toHaveCount($scenario['expected_weeks']);
        expect($batchData['data']['metadata']['current_month_total'])->toBeNumeric();
        expect($batchData['data']['metadata']['previous_month_total'])->toBeNumeric();
        
        // Step 4: Verify data consistency across endpoints
        $batchCurrentTotal = $batchData['data']['metadata']['current_month_total'];
        $batchPreviousTotal = $batchData['data']['metadata']['previous_month_total'];
        
        // The batch totals should be reasonable compared to single API calls
        expect($batchCurrentTotal)->toBeGreaterThan(0);
        expect($batchPreviousTotal)->toBeGreaterThan(0);
        
        // Step 5: Test calculation accuracy
        $monthOverMonthChange = $batchData['data']['metadata']['month_over_month_change'];
        $expectedChange = $batchPreviousTotal > 0 ? 
            (($batchCurrentTotal - $batchPreviousTotal) / $batchPreviousTotal) * 100 : 0;
        
        expect(abs($monthOverMonthChange - $expectedChange))->toBeLessThan(0.1); // Within 0.1% accuracy
        
        Log::info('January 2025 monthly data flow completed successfully', [
            'current_total' => $batchCurrentTotal,
            'previous_total' => $batchPreviousTotal,
            'month_over_month_change' => $monthOverMonthChange,
            'weeks_processed' => count($currentWeeks) + count($previousWeeks),
            'api_calls_made' => $batchData['data']['metadata']['total_requests'],
            'execution_time_ms' => $batchData['data']['metadata']['execution_time_ms']
        ]);
    });
    
    it('handles cross-year monthly comparison (December 2024 vs January 2025)', function () {
        $this->actingAs($this->user);
        
        $currentStart = '2025-01-01';
        $currentEnd = '2025-01-31';
        $previousStart = '2024-12-01';
        $previousEnd = '2024-12-31';
        
        Log::info('Testing cross-year monthly comparison', [
            'current_period' => "{$currentStart} to {$currentEnd}",
            'previous_period' => "{$previousStart} to {$previousEnd}"
        ]);
        
        // Generate weeks for both months
        $currentWeeks = $this->generateWeeksForPeriod($currentStart, $currentEnd);
        $previousWeeks = $this->generateWeeksForPeriod($previousStart, $previousEnd);
        
        // Test monthly batch with cross-year data
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => $currentWeeks,
            'previous_month_weeks' => $previousWeeks,
        ]);
        
        $response->assertStatus(200);
        $data = $response->json();
        
        expect($data['success'])->toBeTrue();
        expect($data['data']['metadata']['current_month_total'])->toBeNumeric();
        expect($data['data']['metadata']['previous_month_total'])->toBeNumeric();
        
        // Verify date handling across year boundary
        expect($data['data']['current_month_weeks'])->toHaveCount(5); // January has 5 weeks
        expect($data['data']['previous_month_weeks'])->toHaveCount(5); // December has 5 weeks
        
        Log::info('Cross-year comparison completed successfully', [
            'january_2025_total' => $data['data']['metadata']['current_month_total'],
            'december_2024_total' => $data['data']['metadata']['previous_month_total'],
            'change_percentage' => $data['data']['metadata']['month_over_month_change']
        ]);
    });
    
    it('tests complete data flow with external service integration', function () {
        $this->actingAs($this->user);
        
        // Test direct service integration
        $externalApiService = app(ExternalApiService::class);
        
        $currentWeeks = [
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
        
        $previousWeeks = [
            [
                'week_key' => 'week_1',
                'week_name' => 'Semana 1',
                'start_date' => '2024-12-01',
                'end_date' => '2024-12-07'
            ]
        ];
        
        // Test service layer directly
        $serviceResult = $externalApiService->getMonthlyBatchData($currentWeeks, $previousWeeks);
        
        expect($serviceResult['success'])->toBeTrue();
        expect($serviceResult['data']['current_month_weeks'])->toHaveCount(2);
        expect($serviceResult['data']['previous_month_weeks'])->toHaveCount(1);
        
        // Test controller layer
        $controllerResponse = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => $currentWeeks,
            'previous_month_weeks' => $previousWeeks,
        ]);
        
        $controllerResponse->assertStatus(200);
        $controllerData = $controllerResponse->json();
        
        // Verify service and controller return consistent data
        expect($controllerData['data']['metadata']['current_month_total'])
            ->toBe($serviceResult['data']['metadata']['current_month_total']);
        expect($controllerData['data']['metadata']['previous_month_total'])
            ->toBe($serviceResult['data']['metadata']['previous_month_total']);
        
        Log::info('Service-Controller integration test completed', [
            'service_current_total' => $serviceResult['data']['metadata']['current_month_total'],
            'controller_current_total' => $controllerData['data']['metadata']['current_month_total'],
            'data_consistency' => 'VERIFIED'
        ]);
    });
});

describe('Monthly Data Flow Integration - Error Recovery Tests', function () {
    
    it('handles partial external API failures gracefully in full flow', function () {
        $this->actingAs($this->user);
        
        // Mock external API with partial failures
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => Http::sequence()
                ->push(['data' => ['sales' => ['total' => 180000], 'cards' => []]], 200) // Success
                ->push(['error' => 'Server temporarily unavailable'], 503) // Failure
                ->push(['data' => ['sales' => ['total' => 160000], 'cards' => []]], 200) // Success
                ->push(['error' => 'Timeout'], 408) // Failure
                ->push(['data' => ['sales' => ['total' => 170000], 'cards' => []]], 200), // Success
        ]);
        
        $currentWeeks = [];
        $previousWeeks = [];
        
        for ($i = 1; $i <= 3; $i++) {
            $currentWeeks[] = [
                'week_key' => "week_{$i}",
                'week_name' => "Semana {$i}",
                'start_date' => "2025-01-" . str_pad($i * 7, 2, '0', STR_PAD_LEFT),
                'end_date' => "2025-01-" . str_pad($i * 7 + 6, 2, '0', STR_PAD_LEFT)
            ];
            
            $previousWeeks[] = [
                'week_key' => "week_{$i}",
                'week_name' => "Semana {$i}",
                'start_date' => "2024-12-" . str_pad($i * 7, 2, '0', STR_PAD_LEFT),
                'end_date' => "2024-12-" . str_pad($i * 7 + 6, 2, '0', STR_PAD_LEFT)
            ];
        }
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => $currentWeeks,
            'previous_month_weeks' => $previousWeeks,
        ]);
        
        $response->assertStatus(200); // Should still return 200
        
        $data = $response->json();
        expect($data['success'])->toBeTrue();
        expect($data['data']['metadata']['failed_requests'])->toBeGreaterThan(0);
        expect($data['data']['metadata']['success_rate'])->toBeLessThan(100);
        expect($data['data']['metadata']['success_rate'])->toBeGreaterThan(0);
        
        // Should have fallback values for failed requests
        expect($data['data']['metadata']['current_month_total'])->toBeNumeric();
        expect($data['data']['metadata']['previous_month_total'])->toBeNumeric();
        
        Log::info('Partial failure recovery test completed', [
            'failed_requests' => $data['data']['metadata']['failed_requests'],
            'success_rate' => $data['data']['metadata']['success_rate'],
            'current_total' => $data['data']['metadata']['current_month_total'],
            'previous_total' => $data['data']['metadata']['previous_month_total']
        ]);
    });
    
    it('handles complete external API failure with proper error responses', function () {
        $this->actingAs($this->user);
        
        // Mock complete API failure
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => Http::response(['error' => 'Service unavailable'], 503)
        ]);
        
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
        
        $response->assertStatus(200); // Should still return 200 but with error data
        
        $data = $response->json();
        expect($data['success'])->toBeTrue(); // Service level success even with API failures
        expect($data['data']['metadata']['failed_requests'])->toBe(1);
        expect($data['data']['metadata']['success_rate'])->toBe(0);
        expect($data['data']['current_month_weeks']['week_1']['total'])->toBe(0); // Fallback value
        
        Log::info('Complete API failure handling test completed', [
            'fallback_behavior' => 'VERIFIED',
            'error_gracefully_handled' => true
        ]);
    });
});

describe('Monthly Data Flow Integration - Performance and Scalability Tests', function () {
    
    it('tests scalability with maximum allowed weeks', function () {
        $this->actingAs($this->user);
        
        // Create maximum allowed weeks (10 per array)
        $currentWeeks = [];
        $previousWeeks = [];
        
        for ($i = 1; $i <= 10; $i++) {
            $currentWeeks[] = [
                'week_key' => "week_{$i}",
                'week_name' => "Semana {$i}",
                'start_date' => "2025-01-" . str_pad($i * 3, 2, '0', STR_PAD_LEFT),
                'end_date' => "2025-01-" . str_pad($i * 3 + 2, 2, '0', STR_PAD_LEFT)
            ];
            
            $previousWeeks[] = [
                'week_key' => "week_{$i}",
                'week_name' => "Semana {$i}",
                'start_date' => "2024-12-" . str_pad($i * 3, 2, '0', STR_PAD_LEFT),
                'end_date' => "2024-12-" . str_pad($i * 3 + 2, 2, '0', STR_PAD_LEFT)
            ];
        }
        
        $startTime = microtime(true);
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => $currentWeeks,
            'previous_month_weeks' => $previousWeeks,
        ]);
        
        $endTime = microtime(true);
        $executionTime = ($endTime - $startTime) * 1000;
        
        $response->assertStatus(200);
        
        $data = $response->json();
        expect($data['success'])->toBeTrue();
        expect($data['data']['metadata']['total_requests'])->toBe(20); // 10 + 10
        expect($executionTime)->toBeLessThan(30000); // Should complete within 30 seconds
        
        Log::info('Maximum scalability test completed', [
            'weeks_processed' => 20,
            'execution_time_ms' => round($executionTime, 2),
            'api_calls' => 20,
            'average_time_per_call_ms' => round($executionTime / 20, 2)
        ]);
    });
    
    it('tests data flow consistency across multiple requests', function () {
        $this->actingAs($this->user);
        
        $weekData = [
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
        
        // Make multiple requests with same data
        $responses = [];
        for ($i = 0; $i < 5; $i++) {
            $responses[] = $this->postJson('/api/dashboard/monthly-batch', $weekData);
        }
        
        // Verify all responses are successful
        foreach ($responses as $response) {
            $response->assertStatus(200);
        }
        
        // Verify data consistency across requests
        $firstResponse = $responses[0]->json();
        foreach ($responses as $index => $response) {
            $data = $response->json();
            
            expect($data['success'])->toBeTrue();
            expect($data['data']['metadata']['current_month_total'])
                ->toBe($firstResponse['data']['metadata']['current_month_total']);
            expect($data['data']['metadata']['previous_month_total'])
                ->toBe($firstResponse['data']['metadata']['previous_month_total']);
        }
        
        Log::info('Data consistency test completed', [
            'requests_made' => 5,
            'consistent_results' => true,
            'current_total' => $firstResponse['data']['metadata']['current_month_total']
        ]);
    });
});

describe('Monthly Data Flow Integration - Authentication and Security Tests', function () {
    
    it('enforces authentication throughout the data flow', function () {
        // Test without authentication
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => [],
            'previous_month_weeks' => [],
        ]);
        
        $response->assertStatus(302); // Redirect to login
        
        // Test with unverified user
        $unverifiedUser = User::factory()->create(['email_verified_at' => null]);
        $this->actingAs($unverifiedUser);
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => [],
            'previous_month_weeks' => [],
        ]);
        
        $response->assertStatus(302); // Should also redirect/fail
        
        // Test with verified user (should work)
        $this->actingAs($this->user);
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => [],
            'previous_month_weeks' => [],
        ]);
        
        $response->assertStatus(200);
    });
    
    it('validates CSRF protection throughout the flow', function () {
        $this->actingAs($this->user);
        
        // Test without CSRF token
        $response = $this->json('POST', '/api/dashboard/monthly-batch', [
            'current_month_weeks' => [],
            'previous_month_weeks' => [],
        ]);
        
        $response->assertStatus(419); // CSRF token mismatch
        
        // Test with CSRF token (postJson automatically includes it)
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => [],
            'previous_month_weeks' => [],
        ]);
        
        $response->assertStatus(200);
    });
});

// Helper method to generate weeks for a given period
function generateWeeksForPeriod(string $startDate, string $endDate): array
{
    $start = Carbon::parse($startDate);
    $end = Carbon::parse($endDate);
    
    $weeks = [];
    $weekNumber = 1;
    
    while ($start <= $end) {
        $weekEnd = $start->copy()->addDays(6);
        if ($weekEnd > $end) {
            $weekEnd = $end->copy();
        }
        
        $weeks[] = [
            'week_key' => "week_{$weekNumber}",
            'week_name' => "Semana {$weekNumber}",
            'start_date' => $start->format('Y-m-d'),
            'end_date' => $weekEnd->format('Y-m-d')
        ];
        
        $start->addWeek();
        $weekNumber++;
        
        if ($weekNumber > 10) break; // Safety limit
    }
    
    return $weeks;
}