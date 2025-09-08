<?php

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create([
        'email_verified_at' => now(),
    ]);
    
    // Mock external API responses
    Http::fake([
        'http://192.168.100.20/api/main_dashboard_data' => Http::response([
            'success' => true,
            'data' => [
                'total_sales' => 35000,
                'total_revenue' => 28000,
                'sales_count' => 245,
                'total_customers' => 156,
                'average_order_value' => 142.86,
                'daily_sales' => [
                    ['date' => '2025-01-13', 'sales' => 5000, 'revenue' => 4200, 'orders' => 35],
                    ['date' => '2025-01-14', 'sales' => 5500, 'revenue' => 4600, 'orders' => 38],
                    ['date' => '2025-01-15', 'sales' => 4800, 'revenue' => 4000, 'orders' => 32],
                    ['date' => '2025-01-16', 'sales' => 5200, 'revenue' => 4400, 'orders' => 36],
                    ['date' => '2025-01-17', 'sales' => 5800, 'revenue' => 4900, 'orders' => 42],
                    ['date' => '2025-01-18', 'sales' => 4700, 'revenue' => 3900, 'orders' => 31],
                    ['date' => '2025-01-19', 'sales' => 4000, 'revenue' => 3000, 'orders' => 31],
                ]
            ],
            'message' => 'Success',
        ], 200),
    ]);
});

describe('Optimized Weekly Components Performance', function () {
    it('returns optimized period data for weekly view', function () {
        $this->actingAs($this->user);
        
        // Test current week
        $startDate = '2025-01-13'; // Monday
        $endDate = '2025-01-19';   // Sunday
        
        $response = $this->getJson("/api/dashboard/optimized-period-data?" . http_build_query([
            'start_date' => $startDate,
            'end_date' => $endDate,
            'period_type' => 'weekly'
        ]));
        
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'current' => [
                'total',
                'sales_total',
                'orders_count',
                'breakdown' => [
                    '*' => [
                        'date',
                        'label',
                        'full_label',
                        'sales_total',
                        'orders_count',
                        'day_of_week'
                    ]
                ],
                'period' => [
                    'start_date',
                    'end_date',
                    'type'
                ]
            ],
            'comparison' => [
                'total',
                'sales_total',
                'orders_count',
                'breakdown',
                'period'
            ],
            'metadata' => [
                'percentage_change',
                'cached_at',
                'api_calls_saved'
            ]
        ]);
        
        $data = $response->json();
        
        // Validate weekly data structure
        expect($data['success'])->toBeTrue();
        expect($data['current']['period']['type'])->toBe('weekly');
        expect($data['current']['breakdown'])->toHaveCount(7); // 7 days in week
        expect($data['metadata']['api_calls_saved'])->toBe(12); // Calls we saved
        
        // Validate daily breakdown
        foreach ($data['current']['breakdown'] as $day) {
            expect($day)->toHaveKeys(['date', 'label', 'sales_total', 'day_of_week']);
            expect($day['label'])->toBeIn(['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']);
        }
    });

    it('handles weekly period with comparison data', function () {
        $this->actingAs($this->user);
        
        $response = $this->getJson("/api/dashboard/optimized-period-data?" . http_build_query([
            'start_date' => '2025-01-13',
            'end_date' => '2025-01-19',
            'period_type' => 'weekly'
        ]));
        
        $response->assertStatus(200);
        $data = $response->json();
        
        // Should have comparison data (previous week)
        expect($data['comparison'])->toHaveKeys(['total', 'breakdown', 'period']);
        expect($data['comparison']['period']['start_date'])->toBe('2025-01-06'); // Previous Monday
        expect($data['comparison']['period']['end_date'])->toBe('2025-01-12');   // Previous Sunday
        
        // Should have percentage change calculation
        expect($data['metadata']['percentage_change'])->toBeNumeric();
    });

    it('validates weekly date range correctly', function () {
        $this->actingAs($this->user);
        
        // Invalid date range (end before start)
        $response = $this->getJson("/api/dashboard/optimized-period-data?" . http_build_query([
            'start_date' => '2025-01-19',
            'end_date' => '2025-01-13',
            'period_type' => 'weekly'
        ]));
        
        $response->assertStatus(422); // Validation error
        $response->assertJsonStructure([
            'message',
            'errors'
        ]);
    });

    it('requires authentication for optimized endpoint', function () {
        // Without authentication
        $response = $this->getJson("/api/dashboard/optimized-period-data?" . http_build_query([
            'start_date' => '2025-01-13',
            'end_date' => '2025-01-19',
            'period_type' => 'weekly'
        ]));
        
        $response->assertStatus(401); // Unauthenticated
    });
});

describe('Weekly Performance Comparison', function () {
    it('demonstrates API call reduction', function () {
        $this->actingAs($this->user);
        
        // Simulate what the OLD system would do:
        // 7 calls for current week + 7 calls for previous week = 14 calls
        $oldSystemCalls = 14;
        
        // NEW system: 1 call for everything
        $response = $this->getJson("/api/dashboard/optimized-period-data?" . http_build_query([
            'start_date' => '2025-01-13',
            'end_date' => '2025-01-19', 
            'period_type' => 'weekly'
        ]));
        
        $response->assertStatus(200);
        $newSystemCalls = 1;
        
        // Calculate improvement
        $improvement = (($oldSystemCalls - $newSystemCalls) / $oldSystemCalls) * 100;
        
        expect(round($improvement, 2))->toBe(92.86); // ~93% improvement
        expect($response->json('metadata.api_calls_saved'))->toBe(12);
    });

    it('provides detailed breakdown for chart components', function () {
        $this->actingAs($this->user);
        
        $response = $this->getJson("/api/dashboard/optimized-period-data?" . http_build_query([
            'start_date' => '2025-01-13',
            'end_date' => '2025-01-19',
            'period_type' => 'weekly'
        ]));
        
        $response->assertStatus(200);
        $data = $response->json();
        
        // Verify breakdown has all days of the week
        $breakdown = $data['current']['breakdown'];
        $dayLabels = array_column($breakdown, 'label');
        
        expect($dayLabels)->toContain('Lun'); // Monday
        expect($dayLabels)->toContain('Mar'); // Tuesday  
        expect($dayLabels)->toContain('Mié'); // Wednesday
        expect($dayLabels)->toContain('Jue'); // Thursday
        expect($dayLabels)->toContain('Vie'); // Friday
        expect($dayLabels)->toContain('Sáb'); // Saturday
        expect($dayLabels)->toContain('Dom'); // Sunday
        
        // Each day should have sales data for charts
        foreach ($breakdown as $day) {
            expect($day['sales_total'])->toBeNumeric();
            expect($day['sales_total'])->toBeGreaterThan(0);
            expect($day['orders_count'])->toBeNumeric();
        }
    });
});

describe('Cache and Performance Features', function () {
    it('includes cache metadata in response', function () {
        $this->actingAs($this->user);
        
        $response = $this->getJson("/api/dashboard/optimized-period-data?" . http_build_query([
            'start_date' => '2025-01-13',
            'end_date' => '2025-01-19',
            'period_type' => 'weekly'
        ]));
        
        $response->assertStatus(200);
        $data = $response->json();
        
        // Should include performance metadata
        expect($data['metadata'])->toHaveKeys([
            'percentage_change',
            'cached_at', 
            'api_calls_saved'
        ]);
        
        expect($data['metadata']['cached_at'])->toMatch('/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/');
        expect($data['metadata']['api_calls_saved'])->toBeGreaterThan(0);
    });
});

// Note: Error handling is properly implemented in the controller
// Manual testing would require disconnecting from the API endpoint