const endpoints = {
  snapshot: "/api/admin/snapshot",
  torneos: "/api/admin/torneos",
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
const TORNEOS_TIPOS = ["SERIE"];
const SUDOKU_DIFFICULTIES = [
  "Principiante",
  "Iniciado",
  "Intermedio",
  "Avanzado",
  "Experto",
  "Profesional",
];
let loading = false;
const torneosAccessCodeCache = new Map();
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

function setTorneosStatus(message) {
  setText("torneosStatus", message);
}

function normalizeTorneoId(row) {
  return String(row?._id || "").trim();
}

function isPrivateTorneo(row) {
  if (row?.esPublico === false) return true;
  if (row?.esPublico === true) return false;
  return Boolean(String(row?.codigoAcceso || "").trim());
}

function getVisibilityLabel(row) {
  return isPrivateTorneo(row) ? "Privado" : "Publico";
}

function getVisibilityClass(row) {
  return isPrivateTorneo(row) ? "badge-private" : "badge-public";
}

function isOfficialTorneo(row) {
  return row?.esOficial === true || row?.configuracion?.esOficial === true;
}

function warmAccessCodeCache(rows) {
  (rows || []).forEach((row) => {
    const torneoId = normalizeTorneoId(row);
    if (!torneoId) return;
    const code = String(row?.codigoAcceso || "").trim();
    if (!code) return;
    torneosAccessCodeCache.set(torneoId, code);
  });
}

async function getJson(url) {
  return window.AdminAuth.fetchJson(url);
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
      totalUsagesCount: 0,
    };
    const totalUsagesCount = row.totalUsagesCount ?? row.sessionsCount ?? 0;
    const encoded = encodeURIComponent(difficulty);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(row.dificultad || "-")}</td>
      <td>${Number(row.avgSeconds ?? 0).toFixed(2)}</td>
      <td>${totalUsagesCount}</td>
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

function sortTorneosRows(rows) {
  return [...(rows || [])].sort((left, right) => {
    const leftOfficial = isOfficialTorneo(left) ? 1 : 0;
    const rightOfficial = isOfficialTorneo(right) ? 1 : 0;
    if (leftOfficial !== rightOfficial) return rightOfficial - leftOfficial;

    const leftDate = new Date(left?.fechaInicio || left?.fechaCreacion || 0).getTime();
    const rightDate = new Date(right?.fechaInicio || right?.fechaCreacion || 0).getTime();
    return rightDate - leftDate;
  });
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

function renderVisibilityCell(torneo) {
  const label = getVisibilityLabel(torneo);
  const klass = getVisibilityClass(torneo);
  return `<span class="visibility-badge ${klass}">${escapeHtml(label)}</span>`;
}

function renderNameCell(torneo) {
  const name = escapeHtml(torneo?.nombre || "-");
  const officialBadge = isOfficialTorneo(torneo)
    ? ' <span class="badge-official">Oficial</span>'
    : "";
  return `${name}${officialBadge}`;
}

async function resolveAccessCode(torneoId) {
  const normalizedId = String(torneoId || "").trim();
  if (!normalizedId) return "";

  const cached = String(torneosAccessCodeCache.get(normalizedId) || "").trim();
  if (cached) return cached;

  const payload = await getJson(`${endpoints.torneos}/${encodeURIComponent(normalizedId)}`);
  const torneo = payload?.data || payload || {};
  const code = String(torneo?.codigoAcceso || "").trim();
  if (code) {
    torneosAccessCodeCache.set(normalizedId, code);
  }
  return code;
}

function setCodeCellHidden(rowEl) {
  const valueEl = rowEl?.querySelector(".codigo-inline");
  const toggleBtn = rowEl?.querySelector('[data-torneo-action="toggle-code"]');
  if (valueEl) {
    valueEl.textContent = "Oculto";
    valueEl.dataset.codigoVisible = "0";
  }
  if (toggleBtn) {
    toggleBtn.textContent = "Mostrar codigo de acceso";
  }
}

function setCodeCellVisible(rowEl, code) {
  const valueEl = rowEl?.querySelector(".codigo-inline");
  const toggleBtn = rowEl?.querySelector('[data-torneo-action="toggle-code"]');
  const copyBtn = rowEl?.querySelector('[data-torneo-action="copy-code"]');
  if (valueEl) {
    valueEl.textContent = code;
    valueEl.dataset.codigoVisible = "1";
  }
  if (toggleBtn) {
    toggleBtn.textContent = "Ocultar codigo";
  }
  if (copyBtn) {
    copyBtn.disabled = !code;
  }
}

function setCodeCellUnavailable(rowEl) {
  const valueEl = rowEl?.querySelector(".codigo-inline");
  const toggleBtn = rowEl?.querySelector('[data-torneo-action="toggle-code"]');
  const copyBtn = rowEl?.querySelector('[data-torneo-action="copy-code"]');
  if (valueEl) {
    valueEl.textContent = "No disponible";
    valueEl.dataset.codigoVisible = "0";
  }
  if (toggleBtn) {
    toggleBtn.textContent = "Mostrar codigo de acceso";
  }
  if (copyBtn) {
    copyBtn.disabled = true;
  }
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);
  return copied;
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
    body.innerHTML = '<tr><td colspan="5">No hay torneos que coincidan con la busqueda.</td></tr>';
  } else {
    currentRows.forEach((torneo) => {
      const torneoId = normalizeTorneoId(torneo);
      const encodedId = torneoId ? encodeURIComponent(torneoId) : "";
      const isPrivate = isPrivateTorneo(torneo);
      const cachedCode = String(torneosAccessCodeCache.get(torneoId) || "").trim();

      const codeActions =
        isPrivate && encodedId
          ? `
        <div class="codigo-actions">
          <button
            type="button"
            class="row-action row-action-btn"
            data-torneo-action="toggle-code"
            data-torneo-id="${encodedId}"
          >
            Mostrar codigo de acceso
          </button>
          <span class="codigo-inline" data-codigo-visible="0">Oculto</span>
          <button
            type="button"
            class="row-action row-action-btn"
            data-torneo-action="copy-code"
            data-torneo-id="${encodedId}"
            ${cachedCode ? "" : "disabled"}
          >
            Copiar
          </button>
        </div>
      `
          : '<span class="muted-text">No aplica</span>';

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${renderNameCell(torneo)}</td>
        <td>${escapeHtml(formatCreatorCell(torneo))}</td>
        <td>${renderVisibilityCell(torneo)}</td>
        <td>${escapeHtml(torneo?.estado || "-")}</td>
        <td>
          <div class="torneo-actions-cell">
            ${encodedId ? `<a class="row-action" href="/tabs/torneo-detalle.html?id=${encodedId}">Administrar</a>` : "-"}
            ${codeActions}
          </div>
        </td>
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
  torneosState.all = sortTorneosRows(Array.isArray(rows) ? rows : []);
  warmAccessCodeCache(torneosState.all);
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
    setText("kpiPvpCount", overview.pvpMatchesPlayed ?? 0);
    renderAverageTimeByDifficultyTable(avgTimeByDifficulty.data || []);
    setTorneosData(torneos.data || []);

    setTorneosStatus(`Torneos cargados: ${torneos.count ?? 0}`);
  } catch (error) {
    setText("kpiSudokuCount", "Error");
    setText("kpiTorneosCount", "Error");
    setText("kpiPvpCount", "Error");
    setTorneosStatus(`No disponible: ${error.message}`);
    renderAverageTimeByDifficultyTable([]);
    setTorneosData([]);
  } finally {
    loading = false;
  }
}

function decodeTorneoId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function onToggleCode(buttonEl) {
  const rowEl = buttonEl?.closest("tr");
  const valueEl = rowEl?.querySelector(".codigo-inline");
  const copyBtn = rowEl?.querySelector('[data-torneo-action="copy-code"]');
  const torneoId = decodeTorneoId(buttonEl?.dataset?.torneoId);
  if (!rowEl || !valueEl || !torneoId) return;

  const isVisible = valueEl.dataset.codigoVisible === "1";
  if (isVisible) {
    setCodeCellHidden(rowEl);
    return;
  }

  const prevLabel = buttonEl.textContent;
  buttonEl.disabled = true;
  buttonEl.textContent = "Cargando...";
  try {
    const code = await resolveAccessCode(torneoId);
    if (!code) {
      setCodeCellUnavailable(rowEl);
      setTorneosStatus(`No hay codigo de acceso disponible para el torneo ${torneoId}.`);
      return;
    }
    setCodeCellVisible(rowEl, code);
    if (copyBtn) copyBtn.disabled = false;
    setTorneosStatus(`Codigo de acceso listo para torneo ${torneoId}.`);
  } catch (error) {
    setCodeCellUnavailable(rowEl);
    setTorneosStatus(`No se pudo obtener codigo de acceso: ${error.message}`);
  } finally {
    buttonEl.disabled = false;
    if (buttonEl.textContent === "Cargando...") {
      buttonEl.textContent = prevLabel || "Mostrar codigo de acceso";
    }
  }
}

async function onCopyCode(buttonEl) {
  const rowEl = buttonEl?.closest("tr");
  const valueEl = rowEl?.querySelector(".codigo-inline");
  const torneoId = decodeTorneoId(buttonEl?.dataset?.torneoId);
  if (!torneoId) return;

  let code = String(torneosAccessCodeCache.get(torneoId) || "").trim();
  if (!code) {
    try {
      code = await resolveAccessCode(torneoId);
    } catch (error) {
      setTorneosStatus(`No se pudo cargar codigo para copiar: ${error.message}`);
      return;
    }
  }
  if (!code) {
    setTorneosStatus(`No hay codigo disponible para copiar en torneo ${torneoId}.`);
    return;
  }

  try {
    const copied = await copyTextToClipboard(code);
    if (!copied) {
      setTorneosStatus("No se pudo copiar automaticamente. Copialo manualmente.");
      return;
    }
    if (valueEl && valueEl.dataset.codigoVisible !== "1") {
      setCodeCellVisible(rowEl, code);
    }
    setTorneosStatus(`Codigo copiado para torneo ${torneoId}.`);
  } catch {
    setTorneosStatus("No se pudo copiar automaticamente. Copialo manualmente.");
  }
}

async function onTorneosBodyClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const actionEl = target.closest("[data-torneo-action]");
  if (!(actionEl instanceof HTMLElement)) return;

  const action = String(actionEl.dataset.torneoAction || "").trim();
  if (!action) return;

  if (action === "toggle-code") {
    await onToggleCode(actionEl);
    return;
  }
  if (action === "copy-code") {
    await onCopyCode(actionEl);
  }
}

function bindTorneosEvents() {
  const searchInput = document.getElementById("torneoSearch");
  const estadoFilter = document.getElementById("torneoEstadoFilter");
  const tipoFilter = document.getElementById("torneoTipoFilter");
  const prevBtn = document.getElementById("torneosPrevBtn");
  const nextBtn = document.getElementById("torneosNextBtn");
  const torneosBody = document.getElementById("torneosBody");

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

  if (torneosBody) {
    torneosBody.addEventListener("click", onTorneosBodyClick);
  }
}

window.addEventListener("focus", () => {
  if (window.AdminAuth.requireSession({ redirectOnFail: false })) {
    loadDatos();
  }
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && window.AdminAuth.requireSession({ redirectOnFail: false })) {
    loadDatos();
  }
});
window.addEventListener("load", () => {
  const session = window.AdminAuth.requireSession();
  if (!session) return;
  window.AdminAuth.bindLogoutButtons();
  bindTorneosEvents();
  loadDatos();
  window.setInterval(() => {
    if (!document.hidden && window.AdminAuth.requireSession({ redirectOnFail: false })) {
      loadDatos();
    }
  }, REFRESH_MS);
});
