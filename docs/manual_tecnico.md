# Manual Tecnico

## 1. Requisitos

- Docker y Docker Compose
- Opcional para desarrollo local:
  - Node.js 20+
  - npm 10+

## 2. Arranque rapido

1. Copiar variables:

```bash
cp .env.example .env
```

2. Levantar stack completo:

```bash
docker compose up --build
```

3. URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000/api`
- Health: `http://localhost:4000/api/health`
- Metrics: `http://localhost:4000/api/metrics`

## 3. Base de datos y SQL bootstrap

Scripts autoejecutados al iniciar Postgres:

- `sql/001_schema.sql`
- `sql/002_partitions.sql`
- `sql/003_seed.sql`
- `sql/005_enterprise_extensions.sql`
- `sql/006_operational_versioning.sql`

## 4. Credenciales demo

usuarios logins para pruebas 

- `admin@demo.com / Admin123!`
- `director@demo.com / Admin123!`
- `coordinador@demo.com / Admin123!`
- `asesor@demo.com / Admin123!`

## 5. Modulos enterprise implementados

- Importacion CSV + XLSX
- Exportacion PDF + Excel
- Edicion historica segura de ventas
- Versionado funcional por registro (`record_versions`)
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
- Observabilidad Prometheus
- Rate limiting global

## 6. Jobs batch

- Job programado: `02:00` diario (cron server timezone)
- Endpoint manual admin: `POST /api/jobs/nightly-run`
- Acciones:
  - `refresh_analytics_views()`
  - snapshots de forecast IA por tenant activo

## 7. Observabilidad

- Endpoint: `GET /api/metrics`
- Integracion opcional con Prometheus/Grafana:
  - config: `infra/observability/prometheus.yml`
  - compose: `infra/observability/docker-compose.observability.yml`

## 8. Pruebas de carga

- Script k6: `scripts/load_test_k6.js`
- Guia: `docs/performance.md`
- Umbral objetivo: `p95 < 2000ms`

## 9. CI/CD

- Pipeline: `.github/workflows/ci.yml`
- Jobs:
  - backend install/build/test/audit
  - frontend install/build

## 10. Hardening recomendado para produccion

1. Migrar secretos a Secret Manager (no `.env` plano).
2. Habilitar TLS extremo a extremo.
3. Activar WAF y reglas de IP allowlist para endpoints admin.
4. Integrar trazas distribuidas (OpenTelemetry).
5. Politicas de backup y retencion de particiones.
