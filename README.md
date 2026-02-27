# Sales Force Comercial

Sistema empresarial de ventas con arquitectura escalable estilo Power BI + Salesforce.

## Stack

- Frontend: Next.js 14, TypeScript, Tailwind CSS, Recharts
- Backend: NestJS, TypeScript, PostgreSQL, Redis, JWT + RBAC
- Infraestructura: Docker Compose (base local), preparado para Kubernetes

## Estructura

- `frontend/`: Aplicacion web para dashboard por rol
- `backend/`: API REST con autenticacion y modulos de negocio
- `sql/`: Modelo de base de datos, particiones y seeds
- `docs/`: Arquitectura, API y guia tecnica

## Inicio Rapido

1. Copiar variables:
   - `cp .env.example .env`
2. Levantar servicios:
   - `docker compose up --build`
3. URLs:
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:4000/api`
4. Usuarios seed:
   - Admin: `admin@demo.com / Admin123!`
   - Director: `director@demo.com / Admin123!`
   - Coordinador: `coordinador@demo.com / Admin123!`
   - Asesor: `asesor@demo.com / Admin123!`

## Alcance Implementado

- Multi-tenant basico por `x-tenant-id`
- Autenticacion JWT
- RBAC por rol (administrador, director, coordinador, asesor)
- Registro y consulta de ventas
- KPIs de mes actual vs anterior
- Cumplimiento de asesores
- Seguimiento de reportes
- Importacion CSV de ventas
- Exportacion basica en JSON/CSV desde endpoints
- Auditoria basica de cambios

## Notas

- El sistema es una base funcional enterprise-ready.
- Para produccion: activar TLS, secretos gestionados, rotacion de llaves JWT, CI/CD y observabilidad completa.
