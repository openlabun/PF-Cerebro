## Cómo correr con Docker

```bash
docker compose down --remove-orphans
docker compose up --build -d
```

Abrir en navegador:

```text
http://localhost:5051
```

Para ver logs:

```bash
docker compose logs -f
```

Para detener:

```bash
docker compose down
```

---

## Estructura actual

```text
.
├─ docker-compose.yml
├─ Dockerfile
├─ index.html
├─ script.js
├─ styles.css
└─ README.md
```

---

## Solución de problemas rápida

- Si no carga, prueba recarga forzada (`Ctrl + F5`).
- Verifica que el servidor esté levantado en el puerto correcto.
- Si usas Docker, revisa logs con `docker compose logs -f`.
- Si `localhost` falla, intenta `http://127.0.0.1:5051`.
## Configuracion API (Fase 1)

- URL base por defecto del backend: `http://localhost:3000/api`
- Archivo de configuracion runtime: `config.js`
- Cliente HTTP reutilizable para la integracion: `api_client.js`

---

## Prueba local (sin Docker)

### 1) Backend (Nest)

Desde `MVP-BackEnd/Contenedor1/api`:

```bash
npm install
npm run start:dev
```

Backend y docs:

- `http://localhost:3000/api`
- `http://localhost:3000/api/docs`

### 2) Frontend estatico

Desde `Diseno/IyR/Frontend` levanta un servidor local. Ejemplo con Python:

```bash
python -m http.server 4173
```

Abrir en navegador:

- `http://localhost:4173`

### 3) Validar auth

- Crear cuenta (`signup`)
- Iniciar sesion (`login`)
- Recargar pagina y verificar persistencia de sesion
- Cerrar sesion (`logout`)
