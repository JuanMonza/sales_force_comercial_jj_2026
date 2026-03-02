# Sales Force Comercial

Plataforma empresarial de analitica y gestion comercial estilo Power BI + Salesforce, multi-tenant y por roles.

## Stack

- Frontend: Next.js 14, Tailwind CSS, Framer Motion, Recharts
- Backend: NestJS, JWT + RBAC, PostgreSQL, Redis
- Datos: particionamiento mensual, materialized views, versionado funcional
- Operacion: Docker, Kubernetes-ready, Prometheus metrics, CI/CD

## Roles

- `ADMINISTRADOR`
- `DIRECTOR`
- `COORDINADOR`
- `ASESOR`

## Ejecucion local (recomendada con Docker)

1. Copiar variables:
   - `cp .env.example .env`
2. Levantar todo:
   - `docker compose up --build`
3. Abrir:
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:4000/api`

Si ya tenias una base creada antes de estas extensiones, aplica SQL nuevos manualmente:

- `sql/005_enterprise_extensions.sql`
- `sql/006_operational_versioning.sql`

## Ejecucion local sin Docker

1. Instalar PostgreSQL y Redis locales.
2. Ajustar `.env` con URLs locales.
3. Backend:
   - `cd backend`
   - `npm install`
   - `npm run start:dev`
4. Frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## Credenciales demo

- Admin: `admin@demo.com / Admin123!`
- Director: `director@demo.com / Admin123!`
- Coordinador: `coordinador@demo.com / Admin123!`
- Asesor: `asesor@demo.com / Admin123!`

## Funcionalidad enterprise implementada

- Dashboard comparativo mes actual vs anterior
- Cumplimiento asesores (actual/anterior)
- Como vamos regional (actual/anterior)
- Ventas por dia y tracking de reportes
- Importacion CSV y XLSX
- Exportacion PDF y Excel
- Edicion historica segura de ventas
- Versionado de datos por registro (`sale_versions`, `record_versions`)
- IA real:
  - forecast predictivo (regresion lineal)
  - deteccion de anomalias (z-score)
  - recomendaciones automaticas
- SaaS:
  - planes
  - suscripciones
  - facturacion
  - branding por tenant
- Jobs batch nocturnos
- Observabilidad con endpoint Prometheus `/api/metrics`
- Hardening inicial:
  - `helmet`
  - `compression`
  - throttling global

## Documentacion

- Arquitectura: `docs/architecture.md`
- API: `docs/api.md`
- Manual tecnico: `docs/manual_tecnico.md`
- Performance / carga: `docs/performance.md`

## CI/CD

Pipeline GitHub Actions en `.github/workflows/ci.yml` con:

- backend build/test/audit
- frontend build

## Siguiente bloque (pendiente intencional)

Tal como acordamos, queda para el cierre final:

- Admin completo de jerarquia y catalogos:
  - CRUD de `regionals`, `zones`, `plans`, `services`, `status_catalog`, `budgets` desde panel (hoy parcial)
