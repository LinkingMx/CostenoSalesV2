<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\GetHoursChartRequest;
use App\Http\Requests\GetWeeklyBatchRequest;
use App\Http\Requests\GetMonthlyBatchRequest;
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
            
            // Validate required parameters
            if (!$startDate || !$endDate) {
                return response()->json([
                    'success' => false,
                    'message' => 'Las fechas de inicio y fin son requeridas',
                    'data' => null
                ], 400);
            }
            
            $result = $this->externalApiService->getMainDashboardData($startDate, $endDate);
            
            // Check if the service returned an error response
            if (isset($result['success']) && $result['success'] === false) {
                \Log::warning('External API returned error for main dashboard data', [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'service_message' => $result['message'] ?? 'Unknown error'
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Error al conectar con la API externa. Verifique la configuración.',
                    'data' => null,
                    'debug_info' => config('app.debug') ? $result : null
                ], 503); // Service Unavailable
            }
            
            // Ensure the response has a success flag for consistency
            if (!isset($result['success'])) {
                $result['success'] = true;
            }
            
            return response()->json($result);
            
        } catch (\Exception $e) {
            \Log::error('Error fetching main dashboard data', [
                'start_date' => $request->query('start_date'),
                'end_date' => $request->query('end_date'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error interno al procesar la solicitud',
                'data' => null,
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor'
            ], 500);
        }
    }

    public function getWeeklyBatch(GetWeeklyBatchRequest $request): JsonResponse
    {
        try {
            $startTime = microtime(true);
            $validatedData = $request->getValidatedData();
            
            \Log::info('Weekly batch request started', [
                'current_week_range' => $validatedData['current_week_range'],
                'previous_week_range' => $validatedData['previous_week_range'],
                'total_dates' => $validatedData['total_dates'],
            ]);
            
            $result = $this->externalApiService->getWeeklyBatchData(
                $validatedData['current_week'],
                $validatedData['previous_week']
            );
            
            $executionTime = round((microtime(true) - $startTime) * 1000, 2); // milliseconds
            
            \Log::info('Weekly batch request completed', [
                'execution_time_ms' => $executionTime,
                'success' => $result['success'] ?? false,
                'current_week_total' => $result['data']['metadata']['current_week_total'] ?? null,
                'previous_week_total' => $result['data']['metadata']['previous_week_total'] ?? null,
            ]);
            
            // Add performance metadata to response
            $result['data']['metadata']['execution_time_ms'] = $executionTime;
            $result['data']['metadata']['api_optimization'] = '14_calls_to_1_batch';
            
            return response()->json($result);
            
        } catch (\Exception $e) {
            \Log::error('Error fetching weekly batch data', [
                'current_week' => $request->input('current_week'),
                'previous_week' => $request->input('previous_week'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los datos semanales batch',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor',
                'data' => [
                    'current_week' => [],
                    'previous_week' => [],
                    'metadata' => [
                        'error_occurred' => true,
                        'fallback_available' => true
                    ]
                ]
            ], 500);
        }
    }

    public function getMonthlyBatch(GetMonthlyBatchRequest $request): JsonResponse
    {
        try {
            // Override PHP timeout to handle multiple API calls
            set_time_limit(180);
            
            // Enable response compression
            if (!headers_sent()) {
                header('Content-Encoding: gzip');
                ob_start('ob_gzhandler');
            }
            
            $startTime = microtime(true);
            
            // Get validated data from the request
            $validatedData = $request->getValidatedData();
            $currentMonthWeeks = $validatedData['current_month_weeks'];
            $previousMonthWeeks = $validatedData['previous_month_weeks'];
            
            // If both arrays are empty, return empty data structure
            if (empty($currentMonthWeeks) && empty($previousMonthWeeks)) {
                return response()->json([
                    'success' => true,
                    'message' => 'No hay datos para procesar',
                    'data' => [
                        'current_month_weeks' => [],
                        'previous_month_weeks' => [],
                        'metadata' => [
                            'current_month_total' => 0,
                            'previous_month_total' => 0,
                            'total_api_calls' => 0,
                            'error_occurred' => false,
                            'fallback_available' => false
                        ]
                    ]
                ]);
            }
            
            \Log::info('Monthly batch request started', [
                'current_month_weeks' => count($currentMonthWeeks),
                'previous_month_weeks' => count($previousMonthWeeks),
                'total_requests' => count($currentMonthWeeks) + count($previousMonthWeeks),
            ]);
            
            $result = $this->externalApiService->getMonthlyBatchData(
                $currentMonthWeeks,
                $previousMonthWeeks
            );
            
            $executionTime = round((microtime(true) - $startTime) * 1000, 2); // milliseconds
            
            \Log::info('Monthly batch request completed', [
                'execution_time_ms' => $executionTime,
                'success' => $result['success'] ?? false,
                'current_month_total' => $result['data']['metadata']['current_month_total'] ?? null,
                'previous_month_total' => $result['data']['metadata']['previous_month_total'] ?? null,
            ]);
            
            // Add performance metadata to response
            if (isset($result['data']['metadata'])) {
                $result['data']['metadata']['execution_time_ms'] = $executionTime;
                $result['data']['metadata']['api_optimization'] = 'individual_week_calls_to_1_batch';
                $result['data']['metadata']['compression_enabled'] = function_exists('ob_gzhandler');
            }
            
            return response()->json($result, 200, [
                'Cache-Control' => 'public, max-age=300', // 5 minutes cache
                'Vary' => 'Accept-Encoding'
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Error fetching monthly batch data', [
                'current_month_weeks' => $request->input('current_month_weeks'),
                'previous_month_weeks' => $request->input('previous_month_weeks'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los datos mensuales batch',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor',
                'data' => [
                    'current_month_weeks' => [],
                    'previous_month_weeks' => [],
                    'metadata' => [
                        'error_occurred' => true,
                        'fallback_available' => true
                    ]
                ]
            ], 500);
        }
    }

}