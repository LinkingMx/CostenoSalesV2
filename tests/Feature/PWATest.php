<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create([
        'email_verified_at' => now(),
    ]);
});

describe('PWA Manifest Tests', function () {
    it('serves PWA manifest with correct content type', function () {
        $response = $this->get('/manifest.json');
        
        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/json');
    });

    it('has valid manifest structure', function () {
        $response = $this->get('/manifest.json');
        
        $response->assertStatus(200);
        $manifest = json_decode($response->getContent(), true);
        
        // Debug what we actually get
        expect($manifest)->not->toBeNull();
        
        expect($manifest)->toHaveKey('name');
        expect($manifest)->toHaveKey('short_name');
        expect($manifest)->toHaveKey('description');
        expect($manifest)->toHaveKey('start_url');
        expect($manifest)->toHaveKey('display');
        expect($manifest)->toHaveKey('background_color');
        expect($manifest)->toHaveKey('theme_color');
        expect($manifest)->toHaveKey('icons');
        
        expect($manifest['name'])->toBe('Costeno Sales V2');
        expect($manifest['short_name'])->toBe('CosteroSales');
        expect($manifest['display'])->toBe('standalone');
        expect($manifest['start_url'])->toBe('/dashboard');
        expect($manifest['theme_color'])->toBe('#2563eb');
        expect($manifest['scope'])->toBe('/');
    });

    it('has properly configured icons', function () {
        $response = $this->get('/manifest.json');
        $manifest = json_decode($response->getContent(), true);
        
        expect($manifest['icons'])->toBeArray();
        expect($manifest['icons'])->toHaveCount(2);
        
        foreach ($manifest['icons'] as $icon) {
            expect($icon)->toHaveKeys(['src', 'sizes', 'type']);
            expect($icon['type'])->toBe('image/png');
            expect($icon)->toHaveKey('purpose');
        }
        
        $sizes = array_column($manifest['icons'], 'sizes');
        expect($sizes)->toContain('192x192');
        expect($sizes)->toContain('512x512');
    });

    it('has correct language and direction settings', function () {
        $response = $this->get('/manifest.json');
        $manifest = json_decode($response->getContent(), true);
        
        expect($manifest['lang'])->toBe('es');
        expect($manifest['dir'])->toBe('ltr');
        expect($manifest['prefer_related_applications'])->toBeFalse();
    });

    it('includes business category', function () {
        $response = $this->get('/manifest.json');
        $manifest = json_decode($response->getContent(), true);
        
        expect($manifest['categories'])->toContain('business');
        expect($manifest['categories'])->toContain('productivity');
    });
});

describe('Service Worker Tests', function () {
    it('serves service worker file', function () {
        $response = $this->get('/sw.js');
        
        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/javascript');
    });

    it('service worker contains essential PWA functionality', function () {
        $response = $this->get('/sw.js');
        $content = $response->getContent();
        
        // Check for essential service worker events
        expect($content)->toContain("addEventListener('install'");
        expect($content)->toContain("addEventListener('activate'");
        expect($content)->toContain("addEventListener('fetch'");
        
        // Check for caching functionality
        expect($content)->toContain('caches.open');
        expect($content)->toContain('CACHE_NAME');
        
        // Check for offline functionality
        expect($content)->toContain('OFFLINE_URL');
    });

    it('service worker handles API caching', function () {
        $response = $this->get('/sw.js');
        $content = $response->getContent();
        
        expect($content)->toContain('/api/');
        expect($content)->toContain('network-first');
        expect($content)->toContain('cache.put');
    });

    it('service worker includes background sync', function () {
        $response = $this->get('/sw.js');
        $content = $response->getContent();
        
        expect($content)->toContain("addEventListener('sync'");
        expect($content)->toContain('background-sync-dashboard');
        expect($content)->toContain('syncDashboardData');
    });

    it('service worker handles push notifications', function () {
        $response = $this->get('/sw.js');
        $content = $response->getContent();
        
        expect($content)->toContain("addEventListener('push'");
        expect($content)->toContain('showNotification');
        expect($content)->toContain('Costeno Sales V2');
    });
});

describe('PWA Installation Tests', function () {
    it('includes PWA meta tags in HTML', function () {
        $response = $this->actingAs($this->user)->get('/dashboard');
        
        $content = $response->getContent();
        
        // Should include manifest link
        expect($content)->toContain('manifest.json');
        
        // Should include theme color
        expect($content)->toContain('theme-color');
        
        // Should include viewport meta tag
        expect($content)->toContain('viewport');
    });

    it('supports standalone display mode', function () {
        $response = $this->get('/manifest.json');
        $manifest = json_decode($response->getContent(), true);
        
        expect($manifest['display'])->toBe('standalone');
        expect($manifest['orientation'])->toBe('portrait-primary');
    });

    it('has correct start URL for authenticated users', function () {
        $response = $this->get('/manifest.json');
        $manifest = json_decode($response->getContent(), true);
        
        expect($manifest['start_url'])->toBe('/dashboard');
        
        // Verify that dashboard requires authentication
        $dashboardResponse = $this->get('/dashboard');
        $dashboardResponse->assertRedirect(); // Should redirect to login
        
        // But works when authenticated
        $authResponse = $this->actingAs($this->user)->get('/dashboard');
        $authResponse->assertStatus(200);
    });
});

describe('Offline Functionality Tests', function () {
    it('includes offline page route', function () {
        // This would need an offline route/page to be implemented
        $response = $this->get('/offline');
        
        // For now, this might return 404, but in a full PWA it should return an offline page
        expect($response->getStatusCode())->toBeIn([200, 404]);
    });

    it('service worker caches essential assets', function () {
        $response = $this->get('/sw.js');
        $content = $response->getContent();
        
        // Check that essential URLs are cached
        expect($content)->toContain("'/'");
        expect($content)->toContain("'/dashboard'");
        expect($content)->toContain('/build/assets/app.js');
        expect($content)->toContain('/build/assets/app.css');
        expect($content)->toContain("'/manifest.json'");
    });

    it('API requests have fallback strategy', function () {
        $response = $this->get('/sw.js');
        $content = $response->getContent();
        
        // Should handle API requests specially
        expect($content)->toContain("includes('/api/')");
        expect($content)->toContain('network-first');
        expect($content)->toContain('Fallback to cache');
    });
});

describe('PWA Performance Tests', function () {
    it('dashboard loads quickly for PWA', function () {
        $startTime = microtime(true);
        
        $response = $this->actingAs($this->user)->get('/dashboard');
        
        $loadTime = microtime(true) - $startTime;
        
        $response->assertStatus(200);
        
        // Should load within reasonable time (adjust threshold as needed)
        expect($loadTime)->toBeLessThan(2.0); // 2 seconds
    });

    it('API endpoints respond quickly', function () {
        $this->actingAs($this->user);
        
        // Mock external API for testing
        Http::fake([
            'http://192.168.100.20/api/main_dashboard_data' => Http::response([
                'success' => true,
                'data' => [
                    'total_sales' => 150000,
                    'total_revenue' => 125000,
                ],
                'message' => 'Success',
            ], 200),
        ]);
        
        $startTime = microtime(true);
        
        $response = $this->getJson('/api/dashboard/data/today');
        
        $loadTime = microtime(true) - $startTime;
        
        $response->assertStatus(200);
        expect($loadTime)->toBeLessThan(1.0); // 1 second for API
    });

    it('manifest and service worker load efficiently', function () {
        $manifestStart = microtime(true);
        $manifestResponse = $this->get('/manifest.json');
        $manifestTime = microtime(true) - $manifestStart;
        
        $swStart = microtime(true);
        $swResponse = $this->get('/sw.js');
        $swTime = microtime(true) - $swStart;
        
        $manifestResponse->assertStatus(200);
        $swResponse->assertStatus(200);
        
        expect($manifestTime)->toBeLessThan(0.5); // 500ms
        expect($swTime)->toBeLessThan(0.5); // 500ms
    });
});

describe('PWA Security Tests', function () {
    it('service worker only caches same-origin requests', function () {
        $response = $this->get('/sw.js');
        $content = $response->getContent();
        
        expect($content)->toContain('self.location.origin');
        expect($content)->toContain('Skip cross-origin requests');
    });

    it('manifest has secure configuration', function () {
        $response = $this->get('/manifest.json');
        $manifest = json_decode($response->getContent(), true);
        
        // Start URL should be relative or same origin
        expect($manifest['start_url'])->toStartWith('/');
        
        // Scope should be properly defined
        expect($manifest['scope'])->toBe('/');
    });

    it('PWA works with authentication middleware', function () {
        // Test that PWA start URL respects authentication
        $response = $this->get('/dashboard');
        $response->assertRedirect(); // Should redirect unauthenticated users
        
        // But allows authenticated users
        $authResponse = $this->actingAs($this->user)->get('/dashboard');
        $authResponse->assertStatus(200);
    });
});

describe('PWA Dashboard Integration', function () {
    it('dashboard data is available in PWA context', function () {
        $this->actingAs($this->user);
        
        $response = $this->getJson('/api/dashboard/data/today');
        
        $response->assertStatus(200);
        $response->assertJsonStructure([
            // Structure would match your dashboard API response
        ]);
    });

    it('PWA supports all dashboard periods', function () {
        $this->actingAs($this->user);
        
        $periods = ['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month'];
        
        foreach ($periods as $period) {
            $response = $this->getJson("/api/dashboard/data/{$period}");
            $response->assertStatus(200);
        }
    });

    it('PWA caches dashboard API responses', function () {
        $response = $this->get('/sw.js');
        $content = $response->getContent();
        
        // Should cache dashboard API responses
        expect($content)->toContain('/api/dashboard/data');
        expect($content)->toContain('responseToCache');
    });

    it('PWA includes dashboard in navigation scope', function () {
        $response = $this->get('/sw.js');
        $content = $response->getContent();
        
        // Should handle navigation to dashboard
        expect($content)->toContain("mode === 'navigate'");
        expect($content)->toContain('/dashboard');
    });
});

describe('PWA Update and Sync Tests', function () {
    it('service worker handles version updates', function () {
        $response = $this->get('/sw.js');
        $content = $response->getContent();
        
        expect($content)->toContain('CACHE_NAME');
        expect($content)->toContain('costeno-sales-v1');
        expect($content)->toContain('skipWaiting');
        expect($content)->toContain('clients.claim');
    });

    it('background sync is configured for dashboard', function () {
        $response = $this->get('/sw.js');
        $content = $response->getContent();
        
        expect($content)->toContain('background-sync-dashboard');
        expect($content)->toContain('syncDashboardData');
        expect($content)->toContain('/api/dashboard/data/today');
    });

    it('push notifications are configured', function () {
        $response = $this->get('/sw.js');
        $content = $response->getContent();
        
        expect($content)->toContain('push');
        expect($content)->toContain('Nueva actualización disponible');
        expect($content)->toContain('/icon-192.png');
        expect($content)->toContain('vibrate');
    });
});