# Dashboard Date Filter Management

## Overview
This document provides comprehensive guidance on managing and using the dashboard date filter system in Costeno Sales V2. The date filter is a sophisticated component that enables users to filter dashboard data by specific time periods using both preset options and custom date ranges.

## Architecture

### Core Components

#### DateRangePicker Component
**Location**: `/resources/js/components/date-range-picker.tsx`

The main UI component that provides the date filtering interface. It combines:
- A trigger button displaying the selected date range
- A popover containing preset options and calendar
- Responsive design for mobile and desktop

**Key Features**:
- Grouped preset options with visual separators
- Interactive calendar with range selection
- Smart UX: Auto-apply preset selections with immediate closure
- Conditional UI: Cancel/Apply buttons only appear for custom date selections
- Spanish localization support
- Mobile-optimized touch targets

#### useDateRangeFilter Hook
**Location**: `/resources/js/hooks/use-date-range-filter.ts`

Custom React hook that manages date filter state and integrates with the dashboard API.

**Functionality**:
- Manages date range state
- Handles API integration for data fetching
- Provides loading, error, and data states
- Supports automatic data fetching on date changes

#### useMediaQuery Hook
**Location**: `/resources/js/hooks/use-media-query.ts`

Utility hook for responsive design implementation.

**Purpose**:
- Detects screen size changes
- Enables responsive calendar layout (single/dual month)
- Provides mobile/desktop adaptation

## Configuration

### Date Range Presets

The filter includes predefined time periods organized in logical groups:

```typescript
const dateRangePresetGroups: DateRangePresetGroup[] = [
  {
    label: "Días específicos",
    presets: [
      { label: "Hoy", value: "today", range: () => ({...}) },
      { label: "Ayer", value: "yesterday", range: () => ({...}) }
    ]
  },
  {
    label: "Por días", 
    presets: [
      { label: "Últimos 7 días", value: "last_7_days", range: () => ({...}) },
      { label: "Últimos 30 días", value: "last_30_days", range: () => ({...}) }
    ]
  },
  {
    label: "Por semana",
    presets: [
      { label: "Esta semana", value: "this_week", range: () => ({...}) },
      { label: "Semana pasada", value: "last_week", range: () => ({...}) }
    ]
  },
  {
    label: "Por mes",
    presets: [
      { label: "Este mes", value: "this_month", range: () => ({...}) },
      { label: "Mes pasado", value: "last_month", range: () => ({...}) }
    ]
  }
];
```

### Adding New Presets

To add new preset options:

1. **Define the preset** in the appropriate group:
```typescript
{
  label: "Nuevo Período",
  value: "new_period",
  range: () => ({
    from: startOfDay(/* your date calculation */),
    to: endOfDay(/* your date calculation */)
  })
}
```

2. **Consider grouping** - Add to existing group or create a new group if needed:
```typescript
{
  label: "Nueva Categoría",
  presets: [/* your new presets */]
}
```

## User Experience (UX) Behavior

### Smart Interaction Patterns

The date filter implements intelligent UX patterns to minimize user friction:

#### Preset Selection Behavior
- **Immediate Application**: When users select a preset option (e.g., "Hoy", "Esta semana"), the filter:
  1. Applies the selection instantly
  2. Triggers the onChange callback
  3. Closes the popover automatically
  4. Updates the displayed date range

#### Custom Date Selection Behavior  
- **Deliberate Confirmation**: When users interact with the calendar for custom ranges:
  1. Changes are stored in temporary state
  2. Cancel/Apply buttons appear at the bottom
  3. Users must explicitly confirm their selection
  4. Popover remains open until action is taken

#### Conditional UI Elements
```typescript
// Action buttons only show for custom selections without presets
{tempDate && !selectedPreset && (
  <div className="flex gap-2 pt-2 border-t">
    <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
    <Button onClick={handleApply}>Aplicar</Button>
  </div>
)}
```

This approach provides:
- **Fast workflow** for common date ranges (presets)
- **Careful consideration** for custom selections
- **Clear visual feedback** about interaction state

## Usage Examples

### Basic Implementation

```typescript
import { DateRangePicker } from '@/components/date-range-picker';
import { useDateRangeFilter } from '@/hooks/use-date-range-filter';
import { subDays, startOfDay, endOfDay } from 'date-fns';

function Dashboard() {
  // Initialize with default date range (last 30 days)
  const defaultDateRange = {
    from: startOfDay(subDays(new Date(), 29)),
    to: endOfDay(new Date()),
  };

  const {
    dateRange,
    updateDateRange,
    data,
    loading,
    error,
    hasValidRange
  } = useDateRangeFilter({
    defaultDateRange,
    autoFetch: true
  });

  return (
    <div className="flex justify-between items-center">
      <div className="flex-1">
        {/* Other dashboard elements */}
      </div>
      <div className="flex-shrink-0">
        <DateRangePicker
          value={dateRange}
          onChange={updateDateRange}
          placeholder="Seleccionar período"
          align="end"
        />
      </div>
    </div>
  );
}
```

### Advanced Usage with Custom Options

```typescript
// Custom hook options
const {
  dateRange,
  updateDateRange,
  data,
  loading,
  error
} = useDateRangeFilter({
  defaultDateRange: customRange,
  autoFetch: false, // Manual fetching
  onDateChange: (newRange) => {
    console.log('Date range changed:', newRange);
  }
});

// Manual data fetching
const handleApplyFilter = () => {
  fetchData(dateRange);
};
```

## API Integration

### Data Flow

1. **User selects date range** → DateRangePicker component
2. **State updated** → useDateRangeFilter hook
3. **API request triggered** → Dashboard API service
4. **Data received** → Component re-renders with new data

### Request Format

The filter converts date ranges to the required API format:

```typescript
{
  start_date: "YYYY-MM-DD", // from date
  end_date: "YYYY-MM-DD"    // to date
}
```

### Error Handling

The hook provides comprehensive error handling:

```typescript
const { error, loading, data } = useDateRangeFilter(options);

// Display error state
if (error) {
  return <ErrorMessage message={error.message} />;
}

// Display loading state  
if (loading) {
  return <LoadingSpinner />;
}

// Display data
return <DashboardContent data={data} />;
```

## Styling and Customization

### Layout Structure

The filter uses a flexible layout system:

```tsx
<div className="flex justify-between items-center">
  <div className="flex-1">
    {/* Left-aligned content */}
  </div>
  <div className="flex-shrink-0">
    {/* Right-aligned filter */}
    <DateRangePicker ... />
  </div>
</div>
```

### Button Styling

The trigger button uses responsive sizing:

```css
.date-picker-button {
  width: auto;
  min-width: 240px;
  max-width: 280px;
}
```

### Mobile Optimization

- Single calendar view on mobile (`numberOfMonths={isMobile ? 1 : 2}`)
- Larger touch targets (`h-9 w-9 sm:h-10 sm:w-10`)
- Responsive popover positioning

## Troubleshooting

### Common Issues

**1. Calendar not opening**
- Check if `isOpen` state is managed correctly
- Verify popover positioning with `align` prop

**2. Dates not applying**
- Ensure Cancel/Apply buttons are working
- Check `tempDate` vs `date` state management

**3. Mobile responsiveness issues**
- Verify `useMediaQuery` hook is working
- Check CSS classes for responsive breakpoints

**4. API integration problems**
- Confirm date format conversion (Date object → YYYY-MM-DD)
- Check API authentication and endpoints

### Debugging

Enable debug logging in the hook:

```typescript
const { data, error, loading } = useDateRangeFilter({
  defaultDateRange,
  autoFetch: true,
  debug: true // Add debug option
});
```

## Best Practices

1. **Always provide a default date range** to avoid empty states
2. **Use proper error boundaries** for API failures
3. **Implement loading states** for better UX
4. **Test on mobile devices** for touch interactions
5. **Validate date ranges** before API calls
6. **Use semantic HTML** for accessibility
7. **Provide clear visual feedback** for selected ranges

## Performance Considerations

- **Debounce API calls** if implementing real-time filtering
- **Cache results** for frequently used date ranges
- **Use React.memo** for expensive calendar renders
- **Lazy load** large date datasets

## Future Enhancements

Potential improvements to consider:

1. **Time selection** support (not just dates)
2. **Comparative date ranges** (e.g., compare periods)
3. **Custom preset creation** by users
4. **Keyboard navigation** support
5. **Export functionality** for selected date ranges
6. **Saved filter preferences** per user