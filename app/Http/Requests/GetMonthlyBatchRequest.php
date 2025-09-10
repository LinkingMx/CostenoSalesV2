<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;

class GetMonthlyBatchRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return auth()->check() && auth()->user()->hasVerifiedEmail();
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'current_month_weeks' => 'present|array|max:10',
            'current_month_weeks.*.week_key' => 'required_with:current_month_weeks.*|string|max:50',
            'current_month_weeks.*.week_name' => 'required_with:current_month_weeks.*|string|max:100',
            'current_month_weeks.*.start_date' => 'required_with:current_month_weeks.*|date_format:Y-m-d',
            'current_month_weeks.*.end_date' => 'required_with:current_month_weeks.*|date_format:Y-m-d|after_or_equal:current_month_weeks.*.start_date',
            
            'previous_month_weeks' => 'present|array|max:10',
            'previous_month_weeks.*.week_key' => 'required_with:previous_month_weeks.*|string|max:50',
            'previous_month_weeks.*.week_name' => 'required_with:previous_month_weeks.*|string|max:100',
            'previous_month_weeks.*.start_date' => 'required_with:previous_month_weeks.*|date_format:Y-m-d',
            'previous_month_weeks.*.end_date' => 'required_with:previous_month_weeks.*|date_format:Y-m-d|after_or_equal:previous_month_weeks.*.start_date',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'current_month_weeks.present' => 'El campo current_month_weeks es requerido (puede estar vacío).',
            'current_month_weeks.array' => 'El campo current_month_weeks debe ser un array.',
            'current_month_weeks.max' => 'No se pueden procesar más de 10 semanas por mes.',
            'current_month_weeks.*.week_key.required_with' => 'El week_key es requerido cuando se proporciona información de semana.',
            'current_month_weeks.*.week_key.string' => 'El week_key debe ser una cadena de texto.',
            'current_month_weeks.*.week_key.max' => 'El week_key no puede tener más de 50 caracteres.',
            'current_month_weeks.*.week_name.required_with' => 'El week_name es requerido cuando se proporciona información de semana.',
            'current_month_weeks.*.week_name.string' => 'El week_name debe ser una cadena de texto.',
            'current_month_weeks.*.week_name.max' => 'El week_name no puede tener más de 100 caracteres.',
            'current_month_weeks.*.start_date.required_with' => 'La fecha de inicio es requerida cuando se proporciona información de semana.',
            'current_month_weeks.*.start_date.date_format' => 'La fecha de inicio debe tener el formato Y-m-d (ejemplo: 2025-01-01).',
            'current_month_weeks.*.end_date.required_with' => 'La fecha de fin es requerida cuando se proporciona información de semana.',
            'current_month_weeks.*.end_date.date_format' => 'La fecha de fin debe tener el formato Y-m-d (ejemplo: 2025-01-07).',
            'current_month_weeks.*.end_date.after_or_equal' => 'La fecha de fin debe ser posterior o igual a la fecha de inicio.',
            
            'previous_month_weeks.present' => 'El campo previous_month_weeks es requerido (puede estar vacío).',
            'previous_month_weeks.array' => 'El campo previous_month_weeks debe ser un array.',
            'previous_month_weeks.max' => 'No se pueden procesar más de 10 semanas por mes.',
            'previous_month_weeks.*.week_key.required_with' => 'El week_key es requerido cuando se proporciona información de semana.',
            'previous_month_weeks.*.week_key.string' => 'El week_key debe ser una cadena de texto.',
            'previous_month_weeks.*.week_key.max' => 'El week_key no puede tener más de 50 caracteres.',
            'previous_month_weeks.*.week_name.required_with' => 'El week_name es requerido cuando se proporciona información de semana.',
            'previous_month_weeks.*.week_name.string' => 'El week_name debe ser una cadena de texto.',
            'previous_month_weeks.*.week_name.max' => 'El week_name no puede tener más de 100 caracteres.',
            'previous_month_weeks.*.start_date.required_with' => 'La fecha de inicio es requerida cuando se proporciona información de semana.',
            'previous_month_weeks.*.start_date.date_format' => 'La fecha de inicio debe tener el formato Y-m-d (ejemplo: 2024-12-01).',
            'previous_month_weeks.*.end_date.required_with' => 'La fecha de fin es requerida cuando se proporciona información de semana.',
            'previous_month_weeks.*.end_date.date_format' => 'La fecha de fin debe tener el formato Y-m-d (ejemplo: 2024-12-07).',
            'previous_month_weeks.*.end_date.after_or_equal' => 'La fecha de fin debe ser posterior o igual a la fecha de inicio.',
        ];
    }

    /**
     * Get custom attribute names for validation errors.
     */
    public function attributes(): array
    {
        return [
            'current_month_weeks' => 'semanas del mes actual',
            'current_month_weeks.*.week_key' => 'clave de semana',
            'current_month_weeks.*.week_name' => 'nombre de semana',
            'current_month_weeks.*.start_date' => 'fecha de inicio',
            'current_month_weeks.*.end_date' => 'fecha de fin',
            'previous_month_weeks' => 'semanas del mes anterior',
            'previous_month_weeks.*.week_key' => 'clave de semana',
            'previous_month_weeks.*.week_name' => 'nombre de semana',
            'previous_month_weeks.*.start_date' => 'fecha de inicio',
            'previous_month_weeks.*.end_date' => 'fecha de fin',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Ensure arrays are present even if not provided
        if (!$this->has('current_month_weeks')) {
            $this->merge(['current_month_weeks' => []]);
        }
        
        if (!$this->has('previous_month_weeks')) {
            $this->merge(['previous_month_weeks' => []]);
        }
    }

    /**
     * Handle a failed validation attempt.
     */
    protected function failedValidation(\Illuminate\Contracts\Validation\Validator $validator): void
    {
        $errors = $validator->errors()->toArray();
        
        \Log::warning('Monthly batch request validation failed', [
            'errors' => $errors,
            'input' => $this->safe()->except(['_token']),
            'user_id' => auth()->id(),
            'ip' => $this->ip(),
            'user_agent' => $this->userAgent(),
        ]);
        
        throw new ValidationException($validator);
    }

    /**
     * Get validated data with additional processing.
     */
    public function getValidatedData(): array
    {
        $validated = $this->validated();
        
        // Add metadata about the request
        $metadata = [
            'current_week_count' => count($validated['current_month_weeks']),
            'previous_week_count' => count($validated['previous_month_weeks']),
            'total_weeks' => count($validated['current_month_weeks']) + count($validated['previous_month_weeks']),
            'validation_timestamp' => now()->toISOString(),
        ];
        
        // Calculate date ranges if data is present
        if (!empty($validated['current_month_weeks'])) {
            $currentDates = array_column($validated['current_month_weeks'], 'start_date');
            $currentDates = array_merge($currentDates, array_column($validated['current_month_weeks'], 'end_date'));
            $metadata['current_month_range'] = [
                'start' => min($currentDates),
                'end' => max($currentDates)
            ];
        }
        
        if (!empty($validated['previous_month_weeks'])) {
            $previousDates = array_column($validated['previous_month_weeks'], 'start_date');
            $previousDates = array_merge($previousDates, array_column($validated['previous_month_weeks'], 'end_date'));
            $metadata['previous_month_range'] = [
                'start' => min($previousDates),
                'end' => max($previousDates)
            ];
        }
        
        return array_merge($validated, ['metadata' => $metadata]);
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(\Illuminate\Validation\Validator $validator): void
    {
        $validator->after(function ($validator) {
            // Custom validation: Check for logical date consistency within weeks
            $this->validateWeekDateConsistency($validator, 'current_month_weeks');
            $this->validateWeekDateConsistency($validator, 'previous_month_weeks');
            
            // Custom validation: Check for overlapping weeks
            $this->validateNoOverlappingWeeks($validator, 'current_month_weeks');
            $this->validateNoOverlappingWeeks($validator, 'previous_month_weeks');
            
            // Custom validation: Check for reasonable date ranges (not too far in past/future)
            $this->validateReasonableDateRanges($validator);
        });
    }

    /**
     * Validate week date consistency within each week.
     */
    private function validateWeekDateConsistency(\Illuminate\Validation\Validator $validator, string $field): void
    {
        $weeks = $this->input($field, []);
        
        foreach ($weeks as $index => $week) {
            if (isset($week['start_date']) && isset($week['end_date'])) {
                $startDate = \Carbon\Carbon::parse($week['start_date']);
                $endDate = \Carbon\Carbon::parse($week['end_date']);
                
                // Check if end date is not more than 7 days after start date (reasonable week length)
                if ($endDate->diffInDays($startDate) > 7) {
                    $validator->errors()->add(
                        "{$field}.{$index}.end_date",
                        'La diferencia entre fecha de inicio y fin no puede ser mayor a 7 días para una semana.'
                    );
                }
            }
        }
    }

    /**
     * Validate that weeks don't overlap within the same month.
     */
    private function validateNoOverlappingWeeks(\Illuminate\Validation\Validator $validator, string $field): void
    {
        $weeks = $this->input($field, []);
        
        for ($i = 0; $i < count($weeks); $i++) {
            for ($j = $i + 1; $j < count($weeks); $j++) {
                $week1 = $weeks[$i];
                $week2 = $weeks[$j];
                
                if (isset($week1['start_date'], $week1['end_date'], $week2['start_date'], $week2['end_date'])) {
                    $start1 = \Carbon\Carbon::parse($week1['start_date']);
                    $end1 = \Carbon\Carbon::parse($week1['end_date']);
                    $start2 = \Carbon\Carbon::parse($week2['start_date']);
                    $end2 = \Carbon\Carbon::parse($week2['end_date']);
                    
                    // Check for overlap
                    if (($start1 <= $end2) && ($end1 >= $start2)) {
                        $validator->errors()->add(
                            "{$field}.{$j}",
                            "La semana '" . ($week2['week_name'] ?: $week2['week_key']) . "' se superpone con otra semana en el mismo período."
                        );
                    }
                }
            }
        }
    }

    /**
     * Validate that date ranges are reasonable (not too far in past/future).
     */
    private function validateReasonableDateRanges(\Illuminate\Validation\Validator $validator): void
    {
        $now = \Carbon\Carbon::now();
        $maxPastYears = 5;
        $maxFutureYears = 2;
        
        $allWeeks = array_merge(
            $this->input('current_month_weeks', []),
            $this->input('previous_month_weeks', [])
        );
        
        foreach ($allWeeks as $week) {
            if (isset($week['start_date'])) {
                $startDate = \Carbon\Carbon::parse($week['start_date']);
                
                if ($startDate->diffInYears($now) > $maxPastYears && $startDate->isPast()) {
                    $validator->errors()->add(
                        'date_range',
                        "Las fechas no pueden ser de más de {$maxPastYears} años en el pasado."
                    );
                }
                
                if ($startDate->diffInYears($now) > $maxFutureYears && $startDate->isFuture()) {
                    $validator->errors()->add(
                        'date_range',
                        "Las fechas no pueden ser de más de {$maxFutureYears} años en el futuro."
                    );
                }
            }
        }
    }
}