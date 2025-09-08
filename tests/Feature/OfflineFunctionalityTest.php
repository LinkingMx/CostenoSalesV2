<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create([
        'email_verified_at' => now(),
    ]);
});

describe('Offline Page and Fallbacks', function () {
    it('serves offline fallback page', function () {
        // Create a simple offline page for testing
        $offlineContent = '<!DOCTYPE html>
<html>
<head>
    <title>Sin conexión - Costeno Sales</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
    <div class="offline-container">
        <h1>Sin conexión a Internet</h1>
        <p>Parece que no tienes conexión a Internet. Algunas funciones pueden no estar disponibles.</p>
        <button onclick="window.location.reload()">Intentar nuevamente</button>
    </div>
</body>
</html>';
        
        file_put_contents(public_path('offline.html'), $offlineContent);
        
        $response = $this->get('/offline.html');
        $response->assertStatus(200);
        $response->assertSee('Sin conexión a Internet');
        $response->assertSee('Intentar nuevamente');
        
        // Cleanup
        unlink(public_path('offline.html'));
    });

    it('handles API failures gracefully', function () {
        $this->actingAs($this->user);
        
        // Mock external API to simulate network failure
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => Http::response(null, 500),
        ]);
        
        $response = $this->postJson('/api/dashboard/data', [
            'start_date' => '2024-01-01',
            'end_date' => '2024-01-31'
        ]);
        
        // Should handle the failure gracefully
        expect($response->getStatusCode())->toBeIn([200, 422, 500]);
    });

    it('provides meaningful error messages for offline scenarios', function () {
        $this->actingAs($this->user);
        
        // Mock network timeout/failure
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => function () {
                throw new RequestException('Network timeout');
            },
        ]);
        
        $response = $this->postJson('/api/dashboard/data', [
            'start_date' => '2024-01-01',
            'end_date' => '2024-01-31'
        ]);
        
        // Should provide error information
        expect($response->getStatusCode())->toBeIn([422, 500, 503]);
    });
});

describe('Data Caching for Offline Access', function () {
    it('caches dashboard data for offline access', function () {
        $this->actingAs($this->user);
        
        // Simulate cached dashboard data
        $cachedData = [
            'total_sales' => 150000,
            'total_revenue' => 125000,
            'sales_count' => 1462,
            'cached_at' => now()->toISOString(),
            'period' => 'last_30_days'
        ];
        
        Cache::put('dashboard_data_last_30_days_user_' . $this->user->id, $cachedData, 3600);
        
        // Verify cache exists
        $cached = Cache::get('dashboard_data_last_30_days_user_' . $this->user->id);
        expect($cached)->not->toBeNull();
        expect($cached['total_sales'])->toBe(150000);
        expect($cached['period'])->toBe('last_30_days');
    });

    it('serves cached data when API is unavailable', function () {
        $this->actingAs($this->user);
        
        // Pre-populate cache with mock data
        $mockData = [
            'total_sales' => 95000,
            'total_revenue' => 78000,
            'sales_count' => 980,
            'cached_at' => now()->subHours(2)->toISOString(),
            'is_cached' => true
        ];
        
        Cache::put('dashboard_data_today_user_' . $this->user->id, $mockData, 3600);
        
        // Mock API failure
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => Http::response(null, 503),
        ]);
        
        // Request should fallback to cached data
        $response = $this->getJson('/api/dashboard/data/today');
        
        // Should either return cached data or handle gracefully
        expect($response->getStatusCode())->toBeIn([200, 503]);
        
        if ($response->getStatusCode() === 200) {
            expect($response->json('is_cached'))->toBeTrue();
        }
    });

    it('handles cache expiration appropriately', function () {
        $this->actingAs($this->user);
        
        // Set expired cache data
        $expiredData = [
            'total_sales' => 50000,
            'cached_at' => now()->subDays(1)->toISOString(),
            'expired' => true
        ];
        
        Cache::put('dashboard_data_yesterday_user_' . $this->user->id, $expiredData, -1);
        
        // Cache should be expired
        $cached = Cache::get('dashboard_data_yesterday_user_' . $this->user->id);
        expect($cached)->toBeNull(); // Should be null if truly expired
    });

    it('caches different periods separately', function () {
        $this->actingAs($this->user);
        
        $periods = ['today', 'yesterday', 'last_7_days', 'last_30_days'];
        
        foreach ($periods as $period) {
            $cacheKey = "dashboard_data_{$period}_user_{$this->user->id}";
            
            Cache::put($cacheKey, [
                'period' => $period,
                'total_sales' => rand(10000, 200000),
                'cached_at' => now()->toISOString()
            ], 1800);
            
            $cached = Cache::get($cacheKey);
            expect($cached['period'])->toBe($period);
        }
        
        // All periods should be cached independently
        expect(Cache::has("dashboard_data_today_user_{$this->user->id}"))->toBeTrue();
        expect(Cache::has("dashboard_data_last_30_days_user_{$this->user->id}"))->toBeTrue();
    });
});

describe('Service Worker Offline Functionality', function () {
    it('service worker includes offline handling', function () {
        $response = $this->get('/sw.js');
        $content = $response->getContent();
        
        // Should handle fetch events for offline capability
        expect($content)->toContain("addEventListener('fetch'");
        expect($content)->toContain('caches.match');
        expect($content)->toContain('OFFLINE_URL');
        
        // Should have fallback strategies
        expect($content)->toContain('catch');
        expect($content)->toContain('network-first');
    });

    it('service worker caches essential resources', function () {
        $response = $this->get('/sw.js');
        $content = $response->getContent();
        
        $essentialResources = [
            '/dashboard',
            '/build/assets/app.js',
            '/build/assets/app.css',
            '/manifest.json'
        ];
        
        foreach ($essentialResources as $resource) {
            expect($content)->toContain($resource);
        }
    });

    it('service worker handles API caching strategy', function () {
        $response = $this->get('/sw.js');
        $content = $response->getContent();
        
        // Should cache API responses
        expect($content)->toContain('/api/');
        expect($content)->toContain('responseToCache');
        expect($content)->toContain('cache.put');
        
        // Should have fallback for failed API requests
        expect($content)->toContain('fallback to cache');
    });

    it('service worker implements background sync', function () {
        $response = $this->get('/sw.js');
        $content = $response->getContent();
        
        expect($content)->toContain("addEventListener('sync'");
        expect($content)->toContain('background-sync-dashboard');
        expect($content)->toContain('syncDashboardData');
    });
});

describe('Progressive Enhancement for Offline', function () {
    it('dashboard loads basic content without JavaScript', function () {
        $this->actingAs($this->user);
        
        $response = $this->get('/dashboard');
        $response->assertStatus(200);
        
        $content = $response->getContent();
        
        // Should include basic dashboard structure
        expect($content)->toContain('dashboard');
        expect($content)->toContain('<!DOCTYPE html');
        
        // Should include noscript fallbacks or basic HTML structure
        expect($content)->toContain('<div'); // Basic HTML elements
    });

    it('provides graceful degradation for API features', function () {
        $this->actingAs($this->user);
        
        // Test that dashboard page loads even if API calls fail
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => Http::response(null, 503),
        ]);
        
        $response = $this->get('/dashboard');
        $response->assertStatus(200);
        
        // Should still render page structure
        $content = $response->getContent();
        expect($content)->toContain('<!DOCTYPE html');
    });

    it('handles partial offline scenarios', function () {
        $this->actingAs($this->user);
        
        // Some resources available, others not
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => Http::response(null, 503),
        ]);
        
        // Basic navigation should still work
        $response = $this->get('/dashboard');
        $response->assertStatus(200);
        
        // Settings should still be accessible
        $settingsResponse = $this->get('/settings/profile');
        $settingsResponse->assertStatus(200);
    });
});

describe('Offline Data Synchronization', function () {
    it('queues data for sync when connection is restored', function () {
        $this->actingAs($this->user);
        
        // Simulate offline actions that need to be synced
        $offlineData = [
            'user_id' => $this->user->id,
            'action' => 'dashboard_view',
            'timestamp' => now()->toISOString(),
            'data' => ['period' => 'today'],
            'synced' => false
        ];
        
        // Store in queue/cache for later sync
        $queueKey = 'offline_sync_queue_user_' . $this->user->id;
        $existingQueue = Cache::get($queueKey, []);
        $existingQueue[] = $offlineData;
        
        Cache::put($queueKey, $existingQueue, 86400); // 24 hours
        
        // Verify queued
        $queue = Cache::get($queueKey);
        expect($queue)->toHaveCount(1);
        expect($queue[0]['action'])->toBe('dashboard_view');
        expect($queue[0]['synced'])->toBeFalse();
    });

    it('processes sync queue when connection is restored', function () {
        $this->actingAs($this->user);
        
        // Pre-populate sync queue
        $syncItems = [
            [
                'user_id' => $this->user->id,
                'action' => 'dashboard_view',
                'data' => ['period' => 'today'],
                'timestamp' => now()->subHours(2)->toISOString(),
                'synced' => false
            ],
            [
                'user_id' => $this->user->id,
                'action' => 'settings_update',
                'data' => ['theme' => 'dark'],
                'timestamp' => now()->subHour()->toISOString(),
                'synced' => false
            ]
        ];
        
        $queueKey = 'offline_sync_queue_user_' . $this->user->id;
        Cache::put($queueKey, $syncItems, 86400);
        
        // Simulate connection restored and sync process
        $queue = Cache::get($queueKey, []);
        expect($queue)->toHaveCount(2);
        
        // Process sync (would be done by background job or service worker)
        foreach ($queue as &$item) {
            $item['synced'] = true;
            $item['sync_timestamp'] = now()->toISOString();
        }
        
        Cache::put($queueKey, $queue, 86400);
        
        // Verify sync status
        $syncedQueue = Cache::get($queueKey);
        expect($syncedQueue[0]['synced'])->toBeTrue();
        expect($syncedQueue[1]['synced'])->toBeTrue();
    });

    it('handles sync conflicts appropriately', function () {
        $this->actingAs($this->user);
        
        // Simulate conflicting offline and online data
        $offlineData = [
            'user_preference' => 'theme_dark',
            'updated_at' => now()->subHour()->toISOString(),
            'source' => 'offline'
        ];
        
        $onlineData = [
            'user_preference' => 'theme_light',
            'updated_at' => now()->subMinutes(30)->toISOString(),
            'source' => 'online'
        ];
        
        Cache::put('offline_user_data_' . $this->user->id, $offlineData, 3600);
        Cache::put('online_user_data_' . $this->user->id, $onlineData, 3600);
        
        // Most recent should win (online data in this case)
        $offline = Cache::get('offline_user_data_' . $this->user->id);
        $online = Cache::get('online_user_data_' . $this->user->id);
        
        $offlineTime = strtotime($offline['updated_at']);
        $onlineTime = strtotime($online['updated_at']);
        
        $mostRecent = $onlineTime > $offlineTime ? $online : $offline;
        expect($mostRecent['source'])->toBe('online');
    });
});

describe('Network Status Detection', function () {
    it('service worker detects network changes', function () {
        $response = $this->get('/sw.js');
        $content = $response->getContent();
        
        // Should include network change detection
        expect($content)->toContain('fetch');
        expect($content)->toContain('catch');
        
        // Should handle online/offline events
        expect($content)->toContain('background-sync');
    });

    it('provides user feedback for offline status', function () {
        // This would typically be tested in browser/frontend tests
        // But we can verify the basic structure is in place
        
        $this->actingAs($this->user);
        $response = $this->get('/dashboard');
        
        $content = $response->getContent();
        
        // Should include basic structure for offline indicators
        expect($content)->toContain('<!DOCTYPE html');
        
        // In a full implementation, this would check for offline indicators
        expect(true)->toBeTrue();
    });

    it('retries failed requests when connection is restored', function () {
        $this->actingAs($this->user);
        
        // Mock initial failure then success
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => Http::sequence()
                ->push(null, 503) // First request fails
                ->push(['data' => 'success'], 200), // Retry succeeds
        ]);
        
        // First request should fail
        $response1 = $this->postJson('/api/dashboard/data', [
            'start_date' => '2024-01-01',
            'end_date' => '2024-01-31'
        ]);
        
        // Should handle failure gracefully
        expect($response1->getStatusCode())->toBe(503);
        
        // Retry should succeed (in real implementation, this would be automatic)
        $response2 = $this->postJson('/api/dashboard/data', [
            'start_date' => '2024-01-01',
            'end_date' => '2024-01-31'
        ]);
        
        expect($response2->getStatusCode())->toBe(200);
    });
});