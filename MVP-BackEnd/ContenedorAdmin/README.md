# ContenedorAdmin (Observabilidad + Administración)

Este contenedor agrega capacidades de observabilidad operativa para CEREBRO y deja preparada la integración con la administración de torneos.

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

> Nota: en esta primera versión el origen es `observability-seed` (datos semilla) para permitir avanzar el módulo sin bloquearse por dependencias externas. El contrato ya está listo para reemplazar el origen por ROBLE o por eventos centralizados.

## Endpoints de administración de torneos (set up futuro)

- `GET /api/admin/torneos`
- `PATCH /api/admin/torneos/:id/estado`

Estas rutas ya intentan consumir Contenedor1 usando:

- `CONTENEDOR1_BASE_URL` (default: `http://cerebro-api:3000/api`)
- `ADMIN_API_TOKEN` (si Contenedor1 exige JWT/rol admin)

Si falla la conexión/permisos, se retorna `503` con diagnóstico.

## Swagger / OpenAPI

Para probar y explorar los endpoints desde navegador:

- `GET /api/admin/openapi.json` (especificación OpenAPI 3)
- `GET /api/admin/docs` (UI Swagger)

Ejemplo local:

```text
http://localhost:3001/api/admin/docs
```

## Variables de entorno

- `PORT` (default: `3001`)
- `CONTENEDOR1_BASE_URL` (default: `http://cerebro-api:3000/api`)
- `ADMIN_API_TOKEN` (opcional)

## Ejecución local

```bash
npm install
npm run dev
```

## Ejecución con Docker

```bash
docker compose up --build -d contenedor-admin
```
