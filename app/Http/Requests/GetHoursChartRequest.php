<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GetHoursChartRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date' => [
                'required',
                'date_format:Y-m-d',
                'before_or_equal:today',
                'after:2020-01-01'
            ]
        ];
    }

    public function messages(): array
    {
        return [
            'date.required' => 'La fecha es requerida',
            'date.date_format' => 'La fecha debe tener el formato Y-m-d (ejemplo: 2025-08-20)',
            'date.before_or_equal' => 'La fecha no puede ser futura',
            'date.after' => 'La fecha debe ser posterior al 2020'
        ];
    }

    public function validated($key = null, $default = null)
    {
        $validated = parent::validated();
        
        if ($key) {
            return data_get($validated, $key, $default);
        }
        
        return $validated;
    }
}