import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { haversineKm, normalizeLon } from "../zones.js";

// Monitored regions from the map, smallest first so a tight box wins.
const REGIONS = [
  {
    name: "Gaza",
    label: [31.43, 34.38],
    bounds: [
      [31.18, 34.16],
      [31.64, 34.62]
    ]
  },
  {
    name: "United States",
    label: [31.8, -102.3],
    bounds: [
      [29.0, -105.6],
      [34.8, -99.0]
    ]
  },
  {
    name: "Sudan",
    label: [15.5, 30.3],
    bounds: [
      [8.0, 21.5],
      [22.4, 38.8]
    ]
  },
  {
    name: "Ukraine",
    label: [48.9, 31.4],
    bounds: [
      [44.0, 22.0],
      [52.5, 40.5]
    ]
  },
  {
    name: "Iran / Gulf",
    label: [30.4, 52.2],
    bounds: [
      [23.0, 44.0],
      [37.2, 61.8]
    ]
  }
];

const DISPLAY_NAMES = {
  "United States of America": "United States",
  "Dem. Rep. Congo": "DR Congo",
  "S. Sudan": "South Sudan",
  "Central African Rep.": "Central African Republic",
  "Dominican Rep.": "Dominican Republic",
  "Eq. Guinea": "Equatorial Guinea",
  "Bosnia and Herz.": "Bosnia and Herzegovina",
  "Solomon Is.": "Solomon Islands"
};

const countries = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "countries.json"), "utf8")
);

function displayName(name) {
  return DISPLAY_NAMES[name] || name;
}

function ringContains(ring, lon, lat) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const crosses = yi > lat !== yj > lat;
    if (crosses && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function polygonContains(polygon, lon, lat) {
  if (!polygon?.length || !ringContains(polygon[0], lon, lat)) return false;
  for (let hole = 1; hole < polygon.length; hole += 1) {
    if (ringContains(polygon[hole], lon, lat)) return false;
  }
  return true;
}

function countryContains(country, lat, lon) {
  const longs = [lon, lon + 360, lon - 360];
  for (const candidate of longs) {
    if (!country.crosses) {
      const [minLon, minLat, maxLon, maxLat] = country.bbox;
      if (candidate < minLon || candidate > maxLon || lat < minLat || lat > maxLat) continue;
    }
    for (const polygon of country.polygons) {
      if (polygonContains(polygon, candidate, lat)) return true;
    }
  }
  return false;
}

function regionAt(lat, lon) {
  for (const region of REGIONS) {
    const [[south, west], [north, east]] = region.bounds;
    if (lat >= south && lat <= north && lon >= west && lon <= east) return region;
  }
  return null;
}

function countryAt(lat, lon) {
  for (const country of countries) {
    if (countryContains(country, lat, lon)) return country;
  }
  return null;
}

function nearestCountry(lat, lon) {
  let best = null;
  let bestDist = Infinity;
  for (const country of countries) {
    if (!country.crosses) {
      const [minLon, minLat, maxLon, maxLat] = country.bbox;
      if (lon < minLon - 4 || lon > maxLon + 4 || lat < minLat - 4 || lat > maxLat + 4) continue;
    }
    for (const polygon of country.polygons) {
      for (const ring of polygon) {
        for (let i = 0; i < ring.length; i += 3) {
          const dist = haversineKm(lat, lon, ring[i][1], ring[i][0]);
          if (dist < bestDist) {
            bestDist = dist;
            best = country;
          }
        }
      }
    }
  }
  if (!best || bestDist > 250) return null;
  return best;
}

function compassLabel(fromLat, fromLon, lat, lon) {
  const dLon = normalizeLon(lon - fromLon) * Math.cos((((fromLat + lat) / 2) * Math.PI) / 180);
  const dLat = lat - fromLat;
  if (Math.hypot(dLat, dLon) < 0.05) return "central";
  const degrees = (Math.atan2(dLon, dLat) * 180) / Math.PI;
  const names = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
  return names[Math.round(((degrees + 360) % 360) / 45) % 8];
}

export function nameZone(lat, lon, taken = new Set()) {
  const region = regionAt(lat, lon);
  const country = region ? null : countryAt(lat, lon) || nearestCountry(lat, lon);
  const place = region || (country ? { name: displayName(country.name), label: country.label } : null);
  const base = place?.name || "Open ocean";
  if (!taken.has(base)) return base;
  const ref = place?.label || [lat, lon];
  const compass = compassLabel(ref[0], ref[1], lat, lon);
  const withCompass = `${base}, ${compass}`;
  if (!taken.has(withCompass)) return withCompass;
  const coordLabel = (places) => {
    const ns = lat >= 0 ? "N" : "S";
    const ew = lon >= 0 ? "E" : "W";
    const fmt = (value) => {
      const rounded = places ? Math.abs(value).toFixed(places) : String(Math.abs(Math.round(value)));
      return rounded;
    };
    return `${fmt(lat)}°${ns} ${fmt(lon)}°${ew}`;
  };
  for (const places of [0, 1]) {
    const withCoord = `${base} · ${coordLabel(places)}`;
    if (!taken.has(withCoord)) return withCoord;
  }
  const precise = `${base} · ${coordLabel(1)}`;
  let n = 2;
  while (taken.has(`${precise} ${n}`)) n += 1;
  return `${precise} ${n}`;
}
