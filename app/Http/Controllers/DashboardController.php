<?php

namespace App\Http\Controllers;

use App\Services\DashboardApiService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Dashboard Controller for Costeno Sales V2
 * Handles dashboard display and API data fetching
 */
class DashboardController extends Controller
{
    public function __construct(
        private DashboardApiService $dashboardApiService
    ) {}

    /**
     * Display the dashboard page
     */
    public function index(): Response
    {
        return Inertia::render('dashboard', [
            'availablePeriods' => $this->dashboardApiService->getAvailablePeriods(),
            'translations' => $this->getTranslations(),
        ]);
    }

    /**
     * Get translations for the frontend
     */
    private function getTranslations(): array
    {
        // Get the translation file contents directly
        $locale = app()->getLocale();
        $navigationTranslations = trans('navigation', [], $locale);
        
        return [
            'navigation' => $navigationTranslations,
        ];
    }

    /**
     * Fetch dashboard data for specific date range
     */
    public function getData(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'required|date_format:Y-m-d|before_or_equal:today',
            'end_date' => 'required|date_format:Y-m-d|after_or_equal:start_date',
        ]);

        try {
            $data = $this->dashboardApiService->getDashboardData(
                $request->input('start_date'),
                $request->input('end_date')
            );

            return response()->json([
                'success' => true,
                'data' => $data,
                'timestamp' => now()->toISOString(),
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'error_code' => 'DASHBOARD_FETCH_FAILED',
            ], 500);
        }
    }

    /**
     * Fetch dashboard data for predefined period
     */
    public function getDataForPeriod(Request $request, string $period): JsonResponse
    {
        $validPeriods = collect($this->dashboardApiService->getAvailablePeriods())
            ->pluck('value')
            ->toArray();

        if (!in_array($period, $validPeriods)) {
            return response()->json([
                'success' => false,
                'message' => "Invalid period: {$period}",
                'error_code' => 'INVALID_PERIOD',
            ], 400);
        }

        try {
            $data = $this->dashboardApiService->getDashboardDataForPeriod($period);

            return response()->json([
                'success' => true,
                'data' => $data,
                'period' => $period,
                'timestamp' => now()->toISOString(),
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'error_code' => 'DASHBOARD_FETCH_FAILED',
            ], 500);
        }
    }

    /**
     * Get available periods for dashboard data
     */
    public function getAvailablePeriods(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->dashboardApiService->getAvailablePeriods(),
        ]);
    }
}