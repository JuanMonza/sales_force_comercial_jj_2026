# Manual Tecnico

## 1. Requisitos

- Docker y Docker Compose
- Opcional para desarrollo local:
  - Node.js 20+
  - npm 10+

## 2. Despliegue local

1. Copiar variables:
```bash
cp .env.example .env
```
2. Levantar stack:
```bash
docker compose up --build
```

## 3. Base de datos

Scripts autoejecutados por Postgres al iniciar:
- `sql/001_schema.sql`
- `sql/002_partitions.sql`
- `sql/003_seed.sql`

## 4. Credenciales de prueba

- `admin@demo.com / Admin123!`
- `director@demo.com / Admin123!`
- `coordinador@demo.com / Admin123!`
- `asesor@demo.com / Admin123!`

## 5. Buenas practicas para produccion

- Encriptar passwords seed con bcrypt y eliminar fallback plaintext.
- Rotar `JWT_SECRET`.
- Aplicar HTTPS y control estricto CORS.
- Integrar observabilidad (logs estructurados, metricas, trazas).
- Definir backup y retencion de particiones historicas.

## 6. Roadmap sugerido

1. Integrar BI avanzado con tabla de agregados diaria.
2. Incluir exportacion directa a Excel/PDF en backend.
3. Agregar motor de forecast y anomalias (ML).
4. Completar capa SaaS de suscripciones y facturacion.

