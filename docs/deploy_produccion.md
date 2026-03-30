# Despliegue Produccion - Sales Force Comercial

Fecha: 2026-03-30

## 1. Objetivo

Publicar plataforma en modo real:

- Frontend en Vercel (Next.js)
- Backend en contenedor Docker (Render/Railway/Fly/Cloud Run/VPS)
- Postgres y Redis administrados
- AppSheet conectado por webhook HTTPS al backend

## 2. Arquitectura final

- `app.tudominio.com` -> Frontend (Vercel)
- `api.tudominio.com` -> Backend NestJS (Docker)
- Backend conecta a Postgres y Redis de produccion
- AppSheet llama `https://api.tudominio.com/api/appsheet/sales?...`

Nota: Vercel no corre `docker compose` para backend. El backend va en otro proveedor.

## 3. Roles del equipo

- Frontend Lead:
  - Crear proyecto en Vercel
  - Configurar variables `NEXT_PUBLIC_*`
  - Configurar dominio `app.tudominio.com`
- Backend Lead:
  - Desplegar imagen Docker de `backend/`
  - Configurar variables backend y CORS
  - Validar `/api/health` y `/api/appsheet/ping`
- Data/DB:
  - Provisionar Postgres y Redis
  - Ejecutar SQL bootstrap y validaciones
  - Configurar backups y retencion
- Integraciones/AppSheet:
  - Configurar Bot/Webhook
  - Probar insercion de venta real
  - Validar sincronizacion y reintentos
- QA/Release:
  - Smoke test end-to-end
  - Validar seguridad basica y logs
  - Aprobar salida a produccion

## 4. Variables de entorno

### Backend (produccion)

```
NODE_ENV=production
BACKEND_PORT=4000
DEFAULT_TENANT_ID=<uuid-tenant-real>
JWT_SECRET=<secreto-fuerte>
JWT_EXPIRES_IN=8h
DATABASE_URL=<postgres-produccion-url>
REDIS_URL=<redis-produccion-url>
CORS_ORIGIN=https://app.tudominio.com
APPSHEET_API_KEY=<api-key-larga-y-privada>
```

### Frontend (Vercel)

```
NEXT_PUBLIC_API_URL=https://api.tudominio.com/api
NEXT_PUBLIC_DEFAULT_TENANT_ID=<uuid-tenant-real>
```

## 5. Paso a paso tecnico

1. Crear servicios gestionados:
   - Postgres
   - Redis
2. Desplegar backend Docker:
   - Build desde `backend/Dockerfile`
   - Exponer puerto 4000
   - Configurar variables del bloque backend
3. Ejecutar bootstrap SQL:
   - `sql/001_schema.sql`
   - `sql/002_partitions.sql`
   - `sql/003_seed.sql` (o seed real)
   - `sql/005_enterprise_extensions.sql`
   - `sql/006_operational_versioning.sql`
4. Validar backend:
   - `GET https://api.tudominio.com/api/health`
   - `GET https://api.tudominio.com/api/appsheet/ping?apiKey=<key>`
5. Desplegar frontend en Vercel:
   - Root: `frontend`
   - Variables `NEXT_PUBLIC_*`
   - Dominio `app.tudominio.com`
6. Configurar AppSheet webhook:
   - URL:
     `POST https://api.tudominio.com/api/appsheet/sales?apiKey=<APPSHEET_API_KEY>`
   - Body:
     ```json
     {
       "advisorDocument": "<<[DocumentoAsesor]>>",
       "saleAmount": <<[ValorVenta]>>,
       "saleDate": "<<TEXT([FechaVenta], \"YYYY-MM-DD\")>>",
       "planId": "<<[PlanId]>>",
       "statusId": "<<[StatusId]>>",
       "note": "<<[Observacion]>>"
     }
     ```
7. Validar dashboard:
   - Login correcto
   - Venta en AppSheet reflejada en panel (auto refresh cada 15s)

## 6. Checklist go-live

- [ ] `api.tudominio.com/api/health` responde 200
- [ ] Login frontend funciona en `app.tudominio.com`
- [ ] AppSheet crea venta real en backend
- [ ] KPI refleja nuevo dato en <= 30s
- [ ] CORS solo permite dominio frontend
- [ ] JWT secret y API keys no estan en git
- [ ] Backup diario de DB habilitado
- [ ] Monitoreo y alertas basicas habilitadas

## 7. Riesgos y mitigacion

- Riesgo: duplicado por reintentos webhook
  - Mitigar con idempotencia (`external_id` unico)
- Riesgo: uso de apiKey en query string
  - Mitigar moviendo clave a header o firma HMAC
- Riesgo: CORS abierto en produccion
  - Mitigar con lista estricta de dominios

## 8. Pruebas minimas post despliegue

1. Login admin correcto.
2. Crear una venta desde AppSheet.
3. Confirmar fila en DB `sales`.
4. Confirmar KPIs y tablas del dashboard.
5. Revisar logs backend sin errores 4xx/5xx repetitivos.

