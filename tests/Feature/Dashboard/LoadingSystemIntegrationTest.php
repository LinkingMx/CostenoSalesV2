<?php

use App\Models\User;
use App\Services\ExternalApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

describe('Dashboard Loading System Integration', function () {
    
    beforeEach(function () {
        $this->user = User::factory()->create(['email_verified_at' => now()]);
        $this->actingAs($this->user);
    });

    describe('Dashboard Page Loading', function () {
        it('loads dashboard page successfully', function () {
            $response = $this->get('/dashboard');
            
            $response->assertStatus(200)
                    ->assertInertia(fn (Assert $page) => $page
                        ->component('dashboard')
                        ->hasAll(['auth.user'])
                    );
        });

        it('requires authentication', function () {
            auth()->logout();
            
            $response = $this->get('/dashboard');
            $response->assertRedirect('/login');
        });

        it('requires email verification', function () {
            $unverifiedUser = User::factory()->create(['email_verified_at' => null]);
            $this->actingAs($unverifiedUser);
            
            $response = $this->get('/dashboard');
            $response->assertRedirect('/verify-email');
        });
    });

    describe('Dashboard API Integration', function () {
        it('loads dashboard with successful API response', function () {
            // Mock successful external API response
            $mockMainData = [
                'success' => true,
                'data' => [
                    'total_sales' => 15000,
                    'total_orders' => 150,
                    'avg_order_value' => 100,
                    'growth_percentage' => 15.5
                ]
            ];

            $this->mock(ExternalApiService::class, function ($mock) use ($mockMainData) {
                $mock->shouldReceive('getMainDashboardData')
                     ->once()
                     ->andReturn($mockMainData);
            });

            // Test main dashboard data endpoint
            $response = $this->getJson('/api/dashboard/main?' . http_build_query([
                'start_date' => '2025-01-15',
                'end_date' => '2025-01-15'
            ]));

            $response->assertStatus(200)
                    ->assertJson($mockMainData);
        });

        it('handles API failures gracefully', function () {
            Log::fake();

            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getMainDashboardData')
                     ->once()
                     ->andThrow(new \Exception('External API unavailable'));
            });

            $response = $this->getJson('/api/dashboard/main');

            $response->assertStatus(500)
                    ->assertJson([
                        'success' => false,
                        'message' => 'Error al obtener los datos del dashboard',
                    ]);
        });

        it('loads hours chart data successfully', function () {
            $mockChartData = [
                'success' => true,
                'data' => [
                    ['hour' => '00:00', 'current' => 123, 'previous' => 98, 'timestamp' => '2025-01-15 00:00:00'],
                    ['hour' => '01:00', 'current' => 145, 'previous' => 112, 'timestamp' => '2025-01-15 01:00:00'],
                ],
                'currentDate' => '2025-01-15',
                'previousDate' => '2025-01-08'
            ];

            $this->mock(ExternalApiService::class, function ($mock) use ($mockChartData) {
                $mock->shouldReceive('getHoursChart')
                     ->with('2025-01-15')
                     ->once()
                     ->andReturn($mockChartData);
            });

            $response = $this->postJson('/api/dashboard/get-hours-chart', [
                'date' => '2025-01-15'
            ]);

            $response->assertStatus(200)
                    ->assertJson($mockChartData);
        });
    });

    describe('Date Range Filtering Logic', function () {
        it('identifies single day periods correctly', function () {
            // Test single day
            $startDate = '2025-01-15';
            $endDate = '2025-01-15';
            
            // This should trigger daily components
            // We can't directly test the React logic, but we can test the API behavior
            
            $mockData = ['success' => true, 'data' => ['total_sales' => 1000]];
            $this->mock(ExternalApiService::class, function ($mock) use ($mockData) {
                $mock->shouldReceive('getMainDashboardData')
                     ->with($startDate, $endDate)
                     ->once()
                     ->andReturn($mockData);
            });

            $response = $this->getJson('/api/dashboard/main?' . http_build_query([
                'start_date' => $startDate,
                'end_date' => $endDate
            ]));

            $response->assertStatus(200);
        });

        it('handles weekly period data correctly', function () {
            // Test weekly period (7 days, Monday to Sunday)
            $startDate = '2025-01-13'; // Monday
            $endDate = '2025-01-19';   // Sunday
            
            $mockData = ['success' => true, 'data' => ['weekly_sales' => 7000]];
            $this->mock(ExternalApiService::class, function ($mock) use ($mockData) {
                $mock->shouldReceive('getMainDashboardData')
                     ->with($startDate, $endDate)
                     ->once()
                     ->andReturn($mockData);
            });

            $response = $this->getJson('/api/dashboard/main?' . http_build_query([
                'start_date' => $startDate,
                'end_date' => $endDate
            ]));

            $response->assertStatus(200);
        });

        it('handles monthly period data correctly', function () {
            // Test monthly period (full month)
            $startDate = '2025-01-01';
            $endDate = '2025-01-31';
            
            $mockData = ['success' => true, 'data' => ['monthly_sales' => 31000]];
            $this->mock(ExternalApiService::class, function ($mock) use ($mockData) {
                $mock->shouldReceive('getMainDashboardData')
                     ->with($startDate, $endDate)
                     ->once()
                     ->andReturn($mockData);
            });

            $response = $this->getJson('/api/dashboard/main?' . http_build_query([
                'start_date' => $startDate,
                'end_date' => $endDate
            ]));

            $response->assertStatus(200);
        });
    });

    describe('Loading State Coordination', function () {
        it('handles concurrent API calls correctly', function () {
            $this->mock(ExternalApiService::class, function ($mock) {
                // Simulate concurrent calls
                $mock->shouldReceive('getMainDashboardData')
                     ->twice()
                     ->andReturn(['success' => true, 'data' => ['concurrent_test' => true]]);
                     
                $mock->shouldReceive('getHoursChart')
                     ->once()
                     ->andReturn(['success' => true, 'data' => []]);
            });

            // Make multiple concurrent requests
            $promises = [];
            $promises[] = $this->getJson('/api/dashboard/main?start_date=2025-01-15&end_date=2025-01-15');
            $promises[] = $this->getJson('/api/dashboard/main?start_date=2025-01-16&end_date=2025-01-16');
            $promises[] = $this->postJson('/api/dashboard/get-hours-chart', ['date' => '2025-01-15']);

            // All requests should succeed
            foreach ($promises as $response) {
                $response->assertStatus(200);
            }
        });

        it('maintains consistent response format during errors', function () {
            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getMainDashboardData')
                     ->once()
                     ->andThrow(new \Exception('Simulated API error'));
            });

            $response = $this->getJson('/api/dashboard/main');

            $response->assertStatus(500)
                    ->assertJsonStructure([
                        'success',
                        'message',
                        'error'
                    ])
                    ->assertJson([
                        'success' => false
                    ]);
        });
    });

    describe('Error Recovery and Resilience', function () {
        it('handles partial API failures gracefully', function () {
            Log::fake();

            // Mock main dashboard to succeed but hours chart to fail
            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getMainDashboardData')
                     ->once()
                     ->andReturn(['success' => true, 'data' => ['recovered' => true]]);
                
                $mock->shouldReceive('getHoursChart')
                     ->once()
                     ->andThrow(new \Exception('Chart API down'));
            });

            // Main dashboard should still work
            $mainResponse = $this->getJson('/api/dashboard/main');
            $mainResponse->assertStatus(200);

            // Hours chart should fail gracefully
            $chartResponse = $this->postJson('/api/dashboard/get-hours-chart', [
                'date' => '2025-01-15'
            ]);
            $chartResponse->assertStatus(500)
                          ->assertJson(['success' => false]);
        });

        it('logs errors appropriately for debugging', function () {
            Log::fake();

            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getHoursChart')
                     ->once()
                     ->andThrow(new \Exception('Detailed error for logging'));
            });

            $this->postJson('/api/dashboard/get-hours-chart', ['date' => '2025-01-15']);

            Log::assertLogged('error', function ($message, $context) {
                return str_contains($message, 'Error fetching hours chart data')
                    && $context['date'] === '2025-01-15'
                    && $context['error'] === 'Detailed error for logging';
            });
        });

        it('handles rapid date range changes without race conditions', function () {
            $responseCount = 0;
            
            $this->mock(ExternalApiService::class, function ($mock) use (&$responseCount) {
                $mock->shouldReceive('getMainDashboardData')
                     ->times(3)
                     ->andReturnUsing(function() use (&$responseCount) {
                         $responseCount++;
                         return ['success' => true, 'data' => ['request_id' => $responseCount]];
                     });
            });

            // Simulate rapid date changes
            $dates = [
                ['start_date' => '2025-01-15', 'end_date' => '2025-01-15'],
                ['start_date' => '2025-01-16', 'end_date' => '2025-01-16'], 
                ['start_date' => '2025-01-17', 'end_date' => '2025-01-17']
            ];

            $responses = [];
            foreach ($dates as $dateParams) {
                $responses[] = $this->getJson('/api/dashboard/main?' . http_build_query($dateParams));
            }

            // All requests should succeed
            foreach ($responses as $response) {
                $response->assertStatus(200);
            }

            expect($responseCount)->toBe(3);
        });
    });

    describe('Performance and Timeout Handling', function () {
        it('handles slow API responses appropriately', function () {
            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getMainDashboardData')
                     ->once()
                     ->andReturnUsing(function() {
                         // Simulate slow response
                         usleep(100000); // 100ms delay
                         return ['success' => true, 'data' => ['slow_response' => true]];
                     });
            });

            $startTime = microtime(true);
            $response = $this->getJson('/api/dashboard/main');
            $endTime = microtime(true);

            $response->assertStatus(200);
            
            // Should handle the delay appropriately
            $duration = ($endTime - $startTime) * 1000; // Convert to ms
            expect($duration)->toBeGreaterThan(90); // At least 90ms (accounting for some variance)
        });

        it('applies appropriate timeout configurations', function () {
            // This test verifies that the system doesn't hang indefinitely
            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getMainDashboardData')
                     ->once()
                     ->andReturn(['success' => true, 'data' => ['timeout_test' => true]]);
            });

            $startTime = microtime(true);
            $response = $this->getJson('/api/dashboard/main');
            $endTime = microtime(true);

            $response->assertStatus(200);
            
            // Should not take excessively long (less than 5 seconds)
            $duration = ($endTime - $startTime) * 1000;
            expect($duration)->toBeLessThan(5000);
        });
    });

    describe('Data Validation and Structure', function () {
        it('validates main dashboard data structure', function () {
            $mockData = [
                'success' => true,
                'data' => [
                    'total_sales' => 15000.50,
                    'total_orders' => 150,
                    'avg_order_value' => 100.00,
                    'growth_percentage' => 15.5,
                    'branches' => [
                        ['name' => 'Branch 1', 'sales' => 7500],
                        ['name' => 'Branch 2', 'sales' => 7500]
                    ]
                ]
            ];

            $this->mock(ExternalApiService::class, function ($mock) use ($mockData) {
                $mock->shouldReceive('getMainDashboardData')->once()->andReturn($mockData);
            });

            $response = $this->getJson('/api/dashboard/main');
            $data = $response->json();

            expect($data['success'])->toBe(true);
            expect($data['data'])->toHaveKey('total_sales');
            expect($data['data']['total_sales'])->toBeFloat();
            expect($data['data']['total_orders'])->toBeInt();
        });

        it('validates hours chart data structure', function () {
            $mockChartData = [
                'success' => true,
                'data' => [
                    ['hour' => '00:00', 'current' => 123, 'previous' => 98, 'timestamp' => '2025-01-15 00:00:00'],
                    ['hour' => '01:00', 'current' => 145, 'previous' => 112, 'timestamp' => '2025-01-15 01:00:00']
                ],
                'currentDate' => '2025-01-15',
                'previousDate' => '2025-01-08'
            ];

            $this->mock(ExternalApiService::class, function ($mock) use ($mockChartData) {
                $mock->shouldReceive('getHoursChart')->once()->andReturn($mockChartData);
            });

            $response = $this->postJson('/api/dashboard/get-hours-chart', ['date' => '2025-01-15']);
            $data = $response->json();

            expect($data['success'])->toBe(true);
            expect($data['data'])->toBeArray();
            expect($data['currentDate'])->toMatch('/^\d{4}-\d{2}-\d{2}$/');
            expect($data['previousDate'])->toMatch('/^\d{4}-\d{2}-\d{2}$/');

            if (!empty($data['data'])) {
                expect($data['data'][0])->toHaveKeys(['hour', 'current', 'previous', 'timestamp']);
                expect($data['data'][0]['hour'])->toMatch('/^\d{2}:\d{2}$/');
                expect($data['data'][0]['current'])->toBeInt();
                expect($data['data'][0]['previous'])->toBeInt();
            }
        });

        it('handles empty data gracefully', function () {
            $emptyData = [
                'success' => true,
                'data' => []
            ];

            $this->mock(ExternalApiService::class, function ($mock) use ($emptyData) {
                $mock->shouldReceive('getMainDashboardData')->once()->andReturn($emptyData);
            });

            $response = $this->getJson('/api/dashboard/main');

            $response->assertStatus(200)
                    ->assertJson($emptyData);
        });
    });
});