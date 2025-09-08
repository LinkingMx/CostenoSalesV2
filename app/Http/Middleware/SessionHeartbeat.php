<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Symfony\Component\HttpFoundation\Response;

class SessionHeartbeat
{
    /**
     * Handle an incoming request.
     *
     * PWA-optimized session management:
     * - Extends session lifetime on active use
     * - Provides session status for frontend
     * - Handles graceful session renewal
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Only process for authenticated users
        if (Auth::check()) {
            $this->extendSessionLifetime($request);
        }

        $response = $next($request);
        
        // Add session status headers for PWA
        if ($request->expectsJson()) {
            $this->addSessionHeaders($response);
        }

        return $response;
    }

    /**
     * Extend session lifetime for active users
     */
    private function extendSessionLifetime(Request $request): void
    {
        // Get current session activity
        $lastActivity = Session::get('last_activity', 0);
        $currentTime = time();
        
        // If more than 1 hour since last heartbeat, refresh session
        if ($currentTime - $lastActivity > 3600) {
            Session::put('last_activity', $currentTime);
            
            // For PWA: extend remember token if present
            if ($request->user() && $request->user()->getRememberToken()) {
                $request->user()->setRememberToken(
                    $request->user()->getRememberToken()
                );
                $request->user()->save();
            }
        }
    }

    /**
     * Add session status headers for PWA consumption
     */
    private function addSessionHeaders(Response $response): void
    {
        $sessionLifetime = config('session.lifetime') * 60; // Convert to seconds
        $lastActivity = Session::get('last_activity', time());
        $timeRemaining = $sessionLifetime - (time() - $lastActivity);
        
        $response->headers->set('X-Session-Lifetime', $sessionLifetime);
        $response->headers->set('X-Session-Remaining', max(0, $timeRemaining));
        $response->headers->set('X-Session-Status', Auth::check() ? 'active' : 'inactive');
        
        // Warning if session expires in less than 1 day
        if ($timeRemaining < 86400 && $timeRemaining > 0) {
            $response->headers->set('X-Session-Warning', 'expiring-soon');
        }
    }
}
