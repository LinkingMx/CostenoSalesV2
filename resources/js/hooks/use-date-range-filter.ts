import { useState, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { DateRange } from 'react-day-picker'

export interface UseDateRangeFilterOptions {
  defaultDateRange?: DateRange
}

export function useDateRangeFilter(options: UseDateRangeFilterOptions = {}) {
  const { defaultDateRange } = options

  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultDateRange)

  // Convert DateRange to string format
  const { startDate, endDate } = useMemo(() => {
    if (!dateRange?.from) {
      return { startDate: '', endDate: '' }
    }

    const start = format(dateRange.from, 'yyyy-MM-dd')
    const end = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : start

    return { startDate: start, endDate: end }
  }, [dateRange])

  const updateDateRange = useCallback((newRange: DateRange | undefined) => {
    setDateRange(newRange)
  }, [])

  const clearDateRange = useCallback(() => {
    setDateRange(undefined)
  }, [])

  return {
    // Date range state
    dateRange,
    updateDateRange,
    clearDateRange,
    
    // Computed values
    startDate,
    endDate,
    hasValidRange: !!startDate && !!endDate,
    
    // Demo data (simple state)
    data: null,
    loading: false,
    error: null,
    
    // Placeholder actions
    refetch: () => Promise.resolve(),
  }
}