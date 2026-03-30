# Pruebas de Carga y Evidencia de SLA

## Objetivo

Validar SLA de respuesta menor a 2 segundos (`p95 < 2000ms`) sobre endpoints criticos de dashboard.

## Herramienta

- k6
- Script: `scripts/load_test_k6.js`

## Ejecucion

1. Levantar stack:
   - `docker compose up --build` inicio de proyecto base para ejecutar canal 201
2. Instalar k6 (si no esta instalado).
3. Ejecutar prueba:
   - `k6 run scripts/load_test_k6.js`

Variables opcionales:

- `BASE_URL` (default `http://localhost:3001/api`)
- `TENANT_ID` (default tenant demo)
- `EMAIL`
- `PASSWORD`

Ejemplo:

```bash
BASE_URL=http://localhost:4000/api TENANT_ID=11111111-1111-1111-1111-111111111111 k6 run scripts/load_test_k6.js
```

## Criterios de aceptacion

- `http_req_failed < 1%`
- `http_req_duration p(95) < 2000ms`
- `http_req_duration avg < 1200ms`

## Evidencia sugerida

Guardar en el reporte:

- fecha/hora de ejecucion
- commit SHA
- resumen de `k6` (p95, avg, error rate)
- captura de graficas de `http_req_duration` si se integra con Grafana/Prometheus

## Recomendaciones si no cumple

- aumentar cache TTL para KPIs de alto costo
- revisar indices en `sales` para filtros mas usados
- aumentar replicas backend y pool de conexiones
- ejecutar refresh de materialized views en ventana nocturna
