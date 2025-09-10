<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;

class GetWeeklyBatchRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'current_week' => 'required|array|size:7',
            'current_week.*' => 'required|date_format:Y-m-d',
            'previous_week' => 'required|array|size:7',
            'previous_week.*' => 'required|date_format:Y-m-d',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'current_week.required' => 'Los datos de la semana actual son requeridos',
            'current_week.array' => 'Los datos de la semana actual deben ser un arreglo',
            'current_week.size' => 'La semana actual debe contener exactamente 7 días',
            'current_week.*.required' => 'Cada día de la semana actual es requerido',
            'current_week.*.date_format' => 'El formato de fecha debe ser Y-m-d (ej: 2025-09-09)',
            'previous_week.required' => 'Los datos de la semana anterior son requeridos',
            'previous_week.array' => 'Los datos de la semana anterior deben ser un arreglo',
            'previous_week.size' => 'La semana anterior debe contener exactamente 7 días',
            'previous_week.*.required' => 'Cada día de la semana anterior es requerido',
            'previous_week.*.date_format' => 'El formato de fecha debe ser Y-m-d (ej: 2025-09-02)',
        ];
    }

    /**
     * Handle a failed validation attempt.
     */
    protected function failedValidation(\Illuminate\Contracts\Validation\Validator $validator)
    {
        $response = response()->json([
            'success' => false,
            'message' => 'Errores de validación en la solicitud batch',
            'errors' => $validator->errors()->toArray(),
        ], 422);

        throw new ValidationException($validator, $response);
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // Additional validation: ensure dates are in chronological order within each week
            $currentWeek = $this->input('current_week', []);
            $previousWeek = $this->input('previous_week', []);

            if (is_array($currentWeek) && count($currentWeek) === 7) {
                $this->validateWeekOrder($validator, $currentWeek, 'current_week');
            }

            if (is_array($previousWeek) && count($previousWeek) === 7) {
                $this->validateWeekOrder($validator, $previousWeek, 'previous_week');
            }

            // Validate that previous week is actually before current week
            if (is_array($currentWeek) && is_array($previousWeek) && 
                count($currentWeek) === 7 && count($previousWeek) === 7) {
                $this->validateWeekSequence($validator, $currentWeek, $previousWeek);
            }
        });
    }

    /**
     * Validate that dates within a week are in chronological order.
     */
    private function validateWeekOrder($validator, array $week, string $fieldName): void
    {
        $sortedWeek = $week;
        sort($sortedWeek);
        
        if ($week !== $sortedWeek) {
            $validator->errors()->add($fieldName, 
                'Las fechas de la semana deben estar en orden cronológico');
        }
    }

    /**
     * Validate that previous week comes before current week.
     */
    private function validateWeekSequence($validator, array $currentWeek, array $previousWeek): void
    {
        $currentStart = min($currentWeek);
        $previousEnd = max($previousWeek);
        
        if ($previousEnd >= $currentStart) {
            $validator->errors()->add('previous_week', 
                'La semana anterior debe ser cronológicamente anterior a la semana actual');
        }
    }

    /**
     * Get the validated input data with additional computed values.
     */
    public function getValidatedData(): array
    {
        $validated = $this->validated();
        
        return [
            'current_week' => $validated['current_week'],
            'previous_week' => $validated['previous_week'],
            'current_week_range' => [
                'start' => min($validated['current_week']),
                'end' => max($validated['current_week'])
            ],
            'previous_week_range' => [
                'start' => min($validated['previous_week']),
                'end' => max($validated['previous_week'])
            ],
            'total_dates' => count($validated['current_week']) + count($validated['previous_week']),
        ];
    }
}