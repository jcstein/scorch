import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { presentEvent, selectThermalForView } from "./live-layer.js";
import { LIVE_WINDOW_HOURS } from "./live-window.js";

const areas = [
  {
    id: "iran-gulf",
    name: "Iran / Gulf",
    shortLabel: "Iran Gulf",
    filterValue: "Iran / Gulf",
    center: [30.4, 52.2],
    bounds: [
      [23.0, 44.0],
      [37.2, 61.8]
    ],
    summary:
      "Best current zone for oil-facility fires, strike fallout, and fast-moving public-source checks."
  },
  {
    id: "gaza",
    name: "Gaza",
    shortLabel: "Gaza",
    filterValue: "Gaza",
    center: [31.43, 34.38],
    bounds: [
      [31.18, 34.16],
      [31.64, 34.62]
    ],
    summary:
      "Pairs civilian harm documentation with slower but stronger structure-level satellite damage assessments."
  },
  {
    id: "ukraine",
    name: "Ukraine",
    shortLabel: "Ukraine",
    filterValue: "Ukraine",
    center: [48.9, 31.4],
    bounds: [
      [44.0, 22.0],
      [52.5, 40.5]
    ],
    summary:
      "Useful for environmental harm case studies, infrastructure fallout, and ecosystem-level damage context."
  },
  {
    id: "sudan",
    name: "Sudan",
    shortLabel: "Sudan",
    filterValue: "Sudan",
    center: [15.5, 30.3],
    bounds: [
      [8.0, 21.5],
      [22.4, 38.8]
    ],
    summary:
      "Tracks pollution, industrial damage, degraded sanitation, and energy infrastructure fallout."
  },
  {
    id: "united-states",
    name: "United States methane belt",
    shortLabel: "US Methane",
    filterValue: "United States",
    center: [31.8, -102.3],
    bounds: [
      [29.0, -105.6],
      [34.8, -99.0]
    ],
    summary:
      "A domestic comparison zone for methane releases and oil-and-gas damage signals outside wartime conditions."
  },
  {
    id: "global-hub",
    name: "Global orbit and baseline layers",
    shortLabel: "Global",
    filterValue: "Global",
    center: [18.0, -28.0],
    zoom: 2,
    summary:
      "This pin is a hub for worldwide models and baselines. It is not a single damage site."
  }
];

const areasById = new Map(areas.map((area) => [area.id, area]));

const sources = [
  {
    id: "nasa-firms",
    title: "NASA FIRMS active fire map",
    region: "Iran / Gulf",
    groups: ["Iran / Gulf", "Global"],
    signals: ["Thermal", "Oil Fires", "Satellite"],
    priority: true,
    freshness: "Near-real-time",
    freshnessRank: 5,
    sourceDate: "Updated continuously",
    cadence: "Within ~3 hours globally; WMS every 15 minutes",
    access: "Open; WMS needs a free MAP_KEY",
    description:
      "NASA's fire and thermal anomaly layer is the fastest public way to see fresh combustion signatures, including refinery burns, depot fires, and urban strike fires.",
    why:
      "It is the quickest public check for whether something is burning now, which is exactly what you want during fast-moving escalation.",
    limits:
      "Thermal hits are not the same thing as confirmed military damage and can miss smoke-obscured or short-lived events.",
    link: "https://firms.modaps.eosdis.nasa.gov/map/",
    extraLabel: "Worldview",
    extraLink:
      "https://worldview.earthdata.nasa.gov/?l=MODIS_Aqua_SurfaceReflectance_Bands143,MODIS_Aqua_SurfaceReflectance_Bands721,MODIS_Terra_SurfaceReflectance_Bands143,MODIS_Terra_SurfaceReflectance_Bands721,VIIRS_SNPP_CorrectedReflectance_TrueColor(hidden),MODIS_Aqua_CorrectedReflectance_TrueColor(hidden),MODIS_Terra_CorrectedReflectance_TrueColor,MODIS_Fires_Terra(hidden),MODIS_Fires_Aqua(hidden),VIIRS_SNPP_Fires_375m_Night,VIIRS_SNPP_Fires_375m_Day,MODIS_Fires_All,Reference_Labels(hidden),Reference_Features(hidden),Coastlines&p=geographic&z=3",
    primaryArea: "iran-gulf",
    mapAreas: ["iran-gulf", "global-hub"],
    point: [29.7, 52.5],
    zoom: 6,
    locationLabel: "Persian Gulf energy corridor"
  },
  {
    id: "ceobs-iran-update",
    title: "CEOBS: Iran War environmental risk overview (27 March 2026)",
    region: "Iran / Gulf",
    groups: ["Iran / Gulf"],
    signals: ["Environmental Risk", "Oil Fires", "Water", "Military"],
    priority: true,
    freshness: "March 27, 2026",
    freshnessRank: 3,
    sourceDate: "March 27, 2026",
    cadence: "Snapshot analysis",
    access: "Open",
    description:
      "CEOBS's late-March overview of how the Israeli-US war against Iran was driving conflict-linked pollution, industrial fires, water risk, and nuclear and fossil-fuel hazards.",
    why:
      "It is still the fullest public CEOBS environmental-risk brief for the opening phase of the war. Later 2026 CEOBS writing introduces the WISEN database rather than a newer theatre-wide overview.",
    limits:
      "The page is dated 27 March 2026 and is not a live incident feed. Incident claims were remote assessments made during an active war.",
    link: "https://ceobs.org/iran-war-environmental-risk-overview-as-of-27th-march/",
    extraLabel: "WISEN database",
    extraLink:
      "https://ceobs.org/introducing-wisen-the-wartime-incidents-to-environment-database/",
    primaryArea: "iran-gulf",
    mapAreas: ["iran-gulf"],
    point: [32.5, 53.7],
    zoom: 6,
    locationLabel: "Iran conflict theatre"
  },
  {
    id: "acled-hormuz-oil",
    title: "ACLED: Strait of Hormuz oil flows and shipping attacks",
    region: "Iran / Gulf",
    groups: ["Iran / Gulf"],
    signals: ["Conflict Events", "Oil", "Shipping", "Strike Pattern"],
    priority: true,
    freshness: "October 2, 2026",
    freshnessRank: 4,
    sourceDate: "October 2, 2026",
    cadence: "Expert comment",
    access: "Open",
    description:
      "ACLED's Middle East analyst on why recovering crude flows through the Strait of Hormuz do not mean the threat to tankers has eased.",
    why:
      "Published 2 October 2026, it is the current public ACLED note on the Gulf energy corridor: September had the most successful Iranian attacks on commercial shipping since the March peak, including at least 16 tankers.",
    limits:
      "It is a short analyst comment on shipping and oil flows, not an environmental-damage map or a downloadable event file.",
    link: "https://acleddata.com/expert-comment/strait-hormuz-becoming-safer-oil-flows-recover",
    primaryArea: "iran-gulf",
    mapAreas: ["iran-gulf"],
    point: [26.57, 56.25],
    zoom: 6,
    locationLabel: "Strait of Hormuz"
  },
  {
    id: "acled-me-daily-strikes",
    title: "ACLED: Daily strike data across the Middle East",
    region: "Iran / Gulf",
    groups: ["Iran / Gulf"],
    signals: ["Conflict Events", "Strike Pattern", "Civilian Harm", "Daily"],
    priority: true,
    freshness: "Updated daily",
    freshnessRank: 5,
    sourceDate: "Rolling daily brief",
    cadence: "Daily updates",
    access: "Open page; event file needs an eligible account",
    description:
      "ACLED's public daily brief of strike events across the Middle East, including US and Israeli strikes on Iran and Iranian and Houthi attacks around the Gulf.",
    why:
      "This is the public page ACLED is updating with daily strike briefs for Iran and the wider region. When checked on 23 October 2026, the newest items were dated 21 October.",
    limits:
      "This is conflict-event reporting, not structural or environmental damage mapping. The downloadable daily event file is limited to eligible ACLED accounts.",
    link: "https://acleddata.com/current-crises/daily-data-strikes-across-middle-east",
    extraLabel: "Access FAQ",
    extraLink: "https://acleddata.com/myacled-faqs",
    primaryArea: "iran-gulf",
    mapAreas: ["iran-gulf"],
    point: [30.4, 52.2],
    zoom: 5,
    locationLabel: "Middle East strike theatre"
  },
  {
    id: "world-bank-flaring",
    title: "World Bank global gas flaring tracker",
    region: "Global",
    groups: ["Global", "Iran / Gulf"],
    signals: ["Gas Flaring", "Emissions", "Oil"],
    priority: false,
    freshness: "July 2025 release",
    freshnessRank: 3,
    sourceDate: "July 2025, covering 2024",
    cadence: "Annual",
    access: "Open",
    description:
      "Satellite-derived global flaring estimates from the World Bank, NOAA, and Colorado School of Mines.",
    why:
      "This is the strongest public global baseline for routine oil-and-gas burning, and Iran is listed among the top flaring countries in 2024.",
    limits:
      "It is annual rather than live, so it gives structural context, not same-week war-time flare spikes.",
    link: "https://www.worldbank.org/en/programs/gasflaringreduction/global-flaring-data",
    primaryArea: "global-hub",
    mapAreas: ["global-hub", "iran-gulf"],
    point: [18.0, -28.0],
    zoom: 2,
    locationLabel: "Worldwide flaring baseline"
  },
  {
    id: "emit-catalog",
    title: "NASA EMIT methane plume dataset",
    region: "Global",
    groups: ["Global"],
    signals: ["Methane", "Satellite", "Oil"],
    priority: false,
    freshness: "2022-present",
    freshnessRank: 4,
    sourceDate: "2022-08-09 to present",
    cadence: "Typically 1-7 days to portal availability",
    access: "Open",
    description:
      "NASA's EMIT mission publishes methane plume complexes and metadata for point-source emissions across global land areas.",
    why:
      "Useful when you want plume-level oil-and-gas leakage evidence rather than only flare heat.",
    limits:
      "Coverage depends on orbital passes and manual plume review, so it is not an everywhere, every-day watch layer.",
    link: "https://www.earthdata.nasa.gov/data/catalog/lpcloud-emitl2bch4plm-001",
    extraLabel: "Open Data Portal",
    extraLink: "https://earth.jpl.nasa.gov/emit/data/data-portal/coverage-and-forecasts/",
    primaryArea: "global-hub",
    mapAreas: ["global-hub"],
    point: [18.0, -28.0],
    zoom: 2,
    locationLabel: "Worldwide methane plume coverage"
  },
  {
    id: "epa-methane",
    title: "US EPA methane super-emitter explorer",
    region: "United States",
    groups: ["United States"],
    signals: ["Methane", "Regulatory", "Oil"],
    priority: false,
    freshness: "Program page updated 2025",
    freshnessRank: 2,
    sourceDate: "July 31, 2025 rule note",
    cadence: "Programmatic updates",
    access: "Open",
    description:
      "EPA's map-based explorer of reported methane super-emitter events and operator responses in the United States.",
    why:
      "Helpful if you want the app to cover domestic oil-and-gas damage signals as well, not just overseas war zones.",
    limits:
      "US only, and it tracks reported super-emitter events rather than war-related infrastructure damage.",
    link: "https://echo.epa.gov/trends/methane-super-emitter-program/data-explorer",
    primaryArea: "united-states",
    mapAreas: ["united-states"],
    point: [31.8, -102.3],
    zoom: 6,
    locationLabel: "Permian Basin"
  },
  {
    id: "ceobs-ukraine",
    title: "CEOBS Ukraine environmental harm map",
    region: "Ukraine",
    groups: ["Ukraine"],
    signals: ["Environmental Risk", "Water", "Industry", "Military"],
    priority: false,
    freshness: "Delayed for safety",
    freshnessRank: 2,
    sourceDate: "Map published June 2024; cutoff end of September 2023",
    cadence: "Curated case studies",
    access: "Open",
    description:
      "An interactive case-study map of 25 environmentally relevant incidents assessed from Ukraine.",
    why:
      "It shows the kind of second-order war damage that raw strike maps often miss: water, waste, industry, and wider ecosystem risk.",
    limits:
      "CEOBS deliberately publishes with delay for operational security, so it is not a live war feed.",
    link: "https://ceobs.org/ukraine-map/",
    primaryArea: "ukraine",
    mapAreas: ["ukraine"],
    point: [48.9, 31.4],
    zoom: 5,
    locationLabel: "Ukraine"
  },
  {
    id: "airwars-gaza",
    title: "Airwars Gaza civilian harm map",
    region: "Gaza",
    groups: ["Gaza"],
    signals: ["Civilian Harm", "Casualties", "Conflict Events"],
    priority: false,
    freshness: "Live map, backlog noted",
    freshnessRank: 3,
    sourceDate: "Map launched June 10, 2024; backlog note updated June 2025",
    cadence: "Updated as assessments publish",
    access: "Open",
    description:
      "A public map of published Airwars assessments of civilian harm incidents in Gaza since October 2023.",
    why:
      "Useful when you want a human harm layer to sit next to structural or environmental damage layers.",
    limits:
      "Airwars says the map does not represent all incidents and that a large backlog still exists.",
    link: "https://airwars.org/israel-and-gaza-2023-25-casualty-map/",
    primaryArea: "gaza",
    mapAreas: ["gaza"],
    point: [31.43, 34.38],
    zoom: 10,
    locationLabel: "Gaza"
  },
  {
    id: "unosat-gaza-city",
    title: "UNOSAT Gaza City damage assessment",
    region: "Gaza",
    groups: ["Gaza"],
    signals: ["Satellite Damage", "Buildings", "Displacement"],
    priority: false,
    freshness: "October 2025 publication",
    freshnessRank: 3,
    sourceDate: "Imagery from September 22-23, 2025; published October 7, 2025",
    cadence: "Periodic satellite assessment",
    access: "Open PDF",
    description:
      "UNOSAT's Gaza City assessment reported roughly 83% of structures damaged as of late September 2025, with structure-level categories.",
    why:
      "This is a strong example of slower but more rigorous structural damage mapping from high-resolution satellite imagery.",
    limits:
      "It is a PDF snapshot for one area and date range, not a rolling live monitor.",
    link: "https://unosat.org/static/unosat_filesystem/4205/OCHA-OPT-030_UNOSAT_A3_Gaza_Governorate_CDA_22-23September2025_V2.pdf",
    primaryArea: "gaza",
    mapAreas: ["gaza"],
    point: [31.43, 34.38],
    zoom: 10,
    locationLabel: "Gaza City"
  },
  {
    id: "ceobs-sudan",
    title: "CEOBS on Sudan's war-related environmental damage",
    region: "Sudan",
    groups: ["Sudan"],
    signals: ["Environmental Risk", "Oil Fires", "Infrastructure"],
    priority: false,
    freshness: "May 21, 2025",
    freshnessRank: 3,
    sourceDate: "May 21, 2025",
    cadence: "Periodic overview",
    access: "Open",
    description:
      "A broad CEOBS overview covering pollution from damaged industrial and energy infrastructure, de-energisation, and sanitation impacts in Sudan.",
    why:
      "It keeps the page global and ties war damage back to oil and industrial burning instead of only troop movements.",
    limits:
      "This is a thematic overview rather than a single unified live map with up-to-the-minute markers.",
    link: "https://ceobs.org/the-environmental-costs-of-the-war-in-sudan/",
    primaryArea: "sudan",
    mapAreas: ["sudan"],
    point: [15.6, 32.5],
    zoom: 6,
    locationLabel: "Khartoum and wider Sudan"
  }
];

const preferredSignalOrder = [
  "Thermal",
  "Unconfirmed",
  "Oil Fires",
  "Oil",
  "Shipping",
  "Methane",
  "Gas Flaring",
  "Satellite",
  "Satellite Damage",
  "Conflict Events",
  "Strike Pattern",
  "Civilian Harm",
  "Environmental Risk",
  "Water",
  "Air"
];

const allSignals = [...new Set(sources.flatMap((source) => source.signals))];
const signalOrder = [
  "All",
  ...preferredSignalOrder.filter((signal) => allSignals.includes(signal)),
  ...allSignals
    .filter((signal) => !preferredSignalOrder.includes(signal))
    .sort((a, b) => a.localeCompare(b))
];

const regionOrder = [
  "All",
  "Iran / Gulf",
  "Global",
  "Gaza",
  "Ukraine",
  "Sudan",
  "United States"
];

const LIVE_PAGE_SIZE = 12;

const state = {
  region: "All",
  signal: "All",
  query: "",
  activeAreaId: "iran-gulf",
  activeSourceId: null,
  liveShown: LIVE_PAGE_SIZE
};

const runtime = {
  map: null,
  areaLayers: new Map(),
  sourceLayer: null,
  liveLayer: null,
  reportLayer: null,
  liveEvents: [],
  liveStats: null,
  liveWindowHours: LIVE_WINDOW_HOURS,
  linkHealth: new Map(),
  generatedAt: null,
  liveStatus: "loading",
  hasInitialFit: false,
  pendingLivePopupId: null
};

const els = {
  priorityGrid: document.querySelector("#priority-grid"),
  sourceGrid: document.querySelector("#source-grid-inner"),
  liveSummary: document.querySelector("#live-summary"),
  liveEventsList: document.querySelector("#live-events-list"),
  resultsSummary: document.querySelector("#results-summary"),
  regionFilters: document.querySelector("#region-filters"),
  signalFilters: document.querySelector("#signal-filters"),
  searchInput: document.querySelector("#search-input"),
  template: document.querySelector("#source-card-template"),
  freshCount: document.querySelector("#fresh-count"),
  realtimeCount: document.querySelector("#realtime-count"),
  openCount: document.querySelector("#open-count"),
  lastRefreshValue: document.querySelector("#last-refresh-value"),
  mapRoot: document.querySelector("#map"),
  mapStatus: document.querySelector("#map-status"),
  mapPanelTitle: document.querySelector("#map-panel-title"),
  mapPanelCopy: document.querySelector("#map-panel-copy"),
  mapPanelMeta: document.querySelector("#map-panel-meta"),
  mapPanelList: document.querySelector("#map-panel-list"),
  fitVisibleButton: document.querySelector("#fit-visible-button"),
  resetViewButton: document.querySelector("#reset-view-button"),
  mapBoard: document.querySelector("#map-board"),
  viewGridBtn: document.querySelector("#view-grid"),
  viewListBtn: document.querySelector("#view-list")
};

function normalize(text) {
  return String(text).toLowerCase().trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function describeLinkHealth(result) {
  if (!result) {
    return { kind: "unknown", text: "Link not checked yet" };
  }
  if (result.ok) {
    return { kind: "ok", text: "Link checked" };
  }
  if (result.inconclusive || result.status === 403) {
    return { kind: "inconclusive", text: "Link check blocked" };
  }
  return { kind: "fail", text: "Link check failed" };
}

function currentMapBounds() {
  if (!runtime.map) return null;
  const bounds = runtime.map.getBounds();
  return {
    south: bounds.getSouth(),
    west: bounds.getWest(),
    north: bounds.getNorth(),
    east: bounds.getEast()
  };
}

function bindAccessiblePopup(marker, html) {
  marker.bindPopup(html, { autoPan: true, maxWidth: 280 });
  marker.on("popupopen", (event) => {
    const popup = event.popup.getElement();
    if (!popup) return;
    const label = popup.querySelector("strong")?.textContent || "Map detail";
    popup.setAttribute("role", "dialog");
    popup.setAttribute("aria-label", label);
    const focusTarget = popup.querySelector("a, button");
    if (focusTarget) {
      focusTarget.focus();
      return;
    }
    popup.tabIndex = -1;
    popup.focus();
  });
  marker.on("popupclose", () => {
    const host = marker.getElement?.();
    if (host && document.contains(host)) host.focus();
  });
}

function eventPopupHtml(event) {
  const view = presentEvent(event);
  const href = event.link || (event.type === "thermal" ? "https://firms.modaps.eosdis.nasa.gov/map/" : "");
  return `<div class="map-popup"><strong>${escapeHtml(view.title)}</strong><p>${escapeHtml(view.locationNote)}</p><p>${escapeHtml(event.region || "Global")} · ${escapeHtml(formatEventTime(event.eventTime))}</p><p>${escapeHtml(view.summary || "")}</p>${
    href
      ? `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">Open source</a>`
      : ""
  }</div>`;
}

function labelMarker(marker, label) {
  const element = marker.getElement?.();
  if (!element) return;
  element.setAttribute("role", "button");
  element.setAttribute("aria-label", label);
}

function buildPills(container, values, activeValue, onClick) {
  const previous = document.activeElement;
  const restoreLabel =
    previous && container.contains(previous) ? previous.textContent : null;
  container.innerHTML = "";
  values.forEach((value) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-pill";
    button.textContent = value;
    const pressed = value === activeValue;
    button.setAttribute("aria-pressed", pressed ? "true" : "false");
    if (pressed) {
      button.classList.add("is-active");
    }
    button.addEventListener("click", () => onClick(value));
    container.appendChild(button);
  });
  if (restoreLabel) {
    const match = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === restoreLabel
    );
    match?.focus();
  }
}

function sortSources(list) {
  return [...list].sort((a, b) => {
    if (Number(b.priority) !== Number(a.priority)) {
      return Number(b.priority) - Number(a.priority);
    }
    if (b.freshnessRank !== a.freshnessRank) {
      return b.freshnessRank - a.freshnessRank;
    }
    return a.title.localeCompare(b.title);
  });
}

function sourceMatches(source) {
  const regionMatch =
    state.region === "All" ||
    source.region === state.region ||
    source.groups.includes(state.region);

  const signalMatch =
    state.signal === "All" || source.signals.includes(state.signal);

  const haystack = normalize(
    [
      source.title,
      source.region,
      source.locationLabel,
      source.description,
      source.why,
      source.limits,
      source.signals.join(" "),
      source.groups.join(" ")
    ].join(" ")
  );

  const queryMatch = !state.query || haystack.includes(normalize(state.query));

  return regionMatch && signalMatch && queryMatch;
}

function getVisibleSources() {
  return sortSources(sources.filter(sourceMatches));
}

function liveEventMatches(event) {
  const groups = Array.isArray(event.groups) ? event.groups : [];
  const signals = Array.isArray(event.signals) ? event.signals : [];
  const regionMatch =
    state.region === "All" ||
    event.region === state.region ||
    groups.includes(state.region);

  const signalMatch = state.signal === "All" || signals.includes(state.signal);

  const haystack = normalize(
    [
      event.title,
      event.summary,
      event.region,
      event.sourceName,
      groups.join(" "),
      signals.join(" ")
    ].join(" ")
  );
  const queryMatch = !state.query || haystack.includes(normalize(state.query));
  return regionMatch && signalMatch && queryMatch;
}

function getVisibleLiveEvents() {
  const list = runtime.liveEvents.filter(liveEventMatches);
  return list.sort((a, b) => new Date(b.eventTime) - new Date(a.eventTime));
}

function getLiveIngestTotal() {
  const totalFromStats = Number(runtime.liveStats?.totalEvents);
  if (Number.isFinite(totalFromStats) && totalFromStats >= 0) {
    return totalFromStats;
  }
  return runtime.liveEvents.length;
}

function computeAreaStats(visibleSources, visibleLiveEvents = []) {
  const stats = new Map();
  const ensureStat = (areaId) => {
    if (!stats.has(areaId)) {
      stats.set(areaId, {
        areaId,
        count: 0,
        sourceCount: 0,
        liveCount: 0,
        priorityCount: 0,
        sources: [],
        liveEvents: [],
        freshest: null,
        freshestLive: null
      });
    }
    return stats.get(areaId);
  };

  visibleSources.forEach((source) => {
    source.mapAreas.forEach((areaId) => {
      const stat = ensureStat(areaId);
      stat.count += 1;
      stat.sourceCount += 1;
      stat.priorityCount += Number(source.priority);
      stat.sources.push(source);
    });
  });

  visibleLiveEvents.forEach((event) => {
    const areaId = areasById.has(event.areaId) ? event.areaId : "global-hub";
    const stat = ensureStat(areaId);
    stat.count += 1;
    stat.liveCount += 1;
    stat.liveEvents.push(event);
  });

  stats.forEach((stat) => {
    stat.sources = sortSources(stat.sources);
    stat.liveEvents = [...stat.liveEvents].sort(
      (a, b) => new Date(b.eventTime) - new Date(a.eventTime)
    );
    stat.freshest = stat.sources[0] || null;
    stat.freshestLive = stat.liveEvents[0] || null;
  });

  return stats;
}

function getDefaultAreaId(areaStats) {
  if (areaStats.has("iran-gulf")) {
    return "iran-gulf";
  }
  const first = areaStats.keys().next();
  return first.done ? null : first.value;
}

function ensureValidSelection(visibleSources, areaStats) {
  const activeSourceVisible = visibleSources.some(
    (source) => source.id === state.activeSourceId
  );

  if (!activeSourceVisible) {
    state.activeSourceId = null;
  }

  if (state.activeSourceId) {
    const source = visibleSources.find((entry) => entry.id === state.activeSourceId);
    state.activeAreaId = source ? source.primaryArea : getDefaultAreaId(areaStats);
    return;
  }

  if (!state.activeAreaId || !areaStats.has(state.activeAreaId)) {
    state.activeAreaId = getDefaultAreaId(areaStats);
  }
}

function createTag(label) {
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = label;
  return tag;
}

function scrollMapIntoView() {
  els.mapBoard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function focusArea(areaId, options = {}) {
  state.activeAreaId = areaId;
  state.activeSourceId = null;
  renderAll();

  if (options.fit !== false) {
    fitArea(areaId);
  }

  if (options.scroll) {
    scrollMapIntoView();
  }
}

function focusSource(sourceId, options = {}) {
  const source = sources.find((entry) => entry.id === sourceId);
  if (!source) {
    return;
  }

  state.activeSourceId = sourceId;
  state.activeAreaId = source.primaryArea;
  renderAll();

  if (options.fit !== false) {
    fitSource(sourceId);
  }

  if (options.scroll) {
    scrollMapIntoView();
  }
}

function resetView() {
  state.activeSourceId = null;
  state.activeAreaId = "iran-gulf";
  renderAll();
  fitArea("iran-gulf");
}

function buildMetaChip(text) {
  const chip = document.createElement("span");
  chip.className = "map-meta-chip";
  chip.textContent = text;
  return chip;
}

function buildMapListButton(source, active = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "map-list-button";
  if (active) {
    button.classList.add("is-active");
  }

  const title = document.createElement("strong");
  title.textContent = source.title;

  const detail = document.createElement("span");
  detail.textContent = `${source.freshness} - ${source.locationLabel}`;

  button.append(title, detail);
  button.addEventListener("click", () => {
    focusSource(source.id, { fit: true, scroll: false });
  });

  return button;
}

function buildMapLinkButton(label, href, detail) {
  const link = document.createElement("a");
  link.className = "map-link-button";
  link.href = href;
  link.target = "_blank";
  link.rel = "noreferrer";

  const title = document.createElement("strong");
  title.textContent = label;

  const meta = document.createElement("span");
  meta.textContent = detail;

  link.append(title, meta);
  return link;
}

function renderMapPanel(visibleSources, areaStats) {
  els.mapPanelMeta.innerHTML = "";
  els.mapPanelList.innerHTML = "";

  if (!visibleSources.length) {
    els.mapPanelTitle.textContent = "No matching layers";
    els.mapPanelCopy.textContent =
      "Try clearing the region, signal, or search filters to bring sources back onto the map.";
    return;
  }

  const activeSource = visibleSources.find((source) => source.id === state.activeSourceId);

  if (activeSource) {
    els.mapPanelTitle.textContent = activeSource.title;
    els.mapPanelCopy.textContent =
      `${activeSource.locationLabel}. ${activeSource.description}`;

    [
      activeSource.region,
      activeSource.freshness,
      `${activeSource.signals.length} signal${activeSource.signals.length === 1 ? "" : "s"}`
    ].forEach((item) => {
      els.mapPanelMeta.appendChild(buildMetaChip(item));
    });

    const sourceLink = buildMapLinkButton(
      "Open source",
      activeSource.link,
      activeSource.sourceDate
    );
    els.mapPanelList.appendChild(sourceLink);

    if (activeSource.extraLink) {
      els.mapPanelList.appendChild(
        buildMapLinkButton(
          activeSource.extraLabel || "Companion link",
          activeSource.extraLink,
          "Related map or documentation"
        )
      );
    }

    const heading = document.createElement("p");
    heading.className = "map-list-heading";
    heading.textContent = "Nearby layers";
    els.mapPanelList.appendChild(heading);

    const siblingStat = areaStats.get(activeSource.primaryArea);
    const siblingSources = siblingStat
      ? siblingStat.sources.filter((source) => source.id !== activeSource.id)
      : [];

    if (!siblingSources.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No other visible layers in this zone right now.";
      els.mapPanelList.appendChild(empty);
      return;
    }

    siblingSources.forEach((source) => {
      els.mapPanelList.appendChild(buildMapListButton(source));
    });
    return;
  }

  const activeAreaId = state.activeAreaId || getDefaultAreaId(areaStats);
  const area = activeAreaId ? areasById.get(activeAreaId) : null;
  const stat = activeAreaId ? areaStats.get(activeAreaId) : null;

  if (!area || !stat) {
    els.mapPanelTitle.textContent = "Map focus unavailable";
    els.mapPanelCopy.textContent = "Visible layers exist, but no hotspot is currently selected.";
    return;
  }

  els.mapPanelTitle.textContent = area.name;
  els.mapPanelCopy.textContent = area.summary;

  const datedLabel = stat.freshest
    ? `Freshest source: ${stat.freshest.freshness}`
    : stat.freshestLive
      ? `Latest live: ${formatEventTime(stat.freshestLive.eventTime)}`
      : "No dated item";

  [
    `${stat.sourceCount} source${stat.sourceCount === 1 ? "" : "s"}, ${stat.liveCount} live`,
    `${stat.priorityCount} priority`,
    datedLabel
  ].forEach((item) => {
    els.mapPanelMeta.appendChild(buildMetaChip(item));
  });

  const heading = document.createElement("p");
  heading.className = "map-list-heading";
  heading.textContent = "Sources in this zone";
  els.mapPanelList.appendChild(heading);

  if (!stat.sources.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent =
      "No source cards in this zone right now. Live events still appear as map markers.";
    els.mapPanelList.appendChild(empty);
    return;
  }

  stat.sources.forEach((source) => {
    els.mapPanelList.appendChild(buildMapListButton(source));
  });
}

function formatEventTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function liveTypeLabel(type) {
  if (type === "thermal") return "Heat";
  if (type === "conflict") return "Conflict";
  return "Analysis";
}

function showLiveEventOnMap(eventId) {
  const event = runtime.liveEvents.find((entry) => entry.id === eventId);
  if (!event || !runtime.map) {
    return;
  }

  runtime.pendingLivePopupId = eventId;
  runtime.holdPopup = true;
  state.activeSourceId = null;
  state.activeAreaId = event.areaId || "iran-gulf";
  const zoom = Math.max(6, runtime.map.getZoom() || 6);
  runtime.map.setView([event.lat, event.lon], zoom, { animate: false });
  renderAll();
  scrollMapIntoView();
  setTimeout(() => {
    runtime.holdPopup = false;
  }, 120);
}

function renderLiveEvents(visibleLiveEvents) {
  if (!els.liveSummary || !els.liveEventsList) {
    return;
  }

  const reports = visibleLiveEvents.filter((event) => event.type !== "thermal");
  const heat = visibleLiveEvents.filter((event) => event.type === "thermal");
  const ordered = [...reports, ...heat];
  const visibleCount = ordered.length;
  const windowDays = Math.round((runtime.liveWindowHours || LIVE_WINDOW_HOURS) / 24);
  if (runtime.liveStatus === "loading") {
    els.liveSummary.textContent = "Loading live reports and satellite heat…";
  } else if (runtime.liveStatus === "error") {
    els.liveSummary.textContent =
      "Live reports could not be loaded. The source cards below still work.";
  } else if (!getLiveIngestTotal()) {
    els.liveSummary.textContent = "No live reports have been ingested yet.";
  } else {
    const reportLabel = reports.length === 1 ? "report" : "reports";
    const heatLabel = heat.length === 1 ? "heat detection" : "heat detections";
    els.liveSummary.textContent = `${reports.length} ${reportLabel} and ${heat.length} unconfirmed ${heatLabel} match these filters. Reports are kept for ${windowDays} days. Heat is the latest FIRMS 24-hour file, and the map draws only the current view.`;
  }

  els.liveEventsList.innerHTML = "";

  if (runtime.liveStatus === "loading") {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Loading the latest public reports…";
    els.liveEventsList.appendChild(empty);
    return;
  }

  if (runtime.liveStatus === "error" || !getLiveIngestTotal()) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent =
      "Nothing is in the live file yet. Source cards are still available below.";
    els.liveEventsList.appendChild(empty);
    return;
  }

  if (!visibleCount) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No live reports or heat detections match these filters.";
    els.liveEventsList.appendChild(empty);
    return;
  }

  const page = ordered.slice(0, state.liveShown);
  const remaining = visibleCount - page.length;

  page.forEach((event) => {
    const view = presentEvent(event);
    const card = document.createElement("article");
    card.className = "live-event-card";

    const topline = document.createElement("div");
    topline.className = "live-event-topline";

    const type = document.createElement("span");
    type.className = `live-event-type is-${event.type || "analysis"}`;
    type.textContent = liveTypeLabel(event.type);
    topline.appendChild(type);

    const time = document.createElement("span");
    time.className = "live-event-time";
    time.textContent = formatEventTime(event.eventTime);
    topline.appendChild(time);

    const title = document.createElement("h3");
    title.className = "live-event-title";
    title.textContent = view.title;

    const summary = document.createElement("p");
    summary.className = "live-event-summary";
    summary.textContent = view.summary || "No summary provided.";

    const source = document.createElement("p");
    source.className = "live-event-source";
    source.textContent = `${event.region || "Global"} · ${view.sourceName}`;

    const note = document.createElement("p");
    note.className = "live-event-note";
    note.textContent = view.locationNote;

    const actions = document.createElement("div");
    actions.className = "live-event-actions";

    const mapButton = document.createElement("button");
    mapButton.type = "button";
    mapButton.className = "button button-ghost";
    mapButton.textContent = "Show On Map";
    mapButton.addEventListener("click", () => {
      showLiveEventOnMap(event.id);
    });
    actions.appendChild(mapButton);

    if (event.link || event.type === "thermal") {
      const link = document.createElement("a");
      link.className = "button button-primary";
      link.target = "_blank";
      link.rel = "noreferrer";
      link.href = event.link || "https://firms.modaps.eosdis.nasa.gov/map/";
      link.textContent = "Open Event";
      actions.appendChild(link);
    }

    card.append(topline, title, summary, source, note, actions);
    els.liveEventsList.appendChild(card);
  });

  if (remaining > 0) {
    const loadMore = document.createElement("button");
    loadMore.type = "button";
    loadMore.className = "button button-ghost live-load-more";
    loadMore.textContent = `Load more (${remaining.toLocaleString()} remaining)`;
    loadMore.addEventListener("click", () => {
      state.liveShown += LIVE_PAGE_SIZE;
      renderAll();
    });
    els.liveEventsList.appendChild(loadMore);
  }
}

function renderCard(source, priority = false) {
  const fragment = els.template.content.cloneNode(true);
  const card = fragment.querySelector(".source-card");

  if (priority) {
    card.classList.add("is-priority");
  }

  if (state.activeSourceId === source.id) {
    card.classList.add("is-active");
  }

  fragment.querySelector(".source-region").textContent = source.region;
  fragment.querySelector(".source-freshness").textContent = source.freshness;
  fragment.querySelector(".source-title").textContent = source.title;
  fragment.querySelector(".source-description").textContent = source.description;
  fragment.querySelector(".meta-date").textContent = source.sourceDate;
  fragment.querySelector(".meta-cadence").textContent = source.cadence;
  fragment.querySelector(".meta-access").textContent = source.access;
  fragment.querySelector(".source-why").textContent = source.why;
  fragment.querySelector(".source-limits").textContent = source.limits;
  const health = fragment.querySelector(".source-health");
  const healthView = describeLinkHealth(runtime.linkHealth.get(source.id));
  health.textContent = healthView.text;
  health.className = `source-health is-${healthView.kind}`;

  const tagRow = fragment.querySelector(".tag-row");
  source.signals.forEach((signal) => {
    tagRow.appendChild(createTag(signal));
  });

  const mapButton = fragment.querySelector(".source-map-button");
  mapButton.addEventListener("click", () => {
    focusSource(source.id, { fit: true, scroll: true });
  });

  const link = fragment.querySelector(".source-link");
  link.href = source.link;

  if (source.extraLink) {
    const extraLink = fragment.querySelector(".source-extra-link");
    extraLink.hidden = false;
    extraLink.href = source.extraLink;
    extraLink.textContent = source.extraLabel || "More";
  }

  return fragment;
}

function renderPriority() {
  const prioritySources = sortSources(sources.filter((source) => source.priority));
  els.priorityGrid.innerHTML = "";
  prioritySources.forEach((source) => {
    els.priorityGrid.appendChild(renderCard(source, true));
  });
}

function renderSources(visibleSources) {
  els.sourceGrid.innerHTML = "";

  if (!visibleSources.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent =
      "No sources match this filter set yet. Try clearing region, signal, or search.";
    els.sourceGrid.appendChild(empty);
  } else {
    visibleSources.forEach((source) => {
      els.sourceGrid.appendChild(renderCard(source));
    });
  }

  const activeLabel = state.activeSourceId
    ? visibleSources.find((source) => source.id === state.activeSourceId)?.title
    : areasById.get(state.activeAreaId || "")?.name;

  const focusSuffix = activeLabel ? ` Map focus: ${activeLabel}.` : "";
  els.resultsSummary.textContent =
    visibleSources.length === 1
      ? `1 source visible.${focusSuffix}`
      : `${visibleSources.length} sources visible.${focusSuffix}`;
}

function renderStats() {
  const freshIran = sources.filter(
    (source) => source.priority && source.primaryArea === "iran-gulf"
  ).length;

  const sourceNearRealtime = sources.filter(
    (source) =>
      source.cadence.includes("Within") ||
      source.cadence.includes("1-7 days") ||
      source.cadence.toLowerCase().includes("daily")
  ).length;

  const nearRealtime = getLiveIngestTotal() || sourceNearRealtime;

  const open = sources.filter(
    (source) => !source.access.toLowerCase().includes("paid")
  ).length;

  els.freshCount.textContent = String(freshIran);
  els.realtimeCount.textContent = String(nearRealtime);
  els.openCount.textContent = String(open);
}

function renderFilters() {
  buildPills(els.regionFilters, regionOrder, state.region, (value) => {
    state.region = value;
    state.liveShown = LIVE_PAGE_SIZE;
    renderAll();
  });

  buildPills(els.signalFilters, signalOrder, state.signal, (value) => {
    state.signal = value;
    state.liveShown = LIVE_PAGE_SIZE;
    renderAll();
  });
}

function createAreaIcon(area, stat, active) {
  const isHot = stat.priorityCount > 0;
  const html = `
    <div class="damage-area-marker ${isHot ? "is-hot" : ""} ${active ? "is-active" : ""}">
      <span class="damage-area-count">${stat.count}</span>
      <span class="damage-area-label">${area.shortLabel}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: "",
    iconSize: [84, 84],
    iconAnchor: [42, 42]
  });
}

function getAreaStyle(stat, active) {
  const hot = stat.priorityCount > 0;
  return {
    color: hot ? "#8d3210" : "#1b6e65",
    weight: active ? 2.4 : 1.6,
    opacity: active ? 0.92 : 0.7,
    fillColor: hot ? "#b84b1f" : "#1b6e65",
    fillOpacity: active ? 0.12 : 0.08
  };
}

function renderLiveLayer(visibleLiveEvents) {
  if (!runtime.map) return;

  if (!runtime.liveLayer) {
    runtime.liveLayer = L.layerGroup().addTo(runtime.map);
  }
  if (!runtime.reportLayer) {
    runtime.reportLayer = L.layerGroup().addTo(runtime.map);
  }
  runtime.liveLayer.clearLayers();
  runtime.reportLayer.clearLayers();

  const canvas = runtime.thermalCanvas || L.canvas({ padding: 0.2 });
  runtime.thermalCanvas = canvas;
  const reports = visibleLiveEvents.filter((event) => event.type !== "thermal");
  const selection = selectThermalForView(visibleLiveEvents, {
    zoom: runtime.map.getZoom(),
    bounds: currentMapBounds(),
    pinId: runtime.pendingLivePopupId
  });

  reports.forEach((event) => {
    const view = presentEvent(event);
    const marker = L.marker([event.lat, event.lon], {
      keyboard: true,
      title: `${view.title}. ${view.locationNote}`,
      icon: L.divIcon({
        className: "report-marker",
        html: `<span class="report-marker-dot is-${event.type || "analysis"}"></span>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      })
    });
    bindAccessiblePopup(marker, eventPopupHtml(event));
    marker.on("add", () => labelMarker(marker, `${view.title}. ${view.locationNote}`));
    marker.addTo(runtime.reportLayer);
    if (runtime.pendingLivePopupId === event.id) {
      marker.openPopup();
      runtime.pendingLivePopupId = null;
    }
  });

  if (selection.mode === "clusters") {
    selection.shown.forEach((cluster) => {
      const radius = Math.max(8, Math.min(22, 6 + Math.sqrt(cluster.count)));
      const marker = L.circleMarker([cluster.lat, cluster.lon], {
        renderer: canvas,
        radius,
        color: "#fff7f3",
        weight: 1.2,
        fillColor: "#b84b1f",
        fillOpacity: 0.72
      });
      const label = `${cluster.count} unconfirmed heat detections in this area. Zoom in for individual sensor points.`;
      marker.bindTooltip(label, { direction: "top" });
      marker.on("click", () => {
        runtime.map.setView([cluster.lat, cluster.lon], Math.min((runtime.map.getZoom() || 2) + 2, 8));
      });
      marker.addTo(runtime.liveLayer);
    });
  } else {
    selection.shown.forEach((event) => {
      const marker = L.circleMarker([event.lat, event.lon], {
        renderer: canvas,
        radius: event.severity === "high" ? 6 : 4.5,
        color: "#fff7f3",
        weight: 1,
        fillColor: event.severity === "high" ? "#8d3210" : "#d2753e",
        fillOpacity: 0.88
      });
      bindAccessiblePopup(marker, eventPopupHtml(event));
      marker.addTo(runtime.liveLayer);
      if (runtime.pendingLivePopupId === event.id) {
        marker.openPopup();
        runtime.pendingLivePopupId = null;
      }
    });
  }

  if (els.mapRoot) {
    els.mapRoot.dataset.thermalMode = selection.mode;
    els.mapRoot.dataset.thermalShown = String(selection.shown.length);
    els.mapRoot.dataset.thermalInView = String(selection.totalInView);
  }
  updateMapStatus(selection, reports.length);
}

function updateMapStatus(selection, reportCount) {
  if (!els.mapStatus) return;
  if (runtime.liveStatus === "loading") {
    els.mapStatus.textContent = "Loading satellite heat and recent reports…";
    return;
  }
  if (runtime.liveStatus === "error") {
    els.mapStatus.textContent = "The live file did not load. Zone markers still show the source catalogue.";
    return;
  }
  const refreshed = runtime.generatedAt ? formatEventTime(runtime.generatedAt) : "the latest refresh";
  const heatSentence =
    selection.mode === "clusters"
      ? `${selection.totalInView.toLocaleString()} unconfirmed heat detections are in view, grouped into ${selection.shown.length.toLocaleString()} cells${selection.capped ? " (busiest cells only)" : ""}. Zoom in to separate them.`
      : `Showing ${selection.shown.length.toLocaleString()} of ${selection.totalInView.toLocaleString()} unconfirmed heat points in view${selection.capped ? ", strongest first" : ""}.`;
  els.mapStatus.textContent = `${heatSentence} ${reportCount.toLocaleString()} report${reportCount === 1 ? "" : "s"} use approximate locations. Satellite file from ${refreshed}.`;
}

function setupMap() {
  if (runtime.map || !L) {
    return;
  }

  runtime.map = L.map(els.mapRoot, {
    zoomControl: false,
    minZoom: 2,
    maxZoom: 10,
    worldCopyJump: true
  }).setView([24, 18], 2);

  L.control.zoom({ position: "topright" }).addTo(runtime.map);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(runtime.map);

  areas.forEach((area) => {
    const layer = {};

    if (area.bounds) {
      layer.bounds = L.rectangle(area.bounds, {
        color: "#1b6e65",
        weight: 1.4,
        opacity: 0.6,
        fillColor: "#1b6e65",
        fillOpacity: 0.06
      });
      layer.bounds.on("click", () => {
        focusArea(area.id, { fit: true, scroll: false });
      });
    }

    layer.marker = L.marker(area.center, {
      keyboard: true,
      icon: createAreaIcon(area, { count: 1, priorityCount: 0 }, false)
    });
    layer.marker.on("click", () => {
      focusArea(area.id, { fit: true, scroll: false });
    });
    layer.marker.on("add", () => labelMarker(layer.marker, `${area.name}. Activate to focus this zone.`));
    layer.marker.bindTooltip(area.name, {
      direction: "top",
      offset: [0, -24]
    });

    runtime.areaLayers.set(area.id, layer);
  });

  runtime.map.on("moveend", () => {
    if (runtime.holdPopup) return;
    clearTimeout(runtime.mapMoveTimer);
    runtime.mapMoveTimer = setTimeout(() => {
      renderLiveLayer(getVisibleLiveEvents());
    }, 60);
  });
}

function updateMap(visibleSources, areaStats, visibleLiveEvents) {
  if (!runtime.map) {
    return;
  }

  areas.forEach((area) => {
    const layer = runtime.areaLayers.get(area.id);
    const stat = areaStats.get(area.id);
    const active = !state.activeSourceId && state.activeAreaId === area.id;

    if (stat) {
      layer.marker.setIcon(createAreaIcon(area, stat, active));
      if (!runtime.map.hasLayer(layer.marker)) {
        layer.marker.addTo(runtime.map);
      }
      labelMarker(
        layer.marker,
        `${area.name}. ${stat.count} monitored items. Activate to focus this zone.`
      );

      if (layer.bounds) {
        layer.bounds.setStyle(getAreaStyle(stat, active));
        if (!runtime.map.hasLayer(layer.bounds)) {
          layer.bounds.addTo(runtime.map);
        }
      }
    } else {
      if (runtime.map.hasLayer(layer.marker)) {
        runtime.map.removeLayer(layer.marker);
      }
      if (layer.bounds && runtime.map.hasLayer(layer.bounds)) {
        runtime.map.removeLayer(layer.bounds);
      }
    }
  });

  if (runtime.sourceLayer && runtime.map.hasLayer(runtime.sourceLayer)) {
    runtime.map.removeLayer(runtime.sourceLayer);
  }

  const activeSource = visibleSources.find((source) => source.id === state.activeSourceId);
  if (!activeSource) {
    runtime.sourceLayer = null;
  } else {
    runtime.sourceLayer = L.circleMarker(activeSource.point, {
      radius: 9,
      color: "#fff7f3",
      weight: 2,
      fillColor: "#231612",
      fillOpacity: 0.96
    });
    bindAccessiblePopup(
      runtime.sourceLayer,
      `<strong>${escapeHtml(activeSource.title)}</strong><p>${escapeHtml(activeSource.locationLabel)}</p><p>${escapeHtml(activeSource.freshness)}</p>`
    );
    runtime.sourceLayer.addTo(runtime.map);
  }

  renderLiveLayer(visibleLiveEvents);
}

function fitVisibleAreas(
  areaStats = computeAreaStats(getVisibleSources(), getVisibleLiveEvents())
) {
  if (!runtime.map || !areaStats.size) {
    return;
  }

  const bounds = L.latLngBounds([]);
  areaStats.forEach((_, areaId) => {
    const area = areasById.get(areaId);
    if (!area) {
      return;
    }

    if (area.bounds) {
      bounds.extend(area.bounds[0]);
      bounds.extend(area.bounds[1]);
    } else {
      bounds.extend(area.center);
    }
  });

  if (bounds.isValid()) {
    runtime.map.fitBounds(bounds.pad(0.18), { maxZoom: 5 });
  }
}

function fitArea(areaId, options = {}) {
  if (!runtime.map || !areaId) {
    return;
  }

  const area = areasById.get(areaId);
  if (!area) {
    return;
  }

  const animate = options.animate !== false;

  if (area.bounds) {
    runtime.map.fitBounds(area.bounds, {
      padding: [28, 28],
      maxZoom: area.id === "gaza" ? 10 : 6,
      animate
    });
    return;
  }

  runtime.map.setView(area.center, area.zoom || 2, { animate });
}

function fitSource(sourceId) {
  if (!runtime.map) {
    return;
  }

  const source = sources.find((entry) => entry.id === sourceId);
  if (!source) {
    return;
  }

  runtime.map.setView(source.point, source.zoom || 6, { animate: true });
}

function setupSearch() {
  els.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    state.liveShown = LIVE_PAGE_SIZE;
    renderAll();
  });
}

function setupMapControls() {
  els.fitVisibleButton.addEventListener("click", () => {
    fitVisibleAreas();
  });

  els.resetViewButton.addEventListener("click", () => {
    resetView();
  });
}

function setupViewToggle() {
  if (!els.viewGridBtn || !els.viewListBtn) {
    return;
  }

  els.viewGridBtn.setAttribute("aria-pressed", "true");
  els.viewListBtn.setAttribute("aria-pressed", "false");

  els.viewGridBtn.addEventListener("click", () => {
    els.sourceGrid.classList.remove("is-list");
    els.viewGridBtn.classList.add("is-active");
    els.viewGridBtn.setAttribute("aria-pressed", "true");
    els.viewListBtn.classList.remove("is-active");
    els.viewListBtn.setAttribute("aria-pressed", "false");
  });

  els.viewListBtn.addEventListener("click", () => {
    els.sourceGrid.classList.add("is-list");
    els.viewListBtn.classList.add("is-active");
    els.viewListBtn.setAttribute("aria-pressed", "true");
    els.viewGridBtn.classList.remove("is-active");
    els.viewGridBtn.setAttribute("aria-pressed", "false");
  });
}

async function loadRefreshTimestamp() {
  if (!els.lastRefreshValue) {
    return;
  }

  const fallbackText = "Unknown";

  try {
    const response = await fetch("./data/refresh.json", { cache: "no-store" });
    if (!response.ok) {
      els.lastRefreshValue.textContent = fallbackText;
      return;
    }

    const payload = await response.json();
    if (!payload.generatedAt) {
      els.lastRefreshValue.textContent = fallbackText;
      return;
    }

    const date = new Date(payload.generatedAt);
    if (Number.isNaN(date.getTime())) {
      els.lastRefreshValue.textContent = fallbackText;
      return;
    }

    runtime.generatedAt = payload.generatedAt;
    els.lastRefreshValue.textContent = date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch (_) {
    els.lastRefreshValue.textContent = fallbackText;
  }
}

async function loadLinkHealth() {
  try {
    const response = await fetch("./data/link-health.json", { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    const results = Array.isArray(payload.results) ? payload.results : [];
    runtime.linkHealth = new Map(results.map((result) => [result.id, result]));
  } catch (_) {
  }
}

function normalizeLiveEvent(event) {
  const type = event.type || "analysis";
  const thermal = type === "thermal";
  return {
    ...event,
    type,
    lat: Number(event.lat),
    lon: Number(event.lon),
    groups: Array.isArray(event.groups) ? event.groups : [event.region || "Global"],
    signals: thermal
      ? ["Thermal", "Unconfirmed"]
      : Array.isArray(event.signals)
        ? event.signals
        : [],
    locationPrecision: event.locationPrecision || (thermal ? "sensor" : "approximate"),
    frp: event.frp == null ? null : Number(event.frp)
  };
}

async function loadLiveEvents() {
  try {
    const response = await fetch("./data/live-events.json", { cache: "no-store" });
    if (!response.ok) {
      runtime.liveStatus = "error";
      return;
    }

    const payload = await response.json();
    if (!payload || !Array.isArray(payload.events)) {
      runtime.liveStatus = "error";
      return;
    }

    runtime.liveEvents = payload.events
      .map(normalizeLiveEvent)
      .filter(
        (event) => Number.isFinite(event.lat) && Number.isFinite(event.lon) && event.eventTime
      );

    runtime.liveStats = payload.stats || null;
    runtime.liveWindowHours = Number(payload.windowHours) || LIVE_WINDOW_HOURS;
    if (!runtime.generatedAt && payload.generatedAt) {
      runtime.generatedAt = payload.generatedAt;
    }
    runtime.liveStatus = "ready";
  } catch (_) {
    runtime.liveStatus = "error";
  }
}

function setupTopBar() {
  const topBar = document.querySelector("#top-bar");
  const hero = document.querySelector(".hero");
  if (!topBar || !hero) {
    return;
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      topBar.hidden = false;
      topBar.classList.toggle("is-visible", !entry.isIntersecting);
    },
    { threshold: 0, rootMargin: "-52px 0px 0px 0px" }
  );

  observer.observe(hero);
}

function setupDarkMode() {
  const toggle = document.querySelector("#dark-toggle");
  if (!toggle) {
    return;
  }

  const saved = localStorage.getItem("scorch-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (saved === "dark" || (!saved && prefersDark)) {
    document.documentElement.setAttribute("data-theme", "dark");
  }

  const syncThemeToggle = () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    toggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    toggle.setAttribute("aria-pressed", isDark ? "true" : "false");
  };
  syncThemeToggle();

  toggle.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("scorch-theme", next);
    syncThemeToggle();
  });
}

function clearLegacyServiceWorkers() {
  window.addEventListener("load", async () => {
    if ("serviceWorker" in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map((registration) => registration.unregister())
        );
      } catch (_) {
      }
    }

    if ("caches" in window) {
      try {
        const keys = await window.caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.startsWith("damage-atlas") || key.startsWith("scorch"))
            .map((key) => window.caches.delete(key))
        );
      } catch (_) {
      }
    }
  });
}

function renderAll() {
  const visibleSources = getVisibleSources();
  const visibleLiveEvents = getVisibleLiveEvents();
  const areaStats = computeAreaStats(visibleSources, visibleLiveEvents);

  ensureValidSelection(visibleSources, areaStats);
  renderPriority();
  renderStats();
  renderFilters();
  renderSources(visibleSources);
  renderLiveEvents(visibleLiveEvents);
  renderMapPanel(visibleSources, areaStats);

  if (!runtime.hasInitialFit && runtime.map && visibleSources.length) {
    fitArea(state.activeAreaId || "iran-gulf", { animate: false });
    runtime.hasInitialFit = true;
  }

  updateMap(visibleSources, areaStats, visibleLiveEvents);
}

async function init() {
  setupDarkMode();
  setupTopBar();
  setupMap();
  setupSearch();
  setupMapControls();
  setupViewToggle();
  clearLegacyServiceWorkers();
  renderAll();
  await Promise.all([loadRefreshTimestamp(), loadLiveEvents(), loadLinkHealth()]);
  renderAll();
}

init();
