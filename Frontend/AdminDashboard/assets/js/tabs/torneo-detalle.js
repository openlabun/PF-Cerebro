const endpoints = {
  torneos: "/api/admin/torneos",
};

let torneoId = "";
let isCreateMode = false;
let currentTorneo = null;
let baseConfigForMerge = {};
let managedConfigKeys = new Set();
let initialAdvancedConfigText = "{}";
let originalFechaInicioRaw = "";
let originalFechaFinRaw = "";
let fechaInicioDirty = false;
let fechaFinDirty = false;

const COMMON_CONFIG_KEYS = [
  "maxParticipantes",
  "duracionMaximaMin",
  "intentosMaximos",
  "dificultad",
  "seedFija",
  "permitirEmpates",
];

function byId(id) {
  return document.getElementById(id);
}

function setStatus(message) {
  const el = byId("detailStatus");
  if (el) el.textContent = message;
}

async function getJson(url, options = {}) {
  return window.AdminAuth.fetchJson(url, options);
}

function toDateTimeLocal(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  // Si la API devuelve un datetime sin zona (ej: 2026-03-10T19:41),
  // se mantiene tal cual para evitar corrimientos por timezone.
  const noZoneMatch = raw.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(:\d{2}(?:\.\d{1,3})?)?$/,
  );
  if (noZoneMatch) {
    return `${noZoneMatch[1]}T${noZoneMatch[2]}`;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

function formatDateAsLocalDateTime(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

function fromDateTimeLocal(value, options = {}) {
  const raw = String(value || "").trim();
  if (!raw) return undefined;

  const keepOriginal = Boolean(options.keepOriginal);
  const originalRaw = String(options.originalRaw || "").trim();
  if (keepOriginal && originalRaw) {
    return originalRaw;
  }

  // Mantener el valor local del input evita corrimientos por timezone
  // en los flujos donde el backend devuelve datetime sin zona.
  const localIsoNoZone = raw.match(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/,
  );
  if (localIsoNoZone) {
    return raw;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function setValue(id, value) {
  const el = byId(id);
  if (el) el.value = value ?? "";
}

function setSelectValue(id, value, fallback = "") {
  const el = byId(id);
  if (!el || !el.options) return;
  const next = String(value ?? "").trim();
  const hasOption = Array.from(el.options).some((opt) => opt.value === next);
  el.value = hasOption ? next : fallback;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneConfig(value) {
  if (!isPlainObject(value)) return {};
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return {};
  }
}

function getCreateDefaults() {
  const now = new Date();
  const start = new Date(now.getTime() + 60 * 60 * 1000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return {
    nombre: "",
    tipo: "PUNTOS",
    estado: "BORRADOR",
    creadorId: "",
    descripcion: "",
    fechaInicio: formatDateAsLocalDateTime(start),
    fechaFin: formatDateAsLocalDateTime(end),
    recurrencia: "NINGUNA",
    esPublico: true,
    configuracion: {},
  };
}

function inferExtraType(value) {
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
}

function clearExtraRuleRows() {
  const rows = byId("extraRulesRows");
  if (rows) rows.innerHTML = "";
}

function createExtraRuleRow(initial = {}) {
  const row = document.createElement("div");
  row.className = "extra-rule-row";

  const keyInput = document.createElement("input");
  keyInput.type = "text";
  keyInput.className = "extra-key";
  keyInput.placeholder = "clave";
  keyInput.value = String(initial.key || "").trim();

  const typeSelect = document.createElement("select");
  typeSelect.className = "extra-type";
  typeSelect.innerHTML = `
    <option value="string">Texto</option>
    <option value="number">Numero</option>
    <option value="boolean">Booleano</option>
  `;

  const valueWrap = document.createElement("div");
  valueWrap.className = "extra-value-wrap";

  const valueInput = document.createElement("input");
  valueInput.type = "text";
  valueInput.className = "extra-value";
  valueInput.placeholder = "valor";

  const boolSelect = document.createElement("select");
  boolSelect.className = "extra-value-bool";
  boolSelect.innerHTML = `
    <option value="true">true</option>
    <option value="false">false</option>
  `;

  valueWrap.append(valueInput, boolSelect);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "extra-remove";
  removeBtn.textContent = "Quitar";
  removeBtn.addEventListener("click", () => row.remove());

  row.append(keyInput, typeSelect, valueWrap, removeBtn);

  const applyTypeUi = () => {
    const isBoolean = typeSelect.value === "boolean";
    valueInput.style.display = isBoolean ? "none" : "";
    boolSelect.style.display = isBoolean ? "" : "none";
  };

  const type = ["string", "number", "boolean"].includes(initial.type)
    ? initial.type
    : "string";
  typeSelect.value = type;

  if (type === "boolean") {
    boolSelect.value = initial.value === false ? "false" : "true";
  } else {
    valueInput.value = initial.value == null ? "" : String(initial.value);
  }

  typeSelect.addEventListener("change", applyTypeUi);
  applyTypeUi();
  return row;
}

function addExtraRuleRow(initial = {}) {
  const rows = byId("extraRulesRows");
  if (!rows) return;
  rows.appendChild(createExtraRuleRow(initial));
}

function fillConfigBuilder(configuracion) {
  const config = isPlainObject(configuracion) ? configuracion : {};
  baseConfigForMerge = cloneConfig(config);
  managedConfigKeys = new Set(COMMON_CONFIG_KEYS);

  setValue(
    "cfgMaxParticipantes",
    Object.prototype.hasOwnProperty.call(config, "maxParticipantes")
      ? config.maxParticipantes
      : "",
  );
  setValue(
    "cfgDuracionMaximaMin",
    Object.prototype.hasOwnProperty.call(config, "duracionMaximaMin")
      ? config.duracionMaximaMin
      : "",
  );
  setValue(
    "cfgIntentosMaximos",
    Object.prototype.hasOwnProperty.call(config, "intentosMaximos")
      ? config.intentosMaximos
      : "",
  );
  setSelectValue(
    "cfgDificultad",
    Object.prototype.hasOwnProperty.call(config, "dificultad")
      ? String(config.dificultad || "")
      : "",
    "",
  );
  setValue(
    "cfgSeedFija",
    Object.prototype.hasOwnProperty.call(config, "seedFija")
      ? config.seedFija
      : "",
  );

  const permitirEmpates = byId("cfgPermitirEmpates");
  if (permitirEmpates) {
    const hasValue = Object.prototype.hasOwnProperty.call(config, "permitirEmpates");
    permitirEmpates.checked = Boolean(config.permitirEmpates);
    permitirEmpates.dataset.hasValue = hasValue ? "1" : "0";
  }

  clearExtraRuleRows();
  for (const [key, value] of Object.entries(config)) {
    if (COMMON_CONFIG_KEYS.includes(key)) continue;
    const valueType = typeof value;
    if (!["string", "number", "boolean"].includes(valueType)) {
      continue;
    }
    managedConfigKeys.add(key);
    addExtraRuleRow({
      key,
      type: inferExtraType(value),
      value,
    });
  }

  const json = JSON.stringify(config, null, 2);
  setValue("configuracion", json);
  initialAdvancedConfigText = json.trim();
}

function fillForm(torneo) {
  currentTorneo = torneo || null;
  setValue("nombre", torneo?.nombre || "");
  setSelectValue("tipo", String(torneo?.tipo || "PUNTOS").trim().toUpperCase(), "PUNTOS");
  setValue("estadoActual", torneo?.estado || "");
  setValue("creadorId", torneo?.creadorId || "");
  setValue("codigoAcceso", torneo?.codigoAcceso || "");
  setValue("descripcion", torneo?.descripcion || "");
  originalFechaInicioRaw = String(torneo?.fechaInicio || "").trim();
  originalFechaFinRaw = String(torneo?.fechaFin || "").trim();
  fechaInicioDirty = false;
  fechaFinDirty = false;
  setValue("fechaInicio", toDateTimeLocal(originalFechaInicioRaw));
  setValue("fechaFin", toDateTimeLocal(originalFechaFinRaw));
  setSelectValue(
    "recurrencia",
    String(torneo?.recurrencia || "NINGUNA").trim().toUpperCase(),
    "NINGUNA",
  );
  fillConfigBuilder(torneo?.configuracion);

  const esPublico = byId("esPublico");
  if (esPublico) esPublico.checked = Boolean(torneo?.esPublico);

  const nuevoEstado = byId("nuevoEstado");
  if (nuevoEstado) nuevoEstado.value = torneo?.estado || "BORRADOR";
  setAccessCodeUi();
}

function setAccessCodeUi() {
  const esPublico = Boolean(byId("esPublico")?.checked);
  const codigoInput = byId("codigoAcceso");
  const copyBtn = byId("copyCodigoBtn");
  const hint = byId("codigoAccesoHint");
  if (!codigoInput || !copyBtn || !hint) return;

  const codigo = String(codigoInput.value || "").trim();
  if (esPublico) {
    copyBtn.disabled = true;
    hint.textContent = "No aplica para torneos publicos.";
    return;
  }

  if (codigo) {
    copyBtn.disabled = false;
    hint.textContent = "Comparte este codigo para permitir acceso al torneo privado.";
    return;
  }

  copyBtn.disabled = true;
  hint.textContent = isCreateMode
    ? "Se generara automaticamente al crear el torneo privado."
    : "No hay codigo disponible aun. Guarda cambios para generar uno.";
}

async function copyTextToClipboard(value) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return true;
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
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

async function onCopyCodigoAcceso() {
  const esPublico = Boolean(byId("esPublico")?.checked);
  if (esPublico) {
    setStatus("El torneo es publico, no usa codigo de acceso.");
    return;
  }

  const codigo = String(byId("codigoAcceso")?.value || "").trim();
  if (!codigo) {
    setStatus("No hay codigo de acceso disponible para copiar.");
    return;
  }

  try {
    const copied = await copyTextToClipboard(codigo);
    if (!copied) throw new Error("No se pudo copiar");
    setStatus("Codigo de acceso copiado al portapapeles.");
  } catch {
    setStatus("No se pudo copiar automaticamente. Copialo manualmente.");
  }
}

function setCreateModeUi() {
  const detailTitle = byId("detailTitle");
  const saveBtn = byId("saveBtn");
  const estadoSection = byId("estadoSection");

  if (detailTitle) detailTitle.textContent = "Crear Torneo";
  if (saveBtn) saveBtn.textContent = "Crear torneo";
  if (estadoSection) estadoSection.style.display = "none";
  setStatus("Completa el formulario para crear un torneo nuevo.");
}

function setEditModeUi() {
  const detailTitle = byId("detailTitle");
  const saveBtn = byId("saveBtn");
  const estadoSection = byId("estadoSection");

  if (detailTitle) detailTitle.textContent = "Detalle de Torneo";
  if (saveBtn) saveBtn.textContent = "Guardar cambios";
  if (estadoSection) estadoSection.style.display = "";
}

function parseOptionalNumberField(id, fieldName) {
  const raw = String(byId(id)?.value || "").trim();
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} debe ser un numero valido.`);
  }
  return value;
}

function parseExtraRulesOrThrow() {
  const rows = Array.from(
    document.querySelectorAll("#extraRulesRows .extra-rule-row"),
  );
  const output = {};

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const key = String(row.querySelector(".extra-key")?.value || "").trim();
    const type = String(row.querySelector(".extra-type")?.value || "string").trim();
    const valueInput = row.querySelector(".extra-value");
    const boolSelect = row.querySelector(".extra-value-bool");
    const hasTextValue = String(valueInput?.value || "").trim().length > 0;

    if (!key && !hasTextValue) {
      continue;
    }
    if (!key) {
      throw new Error(`La regla extra #${index + 1} necesita una clave.`);
    }
    if (COMMON_CONFIG_KEYS.includes(key)) {
      throw new Error(`La clave "${key}" ya existe en reglas comunes.`);
    }
    if (Object.prototype.hasOwnProperty.call(output, key)) {
      throw new Error(`La clave "${key}" esta repetida en reglas extra.`);
    }

    if (type === "number") {
      const valueNumber = Number(valueInput?.value);
      if (!Number.isFinite(valueNumber)) {
        throw new Error(`La regla "${key}" debe tener un numero valido.`);
      }
      output[key] = valueNumber;
      continue;
    }

    if (type === "boolean") {
      output[key] = String(boolSelect?.value || "false") === "true";
      continue;
    }

    output[key] = String(valueInput?.value || "");
  }

  return output;
}

function buildAssistedConfigOrThrow() {
  const config = cloneConfig(baseConfigForMerge);

  for (const key of managedConfigKeys) {
    delete config[key];
  }

  const maxParticipantes = parseOptionalNumberField(
    "cfgMaxParticipantes",
    "Maximo participantes",
  );
  if (maxParticipantes !== undefined) config.maxParticipantes = maxParticipantes;

  const duracionMaximaMin = parseOptionalNumberField(
    "cfgDuracionMaximaMin",
    "Duracion maxima",
  );
  if (duracionMaximaMin !== undefined) {
    config.duracionMaximaMin = duracionMaximaMin;
  }

  const intentosMaximos = parseOptionalNumberField(
    "cfgIntentosMaximos",
    "Intentos maximos",
  );
  if (intentosMaximos !== undefined) config.intentosMaximos = intentosMaximos;

  const dificultad = String(byId("cfgDificultad")?.value || "").trim();
  if (dificultad) config.dificultad = dificultad;

  const seedFija = String(byId("cfgSeedFija")?.value || "").trim();
  if (seedFija) config.seedFija = seedFija;

  const permitirEmpates = byId("cfgPermitirEmpates");
  if (permitirEmpates) {
    const includeValue =
      permitirEmpates.dataset.hasValue === "1" || permitirEmpates.checked;
    if (includeValue) {
      config.permitirEmpates = Boolean(permitirEmpates.checked);
    }
  }

  const extraRules = parseExtraRulesOrThrow();
  for (const [key, value] of Object.entries(extraRules)) {
    config[key] = value;
  }

  return config;
}

function parseJsonConfigOrThrow(raw) {
  const text = String(raw || "").trim();
  const source = text || "{}";
  let parsed = null;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error("Configuracion invalida: debe ser JSON valido.");
  }
  if (!isPlainObject(parsed)) {
    throw new Error("Configuracion invalida: debe ser un objeto JSON.");
  }
  return parsed;
}

function buildConfigOrThrow() {
  const rawConfig = byId("configuracion")?.value || "";
  if (rawConfig.trim() !== initialAdvancedConfigText) {
    return parseJsonConfigOrThrow(rawConfig);
  }

  const assisted = buildAssistedConfigOrThrow();
  const json = JSON.stringify(assisted, null, 2);
  setValue("configuracion", json);
  return assisted;
}

function buildPayloadFromForm() {
  const payload = {
    nombre: (byId("nombre")?.value || "").trim(),
    descripcion: (byId("descripcion")?.value || "").trim(),
    tipo: (byId("tipo")?.value || "").trim().toUpperCase(),
    esPublico: Boolean(byId("esPublico")?.checked),
    fechaInicio: fromDateTimeLocal(byId("fechaInicio")?.value || "", {
      keepOriginal: !fechaInicioDirty,
      originalRaw: originalFechaInicioRaw,
    }),
    fechaFin: fromDateTimeLocal(byId("fechaFin")?.value || "", {
      keepOriginal: !fechaFinDirty,
      originalRaw: originalFechaFinRaw,
    }),
    recurrencia:
      (byId("recurrencia")?.value || "").trim().toUpperCase() || "NINGUNA",
    configuracion: buildConfigOrThrow(),
  };

  if (!payload.nombre) throw new Error("El nombre es obligatorio.");
  if (!payload.descripcion) throw new Error("La descripcion es obligatoria.");
  if (!payload.tipo) throw new Error("El tipo es obligatorio.");
  if (!payload.fechaInicio) throw new Error("Fecha inicio invalida.");
  if (!payload.fechaFin) throw new Error("Fecha fin invalida.");

  return payload;
}

async function loadTorneo(options = {}) {
  const silent = Boolean(options.silent);
  if (!torneoId) {
    if (!silent) setStatus("No se recibio el id del torneo.");
    return null;
  }

  try {
    const payload = await getJson(`${endpoints.torneos}/${encodeURIComponent(torneoId)}`);
    const torneo = payload?.data || payload;
    fillForm(torneo);
    if (!silent) setStatus(`Torneo cargado: ${torneo?.nombre || torneoId}`);
    return torneo;
  } catch (error) {
    if (!silent) setStatus(`Error al cargar torneo: ${error.message}`);
    return null;
  }
}

async function createTorneo() {
  const payload = buildPayloadFromForm();
  const response = await getJson(endpoints.torneos, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const created = response?.data || response;
  const createdId = String(created?._id || "").trim();
  if (!createdId) {
    setStatus("Torneo creado, pero no se recibio id del registro.");
    return;
  }

  setStatus(`Torneo creado correctamente (${createdId}). Redirigiendo...`);
  window.location.href = `/tabs/torneo-detalle.html?id=${encodeURIComponent(createdId)}`;
}

async function updateTorneo() {
  const payload = buildPayloadFromForm();
  await getJson(`${endpoints.torneos}/${encodeURIComponent(torneoId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  setStatus("Torneo actualizado correctamente.");
  await loadTorneo();
}

async function onSave(event) {
  event.preventDefault();

  try {
    if (isCreateMode) {
      await createTorneo();
      return;
    }
    await updateTorneo();
  } catch (error) {
    setStatus(
      isCreateMode
        ? `Error al crear torneo: ${error.message}`
        : `Error al actualizar torneo: ${error.message}`,
    );
  }
}

async function onUpdateEstado() {
  if (isCreateMode || !torneoId) return;
  const estado = byId("nuevoEstado")?.value || "";
  if (!estado) {
    setStatus("Selecciona un estado valido.");
    return;
  }

  try {
    await getJson(`${endpoints.torneos}/${encodeURIComponent(torneoId)}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado, razon: "Cambio desde dashboard admin" }),
    });
    const torneoPostPatch = await loadTorneo({ silent: true });
    const estadoFinal = String(torneoPostPatch?.estado || "").trim();
    if (estadoFinal && estadoFinal !== estado) {
      setStatus(
        `Se solicito estado ${estado}, pero el torneo quedo en ${estadoFinal} por sincronizacion automatica de fechas.`,
      );
      return;
    }
    setStatus(`Estado actualizado a ${estado}.`);
  } catch (error) {
    setStatus(`Error al actualizar estado: ${error.message}`);
  }
}

window.addEventListener("load", () => {
  const session = window.AdminAuth.requireSession();
  if (!session) return;
  window.AdminAuth.bindLogoutButtons();

  const params = new URLSearchParams(window.location.search);
  torneoId = (params.get("id") || "").trim();
  const mode = (params.get("mode") || "").trim().toLowerCase();
  isCreateMode = mode === "create" || !torneoId;

  const form = byId("torneoForm");
  const updateEstadoBtn = byId("updateEstadoBtn");
  const addExtraRuleBtn = byId("addExtraRuleBtn");
  const cfgPermitirEmpates = byId("cfgPermitirEmpates");
  const copyCodigoBtn = byId("copyCodigoBtn");
  const esPublico = byId("esPublico");
  const fechaInicioInput = byId("fechaInicio");
  const fechaFinInput = byId("fechaFin");

  if (form) form.addEventListener("submit", onSave);
  if (updateEstadoBtn) updateEstadoBtn.addEventListener("click", onUpdateEstado);
  if (addExtraRuleBtn) {
    addExtraRuleBtn.addEventListener("click", () => addExtraRuleRow({}));
  }
  if (cfgPermitirEmpates) {
    cfgPermitirEmpates.addEventListener("change", () => {
      cfgPermitirEmpates.dataset.hasValue = "1";
    });
  }
  if (copyCodigoBtn) copyCodigoBtn.addEventListener("click", onCopyCodigoAcceso);
  if (esPublico) esPublico.addEventListener("change", setAccessCodeUi);
  if (fechaInicioInput) {
    const markInicioDirty = () => {
      fechaInicioDirty = true;
    };
    fechaInicioInput.addEventListener("input", markInicioDirty);
    fechaInicioInput.addEventListener("change", markInicioDirty);
  }
  if (fechaFinInput) {
    const markFinDirty = () => {
      fechaFinDirty = true;
    };
    fechaFinInput.addEventListener("input", markFinDirty);
    fechaFinInput.addEventListener("change", markFinDirty);
  }

  if (isCreateMode) {
    setCreateModeUi();
    fillForm(getCreateDefaults());
    return;
  }

  setEditModeUi();
  loadTorneo();
});
