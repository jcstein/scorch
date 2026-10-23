export const THERMAL_DETAIL_ZOOM = 6;
export const THERMAL_POINT_CAP = 400;
export const THERMAL_CLUSTER_CAP = 220;
export const THERMAL_TILE_DEGREES = 10;

const SEVERITY_CODE = { low: 0, medium: 1, high: 2 };
const SEVERITY_NAME = ["low", "medium", "high"];

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

export function thermalTileId(lat, lon, size = THERMAL_TILE_DEGREES) {
  const latKey = Math.floor(Number(lat) / size) * size;
  const lonKey = Math.floor(Number(lon) / size) * size;
  return `${latKey}_${lonKey}`;
}

export function packThermalEvents(events) {
  const areas = [];
  const areaIndex = new Map();
  const indexFor = (areaId) => {
    const id = areaId || "global-hub";
    if (!areaIndex.has(id)) {
      areaIndex.set(id, areas.length);
      areas.push(id);
    }
    return areaIndex.get(id);
  };

  const tiles = new Map();
  const cells = { 1: new Map(), 2: new Map() };
  let total = 0;

  for (const event of events) {
    if (!event || event.type !== "thermal") continue;
    const lat = Number(event.lat);
    const lon = Number(event.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const roundedLat = Math.round(lat * 10) / 10;
    const roundedLon = Math.round(lon * 10) / 10;
    const frp = Number(event.frp);
    const roundedFrp = Number.isFinite(frp) ? Math.round(frp * 10) / 10 : 0;
    const areaId = event.areaId || "global-hub";
    const severity = SEVERITY_CODE[event.severity] ?? 0;
    total += 1;

    const tileId = thermalTileId(roundedLat, roundedLon);
    let tile = tiles.get(tileId);
    if (!tile) {
      tile = { id: tileId, count: 0, maxFrp: 0, points: [] };
      tiles.set(tileId, tile);
    }
    tile.count += 1;
    if (roundedFrp > tile.maxFrp) tile.maxFrp = roundedFrp;
    tile.points.push([roundedLat, roundedLon, roundedFrp, indexFor(areaId), severity]);

    for (const size of [1, 2]) {
      const latKey = Math.floor(roundedLat / size) * size;
      const lonKey = Math.floor(roundedLon / size) * size;
      const key = `${latKey}:${lonKey}`;
      let cell = cells[size].get(key);
      if (!cell) {
        cell = {
          lat: latKey + size / 2,
          lon: lonKey + size / 2,
          count: 0,
          maxFrp: 0,
          areas: {}
        };
        cells[size].set(key, cell);
      }
      cell.count += 1;
      cell.areas[areaId] = (cell.areas[areaId] || 0) + 1;
      if (roundedFrp > cell.maxFrp) cell.maxFrp = roundedFrp;
    }
  }

  const sortCells = (list) => list.sort((a, b) => b.count - a.count || b.maxFrp - a.maxFrp);
  return {
    areas,
    total,
    cells: {
      1: sortCells([...cells[1].values()]),
      2: sortCells([...cells[2].values()])
    },
    tiles: [...tiles.values()].sort((a, b) => b.count - a.count || b.maxFrp - a.maxFrp)
  };
}

export function selectThermalCells(cells, options = {}) {
  const bounds = options.bounds;
  const cap = options.clusterCap || options.cap || THERMAL_CLUSTER_CAP;
  const countFor = options.countFor || ((cell) => cell.count || 0);
  const matched = [];
  let totalInView = 0;

  for (const cell of cells || []) {
    const count = countFor(cell);
    if (!count) continue;
    if (!inBounds(cell.lat, cell.lon, bounds)) continue;
    totalInView += count;
    matched.push({
      lat: cell.lat,
      lon: cell.lon,
      count,
      maxFrp: cell.maxFrp || 0,
      cell: options.cell || 1
    });
  }

  matched.sort((a, b) => b.count - a.count || b.maxFrp - a.maxFrp);
  const shown = matched.slice(0, cap);
  return {
    mode: "clusters",
    shown,
    totalInView,
    clusterTotal: matched.length,
    capped: matched.length > shown.length
  };
}

export function tilesForBounds(bounds, knownIds, size = THERMAL_TILE_DEGREES) {
  const known = knownIds instanceof Set ? knownIds : new Set(knownIds || []);
  if (!bounds) return [...known];
  const ranges =
    bounds.west <= bounds.east
      ? [[bounds.west, bounds.east]]
      : [
          [bounds.west, 180],
          [-180, bounds.east]
        ];
  const latStart = Math.floor(bounds.south / size) * size;
  const latEnd = Math.floor(bounds.north / size) * size;
  const ids = [];
  for (let lat = latStart; lat <= latEnd; lat += size) {
    for (const [west, east] of ranges) {
      const lonStart = Math.floor(west / size) * size;
      const lonEnd = Math.floor(east / size) * size;
      for (let lon = lonStart; lon <= lonEnd; lon += size) {
        const id = `${lat}_${lon}`;
        if (known.has(id)) ids.push(id);
      }
    }
  }
  return ids;
}

export function decodeThermalPoint(row, areas, generatedAt) {
  const lat = Number(row?.[0]);
  const lon = Number(row?.[1]);
  const frp = Number(row?.[2]) || 0;
  const areaIndex = Number(row?.[3]) || 0;
  const severity = SEVERITY_NAME[Number(row?.[4])] || "low";
  const areaId = areas?.[areaIndex] || "global-hub";
  return {
    id: `heat-${areaIndex}-${lat}-${lon}`,
    type: "thermal",
    severity,
    summary: frp ? `FRP ${frp.toFixed(1)} MW` : "",
    areaId,
    lat,
    lon,
    eventTime: generatedAt || "",
    sourceName: "NASA FIRMS",
    link: "https://firms.modaps.eosdis.nasa.gov/map/",
    signals: ["Thermal", "Unconfirmed"],
    locationPrecision: "sensor",
    frp
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
