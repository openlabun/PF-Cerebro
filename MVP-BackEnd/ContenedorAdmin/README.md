# ContenedorAdmin (Observabilidad + Administración) - NestJS

Este contenedor implementa capacidades de observabilidad operativa para CEREBRO y deja preparada la integración con administración de torneos sobre Contenedor1.

## Stack

- NestJS
- Swagger / OpenAPI
- Configuración por variables de entorno

## Objetivos

- Saber cuántos usuarios hay en la plataforma.
- Ver evolución de usuarios en el tiempo.
- Ver qué juegos han jugado los usuarios.
- Preparar rutas administrativas para torneos conectadas a Contenedor1.

## Endpoints de observabilidad

- `GET /health`
- `GET /api/admin/overview`
- `GET /api/admin/users/total`
- `GET /api/admin/users/timeseries?from=2026-01-01&to=2026-01-31`
- `GET /api/admin/games/by-user`
- `GET /api/admin/users/:userId/games`

> Nota: en esta primera versión el origen es `observability-seed` (datos semilla), para permitir desarrollar el módulo admin sin bloquearse por fuentes externas.

## Endpoints de administración de torneos (set up futuro)

- `POST /api/admin/torneos`
- `GET /api/admin/torneos`
- `GET /api/admin/torneos/:id`
- `PUT /api/admin/torneos/:id`
- `PATCH /api/admin/torneos/:id/estado`

Estas rutas consumen Contenedor1 usando:

- `CONTENEDOR1_BASE_URL` (default: `http://cerebro-api:3000/api`)
- auth admin por token (`ADMIN_API_TOKEN` + opcional `ADMIN_REFRESH_TOKEN`) o por credenciales (`ADMIN_EMAIL` + `ADMIN_PASSWORD`)

## Swagger / OpenAPI

- UI: `GET /api/admin/docs`
- JSON: `GET /api/admin/openapi.json`

Ejemplo local:

```text
http://localhost:3001/api/admin/docs
```

## Variables de entorno

- `PORT` (default: `3001`)
- `CONTENEDOR1_BASE_URL` (default: `http://cerebro-api:3000/api`)
- `CONTENEDOR2_BASE_URL` (default: `http://contenedor2:3001`)
- `ADMIN_API_TOKEN` (Bearer token inicial para consumir endpoints protegidos en contenedor1/2)
- `ADMIN_REFRESH_TOKEN` (opcional: refresca automaticamente el access token via `/api/auth/refresh`)
- `ADMIN_EMAIL` (opcional recomendado: email admin para autologin via `/api/auth/login`)
- `ADMIN_PASSWORD` (opcional recomendado: password admin para autologin via `/api/auth/login`)

### Estrategia de autenticacion admin

Orden de prioridad para generar el Bearer token:

1. Reusar `ADMIN_API_TOKEN` si todavia es valido.
2. Si hay `ADMIN_REFRESH_TOKEN`, refrescar con `/api/auth/refresh`.
3. Si no hay refresh o falla, intentar login con `ADMIN_EMAIL` + `ADMIN_PASSWORD`.

## Ejecución local

```bash
npm install
npm run start:dev
```

## Build + producción

```bash
npm run build
npm run start:prod
```

## Docker

```bash
docker compose up --build -d contenedor-admin
```
