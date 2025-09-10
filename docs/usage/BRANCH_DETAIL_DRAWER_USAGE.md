# BranchDetailDrawer - Guía de Uso

## Descripción

El `BranchDetailDrawer` es un componente optimizado para PWA iOS que proporciona una vista detallada de las sucursales. Está diseñado para funcionar como un bottom drawer nativo con soporte completo para gestos, animaciones fluidas y experiencia touch-friendly.

## Componentes Principales

### 1. `BranchDetailDrawer`
**Archivo**: `/resources/js/components/branch-detail-drawer.tsx`

Componente principal del drawer con las siguientes características:
- Animaciones fluidas con Framer Motion
- Soporte para gestos de arrastre (swipe down para cerrar)
- Altura inicial del 40% del viewport, expandible al 90%
- Backdrop con efecto blur
- Filtro de fechas independiente
- Diseño responsive optimizado para iOS PWA

### 2. `useBranchDetailDrawer`
**Archivo**: `/resources/js/hooks/use-branch-detail-drawer.ts`

Hook personalizado para el manejo del estado:
- Estado persistente inteligente (mantiene configuración al reabrir misma sucursal)
- Manejo de fechas y períodos
- Control de apertura/cierre del drawer
- Callbacks para cambios de sucursal

### 3. Tipos TypeScript
**Archivo**: `/resources/js/types/branch-detail.ts`

Definiciones de tipos para toda la funcionalidad del drawer.

## Cómo Usar

### Integración Básica en Dashboard

```typescript
import { BranchDetailDrawer } from "@/components/branch-detail-drawer";
import { useBranchDetailDrawer } from "@/hooks/use-branch-detail-drawer";
import { BranchSummaryAccordion } from "@/components/charts/branch-summary-accordion";

export function Dashboard() {
  const {
    isOpen,
    branchData,
    dateRange,
    selectedPeriod,
    openDrawer,
    closeDrawer,
    updateDateRange,
    updatePeriod,
  } = useBranchDetailDrawer();

  return (
    <div>
      {/* Accordion existente con integración del drawer */}
      <BranchSummaryAccordion
        date="2025-01-01"
        endDate="2025-01-07"
        onBranchDetailsClick={openDrawer} // Nueva prop
      />

      {/* El drawer se renderiza solo cuando está abierto */}
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
}
```

### Configuración Avanzada

```typescript
const {
  isOpen,
  branchData,
  openDrawer,
  closeDrawer,
  // ... otros métodos
} = useBranchDetailDrawer({
  defaultDateRange: {
    from: startOfDay(subDays(new Date(), 30)),
    to: endOfDay(new Date()),
  },
  onBranchChange: (branchData) => {
    // Callback ejecutado cuando cambia la sucursal
    console.log("Nueva sucursal seleccionada:", branchData?.branchName);
    
    // Ejemplo: enviar analytics
    analytics.track('branch_detail_opened', {
      branchName: branchData?.branchName,
      storeId: branchData?.storeId,
    });
  }
});
```

## Actualización de Acordeones Existentes

Los siguientes componentes han sido actualizados para soportar el drawer:

### BranchSummaryAccordion
- Nueva prop: `onBranchDetailsClick?: (branchData: BranchDetailData) => void`
- El botón "Ver Detalles" ahora dispara esta función

### WeeklyBranchSummaryAccordion  
- Nueva prop: `onBranchDetailsClick?: (branchData: BranchDetailData) => void`
- Misma funcionalidad que el accordion diario

## Características del Drawer

### UX iOS Optimizado
- **Bottom Drawer Nativo**: Aparece desde abajo como apps nativas
- **Gestos Táctiles**: Swipe down para cerrar, tap en backdrop para cerrar
- **Animaciones Fluidas**: Transiciones suaves de 300-400ms
- **Altura Adaptativa**: 40% inicial, expandible a 90%
- **Safe Area**: Respeta las áreas seguras de iOS

### Funcionalidades
- **Filtro de Fechas**: DateRangePicker independiente del dashboard principal
- **Períodos Configurables**: Diario, Semanal, Mensual, Personalizado
- **Estado Persistente**: Mantiene configuración al reabrir la misma sucursal
- **Información Detallada**: Stats rápidas, información de sucursal, placeholder para gráficas

### Controles
- **Botón X**: Cierre manual
- **Swipe Down**: Gesto nativo para cerrar
- **ESC Key**: Soporte para teclado
- **Backdrop Tap**: Click fuera del drawer
- **Drag Handle**: Indicador visual de que es arrastrables

## Próximos Pasos

### Integración de Gráficas
El drawer está preparado para recibir componentes de gráficas:

1. **Daily Charts**: Para el período diario
2. **Weekly Charts**: Para el período semanal  
3. **Monthly Charts**: Para el período mensual
4. **Custom Range Charts**: Para períodos personalizados

### Estructura Sugerida para Gráficas

```typescript
// En el área de contenido del drawer
<div className="space-y-6">
  {selectedPeriod === 'daily' && (
    <DailyBranchChart
      branchId={branchData.storeId}
      dateRange={dateRange}
    />
  )}
  
  {selectedPeriod === 'weekly' && (
    <WeeklyBranchChart
      branchId={branchData.storeId}
      dateRange={dateRange}
    />
  )}
  
  {/* etc... */}
</div>
```

## Performance

- **React.memo**: Componentes optimizados para re-renders
- **Lazy Loading**: Preparado para carga perezosa de gráficas
- **Estado Inteligente**: Evita recargas innecesarias al reabrir misma sucursal
- **Animaciones Optimizadas**: `will-change-transform` para mejor rendimiento

## Compatibilidad

- **React 19+**: Compatible con la versión actual del proyecto
- **Framer Motion 12+**: Biblioteca de animaciones incluida
- **iOS PWA**: Optimizado específicamente para Progressive Web Apps en iOS
- **Responsive**: Funciona en desktop pero optimizado para mobile

## Ejemplo Completo

Ver `/resources/js/components/branch-detail-example.tsx` para un ejemplo completo de implementación.