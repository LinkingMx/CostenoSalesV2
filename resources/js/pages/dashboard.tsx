import { BranchSummaryAccordion } from '@/components/charts/branch-summary-accordion';
import { DailySalesSummary } from '@/components/charts/daily-sales-summary';
import { HoursLineChart } from '@/components/charts/hours-line-chart';
import { MonthlyBranchSummaryAccordion } from '@/components/charts/monthly-branch-summary-accordion';
import { MonthlyBranchSummaryAccordionShared } from '@/components/charts/monthly-branch-summary-accordion-shared';
import { MonthlyLineChart } from '@/components/charts/monthly-line-chart';
import { MonthlySalesSummary } from '@/components/charts/monthly-sales-summary';
import { MonthlySalesSummaryOptimized } from '@/components/charts/monthly-sales-summary-optimized';
import { WeeklyBranchSummaryAccordion } from '@/components/charts/weekly-branch-summary-accordion';
import { WeeklyBranchSummaryAccordionShared } from '@/components/charts/weekly-branch-summary-accordion-shared';
import { WeeklyLineChart } from '@/components/charts/weekly-line-chart';
import { WeeklySalesSummary } from '@/components/charts/weekly-sales-summary';
import { WeeklySalesSummaryOptimized } from '@/components/charts/weekly-sales-summary-optimized';
import { DateRangePicker } from '@/components/date-range-picker';
import { useDateRangeFilter } from '@/hooks/use-date-range-filter';
import { useTranslation } from '@/hooks/useTranslation';
import { useMainDashboardData } from '@/hooks/use-main-dashboard-data';
import { useWeeklyChartDataSimple } from '@/hooks/use-weekly-chart-data-simple';
import { useMonthlyChartDataSimple } from '@/hooks/use-monthly-chart-data-simple';
import { useSharedWeeklyData } from '@/hooks/use-shared-weekly-data';
import { useSharedMonthlyData, useIsMonthlyPeriod } from '@/hooks/use-shared-monthly-data';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { endOfDay, isSameDay, startOfDay, differenceInDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInCalendarDays } from 'date-fns';

export default function Dashboard() {
    const { t } = useTranslation();

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    // Initialize with today as default
    const defaultDateRange = {
        from: startOfDay(new Date()),
        to: endOfDay(new Date()),
    };

    const { dateRange, updateDateRange, data, loading, error, hasValidRange, startDate, endDate } = useDateRangeFilter({
        defaultDateRange,
        autoFetch: true,
    });

    

    // Check if current filter is a single day
    const isSingleDay = dateRange?.from && dateRange?.to && isSameDay(dateRange.from, dateRange.to);

    // Check if current filter is a weekly period (exactly 7 days and starts on Monday)
    const isWeeklyPeriod = dateRange?.from && dateRange?.to && 
        differenceInDays(dateRange.to, dateRange.from) === 6 && 
        dateRange.from.getDay() === 1; // Monday = 1

    // Check if current filter is a monthly period (starts at beginning of month and ends at end of month)
    const isMonthlyPeriod = dateRange?.from && dateRange?.to &&
        dateRange.from.getDate() === 1 && // Starts on 1st day of month
        isSameDay(dateRange.to, endOfMonth(dateRange.from)); // Ends on last day of same month

    // Show chart only when filter is for a single day
    const shouldShowChart = isSingleDay && startDate;
    
    // Show weekly components when filter is for a week
    const shouldShowWeeklyComponents = isWeeklyPeriod && startDate && endDate;
    
    // Show monthly components when filter is for a month
    const shouldShowMonthlyComponents = isMonthlyPeriod && startDate && endDate;

    // Always call hooks but use enabled/disabled pattern
    const dailyData = useMainDashboardData(
        shouldShowChart ? (startDate || '') : '', 
        shouldShowChart ? (endDate || '') : ''
    );

    // **OPTIMIZACIÓN: Un solo hook que hace EXACTAMENTE 2 API calls para todos los componentes semanales**
    const sharedWeeklyData = useSharedWeeklyData(
        shouldShowWeeklyComponents ? (startDate || '') : '',
        shouldShowWeeklyComponents ? (endDate || '') : '',
        shouldShowWeeklyComponents
    );
    
    // **OPTIMIZACIÓN MENSUAL: Un solo hook que hace EXACTAMENTE 2 API calls para todos los componentes mensuales**
    const sharedMonthlyData = useSharedMonthlyData(
        shouldShowMonthlyComponents ? (startDate || '') : '',
        shouldShowMonthlyComponents ? (endDate || '') : '',
        shouldShowMonthlyComponents
    );
    
    // Using simple version with loading states para monthly chart (legacy)
    const monthlyChartData = useMonthlyChartDataSimple(
        shouldShowMonthlyComponents ? (startDate || '') : '', 
        shouldShowMonthlyComponents ? (endDate || '') : ''
    );
    
    const isLoadingDaily = shouldShowChart && dailyData.loading;
    const isLoadingWeekly = shouldShowWeeklyComponents && sharedWeeklyData.isLoading; // Usa shared data
    const isLoadingMonthly = shouldShowMonthlyComponents && (sharedMonthlyData.isLoading || monthlyChartData.loading);
    const isAnyComponentLoading = isLoadingDaily || isLoadingWeekly || isLoadingMonthly;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('navigation.dashboard'),
            href: dashboard().url,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('navigation.dashboard')} />
            <div className="flex h-full flex-1 flex-col gap-2 overflow-x-auto rounded-xl p-2">
                {/* Date Range Filter with Reload Button */}
                <div className="flex items-center justify-between">
                    <div className="flex-1">{/* Space for future elements like title or breadcrumbs */}</div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <DateRangePicker value={dateRange} onChange={updateDateRange} placeholder="Seleccionar período" align="end" />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.reload()}
                            className="px-3 py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                            title="Recargar aplicación"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Centralized Loading State */}
                {isAnyComponentLoading ? (
                    <div className="flex h-96 items-center justify-center">
                        <div className="space-y-4 text-center">
                            <div className="relative">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-lg font-medium">Cargando datos...</p>
                                <p className="text-sm text-muted-foreground">
                                    {shouldShowChart && "Obteniendo análisis diario"}
                                    {shouldShowWeeklyComponents && "Obteniendo análisis semanal optimizado (2 API calls)"}
                                    {shouldShowMonthlyComponents && "Obteniendo análisis mensual optimizado (2 API calls)"}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Hours Chart Section - Only show for single day */}
                        {shouldShowChart && (
                            <div className="">
                                <HoursLineChart
                                    date={startDate}
                                    title="Análisis de Actividad por Horas"
                                    description={`Comparación detallada de ${formatDate(new Date(startDate))} vs semana anterior`}
                                    className="w-full"
                                />

                                <DailySalesSummary
                                    date={startDate}
                                    endDate={endDate}
                                    percentageChange={8.0}
                                    comparisonText="Mismo día semana anterior al de ayer."
                                    className="w-full"
                                />

                                <BranchSummaryAccordion
                                    date={startDate}
                                    endDate={endDate}
                                    className="w-full"
                                />
                            </div>
                        )}

                        {/* Weekly Components Section - OPTIMIZED: Uses ONLY 2 API calls total */}
                        {shouldShowWeeklyComponents && (
                            <div className="">

                                <WeeklyLineChart
                                    startDate={startDate}
                                    endDate={endDate}
                                    title="Análisis Semanal por Días"
                                    description={`Comparación de ${formatDate(new Date(startDate))} a ${formatDate(new Date(endDate))} vs semana anterior`}
                                    className="w-full"
                                />

                                <WeeklySalesSummaryOptimized
                                    startDate={startDate}
                                    endDate={endDate}
                                    currentData={sharedWeeklyData.currentData}
                                    comparisonData={sharedWeeklyData.comparisonData}
                                    percentageChange={sharedWeeklyData.percentageChange}
                                    previousAmount={sharedWeeklyData.previousAmount}
                                    isLoading={sharedWeeklyData.isLoading}
                                    error={sharedWeeklyData.error}
                                    className="w-full"
                                />

                                <WeeklyBranchSummaryAccordionShared
                                    startDate={startDate}
                                    endDate={endDate}
                                    currentData={sharedWeeklyData.currentData}
                                    comparisonData={sharedWeeklyData.comparisonData}
                                    isLoading={sharedWeeklyData.isLoading}
                                    error={sharedWeeklyData.error}
                                    className="w-full"
                                />
                            </div>
                        )}

                        {/* Monthly Components Section - OPTIMIZED: Uses ONLY 2 API calls total */}
                        {shouldShowMonthlyComponents && (
                            <div className="">

                                <MonthlyLineChart
                                    startDate={startDate}
                                    endDate={endDate}
                                    title="Análisis Mensual por Semanas"
                                    description={`Comparación mensual vs mes anterior`}
                                    className="w-full"
                                />

                                <MonthlySalesSummaryOptimized
                                    startDate={startDate}
                                    endDate={endDate}
                                    currentData={sharedMonthlyData.currentData}
                                    comparisonData={sharedMonthlyData.comparisonData}
                                    percentageChange={sharedMonthlyData.percentageChange}
                                    previousAmount={sharedMonthlyData.previousAmount}
                                    isLoading={sharedMonthlyData.isLoading}
                                    error={sharedMonthlyData.error}
                                    className="w-full"
                                />

                                <MonthlyBranchSummaryAccordionShared
                                    startDate={startDate}
                                    endDate={endDate}
                                    currentData={sharedMonthlyData.currentData}
                                    comparisonData={sharedMonthlyData.comparisonData}
                                    isLoading={sharedMonthlyData.isLoading}
                                    error={sharedMonthlyData.error}
                                    className="w-full"
                                />
                            </div>
                        )}
                    </>
                )}

                {/* Info message when filter is not single day, weekly, or monthly */}
                {!shouldShowChart && !shouldShowWeeklyComponents && !shouldShowMonthlyComponents && hasValidRange && (
                    <div className="rounded-xl border-0 bg-gradient-to-br from-background to-muted/20 p-2 text-center shadow-sm">
                        <div className="mx-auto max-w-md">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                    />
                                </svg>
                            </div>
                            <div className="">
                                <h3 className="text-lg font-semibold">Análisis de Datos</h3>
                                <p className="text-sm text-muted-foreground">
                                    Selecciona un día para análisis por horas, una semana para resúmenes semanales, o un mes completo para análisis mensual
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
