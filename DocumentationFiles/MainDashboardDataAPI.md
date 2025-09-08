# MainDashboardDataAPI - Configuración y Documentación

**Proyecto**: Costeno Sales V2  
**Fecha de creación**: 2025-01-07  
**Última actualización**: 2025-01-07  

## 📋 Información General

### Propósito
API externa utilizada para obtener datos del dashboard principal de ventas. Proporciona métricas de ventas, clientes, productos y rendimiento financiero para mostrar en la interfaz de usuario.

### Endpoint Principal
```
POST http://192.168.100.20/api/main_dashboard_data
```

## 🔐 Autenticación

### Tipo de Autenticación
Bearer Token Authentication

### Token de Acceso
```
342|AxRYaMAz4RxhiMwYTXJmUvCXvkjq24MrXW3YgrF91ef9616f
```

### Headers Requeridos
```http
Accept: application/json
Content-Type: application/json
Authorization: Bearer 342|AxRYaMAz4RxhiMwYTXJmUvCXvkjq24MrXW3YgrF91ef9616f
```

## 📝 Formato de Request

### Estructura del Request
```json
{
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD"
}
```

### Ejemplo de Request
```json
{
  "start_date": "2025-01-01",
  "end_date": "2025-01-31"
}
```

### Validaciones
- **start_date**: Debe ser una fecha válida en formato YYYY-MM-DD
- **end_date**: Debe ser una fecha válida en formato YYYY-MM-DD
- **start_date** no puede ser posterior a **end_date**
- Las fechas no pueden estar en el futuro
- Rango máximo recomendado: 1 año

## 📊 Estructura del Response

### Response Exitoso
```json
{
  "success": true,
  "data": {
    "total_sales": 150000,
    "total_revenue": 125000,
    "average_order_value": 85.50,
    "sales_count": 1462,
    "total_customers": 890,
    "new_customers": 125,
    "returning_customers": 765,
    "products_sold": 3200,
    "top_selling_products": [
      {
        "product_id": 101,
        "product_name": "Producto A",
        "quantity_sold": 450,
        "revenue": 22500,
        "profit": 9000
      }
    ],
    "low_stock_products": [
      {
        "product_id": 205,
        "product_name": "Producto B",
        "current_stock": 5,
        "minimum_stock": 20,
        "status": "critical"
      }
    ],
    "gross_profit": 45000,
    "net_profit": 38000,
    "profit_margin": 30.4,
    "daily_sales": [
      {
        "date": "2025-01-01",
        "sales": 2500,
        "revenue": 2100,
        "orders": 28
      }
    ],
    "monthly_comparison": {
      "current_month": {
        "sales": 125000,
        "revenue": 105000,
        "orders": 1200
      },
      "previous_month": {
        "sales": 118000,
        "revenue": 98000,
        "orders": 1150
      },
      "growth_percentage": {
        "sales": 5.9,
        "revenue": 7.1,
        "orders": 4.3
      }
    },
    "pending_orders": 45,
    "completed_orders": 1380,
    "cancelled_orders": 37
  },
  "message": "Data retrieved successfully",
  "timestamp": "2025-01-07T10:30:00Z"
}
```

### Response de Error
```json
{
  "success": false,
  "message": "Invalid date range",
  "error_code": "INVALID_DATE_RANGE",
  "details": {
    "start_date": "2025-01-01",
    "end_date": "2024-12-31"
  }
}
```

## 🛠 Implementación en el Proyecto

### Archivos Relacionados

1. **Tipos TypeScript**: `/resources/js/types/api.ts`
   - Define todas las interfaces para request/response
   - Incluye validaciones de tipos

2. **Cliente HTTP**: `/resources/js/services/api/client.ts`
   - Cliente base con autenticación automática
   - Manejo de errores y reintentos
   - Timeout de 30 segundos

3. **Servicio Dashboard**: `/resources/js/services/api/dashboard.ts`
   - Servicio especializado para este API
   - Validaciones de fechas
   - Rangos predefinidos (hoy, ayer, última semana, etc.)

4. **Hooks React**: `/resources/js/hooks/use-dashboard-data.ts`
   - Hooks personalizados para manejo de estado
   - Actualización automática
   - Manejo de loading y errores

### Rangos Predefinidos Disponibles
- `today` - Hoy
- `yesterday` - Ayer
- `last_7_days` - Últimos 7 días
- `last_30_days` - Últimos 30 días
- `last_90_days` - Últimos 90 días
- `this_month` - Este mes
- `last_month` - Mes pasado
- `this_year` - Este año

## 💻 Ejemplos de Uso

### Hook con Período Predefinido
```typescript
import { useDashboardDataForPeriod } from '@/hooks/use-dashboard-data';

const Dashboard = () => {
  const { data, loading, error, refetch } = useDashboardDataForPeriod('last_30_days');
  
  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h1>Ventas Totales: ${data?.total_revenue}</h1>
      <button onClick={() => refetch()}>Actualizar</button>
    </div>
  );
};
```

### Hook con Rango Personalizado
```typescript
import { useDashboardDataForDateRange } from '@/hooks/use-dashboard-data';

const CustomDashboard = () => {
  const { data, loading, error } = useDashboardDataForDateRange(
    '2025-01-01', 
    '2025-01-31'
  );
  
  return (
    <div>
      {data && (
        <>
          <p>Clientes Nuevos: {data.new_customers}</p>
          <p>Productos Vendidos: {data.products_sold}</p>
          <p>Margen de Ganancia: {data.profit_margin}%</p>
        </>
      )}
    </div>
  );
};
```

### Uso Directo del Servicio
```typescript
import { dashboardApiService } from '@/services/api/dashboard';

const fetchTodayData = async () => {
  try {
    const data = await dashboardApiService.getDashboardDataForPeriod('today');
    console.log('Datos de hoy:', data);
  } catch (error) {
    console.error('Error al obtener datos:', error);
  }
};

const fetchCustomRange = async () => {
  try {
    const data = await dashboardApiService.getDashboardDataForDateRange(
      '2025-01-01',
      '2025-01-07'
    );
    console.log('Datos personalizados:', data);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## 🔧 Configuración

### Variables de Entorno (si se necesitan cambios futuros)
```env
# En caso de que se requiera configurar dinámicamente
DASHBOARD_API_URL=http://192.168.100.20/api/main_dashboard_data
DASHBOARD_API_TOKEN=342|AxRYaMAz4RxhiMwYTXJmUvCXvkjq24MrXW3YgrF91ef9616f
DASHBOARD_API_TIMEOUT=30000
```

### Configuración Actual (hardcoded)
- **URL**: `http://192.168.100.20/api/main_dashboard_data`
- **Token**: `342|AxRYaMAz4RxhiMwYTXJmUvCXvkjq24MrXW3YgrF91ef9616f`
- **Timeout**: 30 segundos
- **Reintentos**: 3 con exponential backoff

## 🚨 Manejo de Errores

### Tipos de Errores Comunes
1. **Network Error**: Problemas de conectividad
2. **HTTP 401**: Token de autenticación inválido
3. **HTTP 422**: Datos de request inválidos
4. **HTTP 500**: Error interno del servidor
5. **Timeout**: Request excede 30 segundos

### Estrategia de Reintentos
- **Errores de red**: Se reintenta automáticamente
- **Errores 4xx**: No se reintenta (errores del cliente)
- **Errores 5xx**: Se reintenta con backoff exponencial
- **Máximo 3 reintentos**

## 📈 Consideraciones de Performance

### Optimizaciones Implementadas
- **Deduplicación de requests**: Evita requests duplicados
- **Cleanup automático**: Previene memory leaks
- **Abort controllers**: Cancela requests obsoletos
- **Background refresh**: Actualiza datos sin bloquear UI

### Recomendaciones de Uso
- Usar `useDashboardDataForPeriod` para períodos comunes
- Implementar debouncing para búsquedas en tiempo real
- Considerar caching del lado del cliente para datos que no cambian frecuentemente
- Usar `useRealTimeDashboardData` solo cuando sea necesario el refresh automático

## 🔒 Seguridad

### Consideraciones de Seguridad
- El token de API está hardcoded (considerar moverlo a variables de entorno en producción)
- Validación de datos en el frontend antes de enviar requests
- Manejo seguro de errores sin exponer información sensible
- HTTPS recomendado para producción

## 📞 Soporte y Contacto

### Para Cambios en el API
- Contactar al equipo responsable del API externo
- Verificar versioning del API antes de actualizaciones
- Documentar cualquier cambio en este archivo

### Logs y Debugging
- Los errores se registran en la consola del navegador
- Usar Network tab del browser para debuggear requests
- Verificar el estado del servidor externo en caso de errores persistentes

---

**Nota**: Esta documentación debe actualizarse cada vez que se modifique la configuración o funcionalidad del API.