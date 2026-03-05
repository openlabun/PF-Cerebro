import http from "node:http";

const PORT = Number(process.env.PORT || 3001);
const CONTENEDOR1_BASE_URL =
  process.env.CONTENEDOR1_BASE_URL || "http://cerebro-api:3000/api";
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN || "";

const seedData = {
  users: [
    { id: "u1", createdAt: "2026-01-01T10:00:00Z", games: ["sudoku", "pvp"] },
    { id: "u2", createdAt: "2026-01-03T11:30:00Z", games: ["sudoku"] },
    { id: "u3", createdAt: "2026-01-07T08:00:00Z", games: ["sudoku", "torneos"] },
    { id: "u4", createdAt: "2026-01-10T14:40:00Z", games: ["pvp"] },
    { id: "u5", createdAt: "2026-01-14T09:10:00Z", games: ["sudoku", "torneos", "pvp"] }
  ]
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  });
  res.end(JSON.stringify(payload));
}

function sendHtml(res, status, html) {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(html);
}

function parseDateInput(value, fallback) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function toDayKey(date) {
  return date.toISOString().slice(0, 10);
}

function buildUsersOverTime({ from, to }) {
  const seriesMap = new Map();

  for (const user of seedData.users) {
    const createdAt = new Date(user.createdAt);
    if (createdAt < from || createdAt > to) continue;

    const key = toDayKey(createdAt);
    seriesMap.set(key, (seriesMap.get(key) || 0) + 1);
  }

  return Array.from(seriesMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, users]) => ({ date, users }));
}

function buildGamesByUser() {
  return seedData.users.map((user) => ({
    userId: user.id,
    games: user.games,
    gamesPlayedCount: user.games.length
  }));
}

function buildOverview() {
  const totalUsers = seedData.users.length;
  const totalGameParticipations = seedData.users.reduce(
    (acc, user) => acc + user.games.length,
    0
  );

  const byGame = seedData.users.reduce((acc, user) => {
    for (const game of user.games) {
      acc[game] = (acc[game] || 0) + 1;
    }
    return acc;
  }, {});

  return {
    totalUsers,
    totalGameParticipations,
    usersByGame: byGame,
    source: "observability-seed"
  };
}

function buildOpenApiSpec(baseUrl) {
  return {
    openapi: "3.0.3",
    info: {
      title: "CEREBRO ContenedorAdmin API",
      version: "1.0.0",
      description:
        "API de observabilidad y administración operativa para la plataforma CEREBRO. Incluye métricas de usuarios/juegos y endpoints de administración de torneos preparados para Contenedor1."
    },
    servers: [
      {
        url: baseUrl
      }
    ],
    tags: [
      { name: "Health", description: "Estado del servicio" },
      { name: "Observability", description: "Métricas operativas" },
      { name: "TorneosAdmin", description: "Integración administrativa con Contenedor1" }
    ],
    paths: {
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Health check del contenedor admin",
          responses: {
            200: {
              description: "Servicio en línea"
            }
          }
        }
      },
      "/api/admin/overview": {
        get: {
          tags: ["Observability"],
          summary: "Resumen de salud de plataforma",
          responses: { 200: { description: "Resumen agregado" } }
        }
      },
      "/api/admin/users/total": {
        get: {
          tags: ["Observability"],
          summary: "Cantidad total de usuarios",
          responses: { 200: { description: "Total de usuarios" } }
        }
      },
      "/api/admin/users/timeseries": {
        get: {
          tags: ["Observability"],
          summary: "Usuarios por tiempo",
          parameters: [
            {
              name: "from",
              in: "query",
              required: false,
              schema: { type: "string", format: "date-time" },
              description: "Fecha/hora inicial"
            },
            {
              name: "to",
              in: "query",
              required: false,
              schema: { type: "string", format: "date-time" },
              description: "Fecha/hora final"
            }
          ],
          responses: { 200: { description: "Serie temporal" } }
        }
      },
      "/api/admin/games/by-user": {
        get: {
          tags: ["Observability"],
          summary: "Juegos jugados por usuario",
          responses: { 200: { description: "Lista de usuarios con juegos" } }
        }
      },
      "/api/admin/users/{userId}/games": {
        get: {
          tags: ["Observability"],
          summary: "Juegos de un usuario específico",
          parameters: [
            {
              name: "userId",
              in: "path",
              required: true,
              schema: { type: "string" }
            }
          ],
          responses: {
            200: { description: "Detalle de juegos del usuario" },
            404: { description: "Usuario no encontrado" }
          }
        }
      },
      "/api/admin/torneos": {
        get: {
          tags: ["TorneosAdmin"],
          summary: "Listar torneos desde Contenedor1",
          responses: {
            200: { description: "Lista de torneos" },
            503: { description: "Contenedor1 no disponible o sin permisos" }
          }
        }
      },
      "/api/admin/torneos/{id}/estado": {
        patch: {
          tags: ["TorneosAdmin"],
          summary: "Actualizar estado de torneo en Contenedor1",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" }
            }
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    estado: { type: "string", example: "ACTIVO" },
                    razon: { type: "string", example: "Actualizado desde modulo admin" }
                  },
                  required: ["estado"]
                }
              }
            }
          },
          responses: {
            200: { description: "Estado actualizado" },
            503: { description: "Contenedor1 no disponible o sin permisos" }
          }
        }
      }
    }
  };
}

function buildSwaggerHtml() {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>CEREBRO ContenedorAdmin - Swagger</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #111827; }
      #swagger-ui { max-width: 1200px; margin: 0 auto; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: "/api/admin/openapi.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        docExpansion: "none",
        persistAuthorization: true
      });
    </script>
  </body>
</html>`;
}

async function requestContenedor1(path, method = "GET", body) {
  const url = `${CONTENEDOR1_BASE_URL.replace(/\/+$/, "")}/${String(path).replace(
    /^\/+/,""
  )}`;

  const headers = { Accept: "application/json" };
  if (ADMIN_API_TOKEN) headers.Authorization = `Bearer ${ADMIN_API_TOKEN}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`Contenedor1 responded ${response.status}`);
  }

  return payload;
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = requestUrl.pathname;
  const baseUrl = `${requestUrl.protocol}//${req.headers.host || `localhost:${PORT}`}`;

  if (req.method === "GET" && pathname === "/api/admin/docs") {
    sendHtml(res, 200, buildSwaggerHtml());
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/openapi.json") {
    sendJson(res, 200, buildOpenApiSpec(baseUrl));
    return;
  }

  if (req.method === "GET" && pathname === "/health") {
    sendJson(res, 200, {
      service: "contenedor-admin",
      status: "ok",
      timestamp: new Date().toISOString(),
      docs: `${baseUrl}/api/admin/docs`
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/overview") {
    sendJson(res, 200, buildOverview());
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/users/total") {
    sendJson(res, 200, { totalUsers: seedData.users.length, source: "observability-seed" });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/users/timeseries") {
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(now.getDate() - 30);

    const from = parseDateInput(requestUrl.searchParams.get("from"), defaultFrom);
    const to = parseDateInput(requestUrl.searchParams.get("to"), now);

    sendJson(res, 200, {
      from: from.toISOString(),
      to: to.toISOString(),
      bucket: "day",
      data: buildUsersOverTime({ from, to }),
      source: "observability-seed"
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/games/by-user") {
    sendJson(res, 200, { data: buildGamesByUser(), source: "observability-seed" });
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/api/admin/users/") && pathname.endsWith("/games")) {
    const parts = pathname.split("/").filter(Boolean);
    const userId = parts[3];
    const user = seedData.users.find((item) => item.id === userId);

    if (!user) {
      sendJson(res, 404, { message: "User not found" });
      return;
    }

    sendJson(res, 200, { userId: user.id, games: user.games, source: "observability-seed" });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/torneos") {
    try {
      const torneos = await requestContenedor1("torneos", "GET");
      sendJson(res, 200, { source: "contenedor1", data: torneos });
    } catch (error) {
      sendJson(res, 503, {
        message:
          "No fue posible consultar torneos en este momento. Revisa CONTENEDOR1_BASE_URL y ADMIN_API_TOKEN.",
        details: error.message,
        source: "contenedor-admin"
      });
    }
    return;
  }

  if (req.method === "PATCH" && /^\/api\/admin\/torneos\/[^/]+\/estado$/.test(pathname)) {
    const parts = pathname.split("/").filter(Boolean);
    const torneoId = parts[3];
    const body = await readBody(req);

    try {
      const payload = {
        estado: body?.estado,
        razon: body?.razon || "Actualizado desde modulo admin"
      };

      const response = await requestContenedor1(`torneos/${torneoId}/estado`, "PATCH", payload);
      sendJson(res, 200, { source: "contenedor1", data: response });
    } catch (error) {
      sendJson(res, 503, {
        message:
          "No fue posible cambiar el estado del torneo. Integra permisos de admin en Contenedor1 para habilitarlo.",
        details: error.message,
        source: "contenedor-admin"
      });
    }
    return;
  }

  sendJson(res, 404, { message: "Route not found" });
});

server.listen(PORT, () => {
  console.log(`[contenedor-admin] running on :${PORT}`);
});
