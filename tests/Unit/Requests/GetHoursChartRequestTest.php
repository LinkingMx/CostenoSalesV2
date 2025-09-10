<?php

use App\Http\Requests\GetHoursChartRequest;
use Illuminate\Support\Facades\Validator;

describe('GetHoursChartRequest Validation', function () {
    
    beforeEach(function () {
        $this->request = new GetHoursChartRequest();
    });

    it('authorizes all users by default', function () {
        expect($this->request->authorize())->toBe(true);
    });

    describe('Date Validation Rules', function () {
        it('passes validation with valid date', function () {
            $data = ['date' => '2025-01-15'];
            $validator = Validator::make($data, $this->request->rules());
            
            expect($validator->passes())->toBe(true);
        });

        it('fails validation when date is missing', function () {
            $data = [];
            $validator = Validator::make($data, $this->request->rules());
            
            expect($validator->fails())->toBe(true);
            expect($validator->errors()->has('date'))->toBe(true);
        });

        it('fails validation with invalid date format', function () {
            $invalidDates = [
                '2025/01/15',  // Wrong separator
                '15-01-2025',  // Wrong order
                '2025-1-15',   // Missing zero padding
                '2025-01-32',  // Invalid day
                '2025-13-01',  // Invalid month
                'invalid-date' // Completely invalid
            ];

            foreach ($invalidDates as $date) {
                $data = ['date' => $date];
                $validator = Validator::make($data, $this->request->rules());
                
                expect($validator->fails())
                    ->toBe(true, "Date '{$date}' should fail validation");
                expect($validator->errors()->has('date'))
                    ->toBe(true, "Date '{$date}' should have validation error");
            }
        });

        it('fails validation with future dates', function () {
            $futureDate = now()->addDays(1)->format('Y-m-d');
            $data = ['date' => $futureDate];
            $validator = Validator::make($data, $this->request->rules());
            
            expect($validator->fails())->toBe(true);
            expect($validator->errors()->has('date'))->toBe(true);
        });

        it('passes validation with today\'s date', function () {
            $today = now()->format('Y-m-d');
            $data = ['date' => $today];
            $validator = Validator::make($data, $this->request->rules());
            
            expect($validator->passes())->toBe(true);
        });

        it('fails validation with dates before 2020', function () {
            $oldDates = [
                '2019-12-31',
                '2010-01-01',
                '1999-01-01'
            ];

            foreach ($oldDates as $date) {
                $data = ['date' => $date];
                $validator = Validator::make($data, $this->request->rules());
                
                expect($validator->fails())
                    ->toBe(true, "Date '{$date}' should fail validation");
                expect($validator->errors()->has('date'))
                    ->toBe(true, "Date '{$date}' should have validation error");
            }
        });

        it('passes validation with valid dates from 2020 onwards', function () {
            $validDates = [
                '2020-01-01',  // Earliest valid date
                '2023-06-15',  // Mid-range date
                '2024-12-31',  // Recent date
                now()->format('Y-m-d') // Today
            ];

            foreach ($validDates as $date) {
                $data = ['date' => $date];
                $validator = Validator::make($data, $this->request->rules());
                
                expect($validator->passes())
                    ->toBe(true, "Date '{$date}' should pass validation");
            }
        });
    });

    describe('Custom Error Messages', function () {
        it('returns correct error message for required field', function () {
            $data = [];
            $validator = Validator::make($data, $this->request->rules(), $this->request->messages());
            
            expect($validator->errors()->first('date'))->toBe('La fecha es requerida');
        });

        it('returns correct error message for invalid format', function () {
            $data = ['date' => 'invalid-format'];
            $validator = Validator::make($data, $this->request->rules(), $this->request->messages());
            
            expect($validator->errors()->first('date'))
                ->toBe('La fecha debe tener el formato Y-m-d (ejemplo: 2025-08-20)');
        });

        it('returns correct error message for future dates', function () {
            $futureDate = now()->addDays(1)->format('Y-m-d');
            $data = ['date' => $futureDate];
            $validator = Validator::make($data, $this->request->rules(), $this->request->messages());
            
            expect($validator->errors()->first('date'))->toBe('La fecha no puede ser futura');
        });

        it('returns correct error message for dates before 2020', function () {
            $data = ['date' => '2019-12-31'];
            $validator = Validator::make($data, $this->request->rules(), $this->request->messages());
            
            expect($validator->errors()->first('date'))->toBe('La fecha debe ser posterior al 2020');
        });
    });

    describe('Validated Method', function () {
        it('returns all validated data when no key is specified', function () {
            $mockValidator = Mockery::mock();
            $mockValidator->shouldReceive('validated')
                         ->once()
                         ->andReturn(['date' => '2025-01-15']);

            // Create a partial mock of the request
            $request = Mockery::mock(GetHoursChartRequest::class)->makePartial();
            $request->shouldReceive('parent::validated')
                   ->andReturn(['date' => '2025-01-15']);

            $result = $request->validated();
            
            expect($result)->toBe(['date' => '2025-01-15']);
        });

        it('returns specific key when requested', function () {
            $request = Mockery::mock(GetHoursChartRequest::class)->makePartial();
            $request->shouldReceive('parent::validated')
                   ->andReturn(['date' => '2025-01-15']);

            $result = $request->validated('date');
            
            expect($result)->toBe('2025-01-15');
        });

        it('returns default value for non-existent key', function () {
            $request = Mockery::mock(GetHoursChartRequest::class)->makePartial();
            $request->shouldReceive('parent::validated')
                   ->andReturn(['date' => '2025-01-15']);

            $result = $request->validated('non_existent_key', 'default_value');
            
            expect($result)->toBe('default_value');
        });
    });

    describe('Edge Cases', function () {
        it('handles leap year dates correctly', function () {
            $leapYearDate = '2024-02-29';
            $data = ['date' => $leapYearDate];
            $validator = Validator::make($data, $this->request->rules());
            
            expect($validator->passes())->toBe(true);
        });

        it('fails validation for invalid leap year dates', function () {
            $invalidLeapYearDate = '2023-02-29'; // 2023 is not a leap year
            $data = ['date' => $invalidLeapYearDate];
            $validator = Validator::make($data, $this->request->rules());
            
            expect($validator->fails())->toBe(true);
        });

        it('handles boundary dates correctly', function () {
            $boundaryDates = [
                '2020-01-01', // Should pass (exactly on boundary)
                '2019-12-31', // Should fail (one day before boundary)
                now()->format('Y-m-d'), // Should pass (today)
                now()->addDay()->format('Y-m-d'), // Should fail (tomorrow)
            ];

            $expectedResults = [true, false, true, false];

            foreach ($boundaryDates as $index => $date) {
                $data = ['date' => $date];
                $validator = Validator::make($data, $this->request->rules());
                
                expect($validator->passes())
                    ->toBe($expectedResults[$index], "Date '{$date}' validation result is incorrect");
            }
        });
    });
});