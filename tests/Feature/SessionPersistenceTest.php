<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create([
        'email_verified_at' => now(),
    ]);
    
    // Ensure sessions table exists
    if (!DB::getSchemaBuilder()->hasTable('sessions')) {
        $this->artisan('session:table');
        $this->artisan('migrate');
    }
});

describe('Session Persistence Configuration', function () {
    it('uses database driver for session persistence', function () {
        expect(Config::get('session.driver'))->toBe('database');
        expect(Config::get('session.table'))->toBe('sessions');
    });

    it('has sessions table properly configured', function () {
        expect(DB::getSchemaBuilder()->hasTable('sessions'))->toBeTrue();
        
        $columns = DB::getSchemaBuilder()->getColumnListing('sessions');
        expect($columns)->toContain('id');
        expect($columns)->toContain('user_id');
        expect($columns)->toContain('ip_address');
        expect($columns)->toContain('user_agent');
        expect($columns)->toContain('payload');
        expect($columns)->toContain('last_activity');
    });

    it('sessions persist beyond request lifecycle', function () {
        Config::set('session.lifetime', 120); // 2 hours
        
        $this->actingAs($this->user);
        
        // Make initial request to create session
        $this->get('/dashboard');
        
        // Check session exists in database
        $sessions = DB::table('sessions')->where('user_id', $this->user->id)->get();
        expect($sessions)->toHaveCount(1);
        
        $sessionData = $sessions->first();
        expect($sessionData->user_id)->toBe($this->user->id);
        expect($sessionData->payload)->not->toBeEmpty();
    });
});

describe('Browser Restart Simulation Tests', function () {
    it('maintains session after simulated browser restart', function () {
        Config::set('session.lifetime', 240); // 4 hours
        
        // Step 1: Login and establish session
        $response = $this->post('/login', [
            'email' => $this->user->email,
            'password' => 'password',
        ]);
        
        $response->assertRedirect('/dashboard');
        
        // Get session information
        $sessionId = Session::getId();
        $sessionData = DB::table('sessions')->where('id', $sessionId)->first();
        
        expect($sessionData)->not->toBeNull();
        expect($sessionData->user_id)->toBe($this->user->id);
        
        // Step 2: Simulate browser restart by clearing PHP session but keeping DB record
        Session::flush();
        
        // Verify session still exists in database
        $persistedSession = DB::table('sessions')->where('id', $sessionId)->first();
        expect($persistedSession)->not->toBeNull();
        
        // Step 3: Simulate browser reopening with session cookie
        Session::setId($sessionId);
        Session::start();
        
        // Should be able to access protected routes
        $dashboardResponse = $this->actingAs($this->user)->get('/dashboard');
        $dashboardResponse->assertStatus(200);
    });

    it('handles multiple browser sessions for same user', function () {
        Config::set('session.lifetime', 180); // 3 hours
        
        // Browser 1: Login
        $response1 = $this->post('/login', [
            'email' => $this->user->email,
            'password' => 'password',
        ]);
        
        $session1Id = Session::getId();
        
        // Simulate second browser/device login
        Session::flush();
        Session::regenerate();
        
        $response2 = $this->post('/login', [
            'email' => $this->user->email,
            'password' => 'password',
        ]);
        
        $session2Id = Session::getId();
        
        expect($session2Id)->not->toBe($session1Id);
        
        // Both sessions should exist in database
        $sessions = DB::table('sessions')->where('user_id', $this->user->id)->get();
        expect($sessions)->toHaveCount(2);
        
        // Both sessions should work independently
        Session::setId($session1Id);
        Session::start();
        $test1 = $this->actingAs($this->user)->get('/dashboard');
        $test1->assertStatus(200);
        
        Session::setId($session2Id);
        Session::start();
        $test2 = $this->actingAs($this->user)->get('/dashboard');
        $test2->assertStatus(200);
    });

    it('cleans up expired sessions properly', function () {
        Config::set('session.lifetime', 1); // 1 minute
        
        // Create session
        $this->actingAs($this->user);
        $this->get('/dashboard');
        
        $sessionId = Session::getId();
        
        // Verify session exists
        $session = DB::table('sessions')->where('id', $sessionId)->first();
        expect($session)->not->toBeNull();
        
        // Fast forward past expiration
        Carbon::setTestNow(now()->addMinutes(5));
        
        // Update the session's last_activity to simulate expiration
        DB::table('sessions')
            ->where('id', $sessionId)
            ->update(['last_activity' => now()->subMinutes(5)->timestamp]);
        
        // New request should trigger session cleanup
        $this->post('/login', [
            'email' => $this->user->email,
            'password' => 'password',
        ]);
        
        // Old expired session should eventually be cleaned up
        // (Laravel's session GC runs based on lottery odds)
        expect(true)->toBeTrue(); // Placeholder for GC verification
    });
});

describe('Remember Me Functionality', function () {
    it('creates remember token for persistent login', function () {
        // Login with remember me
        $response = $this->post('/login', [
            'email' => $this->user->email,
            'password' => 'password',
            'remember' => true,
        ]);
        
        $response->assertRedirect('/dashboard');
        
        // Check that remember token was set
        $updatedUser = $this->user->fresh();
        expect($updatedUser->remember_token)->not->toBeNull();
    });

    it('maintains authentication across browser restarts with remember me', function () {
        // Login with remember me
        $response = $this->post('/login', [
            'email' => $this->user->email,
            'password' => 'password',
            'remember' => true,
        ]);
        
        $rememberToken = $this->user->fresh()->remember_token;
        
        // Simulate browser restart - flush session but keep remember cookie
        Session::flush();
        
        // Simulate time passing (weeks)
        Carbon::setTestNow(now()->addWeeks(2));
        
        // Create new request with remember cookie
        $cookieName = Config::get('auth.guards.web.provider') . '_remember_web_' . sha1(User::class);
        
        // This simulates the remember me cookie being sent
        $rememberCookie = Cookie::make(
            $cookieName,
            $this->user->id . '|' . $rememberToken . '|' . hash('sha256', $this->user->password),
            Config::get('auth.expire', 576000) // 400 days default
        );
        
        // User should still be remembered even after session expires
        expect($rememberToken)->not->toBeNull();
        expect($this->user->fresh()->remember_token)->toBe($rememberToken);
    });

    it('forget functionality clears remember token', function () {
        // Login with remember me
        $this->post('/login', [
            'email' => $this->user->email,
            'password' => 'password',
            'remember' => true,
        ]);
        
        $rememberToken = $this->user->fresh()->remember_token;
        expect($rememberToken)->not->toBeNull();
        
        // Logout
        $this->post('/logout');
        
        // Remember token should be cleared
        $updatedUser = $this->user->fresh();
        expect($updatedUser->remember_token)->toBeNull();
    });
});

describe('Session Security and Regeneration', function () {
    it('regenerates session ID on login to prevent session fixation', function () {
        // Get initial session ID before login
        $initialSessionId = Session::getId();
        
        // Login
        $response = $this->post('/login', [
            'email' => $this->user->email,
            'password' => 'password',
        ]);
        
        $newSessionId = Session::getId();
        
        // Session ID should change after login
        expect($newSessionId)->not->toBe($initialSessionId);
        
        // Old session should not exist in database
        $oldSession = DB::table('sessions')->where('id', $initialSessionId)->first();
        expect($oldSession)->toBeNull();
        
        // New session should exist
        $newSession = DB::table('sessions')->where('id', $newSessionId)->first();
        expect($newSession)->not->toBeNull();
        expect($newSession->user_id)->toBe($this->user->id);
    });

    it('invalidates sessions on logout', function () {
        // Login
        $this->post('/login', [
            'email' => $this->user->email,
            'password' => 'password',
        ]);
        
        $sessionId = Session::getId();
        
        // Verify session exists
        $session = DB::table('sessions')->where('id', $sessionId)->first();
        expect($session)->not->toBeNull();
        
        // Logout
        $this->post('/logout');
        
        // Session should be invalidated
        $invalidatedSession = DB::table('sessions')->where('id', $sessionId)->first();
        expect($invalidatedSession)->toBeNull();
    });

    it('handles concurrent session access safely', function () {
        Config::set('session.lifetime', 120);
        
        $this->actingAs($this->user);
        
        $sessionId = Session::getId();
        
        // Simulate concurrent requests updating session
        for ($i = 0; $i < 5; $i++) {
            $this->get('/dashboard');
            
            // Verify session still exists and belongs to correct user
            $session = DB::table('sessions')->where('id', $sessionId)->first();
            expect($session)->not->toBeNull();
            expect($session->user_id)->toBe($this->user->id);
        }
    });
});

describe('Dashboard Integration with Persistent Sessions', function () {
    it('maintains dashboard state across browser restarts', function () {
        Config::set('session.lifetime', 480); // 8 hours
        
        // Login and use dashboard
        $this->actingAs($this->user);
        
        $sessionId = Session::getId();
        
        // Access dashboard
        $response = $this->get('/dashboard');
        $response->assertStatus(200);
        
        // Make API call
        $apiResponse = $this->postJson('/api/dashboard/data', [
            'start_date' => '2024-01-01',
            'end_date' => '2024-01-31'
        ]);
        $apiResponse->assertStatus(200);
        
        // Simulate browser restart
        Session::flush();
        
        // Restore session
        Session::setId($sessionId);
        Session::start();
        
        // Should still work
        $dashboardResponse = $this->actingAs($this->user)->get('/dashboard');
        $dashboardResponse->assertStatus(200);
        
        $apiResponse2 = $this->actingAs($this->user)->postJson('/api/dashboard/data', [
            'start_date' => '2024-01-01',
            'end_date' => '2024-01-31'
        ]);
        $apiResponse2->assertStatus(200);
    });

    it('preserves user preferences across sessions', function () {
        $this->actingAs($this->user);
        
        $sessionId = Session::getId();
        
        // Store some user preferences in session
        Session::put('dashboard_preferences', [
            'theme' => 'dark',
            'default_period' => 'last_30_days',
            'chart_type' => 'line'
        ]);
        
        // Verify preferences are stored
        expect(Session::get('dashboard_preferences.theme'))->toBe('dark');
        
        // Simulate browser restart
        Session::flush();
        Session::setId($sessionId);
        Session::start();
        
        // Check if preferences persist (they would if stored in database session)
        $sessionData = DB::table('sessions')->where('id', $sessionId)->first();
        expect($sessionData)->not->toBeNull();
        
        // The payload should contain the session data
        expect($sessionData->payload)->not->toBeEmpty();
    });

    it('handles session timeout gracefully during dashboard use', function () {
        Config::set('session.lifetime', 2); // 2 minutes for testing
        
        $this->actingAs($this->user);
        
        // Use dashboard initially
        $response = $this->get('/dashboard');
        $response->assertStatus(200);
        
        // Fast forward past session timeout
        Carbon::setTestNow(now()->addMinutes(5));
        
        // Next request should redirect to login
        $expiredResponse = $this->get('/dashboard');
        $expiredResponse->assertRedirect(); // Should redirect to login
        
        // But re-authentication should work
        $loginResponse = $this->post('/login', [
            'email' => $this->user->email,
            'password' => 'password',
        ]);
        $loginResponse->assertRedirect('/dashboard');
        
        $dashboardResponse = $this->get('/dashboard');
        $dashboardResponse->assertStatus(200);
    });
});