<?php

use App\Services\ExternalApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;

uses(RefreshDatabase::class);

describe('ChartController API Endpoints', function () {
    beforeEach(function () {
        // Create an authenticated user for testing
        $this->user = \App\Models\User::factory()->create([
            'email_verified_at' => now(),
        ]);
        
        $this->actingAs($this->user);
    });

    describe('Hours Chart Endpoint', function () {
        it('returns successful response with valid date', function () {
            // Mock the external API service
            $mockData = [
                'success' => true,
                'data' => [
                    ['hour' => '00:00', 'current' => 123, 'previous' => 98, 'timestamp' => '2025-01-15 00:00:00'],
                    ['hour' => '01:00', 'current' => 145, 'previous' => 112, 'timestamp' => '2025-01-15 01:00:00'],
                ],
                'currentDate' => '2025-01-15',
                'previousDate' => '2025-01-08'
            ];
            
            $this->mock(ExternalApiService::class, function ($mock) use ($mockData) {
                $mock->shouldReceive('getHoursChart')
                     ->with('2025-01-15')
                     ->once()
                     ->andReturn($mockData);
            });

            $response = $this->postJson('/api/dashboard/get-hours-chart', [
                'date' => '2025-01-15'
            ]);

            $response->assertStatus(200)
                    ->assertJson([
                        'success' => true,
                        'data' => $mockData['data'],
                        'currentDate' => '2025-01-15',
                        'previousDate' => '2025-01-08'
                    ]);
        });

        it('validates date format correctly', function () {
            $response = $this->postJson('/api/dashboard/get-hours-chart', [
                'date' => 'invalid-date'
            ]);

            $response->assertStatus(422)
                    ->assertJsonValidationErrors(['date']);
        });

        it('rejects future dates', function () {
            $futureDate = now()->addDays(1)->format('Y-m-d');
            
            $response = $this->postJson('/api/dashboard/get-hours-chart', [
                'date' => $futureDate
            ]);

            $response->assertStatus(422)
                    ->assertJsonValidationErrors(['date']);
        });

        it('rejects dates before 2020', function () {
            $response = $this->postJson('/api/dashboard/get-hours-chart', [
                'date' => '2019-12-31'
            ]);

            $response->assertStatus(422)
                    ->assertJsonValidationErrors(['date']);
        });

        it('requires authentication', function () {
            auth()->logout();
            
            $response = $this->postJson('/api/dashboard/get-hours-chart', [
                'date' => '2025-01-15'
            ]);

            $response->assertStatus(401);
        });

        it('requires email verification', function () {
            // Create user without email verification
            $unverifiedUser = \App\Models\User::factory()->create([
                'email_verified_at' => null,
            ]);
            
            $this->actingAs($unverifiedUser);

            $response = $this->postJson('/api/dashboard/get-hours-chart', [
                'date' => '2025-01-15'
            ]);

            // Should redirect to email verification or return 409
            expect($response->status())->toBeIn([302, 409]);
        });

        it('handles external API service errors gracefully', function () {
            Log::fake();
            
            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getHoursChart')
                     ->with('2025-01-15')
                     ->once()
                     ->andThrow(new \Exception('External API error'));
            });

            $response = $this->postJson('/api/dashboard/get-hours-chart', [
                'date' => '2025-01-15'
            ]);

            $response->assertStatus(500)
                    ->assertJson([
                        'success' => false,
                        'message' => 'Error al obtener los datos de la gráfica',
                    ]);

            // Verify error logging
            Log::assertLogged('error', function ($message, $context) {
                return str_contains($message, 'Error fetching hours chart data')
                    && $context['date'] === '2025-01-15'
                    && $context['error'] === 'External API error';
            });
        });

        it('returns debug error message when debug mode is enabled', function () {
            config(['app.debug' => true]);
            
            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getHoursChart')
                     ->once()
                     ->andThrow(new \Exception('Detailed error message'));
            });

            $response = $this->postJson('/api/dashboard/get-hours-chart', [
                'date' => '2025-01-15'
            ]);

            $response->assertStatus(500)
                    ->assertJson([
                        'success' => false,
                        'error' => 'Detailed error message',
                    ]);
        });

        it('hides error details when debug mode is disabled', function () {
            config(['app.debug' => false]);
            
            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getHoursChart')
                     ->once()
                     ->andThrow(new \Exception('Detailed error message'));
            });

            $response = $this->postJson('/api/dashboard/get-hours-chart', [
                'date' => '2025-01-15'
            ]);

            $response->assertStatus(500)
                    ->assertJson([
                        'success' => false,
                        'error' => 'Error interno del servidor',
                    ]);
        });

        it('handles empty external API response', function () {
            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getHoursChart')
                     ->with('2025-01-15')
                     ->once()
                     ->andReturn([
                        'success' => true,
                        'data' => [],
                        'currentDate' => '2025-01-15',
                        'previousDate' => '2025-01-08'
                     ]);
            });

            $response = $this->postJson('/api/dashboard/get-hours-chart', [
                'date' => '2025-01-15'
            ]);

            $response->assertStatus(200)
                    ->assertJson([
                        'success' => true,
                        'data' => [],
                    ]);
        });
    });

    describe('Main Dashboard Data Endpoint', function () {
        it('returns successful response with valid date range', function () {
            $mockData = [
                'success' => true,
                'data' => [
                    'total_sales' => 15000,
                    'total_orders' => 150,
                    'avg_order_value' => 100,
                    'growth_percentage' => 15.5
                ]
            ];

            $this->mock(ExternalApiService::class, function ($mock) use ($mockData) {
                $mock->shouldReceive('getMainDashboardData')
                     ->with('2025-01-01', '2025-01-31')
                     ->once()
                     ->andReturn($mockData);
            });

            $response = $this->getJson('/api/dashboard/main?' . http_build_query([
                'start_date' => '2025-01-01',
                'end_date' => '2025-01-31'
            ]));

            $response->assertStatus(200)
                    ->assertJson($mockData);
        });

        it('handles missing date parameters', function () {
            $mockData = ['success' => true, 'data' => []];

            $this->mock(ExternalApiService::class, function ($mock) use ($mockData) {
                $mock->shouldReceive('getMainDashboardData')
                     ->with(null, null)
                     ->once()
                     ->andReturn($mockData);
            });

            $response = $this->getJson('/api/dashboard/main');

            $response->assertStatus(200)
                    ->assertJson($mockData);
        });

        it('handles external API service errors gracefully', function () {
            Log::fake();

            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getMainDashboardData')
                     ->once()
                     ->andThrow(new \Exception('API connection failed'));
            });

            $response = $this->getJson('/api/dashboard/main');

            $response->assertStatus(500)
                    ->assertJson([
                        'success' => false,
                        'message' => 'Error al obtener los datos del dashboard',
                    ]);

            Log::assertLogged('error', function ($message, $context) {
                return str_contains($message, 'Error fetching main dashboard data')
                    && $context['error'] === 'API connection failed';
            });
        });

        it('requires authentication', function () {
            auth()->logout();

            $response = $this->getJson('/api/dashboard/main');

            $response->assertStatus(401);
        });

        it('requires email verification', function () {
            $unverifiedUser = \App\Models\User::factory()->create([
                'email_verified_at' => null,
            ]);

            $this->actingAs($unverifiedUser);

            $response = $this->getJson('/api/dashboard/main');

            expect($response->status())->toBeIn([302, 409]);
        });
    });

    describe('Response Structure Validation', function () {
        it('validates hours chart response structure', function () {
            $mockData = [
                'success' => true,
                'data' => [
                    ['hour' => '00:00', 'current' => 123, 'previous' => 98, 'timestamp' => '2025-01-15 00:00:00'],
                    ['hour' => '01:00', 'current' => 145, 'previous' => 112, 'timestamp' => '2025-01-15 01:00:00'],
                ],
                'currentDate' => '2025-01-15',
                'previousDate' => '2025-01-08'
            ];

            $this->mock(ExternalApiService::class, function ($mock) use ($mockData) {
                $mock->shouldReceive('getHoursChart')->once()->andReturn($mockData);
            });

            $response = $this->postJson('/api/dashboard/get-hours-chart', ['date' => '2025-01-15']);
            $data = $response->json();

            expect($data)->toHaveKeys(['success', 'data', 'currentDate', 'previousDate']);
            expect($data['success'])->toBe(true);
            expect($data['data'])->toBeArray();
            
            if (!empty($data['data'])) {
                expect($data['data'][0])->toHaveKeys(['hour', 'current', 'previous', 'timestamp']);
                expect($data['data'][0]['hour'])->toMatch('/^\d{2}:\d{2}$/');
                expect($data['data'][0]['current'])->toBeInt();
                expect($data['data'][0]['previous'])->toBeInt();
            }
        });

        it('validates error response structure', function () {
            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getHoursChart')
                     ->once()
                     ->andThrow(new \Exception('Test error'));
            });

            $response = $this->postJson('/api/dashboard/get-hours-chart', ['date' => '2025-01-15']);
            $data = $response->json();

            expect($data)->toHaveKeys(['success', 'message']);
            expect($data['success'])->toBe(false);
            expect($data['message'])->toBeString();
        });
    });
});