## Como correr con Docker

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
Frontend/
|- assets/
|  |- css/
|  |  `- styles.css
|  `- js/
|     |- app.js
|     |- config.js
|     |- modules/
|     |  |- auth.js
|     |  |- profile.js
|     |  `- sudoku/
|     |     |- game.js
|     |     |- state.js
|     |     `- ui.js
|     `- services/
|        `- api_client.js
|- Dockerfile
|- index.html
|- nginx.conf
`- README.md
```

---

## Configuracion API

- URL base por defecto del backend: `/api`
- Config runtime: `assets/js/config.js`
- Cliente HTTP: `assets/js/services/api_client.js`

Si corres el frontend sin Docker/proxy, define `window.CEREBRO_API_BASE_URL` a `http://localhost:3000/api`.

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

---

## Solucion de problemas

- Si no carga, prueba recarga forzada (`Ctrl + F5`).
- Verifica que el servidor este levantado en el puerto correcto.
- Si usas Docker, revisa logs con `docker compose logs -f`.
- Si `localhost` falla, intenta `http://127.0.0.1:5051`.
