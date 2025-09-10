<?php

use App\Models\User;
use App\Services\ExternalApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

uses(RefreshDatabase::class);

describe('Network Failures and Recovery Edge Cases', function () {
    
    beforeEach(function () {
        $this->user = User::factory()->create(['email_verified_at' => now()]);
        $this->actingAs($this->user);
    });

    describe('API Connection Failures', function () {
        it('handles complete network failure gracefully', function () {
            Log::fake();

            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getMainDashboardData')
                     ->once()
                     ->andThrow(new ConnectionException('Connection refused'));
            });

            $response = $this->getJson('/api/dashboard/main');

            $response->assertStatus(500)
                    ->assertJson([
                        'success' => false,
                        'message' => 'Error al obtener los datos del dashboard'
                    ]);

            Log::assertLogged('error', function ($message, $context) {
                return str_contains($message, 'Error fetching main dashboard data')
                    && $context['error'] === 'Connection refused';
            });
        });

        it('handles DNS resolution failures', function () {
            Log::fake();

            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getHoursChart')
                     ->with('2025-01-15')
                     ->once()
                     ->andThrow(new ConnectionException('Could not resolve host'));
            });

            $response = $this->postJson('/api/dashboard/get-hours-chart', [
                'date' => '2025-01-15'
            ]);

            $response->assertStatus(500)
                    ->assertJson([
                        'success' => false,
                        'message' => 'Error al obtener los datos de la gráfica'
                    ]);
        });

        it('handles timeout failures', function () {
            Log::fake();

            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getMainDashboardData')
                     ->once()
                     ->andThrow(new \Exception('Operation timed out'));
            });

            $response = $this->getJson('/api/dashboard/main');

            $response->assertStatus(500)
                    ->assertJson([
                        'success' => false
                    ]);
        });

        it('handles SSL/TLS certificate errors', function () {
            Log::fake();

            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getMainDashboardData')
                     ->once()
                     ->andThrow(new ConnectionException('SSL certificate problem'));
            });

            $response = $this->getJson('/api/dashboard/main');

            $response->assertStatus(500);
            
            Log::assertLogged('error', function ($message, $context) {
                return str_contains($context['error'], 'SSL certificate problem');
            });
        });
    });

    describe('HTTP Status Error Handling', function () {
        it('handles 401 unauthorized responses', function () {
            Log::fake();

            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getMainDashboardData')
                     ->once()
                     ->andThrow(new RequestException(
                         response: new \Illuminate\Http\Client\Response(
                             new \GuzzleHttp\Psr7\Response(401, [], '{"error": "Unauthorized"}')
                         )
                     ));
            });

            $response = $this->getJson('/api/dashboard/main');

            $response->assertStatus(500);
        });

        it('handles 403 forbidden responses', function () {
            Log::fake();

            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getHoursChart')
                     ->once()
                     ->andThrow(new RequestException(
                         response: new \Illuminate\Http\Client\Response(
                             new \GuzzleHttp\Psr7\Response(403, [], '{"error": "Forbidden"}')
                         )
                     ));
            });

            $response = $this->postJson('/api/dashboard/get-hours-chart', [
                'date' => '2025-01-15'
            ]);

            $response->assertStatus(500);
        });

        it('handles 404 not found responses', function () {
            Log::fake();

            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getMainDashboardData')
                     ->once()
                     ->andThrow(new RequestException(
                         response: new \Illuminate\Http\Client\Response(
                             new \GuzzleHttp\Psr7\Response(404, [], '{"error": "Not Found"}')
                         )
                     ));
            });

            $response = $this->getJson('/api/dashboard/main');

            $response->assertStatus(500);
        });

        it('handles 500 internal server errors from external API', function () {
            Log::fake();

            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getMainDashboardData')
                     ->once()
                     ->andThrow(new RequestException(
                         response: new \Illuminate\Http\Client\Response(
                             new \GuzzleHttp\Psr7\Response(500, [], '{"error": "Internal Server Error"}')
                         )
                     ));
            });

            $response = $this->getJson('/api/dashboard/main');

            $response->assertStatus(500);
        });

        it('handles 502 bad gateway responses', function () {
            Log::fake();

            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getHoursChart')
                     ->once()
                     ->andThrow(new RequestException(
                         response: new \Illuminate\Http\Client\Response(
                             new \GuzzleHttp\Psr7\Response(502, [], 'Bad Gateway')
                         )
                     ));
            });

            $response = $this->postJson('/api/dashboard/get-hours-chart', [
                'date' => '2025-01-15'
            ]);

            $response->assertStatus(500);
        });

        it('handles 503 service unavailable responses', function () {
            Log::fake();

            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getMainDashboardData')
                     ->once()
                     ->andThrow(new RequestException(
                         response: new \Illuminate\Http\Client\Response(
                             new \GuzzleHttp\Psr7\Response(503, [], 'Service Unavailable')
                         )
                     ));
            });

            $response = $this->getJson('/api/dashboard/main');

            $response->assertStatus(500);
        });
    });

    describe('Malformed Response Handling', function () {
        it('handles invalid JSON responses', function () {
            Log::fake();

            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getMainDashboardData')
                     ->once()
                     ->andThrow(new \Exception('Invalid JSON in response'));
            });

            $response = $this->getJson('/api/dashboard/main');

            $response->assertStatus(500);
        });

        it('handles empty responses', function () {
            Log::fake();

            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getMainDashboardData')
                     ->once()
                     ->andReturn(['success' => true, 'data' => null]);
            });

            $response = $this->getJson('/api/dashboard/main');

            $response->assertStatus(200)
                    ->assertJson(['success' => true, 'data' => null]);
        });

        it('handles responses with missing required fields', function () {
            Log::fake();

            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getHoursChart')
                     ->once()
                     ->andReturn(['success' => true]); // Missing 'data' field
            });

            $response = $this->postJson('/api/dashboard/get-hours-chart', [
                'date' => '2025-01-15'
            ]);

            // Should pass through the response as-is
            $response->assertStatus(200)
                    ->assertJson(['success' => true]);
        });

        it('handles responses with unexpected data types', function () {
            Log::fake();

            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getMainDashboardData')
                     ->once()
                     ->andReturn([
                         'success' => 'true', // String instead of boolean
                         'data' => 'invalid_data_format' // String instead of array
                     ]);
            });

            $response = $this->getJson('/api/dashboard/main');

            // Should handle gracefully
            $response->assertStatus(200);
        });
    });

    describe('Rapid Request Scenarios', function () {
        it('handles rapid sequential requests without race conditions', function () {
            $callCount = 0;
            
            $this->mock(ExternalApiService::class, function ($mock) use (&$callCount) {
                $mock->shouldReceive('getMainDashboardData')
                     ->times(5)
                     ->andReturnUsing(function() use (&$callCount) {
                         $callCount++;
                         return [
                             'success' => true, 
                             'data' => ['request_id' => $callCount]
                         ];
                     });
            });

            $responses = [];
            
            // Make 5 rapid sequential requests
            for ($i = 0; $i < 5; $i++) {
                $responses[] = $this->getJson("/api/dashboard/main?request={$i}");
            }

            // All should succeed
            foreach ($responses as $response) {
                $response->assertStatus(200);
            }

            expect($callCount)->toBe(5);
        });

        it('handles concurrent requests without blocking', function () {
            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getMainDashboardData')
                     ->times(3)
                     ->andReturn(['success' => true, 'data' => ['concurrent' => true]]);
                     
                $mock->shouldReceive('getHoursChart')
                     ->times(2)
                     ->andReturn(['success' => true, 'data' => []]);
            });

            // Simulate concurrent requests (in tests, these run sequentially but test the logic)
            $dashboardResponse1 = $this->getJson('/api/dashboard/main?id=1');
            $chartResponse1 = $this->postJson('/api/dashboard/get-hours-chart', ['date' => '2025-01-15']);
            $dashboardResponse2 = $this->getJson('/api/dashboard/main?id=2');
            $chartResponse2 = $this->postJson('/api/dashboard/get-hours-chart', ['date' => '2025-01-16']);
            $dashboardResponse3 = $this->getJson('/api/dashboard/main?id=3');

            // All should succeed
            $dashboardResponse1->assertStatus(200);
            $chartResponse1->assertStatus(200);
            $dashboardResponse2->assertStatus(200);
            $chartResponse2->assertStatus(200);
            $dashboardResponse3->assertStatus(200);
        });

        it('handles request cancellation scenarios', function () {
            // Test what happens when a request is "cancelled" (client disconnects)
            // We simulate this by testing interruption handling

            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getMainDashboardData')
                     ->once()
                     ->andThrow(new ConnectionException('Connection aborted'));
            });

            $response = $this->getJson('/api/dashboard/main');

            // Should handle cancellation gracefully
            $response->assertStatus(500);
        });
    });

    describe('Authentication and Session Edge Cases', function () {
        it('handles session expiry during request', function () {
            // Start with authenticated user
            expect(auth()->check())->toBe(true);

            // Mock external service
            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getMainDashboardData')
                     ->once()
                     ->andReturn(['success' => true, 'data' => []]);
            });

            // Logout user to simulate session expiry
            auth()->logout();

            $response = $this->getJson('/api/dashboard/main');

            // Should require authentication
            $response->assertStatus(401);
        });

        it('handles concurrent requests with session issues', function () {
            // Test scenario where session is valid for first request but expires before second

            $callCount = 0;
            $this->mock(ExternalApiService::class, function ($mock) use (&$callCount) {
                $mock->shouldReceive('getMainDashboardData')
                     ->times(1)
                     ->andReturnUsing(function() use (&$callCount) {
                         $callCount++;
                         if ($callCount === 1) {
                             // First call succeeds
                             return ['success' => true, 'data' => ['first' => true]];
                         }
                     });
            });

            // First request succeeds
            $response1 = $this->getJson('/api/dashboard/main?req=1');
            $response1->assertStatus(200);

            // Logout user
            auth()->logout();

            // Second request should fail
            $response2 = $this->getJson('/api/dashboard/main?req=2');
            $response2->assertStatus(401);
        });

        it('handles email verification requirements during API calls', function () {
            // Create unverified user
            $unverifiedUser = User::factory()->create(['email_verified_at' => null]);
            $this->actingAs($unverifiedUser);

            $response = $this->getJson('/api/dashboard/main');

            // Should require email verification
            expect($response->status())->toBeIn([302, 409]);
        });
    });

    describe('Data Validation Edge Cases', function () {
        it('handles extremely large date ranges', function () {
            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getMainDashboardData')
                     ->with('1900-01-01', '2100-12-31')
                     ->once()
                     ->andReturn(['success' => true, 'data' => []]);
            });

            $response = $this->getJson('/api/dashboard/main?' . http_build_query([
                'start_date' => '1900-01-01',
                'end_date' => '2100-12-31'
            ]));

            $response->assertStatus(200);
        });

        it('handles invalid date formats in API responses', function () {
            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getHoursChart')
                     ->once()
                     ->andReturn([
                         'success' => true,
                         'data' => [
                             ['hour' => 'invalid-time', 'current' => 123, 'previous' => 98]
                         ],
                         'currentDate' => 'invalid-date',
                         'previousDate' => '2025-13-45' // Invalid date
                     ]);
            });

            $response = $this->postJson('/api/dashboard/get-hours-chart', [
                'date' => '2025-01-15'
            ]);

            // Should pass through response as-is (validation happens on frontend)
            $response->assertStatus(200);
        });

        it('handles special date validation edge cases', function () {
            // Test leap year validation
            $response = $this->postJson('/api/dashboard/get-hours-chart', [
                'date' => '2023-02-29' // Invalid leap year date
            ]);

            $response->assertStatus(422)
                    ->assertJsonValidationErrors(['date']);

            // Test valid leap year date
            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getHoursChart')
                     ->once()
                     ->andReturn(['success' => true, 'data' => []]);
            });

            $response = $this->postJson('/api/dashboard/get-hours-chart', [
                'date' => '2024-02-29' // Valid leap year date
            ]);

            $response->assertStatus(200);
        });
    });

    describe('Resource Exhaustion Scenarios', function () {
        it('handles memory pressure during API calls', function () {
            // Simulate high memory usage scenario
            $largeData = str_repeat('x', 1000000); // 1MB string
            
            $this->mock(ExternalApiService::class, function ($mock) use ($largeData) {
                $mock->shouldReceive('getMainDashboardData')
                     ->once()
                     ->andReturn([
                         'success' => true, 
                         'data' => ['large_field' => $largeData]
                     ]);
            });

            $response = $this->getJson('/api/dashboard/main');

            // Should handle large responses
            $response->assertStatus(200);
        });

        it('handles database connection exhaustion', function () {
            // Simulate database connection issues
            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getMainDashboardData')
                     ->once()
                     ->andThrow(new \Exception('SQLSTATE[HY000] [2002] Connection refused'));
            });

            $response = $this->getJson('/api/dashboard/main');

            $response->assertStatus(500);
        });

        it('handles file descriptor exhaustion', function () {
            // Simulate too many open files scenario
            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getMainDashboardData')
                     ->once()
                     ->andThrow(new \Exception('Too many open files'));
            });

            $response = $this->getJson('/api/dashboard/main');

            $response->assertStatus(500);
        });
    });

    describe('Recovery and Resilience', function () {
        it('logs appropriate information for debugging failures', function () {
            Log::fake();

            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getMainDashboardData')
                     ->once()
                     ->andThrow(new \Exception('Detailed error for debugging'));
            });

            $response = $this->getJson('/api/dashboard/main?debug=true');

            $response->assertStatus(500);

            Log::assertLogged('error', function ($message, $context) {
                return str_contains($message, 'Error fetching main dashboard data')
                    && isset($context['error'])
                    && isset($context['trace']);
            });
        });

        it('maintains consistent response format across all error scenarios', function () {
            $errorScenarios = [
                new ConnectionException('Network error'),
                new \Exception('General error'),
                new RequestException(
                    response: new \Illuminate\Http\Client\Response(
                        new \GuzzleHttp\Psr7\Response(500, [], '{}')
                    )
                ),
            ];

            foreach ($errorScenarios as $index => $exception) {
                Log::fake();

                $this->mock(ExternalApiService::class, function ($mock) use ($exception) {
                    $mock->shouldReceive('getMainDashboardData')
                         ->once()
                         ->andThrow($exception);
                });

                $response = $this->getJson("/api/dashboard/main?test={$index}");

                $response->assertStatus(500)
                        ->assertJsonStructure([
                            'success',
                            'message',
                            'error'
                        ])
                        ->assertJson([
                            'success' => false
                        ]);
            }
        });

        it('handles partial recovery scenarios', function () {
            // Test where one API call fails but others succeed
            $this->mock(ExternalApiService::class, function ($mock) {
                $mock->shouldReceive('getMainDashboardData')
                     ->once()
                     ->andReturn(['success' => true, 'data' => ['recovered' => true]]);

                $mock->shouldReceive('getHoursChart')
                     ->once()
                     ->andThrow(new \Exception('Still failing'));
            });

            // Main dashboard should succeed
            $mainResponse = $this->getJson('/api/dashboard/main');
            $mainResponse->assertStatus(200);

            // Hours chart should still fail
            $chartResponse = $this->postJson('/api/dashboard/get-hours-chart', [
                'date' => '2025-01-15'
            ]);
            $chartResponse->assertStatus(500);
        });
    });
});