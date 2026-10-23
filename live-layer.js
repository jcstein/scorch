export const THERMAL_DETAIL_ZOOM = 6;
export const THERMAL_POINT_CAP = 400;
export const THERMAL_CLUSTER_CAP = 220;

export function cellSizeForZoom(zoom) {
  if (zoom < 4) return 2;
  if (zoom < THERMAL_DETAIL_ZOOM) return 1;
  return 0;
}

export function inBounds(lat, lon, bounds) {
  if (!bounds) return true;
  if (lat < bounds.south || lat > bounds.north) return false;
  if (bounds.west <= bounds.east) {
    return lon >= bounds.west && lon <= bounds.east;
  }
  return lon >= bounds.west || lon <= bounds.east;
}

export function selectThermalForView(events, options) {
  const zoom = Number(options.zoom) || 2;
  const bounds = options.bounds;
  const cap = options.cap || THERMAL_POINT_CAP;
  const clusterCap = options.clusterCap || THERMAL_CLUSTER_CAP;
  const pinId = options.pinId || null;
  const cell = cellSizeForZoom(zoom);
  const inside = [];

  for (const event of events) {
    if (!event || event.type !== "thermal") continue;
    if (!Number.isFinite(event.lat) || !Number.isFinite(event.lon)) continue;
    if (!inBounds(event.lat, event.lon, bounds)) continue;
    inside.push(event);
  }

  if (cell === 0) {
    inside.sort((a, b) => (Number(b.frp) || 0) - (Number(a.frp) || 0));
    let shown = inside.slice(0, cap);
    if (pinId && !shown.some((event) => event.id === pinId)) {
      const pinned = inside.find((event) => event.id === pinId);
      if (pinned) shown = [pinned, ...shown.slice(0, Math.max(0, cap - 1))];
    }
    return {
      mode: "points",
      shown,
      totalInView: inside.length,
      capped: inside.length > shown.length
    };
  }

  const groups = new Map();
  for (const event of inside) {
    const latKey = Math.floor(event.lat / cell) * cell;
    const lonKey = Math.floor(event.lon / cell) * cell;
    const key = `${latKey}:${lonKey}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        id: `heat-${key}`,
        lat: latKey + cell / 2,
        lon: lonKey + cell / 2,
        count: 0,
        maxFrp: 0,
        cell
      };
      groups.set(key, group);
    }
    group.count += 1;
    const frp = Number(event.frp) || 0;
    if (frp > group.maxFrp) group.maxFrp = frp;
  }

  const clusters = [...groups.values()].sort((a, b) => b.count - a.count || b.maxFrp - a.maxFrp);
  return {
    mode: "clusters",
    shown: clusters.slice(0, clusterCap),
    totalInView: inside.length,
    clusterTotal: clusters.length,
    capped: clusters.length > clusterCap
  };
}

export function presentEvent(event) {
  const thermal = event?.type === "thermal";
  const approximate = !thermal && event?.locationPrecision !== "exact";
  const detail = String(event?.summary || "").trim();

  if (thermal) {
    return {
      title: "Unconfirmed heat",
      summary: detail
        ? `Unconfirmed satellite heat (${detail}). This is not a damage assessment.`
        : "Unconfirmed satellite heat. This is not a damage assessment.",
      locationNote: "Sensor coordinate. Heat is not confirmed damage.",
      sourceName: event.sourceName || "NASA FIRMS",
      signals: ["Thermal", "Unconfirmed"],
      approximate: false
    };
  }

  return {
    title: event?.title || "Live report",
    summary: detail,
    locationNote: approximate
      ? "Approximate location, placed from the wording of the report."
      : "",
    sourceName: event?.sourceName || "Source",
    signals: Array.isArray(event?.signals) ? event.signals : [],
    approximate
  };
}
