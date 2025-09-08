# Gráfica por Horas - Documentación Técnica

## Descripción General
La funcionalidad de **Gráfica por Horas** proporciona una visualización comparativa entre los datos del día actual y el mismo día de la semana anterior, integrada seamlessly con los filtros principales del dashboard.

## Comportamiento de Integración

### Filtros del Dashboard
- La gráfica se muestra **únicamente** cuando el filtro principal está configurado para **un solo día**
- No tiene filtros independientes, utiliza la fecha del filtro principal
- Cuando el filtro abarca múltiples días, muestra un mensaje informativo
- Calcula automáticamente el mismo día de la semana anterior para comparación

### Estados Visuales
- **Día único seleccionado**: Muestra gráfica completa con comparación dual
- **Múltiples días seleccionados**: Mensaje explicativo sobre el requisito
- **Estado de carga**: Spinner con mensaje "Cargando gráfica..."
- **Estado de error**: Botón de reintento con mensajes descriptivos en español

## Arquitectura Técnica

### Backend (Laravel)

#### Componentes
```php
// Controller Principal
app/Http/Controllers/Api/ChartController.php
- getHoursChart(GetHoursChartRequest $request)

// Validación de Request
app/Http/Requests/GetHoursChartRequest.php
- Validación de formato de fecha (Y-m-d)
- Validación de fechas no futuras
- Mensajes en español

// Servicio de API Externa
app/Services/ExternalApiService.php
- getHoursChart(string $date)
- fetchHoursData(string $date) - privado
- transformHoursChartComparison() - privado
```

#### Ruta
```php
Route::post('/api/dashboard/get-hours-chart', [ChartController::class, 'getHoursChart'])
    ->middleware(['auth', 'verified'])
    ->name('api.dashboard.hours-chart');
```

### Frontend (React + TypeScript)

#### Componentes
```typescript
// Componente Principal
resources/js/components/charts/hours-line-chart.tsx
- Props: date, title?, description?, className?
- Dual LineChart con Recharts
- Manejo de estados (loading, error, success)

// Hook de Estado
resources/js/hooks/useHoursChart.ts
- useHoursChartWithDate(date: string)
- Manejo reactivo de cambios de fecha

// Servicio API
resources/js/services/chart-api.ts
- getHoursChart(date: string)
- Manejo CSRF y autenticación

// Tipos TypeScript
resources/js/types/chart-types.ts
- HourData, HoursChartData, HoursChartApiRequest
```

## Integración con API Externa

### Configuración
```env
EXTERNAL_API_URL=http://192.168.100.20
EXTERNAL_API_TOKEN=tu_token_aqui
```

### Proceso de Llamada
1. **Input**: Fecha seleccionada (YYYY-MM-DD)
2. **Cálculo**: Fecha de semana anterior (automático)
3. **Doble llamada**: API externa para ambas fechas
4. **Transformación**: Unificación de datos en formato comparativo
5. **Respuesta**: Datos estructurados para gráfica

### Formato de Respuesta
```json
{
  "success": true,
  "data": [
    {
      "hour": "00:00",
      "current": 123,
      "previous": 98,
      "timestamp": "2025-08-20 00:00:00"
    },
    {
      "hour": "01:00", 
      "current": 456,
      "previous": 312,
      "timestamp": "2025-08-20 01:00:00"
    }
  ],
  "currentDate": "2025-08-20",
  "previousDate": "2025-08-13"
}
```

## Características de la Gráfica

### Tecnología de Visualización
- **Librería**: Recharts 2.15.4 (vía shadcn/ui)
- **Tipo**: LineChart dual con eje X de 24 horas
- **Responsivo**: Redimensionamiento automático
- **Accesibilidad**: Soporte ARIA y navegación por teclado

### Elementos Visuales
- **Línea Día Actual**: Sólida, color primario (`--chart-1`)
- **Línea Semana Anterior**: Punteada, color secundario (`--chart-2`)
- **Formato Tiempo**: 24 horas (00h, 01h, ..., 23h)
- **Tooltips**: Valores formateados en español con etiquetas de tiempo
- **Puntos Activos**: Resaltado en hover/focus

### Análisis de Datos
- **Cálculo de Tendencia**: Compara totales semanales
- **Cambio Porcentual**: Muestra mejora/declive con iconos apropiados
- **Detección de Picos**: Identifica valores máximos en ambos datasets
- **Estadísticas Resumen**: Totales actuales vs anteriores en footer

## Manejo de Errores

### Protección CSRF
- Extracción automática de token desde metadata
- Detección de expiración de sesión
- Manejo de credenciales con política `same-origin`

### Resilencia de Red
- Timeout de conexión con funcionalidad de reintento
- Recuperación de fallos API externos (fallback a valores cero)
- Manejo de estado de error en tiempo real

### Experiencia de Usuario
- Estados de carga con indicadores de progreso
- Botones de reintento para requests fallidos
- Mensajes de error contextuales en español
- Refresh automático al cambiar datos

## Ejemplo de Uso

### Dashboard Integration
```typescript
// En dashboard.tsx
const { dateRange, startDate } = useDateRangeFilter({
  defaultDateRange: {
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  },
  autoFetch: true
});

const isSingleDay = dateRange?.from && dateRange?.to && 
  isSameDay(dateRange.from, dateRange.to);

const shouldShowChart = isSingleDay && startDate;

return (
  <>
    {shouldShowChart && (
      <HoursLineChart
        date={startDate}
        title="Actividad por Hora - Comparación Semanal"
        description={`Comparando ${startDate} con el mismo día de la semana anterior`}
      />
    )}
    
    {!shouldShowChart && hasValidRange && (
      <div className="p-6 border border-dashed border-muted-foreground/25 rounded-lg text-center">
        <h3 className="text-lg font-semibold mb-2">Gráfica por Horas</h3>
        <p className="text-muted-foreground">
          Selecciona un solo día en el filtro para ver la gráfica de comparación por horas
        </p>
      </div>
    )}
  </>
);
```

### Standalone Usage
```typescript
import { HoursLineChart } from '@/components/charts/hours-line-chart';

<HoursLineChart
  date="2025-08-20"
  title="Mi Gráfica Personalizada"
  description="Análisis detallado de actividad horaria"
  className="my-custom-styles"
/>
```

## Casos de Prueba

### Funcionales
- [ ] Filtro de día único muestra gráfica
- [ ] Filtro de rango múltiple oculta gráfica
- [ ] Cambio de fecha actualiza datos automáticamente
- [ ] Cálculo correcto de semana anterior
- [ ] Manejo de días de API externa fallida

### UI/UX
- [ ] Estados de carga visibles
- [ ] Botones de reintento funcionales
- [ ] Tooltips informativos en español
- [ ] Responsive design en móvil/desktop
- [ ] Temas claro/oscuro aplicados correctamente

### Integración
- [ ] CSRF tokens válidos en requests
- [ ] Timeout handling de 30 segundos
- [ ] Manejo de errores de red
- [ ] Fallback a zeros en API failure
- [ ] Logging correcto de errores

## Mantenimiento

### Monitoreo
- Logs de Laravel para errores de API externa
- Métricas de tiempo de respuesta
- Rate de éxito/fallo de llamadas API
- Errores CSRF y autenticación

### Actualizaciones
- Token de API externa en `.env`
- Ajustes de timeout según SLA
- Modificaciones de formato de respuesta
- Nuevos casos de validación de fechas

### Troubleshooting
```bash
# Verificar configuración
php artisan config:show services.external_api

# Limpiar cache de configuración
php artisan config:clear

# Verificar logs
tail -f storage/logs/laravel.log | grep "hours chart"

# Test manual de API
curl -X POST http://localhost/api/dashboard/get-hours-chart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{"date": "2025-08-20"}'
```