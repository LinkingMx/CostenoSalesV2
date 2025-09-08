<?php

use App\Services\DashboardApiService;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;

describe('Dashboard API Basic Functionality', function () {
    beforeEach(function () {
        $this->artisan('migrate:fresh');
        $this->user = \App\Models\User::factory()->create();
    });

    describe('Dashboard Page Access', function () {
        it('shows dashboard page to authenticated users', function () {
            $response = $this->actingAs($this->user)->get('/dashboard');
            $response->assertStatus(200);
        });

        it('redirects unauthenticated users', function () {
            $response = $this->get('/dashboard');
            $response->assertRedirect('/login');
        });
    });

    describe('API Data Fetching', function () {
        it('fetches dashboard data with valid request', function () {
            // Mock successful API response
            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response([
                    'success' => true,
                    'data' => [
                        'total_sales' => 1500.50,
                        'total_revenue' => 12000.75,
                        'sales_count' => 18,
                        'total_customers' => 150,
                    ],
                ], 200),
            ]);

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
                        'total_customers' => 150,
                    ],
                ]);
        });

        it('validates required date fields', function () {
            $response = $this->actingAs($this->user)->postJson('/api/dashboard/data', []);

            $response->assertStatus(422)
                ->assertJsonValidationErrors(['start_date', 'end_date']);
        });

        it('fetches data for predefined periods', function () {
            // Set a fixed date for testing
            Carbon::setTestNow(Carbon::create(2024, 1, 15));
            
            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response([
                    'success' => true,
                    'data' => ['total_sales' => 2500.00],
                ], 200),
            ]);

            $response = $this->actingAs($this->user)->get('/api/dashboard/data/today');

            $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'period' => 'today',
                    'data' => ['total_sales' => 2500.00],
                ]);
                
            Carbon::setTestNow(); // Reset
        });
    });

    describe('Service Class Functionality', function () {
        beforeEach(function () {
            $this->service = new DashboardApiService();
            Carbon::setTestNow(Carbon::create(2024, 1, 15));
        });

        afterEach(function () {
            Carbon::setTestNow();
        });

        it('creates correct date ranges for periods', function () {
            $periods = [
                'today' => ['2024-01-15', '2024-01-15'],
                'yesterday' => ['2024-01-14', '2024-01-14'],
                'last_7_days' => ['2024-01-08', '2024-01-15'],
                'last_30_days' => ['2023-12-16', '2024-01-15'],
                'this_month' => ['2024-01-01', '2024-01-15'],
            ];

            foreach ($periods as $period => [$expectedStart, $expectedEnd]) {
                $range = $this->service->createDateRange($period);
                expect($range)->toBe([
                    'start_date' => $expectedStart,
                    'end_date' => $expectedEnd,
                ], "Failed for period: {$period}");
            }
        });

        it('validates date formats correctly', function () {
            // Valid dates should not throw
            try {
                $this->service->validateDateRange('2024-01-01', '2024-01-15');
                expect(true)->toBe(true); // If no exception, test passes
            } catch (Exception $e) {
                expect(false)->toBe(true, 'Should not throw exception for valid dates');
            }

            // Invalid format should throw
            expect(fn() => $this->service->validateDateRange('2024/01/01', '2024-01-15'))
                ->toThrow(Exception::class);

            // Future dates should throw
            expect(fn() => $this->service->validateDateRange('2024-01-16', '2024-01-16'))
                ->toThrow(Exception::class);
        });

        it('handles API requests with proper retry logic', function () {
            // Test successful request
            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response([
                    'success' => true,
                    'data' => ['total_sales' => 1000.00],
                ], 200),
            ]);

            $data = $this->service->getDashboardData('2024-01-01', '2024-01-15');
            expect($data['total_sales'])->toBe(1000);
            Http::assertSentCount(1);
        });

        it('retries on server errors', function () {
            // Test retry on server error
            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::sequence()
                    ->push([], 500) // First attempt fails
                    ->push(['success' => true, 'data' => ['total_sales' => 300]], 200), // Second succeeds
            ]);

            $data = $this->service->getDashboardData('2024-01-01', '2024-01-15');
            expect($data['total_sales'])->toBe(300);
            Http::assertSentCount(2);
        });

        it('does not retry on client errors', function () {
            // Test no retry on client error
            Http::fake([
                'http://192.168.100.20/api/main_dashboard_data' => Http::response([], 400),
            ]);

            expect(fn() => $this->service->getDashboardData('2024-01-01', '2024-01-15'))
                ->toThrow(Exception::class);
            Http::assertSentCount(1);
        });
    });

    describe('Error Handling', function () {
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
                ]);
        });
    });
});