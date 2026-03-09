const endpoints = {
  torneos: "/api/admin/torneos",
};

let torneoId = "";
let currentTorneo = null;

function setStatus(message) {
  const el = document.getElementById("detailStatus");
  if (el) el.textContent = message;
}

async function getJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const msg = payload?.message || `HTTP ${response.status}`;
    throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
  }
  return payload;
}

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

function fromDateTimeLocal(value) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

function fillForm(torneo) {
  currentTorneo = torneo;
  setValue("nombre", torneo.nombre || "");
  setValue("tipo", torneo.tipo || "");
  setValue("estadoActual", torneo.estado || "");
  setValue("creadorId", torneo.creadorId || "");
  setValue("descripcion", torneo.descripcion || "");
  setValue("fechaInicio", toDateTimeLocal(torneo.fechaInicio));
  setValue("fechaFin", toDateTimeLocal(torneo.fechaFin));
  setValue("recurrencia", torneo.recurrencia || "");
  setValue("configuracion", JSON.stringify(torneo.configuracion || {}, null, 2));

  const esPublico = document.getElementById("esPublico");
  if (esPublico) esPublico.checked = Boolean(torneo.esPublico);

  const nuevoEstado = document.getElementById("nuevoEstado");
  if (nuevoEstado && torneo.estado) nuevoEstado.value = torneo.estado;
}

async function loadTorneo() {
  if (!torneoId) {
    setStatus("No se recibio el id del torneo.");
    return;
  }
  try {
    const payload = await getJson(`${endpoints.torneos}/${encodeURIComponent(torneoId)}`);
    const torneo = payload?.data || payload;
    fillForm(torneo);
    setStatus(`Torneo cargado: ${torneo.nombre || torneoId}`);
  } catch (error) {
    setStatus(`Error al cargar torneo: ${error.message}`);
  }
}

async function onSave(event) {
  event.preventDefault();
  if (!torneoId) return;

  let configuracion = {};
  try {
    configuracion = JSON.parse(document.getElementById("configuracion").value || "{}");
  } catch {
    setStatus("Configuracion invalida: debe ser JSON valido.");
    return;
  }

  const payload = {
    nombre: document.getElementById("nombre").value.trim(),
    descripcion: document.getElementById("descripcion").value.trim(),
    tipo: document.getElementById("tipo").value.trim(),
    esPublico: document.getElementById("esPublico").checked,
    fechaInicio: fromDateTimeLocal(document.getElementById("fechaInicio").value),
    fechaFin: fromDateTimeLocal(document.getElementById("fechaFin").value),
    recurrencia: document.getElementById("recurrencia").value.trim(),
    configuracion,
  };

  try {
    await getJson(`${endpoints.torneos}/${encodeURIComponent(torneoId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setStatus("Torneo actualizado correctamente.");
    await loadTorneo();
  } catch (error) {
    setStatus(`Error al actualizar torneo: ${error.message}`);
  }
}

async function onUpdateEstado() {
  if (!torneoId) return;
  const estado = document.getElementById("nuevoEstado").value;
  try {
    await getJson(`${endpoints.torneos}/${encodeURIComponent(torneoId)}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado, razon: "Cambio desde dashboard admin" }),
    });
    setStatus(`Estado actualizado a ${estado}.`);
    await loadTorneo();
  } catch (error) {
    setStatus(`Error al actualizar estado: ${error.message}`);
  }
}

window.addEventListener("load", () => {
  const params = new URLSearchParams(window.location.search);
  torneoId = params.get("id") || "";

  const form = document.getElementById("torneoForm");
  const updateEstadoBtn = document.getElementById("updateEstadoBtn");
  if (form) form.addEventListener("submit", onSave);
  if (updateEstadoBtn) updateEstadoBtn.addEventListener("click", onUpdateEstado);

  loadTorneo();
});
