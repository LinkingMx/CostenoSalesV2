# Credenciales de Prueba - Costeno Sales V2

**Proyecto**: Costeno Sales V2  
**Fecha de creación**: 2025-01-07  
**Propósito**: Documentar credenciales y rutas para testing y development

## 🌐 URLs del Proyecto

### URL Principal de Desarrollo
```
http://costenosalesv2.test
```

### Dashboard (Página Principal después del Login)
```
http://costenosalesv2.test/dashboard
```

### Página de Login
```
http://costenosalesv2.test/login
```

## 👤 Credenciales de Usuario de Prueba

### Usuario Principal de Testing
- **Email**: `armando.reyes@grupocosteno.com`
- **Password**: `C@sten0,2019+`
- **Rol**: Administrador/Usuario principal

## 🎭 Configuración para Playwright

### Ejemplo de configuración de login
```typescript
// playwright.config.ts o en tests
const LOGIN_CREDENTIALS = {
  email: 'armando.reyes@grupocosteno.com',
  password: 'C@sten0,2019+',
  baseUrl: 'http://costenosalesv2.test'
};

// Función de login para tests
async function loginUser(page: Page) {
  await page.goto('http://costenosalesv2.test/login');
  await page.fill('[name="email"]', 'armando.reyes@grupocosteno.com');
  await page.fill('[name="password"]', 'C@sten0,2019+');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://costenosalesv2.test/dashboard');
}
```

### URLs Importantes para Testing
```typescript
const TEST_URLS = {
  home: 'http://costenosalesv2.test',
  login: 'http://costenosalesv2.test/login',
  dashboard: 'http://costenosalesv2.test/dashboard',
  register: 'http://costenosalesv2.test/register',
  profile: 'http://costenosalesv2.test/profile',
  settings: 'http://costenosalesv2.test/settings'
};
```

## 🔧 Configuración de Entorno

### Variables de Entorno para Testing
```env
APP_URL=http://costenosalesv2.test
TEST_USER_EMAIL=armando.reyes@grupocosteno.com
TEST_USER_PASSWORD=C@sten0,2019+
```

### Configuración Laravel para Testing
```php
// En phpunit.xml o .env.testing
<env name="APP_URL" value="http://costenosalesv2.test"/>
<env name="DB_CONNECTION" value="sqlite"/>
<env name="DB_DATABASE" value=":memory:"/>
```

## 🧪 Casos de Uso para Testing

### 1. Test de Login
- Navegar a `/login`
- Llenar credenciales
- Verificar redirección a `/dashboard`
- Validar que aparezca "Mis sucursales" en lugar de "navigation.dashboard"

### 2. Test de Navegación
- Login exitoso
- Verificar sidebar muestra "Mis sucursales"
- Verificar breadcrumb muestra "Mis sucursales"
- Verificar título de página

### 3. Test de Traducción
- Verificar que `t('navigation.dashboard')` se resuelve correctamente
- Validar archivos de traducción están cargados
- Comprobar sistema de i18n funcional

## 🐛 Problemas Conocidos

### Problema Actual: Traducción no Funciona
- **Síntoma**: Aparece "navigation.dashboard" en lugar del texto traducido
- **Ubicación**: Sidebar y breadcrumbs
- **Causa**: Sistema de traducción no está configurado correctamente
- **Archivos afectados**: 
  - `resources/js/pages/dashboard.tsx`
  - `resources/js/components/app-sidebar.tsx`

### Archivos de Traducción
- **Español**: `resources/lang/es/navigation.php`
- **Configuración**: Verificar que Laravel esté configurado para usar español
- **Hook**: Verificar implementación de `useTranslation()`

## 📝 Notas de Desarrollo

### Estado Actual
- ✅ Credenciales funcionando
- ✅ Login/Dashboard accesibles
- ❌ Sistema de traducción no funciona
- ❌ Texto hardcoded "navigation.dashboard" aparece en UI

### Próximos Pasos
1. Investigar implementación de `useTranslation()` hook
2. Verificar configuración de i18n en Laravel/Inertia
3. Corregir carga de archivos de traducción
4. Validar con Playwright que los cambios funcionen

---

**⚠️ IMPORTANTE**: Estas credenciales son solo para development/testing. NO usar en producción.