<?php

use App\Http\Requests\GetMonthlyBatchRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create([
        'email_verified_at' => now(),
    ]);
    
    $this->validCurrentWeeks = [
        [
            'week_key' => 'week_1',
            'week_name' => 'Semana 1',
            'start_date' => '2025-01-01',
            'end_date' => '2025-01-07'
        ],
        [
            'week_key' => 'week_2',
            'week_name' => 'Semana 2',
            'start_date' => '2025-01-08',
            'end_date' => '2025-01-14'
        ]
    ];
    
    $this->validPreviousWeeks = [
        [
            'week_key' => 'week_1',
            'week_name' => 'Semana 1',
            'start_date' => '2024-12-01',
            'end_date' => '2024-12-07'
        ],
        [
            'week_key' => 'week_2',
            'week_name' => 'Semana 2',
            'start_date' => '2024-12-08',
            'end_date' => '2024-12-14'
        ]
    ];
});

describe('GetMonthlyBatchRequest - Authorization Tests', function () {
    
    it('authorizes authenticated and verified users', function () {
        $this->actingAs($this->user);
        
        $request = new GetMonthlyBatchRequest();
        $request->setUserResolver(fn() => $this->user);
        
        expect($request->authorize())->toBeTrue();
    });
    
    it('denies unauthenticated users', function () {
        $request = new GetMonthlyBatchRequest();
        $request->setUserResolver(fn() => null);
        
        expect($request->authorize())->toBeFalse();
    });
    
    it('denies unverified users', function () {
        $unverifiedUser = User::factory()->create([
            'email_verified_at' => null,
        ]);
        
        $this->actingAs($unverifiedUser);
        
        $request = new GetMonthlyBatchRequest();
        $request->setUserResolver(fn() => $unverifiedUser);
        
        expect($request->authorize())->toBeFalse();
    });
});

describe('GetMonthlyBatchRequest - Basic Validation Tests', function () {
    
    it('validates successfully with valid week data', function () {
        $data = [
            'current_month_weeks' => $this->validCurrentWeeks,
            'previous_month_weeks' => $this->validPreviousWeeks,
        ];
        
        $request = new GetMonthlyBatchRequest();
        $validator = Validator::make($data, $request->rules());
        
        expect($validator->passes())->toBeTrue();
        expect($validator->errors()->isEmpty())->toBeTrue();
    });
    
    it('validates successfully with empty arrays', function () {
        $data = [
            'current_month_weeks' => [],
            'previous_month_weeks' => [],
        ];
        
        $request = new GetMonthlyBatchRequest();
        $validator = Validator::make($data, $request->rules());
        
        expect($validator->passes())->toBeTrue();
    });
    
    it('fails validation when fields are missing', function () {
        $data = []; // No fields provided
        
        $request = new GetMonthlyBatchRequest();
        $validator = Validator::make($data, $request->rules());
        
        expect($validator->fails())->toBeTrue();
        expect($validator->errors()->has('current_month_weeks'))->toBeTrue();
        expect($validator->errors()->has('previous_month_weeks'))->toBeTrue();
    });
    
    it('fails validation when fields are not arrays', function () {
        $data = [
            'current_month_weeks' => 'not-an-array',
            'previous_month_weeks' => 123,
        ];
        
        $request = new GetMonthlyBatchRequest();
        $validator = Validator::make($data, $request->rules());
        
        expect($validator->fails())->toBeTrue();
        expect($validator->errors()->has('current_month_weeks'))->toBeTrue();
        expect($validator->errors()->has('previous_month_weeks'))->toBeTrue();
    });
});

describe('GetMonthlyBatchRequest - Week Structure Validation Tests', function () {
    
    it('validates week structure with all required fields', function () {
        $data = [
            'current_month_weeks' => [
                [
                    'week_key' => 'week_1',
                    'week_name' => 'Primera Semana',
                    'start_date' => '2025-01-01',
                    'end_date' => '2025-01-07'
                ]
            ],
            'previous_month_weeks' => [],
        ];
        
        $request = new GetMonthlyBatchRequest();
        $validator = Validator::make($data, $request->rules());
        
        expect($validator->passes())->toBeTrue();
    });
    
    it('fails validation when week_key is missing', function () {
        $data = [
            'current_month_weeks' => [
                [
                    // week_key missing
                    'week_name' => 'Primera Semana',
                    'start_date' => '2025-01-01',
                    'end_date' => '2025-01-07'
                ]
            ],
            'previous_month_weeks' => [],
        ];
        
        $request = new GetMonthlyBatchRequest();
        $validator = Validator::make($data, $request->rules());
        
        expect($validator->fails())->toBeTrue();
        expect($validator->errors()->has('current_month_weeks.0.week_key'))->toBeTrue();
    });
    
    it('fails validation when week_name is missing', function () {
        $data = [
            'current_month_weeks' => [
                [
                    'week_key' => 'week_1',
                    // week_name missing
                    'start_date' => '2025-01-01',
                    'end_date' => '2025-01-07'
                ]
            ],
            'previous_month_weeks' => [],
        ];
        
        $request = new GetMonthlyBatchRequest();
        $validator = Validator::make($data, $request->rules());
        
        expect($validator->fails())->toBeTrue();
        expect($validator->errors()->has('current_month_weeks.0.week_name'))->toBeTrue();
    });
    
    it('fails validation when start_date is missing', function () {
        $data = [
            'current_month_weeks' => [
                [
                    'week_key' => 'week_1',
                    'week_name' => 'Primera Semana',
                    // start_date missing
                    'end_date' => '2025-01-07'
                ]
            ],
            'previous_month_weeks' => [],
        ];
        
        $request = new GetMonthlyBatchRequest();
        $validator = Validator::make($data, $request->rules());
        
        expect($validator->fails())->toBeTrue();
        expect($validator->errors()->has('current_month_weeks.0.start_date'))->toBeTrue();
    });
    
    it('fails validation when end_date is missing', function () {
        $data = [
            'current_month_weeks' => [
                [
                    'week_key' => 'week_1',
                    'week_name' => 'Primera Semana',
                    'start_date' => '2025-01-01',
                    // end_date missing
                ]
            ],
            'previous_month_weeks' => [],
        ];
        
        $request = new GetMonthlyBatchRequest();
        $validator = Validator::make($data, $request->rules());
        
        expect($validator->fails())->toBeTrue();
        expect($validator->errors()->has('current_month_weeks.0.end_date'))->toBeTrue();
    });
});

describe('GetMonthlyBatchRequest - Date Format Validation Tests', function () {
    
    it('validates correct date format (Y-m-d)', function () {
        $data = [
            'current_month_weeks' => [
                [
                    'week_key' => 'week_1',
                    'week_name' => 'Semana 1',
                    'start_date' => '2025-01-01',
                    'end_date' => '2025-01-07'
                ]
            ],
            'previous_month_weeks' => [],
        ];
        
        $request = new GetMonthlyBatchRequest();
        $validator = Validator::make($data, $request->rules());
        
        expect($validator->passes())->toBeTrue();
    });
    
    it('fails validation with invalid date format', function () {
        $invalidFormats = [
            '01/01/2025',      // US format
            '01-01-2025',      // Dashed format
            '2025/01/01',      // Slashed format
            '1/1/2025',        // Short format
            '2025-1-1',        // No leading zeros
            'invalid-date',    // Invalid string
            '2025-13-01',      // Invalid month
            '2025-01-32',      // Invalid day
        ];
        
        foreach ($invalidFormats as $invalidFormat) {
            $data = [
                'current_month_weeks' => [
                    [
                        'week_key' => 'week_1',
                        'week_name' => 'Semana 1',
                        'start_date' => $invalidFormat,
                        'end_date' => '2025-01-07'
                    ]
                ],
                'previous_month_weeks' => [],
            ];
            
            $request = new GetMonthlyBatchRequest();
            $validator = Validator::make($data, $request->rules());
            
            expect($validator->fails())->toBeTrue("Format {$invalidFormat} should fail validation");
            expect($validator->errors()->has('current_month_weeks.0.start_date'))->toBeTrue();
        }
    });
    
    it('validates that end_date is after or equal to start_date', function () {
        $data = [
            'current_month_weeks' => [
                [
                    'week_key' => 'week_1',
                    'week_name' => 'Semana 1',
                    'start_date' => '2025-01-01',
                    'end_date' => '2025-01-07' // Valid: after start_date
                ],
                [
                    'week_key' => 'week_2',
                    'week_name' => 'Semana 2',
                    'start_date' => '2025-01-08',
                    'end_date' => '2025-01-08' // Valid: equal to start_date
                ]
            ],
            'previous_month_weeks' => [],
        ];
        
        $request = new GetMonthlyBatchRequest();
        $validator = Validator::make($data, $request->rules());
        
        expect($validator->passes())->toBeTrue();
    });
    
    it('fails validation when end_date is before start_date', function () {
        $data = [
            'current_month_weeks' => [
                [
                    'week_key' => 'week_1',
                    'week_name' => 'Semana 1',
                    'start_date' => '2025-01-07',
                    'end_date' => '2025-01-01' // Invalid: before start_date
                ]
            ],
            'previous_month_weeks' => [],
        ];
        
        $request = new GetMonthlyBatchRequest();
        $validator = Validator::make($data, $request->rules());
        
        expect($validator->fails())->toBeTrue();
        expect($validator->errors()->has('current_month_weeks.0.end_date'))->toBeTrue();
    });
});

describe('GetMonthlyBatchRequest - Field Length Validation Tests', function () {
    
    it('validates reasonable field lengths', function () {
        $data = [
            'current_month_weeks' => [
                [
                    'week_key' => 'week_1',
                    'week_name' => 'Primera Semana del Mes',
                    'start_date' => '2025-01-01',
                    'end_date' => '2025-01-07'
                ]
            ],
            'previous_month_weeks' => [],
        ];
        
        $request = new GetMonthlyBatchRequest();
        $validator = Validator::make($data, $request->rules());
        
        expect($validator->passes())->toBeTrue();
    });
    
    it('fails validation when week_key is too long', function () {
        $data = [
            'current_month_weeks' => [
                [
                    'week_key' => str_repeat('a', 51), // 51 characters (max is 50)
                    'week_name' => 'Semana 1',
                    'start_date' => '2025-01-01',
                    'end_date' => '2025-01-07'
                ]
            ],
            'previous_month_weeks' => [],
        ];
        
        $request = new GetMonthlyBatchRequest();
        $validator = Validator::make($data, $request->rules());
        
        expect($validator->fails())->toBeTrue();
        expect($validator->errors()->has('current_month_weeks.0.week_key'))->toBeTrue();
    });
    
    it('fails validation when week_name is too long', function () {
        $data = [
            'current_month_weeks' => [
                [
                    'week_key' => 'week_1',
                    'week_name' => str_repeat('a', 101), // 101 characters (max is 100)
                    'start_date' => '2025-01-01',
                    'end_date' => '2025-01-07'
                ]
            ],
            'previous_month_weeks' => [],
        ];
        
        $request = new GetMonthlyBatchRequest();
        $validator = Validator::make($data, $request->rules());
        
        expect($validator->fails())->toBeTrue();
        expect($validator->errors()->has('current_month_weeks.0.week_name'))->toBeTrue();
    });
    
    it('fails validation when too many weeks are provided', function () {
        $tooManyWeeks = [];
        for ($i = 1; $i <= 11; $i++) { // 11 weeks (max is 10)
            $tooManyWeeks[] = [
                'week_key' => "week_{$i}",
                'week_name' => "Semana {$i}",
                'start_date' => "2025-01-" . str_pad($i, 2, '0', STR_PAD_LEFT),
                'end_date' => "2025-01-" . str_pad($i + 1, 2, '0', STR_PAD_LEFT)
            ];
        }
        
        $data = [
            'current_month_weeks' => $tooManyWeeks,
            'previous_month_weeks' => [],
        ];
        
        $request = new GetMonthlyBatchRequest();
        $validator = Validator::make($data, $request->rules());
        
        expect($validator->fails())->toBeTrue();
        expect($validator->errors()->has('current_month_weeks'))->toBeTrue();
    });
});

describe('GetMonthlyBatchRequest - Custom Validation Tests', function () {
    
    it('passes custom validation with proper week structure', function () {
        $data = [
            'current_month_weeks' => [
                [
                    'week_key' => 'week_1',
                    'week_name' => 'Semana 1',
                    'start_date' => '2025-01-01',
                    'end_date' => '2025-01-07' // 7 days difference
                ]
            ],
            'previous_month_weeks' => [],
        ];
        
        $request = GetMonthlyBatchRequest::create('/test', 'POST', $data);
        $request->setUserResolver(fn() => $this->user);
        
        // This should not throw an exception
        $validated = $request->validate($request->rules());
        expect($validated)->toBeArray();
    });
    
    it('fails custom validation when week is longer than 7 days', function () {
        $data = [
            'current_month_weeks' => [
                [
                    'week_key' => 'week_1',
                    'week_name' => 'Semana 1',
                    'start_date' => '2025-01-01',
                    'end_date' => '2025-01-15' // 14 days difference (too long)
                ]
            ],
            'previous_month_weeks' => [],
        ];
        
        $request = GetMonthlyBatchRequest::create('/test', 'POST', $data);
        $request->setUserResolver(fn() => $this->user);
        
        $validator = Validator::make($data, $request->rules());
        $request->withValidator($validator);
        
        expect($validator->fails())->toBeTrue();
        expect($validator->errors()->has('current_month_weeks.0.end_date'))->toBeTrue();
    });
    
    it('fails custom validation when weeks overlap', function () {
        $data = [
            'current_month_weeks' => [
                [
                    'week_key' => 'week_1',
                    'week_name' => 'Semana 1',
                    'start_date' => '2025-01-01',
                    'end_date' => '2025-01-07'
                ],
                [
                    'week_key' => 'week_2',
                    'week_name' => 'Semana 2',
                    'start_date' => '2025-01-05', // Overlaps with week 1
                    'end_date' => '2025-01-12'
                ]
            ],
            'previous_month_weeks' => [],
        ];
        
        $request = GetMonthlyBatchRequest::create('/test', 'POST', $data);
        $request->setUserResolver(fn() => $this->user);
        
        $validator = Validator::make($data, $request->rules());
        $request->withValidator($validator);
        
        expect($validator->fails())->toBeTrue();
        expect($validator->errors()->has('current_month_weeks.1'))->toBeTrue();
    });
    
    it('fails custom validation when dates are too far in the past', function () {
        $data = [
            'current_month_weeks' => [
                [
                    'week_key' => 'week_1',
                    'week_name' => 'Semana 1',
                    'start_date' => '2018-01-01', // More than 5 years ago
                    'end_date' => '2018-01-07'
                ]
            ],
            'previous_month_weeks' => [],
        ];
        
        $request = GetMonthlyBatchRequest::create('/test', 'POST', $data);
        $request->setUserResolver(fn() => $this->user);
        
        $validator = Validator::make($data, $request->rules());
        $request->withValidator($validator);
        
        expect($validator->fails())->toBeTrue();
        expect($validator->errors()->has('date_range'))->toBeTrue();
    });
    
    it('fails custom validation when dates are too far in the future', function () {
        $data = [
            'current_month_weeks' => [
                [
                    'week_key' => 'week_1',
                    'week_name' => 'Semana 1',
                    'start_date' => '2030-01-01', // More than 2 years in future
                    'end_date' => '2030-01-07'
                ]
            ],
            'previous_month_weeks' => [],
        ];
        
        $request = GetMonthlyBatchRequest::create('/test', 'POST', $data);
        $request->setUserResolver(fn() => $this->user);
        
        $validator = Validator::make($data, $request->rules());
        $request->withValidator($validator);
        
        expect($validator->fails())->toBeTrue();
        expect($validator->errors()->has('date_range'))->toBeTrue();
    });
});

describe('GetMonthlyBatchRequest - Helper Methods Tests', function () {
    
    it('provides enhanced validated data with metadata', function () {
        $data = [
            'current_month_weeks' => $this->validCurrentWeeks,
            'previous_month_weeks' => $this->validPreviousWeeks,
        ];
        
        $request = GetMonthlyBatchRequest::create('/test', 'POST', $data);
        $request->setUserResolver(fn() => $this->user);
        
        // Mock the validation
        $request->validateResolved();
        
        $validatedData = $request->getValidatedData();
        
        expect($validatedData)->toHaveKey('metadata');
        expect($validatedData['metadata'])->toHaveKeys([
            'current_week_count',
            'previous_week_count',
            'total_weeks',
            'validation_timestamp',
            'current_month_range',
            'previous_month_range'
        ]);
        
        expect($validatedData['metadata']['current_week_count'])->toBe(2);
        expect($validatedData['metadata']['previous_week_count'])->toBe(2);
        expect($validatedData['metadata']['total_weeks'])->toBe(4);
        expect($validatedData['metadata']['current_month_range']['start'])->toBe('2025-01-01');
        expect($validatedData['metadata']['current_month_range']['end'])->toBe('2025-01-14');
    });
    
    it('handles empty arrays in metadata calculation', function () {
        $data = [
            'current_month_weeks' => [],
            'previous_month_weeks' => [],
        ];
        
        $request = GetMonthlyBatchRequest::create('/test', 'POST', $data);
        $request->setUserResolver(fn() => $this->user);
        
        $request->validateResolved();
        $validatedData = $request->getValidatedData();
        
        expect($validatedData['metadata']['current_week_count'])->toBe(0);
        expect($validatedData['metadata']['previous_week_count'])->toBe(0);
        expect($validatedData['metadata']['total_weeks'])->toBe(0);
        expect($validatedData['metadata'])->not->toHaveKey('current_month_range');
        expect($validatedData['metadata'])->not->toHaveKey('previous_month_range');
    });
    
    it('prepares data correctly when fields are missing', function () {
        $data = []; // No fields provided
        
        $request = GetMonthlyBatchRequest::create('/test', 'POST', $data);
        $request->setUserResolver(fn() => $this->user);
        
        // The prepareForValidation method should add empty arrays
        expect($request->input('current_month_weeks'))->toBe([]);
        expect($request->input('previous_month_weeks'))->toBe([]);
    });
});

describe('GetMonthlyBatchRequest - Error Messages Tests', function () {
    
    it('provides Spanish error messages', function () {
        $data = [
            'current_month_weeks' => 'not-an-array',
            'previous_month_weeks' => 123,
        ];
        
        $request = new GetMonthlyBatchRequest();
        $validator = Validator::make($data, $request->rules(), $request->messages());
        
        expect($validator->fails())->toBeTrue();
        
        $errors = $validator->errors()->toArray();
        expect($errors['current_month_weeks'][0])->toContain('debe ser un array');
        expect($errors['previous_month_weeks'][0])->toContain('debe ser un array');
    });
    
    it('provides meaningful attribute names in Spanish', function () {
        $data = [
            'current_month_weeks' => [
                [
                    'week_key' => '',
                    'week_name' => '',
                    'start_date' => 'invalid-date',
                    'end_date' => 'invalid-date'
                ]
            ],
            'previous_month_weeks' => [],
        ];
        
        $request = new GetMonthlyBatchRequest();
        $validator = Validator::make($data, $request->rules(), $request->messages(), $request->attributes());
        
        expect($validator->fails())->toBeTrue();
        
        $errors = $validator->errors()->toArray();
        
        // Check that custom attributes are used in error messages
        foreach ($errors as $field => $messages) {
            foreach ($messages as $message) {
                // Should contain Spanish terms from attributes
                expect($message)->toMatch('/(clave de semana|nombre de semana|fecha de inicio|fecha de fin)/');
            }
        }
    });
});

describe('GetMonthlyBatchRequest - Performance Validation Tests', function () {
    
    it('validates large but reasonable datasets efficiently', function () {
        // Create 10 weeks (maximum allowed)
        $currentWeeks = [];
        $previousWeeks = [];
        
        for ($i = 1; $i <= 10; $i++) {
            $currentWeeks[] = [
                'week_key' => "week_{$i}",
                'week_name' => "Semana {$i}",
                'start_date' => "2025-01-" . str_pad($i, 2, '0', STR_PAD_LEFT),
                'end_date' => "2025-01-" . str_pad($i + 1, 2, '0', STR_PAD_LEFT)
            ];
            
            $previousWeeks[] = [
                'week_key' => "week_{$i}",
                'week_name' => "Semana {$i}",
                'start_date' => "2024-12-" . str_pad($i, 2, '0', STR_PAD_LEFT),
                'end_date' => "2024-12-" . str_pad($i + 1, 2, '0', STR_PAD_LEFT)
            ];
        }
        
        $data = [
            'current_month_weeks' => $currentWeeks,
            'previous_month_weeks' => $previousWeeks,
        ];
        
        $startTime = microtime(true);
        
        $request = new GetMonthlyBatchRequest();
        $validator = Validator::make($data, $request->rules());
        
        $endTime = microtime(true);
        $validationTime = ($endTime - $startTime) * 1000; // Convert to milliseconds
        
        expect($validator->passes())->toBeTrue();
        expect($validationTime)->toBeLessThan(100); // Should validate in under 100ms
    });
});