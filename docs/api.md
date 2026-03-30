# API REST

Base URL: `/api`

Headers requeridos:

- `x-tenant-id: <uuid tenant>`
- `Authorization: Bearer <jwt>` (excepto login)

## Auth

### `POST /auth/login`

Body:

```json
{
  "email": "admin@demo.com",
  "password": "Admin123!",
  "tenantId": "11111111-1111-1111-1111-111111111111"
}
```

## Usuarios (Admin)

- `GET /users`
- `GET /users/:id`
- `POST /users`
- `PATCH /users/:id`
- `DELETE /users/:id`

## Ventas

- `POST /sales`
- `GET /sales`
- `PATCH /sales/:id` (admin, edicion historica segura)
- `GET /sales/:id/versions` (admin)
- `GET /sales/catalogs`

## KPIs

- `GET /kpis/summary`
- `GET /kpis/sales-report-comparative`
- `GET /kpis/advisor-compliance/current`
- `GET /kpis/advisor-compliance/previous`
- `GET /kpis/regional-progress/current`
- `GET /kpis/regional-progress/previous`
- `GET /kpis/daily-sales`
- `GET /kpis/reporting-tracking`

## Importaciones

- `POST /imports/sales-csv` (multipart, campo `file`)
- `POST /imports/sales-xlsx` (multipart, campo `file`)

Columnas esperadas:

- `advisorEmail`
- `saleAmount`
- `saleDate`
- `planCode` (opcional)
- `statusCode` (opcional)
- `note` (opcional)

## Exportaciones

- `GET /exports/sales.xlsx`
- `GET /exports/sales-report.pdf`

Filtros compatibles (query params): `month`, `regionalId`, `zoneId`, `advisorId`, `directorId`, `coordinatorId`,
`statusId`, `planId`, `serviceId`, `startDate`, `endDate`, `quincena`.

## IA Comercial

- `GET /ai/forecast`
- `GET /ai/anomalies`
- `GET /ai/recommendations`
- `POST /ai/forecast/snapshot` (admin/director/coordinador)

Query params:

- `month=YYYY-MM`
- `scopeType=TENANT|REGIONAL|ZONE|ADVISOR` (admin)
- `scopeId=<uuid>` (si scopeType != TENANT)
- `zScoreThreshold` (anomalies)
- `limit` (anomalies)

## SaaS (Admin)

- `GET /saas/plans`
- `POST /saas/plans`
- `PATCH /saas/plans/:id`
- `GET /saas/subscriptions`
- `POST /saas/subscriptions`
- `GET /saas/invoices`
- `POST /saas/invoices`
- `GET /saas/branding` (todos los roles autenticados)
- `PATCH /saas/branding`
- `GET /saas/customer-profile`

## Edicion Global Segura (Admin)

- `PATCH /business-edits/budgets/:id`
- `GET /business-edits/record-versions?entityName=sales|users|budgets&recordId=<uuid>&limit=100`

## Jobs batch (Admin)

- `POST /jobs/nightly-run`

Job nocturno programado:

- refresca materialized views
- persiste snapshots IA por tenant

## Auditoria (Admin)

- `GET /audit?tableName=users&limit=100&offset=0`

## Observabilidad

- `GET /metrics` (Prometheus format)
- `GET /health`

## AppSheet Integration

Headers requeridos:

- `x-api-key: <APPSHEET_API_KEY>`
- `x-idempotency-key: <id-unico-por-venta>` (solo en `POST /appsheet/sales`)

Compatibilidad temporal:

- En `development` se permite `?apiKey=...` para pruebas locales.
- En `production` se exige header `x-api-key`.

Endpoints:

- `GET /appsheet/ping`
- `GET /appsheet/advisor/:document`
- `GET /appsheet/catalogs`
- `GET /appsheet/sales?advisorDocument=<cedula>&limit=50`
- `POST /appsheet/sales`

Body `POST /appsheet/sales`:

```json
{
  "advisorDocument": "12345678",
  "saleAmount": 120000,
  "saleDate": "2026-03-30",
  "planId": "optional-uuid",
  "statusId": "optional-uuid",
  "note": "optional"
}
```
