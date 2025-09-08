# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Main Development
- `composer run dev` - Start full development environment (Laravel server, queue listener, logs, and Vite dev server)
- `composer run dev:ssr` - Start development with SSR support
- `npm run dev` - Start Vite development server only

### Testing
- `composer run test` - Run PHP tests using Pest
- `php artisan test` - Alternative test command

### Code Quality
- `npm run lint` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check formatting without changes
- `npm run types` - TypeScript type checking
- `php artisan pint` - Format PHP code (Laravel Pint)

### Building
- `npm run build` - Build frontend assets for production
- `npm run build:ssr` - Build with SSR support

## Architecture

### Technology Stack
- **Backend**: Laravel 12 with PHP 8.2+
- **Frontend**: React with TypeScript and Inertia.js
- **UI Components**: Radix UI with Tailwind CSS v4
- **Testing**: Pest for PHP, ESLint for JavaScript/TypeScript
- **Build Tool**: Vite with Laravel integration

### Key Directories
- `app/Http/Controllers/` - Laravel controllers
- `resources/js/pages/` - Inertia.js React pages (welcome.tsx, dashboard.tsx)
- `resources/js/components/` - Reusable React components with comprehensive UI system
- `routes/` - Laravel route definitions (web.php, auth.php, settings.php, console.php)
- `database/` - Migrations, factories, and seeders
- `tests/` - PHP test files using Pest

### Frontend Architecture
- **Inertia.js** connects Laravel backend to React frontend
- **Page resolution**: Pages are resolved from `./pages/${name}.tsx` pattern
- **Theme system**: Dark/light mode support with `initializeTheme()` hook
- **Component structure**: Comprehensive component library including app shell, sidebar, navigation, and form components

### Authentication & Routes
- Authentication routes handled in `routes/auth.php`
- Dashboard and authenticated routes require `auth` and `verified` middleware
- Settings routes separated into `routes/settings.php`
- Homepage renders welcome page for unauthenticated users

### Development Workflow
- Uses **concurrently** to run multiple processes (server, queue, logs, vite)
- **Laravel Pail** for log monitoring during development
- **Queue system** with listener for background jobs
- **Hot reload** via Vite integration

## API Integration

### MainDashboardDataAPI
- **Endpoint**: `http://192.168.100.20/api/main_dashboard_data`
- **Method**: POST
- **Authentication**: Bearer token `342|AxRYaMAz4RxhiMwYTXJmUvCXvkjq24MrXW3YgrF91ef9616f`
- **Request Format**:
  ```json
  {
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD"
  }
  ```
- **Headers**:
  - `Accept: application/json`
  - `Content-Type: application/json`
  - `Authorization: Bearer 342|AxRYaMAz4RxhiMwYTXJmUvCXvkjq24MrXW3YgrF91ef9616f`

### API Files Structure
- **Types**: `/resources/js/types/api.ts` - TypeScript definitions for API requests/responses
- **Client**: `/resources/js/services/api/client.ts` - Base HTTP client with authentication and retry logic
- **Dashboard Service**: `/resources/js/services/api/dashboard.ts` - Specialized dashboard API service with date validation
- **React Hooks**: `/resources/js/hooks/use-dashboard-data.ts` - Custom hooks for dashboard data management
- **Index**: `/resources/js/services/api/index.ts` - Central export point for API services

### Usage Examples
```typescript
// Using predefined periods
import { useDashboardDataForPeriod } from '@/hooks/use-dashboard-data';
const { data, loading, error } = useDashboardDataForPeriod('last_30_days');

// Using custom date range
import { useDashboardDataForDateRange } from '@/hooks/use-dashboard-data';
const { data, loading, error } = useDashboardDataForDateRange('2024-01-01', '2024-01-31');

// Direct API service usage
import { dashboardApiService } from '@/services/api/dashboard';
const data = await dashboardApiService.getDashboardDataForPeriod('today');
```

## Dashboard Date Filter

### Overview
The dashboard includes a comprehensive date range filter component that allows users to filter dashboard data by specific time periods. The filter uses Shadcn UI components for consistency and provides both quick preset options and custom date range selection.

### Components
- **DateRangePicker** (`/resources/js/components/date-range-picker.tsx`) - Main filter component
- **useDateRangeFilter** (`/resources/js/hooks/use-date-range-filter.ts`) - State management hook
- **useMediaQuery** (`/resources/js/hooks/use-media-query.ts`) - Responsive design utilities

### Features
- **Quick Presets**: Organized in logical groups (Daily, Weekly, Monthly)
  - Días específicos: Hoy, Ayer  
  - Por días: Últimos 7 días, Últimos 30 días
  - Por semana: Esta semana, Semana pasada
  - Por mes: Este mes, Mes pasado
- **Smart UX**: Auto-apply preset selections with immediate filter closure
- **Custom Date Selection**: Interactive calendar with date range picking
- **Conditional Action Buttons**: Cancel/Apply buttons only show for custom date selections
- **Responsive Design**: Adapts to mobile and desktop with appropriate touch targets
- **Localization**: Spanish locale support with date-fns
- **State Management**: Intelligent state handling for preset vs custom selections

### Integration
```typescript
// Dashboard integration example
import { DateRangePicker } from '@/components/date-range-picker';
import { useDateRangeFilter } from '@/hooks/use-date-range-filter';

const { dateRange, updateDateRange, data, loading, error } = useDateRangeFilter({
  defaultDateRange: {
    from: startOfDay(subDays(new Date(), 29)),
    to: endOfDay(new Date()),
  },
  autoFetch: true
});

<DateRangePicker
  value={dateRange}
  onChange={updateDateRange}
  placeholder="Seleccionar período"
  align="end"
/>
```

### Styling & Layout
- Uses Shadcn UI components (Calendar, Popover, Select, Button)
- Responsive button sizing: `w-auto min-w-[240px] max-w-[280px]`
- Proper flexbox layout with `justify-between items-center` for balanced spacing
- Mobile-optimized touch targets and single calendar view
- Desktop dual-calendar layout for better range selection

## Hours Chart Feature

### Overview
The Hours Chart feature provides real-time comparison visualization between current day data and the same day from the previous week. It integrates seamlessly with the dashboard's main date filters and only appears when a single day is selected.

### Architecture

#### Backend Components
- **ChartController** (`app/Http/Controllers/Api/ChartController.php`) - Main API endpoint for chart data
- **GetHoursChartRequest** (`app/Http/Requests/GetHoursChartRequest.php`) - Request validation with date format checking
- **ExternalApiService** (`app/Services/ExternalApiService.php`) - External API integration with dual API call handling
- **Route**: `/api/dashboard/get-hours-chart` (POST) with `auth` and `verified` middleware

#### Frontend Components
- **HoursLineChart** (`resources/js/components/charts/hours-line-chart.tsx`) - Main chart component with dual-line visualization
- **useHoursChart hooks** (`resources/js/hooks/useHoursChart.ts`) - State management for chart data
- **Chart API service** (`resources/js/services/chart-api.ts`) - API communication with CSRF handling
- **Types** (`resources/js/types/chart-types.ts`) - TypeScript definitions for chart data structures

### Integration Behavior

#### Dashboard Filter Integration
- Chart appears **only** when dashboard filter is set to a **single day**
- Uses the same date from the main dashboard filter (no separate date picker)
- Shows informational message when filter spans multiple days
- Automatically calculates previous week same day (e.g., Monday → previous Monday)
- Real-time integration with `useDateRangeFilter` hook

#### Visual States
- **Single Day Selected**: Shows full chart with dual-line comparison
- **Multiple Days Selected**: Shows placeholder message explaining requirement
- **Loading State**: Displays spinner with "Cargando gráfica..." message
- **Error State**: Shows retry button with descriptive Spanish error messages

### API Integration

#### External API Communication
- **Endpoint**: `http://192.168.100.20/api/get_hours_chart`
- **Method**: POST with date parameter
- **Authentication**: Bearer token from `EXTERNAL_API_TOKEN` environment variable
- **Dual API Calls**: Current day + same day previous week (automatic calculation)
- **Timeout**: 30 seconds per API call
- **Error Handling**: Graceful degradation (zeros for failed API calls)

#### Request/Response Format
```json
// Request
{"date": "2025-08-20"}

// Response
{
  "success": true,
  "data": [
    {
      "hour": "00:00",
      "current": 123,
      "previous": 98,
      "timestamp": "2025-08-20 00:00:00"
    }
  ],
  "currentDate": "2025-08-20",
  "previousDate": "2025-08-13"
}
```

### Chart Features

#### Visualization Technology
- **Library**: Recharts 2.15.4 (via shadcn/ui chart components)
- **Chart Type**: Dual LineChart with 24-hour X-axis
- **Styling**: CSS custom properties for theming (`--chart-1`, `--chart-2`)
- **Responsive**: Automatic resizing with ChartContainer
- **Accessibility**: Built-in ARIA support and keyboard navigation

#### Visual Elements
- **Current Day**: Solid line in primary color (`--chart-1`)
- **Previous Week**: Dashed line in secondary color (`--chart-2`)
- **Time Format**: 24-hour display (00h, 01h, ..., 23h)
- **Interactive Tooltips**: Spanish-formatted values with time labels
- **Active Dots**: Highlighted points on hover/focus

#### Data Analysis Features
- **Trend Calculation**: Compares total values between weeks
- **Percentage Change**: Shows improvement/decline with appropriate icons
- **Peak Detection**: Identifies maximum values across both datasets
- **Summary Statistics**: Current vs previous totals in footer

### Configuration

#### Environment Variables
```env
EXTERNAL_API_URL=http://192.168.100.20
EXTERNAL_API_TOKEN=your_actual_token_here
```

#### Chart Configuration
```typescript
const chartConfig = {
  current: {
    label: "Día Actual",
    color: "var(--chart-1)",
  },
  previous: {
    label: "Semana Anterior", 
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;
```

### Error Handling & Recovery

#### CSRF Protection
- Automatic CSRF token extraction from page metadata
- Session expiry detection with user-friendly messages
- Credential handling with `same-origin` policy

#### Network Resilience
- Connection timeout handling with retry functionality
- External API failure recovery (graceful zero-value fallbacks)
- Real-time error state management with Spanish messaging

#### User Experience
- Loading states with progress indicators
- Retry buttons for failed requests
- Contextual error messages (session, network, API-specific)
- Automatic chart refresh on data changes

### Usage Example
```typescript
// Dashboard integration
const { dateRange, startDate } = useDateRangeFilter({...});
const isSingleDay = dateRange?.from && dateRange?.to && 
  isSameDay(dateRange.from, dateRange.to);

{isSingleDay && (
  <HoursLineChart
    date={startDate}
    title="Actividad por Hora - Comparación Semanal"
    description={`Comparando ${startDate} con el mismo día de la semana anterior`}
  />
)}
```