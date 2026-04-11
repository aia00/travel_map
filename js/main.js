import { CONTINENTS, SOURCES, VISIT_PRIORITY, VISIT_TYPES } from "./config.js";
import { queryDom } from "./dom.js";
import {
  applyStaticTranslations,
  formatContinentTitle,
  formatCountryTitle,
  getContinentLabel,
  getVisitTypeLabel,
  t,
} from "./i18n.js";
import {
  ensureAdminData,
  findMatches,
  findPlaceMatches,
  getCountriesForContinent,
  loadWorldData,
  normalizeText,
} from "./mapData.js";
import {
  findAirportMatches,
  looksLikeAirportCode,
} from "./airportData.js";
import {
  ensureZhCountryNamesLoaded,
  extractChinesePlaceName,
  getCountryDisplayName,
  getRegionDisplayName,
} from "./placeNames.js";
import {
  renderContinentMap,
  renderContinentMapError,
  renderContinentTabs,
  renderCountryMap,
  renderCountryMapError,
  renderCountrySelect,
} from "./renderMaps.js";
import {
  renderMatchChips,
  renderMatches,
  renderMetrics,
  renderSavedList,
  renderSelectionCard,
  renderStatus,
} from "./renderPanels.js";
import {
  loadLanguage,
  loadPlaceNames,
  loadUiState,
  loadVisited,
  saveLanguage,
  savePlaceNames,
  saveUiState,
  saveVisited,
} from "./storage.js";

export function bootstrapApp() {
  const dom = queryDom();
  const savedUiState = loadUiState();

  const state = {
    language: loadLanguage(),
    adm0Meta: [],
    adm0ByIso: new Map(),
    worldFeatures: [],
    adminCache: new Map(),
    adminDataByIso: new Map(),
    selectedContinent: savedUiState.selectedContinent,
    selectedCountryIso: savedUiState.selectedCountryIso,
    selectedRegionKey: savedUiState.selectedRegionKey,
    activeMatches: [],
    placeNames: loadPlaceNames(),
    placeSearchCache: new Map(),
    lastPlaceSearchAt: 0,
    regionNameRequests: new Map(),
    countryNamesReady: false,
    visited: loadVisited(),
    requestToken: 0,
    status: {
      key: "status.ready",
      tone: "",
      params: {},
    },
  };

  dom.regionInput.value = savedUiState.regionQuery;
  dom.visitTypeSelect.value =
    savedUiState.visitType && VISIT_TYPES[savedUiState.visitType]
      ? savedUiState.visitType
      : "travel";

  applyStaticTranslations({ dom, language: state.language });
  bindEvents({ dom, state });
  initialize({ dom, state });

  function bindEvents(context) {
    const { dom: boundDom, state: boundState } = context;

    boundDom.placeForm.addEventListener("submit", handleSubmit);

    boundDom.countrySelect.addEventListener("change", async (event) => {
      boundState.selectedCountryIso = event.target.value || null;
      boundState.selectedRegionKey = null;
      boundDom.regionInput.value = "";
      boundDom.searchResults.innerHTML = "";
      persistUiState();
      renderSelectionPanel();
      renderContinentView();
      renderSavedRegions();
      await loadSelectedCountry();
      renderCountryView();
    });

    boundDom.regionInput.addEventListener("input", () => {
      persistUiState();
      boundState.activeMatches = renderSearchMatches(boundDom.regionInput.value);
    });

    boundDom.visitTypeSelect.addEventListener("change", () => {
      persistUiState();
    });

    boundDom.clearRegionButton.addEventListener("click", () => {
      clearCurrentSelection();
    });

    boundDom.langButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.lang === boundState.language) {
          return;
        }

        boundState.language = button.dataset.lang;
        saveLanguage(boundState.language);
        applyStaticTranslations({ dom: boundDom, language: boundState.language });
        ensureCountryNamesReady();
        if (boundState.adm0Meta.length) {
          renderAll();
          boundState.activeMatches = renderSearchMatches(boundDom.regionInput.value);
        } else {
          renderContinentTabsView();
          renderSelectionPanel();
          renderSavedRegions();
          renderMetricCards();
        }
        renderCurrentStatus();
      });
    });
  }

  async function initialize(context) {
    const { state: currentState } = context;

    renderContinentTabsView();
    renderSelectionPanel();
    renderSavedRegions();
    renderMetricCards();
    setStatus("status.loadingGlobalData", "loading");

    try {
      const worldData = await loadWorldData();
      currentState.adm0Meta = worldData.adm0Meta;
      currentState.adm0ByIso = worldData.adm0ByIso;
      currentState.worldFeatures = worldData.worldFeatures;
      ensureCountryNamesReady();

      ensureSelectedCountry();
      persistUiState();
      renderCountrySelectView();
      renderContinentView();
      await loadSelectedCountry();
      renderAll();
      state.activeMatches = renderSearchMatches(dom.regionInput.value);
      setStatus("status.ready", "success");
    } catch (error) {
      console.error(error);
      setStatus("status.initError", "error");
      renderContinentMapError(dom, translate("map.emptyContinentLoad"));
      renderCountryMapError(dom, translate("map.emptyCountryUnavailable"));
    }
  }

  async function loadSelectedCountry() {
    const iso = state.selectedCountryIso;

    if (!iso) {
      renderCountryMapError(dom, translate("map.emptyContinentNoCountryData"));
      return;
    }

    const token = ++state.requestToken;
    const meta = state.adm0ByIso.get(iso);
    setStatus("status.loadingCountry", "loading", {
      country: getCountryLabel(meta) || meta?.boundaryName || iso,
    });

    try {
      await ensureAdminData(state, iso);

      if (token !== state.requestToken) {
        return;
      }

      if (!getSelectedFeature()) {
        state.selectedRegionKey = null;
      }

      persistUiState();
      renderCountryView();
      renderSavedRegions();
      renderSelectionPanel();
      state.activeMatches = renderSearchMatches(dom.regionInput.value);
      setStatus("status.loadedCountry", "success", {
        country: getCountryLabel(meta) || meta?.boundaryName || iso,
      });
    } catch (error) {
      console.error(error);
      if (token !== state.requestToken) {
        return;
      }

      renderCountryMapError(dom, translate("map.emptyCountryUnavailable"));
      setStatus("status.countryLoadError", "error");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!state.selectedCountryIso) {
      setStatus("status.selectCountryFirst", "error");
      return;
    }

    try {
      const data = await ensureAdminData(state, state.selectedCountryIso);
      const query = dom.regionInput.value.trim();

      if (!query) {
        setStatus("status.enterRegion", "error");
        return;
      }

      const exact = data.features.find(
        (feature) =>
          normalizeText(feature.properties.regionName) === normalizeText(query),
      );
      let matchSource = "direct";
      let matches = exact ? [exact] : findMatches(data.features, query);
      const airportLikeQuery = looksLikeAirportCode(query);

      if (!matches.length && airportLikeQuery) {
        setStatus("status.searchingAirportCode", "loading", {
          code: query.toUpperCase(),
          country: getCountryLabelByIso(state.selectedCountryIso),
        });

        try {
          matches = await lookupAirportMatches(query, data.features);
          if (matches.length) {
            matchSource = "airport";
          }
        } catch (error) {
          console.warn("Airport code lookup failed", error);
        }
      }

      if (!matches.length) {
        setStatus("status.searchingPlaces", "loading", {
          country: getCountryLabelByIso(state.selectedCountryIso),
        });

        try {
          matches = await lookupPlaceMatches(query, data.features);
          matchSource = "place";
        } catch (error) {
          console.error(error);
          state.activeMatches = renderPlaceRetryHint();
          setStatus("status.placeLookupError", "error");
          return;
        }
      }

      if (!matches.length) {
        state.activeMatches =
          matchSource === "place" ? renderPlaceRetryHint() : renderSearchMatches(query);
        setStatus(
          airportLikeQuery
            ? "status.airportCodeNotFound"
            : matchSource === "place"
              ? "status.placeNotFound"
              : "status.regionNotFound",
          "error",
          {
            code: query.toUpperCase(),
            country: getCountryLabelByIso(state.selectedCountryIso),
          },
        );
        return;
      }

      if (!exact && matches.length > 1) {
        state.activeMatches =
          matchSource === "place" || matchSource === "airport"
            ? renderResolvedMatches(matches)
            : renderSearchMatches(query);
        setStatus(
          matchSource === "airport"
            ? "status.airportCodeMultipleMatches"
            : matchSource === "place"
              ? "status.placeMultipleMatches"
              : "status.multipleMatches",
          "error",
        );
        return;
      }

      const feature = matches[0];
      const type = dom.visitTypeSelect.value;
      saveVisit(feature, type, {
        query,
        statusKey:
          matchSource === "airport"
            ? "status.savedAirportVisit"
            : matchSource === "place"
              ? "status.savedPlaceVisit"
              : "status.savedVisit",
      });
    } catch (error) {
      console.error(error);
      setStatus("status.saveFailed", "error");
    }
  }

  function clearCurrentSelection() {
    const selectedKey = state.selectedRegionKey;

    if (!selectedKey) {
      setStatus("status.selectRegionFirst", "error");
      return;
    }

    if (!state.visited[selectedKey]) {
      setStatus("status.noMarkToClear", "error");
      return;
    }

    const label = state.visited[selectedKey].regionName;
    delete state.visited[selectedKey];
    saveVisited(state.visited);
    persistUiState();
    renderAll();
    setStatus("status.clearedVisit", "success", {
      region: getRegionDisplayName(
        state.language,
        label,
        state.placeNames.regions[selectedKey] ?? "",
      ),
    });
  }

  function ensureSelectedCountry() {
    const countries = getCountriesForContinent(
      state.adm0Meta,
      state.selectedContinent,
    );

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

  function renderAll() {
    renderContinentTabsView();
    renderCountrySelectView();
    renderContinentView();
    renderCountryView();
    renderSelectionPanel();
    renderSavedRegions();
    renderMetricCards();
  }

  function renderContinentTabsView() {
    renderContinentTabs({
      dom,
      selectedContinent: state.selectedContinent,
      getContinentLabel: (continentId) =>
        getContinentLabel(state.language, continentId),
      onSelectContinent: async (continentId) => {
        if (continentId === state.selectedContinent) {
          return;
        }

        state.selectedContinent = continentId;
        state.selectedRegionKey = null;
        dom.regionInput.value = "";
        dom.searchResults.innerHTML = "";
        ensureSelectedCountry();
        persistUiState();
        renderContinentTabsView();
        renderCountrySelectView();
        renderContinentView();
        renderSelectionPanel();
        renderSavedRegions();
        await loadSelectedCountry();
        renderCountryView();
      },
    });
  }

  function renderCountrySelectView() {
    const countries = getCountriesForContinent(
      state.adm0Meta,
      state.selectedContinent,
    );
    renderCountrySelect({
      dom,
      countries,
      selectedCountryIso: state.selectedCountryIso,
      continentTitle: formatContinentTitle(state.language, state.selectedContinent),
      continentMeta: translate("map.continentMeta", {
        visitedCount: summarizeContinent(state.selectedContinent).visited,
        count: countries.length,
      }),
      countryPlaceholder: translate("fields.countryPlaceholder"),
      getCountryLabel: getCountryLabel,
    });
  }

  function renderContinentView() {
    renderContinentMap({
      dom,
      worldFeatures: state.worldFeatures,
      selectedContinent: state.selectedContinent,
      selectedCountryIso: state.selectedCountryIso,
      getCountrySummaryColor,
      summarizeCountry,
      t: translate,
      getCountryLabel: getCountryLabel,
      getVisitTypeLabel: getVisitLabel,
      onSelectCountry: async (iso) => {
        state.selectedCountryIso = iso;
        state.selectedRegionKey = null;
        dom.regionInput.value = "";
        dom.searchResults.innerHTML = "";
        persistUiState();
        renderCountrySelectView();
        renderContinentView();
        renderSelectionPanel();
        renderSavedRegions();
        await loadSelectedCountry();
        renderCountryView();
      },
      onClearCountrySelection: () => {
        clearSelectedCountry();
      },
    });
  }

  function renderCountryView() {
    const countryData = state.adminDataByIso.get(state.selectedCountryIso);
    const countryMeta = state.adm0ByIso.get(state.selectedCountryIso);
    const countrySummary = summarizeSelectedCountry();

    if (countryMeta) {
      dom.countryTitle.textContent = formatCountryTitle(
        state.language,
        getCountryLabel(countryMeta),
      );
      dom.countryMeta.textContent = countryData?.fallback
        ? translate("map.countryMetaFallback", {
            visitedCount: countrySummary.visited,
            count: countryData?.features?.length ?? 0,
          })
        : translate("map.countryMetaLoaded", {
            visitedCount: countrySummary.visited,
            count: countryData?.features?.length ?? 0,
          });
    } else {
      dom.countryTitle.textContent = translate("map.countryTitleEmpty");
      dom.countryMeta.textContent = translate("map.emptyCountryPrompt");
    }

    renderCountryMap({
      dom,
      selectedCountryIso: state.selectedCountryIso,
      countryMeta,
      countryData,
      selectedRegionKey: state.selectedRegionKey,
      getRegionFill,
      t: translate,
      getCountryLabel: getCountryLabel,
      getRegionLabel: getRegionLabel,
      onHoverRegion: (feature) => {
        queueRegionName(feature);
      },
      onSelectRegion: (feature) => {
        selectFeature(feature);
      },
      onClearSelection: () => {
        clearSelectedFeature();
      },
      getVisitLabel: (visitKey) => {
        const visit = state.visited[visitKey];
        return visit ? getVisitLabel(visit.type) : translate("labels.unmarked");
      },
    });

    queueVisibleRegionNames();
  }

  function renderSelectionPanel() {
    const selectedFeature = getSelectedFeature();
    const selectedVisit = selectedFeature
      ? state.visited[selectedFeature.properties.visitKey]
      : null;
    const countryName = selectedFeature
      ? state.adm0ByIso.get(selectedFeature.properties.iso)?.boundaryName ??
        selectedFeature.properties.iso
      : "";

    renderSelectionCard({
      dom,
      selectedFeature,
      selectedTitle: selectedFeature ? getRegionLabel(selectedFeature) : "",
      selectedVisit,
      countryName: selectedFeature ? getCountryLabelByIso(selectedFeature.properties.iso) : "",
      t: translate,
      getVisitTypeLabel: getVisitLabel,
      onApplyType: (type) => {
        state.visited[selectedFeature.properties.visitKey] = {
          iso: selectedFeature.properties.iso,
          countryName,
          regionName: selectedFeature.properties.regionName,
          type,
          updatedAt: new Date().toISOString(),
        };
        saveVisited(state.visited);
        persistUiState();
        renderAll();
        setStatus("status.updatedVisit", "success", {
          region: getRegionLabel(selectedFeature),
          type: getVisitLabel(type),
        });
      },
      onClear: clearCurrentSelection,
    });
  }

  function renderSavedRegions() {
    const entries = Object.entries(state.visited)
      .filter(([, value]) => value.iso === state.selectedCountryIso)
      .sort((left, right) => left[1].regionName.localeCompare(right[1].regionName));

    renderSavedList({
      dom,
      selectedCountryIso: state.selectedCountryIso,
      entries,
      selectedRegionKey: state.selectedRegionKey,
      t: translate,
      getEntryLabel: getSavedRegionLabel,
      getEntryCountryName: getSavedCountryLabel,
      getVisitTypeLabel: getVisitLabel,
      onSelectEntry: (visitKey, value) => {
        state.selectedRegionKey = visitKey;
        dom.regionInput.value = value.regionName;
        persistUiState();
        renderSelectionPanel();
        renderCountryView();
        renderSavedRegions();
        state.activeMatches = renderSearchMatches(value.regionName);
      },
      onDeleteEntry: (visitKey, value) => {
        delete state.visited[visitKey];
        if (state.selectedRegionKey === visitKey) {
          state.selectedRegionKey = null;
        }
        saveVisited(state.visited);
        persistUiState();
        renderAll();
        setStatus("status.deletedVisit", "success", {
          region: getSavedRegionLabel(visitKey, value),
        });
      },
    });
  }

  function renderMetricCards() {
    renderMetrics({
      dom,
      values: Object.values(state.visited),
    });
  }

  function renderSearchMatches(query) {
    const matches = renderMatches({
      dom,
      query,
      selectedCountryIso: state.selectedCountryIso,
      data: state.adminDataByIso.get(state.selectedCountryIso),
      findMatches,
      t: translate,
      getFeatureLabel: getRegionLabel,
      onSelectRegion: (feature) => {
        selectFeature(feature);
      },
    });

    matches.slice(0, 8).forEach((feature) => {
      queueRegionName(feature);
    });

    return matches;
  }

  function renderResolvedMatches(features) {
    features.slice(0, 8).forEach((feature) => {
      queueRegionName(feature);
    });

    renderMatchChips({
      dom,
      features: features.slice(0, 8),
      getFeatureLabel: getRegionLabel,
      onSelectRegion: (feature) => {
        selectFeature(feature);
      },
    });
    return features;
  }

  function renderPlaceRetryHint() {
    renderMatchChips({
      dom,
      features: [],
      emptyText: translate("search.placeNoMatches"),
      onSelectRegion: () => {},
    });
    return [];
  }

  function renderCurrentStatus() {
    renderStatus({
      dom,
      text: translate(state.status.key, state.status.params),
      tone: state.status.tone,
    });
  }

  function setStatus(key, tone = "", params = {}) {
    state.status = { key, tone, params };
    renderCurrentStatus();
  }

  function selectFeature(feature) {
    state.selectedRegionKey = feature.properties.visitKey;
    dom.regionInput.value = feature.properties.regionName;
    persistUiState();
    queueRegionName(feature);
    state.activeMatches = renderSearchMatches(feature.properties.regionName);
    renderSelectionPanel();
    renderCountryView();
    renderSavedRegions();
  }

  function saveVisit(feature, type, { query = "", statusKey = "status.savedVisit" } = {}) {
    const countryName =
      state.adm0ByIso.get(state.selectedCountryIso)?.boundaryName ?? "";

    state.visited[feature.properties.visitKey] = {
      iso: state.selectedCountryIso,
      countryName,
      regionName: feature.properties.regionName,
      type,
      updatedAt: new Date().toISOString(),
    };

    state.selectedRegionKey = feature.properties.visitKey;
    dom.regionInput.value = feature.properties.regionName;
    saveVisited(state.visited);
    persistUiState();
    renderAll();
    state.activeMatches = renderSearchMatches(feature.properties.regionName);
    setStatus(statusKey, "success", {
      query,
      region: getRegionLabel(feature),
      type: getVisitLabel(type),
    });
  }

  function clearSelectedFeature() {
    if (!state.selectedRegionKey && !dom.regionInput.value) {
      return;
    }

    state.selectedRegionKey = null;
    dom.regionInput.value = "";
    dom.searchResults.innerHTML = "";
    persistUiState();
    state.activeMatches = [];
    renderSelectionPanel();
    renderCountryView();
    renderSavedRegions();
  }

  function clearSelectedCountry() {
    if (!state.selectedCountryIso && !state.selectedRegionKey && !dom.regionInput.value) {
      return;
    }

    state.selectedCountryIso = null;
    state.selectedRegionKey = null;
    dom.regionInput.value = "";
    dom.searchResults.innerHTML = "";
    persistUiState();
    state.activeMatches = [];
    renderCountrySelectView();
    renderContinentView();
    renderSelectionPanel();
    renderSavedRegions();
    renderCountryView();
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

  function summarizeCountry(iso) {
    const entries = Object.values(state.visited).filter((entry) => entry.iso === iso);
    return {
      total: entries.length,
      resident: entries.filter((entry) => entry.type === "resident").length,
      travel: entries.filter((entry) => entry.type === "travel").length,
      transit: entries.filter((entry) => entry.type === "transit").length,
    };
  }

  function summarizeContinent(continentId) {
    const countryIsos = new Set(
      getCountriesForContinent(state.adm0Meta, continentId).map(
        (country) => country.boundaryISO,
      ),
    );
    const visitedCountries = new Set(
      Object.values(state.visited)
        .map((entry) => entry.iso)
        .filter((iso) => countryIsos.has(iso)),
    );

    return {
      visited: visitedCountries.size,
      total: countryIsos.size,
    };
  }

  function summarizeSelectedCountry() {
    if (!state.selectedCountryIso) {
      return {
        visited: 0,
      };
    }

    return {
      visited: Object.values(state.visited).filter(
        (entry) => entry.iso === state.selectedCountryIso,
      ).length,
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
    return visit ? VISIT_TYPES[visit.type].color : "#d9cfbd";
  }

  function getVisitLabel(type) {
    return getVisitTypeLabel(state.language, type);
  }

  async function lookupPlaceMatches(query, features) {
    const normalizedQuery = normalizeText(query);

    if (!normalizedQuery || !state.selectedCountryIso) {
      return [];
    }

    const cacheKey = `${state.language}::${state.selectedCountryIso}::${normalizedQuery}`;

    if (state.placeSearchCache.has(cacheKey)) {
      return state.placeSearchCache.get(cacheKey);
    }

    const lookupPromise = (async () => {
      const elapsed = Date.now() - state.lastPlaceSearchAt;

      if (elapsed < 1100) {
        await wait(1100 - elapsed);
      }

      state.lastPlaceSearchAt = Date.now();

      return findPlaceMatches({
        query,
        countryName:
          state.adm0ByIso.get(state.selectedCountryIso)?.boundaryName ?? "",
        features,
        language: state.language,
      });
    })().catch((error) => {
      state.placeSearchCache.delete(cacheKey);
      throw error;
    });

    state.placeSearchCache.set(cacheKey, lookupPromise);
    return lookupPromise;
  }

  async function lookupAirportMatches(query, features) {
    return findAirportMatches({
      query,
      countryIsoAlpha3: state.selectedCountryIso,
      features,
    });
  }

  function ensureCountryNamesReady() {
    if (state.language !== "zh" || state.countryNamesReady) {
      return;
    }

    ensureZhCountryNamesLoaded()
      .then(() => {
        state.countryNamesReady = true;
        renderAll();
      })
      .catch((error) => {
        console.warn("Failed to load Chinese country names", error);
      });
  }

  function queueVisibleRegionNames() {
    if (state.language !== "zh" || !state.selectedCountryIso) {
      return;
    }

    const currentData = state.adminDataByIso.get(state.selectedCountryIso);
    if (!currentData?.features?.length) {
      return;
    }

    const visibleFeatures = [];
    const selectedFeature = getSelectedFeature();

    if (selectedFeature) {
      visibleFeatures.push(selectedFeature);
    }

    state.activeMatches.slice(0, 8).forEach((feature) => {
      visibleFeatures.push(feature);
    });

    Object.entries(state.visited)
      .filter(([, value]) => value.iso === state.selectedCountryIso)
      .forEach(([visitKey]) => {
        const feature = currentData.features.find(
          (candidate) => candidate.properties.visitKey === visitKey,
        );
        if (feature) {
          visibleFeatures.push(feature);
        }
      });

    [...new Map(visibleFeatures.map((feature) => [feature.properties.visitKey, feature])).values()]
      .forEach((feature) => {
        queueRegionName(feature);
      });
  }

  function queueRegionName(feature) {
    if (state.language !== "zh" || !feature) {
      return;
    }

    const visitKey = feature.properties.visitKey;

    if (state.placeNames.regions[visitKey] || state.regionNameRequests.has(visitKey)) {
      return;
    }

    const countryName = state.adm0ByIso.get(feature.properties.iso)?.boundaryName ?? "";
    const request = lookupRegionChineseName(feature, countryName)
      .then((translatedName) => {
        if (!translatedName) {
          return;
        }

        state.placeNames.regions[visitKey] = translatedName;
        savePlaceNames(state.placeNames);
        renderAll();
        state.activeMatches = renderSearchMatches(dom.regionInput.value);
      })
      .catch((error) => {
        console.warn(`Failed to translate region name for ${visitKey}`, error);
      })
      .finally(() => {
        state.regionNameRequests.delete(visitKey);
      });

    state.regionNameRequests.set(visitKey, request);
  }

  async function lookupRegionChineseName(feature, countryName) {
    const elapsed = Date.now() - state.lastPlaceSearchAt;

    if (elapsed < 1100) {
      await wait(1100 - elapsed);
    }

    state.lastPlaceSearchAt = Date.now();

    const params = new URLSearchParams({
      q: countryName
        ? `${feature.properties.regionName}, ${countryName}`
        : feature.properties.regionName,
      format: "jsonv2",
      addressdetails: "1",
      limit: "1",
    });
    params.set("accept-language", "zh-CN,zh,en");

    const response = await fetch(
      `${SOURCES.geocodeSearch}?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to translate region: ${response.status}`);
    }

    const results = await response.json();
    return extractChinesePlaceName(results[0], feature.properties.regionName);
  }

  function getCountryLabel(countryMeta) {
    return getCountryDisplayName(state.language, countryMeta);
  }

  function getCountryLabelByIso(iso) {
    return getCountryLabel(state.adm0ByIso.get(iso));
  }

  function getRegionLabel(feature) {
    return getRegionDisplayName(
      state.language,
      feature?.properties?.regionName ?? "",
      state.placeNames.regions[feature?.properties?.visitKey] ?? "",
    );
  }

  function getSavedRegionLabel(visitKey, value) {
    return getRegionDisplayName(
      state.language,
      value.regionName,
      state.placeNames.regions[visitKey] ?? "",
    );
  }

  function getSavedCountryLabel(visitKey, value) {
    return getCountryLabelByIso(value.iso) || value.countryName;
  }

  function translate(key, params = {}) {
    return t(state.language, key, params);
  }

  function persistUiState() {
    saveUiState({
      selectedContinent: validateContinent(state.selectedContinent),
      selectedCountryIso: state.selectedCountryIso,
      selectedRegionKey: state.selectedRegionKey,
      regionQuery: dom.regionInput.value,
      visitType: dom.visitTypeSelect.value,
    });
  }

  function validateContinent(continentId) {
    return CONTINENTS.some((continent) => continent.id === continentId)
      ? continentId
      : "asia";
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
