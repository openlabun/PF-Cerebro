const endpoints = {
  seedsTimes: "/api/admin/sudoku/seeds-times",
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
  return window.AdminAuth.fetchJson(url);
}

function renderRows(rows) {
  const body = document.getElementById("seedTimesBody");
  if (!body) return;

  body.innerHTML = "";
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="7">No hay seeds ni partidas registradas para esta dificultad.</td></tr>';
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(row.seedId || "-")}</td>
      <td>${escapeHtml(row.seed || "-")}</td>
      <td>${Number(row.singlePlayerAvgSeconds ?? row.avgSeconds ?? 0).toFixed(2)}</td>
      <td>${row.singlePlayerSessionsCount ?? row.sessionsCount ?? 0}</td>
      <td>${Number(row.pvpAvgSeconds ?? 0).toFixed(2)}</td>
      <td>${row.pvpMatchesCount ?? 0}</td>
      <td>${row.totalUsagesCount ?? ((row.sessionsCount ?? 0) + (row.pvpMatchesCount ?? 0))}</td>
    `;
    body.appendChild(tr);
  });
}

async function loadDetails() {
  const params = new URLSearchParams(window.location.search);
  const dificultad = (params.get("dificultad") || "").trim();
  setText("title", `Uso por seed - ${dificultad || "N/A"}`);

  if (!dificultad) {
    setText("detailStatus", "No se recibio una dificultad valida.");
    renderRows([]);
    return;
  }

  try {
    const payload = await getJson(
      `${endpoints.seedsTimes}?dificultad=${encodeURIComponent(dificultad)}`,
    );
    const rows = payload?.data || [];
    renderRows(rows);
    const totalSinglePlayerSessions = rows.reduce(
      (acc, row) => acc + (Number(row?.singlePlayerSessionsCount ?? row?.sessionsCount) || 0),
      0,
    );
    const totalPvpMatches = rows.reduce(
      (acc, row) => acc + (Number(row?.pvpMatchesCount) || 0),
      0,
    );
    setText(
      "detailStatus",
      `Dificultad: ${payload?.dificultad || dificultad}. Seeds: ${rows.length}. SP sesiones: ${totalSinglePlayerSessions}. PvP partidas: ${totalPvpMatches}.`,
    );
  } catch (error) {
    setText("detailStatus", `No disponible: ${error.message}`);
    renderRows([]);
  }
}

window.addEventListener("load", () => {
  const session = window.AdminAuth.requireSession();
  if (!session) return;
  window.AdminAuth.bindLogoutButtons();
  loadDetails();
});
