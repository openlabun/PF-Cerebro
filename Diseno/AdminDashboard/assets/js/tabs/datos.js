const endpoints = {
  snapshot: "/api/admin/snapshot",
};
const REFRESH_MS = 10000;
const TORNEOS_PAGE_SIZE = 8;
const TORNEOS_ESTADOS = [
  "BORRADOR",
  "PROGRAMADO",
  "ACTIVO",
  "PAUSADO",
  "FINALIZADO",
  "CANCELADO",
];
const TORNEOS_TIPOS = ["PVP", "TIEMPO", "PUNTOS"];
const SUDOKU_DIFFICULTIES = [
  "Principiante",
  "Iniciado",
  "Intermedio",
  "Avanzado",
  "Experto",
  "Profesional",
];
let loading = false;
const torneosState = {
  all: [],
  filtered: [],
  page: 1,
  search: "",
  estado: "",
  tipo: "",
};

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function getJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }
  if (!response.ok) {
    const msg =
      payload?.message ||
      payload?.error ||
      (text && !payload ? `HTTP ${response.status} (respuesta no JSON)` : `HTTP ${response.status}`);
    throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
  }
  if (text && !payload) {
    throw new Error("Respuesta invalida del servidor (no JSON)");
  }
  return payload;
}

function renderAverageTimeByDifficultyTable(data) {
  const body = document.getElementById("avgTimeByDifficultyBody");
  if (!body) return;
  body.innerHTML = "";
  const byDifficulty = new Map(
    (data || []).map((row) => [String(row.dificultad || "").toLowerCase(), row]),
  );

  SUDOKU_DIFFICULTIES.forEach((difficulty) => {
    const row = byDifficulty.get(difficulty.toLowerCase()) || {
      dificultad: difficulty,
      avgSeconds: 0,
      sessionsCount: 0,
    };
    const encoded = encodeURIComponent(difficulty);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(row.dificultad || "-")}</td>
      <td>${Number(row.avgSeconds ?? 0).toFixed(2)}</td>
      <td>${row.sessionsCount ?? 0}</td>
      <td><a class="row-action" href="/tabs/seed-tiempo-detalle.html?dificultad=${encoded}">Ver seeds</a></td>
    `;
    body.appendChild(tr);
  });
}

function applyTorneosFilter() {
  const needle = torneosState.search.trim().toLowerCase();
  const selectedEstado = String(torneosState.estado || "")
    .trim()
    .toLowerCase();
  const selectedTipo = String(torneosState.tipo || "")
    .trim()
    .toLowerCase();

  torneosState.filtered = (torneosState.all || []).filter((row) => {
    const nombre = String(row?.nombre || "").toLowerCase();
    const estado = String(row?.estado || "")
      .trim()
      .toLowerCase();
    const tipo = String(row?.tipo || "")
      .trim()
      .toLowerCase();

    if (needle && !nombre.includes(needle)) return false;
    if (selectedEstado && estado !== selectedEstado) return false;
    if (selectedTipo && tipo !== selectedTipo) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(torneosState.filtered.length / TORNEOS_PAGE_SIZE));
  torneosState.page = Math.min(torneosState.page, totalPages);
}

function formatCreatorCell(torneo) {
  const creatorId = String(torneo?.creadorId || "").trim();
  const creatorName = String(
    torneo?.creadorNombre ||
      torneo?.nombreCreador ||
      torneo?.creador?.nombre ||
      torneo?.creador?.name ||
      "",
  ).trim();

  if (creatorName && creatorId) {
    return `${creatorName} (${creatorId})`;
  }
  if (creatorId) {
    return creatorId;
  }
  return "-";
}

function renderTorneosTable() {
  const body = document.getElementById("torneosBody");
  const pageInfo = document.getElementById("torneosPageInfo");
  const prevBtn = document.getElementById("torneosPrevBtn");
  const nextBtn = document.getElementById("torneosNextBtn");
  if (!body) return;

  const total = torneosState.filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / TORNEOS_PAGE_SIZE));
  const page = Math.min(Math.max(1, torneosState.page), totalPages);
  torneosState.page = page;

  const start = (page - 1) * TORNEOS_PAGE_SIZE;
  const currentRows = torneosState.filtered.slice(start, start + TORNEOS_PAGE_SIZE);

  body.innerHTML = "";
  if (!currentRows.length) {
    body.innerHTML = '<tr><td colspan="4">No hay torneos que coincidan con la busqueda.</td></tr>';
  } else {
    currentRows.forEach((torneo) => {
      const id = torneo?._id ? encodeURIComponent(torneo._id) : "";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(torneo?.nombre || "-")}</td>
        <td>${escapeHtml(formatCreatorCell(torneo))}</td>
        <td>${escapeHtml(torneo?.estado || "-")}</td>
        <td>${id ? `<a class="row-action" href="/tabs/torneo-detalle.html?id=${id}">Administrar</a>` : "-"}</td>
      `;
      body.appendChild(tr);
    });
  }

  if (pageInfo) pageInfo.textContent = `Pagina ${page} de ${totalPages}`;
  if (prevBtn) prevBtn.disabled = page <= 1;
  if (nextBtn) nextBtn.disabled = page >= totalPages;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeUpperText(value) {
  return normalizeText(value).toUpperCase();
}

function fillSelectOptions(select, values, allLabel) {
  if (!select) return;
  const currentValue = String(select.value || "");
  select.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = allLabel;
  select.appendChild(allOption);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });

  select.value = values.includes(currentValue) ? currentValue : "";
}

function refreshTorneosFilters(rows) {
  const estadoFilter = document.getElementById("torneoEstadoFilter");
  const tipoFilter = document.getElementById("torneoTipoFilter");
  const estadosExtra = Array.from(
    new Set((rows || []).map((row) => normalizeUpperText(row?.estado)).filter(Boolean)),
  );
  const tiposExtra = Array.from(
    new Set((rows || []).map((row) => normalizeUpperText(row?.tipo)).filter(Boolean)),
  );

  const estados = Array.from(new Set([...TORNEOS_ESTADOS, ...estadosExtra]));
  const tipos = Array.from(new Set([...TORNEOS_TIPOS, ...tiposExtra]));

  fillSelectOptions(estadoFilter, estados, "Todos los estados");
  fillSelectOptions(tipoFilter, tipos, "Todos los tipos");
}

function setTorneosData(rows) {
  torneosState.all = Array.isArray(rows) ? rows : [];
  refreshTorneosFilters(torneosState.all);
  applyTorneosFilter();
  renderTorneosTable();
}

async function loadDatos() {
  if (loading) return;
  loading = true;
  try {
    const snapshot = await getJson(`${endpoints.snapshot}?includeTorneos=true`);
    const overview = snapshot.overview || {};
    const usersTotal = snapshot.usersTotal || {};
    const avgTimeByDifficulty = snapshot.avgTimeByDifficulty || {};
    const torneos = snapshot.torneos || {};
    setText("kpiUsers", usersTotal.totalUsers ?? overview.totalUsers ?? "-");
    setText("kpiParticipations", overview.totalGameParticipations ?? "-");
    setText("kpiSudokuCount", overview.sudokuMatchesPlayed ?? 0);
    setText("kpiTorneosCount", torneos.count ?? 0);
    setText("kpiPvpCount", (overview.usersByGame || {}).pvp ?? 0);
    renderAverageTimeByDifficultyTable(avgTimeByDifficulty.data || []);
    setTorneosData(torneos.data || []);

    setText("torneosStatus", `Torneos cargados: ${torneos.count ?? 0}`);
  } catch (error) {
    setText("kpiSudokuCount", "Error");
    setText("kpiTorneosCount", "Error");
    setText("kpiPvpCount", "Error");
    setText("torneosStatus", `No disponible: ${error.message}`);
    renderAverageTimeByDifficultyTable([]);
    setTorneosData([]);
  } finally {
    loading = false;
  }
}

function bindTorneosEvents() {
  const searchInput = document.getElementById("torneoSearch");
  const estadoFilter = document.getElementById("torneoEstadoFilter");
  const tipoFilter = document.getElementById("torneoTipoFilter");
  const prevBtn = document.getElementById("torneosPrevBtn");
  const nextBtn = document.getElementById("torneosNextBtn");

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      torneosState.search = event.target.value || "";
      torneosState.page = 1;
      applyTorneosFilter();
      renderTorneosTable();
    });
  }

  if (estadoFilter) {
    estadoFilter.addEventListener("change", (event) => {
      torneosState.estado = event.target.value || "";
      torneosState.page = 1;
      applyTorneosFilter();
      renderTorneosTable();
    });
  }

  if (tipoFilter) {
    tipoFilter.addEventListener("change", (event) => {
      torneosState.tipo = event.target.value || "";
      torneosState.page = 1;
      applyTorneosFilter();
      renderTorneosTable();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (torneosState.page > 1) {
        torneosState.page -= 1;
        renderTorneosTable();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const totalPages = Math.max(1, Math.ceil(torneosState.filtered.length / TORNEOS_PAGE_SIZE));
      if (torneosState.page < totalPages) {
        torneosState.page += 1;
        renderTorneosTable();
      }
    });
  }
}

window.addEventListener("focus", loadDatos);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) loadDatos();
});
window.addEventListener("load", () => {
  bindTorneosEvents();
  loadDatos();
  window.setInterval(() => {
    if (!document.hidden) loadDatos();
  }, REFRESH_MS);
});
