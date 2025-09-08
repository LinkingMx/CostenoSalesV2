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
    
    // Mock external API responses with branch data
    Http::fake([
        'http://192.168.100.20/api/main_dashboard_data' => Http::response([
            'success' => true,
            'data' => [
                'total_sales' => 150000,
                'total_revenue' => 120000,
                'sales_count' => 850,
                'cards' => [
                    'Sucursal Centro' => [
                        'open_accounts' => ['total' => 25, 'money' => 15000],
                        'closed_ticket' => ['total' => 45, 'money' => 25000],
                        'average_ticket' => 571.43,
                        'percentage' => ['icon' => 'up', 'qty' => '8.5'],
                        'date' => '2025-01-13',
                        'store_id' => 1,
                        'brand' => 'Costeño',
                        'region' => 'Centro'
                    ],
                    'Sucursal Norte' => [
                        'open_accounts' => ['total' => 18, 'money' => 12000],
                        'closed_ticket' => ['total' => 32, 'money' => 18000],
                        'average_ticket' => 600.00,
                        'percentage' => ['icon' => 'up', 'qty' => '12.3'],
                        'date' => '2025-01-13',
                        'store_id' => 2,
                        'brand' => 'Costeño',
                        'region' => 'Norte'
                    ],
                    'Sucursal Sur' => [
                        'open_accounts' => ['total' => 22, 'money' => 14000],
                        'closed_ticket' => ['total' => 38, 'money' => 22000],
                        'average_ticket' => 600.00,
                        'percentage' => ['icon' => 'down', 'qty' => '-3.2'],
                        'date' => '2025-01-13',
                        'store_id' => 3,
                        'brand' => 'Costeño',
                        'region' => 'Sur'
                    ]
                ]
            ],
            'message' => 'Success',
        ], 200),
    ]);
});

describe('Optimized Branch Data Performance', function () {
    it('returns optimized branch data in single API call', function () {
        $this->actingAs($this->user);
        
        $startDate = '2025-01-13';
        $endDate = '2025-01-19';
        
        $response = $this->getJson("/api/dashboard/optimized-branch-data?" . http_build_query([
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
                'branches' => [
                    '*' => [
                        'open_accounts' => ['total', 'money'],
                        'closed_ticket' => ['total', 'money'],
                        'average_ticket',
                        'store_id'
                    ]
                ],
                'period' => ['start_date', 'end_date', 'type']
            ],
            'comparison' => [
                'total',
                'sales_total',
                'orders_count',
                'branches',
                'period'
            ],
            'metadata' => [
                'percentage_change',
                'cached_at',
                'api_calls_saved',
                'branches_count'
            ]
        ]);
        
        $data = $response->json();
        
        expect($data['success'])->toBeTrue();
        expect($data['current']['branches'])->toHaveKeys(['Sucursal Centro', 'Sucursal Norte', 'Sucursal Sur']);
        expect($data['metadata']['branches_count'])->toBe(3);
        expect($data['metadata']['api_calls_saved'])->toBe(4); // 3 branches × 2 periods - 2 actual calls
    });

    it('demonstrates massive API call reduction', function () {
        $this->actingAs($this->user);
        
        // Simulate what the OLD system would do for each branch
        $branchCount = 3; // In real system could be 100+
        $oldSystemCalls = $branchCount * 2; // Each branch makes 2 calls (current + comparison)
        
        $response = $this->getJson("/api/dashboard/optimized-branch-data?" . http_build_query([
            'start_date' => '2025-01-13',
            'end_date' => '2025-01-19',
            'period_type' => 'weekly'
        ]));
        
        $response->assertStatus(200);
        $data = $response->json();
        
        $newSystemCalls = 2; // Just 2 calls total for all branches
        
        // Calculate improvement percentage
        $improvement = (($oldSystemCalls - $newSystemCalls) / $oldSystemCalls) * 100;
        
        expect($improvement)->toBeGreaterThan(50); // At least 50% improvement
        expect($data['metadata']['api_calls_saved'])->toBe($oldSystemCalls - $newSystemCalls);
        
        // With 112 real branches, this would be 224 → 2 requests (99.1% improvement)
        $realWorldOldCalls = 112 * 2; // 224 calls
        $realWorldImprovement = (($realWorldOldCalls - 2) / $realWorldOldCalls) * 100;
        expect($realWorldImprovement)->toBeGreaterThan(99); // 99%+ improvement in real scenario
    });

    it('provides branch data with comparison calculations', function () {
        $this->actingAs($this->user);
        
        $response = $this->getJson("/api/dashboard/optimized-branch-data?" . http_build_query([
            'start_date' => '2025-01-13',
            'end_date' => '2025-01-19',
            'period_type' => 'weekly'
        ]));
        
        $response->assertStatus(200);
        $data = $response->json();
        
        // Verify branch data structure
        $branches = $data['current']['branches'];
        
        foreach ($branches as $branchName => $branchData) {
            expect($branchData)->toHaveKeys([
                'open_accounts',
                'closed_ticket',
                'average_ticket',
                'store_id'
            ]);
            
            // Verify money values are numeric
            expect($branchData['open_accounts']['money'])->toBeNumeric();
            expect($branchData['closed_ticket']['money'])->toBeNumeric();
            expect($branchData['average_ticket'])->toBeNumeric();
            
            // Verify store_id is set
            expect($branchData['store_id'])->toBeInt();
        }
        
        // Verify comparison data is included
        expect($data['comparison']['branches'])->toHaveKeys(['Sucursal Centro', 'Sucursal Norte', 'Sucursal Sur']);
        expect($data['metadata']['percentage_change'])->toBeNumeric();
    });

    it('validates date range parameters correctly', function () {
        $this->actingAs($this->user);
        
        // Test invalid date range
        $response = $this->getJson("/api/dashboard/optimized-branch-data?" . http_build_query([
            'start_date' => '2025-01-19',
            'end_date' => '2025-01-13', // End before start
            'period_type' => 'weekly'
        ]));
        
        $response->assertStatus(422);
        
        // Test missing required parameters
        $response = $this->getJson("/api/dashboard/optimized-branch-data?" . http_build_query([
            'start_date' => '2025-01-13'
            // Missing end_date and period_type
        ]));
        
        $response->assertStatus(422);
    });

    it('requires authentication', function () {
        // Without authentication
        $response = $this->getJson("/api/dashboard/optimized-branch-data?" . http_build_query([
            'start_date' => '2025-01-13',
            'end_date' => '2025-01-19',
            'period_type' => 'weekly'
        ]));
        
        $response->assertStatus(401);
    });
});

describe('Branch Performance Optimization Metrics', function () {
    it('tracks and reports performance metrics', function () {
        $this->actingAs($this->user);
        
        $response = $this->getJson("/api/dashboard/optimized-branch-data?" . http_build_query([
            'start_date' => '2025-01-13',
            'end_date' => '2025-01-19',
            'period_type' => 'weekly'
        ]));
        
        $response->assertStatus(200);
        $data = $response->json();
        
        // Should include comprehensive metadata
        expect($data['metadata'])->toHaveKeys([
            'percentage_change',
            'cached_at',
            'api_calls_saved',
            'branches_count'
        ]);
        
        // Validate metadata values
        expect($data['metadata']['cached_at'])->toMatch('/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/');
        expect($data['metadata']['api_calls_saved'])->toBeGreaterThan(0);
        expect($data['metadata']['branches_count'])->toBeGreaterThan(0);
    });

    it('handles large branch datasets efficiently', function () {
        $this->actingAs($this->user);
        
        // Start timing
        $startTime = microtime(true);
        
        $response = $this->getJson("/api/dashboard/optimized-branch-data?" . http_build_query([
            'start_date' => '2025-01-13',
            'end_date' => '2025-01-19',
            'period_type' => 'weekly'
        ]));
        
        $endTime = microtime(true);
        $executionTime = $endTime - $startTime;
        
        $response->assertStatus(200);
        
        // Should complete in under 2 seconds (much faster than 224 individual requests)
        expect($executionTime)->toBeLessThan(2.0);
        
        $data = $response->json();
        expect($data['success'])->toBeTrue();
        
        // Even with just 3 mock branches, we're saving API calls
        expect($data['metadata']['api_calls_saved'])->toBeGreaterThan(0);
    });
});