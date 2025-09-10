"use client";

import * as React from "react";
import { motion, PanInfo, AnimatePresence } from "framer-motion";
import { X, Store, Calendar, BarChart3, TrendingUp } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/date-range-picker";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import { BranchDetailDrawerProps } from "@/types/branch-detail";

interface BranchDetailDrawerContentProps {
  branchData: NonNullable<BranchDetailDrawerProps['branchData']>;
  dateRange: DateRange | undefined;
  onDateRangeChange: (dateRange: DateRange | undefined) => void;
  onClose: () => void;
}

const DrawerContent = React.memo<BranchDetailDrawerContentProps>(({
  branchData,
  dateRange,
  onDateRangeChange,
  onClose
}) => {
  const isMobile = useMediaQuery("(max-width: 768px)");

  const formatNumber = React.useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, []);

  const formatCompactNumber = React.useCallback((amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${formatNumber(amount)}`;
  }, [formatNumber]);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border/50 bg-background/80 backdrop-blur-sm px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#897053] shadow-sm">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold text-foreground">
                {branchData.branchName}
              </h2>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  ID: {branchData.storeId}
                </Badge>
                <span className="text-sm font-medium text-[#897053]">
                  {formatCompactNumber(branchData.totalSales)}
                </span>
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-muted"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar detalles</span>
          </Button>
        </div>

      </div>

      {/* Controls */}
      <div className="flex-shrink-0 border-b border-border/50 bg-muted/30 px-4 py-3">
        <div className="space-y-3">
          {/* Date Range Picker */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <DateRangePicker
              value={dateRange}
              onChange={onDateRangeChange}
              placeholder="Seleccionar fechas"
              className="flex-1"
              align="end"
            />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-[#E7D2BA]/30 px-3 py-2 text-center">
              <div className="text-xs text-[#8B7355]">Abiertas</div>
              <div className="text-sm font-semibold text-[#6B5B47]">
                ${formatNumber(branchData.openAccounts.money)}
              </div>
            </div>
            <div className="rounded-lg bg-[#DABE9C]/30 px-3 py-2 text-center">
              <div className="text-xs text-[#8B7355]">Cerradas</div>
              <div className="text-sm font-semibold text-[#6B5B47]">
                ${formatNumber(branchData.closedTickets.money)}
              </div>
            </div>
            <div className="rounded-lg bg-[#F6DABA]/30 px-3 py-2 text-center">
              <div className="text-xs text-[#8B7355]">Promedio</div>
              <div className="text-sm font-semibold text-[#6B5B47]">
                ${formatNumber(branchData.averageTicket)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 py-6">
        <div className="space-y-6">
          {/* Placeholder for Charts */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#897053]" />
              <h3 className="text-sm font-medium text-foreground">
                Análisis de Ventas
              </h3>
            </div>
            
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <BarChart3 className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Gráficas en desarrollo
                </p>
                <p className="text-xs text-muted-foreground">
                  Aquí aparecerán las gráficas de ventas para {branchData.branchName}
                </p>
              </div>
            </div>
          </div>

          {/* Additional Branch Info */}
          {(branchData.brand || branchData.region || branchData.operationalAddress) && (
            <div className="space-y-3">
              <Separator className="my-4" />
              <h3 className="text-sm font-medium text-foreground">
                Información de la Sucursal
              </h3>
              <div className="space-y-2 text-sm">
                {branchData.brand && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Marca:</span>
                    <span className="text-foreground">{branchData.brand}</span>
                  </div>
                )}
                {branchData.region && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Región:</span>
                    <span className="text-foreground">{branchData.region}</span>
                  </div>
                )}
                {branchData.operationalAddress && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dirección:</span>
                    <span className="text-foreground text-right max-w-[200px] truncate">
                      {branchData.operationalAddress}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Spacing for iOS safe area */}
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
});

DrawerContent.displayName = "DrawerContent";

export const BranchDetailDrawer = React.memo<BranchDetailDrawerProps & {
  dateRange?: DateRange;
  onDateRangeChange?: (dateRange: DateRange | undefined) => void;
}>(({
  isOpen,
  branchData,
  onClose,
  dateRange,
  onDateRangeChange
}) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [dragY, setDragY] = React.useState(0);
  
  // Drawer animation variants
  const drawerVariants = {
    hidden: {
      y: "100%",
      transition: {
        type: "tween" as const,
        ease: "easeInOut",
        duration: 0.3,
      },
    },
    visible: {
      y: "10%", // Initial height: 90% viewport (100% - 10%)
      transition: {
        type: "tween" as const,
        ease: "easeOut",
        duration: 0.4,
      },
    },
    expanded: {
      y: "10%", // Expanded height: 90% viewport
      transition: {
        type: "tween" as const,
        ease: "easeOut",
        duration: 0.3,
      },
    },
  };

  const backdropVariants = {
    hidden: {
      opacity: 0,
      backdropFilter: "blur(0px)",
    },
    visible: {
      opacity: 1,
      backdropFilter: "blur(8px)",
      transition: {
        duration: 0.3,
      },
    },
  };

  // Handle drag gesture
  const handleDrag = React.useCallback((event: PointerEvent, info: PanInfo) => {
    if (info.delta.y > 0) {
      setDragY(Math.max(0, info.offset.y));
    }
  }, []);

  // Handle drag end - close if dragged down enough
  const handleDragEnd = React.useCallback((event: PointerEvent, info: PanInfo) => {
    const threshold = 150;
    
    if (info.offset.y > threshold || info.velocity.y > 500) {
      onClose();
    }
    setDragY(0);
  }, [onClose]);

  // Handle backdrop click
  const handleBackdropClick = React.useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Handle ESC key
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // Prevent body scroll on mobile
      if (isMobile) {
        document.body.style.overflow = 'hidden';
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      if (isMobile) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen, isMobile, onClose]);

  if (!branchData) return null;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/20 dark:bg-black/40"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={handleBackdropClick}
          />

          {/* Drawer */}
          <motion.div
            className={cn(
              "absolute inset-x-0 bottom-0 flex flex-col overflow-hidden",
              "rounded-t-2xl border-t border-border bg-background shadow-2xl",
              "will-change-transform", // Optimize for transforms
              isMobile ? "h-[90vh]" : "h-[85vh] mx-4 mb-4 rounded-b-2xl"
            )}
            style={{
              y: dragY,
              height: isMobile ? `calc(90vh - ${Math.max(0, dragY)}px)` : "85vh",
            }}
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            drag="y"
            dragConstraints={{ top: 0, bottom: 300 }}
            dragElastic={{ top: 0, bottom: 0.2 }}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            layout
          >
            {/* Drag Handle */}
            <div className="flex-shrink-0 flex justify-center py-2">
              <div className="h-1 w-12 rounded-full bg-muted-foreground/20" />
            </div>

            <DrawerContent
              branchData={branchData}
              dateRange={dateRange}
              onDateRangeChange={onDateRangeChange || (() => {})}
              onClose={onClose}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});

BranchDetailDrawer.displayName = "BranchDetailDrawer";