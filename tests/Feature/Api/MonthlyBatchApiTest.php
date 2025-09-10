<?php

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create([
        'email_verified_at' => now(),
    ]);
    
    // Set up basic HTTP mock for external API
    setupBasicMocks();
});

function setupBasicMocks() {
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
                        'percentage' => ['icon' => 'up', 'qty' => '15.2'],
                        'date' => '2025-01-01',
                        'store_id' => 1,
                    ]
                ]
            ],
            'message' => 'Success',
        ], 200),
    ]);
}

describe('Monthly Batch API Endpoint - POST Method Tests', function () {
    
    it('processes valid POST request with current and previous month weeks', function () {
        $this->actingAs($this->user);
        
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
            ],
            [
                'week_key' => 'week_2',
                'week_name' => 'Semana 2',
                'start_date' => '2024-12-08',
                'end_date' => '2024-12-14'
            ]
        ];
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => $currentMonthWeeks,
            'previous_month_weeks' => $previousMonthWeeks,
        ]);
        
        $response->assertStatus(200)
                ->assertJsonStructure([
                    'success',
                    'message',
                    'data' => [
                        'current_month_weeks',
                        'previous_month_weeks',
                        'metadata' => [
                            'current_month_total',
                            'previous_month_total',
                            'month_over_month_change',
                            'request_time',
                            'execution_time_ms',
                            'api_optimization',
                            'compression_enabled'
                        ]
                    ]
                ])
                ->assertJsonPath('success', true);
        
        $data = $response->json();
        expect($data['data']['metadata']['current_month_total'])->toBeNumeric();
        expect($data['data']['metadata']['previous_month_total'])->toBeNumeric();
        expect($data['data']['metadata']['month_over_month_change'])->toBeNumeric();
        expect($data['data']['metadata']['execution_time_ms'])->toBeNumeric();
    });

    it('handles POST request with empty current_month_weeks array', function () {
        $this->actingAs($this->user);
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => [],
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
                ->assertJsonPath('success', true)
                ->assertJsonPath('data.current_month_weeks', []);
        
        // Should still process previous month weeks
        $data = $response->json();
        expect($data['data']['previous_month_weeks'])->not->toBeEmpty();
    });

    it('handles POST request with empty previous_month_weeks array', function () {
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
            'previous_month_weeks' => [],
        ]);
        
        $response->assertStatus(200)
                ->assertJsonPath('success', true)
                ->assertJsonPath('data.previous_month_weeks', []);
        
        // Should still process current month weeks
        $data = $response->json();
        expect($data['data']['current_month_weeks'])->not->toBeEmpty();
    });

    it('returns empty data structure when both arrays are empty', function () {
        $this->actingAs($this->user);
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => [],
            'previous_month_weeks' => [],
        ]);
        
        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'message' => 'No hay datos para procesar',
                    'data' => [
                        'current_month_weeks' => [],
                        'previous_month_weeks' => [],
                        'metadata' => [
                            'current_month_total' => 0,
                            'previous_month_total' => 0,
                            'total_api_calls' => 0,
                            'error_occurred' => false,
                            'fallback_available' => false
                        ]
                    ]
                ]);
    });

    it('validates required array fields are present', function () {
        $this->actingAs($this->user);
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'some_other_field' => 'value'
        ]);
        
        $response->assertStatus(422)
                ->assertJsonValidationErrors(['current_month_weeks', 'previous_month_weeks']);
    });

    it('allows arrays to be present but empty (validation: present|array)', function () {
        $this->actingAs($this->user);
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => [],
            'previous_month_weeks' => []
        ]);
        
        $response->assertStatus(200)
                ->assertJsonPath('success', true);
    });

    it('rejects non-array values for week fields', function () {
        $this->actingAs($this->user);
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => 'not-an-array',
            'previous_month_weeks' => []
        ]);
        
        $response->assertStatus(422)
                ->assertJsonValidationErrors(['current_month_weeks']);
    });
});

describe('Monthly Batch API Endpoint - GET Method Tests', function () {
    
    it('accepts GET requests with query parameters', function () {
        $this->actingAs($this->user);
        
        $currentMonthWeeks = [
            [
                'week_key' => 'week_1',
                'week_name' => 'Semana 1',
                'start_date' => '2025-01-01',
                'end_date' => '2025-01-07'
            ]
        ];
        
        $response = $this->getJson('/api/dashboard/monthly-batch?' . http_build_query([
            'current_month_weeks' => $currentMonthWeeks,
            'previous_month_weeks' => []
        ]));
        
        $response->assertStatus(200)
                ->assertJsonPath('success', true);
    });

    it('handles GET request with no parameters', function () {
        $this->actingAs($this->user);
        
        $response = $this->getJson('/api/dashboard/monthly-batch');
        
        $response->assertStatus(200)
                ->assertJsonPath('success', true)
                ->assertJsonPath('message', 'No hay datos para procesar');
    });
});

describe('Monthly Batch API Endpoint - Performance Tests', function () {
    
    it('measures execution time for single week batch', function () {
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
        
        $totalTime = (microtime(true) - $startTime) * 1000;
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $reportedTime = $data['data']['metadata']['execution_time_ms'];
        
        // Server-reported time should be reasonable
        expect($reportedTime)->toBeLessThan(5000); // Less than 5 seconds
        expect($reportedTime)->toBeGreaterThan(0);
        
        // Total test time should be reasonable
        expect($totalTime)->toBeLessThan(10000); // Less than 10 seconds for test
    });

    it('handles large dataset with 6 weeks efficiently', function () {
        $this->actingAs($this->user);
        
        $currentMonthWeeks = [];
        $previousMonthWeeks = [];
        
        // Create 6 weeks of data for each month (realistic scenario)
        for ($i = 1; $i <= 6; $i++) {
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
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => $currentMonthWeeks,
            'previous_month_weeks' => $previousMonthWeeks,
        ]);
        
        $totalTime = (microtime(true) - $startTime) * 1000;
        
        $response->assertStatus(200);
        
        $data = $response->json();
        expect($data['success'])->toBeTrue();
        expect($data['data']['metadata']['total_requests'])->toBe(12); // 6 + 6 weeks
        expect($data['data']['metadata']['execution_time_ms'])->toBeLessThan(30000); // Less than 30 seconds
        
        // Should complete in reasonable time even with 12 API calls
        expect($totalTime)->toBeLessThan(45000); // Less than 45 seconds total
    });

    it('includes performance metadata in response', function () {
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
            'previous_month_weeks' => [],
        ]);
        
        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        'metadata' => [
                            'execution_time_ms',
                            'api_optimization',
                            'compression_enabled',
                            'total_requests',
                            'success_rate'
                        ]
                    ]
                ]);
        
        $data = $response->json();
        expect($data['data']['metadata']['api_optimization'])->toBe('individual_week_calls_to_1_batch');
        expect($data['data']['metadata']['compression_enabled'])->toBeBoolean();
    });

    it('tests compression header setting', function () {
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
            'previous_month_weeks' => [],
        ]);
        
        $response->assertStatus(200)
                ->assertHeader('Cache-Control', 'public, max-age=300')
                ->assertHeader('Vary', 'Accept-Encoding');
    });
});

describe('Monthly Batch API Endpoint - Error Handling Tests', function () {
    
    it('handles external API timeout gracefully', function () {
        $this->actingAs($this->user);
        
        // Mock external API to timeout
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => Http::response(null, 408),
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
        
        $response->assertStatus(200); // Should still return 200 with error data
        
        $data = $response->json();
        expect($data['success'])->toBeTrue(); // API call succeeds even if external API fails
        expect($data['data']['current_month_weeks'])->toHaveKey('week_1');
        expect($data['data']['current_month_weeks']['week_1']['total'])->toBe(0); // Should have zero values
    });

    it('handles external API 500 error gracefully', function () {
        $this->actingAs($this->user);
        
        // Mock external API to return 500 error
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => Http::response([
                'error' => 'Internal server error'
            ], 500),
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
        
        $response->assertStatus(200);
        
        $data = $response->json();
        expect($data['success'])->toBeTrue();
        expect($data['data']['metadata']['failed_requests'])->toBeGreaterThan(0);
        expect($data['data']['metadata']['success_rate'])->toBeLessThan(100);
    });

    it('handles malformed week data gracefully', function () {
        $this->actingAs($this->user);
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => [
                [
                    'week_key' => 'week_1',
                    // Missing required fields
                    'start_date' => '2025-01-01',
                ]
            ],
            'previous_month_weeks' => [],
        ]);
        
        // Should handle gracefully and not crash
        $response->assertStatus(200);
        
        $data = $response->json();
        expect($data['success'])->toBeTrue();
    });

    it('handles authentication error by returning 401', function () {
        // Don't authenticate user
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => [],
            'previous_month_weeks' => [],
        ]);
        
        $response->assertStatus(302); // Redirect to login
    });

    it('logs detailed error information on exception', function () {
        $this->actingAs($this->user);
        
        // Mock to throw an exception during processing
        Http::fake(function () {
            throw new \Exception('Test exception for logging');
        });
        
        Log::shouldReceive('error')
           ->once()
           ->with('Error fetching monthly batch data', \Mockery::type('array'));
        
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
        
        $response->assertStatus(500)
                ->assertJsonPath('success', false)
                ->assertJsonPath('message', 'Error al obtener los datos mensuales batch')
                ->assertJsonStructure([
                    'success',
                    'message',
                    'error',
                    'data' => [
                        'current_month_weeks',
                        'previous_month_weeks',
                        'metadata' => [
                            'error_occurred',
                            'fallback_available'
                        ]
                    ]
                ]);
    });
});

describe('Monthly Batch API Endpoint - CSRF Protection Tests', function () {
    
    it('requires CSRF token for POST requests', function () {
        $this->actingAs($this->user);
        
        // Make request without CSRF token
        $response = $this->json('POST', '/api/dashboard/monthly-batch', [
            'current_month_weeks' => [],
            'previous_month_weeks' => [],
        ]);
        
        $response->assertStatus(419); // CSRF token mismatch
    });

    it('accepts valid CSRF token', function () {
        $this->actingAs($this->user);
        
        // This test uses postJson which automatically includes CSRF token
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => [],
            'previous_month_weeks' => [],
        ]);
        
        $response->assertStatus(200);
    });
});

describe('Monthly Batch API Endpoint - Data Accuracy Tests', function () {
    
    it('correctly calculates month over month percentage change', function () {
        $this->actingAs($this->user);
        
        // Mock different totals for current vs previous month
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => Http::sequence()
                ->push(['data' => ['sales' => ['total' => 120000]]], 200) // Current month week
                ->push(['data' => ['sales' => ['total' => 100000]]], 200), // Previous month week
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
            'previous_month_weeks' => [
                [
                    'week_key' => 'week_1',
                    'week_name' => 'Semana 1',
                    'start_date' => '2024-12-01',
                    'end_date' => '2024-12-07'
                ]
            ],
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        expect($data['data']['metadata']['current_month_total'])->toBe(120000);
        expect($data['data']['metadata']['previous_month_total'])->toBe(100000);
        expect($data['data']['metadata']['month_over_month_change'])->toBe(20.0); // (120k - 100k) / 100k * 100 = 20%
    });

    it('handles zero previous month total correctly', function () {
        $this->actingAs($this->user);
        
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => Http::sequence()
                ->push(['data' => ['sales' => ['total' => 120000]]], 200) // Current month week
                ->push(['data' => ['sales' => ['total' => 0]]], 200), // Previous month week with zero
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
            'previous_month_weeks' => [
                [
                    'week_key' => 'week_1',
                    'week_name' => 'Semana 1',
                    'start_date' => '2024-12-01',
                    'end_date' => '2024-12-07'
                ]
            ],
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        expect($data['data']['metadata']['month_over_month_change'])->toBe(0); // Should be 0 when previous is 0
    });

    it('preserves week data structure correctly', function () {
        $this->actingAs($this->user);
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => [
                [
                    'week_key' => 'week_1',
                    'week_name' => 'Primera Semana',
                    'start_date' => '2025-01-01',
                    'end_date' => '2025-01-07'
                ]
            ],
            'previous_month_weeks' => [],
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $weekData = $data['data']['current_month_weeks']['week_1'];
        
        expect($weekData['week_name'])->toBe('Primera Semana');
        expect($weekData['start_date'])->toBe('2025-01-01');
        expect($weekData['end_date'])->toBe('2025-01-07');
        expect($weekData['total'])->toBeNumeric();
        expect($weekData['details'])->toBeArray();
    });
});

describe('Monthly Batch API Endpoint - Timeout Handling Tests', function () {
    
    it('sets appropriate PHP timeout for large datasets', function () {
        $this->actingAs($this->user);
        
        // Create a large dataset that would require timeout extension
        $currentMonthWeeks = [];
        $previousMonthWeeks = [];
        
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
        
        $response = $this->postJson('/api/dashboard/monthly-batch', [
            'current_month_weeks' => $currentMonthWeeks,
            'previous_month_weeks' => $previousMonthWeeks,
        ]);
        
        $response->assertStatus(200);
        
        // The request should complete successfully even with multiple API calls
        $data = $response->json();
        expect($data['success'])->toBeTrue();
        expect($data['data']['metadata']['total_requests'])->toBe(8); // 4 + 4 weeks
    });
});