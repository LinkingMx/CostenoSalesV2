import { BranchSummaryAccordion } from '@/components/charts/branch-summary-accordion';
import { BranchDetailDrawer } from '@/components/branch-detail-drawer';
import { useBranchDetailDrawer } from '@/hooks/use-branch-detail-drawer';
import { DailySalesSummary } from '@/components/charts/daily-sales-summary';
import { HoursLineChart } from '@/components/charts/hours-line-chart';
import { MonthlyLineChartOptimized } from '@/components/charts/monthly-line-chart-optimized';
import { MonthlyBranchSummaryAccordionOptimized } from '@/components/charts/monthly-branch-summary-accordion-optimized';
import { MonthlySalesSummaryOptimized } from '@/components/charts/monthly-sales-summary-optimized';
import { WeeklyBranchSummaryAccordionShared } from '@/components/charts/weekly-branch-summary-accordion-shared';
import { WeeklyLineChartOptimized } from '@/components/charts/weekly-line-chart-optimized';
import { WeeklySalesSummaryOptimized } from '@/components/charts/weekly-sales-summary-optimized';
import { CustomRangeSalesSummary } from '@/components/charts/customrange-sales-summary';
import { CustomRangeBranchSummary } from '@/components/charts/customrange-branch-summary';
import { CustomRangeLineChart } from '@/components/charts/customrange-line-chart';
import { DateRangePicker } from '@/components/date-range-picker';
import { PullToRefreshContainer } from '@/components/ui/pull-to-refresh-container';
import { AdaptiveSkeleton, LoadingText } from '@/components/ui/adaptive-skeleton';
import { ModernLoading } from '@/components/ui/modern-loading';
import { WithReveal } from '@/components/ui/reveal-transition';
import { useMultipleLoadingState } from '@/hooks/use-loading-state';
import { useDateRangeFilter } from '@/hooks/use-date-range-filter';
import { useTranslation } from '@/hooks/useTranslation';
import { useUnifiedDailyData, useIsSingleDay } from '@/hooks/use-unified-daily-data';
import { useSharedWeeklyDataOptimized } from '@/hooks/use-shared-weekly-data-optimized';
import { useWeeklyLoadingCoordinator, useMonthlyLoadingCoordinator } from '@/hooks/use-unified-loading-state';
import { useSharedMonthlyDataOptimized } from '@/hooks/use-shared-monthly-data-optimized';
import { useCustomRangeData, useIsCustomRange } from '@/hooks/use-custom-range-data';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { endOfDay, isSameDay, startOfDay, differenceInDays, endOfMonth } from 'date-fns';
import { useCallback } from 'react';
import { BranchDetailData } from '@/types/branch-detail';

export default function Dashboard() {
    const { t } = useTranslation();
    
    // Branch detail drawer state
    const {
        isOpen: isDrawerOpen,
        branchData: selectedBranchData,
        dateRange: drawerDateRange,
        openDrawer,
        closeDrawer,
        updateDateRange: updateDrawerDateRange,
    } = useBranchDetailDrawer();

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

    const { dateRange, updateDateRange, hasValidRange, startDate, endDate } = useDateRangeFilter({
        defaultDateRange,
    });

    // Check if current filter is a single day using optimized hook
    const isSingleDay = useIsSingleDay(startDate || '', endDate || '');

    // Wrapper function to pass dashboard context to drawer
    const handleOpenDrawer = useCallback((branchData: BranchDetailData) => {
        openDrawer(branchData, dateRange);
    }, [openDrawer, dateRange]);

    // Check if current filter is a weekly period (exactly 7 days and starts on Monday)
    const isWeeklyPeriod = dateRange?.from && dateRange?.to && 
        differenceInDays(dateRange.to, dateRange.from) === 6 && 
        dateRange.from.getDay() === 1; // Monday = 1

    // Check if current filter is a monthly period (starts at beginning of month and ends at end of month)
    const isMonthlyPeriod = dateRange?.from && dateRange?.to &&
        dateRange.from.getDate() === 1 && // Starts on 1st day of month
        isSameDay(dateRange.to, endOfMonth(dateRange.from)); // Ends on last day of same month
    
    // Check if current filter is a custom range (not single day, week, or month)
    const isCustomRangePeriod = useIsCustomRange(startDate, endDate);
    
    // Show chart only when filter is for a single day
    const shouldShowChart = Boolean(isSingleDay && startDate);
    
    // Show weekly components when filter is for a week
    const shouldShowWeeklyComponents = Boolean(isWeeklyPeriod && startDate && endDate);
    
    // Show monthly components when filter is for a month
    const shouldShowMonthlyComponents = Boolean(isMonthlyPeriod && startDate && endDate);
    
    // Show custom range components when filter is for a custom range
    const shouldShowCustomRangeComponents = Boolean(isCustomRangePeriod && startDate && endDate && 
        !isSingleDay && !isWeeklyPeriod && !isMonthlyPeriod);


    // **OPTIMIZED: Unified daily data hook - reduces API calls by 50%**
    const unifiedDailyData = useUnifiedDailyData(
        shouldShowChart ? (startDate || '') : '', 
        shouldShowChart ? (endDate || '') : '',
        shouldShowChart
    );

    // **OPTIMIZACIÓN PARALELA: Ejecuta 3 API calls en paralelo en lugar de secuencial (6s → 3s)**
    const weeklyData = useSharedWeeklyDataOptimized(
        shouldShowWeeklyComponents ? (startDate || '') : '',
        shouldShowWeeklyComponents ? (endDate || '') : '',
        shouldShowWeeklyComponents
    );
    
    // **COORDINACIÓN DE ESQUELETOS: Todos los esqueletos aparecen/desaparecen juntos**
    const weeklyLoading = useWeeklyLoadingCoordinator(
        weeklyData.isLoading, // Current + comparison data loading
        weeklyData.isLoading, // Chart data loading (same state for coordination)
        weeklyData.isLoading, // Third operation (same state)
        { 
            minimumLoadingTime: 800,
            coordinateSkeletons: true,
            showProgressiveLoading: false,
            staggerDelay: 200
        }
    );
    
    // **DATOS MENSUALES: Para componentes de resumen y acordeón**
    const monthlyData = useSharedMonthlyDataOptimized(
        shouldShowMonthlyComponents ? (startDate || '') : '',
        shouldShowMonthlyComponents ? (endDate || '') : '',
        shouldShowMonthlyComponents
    );
    
    // **COORDINACIÓN DE ESQUELETOS MENSUAL: Para componentes de resumen**
    const monthlyLoading = useMonthlyLoadingCoordinator(
        monthlyData.isLoading,
        monthlyData.isLoading,
        monthlyData.isLoading,
        { 
            minimumLoadingTime: 1000,
            coordinateSkeletons: true,
            showProgressiveLoading: false,
            staggerDelay: 250
        }
    );
    
    // **CUSTOM RANGE: Hook for custom date ranges - uses same API optimizations**
    const customRangeData = useCustomRangeData(
        shouldShowCustomRangeComponents ? (startDate || '') : '',
        shouldShowCustomRangeComponents ? (endDate || '') : '',
        shouldShowCustomRangeComponents
    );
    
    // Use simplified loading state with consistent 500ms minimum
    const allLoadingStates: boolean[] = [
        shouldShowChart ? unifiedDailyData.isLoading : false,
        shouldShowWeeklyComponents ? weeklyLoading.showLoading : false,
        shouldShowMonthlyComponents ? monthlyLoading.showLoading : false,
        shouldShowCustomRangeComponents ? customRangeData.isLoading : false
    ];
    
    const { showLoading: showGlobalLoading } = useMultipleLoadingState(
        allLoadingStates,
        { minimumLoadingTime: 500 }
    );

    // Simple data checking for display logic - updated for unified loading coordination
    const hasDataDaily = shouldShowChart && unifiedDailyData.dashboardData !== null && !unifiedDailyData.isLoading && !unifiedDailyData.error;
    const hasDataWeekly = shouldShowWeeklyComponents && weeklyData.currentData !== null && !weeklyLoading.showLoading && !weeklyData.error;
    const hasDataMonthly = shouldShowMonthlyComponents && monthlyData.currentData !== null && !monthlyLoading.showLoading && !monthlyData.error;
    const hasDataCustomRange = shouldShowCustomRangeComponents && customRangeData.data !== null && !customRangeData.isLoading && !customRangeData.error;


    // Pull to refresh functionality
    const handlePullToRefresh = async () => {
        
        const promises: Promise<unknown>[] = [];
        
        // Refetch based on current view - using unified refetch
        if (shouldShowChart && unifiedDailyData.refetchAll) {
            promises.push(unifiedDailyData.refetchAll());
        }
        
        if (shouldShowWeeklyComponents) {
            // For optimized weekly data - single refetch handles all parallel calls
            if (weeklyData.refetch) {
                promises.push(weeklyData.refetch());
            }
        }
        
        if (shouldShowMonthlyComponents) {
            // Para componentes mensuales de resumen y acordeón
            if (monthlyData.refetch) {
                promises.push(monthlyData.refetch());
            }
        }
        
        if (shouldShowCustomRangeComponents) {
            // For custom range data
            if (customRangeData.refetch) {
                promises.push(customRangeData.refetch());
            }
        }
        
        // If no specific data to refresh, do a full page refresh
        if (promises.length === 0) {
            window.location.reload();
            return;
        }
        
        // Execute all refetch promises
        await Promise.allSettled(promises);
    };

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('navigation.dashboard'),
            href: dashboard().url,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('navigation.dashboard')} />
            <PullToRefreshContainer onRefresh={handlePullToRefresh} threshold={80}>
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

                {/* Modern Loading State */}
                {showGlobalLoading ? (
                    <div className="flex items-center justify-center min-h-[400px]">
                        <ModernLoading 
                            type={shouldShowChart ? 'daily' : 
                                  shouldShowWeeklyComponents ? 'weekly' : 
                                  shouldShowMonthlyComponents ? 'monthly' : 
                                  shouldShowCustomRangeComponents ? 'general' : 'general'}
                            showProgressDots={true}
                        />
                    </div>
                ) : (
                    <>
                        {/* Hours Chart Section - Only show for single day */}
                        {shouldShowChart && (
                            <div className="space-y-4">
                                <WithReveal
                                    isLoading={showGlobalLoading}
                                    hasData={hasDataDaily}
                                    shouldReveal={!showGlobalLoading && hasDataDaily}
                                    skeleton={<AdaptiveSkeleton type="chart" className="overflow-hidden border-0 bg-transparent shadow-none w-full" showTitle={true} showLegend={true} height="h-40" />}
                                    type="slideUp"
                                >
                                    <HoursLineChart
                                        date={startDate}
                                        title="Análisis de Actividad por Horas"
                                        description={`Comparación detallada de ${formatDate(new Date(startDate))} vs semana anterior`}
                                        className="w-full"
                                        hoursChartData={unifiedDailyData.hoursChartData}
                                        isLoading={unifiedDailyData.isLoading}
                                        error={unifiedDailyData.error}
                                        onRefresh={unifiedDailyData.refetchHours}
                                    />
                                </WithReveal>

                                <WithReveal
                                    isLoading={showGlobalLoading}
                                    hasData={hasDataDaily}
                                    shouldReveal={!showGlobalLoading && hasDataDaily}
                                    skeleton={<AdaptiveSkeleton type="card" className="w-full" />}
                                    type="slideUp"
                                >
                                    <DailySalesSummary
                                        date={startDate}
                                        endDate={endDate}
                                        comparisonText="Mismo día semana anterior al de ayer."
                                        className="w-full"
                                        isLoading={unifiedDailyData.isLoading}
                                        error={unifiedDailyData.error}
                                        dashboardData={unifiedDailyData.dashboardData}
                                        dashboardComparisonData={unifiedDailyData.dashboardComparisonData}
                                        dashboardPercentageChange={unifiedDailyData.dashboardPercentageChange}
                                        dashboardPreviousAmount={unifiedDailyData.dashboardPreviousAmount}
                                    />
                                </WithReveal>

                                <WithReveal
                                    isLoading={showGlobalLoading}
                                    hasData={hasDataDaily}
                                    shouldReveal={!showGlobalLoading && hasDataDaily}
                                    skeleton={<AdaptiveSkeleton type="accordion" className="w-full" itemCount={4} />}
                                    type="slideUp"
                                >
                                    <BranchSummaryAccordion
                                        date={startDate}
                                        endDate={endDate}
                                        className="w-full"
                                        onBranchDetailsClick={handleOpenDrawer}
                                    />
                                </WithReveal>
                            </div>
                        )}

                        {/* Weekly Components Section - OPTIMIZED: Uses ONLY 2 API calls total */}
                        {shouldShowWeeklyComponents && (
                            <div className="space-y-4">
                                <WithReveal
                                    isLoading={weeklyLoading.showSkeletons}
                                    hasData={hasDataWeekly}
                                    shouldReveal={!weeklyLoading.showSkeletons && hasDataWeekly}
                                    skeleton={<AdaptiveSkeleton type="chart" className="overflow-hidden border-0 bg-transparent shadow-none w-full" showTitle={true} showLegend={true} height="h-40" />}
                                    type="slideUp"
                                >
                                    <WeeklyLineChartOptimized
                                        chartData={weeklyData.chartData}
                                        isLoading={weeklyLoading.showLoading}
                                        error={weeklyData.error}
                                        onRefresh={weeklyData.refetch}
                                        className="w-full"
                                    />
                                </WithReveal>

                                <WithReveal
                                    isLoading={weeklyLoading.showSkeletons}
                                    hasData={hasDataWeekly}
                                    shouldReveal={!weeklyLoading.showSkeletons && hasDataWeekly}
                                    skeleton={<AdaptiveSkeleton type="card" className="w-full" showPercentage={true} />}
                                    type="slideUp"
                                >
                                    <WeeklySalesSummaryOptimized
                                        startDate={startDate}
                                        endDate={endDate}
                                        currentData={weeklyData.currentData}
                                        comparisonData={weeklyData.comparisonData}
                                        percentageChange={weeklyData.percentageChange}
                                        previousAmount={weeklyData.previousAmount}
                                        isLoading={weeklyLoading.showLoading}
                                        error={weeklyData.error}
                                        className="w-full"
                                    />
                                </WithReveal>

                                <WithReveal
                                    isLoading={weeklyLoading.showSkeletons}
                                    hasData={hasDataWeekly}
                                    shouldReveal={!weeklyLoading.showSkeletons && hasDataWeekly}
                                    skeleton={<AdaptiveSkeleton type="accordion" className="w-full" itemCount={5} />}
                                    type="slideUp"
                                >
                                    <WeeklyBranchSummaryAccordionShared
                                        startDate={startDate}
                                        endDate={endDate}
                                        currentData={weeklyData.currentData}
                                        comparisonData={weeklyData.comparisonData}
                                        isLoading={weeklyLoading.showLoading}
                                        error={weeklyData.error}
                                        className="w-full"
                                        onBranchDetailsClick={handleOpenDrawer}
                                    />
                                </WithReveal>
                            </div>
                        )}

                        {/* Monthly Components Section - OPTIMIZED: Uses shared data hook */}
                        {shouldShowMonthlyComponents && (
                            <div className="space-y-4">
                                {/* Gráfica mensual optimizada */}
                                <WithReveal
                                    isLoading={monthlyLoading.showSkeletons}
                                    hasData={hasDataMonthly}
                                    shouldReveal={!monthlyLoading.showSkeletons && hasDataMonthly}
                                    skeleton={<AdaptiveSkeleton type="chart" className="overflow-hidden border-0 bg-transparent shadow-none w-full" showTitle={true} showLegend={true} height="h-40" />}
                                    type="slideUp"
                                >
                                    <MonthlyLineChartOptimized
                                        chartData={monthlyData.chartData}
                                        isLoading={monthlyLoading.showLoading}
                                        error={monthlyData.error}
                                        onRefresh={monthlyData.refetch}
                                        className="w-full"
                                    />
                                </WithReveal>
                                
                                {/* Resumen de ventas mensual */}
                                <WithReveal
                                    isLoading={monthlyLoading.showSkeletons}
                                    hasData={hasDataMonthly}
                                    shouldReveal={!monthlyLoading.showSkeletons && hasDataMonthly}
                                    skeleton={<AdaptiveSkeleton type="card" className="w-full" showPercentage={true} />}
                                    type="slideUp"
                                >
                                    <MonthlySalesSummaryOptimized
                                        startDate={startDate}
                                        endDate={endDate}
                                        currentData={monthlyData.currentData}
                                        comparisonData={monthlyData.comparisonData}
                                        percentageChange={monthlyData.percentageChange}
                                        previousAmount={monthlyData.previousAmount}
                                        isLoading={monthlyLoading.showLoading}
                                        error={monthlyData.error}
                                        className="w-full"
                                    />
                                </WithReveal>

                                {/* Acordeón de sucursales mensual */}
                                <WithReveal
                                    isLoading={monthlyLoading.showSkeletons}
                                    hasData={hasDataMonthly}
                                    shouldReveal={!monthlyLoading.showSkeletons && hasDataMonthly}
                                    skeleton={<AdaptiveSkeleton type="accordion" className="w-full" itemCount={6} />}
                                    type="slideUp"
                                >
                                    <MonthlyBranchSummaryAccordionOptimized
                                        startDate={startDate}
                                        endDate={endDate}
                                        currentData={monthlyData.currentData}
                                        comparisonData={monthlyData.comparisonData}
                                        isLoading={monthlyLoading.showLoading}
                                        error={monthlyData.error}
                                        className="w-full"
                                        onBranchDetailsClick={handleOpenDrawer}
                                    />
                                </WithReveal>
                            </div>
                        )}

                        {/* Custom Range Components Section - NO comparisons with previous periods */}
                        {shouldShowCustomRangeComponents && (
                            <div className="space-y-4">
                                <WithReveal
                                    isLoading={showGlobalLoading}
                                    hasData={hasDataCustomRange}
                                    shouldReveal={!showGlobalLoading && hasDataCustomRange}
                                    skeleton={<AdaptiveSkeleton type="chart" className="overflow-hidden border-0 bg-transparent shadow-none w-full" showTitle={true} showLegend={true} height="h-40" />}
                                    type="slideUp"
                                >
                                    <CustomRangeLineChart
                                        startDate={startDate}
                                        endDate={endDate}
                                        topBranches={customRangeData.topBranches}
                                        className="w-full"
                                    />
                                </WithReveal>

                                <WithReveal
                                    isLoading={showGlobalLoading}
                                    hasData={hasDataCustomRange}
                                    shouldReveal={!showGlobalLoading && hasDataCustomRange}
                                    skeleton={<AdaptiveSkeleton type="card" className="w-full" />}
                                    type="slideUp"
                                >
                                    <CustomRangeSalesSummary
                                        startDate={startDate}
                                        endDate={endDate}
                                        summaryData={customRangeData.summaryData}
                                        allBranchesSummaryData={customRangeData.allBranchesSummaryData}
                                        data={customRangeData.data}
                                        error={customRangeData.error}
                                        className="w-full"
                                    />
                                </WithReveal>

                                <WithReveal
                                    isLoading={showGlobalLoading}
                                    hasData={hasDataCustomRange}
                                    shouldReveal={!showGlobalLoading && hasDataCustomRange}
                                    skeleton={<AdaptiveSkeleton type="accordion" className="w-full" itemCount={5} />}
                                    type="slideUp"
                                >
                                    <CustomRangeBranchSummary
                                        topBranches={customRangeData.topBranches}
                                        allBranches={customRangeData.allBranches}
                                        startDate={startDate}
                                        endDate={endDate}
                                        className="w-full"
                                        onBranchDetailsClick={handleOpenDrawer}
                                    />
                                </WithReveal>
                            </div>
                        )}
                    </>
                )}

                {/* Info message when filter is not supported */}
                {!shouldShowChart && !shouldShowWeeklyComponents && !shouldShowMonthlyComponents && !shouldShowCustomRangeComponents && hasValidRange && (
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
                                    Selecciona un período válido para ver análisis de datos
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Branch Detail Drawer */}
                <BranchDetailDrawer
                    isOpen={isDrawerOpen}
                    branchData={selectedBranchData}
                    onClose={closeDrawer}
                    dateRange={drawerDateRange}
                    onDateRangeChange={updateDrawerDateRange}
                />
                </div>
            </PullToRefreshContainer>
        </AppLayout>
    );
}
