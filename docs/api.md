# API REST

Base URL: `/api`

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

Respuesta:
```json
{
  "accessToken": "jwt",
  "user": {
    "id": "uuid",
    "tenantId": "uuid",
    "email": "admin@demo.com",
    "role": "ADMINISTRADOR"
  }
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

Filtros soportados en `GET /sales`:
- `regionalId`
- `zoneId`
- `advisorId`
- `directorId`
- `coordinatorId`
- `startDate`
- `endDate`
- `statusId`
- `planId`
- `quincena`
- `limit`
- `offset`

## KPIs

- `GET /kpis/summary`
- `GET /kpis/advisor-compliance/current`
- `GET /kpis/advisor-compliance/previous`
- `GET /kpis/regional-progress/current`
- `GET /kpis/regional-progress/previous`
- `GET /kpis/daily-sales`
- `GET /kpis/reporting-tracking`

## Importaciones

- `POST /imports/sales-csv` (multipart, campo `file`)

Columnas CSV esperadas:
- `advisorEmail`
- `saleAmount`
- `saleDate`
- `planCode` (opcional)
- `statusCode` (opcional)
- `note` (opcional)

## Auditoria (Admin)

- `GET /audit?tableName=users&limit=100&offset=0`

## Healthcheck

- `GET /health`

