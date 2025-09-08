<?php

use App\Http\Controllers\Api\ChartController;
use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

// PWA routes
Route::get('/manifest.json', function () {
    $manifestContent = file_get_contents(public_path('manifest.json'));
    return response($manifestContent, 200, [
        'Content-Type' => 'application/json'
    ]);
})->name('manifest');

Route::get('/sw.js', function () {
    $swContent = file_get_contents(public_path('sw.js'));
    return response($swContent, 200, [
        'Content-Type' => 'application/javascript'
    ]);
})->name('service-worker');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('performance-test', function () {
        return Inertia::render('performance-test');
    })->name('performance-test');
    Route::get('branch-performance-test', function () {
        return Inertia::render('branch-performance-test');
    })->name('branch-performance-test');
    Route::get('two-calls-demo', function () {
        return Inertia::render('two-calls-demo');
    })->name('two-calls-demo');
    
    // Dashboard API routes
    Route::prefix('api/dashboard')->name('api.dashboard.')->group(function () {
        Route::post('data', [DashboardController::class, 'getData'])->name('data');
        Route::get('data/{period}', [DashboardController::class, 'getDataForPeriod'])->name('data.period');
        Route::get('periods', [DashboardController::class, 'getAvailablePeriods'])->name('periods');
        Route::post('get-hours-chart', [ChartController::class, 'getHoursChart'])->name('hours-chart');
        Route::get('main-data', [ChartController::class, 'getMainDashboardData'])->name('main-data');
        
        // Optimized endpoints for performance
        Route::get('optimized-period-data', [\App\Http\Controllers\OptimizedDashboardController::class, 'getOptimizedPeriodData'])->name('optimized-period-data');
        Route::get('optimized-branch-data', [\App\Http\Controllers\OptimizedDashboardController::class, 'getOptimizedBranchData'])->name('optimized-branch-data');
        Route::get('period-types', [\App\Http\Controllers\OptimizedDashboardController::class, 'getAvailablePeriodTypes'])->name('period-types');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
