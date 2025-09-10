"use client";

import * as React from "react";
import { DateRange } from "react-day-picker";
import { startOfDay, endOfDay, subDays } from "date-fns";

import { BranchDetailDrawer } from "@/components/branch-detail-drawer";
import { useBranchDetailDrawer } from "@/hooks/use-branch-detail-drawer";
import { BranchSummaryAccordion } from "@/components/charts/branch-summary-accordion";
import { WeeklyBranchSummaryAccordion } from "@/components/charts/weekly-branch-summary-accordion";

interface BranchDetailExampleProps {
  date: string;
  endDate?: string;
  className?: string;
}

/**
 * Componente de ejemplo que demuestra cómo integrar el BranchDetailDrawer
 * con los acordeones existentes del dashboard.
 */
export const BranchDetailExample: React.FC<BranchDetailExampleProps> = ({
  date,
  endDate,
  className
}) => {
  // Hook para manejar el estado del drawer
  const {
    isOpen,
    branchData,
    dateRange,
    selectedPeriod,
    openDrawer,
    closeDrawer,
    updateDateRange,
    updatePeriod,
  } = useBranchDetailDrawer({
    defaultDateRange: {
      from: startOfDay(subDays(new Date(), 7)),
      to: endOfDay(new Date()),
    },
    onBranchChange: (branchData) => {
      // Opcional: realizar acciones cuando cambia la sucursal
      console.log("Branch changed:", branchData?.branchName);
    }
  });

  return (
    <div className={className}>
      {/* Ejemplo con el accordion diario/básico */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Resumen por Sucursales - Diario</h3>
        <BranchSummaryAccordion
          date={date}
          endDate={endDate}
          onBranchDetailsClick={openDrawer}
        />
      </div>

      {/* Ejemplo con el accordion semanal */}
      {endDate && (
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-semibold">Resumen por Sucursales - Semanal</h3>
          <WeeklyBranchSummaryAccordion
            startDate={date}
            endDate={endDate}
            onBranchDetailsClick={openDrawer}
          />
        </div>
      )}

      {/* El Drawer - se renderiza solo cuando está abierto */}
      <BranchDetailDrawer
        isOpen={isOpen}
        branchData={branchData}
        onClose={closeDrawer}
        dateRange={dateRange}
        onDateRangeChange={updateDateRange}
        selectedPeriod={selectedPeriod}
        onPeriodChange={updatePeriod}
      />
    </div>
  );
};