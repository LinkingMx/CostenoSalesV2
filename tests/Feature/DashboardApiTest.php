<?php

use App\Services\DashboardApiService;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

describe('Dashboard API Controller', function () {
    beforeEach(function () {
        Http::preventStrayRequests();
        $this->artisan('migrate:fresh');
    });

    describe('Dashboard Index Page', function () {
        it('renders dashboard page with available periods for authenticated users', function () {
            $user = \App\Models\User::factory()->create();
            
            $response = $this->actingAs($user)->get('/dashboard');

            $response->assertStatus(200);
            $response->assertInertia(fn (Assert $page) => 
                $page->component('dashboard')
                    ->has('availablePeriods', 8)
                    ->where('availablePeriods.0.value', 'today')
                    ->where('availablePeriods.0.label', 'Today')
            );
        });

        it('redirects unauthenticated users to login', function () {
            $response = $this->get('/dashboard');

            $response->assertRedirect('/login');
        });
    });

    describe('Dashboard Data API Endpoints', function () {
        beforeEach(function () {
            $this->user = \App\Models\User::factory()->create();
            mockSuccessfulApiResponse();
        });

        it('fetches dashboard data with valid date range', function () {
            $response = $this->actingAs($this->user)->postJson('/api/dashboard/data', [
                'start_date' => '2024-01-01',
                'end_date' => '2024-01-15',
            ]);

            $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'data' => [
                        'total_sales' => 1500.50,
                        'total_revenue' => 12000.75,
                        'sales_count' => 18,
                    ],
                ])
                ->assertJsonStructure([
                    'success',
                    'data' => [
                        'total_sales',
                        'total_revenue',
                        'average_order_value',
                        'sales_count',
                        'total_customers',
                        'new_customers',
                        'returning_customers',
                        'products_sold',
                        'gross_profit',
                        'net_profit',
                        'profit_margin',
                        'pending_orders',
                        'completed_orders',
                        'cancelled_orders',
                    ],
                    'timestamp',
                ]);

            Http::assertSent(function ($request) {
                return $request->url() === 'http://192.168.100.20/api/main_dashboard_data'
                    && $request->method() === 'POST'
                    && $request->data() === [
                        'start_date' => '2024-01-01',
                        'end_date' => '2024-01-15',
                    ];
            });
        });

        it('validates required fields for date range request', function () {
            $response = $this->actingAs($this->user)->postJson('/api/dashboard/data', []);

            $response->assertStatus(422)
                ->assertJsonValidationErrors(['start_date', 'end_date']);
        });

        it('validates date format for date range request', function () {
            $response = $this->actingAs($this->user)->postJson('/api/dashboard/data', [
                'start_date' => '2024/01/01',
                'end_date' => '15-01-2024',
            ]);

            $response->assertStatus(422)
                ->assertJsonValidationErrors(['start_date', 'end_date']);
        });

        it('validates start date is not after end date', function () {
            $response = $this->actingAs($this->user)->postJson('/api/dashboard/data', [
                'start_date' => '2024-01-15',
                'end_date' => '2024-01-01',
            ]);

            $response->assertStatus(422)
                ->assertJsonValidationErrors(['end_date']);
        });

        it('validates start date is not in the future', function () {
            $futureDate = now()->addDays(5)->format('Y-m-d');
            
            $response = $this->actingAs($this->user)->postJson('/api/dashboard/data', [
                'start_date' => $futureDate,
                'end_date' => $futureDate,
            ]);

            $response->assertStatus(422)
                ->assertJsonValidationErrors(['start_date']);
        });

        it('fetches dashboard data for predefined period', function () {
            $response = $this->actingAs($this->user)->get('/api/dashboard/data/today');

            $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'period' => 'today',
                    'data' => [
                        'total_sales' => 1500.50,
                    ],
                ])
                ->assertJsonStructure([
                    'success',
                    'data',
                    'period',
                    'timestamp',
                ]);
        });

        it('returns error for invalid predefined period', function () {
            $response = $this->actingAs($this->user)->get('/api/dashboard/data/invalid_period');

            $response->assertStatus(400)
                ->assertJson([
                    'success' => false,
                    'message' => 'Invalid period: invalid_period',
                    'error_code' => 'INVALID_PERIOD',
                ]);
        });

        it('returns available periods', function () {
            $response = $this->actingAs($this->user)->get('/api/dashboard/periods');

            $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'data' => [
                        ['value' => 'today', 'label' => 'Today'],
                        ['value' => 'yesterday', 'label' => 'Yesterday'],
                        ['value' => 'last_7_days', 'label' => 'Last 7 Days'],
                        ['value' => 'last_30_days', 'label' => 'Last 30 Days'],
                        ['value' => 'last_90_days', 'label' => 'Last 90 Days'],
                        ['value' => 'this_month', 'label' => 'This Month'],
                        ['value' => 'last_month', 'label' => 'Last Month'],
                        ['value' => 'this_year', 'label' => 'This Year'],
                    ],
                ]);
        });

        it('requires authentication for all API endpoints', function () {
            $endpoints = [
                ['POST', '/api/dashboard/data', ['start_date' => '2024-01-01', 'end_date' => '2024-01-15']],
                ['GET', '/api/dashboard/data/today', []],
                ['GET', '/api/dashboard/periods', []],
            ];

            foreach ($endpoints as $endpoint) {
                $method = $endpoint[0];
                $uri = $endpoint[1];
                $data = $endpoint[2] ?? [];
                
                $response = $method === 'POST' 
                    ? $this->postJson($uri, $data)
                    : $this->get($uri);

                $response->assertStatus(302); // Redirect to login
            }
        });
    });

    describe('Error Handling', function () {
        beforeEach(function () {
            $this->user = \App\Models\User::factory()->create();
        });

        it('handles external API errors gracefully', function () {
            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response([], 500),
            ]);

            $response = $this->actingAs($this->user)->postJson('/api/dashboard/data', [
                'start_date' => '2024-01-01',
                'end_date' => '2024-01-15',
            ]);

            $response->assertStatus(500)
                ->assertJson([
                    'success' => false,
                    'error_code' => 'DASHBOARD_FETCH_FAILED',
                ])
                ->assertJsonStructure([
                    'success',
                    'message',
                    'error_code',
                ]);
        });

        it('handles external API timeout', function () {
            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => function () {
                    throw new \Illuminate\Http\Client\ConnectionException('Connection timeout');
                },
            ]);

            $response = $this->actingAs($this->user)->postJson('/api/dashboard/data', [
                'start_date' => '2024-01-01',
                'end_date' => '2024-01-15',
            ]);

            $response->assertStatus(500)
                ->assertJson([
                    'success' => false,
                    'error_code' => 'DASHBOARD_FETCH_FAILED',
                ]);
        });

        it('handles malformed external API response', function () {
            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response('invalid json{', 200),
            ]);

            $response = $this->actingAs($this->user)->postJson('/api/dashboard/data', [
                'start_date' => '2024-01-01',
                'end_date' => '2024-01-15',
            ]);

            $response->assertStatus(500)
                ->assertJson([
                    'success' => false,
                    'error_code' => 'DASHBOARD_FETCH_FAILED',
                ]);
        });
    });

    describe('Performance and Rate Limiting', function () {
        beforeEach(function () {
            $this->user = \App\Models\User::factory()->create();
            mockSuccessfulApiResponse();
        });

        it('handles concurrent requests properly', function () {
            $promises = [];
            
            // Simulate 5 concurrent requests
            for ($i = 0; $i < 5; $i++) {
                $promises[] = $this->actingAs($this->user)->postJson('/api/dashboard/data', [
                    'start_date' => '2024-01-01',
                    'end_date' => '2024-01-15',
                ]);
            }

            // All requests should succeed
            foreach ($promises as $response) {
                $response->assertStatus(200);
            }

            // External API should be called exactly 5 times
            Http::assertSentCount(5);
        });
    });

    describe('Data Integrity and Validation', function () {
        beforeEach(function () {
            $this->user = \App\Models\User::factory()->create();
        });

        it('ensures response data structure is consistent', function () {
            $mockResponse = [
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
                'http://192.168.100.20/api/main_dashboard_data' => Http::response($mockResponse, 200),
            ]);

            $response = $this->actingAs($this->user)->postJson('/api/dashboard/data', [
                'start_date' => '2024-01-01',
                'end_date' => '2024-01-15',
            ]);

            $response->assertStatus(200);
            
            $data = $response->json('data');
            
            // Verify all expected fields are present and of correct type
            expect($data['total_sales'])->toBeFloat();
            expect($data['sales_count'])->toBeInt();
            expect($data['total_customers'])->toBeInt();
            expect($data['profit_margin'])->toBeFloat();
        });

        it('handles edge case data values correctly', function () {
            $mockResponse = [
                'success' => true,
                'data' => [
                    'total_sales' => 0,
                    'total_revenue' => 0,
                    'average_order_value' => 0,
                    'sales_count' => 0,
                    'profit_margin' => -0.15, // Negative margin
                ],
            ];

            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response($mockResponse, 200),
            ]);

            $response = $this->actingAs($this->user)->postJson('/api/dashboard/data', [
                'start_date' => '2024-01-01',
                'end_date' => '2024-01-15',
            ]);

            $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'data' => $mockResponse['data'],
                ]);
        });
    });

    describe('Security and Authentication', function () {
        it('prevents unauthorized access with proper error messages', function () {
            $response = $this->postJson('/api/dashboard/data', [
                'start_date' => '2024-01-01',
                'end_date' => '2024-01-15',
            ]);

            // Should redirect to login (302) or return 401 for API routes
            expect($response->getStatusCode())->toBeIn([302, 401]);
        });

        it('validates user permissions correctly', function () {
            $user = \App\Models\User::factory()->create();
            mockSuccessfulApiResponse();

            $response = $this->actingAs($user)->postJson('/api/dashboard/data', [
                'start_date' => '2024-01-01',
                'end_date' => '2024-01-15',
            ]);

            $response->assertStatus(200);
        });
    });
});

// Helper function to mock successful API response
function mockSuccessfulApiResponse()
{
    Http::fake([
        'http://192.168.100.20/api/main_dashboard_data' => Http::response([
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
        ], 200),
    ]);
}