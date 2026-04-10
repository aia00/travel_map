import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import * as topojson from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";

const SOURCES = {
  worldAtlas: "https://cdn.jsdelivr.net/npm/visionscarto-world-atlas@1/world/110m.json",
  adm0Meta: "https://www.geoboundaries.org/api/current/gbOpen/ALL/ADM0/",
  boundaryApi: "https://www.geoboundaries.org/api/current/gbOpen",
};

const STORAGE_KEY = "visited-admin-map-v1";

const VISIT_TYPES = {
  resident: {
    label: "常住",
    color: "#c65239",
    description: "长期生活或稳定停留",
  },
  travel: {
    label: "旅行",
    color: "#19887b",
    description: "旅行、出差、短期访问",
  },
  transit: {
    label: "途径",
    color: "#d29b2b",
    description: "路过、转机或换乘",
  },
};

const VISIT_PRIORITY = ["resident", "travel", "transit"];

const CONTINENTS = [
  { id: "asia", label: "亚洲", sourceNames: ["Asia"] },
  { id: "europe", label: "欧洲", sourceNames: ["Europe"] },
  { id: "africa", label: "非洲", sourceNames: ["Africa"] },
  { id: "north-america", label: "北美洲", sourceNames: ["Northern America"] },
  {
    id: "south-america",
    label: "南美洲",
    sourceNames: ["South America"],
  },
  { id: "oceania", label: "大洋洲", sourceNames: ["Oceania"] },
  { id: "antarctica", label: "南极洲", sourceNames: ["Antarctica"] },
];

const dom = {
  continentTabs: document.querySelector("#continentTabs"),
  statusPill: document.querySelector("#statusPill"),
  countrySelect: document.querySelector("#countrySelect"),
  regionInput: document.querySelector("#regionInput"),
  regionSuggestions: document.querySelector("#regionSuggestions"),
  searchResults: document.querySelector("#searchResults"),
  visitTypeSelect: document.querySelector("#visitTypeSelect"),
  placeForm: document.querySelector("#placeForm"),
  clearRegionButton: document.querySelector("#clearRegionButton"),
  savedList: document.querySelector("#savedList"),
  continentTitle: document.querySelector("#continentTitle"),
  continentMeta: document.querySelector("#continentMeta"),
  countryTitle: document.querySelector("#countryTitle"),
  countryMeta: document.querySelector("#countryMeta"),
  selectionTitle: document.querySelector("#selectionTitle"),
  selectionMeta: document.querySelector("#selectionMeta"),
  selectionActions: document.querySelector("#selectionActions"),
  tooltip: document.querySelector("#tooltip"),
  metricTotal: document.querySelector('[data-metric="total"]'),
  metricResident: document.querySelector('[data-metric="resident"]'),
  metricTravel: document.querySelector('[data-metric="travel"]'),
  metricTransit: document.querySelector('[data-metric="transit"]'),
};

const state = {
  adm0Meta: [],
  adm0ByIso: new Map(),
  worldFeatures: [],
  countryFeatureByIso: new Map(),
  adminCache: new Map(),
  adminDataByIso: new Map(),
  selectedContinent: "asia",
  selectedCountryIso: null,
  selectedRegionKey: null,
  activeMatches: [],
  visited: loadVisited(),
  requestToken: 0,
};

initialize();

async function initialize() {
  bindEvents();
  renderContinentTabs();
  renderSelectionCard();
  renderSavedList();
  renderMetrics();
  setStatus("正在加载全球国家元数据和地图底图…", "loading");

  try {
    const [worldAtlas, adm0Meta] = await Promise.all([
      fetchJson(SOURCES.worldAtlas),
      fetchJson(SOURCES.adm0Meta),
    ]);

    const worldFeatures = topojson
      .feature(worldAtlas, worldAtlas.objects.countries)
      .features.map((feature) => {
        const iso = feature?.properties?.a3;
        return {
          ...feature,
          properties: {
            ...feature.properties,
            iso,
          },
        };
      })
      .filter((feature) => /^[A-Z]{3}$/.test(feature.properties.iso ?? ""));

    state.adm0Meta = adm0Meta
      .map((item) => ({
        ...item,
        uiContinent: deriveContinent(item),
      }))
      .filter((item) => item.uiContinent);

    state.adm0ByIso = new Map(
      state.adm0Meta.map((item) => [item.boundaryISO, item]),
    );
    state.worldFeatures = worldFeatures
      .filter((feature) => state.adm0ByIso.has(feature.properties.iso))
      .map((feature) => ({
        ...feature,
        properties: {
          ...feature.properties,
          meta: state.adm0ByIso.get(feature.properties.iso),
        },
      }));

    state.countryFeatureByIso = new Map(
      state.worldFeatures.map((feature) => [feature.properties.iso, feature]),
    );

    ensureSelectedCountry();
    renderContinentTabs();
    renderCountrySelect();
    renderContinentMap();
    await loadSelectedCountry();
    renderAll();
    setStatus("地图已准备好，可以开始标记。", "success");
  } catch (error) {
    console.error(error);
    setStatus("初始化失败：请确认浏览器能访问外部数据源。", "error");
    renderContinentMapError("加载全球地图失败。请刷新页面后重试。");
    renderCountryMapError("当前无法加载一级行政区边界。");
  }
}

function bindEvents() {
  dom.placeForm.addEventListener("submit", handleSubmit);
  dom.countrySelect.addEventListener("change", async (event) => {
    state.selectedCountryIso = event.target.value;
    state.selectedRegionKey = null;
    dom.regionInput.value = "";
    dom.searchResults.innerHTML = "";
    renderSelectionCard();
    renderContinentMap();
    renderSavedList();
    await loadSelectedCountry();
    renderCountryMap();
  });

  dom.regionInput.addEventListener("input", () => {
    renderMatches(dom.regionInput.value);
  });

  dom.clearRegionButton.addEventListener("click", () => {
    clearCurrentSelection();
  });
}

function renderAll() {
  renderContinentTabs();
  renderCountrySelect();
  renderContinentMap();
  renderCountryMap();
  renderSelectionCard();
  renderSavedList();
  renderMetrics();
}

function deriveContinent(item) {
  if (item.Continent === "Latin America and the Caribbean") {
    if (
      item["UNSDG-subregion"] === "Caribbean" ||
      item["UNSDG-subregion"] === "Central America"
    ) {
      return "north-america";
    }

    return "south-america";
  }

  if (item.Continent === "Northern America") {
    return "north-america";
  }

  return CONTINENTS.find((continent) =>
    continent.sourceNames.includes(item.Continent),
  )?.id;
}

function ensureSelectedCountry() {
  const countries = getCountriesForContinent(state.selectedContinent);

  if (!countries.length) {
    state.selectedCountryIso = null;
    return;
  }

  if (!countries.some((item) => item.boundaryISO === state.selectedCountryIso)) {
    const visitedCountry = countries.find((item) =>
      Object.values(state.visited).some((entry) => entry.iso === item.boundaryISO),
    );
    state.selectedCountryIso =
      visitedCountry?.boundaryISO ?? countries[0].boundaryISO;
  }
}

function getCountriesForContinent(continentId) {
  return state.adm0Meta
    .filter((item) => item.uiContinent === continentId)
    .sort((left, right) => left.boundaryName.localeCompare(right.boundaryName));
}

async function loadSelectedCountry() {
  const iso = state.selectedCountryIso;

  if (!iso) {
    renderCountryMapError("这个大洲当前没有可加载的国家数据。");
    return;
  }

  const token = ++state.requestToken;
  const meta = state.adm0ByIso.get(iso);
  setStatus(`正在加载 ${meta?.boundaryName ?? iso} 的一级行政区边界…`, "loading");

  try {
    await ensureAdminData(iso);

    if (token !== state.requestToken) {
      return;
    }

    renderCountryMap();
    renderSavedList();
    renderSelectionCard();
    setStatus(`已加载 ${meta?.boundaryName ?? iso} 的一级行政区边界。`, "success");
  } catch (error) {
    console.error(error);
    if (token !== state.requestToken) {
      return;
    }

    renderCountryMapError("加载一级行政区边界失败，请更换国家或稍后重试。");
    setStatus("一级行政区边界加载失败。", "error");
  }
}

async function ensureAdminData(iso) {
  if (state.adminCache.has(iso)) {
    return state.adminCache.get(iso);
  }

  const loader = (async () => {
    try {
      const meta = await fetchJson(`${SOURCES.boundaryApi}/${iso}/ADM1/`);
      const geometry = await fetchJson(toRawGitHubUrl(meta.simplifiedGeometryGeoJSON));
      const data = {
        meta,
        features: enrichFeatures(geometry?.features ?? [], iso),
        fallback: false,
      };
      state.adminDataByIso.set(iso, data);
      return data;
    } catch (adm1Error) {
      const meta = await fetchJson(`${SOURCES.boundaryApi}/${iso}/ADM0/`);
      const geometry = await fetchJson(toRawGitHubUrl(meta.simplifiedGeometryGeoJSON));
      const data = {
        meta,
        features: enrichFeatures(geometry?.features ?? [], iso, true),
        fallback: true,
      };
      state.adminDataByIso.set(iso, data);
      return data;
    }
  })();

  const guardedLoader = loader.catch((error) => {
    state.adminCache.delete(iso);
    state.adminDataByIso.delete(iso);
    throw error;
  });

  state.adminCache.set(iso, guardedLoader);
  return guardedLoader;
}

function enrichFeatures(features, iso, fallbackToCountry = false) {
  return features.map((feature, index) => {
    const props = feature.properties ?? {};
    const regionName =
      props.shapeName ??
      props.name ??
      props.NAME_1 ??
      props.NAME ??
      state.adm0ByIso.get(iso)?.boundaryName ??
      `Region ${index + 1}`;
    const regionId =
      props.shapeID ??
      props.shapeISO ??
      props.id ??
      `${iso}-${normalizeText(regionName)}-${index}`;

    return {
      ...feature,
      properties: {
        ...props,
        regionName,
        regionId,
        iso,
        visitKey: `${iso}::${regionId}`,
        fallbackToCountry,
      },
    };
  });
}

function renderContinentTabs() {
  dom.continentTabs.innerHTML = "";

  CONTINENTS.forEach((continent) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tab-button ${continent.id === state.selectedContinent ? "is-active" : ""}`;
    button.textContent = continent.label;
    button.addEventListener("click", async () => {
      if (continent.id === state.selectedContinent) {
        return;
      }

      state.selectedContinent = continent.id;
      state.selectedRegionKey = null;
      dom.regionInput.value = "";
      dom.searchResults.innerHTML = "";
      ensureSelectedCountry();
      renderContinentTabs();
      renderCountrySelect();
      renderContinentMap();
      renderSelectionCard();
      renderSavedList();
      await loadSelectedCountry();
      renderCountryMap();
    });
    dom.continentTabs.appendChild(button);
  });
}

function renderCountrySelect() {
  const countries = getCountriesForContinent(state.selectedContinent);
  dom.countrySelect.innerHTML = "";

  countries.forEach((country) => {
    const option = document.createElement("option");
    option.value = country.boundaryISO;
    option.textContent = country.boundaryName;
    option.selected = country.boundaryISO === state.selectedCountryIso;
    dom.countrySelect.appendChild(option);
  });

  const continentLabel = CONTINENTS.find(
    (continent) => continent.id === state.selectedContinent,
  )?.label;
  dom.continentTitle.textContent = `${continentLabel ?? "当前"}地图`;
  dom.continentMeta.textContent = `本大洲共 ${countries.length} 个国家 / 地区数据源。点击地图或下拉框切换国家。`;
}

function renderContinentMap() {
  const svg = d3.select("#continentMap");
  svg.selectAll("*").remove();
  hideTooltip();

  const continentFeatures = state.worldFeatures.filter(
    (feature) => feature.properties.meta?.uiContinent === state.selectedContinent,
  );

  if (!continentFeatures.length) {
    renderContinentMapError("这个大洲当前没有可展示的国家边界。");
    return;
  }

  const projection = d3
    .geoNaturalEarth1()
    .fitExtent(
      [
        [24, 24],
        [936, 536],
      ],
      {
        type: "FeatureCollection",
        features: continentFeatures,
      },
    );
  const path = d3.geoPath(projection);

  svg
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 960)
    .attr("height", 560)
    .attr("fill", "transparent");

  svg
    .append("g")
    .selectAll("path")
    .data(continentFeatures)
    .join("path")
    .attr("class", (feature) =>
      `continent-country ${feature.properties.iso === state.selectedCountryIso ? "is-selected" : ""}`,
    )
    .attr("d", path)
    .attr("fill", (feature) => getCountrySummaryColor(feature.properties.iso))
    .attr("stroke", "rgba(20, 37, 52, 0.36)")
    .attr("stroke-width", 0.9)
    .on("click", async (_, feature) => {
      state.selectedCountryIso = feature.properties.iso;
      state.selectedRegionKey = null;
      dom.regionInput.value = "";
      dom.searchResults.innerHTML = "";
      renderCountrySelect();
      renderContinentMap();
      renderSelectionCard();
      renderSavedList();
      await loadSelectedCountry();
      renderCountryMap();
    })
    .on("mousemove", (event, feature) => {
      const summary = summarizeCountry(feature.properties.iso);
      const lines = [
        `<strong>${feature.properties.meta.boundaryName}</strong>`,
        `已标记地区：${summary.total}`,
      ];

      if (summary.total > 0) {
        lines.push(
          `${VISIT_TYPES.resident.label} ${summary.resident} / ${VISIT_TYPES.travel.label} ${summary.travel} / ${VISIT_TYPES.transit.label} ${summary.transit}`,
        );
      } else {
        lines.push("还没有标记。");
      }

      showTooltip(event, lines.join("<br />"));
    })
    .on("mouseleave", hideTooltip);
}

function renderContinentMapError(message) {
  const svg = d3.select("#continentMap");
  svg.selectAll("*").remove();
  svg
    .append("foreignObject")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 960)
    .attr("height", 560)
    .html(`<div xmlns="http://www.w3.org/1999/xhtml" class="map-empty-state">${message}</div>`);
}

function renderCountryMap() {
  const svg = d3.select("#countryMap");
  svg.selectAll("*").remove();
  hideTooltip();

  if (!state.selectedCountryIso) {
    renderCountryMapError("先选择一个国家，再查看一级行政区地图。");
    return;
  }

  const countryMeta = state.adm0ByIso.get(state.selectedCountryIso);
  const data = state.adminDataByIso.get(state.selectedCountryIso);

  if (!data) {
    renderCountryMapError("一级行政区边界还在加载中。");
    return;
  }

  const features = data.features;
  dom.countryTitle.textContent = `${countryMeta?.boundaryName ?? state.selectedCountryIso} 一级行政区`;
  dom.countryMeta.textContent = data.fallback
    ? "该国家未能加载 ADM1，当前退回到国家边界视图。"
    : `当前显示 ${features.length} 个一级行政区边界。点击区域可直接标记。`;

  if (!features.length) {
    renderCountryMapError("当前国家没有可展示的一级行政区边界。");
    updateRegionSuggestions([]);
    return;
  }

  updateRegionSuggestions(features);

  const projection = d3
    .geoMercator()
    .fitExtent(
      [
        [26, 26],
        [934, 594],
      ],
      {
        type: "FeatureCollection",
        features,
      },
    );
  const path = d3.geoPath(projection);

  svg
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 960)
    .attr("height", 620)
    .attr("fill", "transparent");

  svg
    .append("g")
    .selectAll("path")
    .data(features)
    .join("path")
    .attr("class", (feature) =>
      `admin-region ${feature.properties.visitKey === state.selectedRegionKey ? "is-selected" : ""}`,
    )
    .attr("d", path)
    .attr("fill", (feature) => getRegionFill(feature.properties.visitKey))
    .attr("stroke", "rgba(20, 37, 52, 0.38)")
    .attr("stroke-width", 0.85)
    .on("click", (_, feature) => {
      state.selectedRegionKey = feature.properties.visitKey;
      dom.regionInput.value = feature.properties.regionName;
      renderMatches(feature.properties.regionName);
      renderSelectionCard();
      renderCountryMap();
      renderSavedList();
    })
    .on("mousemove", (event, feature) => {
      const visit = state.visited[feature.properties.visitKey];
      const visitLabel = visit ? VISIT_TYPES[visit.type].label : "未标记";
      const lines = [
        `<strong>${feature.properties.regionName}</strong>`,
        `${countryMeta?.boundaryName ?? ""}`,
        `状态：${visitLabel}`,
      ];
      showTooltip(event, lines.join("<br />"));
    })
    .on("mouseleave", hideTooltip);
}

function renderCountryMapError(message) {
  const svg = d3.select("#countryMap");
  svg.selectAll("*").remove();
  hideTooltip();
  updateRegionSuggestions([]);
  dom.countryMeta.textContent = message;
  svg
    .append("foreignObject")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 960)
    .attr("height", 620)
    .html(`<div xmlns="http://www.w3.org/1999/xhtml" class="map-empty-state">${message}</div>`);
}

function updateRegionSuggestions(features) {
  dom.regionSuggestions.innerHTML = "";

  features
    .slice()
    .sort((left, right) =>
      left.properties.regionName.localeCompare(right.properties.regionName),
    )
    .forEach((feature) => {
      const option = document.createElement("option");
      option.value = feature.properties.regionName;
      dom.regionSuggestions.appendChild(option);
    });
}

function renderMatches(query) {
  dom.searchResults.innerHTML = "";

  if (!query.trim() || !state.selectedCountryIso) {
    state.activeMatches = [];
    return;
  }

  const data = state.adminDataByIso.get(state.selectedCountryIso);

  if (!data) {
    return;
  }

  const matches = findMatches(data.features, query);
  state.activeMatches = matches;

  if (!matches.length) {
    const empty = document.createElement("span");
    empty.className = "saved-chip";
    empty.textContent = "没有找到匹配项";
    dom.searchResults.appendChild(empty);
    return;
  }

  matches.slice(0, 8).forEach((feature) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "result-chip";
    button.textContent = feature.properties.regionName;
    button.addEventListener("click", () => {
      state.selectedRegionKey = feature.properties.visitKey;
      dom.regionInput.value = feature.properties.regionName;
      renderSelectionCard();
      renderCountryMap();
      renderSavedList();
    });
    dom.searchResults.appendChild(button);
  });
}

function findMatches(features, query) {
  const normalizedQuery = normalizeText(query);

  return features
    .map((feature) => {
      const normalizedName = normalizeText(feature.properties.regionName);
      let score = 0;

      if (normalizedName === normalizedQuery) {
        score = 3;
      } else if (normalizedName.startsWith(normalizedQuery)) {
        score = 2;
      } else if (normalizedName.includes(normalizedQuery)) {
        score = 1;
      }

      return { feature, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.feature.properties.regionName.localeCompare(
        right.feature.properties.regionName,
      );
    })
    .map((item) => item.feature);
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!state.selectedCountryIso) {
    setStatus("请先选择国家。", "error");
    return;
  }

  try {
    const data = await ensureAdminData(state.selectedCountryIso);
    const query = dom.regionInput.value.trim();

    if (!query) {
      setStatus("请输入地区名称。", "error");
      return;
    }

    const exact = data.features.find(
      (feature) => normalizeText(feature.properties.regionName) === normalizeText(query),
    );
    const matches = exact ? [exact] : findMatches(data.features, query);

    if (!matches.length) {
      setStatus("没有找到这个地区，请从候选结果里点选。", "error");
      renderMatches(query);
      return;
    }

    if (!exact && matches.length > 1) {
      state.activeMatches = matches;
      renderMatches(query);
      setStatus("匹配到多个地区，请先点选具体地区。", "error");
      return;
    }

    const feature = matches[0];
    const type = dom.visitTypeSelect.value;

    state.visited[feature.properties.visitKey] = {
      iso: state.selectedCountryIso,
      countryName: state.adm0ByIso.get(state.selectedCountryIso)?.boundaryName ?? "",
      regionName: feature.properties.regionName,
      type,
      updatedAt: new Date().toISOString(),
    };

    state.selectedRegionKey = feature.properties.visitKey;
    saveVisited();
    renderAll();
    setStatus(
      `${feature.properties.regionName} 已标记为 ${VISIT_TYPES[type].label}。`,
      "success",
    );
  } catch (error) {
    console.error(error);
    setStatus("保存标记失败，请稍后重试。", "error");
  }
}

function clearCurrentSelection() {
  const selectedKey = state.selectedRegionKey;

  if (!selectedKey) {
    setStatus("请先点击地图或从搜索结果里选择地区。", "error");
    return;
  }

  if (!state.visited[selectedKey]) {
    setStatus("当前地区还没有颜色标记。", "error");
    return;
  }

  const label = state.visited[selectedKey].regionName;
  delete state.visited[selectedKey];
  saveVisited();
  renderAll();
  setStatus(`${label} 的标记已清除。`, "success");
}

function renderSelectionCard() {
  const selectedFeature = getSelectedFeature();
  dom.selectionActions.innerHTML = "";

  if (!selectedFeature) {
    dom.selectionTitle.textContent = "还没有选中地区";
    dom.selectionMeta.textContent = "可以点击地图，或在搜索框里输入地区名称。";
    return;
  }

  const visit = state.visited[selectedFeature.properties.visitKey];
  const countryName =
    state.adm0ByIso.get(selectedFeature.properties.iso)?.boundaryName ??
    selectedFeature.properties.iso;

  dom.selectionTitle.textContent = selectedFeature.properties.regionName;
  dom.selectionMeta.textContent = `${countryName} · 当前状态：${visit ? VISIT_TYPES[visit.type].label : "未标记"}`;

  Object.entries(VISIT_TYPES).forEach(([type, config]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `quick-action ${visit?.type === type ? "is-active" : ""}`;
    button.dataset.type = type;
    button.textContent = config.label;
    button.addEventListener("click", () => {
      state.visited[selectedFeature.properties.visitKey] = {
        iso: selectedFeature.properties.iso,
        countryName,
        regionName: selectedFeature.properties.regionName,
        type,
        updatedAt: new Date().toISOString(),
      };
      saveVisited();
      renderAll();
      setStatus(`${selectedFeature.properties.regionName} 已更新为 ${config.label}。`, "success");
    });
    dom.selectionActions.appendChild(button);
  });

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "ghost-button";
  remove.textContent = "清除";
  remove.addEventListener("click", clearCurrentSelection);
  dom.selectionActions.appendChild(remove);
}

function getSelectedFeature() {
  if (!state.selectedRegionKey || !state.selectedCountryIso) {
    return null;
  }

  const data = state.adminDataByIso.get(state.selectedCountryIso);
  if (!data) {
    return null;
  }

  return (
    data.features.find(
      (feature) => feature.properties.visitKey === state.selectedRegionKey,
    ) ?? null
  );
}

function renderSavedList() {
  dom.savedList.innerHTML = "";

  if (!state.selectedCountryIso) {
    dom.savedList.innerHTML = `<div class="saved-empty">先选择一个国家。</div>`;
    return;
  }

  const entries = Object.entries(state.visited)
    .filter(([, value]) => value.iso === state.selectedCountryIso)
    .sort((left, right) => left[1].regionName.localeCompare(right[1].regionName));

  if (!entries.length) {
    dom.savedList.innerHTML =
      '<div class="saved-empty">这个国家还没有标记地区。选中地图区域后，可以一键上色。</div>';
    return;
  }

  entries.forEach(([visitKey, value]) => {
    const item = document.createElement("article");
    item.className = `saved-item ${visitKey === state.selectedRegionKey ? "is-selected" : ""}`;

    const left = document.createElement("button");
    left.type = "button";
    left.className = "saved-item-trigger";
    left.innerHTML = `
      <strong>${value.regionName}</strong>
      <p>${value.countryName}</p>
      <div class="saved-meta">
        <span class="saved-chip ${value.type}">${VISIT_TYPES[value.type].label}</span>
      </div>
    `;
    left.addEventListener("click", async () => {
      state.selectedRegionKey = visitKey;
      dom.regionInput.value = value.regionName;
      renderSelectionCard();
      renderCountryMap();
      renderSavedList();
      renderMatches(value.regionName);
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-button";
    remove.textContent = "删除";
    remove.addEventListener("click", () => {
      delete state.visited[visitKey];
      if (state.selectedRegionKey === visitKey) {
        state.selectedRegionKey = null;
      }
      saveVisited();
      renderAll();
      setStatus(`${value.regionName} 的标记已删除。`, "success");
    });

    item.appendChild(left);
    item.appendChild(remove);
    dom.savedList.appendChild(item);
  });
}

function renderMetrics() {
  const values = Object.values(state.visited);
  dom.metricTotal.textContent = `${values.length}`;
  dom.metricResident.textContent = `${values.filter((item) => item.type === "resident").length}`;
  dom.metricTravel.textContent = `${values.filter((item) => item.type === "travel").length}`;
  dom.metricTransit.textContent = `${values.filter((item) => item.type === "transit").length}`;
}

function summarizeCountry(iso) {
  const entries = Object.values(state.visited).filter((entry) => entry.iso === iso);
  return {
    total: entries.length,
    resident: entries.filter((entry) => entry.type === "resident").length,
    travel: entries.filter((entry) => entry.type === "travel").length,
    transit: entries.filter((entry) => entry.type === "transit").length,
  };
}

function getCountrySummaryColor(iso) {
  if (iso === state.selectedCountryIso) {
    return "#284f71";
  }

  const summary = summarizeCountry(iso);

  if (!summary.total) {
    return "#d9d9d0";
  }

  const type = VISIT_PRIORITY.find((item) => summary[item] > 0);
  return VISIT_TYPES[type]?.color ?? "#d9d9d0";
}

function getRegionFill(visitKey) {
  if (visitKey === state.selectedRegionKey) {
    return "#143c5a";
  }

  const visit = state.visited[visitKey];
  return visit ? VISIT_TYPES[visit.type].color : "#ebe2d1";
}

function showTooltip(event, html) {
  dom.tooltip.hidden = false;
  dom.tooltip.innerHTML = html;
  const offset = 16;
  const maxLeft = window.innerWidth - dom.tooltip.offsetWidth - 12;
  const maxTop = window.innerHeight - dom.tooltip.offsetHeight - 12;
  const left = Math.min(event.clientX + offset, Math.max(12, maxLeft));
  const top = Math.min(event.clientY + offset, Math.max(12, maxTop));

  dom.tooltip.style.left = `${left}px`;
  dom.tooltip.style.top = `${top}px`;
}

function hideTooltip() {
  dom.tooltip.hidden = true;
}

function setStatus(message, tone = "") {
  dom.statusPill.textContent = message;
  dom.statusPill.className = `status-pill ${tone}`.trim();
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function toRawGitHubUrl(url) {
  if (!url) {
    throw new Error("Missing geometry url");
  }

  if (url.startsWith("https://github.com/") && url.includes("/raw/")) {
    return url.replace(
      "https://github.com/wmgeolab/geoBoundaries/raw/",
      "https://raw.githubusercontent.com/wmgeolab/geoBoundaries/",
    );
  }

  return url;
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.json();
}

function saveVisited() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 1,
      visited: state.visited,
    }),
  );
}

function loadVisited() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return parsed.visited ?? {};
  } catch (error) {
    console.warn("Failed to load saved visits", error);
    return {};
  }
}
