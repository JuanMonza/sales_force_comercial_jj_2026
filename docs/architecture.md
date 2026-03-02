# Arquitectura Tecnica

## Resumen

Arquitectura empresarial multi-tenant con:

- Frontend: Next.js + Tailwind + Framer Motion
- Backend: NestJS modular (REST)
- Datos: PostgreSQL particionado + Redis cache
- Operacion: Docker/Kubernetes-ready, jobs nocturnos y observabilidad Prometheus

## Modulos Backend

1. Core
- `AuthModule`: login JWT y scope por rol
- `UsersModule`: CRUD de usuarios y asignacion jerarquica
- `SalesModule`: registro/consulta de ventas y edicion historica segura
- `KpiModule`: reporteria analitica (mes actual vs anterior)
- `AuditModule`: logs tecnicos

2. Enterprise
- `ImportsModule`: importacion CSV/XLSX
- `ExportsModule`: exportacion PDF/Excel
- `BusinessEditsModule`: edicion global de presupuestos + versionado por registro
- `AiModule`: forecast predictivo real, anomalias y recomendaciones
- `SaasModule`: planes, suscripciones, facturacion y branding tenant
- `JobsModule`: batch nocturno (refresh materialized views + snapshots IA)
- `ObservabilityModule`: metricas HTTP + endpoint `/api/metrics`

## Modelo de datos

Base transaccional en PostgreSQL:

- `sales` particionada por mes (`RANGE sale_date`)
- indices por `tenant_id + fecha + asesor/zona/regional/status/plan`
- tablas de negocio: `users`, `regionals`, `zones`, `plans`, `services`, `budgets`, `status_catalog`
- tablas enterprise: `sale_versions`, `record_versions`, `ai_forecast_snapshots`, `saas_plans`, `tenant_subscriptions`,
  `billing_invoices`, `tenant_branding`

## Seguridad y Hardening

- JWT + RBAC por rol
- alcance de datos por jerarquia (director/coordinador/asesor)
- `helmet` + `compression`
- `ThrottlerGuard` global (rate limiting)
- soft delete en entidades criticas
- auditoria y versionado funcional por registro

## Escalamiento y rendimiento

- particionamiento mensual
- materialized view `mv_monthly_sales_summary`
- cache Redis para KPIs
- job nocturno para precomputo
- script k6 con umbral `p95 < 2s`

## Observabilidad

- metricas Prometheus en `/api/metrics`
- histogramas de latencia HTTP
- conteo de requests por ruta/metodo/status
- stack opcional Prometheus + Grafana en `infra/observability`
