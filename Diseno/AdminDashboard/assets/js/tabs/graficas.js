const endpoints = {
  snapshot: "/api/admin/snapshot",
};

const palette = ["#0f5ea6", "#25c985", "#3f7fc7", "#52a7ff", "#8bc34a"];
const REFRESH_MS = 10000;
let loading = false;
let selectedBucket = "daily";

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
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

function buildSnapshotUrl(daysBack = 365) {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - daysBack);
  const params = new URLSearchParams({
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  });
  return `${endpoints.snapshot}?${params.toString()}`;
}

function getDaysBackByBucket(bucket) {
  if (bucket === "weekly") return 180;
  if (bucket === "monthly") return 365;
  if (bucket === "yearly") return 3650;
  return 60;
}

function toWeekKey(date) {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = (copy.getUTCDay() + 6) % 7;
  copy.setUTCDate(copy.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(copy.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  const weekNo = 1 + Math.round((copy - firstThursday) / (7 * 24 * 60 * 60 * 1000));
  return `${copy.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function aggregateTimeseries(rows, bucket) {
  const source = Array.isArray(rows) ? rows : [];
  if (!source.length) return [];

  if (bucket === "daily") {
    return source.map((row) => ({ label: row.date, users: Number(row.users) || 0 }));
  }

  const grouped = new Map();
  source.forEach((row) => {
    const date = new Date(row.date);
    if (Number.isNaN(date.getTime())) return;

    let key = "";
    if (bucket === "weekly") key = toWeekKey(date);
    else if (bucket === "monthly") key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    else key = `${date.getUTCFullYear()}`;

    grouped.set(key, Number(row.users) || 0);
  });

  return Array.from(grouped.entries()).map(([label, users]) => ({ label, users }));
}

function drawEmpty(svg, message) {
  svg.innerHTML = `<text x="50%" y="50%" text-anchor="middle" fill="#6b7297" font-size="16">${message}</text>`;
}

function normalizeUsersByGame(mapData) {
  const source = mapData && typeof mapData === "object" ? mapData : {};
  const normalized = {
    pvp: 0,
    torneos: 0,
  };

  Object.entries(source).forEach(([rawKey, rawValue]) => {
    const key = String(rawKey || "").trim().toLowerCase();
    const value = Number(rawValue) || 0;
    if (!key) return;

    if (key === "sudoku" || key === "singleplayer" || key === "single_player" || key === "single-player") return;
    if (key === "pvp") {
      normalized.pvp += value;
      return;
    }
    if (key === "torneos" || key === "torneo") {
      normalized.torneos += value;
      return;
    }
    normalized[key] = (normalized[key] || 0) + value;
  });

  return normalized;
}

function renderLineChart(svgId, points, xKey, yKey) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  svg.innerHTML = "";
  if (!points.length) {
    drawEmpty(svg, "Sin datos");
    return;
  }

  const width = 700;
  const height = 300;
  const left = 52;
  const right = 24;
  const top = 16;
  const bottom = 44;
  const ys = points.map((p) => Number(p[yKey]) || 0);
  const maxY = Math.max(...ys, 1);
  const plotW = width - left - right;
  const plotH = height - top - bottom;

  const coords = points.map((point, index) => {
    const x = left + (index * plotW) / Math.max(points.length - 1, 1);
    const y = top + plotH - ((Number(point[yKey]) || 0) / maxY) * plotH;
    return { x, y, point };
  });

  for (let i = 0; i <= 4; i += 1) {
    const y = top + (plotH * i) / 4;
    const yValue = Math.round(maxY - (maxY * i) / 4);
    svg.insertAdjacentHTML(
      "beforeend",
      `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="#e5e8ff" stroke-width="1"/>` +
        `<text x="${left - 8}" y="${y + 4}" text-anchor="end" fill="#6b7297" font-size="11">${yValue}</text>`,
    );
  }

  const areaPath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x} ${c.y}`).join(" ");
  const area = `${areaPath} L ${coords[coords.length - 1].x} ${height - bottom} L ${coords[0].x} ${height - bottom} Z`;
  svg.insertAdjacentHTML("beforeend", `<path d="${area}" fill="rgba(15,94,166,0.18)"/>`);

  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  svg.insertAdjacentHTML(
    "beforeend",
    `<polyline points="${linePoints}" fill="none" stroke="#0f5ea6" stroke-width="3" stroke-linecap="round"/>`,
  );

  const maxLabels = 6;
  const labelIndexes = new Set([0, coords.length - 1]);
  if (coords.length > 2) {
    const interiorSlots = Math.max(0, maxLabels - 2);
    for (let i = 1; i <= interiorSlots; i += 1) {
      const idx = Math.round((i * (coords.length - 1)) / (interiorSlots + 1));
      labelIndexes.add(idx);
    }
  }

  coords.forEach((c, idx) => {
    const label = String(c.point[xKey]);
    const shouldLabel = labelIndexes.has(idx);
    const isFirst = idx === 0;
    const isLast = idx === coords.length - 1;
    const xLabel = isFirst ? c.x + 2 : isLast ? c.x - 2 : c.x;
    const anchor = isFirst ? "start" : isLast ? "end" : "middle";
    svg.insertAdjacentHTML(
      "beforeend",
      `<circle cx="${c.x}" cy="${c.y}" r="4" fill="#0b4b85"/>` +
        (shouldLabel
          ? `<text x="${xLabel}" y="${height - 14}" text-anchor="${anchor}" fill="#6b7297" font-size="11">${label}</text>`
          : ""),
    );
  });
}

function renderBarChart(svgId, mapData) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  svg.innerHTML = "";
  const normalized = normalizeUsersByGame(mapData);
  const primaryOrder = ["pvp", "torneos"];
  const knownEntries = primaryOrder.map((key) => [key, Number(normalized[key]) || 0]);
  const extraEntries = Object.entries(normalized).filter(
    ([key]) =>
      !primaryOrder.includes(key) &&
      key !== "sudoku" &&
      key !== "singleplayer" &&
      key !== "single_player" &&
      key !== "single-player",
  );
  const entries = [...knownEntries, ...extraEntries];

  if (!entries.length) {
    drawEmpty(svg, "Sin datos");
    return;
  }

  const width = 820;
  const height = 420;
  const left = 56;
  const right = 30;
  const top = 34;
  const bottom = 80;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const maxY = Math.max(...entries.map(([, value]) => Number(value) || 0), 1);
  const slotW = plotW / entries.length;
  const barW = Math.max(44, Math.min(110, slotW - 20));

  svg.insertAdjacentHTML(
    "beforeend",
    `<line x1="${left}" y1="${top + plotH}" x2="${width - right}" y2="${top + plotH}" stroke="#dce8fa" stroke-width="1.2"/>`,
  );

  for (let i = 1; i <= 3; i += 1) {
    const y = top + plotH - (plotH * i) / 3;
    svg.insertAdjacentHTML(
      "beforeend",
      `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="#edf3ff" stroke-width="1"/>`,
    );
  }

  entries.forEach(([label, value], i) => {
    const v = Number(value) || 0;
    const h = (v / maxY) * plotH;
    const x = left + i * slotW + (slotW - barW) / 2;
    const y = top + plotH - h;
    const color = palette[i % palette.length];
    svg.insertAdjacentHTML(
      "beforeend",
      `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="12" fill="${color}" opacity="0.95"/>` +
        `<rect x="${x}" y="${y}" width="${barW}" height="10" rx="12" fill="rgba(255,255,255,0.18)"/>` +
        `<text x="${x + barW / 2}" y="${Math.max(y - 10, top + 12)}" text-anchor="middle" fill="#1e2450" font-size="12" font-weight="700">${v}</text>` +
        `<text x="${x + barW / 2}" y="${height - 24}" text-anchor="middle" fill="#526483" font-size="12" font-weight="700">${label}</text>`,
    );
  });
}

function renderDifficultyMatchesChart(svgId, rows) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  svg.innerHTML = "";

  const source = Array.isArray(rows) ? rows : [];
  const entries = source
    .map((row) => [String(row?.dificultad || "").trim(), Number(row?.sessionsCount) || 0])
    .filter(([label]) => Boolean(label));

  if (!entries.length) {
    drawEmpty(svg, "Sin datos");
    return;
  }

  const width = 820;
  const height = 380;
  const left = 56;
  const right = 30;
  const top = 34;
  const bottom = 88;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const maxY = Math.max(...entries.map(([, value]) => Number(value) || 0), 1);
  const slotW = plotW / entries.length;
  const barW = Math.max(36, Math.min(96, slotW - 20));

  svg.insertAdjacentHTML(
    "beforeend",
    `<line x1="${left}" y1="${top + plotH}" x2="${width - right}" y2="${top + plotH}" stroke="#dce8fa" stroke-width="1.2"/>`,
  );

  for (let i = 1; i <= 3; i += 1) {
    const y = top + plotH - (plotH * i) / 3;
    svg.insertAdjacentHTML(
      "beforeend",
      `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="#edf3ff" stroke-width="1"/>`,
    );
  }

  entries.forEach(([label, value], i) => {
    const v = Number(value) || 0;
    const h = (v / maxY) * plotH;
    const x = left + i * slotW + (slotW - barW) / 2;
    const y = top + plotH - h;
    const color = palette[i % palette.length];
    svg.insertAdjacentHTML(
      "beforeend",
      `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="12" fill="${color}" opacity="0.95"/>` +
        `<rect x="${x}" y="${y}" width="${barW}" height="10" rx="12" fill="rgba(255,255,255,0.18)"/>` +
        `<text x="${x + barW / 2}" y="${Math.max(y - 10, top + 12)}" text-anchor="middle" fill="#1e2450" font-size="12" font-weight="700">${v}</text>` +
        `<text x="${x + barW / 2}" y="${height - 28}" text-anchor="middle" fill="#526483" font-size="11" font-weight="700">${label}</text>`,
    );
  });
}

async function loadGraficas() {
  if (loading) return;
  loading = true;
  try {
    const snapshot = await getJson(buildSnapshotUrl(getDaysBackByBucket(selectedBucket)));
    const overview = snapshot.overview || {};
    const usersTotal = snapshot.usersTotal || {};
    const timeseries = snapshot.usersTimeseries || {};
    const avgTimeByDifficulty = snapshot.avgTimeByDifficulty || {};
    const aggregatedTimeseries = aggregateTimeseries(timeseries.data || [], selectedBucket);

    setText("metricUsers", usersTotal.totalUsers ?? overview.totalUsers ?? "-");
    setText("metricParticipations", overview.totalGameParticipations ?? "-");
    renderLineChart("timeseriesChart", aggregatedTimeseries, "label", "users");
    renderBarChart("gamesChart", overview.usersByGame || {});
    renderDifficultyMatchesChart("difficultyMatchesChart", avgTimeByDifficulty.data || []);
  } catch (error) {
    setText("metricUsers", "Error");
    setText("metricParticipations", error.message);
    renderLineChart("timeseriesChart", [], "label", "users");
    renderBarChart("gamesChart", {});
    renderDifficultyMatchesChart("difficultyMatchesChart", []);
  } finally {
    loading = false;
  }
}

window.addEventListener("focus", loadGraficas);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) loadGraficas();
});
window.addEventListener("load", () => {
  const bucketSelect = document.getElementById("timeBucketSelect");
  if (bucketSelect) {
    bucketSelect.value = selectedBucket;
    bucketSelect.addEventListener("change", (event) => {
      selectedBucket = event.target.value || "daily";
      loadGraficas();
    });
  }

  loadGraficas();
  window.setInterval(() => {
    if (!document.hidden) loadGraficas();
  }, REFRESH_MS);
});
