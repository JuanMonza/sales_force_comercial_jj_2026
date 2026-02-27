# Arquitectura Tecnica

## Resumen

El sistema esta compuesto por tres capas principales:

- Frontend `Next.js` para experiencia de usuario y dashboards.
- Backend `NestJS` para reglas de negocio, seguridad y analitica.
- Datos `PostgreSQL + Redis` para persistencia transaccional y cache de KPIs.

## Componentes

1. Frontend
- App Router en Next.js.
- Sesion JWT almacenada en navegador.
- Dashboard adaptado por rol con filtros y visualizaciones.

2. Backend
- API REST modular.
- `AuthModule` para login JWT.
- `UsersModule` para administracion de usuarios.
- `SalesModule` para registro y consulta de ventas.
- `KpiModule` para calculo de indicadores mensuales y seguimiento.
- `ImportsModule` para carga CSV.
- `AuditModule` para trazabilidad.

3. Base de datos
- Modelo multi-tenant por `tenant_id`.
- Tabla `sales` particionada por mes.
- Indices para filtros de fecha, asesor, zona, regional, estado y plan.
- Materialized view para resumen mensual.

## Seguridad

- JWT con expiracion configurable.
- RBAC por roles `ADMINISTRADOR`, `DIRECTOR`, `COORDINADOR`, `ASESOR`.
- Restricciones por jerarquia:
  - Director: regional propia.
  - Coordinador: zona propia.
  - Asesor: ventas propias.
- Auditoria de cambios via triggers SQL.

## Escalabilidad

- Particionamiento mensual de `sales` para gran volumen.
- Cache de KPIs con Redis.
- Docker para despliegue local y base para orquestacion.
- Preparado para evolucionar a:
  - Kubernetes
  - Balanceador
  - CDN
  - Data warehouse externo

