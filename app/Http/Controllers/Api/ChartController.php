<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\GetHoursChartRequest;
use App\Services\ExternalApiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChartController extends Controller
{
    public function __construct(
        private ExternalApiService $externalApiService
    ) {}

    public function getHoursChart(GetHoursChartRequest $request): JsonResponse
    {
        try {
            $date = $request->validated('date');
            
            $result = $this->externalApiService->getHoursChart($date);
            
            // Return the result directly as it already has the correct format
            return response()->json($result);
            
        } catch (\Exception $e) {
            \Log::error('Error fetching hours chart data', [
                'date' => $request->input('date'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los datos de la gráfica',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor'
            ], 500);
        }
    }

    public function getMainDashboardData(Request $request): JsonResponse
    {
        try {
            $startDate = $request->query('start_date');
            $endDate = $request->query('end_date');
            
            $result = $this->externalApiService->getMainDashboardData($startDate, $endDate);
            
            // Return the result directly from the external API
            return response()->json($result);
            
        } catch (\Exception $e) {
            \Log::error('Error fetching main dashboard data', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los datos del dashboard',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor'
            ], 500);
        }
    }

}