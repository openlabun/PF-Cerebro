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
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const msg = payload?.message || `HTTP ${response.status}`;
    throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
  }
  return payload;
}

function renderRows(rows) {
  const body = document.getElementById("seedTimesBody");
  if (!body) return;

  body.innerHTML = "";
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="4">No hay seeds o sesiones para esta dificultad.</td></tr>';
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(row.seedId || "-")}</td>
      <td>${escapeHtml(row.seed || "-")}</td>
      <td>${Number(row.avgSeconds ?? 0).toFixed(2)}</td>
      <td>${row.sessionsCount ?? 0}</td>
    `;
    body.appendChild(tr);
  });
}

async function loadDetails() {
  const params = new URLSearchParams(window.location.search);
  const dificultad = (params.get("dificultad") || "").trim();
  setText("title", `Promedio de tiempo por seed - ${dificultad || "N/A"}`);

  if (!dificultad) {
    setText("detailStatus", "No se recibio una dificultad valida.");
    renderRows([]);
    return;
  }

  try {
    const payload = await getJson(
      `${endpoints.seedsTimes}?dificultad=${encodeURIComponent(dificultad)}`,
    );
    renderRows(payload?.data || []);
    setText("detailStatus", `Dificultad: ${dificultad}. Seeds: ${(payload?.data || []).length}.`);
  } catch (error) {
    setText("detailStatus", `No disponible: ${error.message}`);
    renderRows([]);
  }
}

window.addEventListener("load", loadDetails);
