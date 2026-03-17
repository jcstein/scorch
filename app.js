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
    id: "ceobs-black-rain",
    title: "CEOBS on Tehran oil fires",
    region: "Iran / Gulf",
    groups: ["Iran / Gulf"],
    signals: ["Oil Fires", "Air", "Water", "Health"],
    priority: true,
    freshness: "March 9, 2026",
    freshnessRank: 5,
    sourceDate: "March 9, 2026",
    cadence: "Rapid conflict analysis",
    access: "Open",
    description:
      "A focused public analysis of the 7-8 March 2026 Tehran oil-facility strikes and their environmental fallout.",
    why:
      "This is one of the clearest recent public writeups connecting the Iran war directly to oil-burning damage, black smoke, and likely water contamination pathways.",
    limits:
      "It is a specialist assessment, not a live incident feed, and some claims depend on remote verification during an active war.",
    link: "https://ceobs.org/black-rain-the-health-and-environmental-risks-from-tehrans-oil-fires/",
    primaryArea: "iran-gulf",
    mapAreas: ["iran-gulf"],
    point: [35.69, 51.39],
    zoom: 8,
    locationLabel: "Tehran"
  },
  {
    id: "ceobs-epic-fury",
    title: "CEOBS environmental harm map for Iran and the region",
    region: "Iran / Gulf",
    groups: ["Iran / Gulf"],
    signals: ["Environmental Risk", "Oil Fires", "Water", "Military"],
    priority: true,
    freshness: "March 10, 2026",
    freshnessRank: 5,
    sourceDate: "March 10, 2026",
    cadence: "Rapid conflict analysis",
    access: "Open",
    description:
      "CEOBS mapped more than 300 environmentally relevant incidents across Iran, the Gulf, and nearby states during the first phase of the 2026 war.",
    why:
      "It is currently the strongest public-source bridge between conflict reporting and environmental damage reporting in the Iran theatre.",
    limits:
      "CEOBS notes these incidents still need fuller verification and peer review because of wartime information noise.",
    link: "https://ceobs.org/operation-epic-fury-emerging-environmental-harm-and-risks-in-iran-and-the-region/",
    primaryArea: "iran-gulf",
    mapAreas: ["iran-gulf"],
    point: [30.2, 52.2],
    zoom: 6,
    locationLabel: "Iran and the wider Gulf"
  },
  {
    id: "acled-iran",
    title: "ACLED Middle East special issue and Iran crisis coverage",
    region: "Iran / Gulf",
    groups: ["Iran / Gulf"],
    signals: ["Conflict Events", "Strike Pattern", "Civilian Harm"],
    priority: true,
    freshness: "March 4, 2026",
    freshnessRank: 5,
    sourceDate: "March 4, 2026",
    cadence: "Public analysis plus daily eligible-user updates",
    access: "Public analysis; fuller data needs registration or eligibility",
    description:
      "ACLED's March 2026 special issue documents strike distribution, retaliation patterns, and wider regional escalation after February 28, 2026.",
    why:
      "It is one of the freshest structured public conflict sources for the Iran war, and ACLED says eligible users can access daily Iran crisis data.",
    limits:
      "ACLED is event data, not direct structural damage mapping, and the best granularity requires account access.",
    link: "https://acleddata.com/update/middle-east-special-issue-march-2026",
    extraLabel: "Access FAQ",
    extraLink: "https://acleddata.com/faq/how-can-i-access-and-use-acled-data",
    primaryArea: "iran-gulf",
    mapAreas: ["iran-gulf"],
    point: [32.5, 53.7],
    zoom: 6,
    locationLabel: "Iran conflict theatre"
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
  "Oil Fires",
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

const state = {
  region: "All",
  signal: "All",
  query: "",
  activeAreaId: "iran-gulf",
  activeSourceId: null
};

const runtime = {
  map: null,
  areaLayers: new Map(),
  sourceLayer: null,
  hasInitialFit: false,
  installPrompt: null
};

const els = {
  priorityGrid: document.querySelector("#priority-grid"),
  sourceGrid: document.querySelector("#source-grid-inner"),
  resultsSummary: document.querySelector("#results-summary"),
  regionFilters: document.querySelector("#region-filters"),
  signalFilters: document.querySelector("#signal-filters"),
  searchInput: document.querySelector("#search-input"),
  template: document.querySelector("#source-card-template"),
  freshCount: document.querySelector("#fresh-count"),
  realtimeCount: document.querySelector("#realtime-count"),
  openCount: document.querySelector("#open-count"),
  lastRefreshValue: document.querySelector("#last-refresh-value"),
  installButton: document.querySelector("#install-button"),
  mapRoot: document.querySelector("#map"),
  mapPanelTitle: document.querySelector("#map-panel-title"),
  mapPanelCopy: document.querySelector("#map-panel-copy"),
  mapPanelMeta: document.querySelector("#map-panel-meta"),
  mapPanelList: document.querySelector("#map-panel-list"),
  fitVisibleButton: document.querySelector("#fit-visible-button"),
  resetViewButton: document.querySelector("#reset-view-button"),
  mapBoard: document.querySelector("#map-board")
};

function normalize(text) {
  return String(text).toLowerCase().trim();
}

function buildPills(container, values, activeValue, onClick) {
  container.innerHTML = "";
  values.forEach((value) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-pill";
    button.textContent = value;
    if (value === activeValue) {
      button.classList.add("is-active");
    }
    button.addEventListener("click", () => onClick(value));
    container.appendChild(button);
  });
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

function computeAreaStats(visibleSources) {
  const stats = new Map();

  visibleSources.forEach((source) => {
    source.mapAreas.forEach((areaId) => {
      if (!stats.has(areaId)) {
        stats.set(areaId, {
          areaId,
          count: 0,
          priorityCount: 0,
          sources: []
        });
      }

      const stat = stats.get(areaId);
      stat.count += 1;
      stat.priorityCount += Number(source.priority);
      stat.sources.push(source);
    });
  });

  stats.forEach((stat) => {
    stat.sources = sortSources(stat.sources);
    stat.freshest = stat.sources[0] || null;
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
  state.activeAreaId = getDefaultAreaId(computeAreaStats(getVisibleSources()));
  renderAll();
  fitVisibleAreas();
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

  [
    `${stat.count} visible source${stat.count === 1 ? "" : "s"}`,
    `${stat.priorityCount} priority`,
    stat.freshest ? `Freshest: ${stat.freshest.freshness}` : "No dated source"
  ].forEach((item) => {
    els.mapPanelMeta.appendChild(buildMetaChip(item));
  });

  const heading = document.createElement("p");
  heading.className = "map-list-heading";
  heading.textContent = "Sources in this zone";
  els.mapPanelList.appendChild(heading);

  stat.sources.forEach((source) => {
    els.mapPanelList.appendChild(buildMapListButton(source));
  });
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

  const nearRealtime = sources.filter(
    (source) =>
      source.cadence.includes("Within") ||
      source.cadence.includes("1-7 days") ||
      source.cadence.toLowerCase().includes("daily")
  ).length;

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
    renderAll();
  });

  buildPills(els.signalFilters, signalOrder, state.signal, (value) => {
    state.signal = value;
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

  return window.L.divIcon({
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

function setupMap() {
  if (runtime.map || !window.L) {
    return;
  }

  runtime.map = window.L.map(els.mapRoot, {
    zoomControl: false,
    minZoom: 2,
    maxZoom: 10,
    worldCopyJump: true
  }).setView([24, 18], 2);

  window.L.control.zoom({ position: "topright" }).addTo(runtime.map);

  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(runtime.map);

  areas.forEach((area) => {
    const layer = {};

    if (area.bounds) {
      layer.bounds = window.L.rectangle(area.bounds, {
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

    layer.marker = window.L.marker(area.center, {
      keyboard: true,
      icon: createAreaIcon(area, { count: 1, priorityCount: 0 }, false)
    });
    layer.marker.on("click", () => {
      focusArea(area.id, { fit: true, scroll: false });
    });
    layer.marker.bindTooltip(area.name, {
      direction: "top",
      offset: [0, -24]
    });

    runtime.areaLayers.set(area.id, layer);
  });
}

function updateMap(visibleSources, areaStats) {
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
    return;
  }

  runtime.sourceLayer = window.L.circleMarker(activeSource.point, {
    radius: 9,
    color: "#fff7f3",
    weight: 2,
    fillColor: "#231612",
    fillOpacity: 0.96
  });

  runtime.sourceLayer
    .bindPopup(
      `<strong>${activeSource.title}</strong><br>${activeSource.locationLabel}<br>${activeSource.freshness}`
    )
    .addTo(runtime.map)
    .openPopup();
}

function fitVisibleAreas(areaStats = computeAreaStats(getVisibleSources())) {
  if (!runtime.map || !areaStats.size) {
    return;
  }

  const bounds = window.L.latLngBounds([]);
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

function fitArea(areaId) {
  if (!runtime.map || !areaId) {
    return;
  }

  const area = areasById.get(areaId);
  if (!area) {
    return;
  }

  if (area.bounds) {
    runtime.map.fitBounds(area.bounds, {
      padding: [28, 28],
      maxZoom: area.id === "gaza" ? 10 : 6
    });
    return;
  }

  runtime.map.setView(area.center, area.zoom || 2, { animate: true });
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

function setupInstall() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    runtime.installPrompt = event;
    els.installButton.hidden = false;
  });

  els.installButton.addEventListener("click", async () => {
    if (!runtime.installPrompt) {
      return;
    }

    runtime.installPrompt.prompt();
    await runtime.installPrompt.userChoice;
    runtime.installPrompt = null;
    els.installButton.hidden = true;
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

    els.lastRefreshValue.textContent = date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch (_) {
    els.lastRefreshValue.textContent = fallbackText;
  }
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
            .filter((key) => key.startsWith("damage-atlas"))
            .map((key) => window.caches.delete(key))
        );
      } catch (_) {
      }
    }
  });
}

function renderAll() {
  const visibleSources = getVisibleSources();
  const areaStats = computeAreaStats(visibleSources);

  ensureValidSelection(visibleSources, areaStats);
  renderPriority();
  renderStats();
  renderFilters();
  renderSources(visibleSources);
  renderMapPanel(visibleSources, areaStats);
  updateMap(visibleSources, areaStats);

  if (!runtime.hasInitialFit && runtime.map && visibleSources.length) {
    fitVisibleAreas(areaStats);
    runtime.hasInitialFit = true;
  }
}

function init() {
  setupMap();
  setupSearch();
  setupMapControls();
  setupInstall();
  clearLegacyServiceWorkers();
  renderAll();
  loadRefreshTimestamp();
}

init();
