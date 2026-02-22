## Cómo correr con Docker

```bash
docker compose down --remove-orphans
docker compose up --build -d
```

Abrir en navegador:

```text
http://localhost:4173
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
- Si `localhost` falla, intenta `http://127.0.0.1:4173`.