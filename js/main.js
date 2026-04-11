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
  findAdministrativeNameMatches,
  findFeatureContainingPoint,
  findMatches,
  getCountriesForContinent,
  loadWorldData,
  normalizeText,
  searchPlaceResults,
} from "./mapData.js";
import {
  findAirportCandidates,
  looksLikeAirportCode,
  toAlpha3CountryCode,
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
  renderArchiveSummary,
  renderMetrics,
  renderSearchCandidates,
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
  const savedUiState = {
    ...loadUiState(),
    ...loadUrlState(),
  };

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
    globalSearchCache: new Map(),
    lastPlaceSearchAt: 0,
    regionNameRequests: new Map(),
    countryNamesReady: false,
    visited: loadVisited(),
    requestToken: 0,
    searchToken: 0,
    searchTimer: 0,
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
      clearSearchResults();
      persistUiState();
      renderSelectionPanel();
      renderContinentView();
      renderArchivePanel();
      await loadSelectedCountry();
      renderCountryView();
    });

    boundDom.regionInput.addEventListener("input", () => {
      persistUiState();
      if (!boundDom.regionInput.value.trim()) {
        clearSearchResults();
        return;
      }

      const selectedFeature = getSelectedFeature();
      if (
        selectedFeature &&
        !queryMatchesSelectedFeature(boundDom.regionInput.value, selectedFeature)
      ) {
        boundState.selectedRegionKey = null;
        persistUiState();
        renderSelectionPanel();
        renderCountryView();
      }

      scheduleSearch(boundDom.regionInput.value);
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
          renderActiveSearchResults();
        } else {
          renderContinentTabsView();
          renderSelectionPanel();
          renderArchivePanel();
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
    renderArchivePanel();
    renderMetricCards();
    setStatus("status.loadingGlobalData", "loading");

    try {
      const worldData = await loadWorldData();
      currentState.adm0Meta = worldData.adm0Meta;
      currentState.adm0ByIso = worldData.adm0ByIso;
      currentState.worldFeatures = worldData.worldFeatures;
      ensureCountryNamesReady();
      syncContinentWithSelectedCountry();

      ensureSelectedCountry();
      persistUiState();
      renderCountrySelectView();
      renderContinentView();
      await loadSelectedCountry();
      renderAll();
      if (dom.regionInput.value.trim() && !state.selectedRegionKey) {
        scheduleSearch(dom.regionInput.value, { immediate: true, preserveStatus: true });
      }
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
      renderArchivePanel();
      renderSelectionPanel();
      renderActiveSearchResults();
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

    try {
      const query = dom.regionInput.value.trim();

      if (!query) {
        setStatus("status.enterRegion", "error");
        return;
      }

      const selectedFeature = getSelectedFeature();
      if (selectedFeature && queryMatchesSelectedFeature(query, selectedFeature)) {
        const type = dom.visitTypeSelect.value;
        saveVisit(selectedFeature, type, {
          query,
          statusKey: "status.savedVisit",
        });
        return;
      }

      const matches = await runSearch(query, { explicit: true });

      if (!matches.length) {
        return;
      }
    } catch (error) {
      console.error(error);
      setStatus("status.placeLookupError", "error");
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

  function syncContinentWithSelectedCountry() {
    const meta = state.adm0ByIso.get(state.selectedCountryIso);

    if (meta?.uiContinent) {
      state.selectedContinent = meta.uiContinent;
    }
  }

  function renderAll() {
    renderContinentTabsView();
    renderCountrySelectView();
    renderContinentView();
    renderCountryView();
    renderSelectionPanel();
    renderArchivePanel();
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
        clearSearchResults();
        ensureSelectedCountry();
        persistUiState();
        renderContinentTabsView();
        renderCountrySelectView();
        renderContinentView();
        renderSelectionPanel();
        renderArchivePanel();
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
        clearSearchResults();
        persistUiState();
        renderCountrySelectView();
        renderContinentView();
        renderSelectionPanel();
        renderArchivePanel();
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
      activeVisitType: dom.visitTypeSelect.value,
      countryName: selectedFeature ? getCountryLabelByIso(selectedFeature.properties.iso) : "",
      t: translate,
      getVisitTypeLabel: getVisitLabel,
      onApplyType: (type) => {
        dom.visitTypeSelect.value = type;
        persistUiState();
        renderSelectionPanel();
      },
      onClear: clearCurrentSelection,
    });
  }

  function renderArchivePanel() {
    const countryCount = new Set(
      Object.values(state.visited).map((entry) => entry.iso),
    ).size;
    const currentCountryCount = state.selectedCountryIso
      ? Object.values(state.visited).filter((entry) => entry.iso === state.selectedCountryIso)
          .length
      : 0;

    renderArchiveSummary({
      dom,
      totals: {
        total: Object.keys(state.visited).length,
        countries: countryCount,
      },
      currentCountryCount,
      t: translate,
    });
  }

  function renderMetricCards() {
    renderMetrics({
      dom,
      values: Object.values(state.visited),
    });
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
    clearSearchResults();
    renderSelectionPanel();
    renderCountryView();
    renderArchivePanel();
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
    clearSearchResults();
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
    persistUiState();
    clearSearchResults();
    renderSelectionPanel();
    renderCountryView();
    renderArchivePanel();
  }

  function clearSelectedCountry() {
    if (!state.selectedCountryIso && !state.selectedRegionKey && !dom.regionInput.value) {
      return;
    }

    state.selectedCountryIso = null;
    state.selectedRegionKey = null;
    dom.regionInput.value = "";
    persistUiState();
    clearSearchResults();
    renderCountrySelectView();
    renderContinentView();
    renderSelectionPanel();
    renderArchivePanel();
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

  function renderActiveSearchResults(emptyText = "") {
    renderSearchCandidates({
      dom,
      candidates: state.activeMatches,
      emptyText,
      getCandidateTitle,
      getCandidateMeta,
      getCandidateBadge,
      onSelectCandidate: (candidate) => {
        selectSearchCandidate(candidate);
      },
    });
  }

  function clearSearchResults() {
    if (state.searchTimer) {
      window.clearTimeout(state.searchTimer);
      state.searchTimer = 0;
    }

    state.searchToken += 1;
    state.activeMatches = [];
    renderActiveSearchResults();
  }

  function scheduleSearch(query, { immediate = false, preserveStatus = false } = {}) {
    if (state.searchTimer) {
      window.clearTimeout(state.searchTimer);
      state.searchTimer = 0;
    }

    if (!query.trim()) {
      clearSearchResults();
      return;
    }

    const execute = () => {
      state.searchTimer = 0;
      runSearch(query, { explicit: false, preserveStatus }).catch((error) => {
        console.error(error);
        setStatus("status.placeLookupError", "error");
      });
    };

    if (immediate) {
      execute();
      return;
    }

    state.searchTimer = window.setTimeout(execute, 320);
  }

  async function runSearch(query, { explicit = false, preserveStatus = false } = {}) {
    const normalizedQuery = normalizeText(query);

    if (!normalizedQuery) {
      clearSearchResults();
      return [];
    }

    const token = ++state.searchToken;

    if (explicit || !preserveStatus) {
      setStatus("search.loading", "loading");
    }

    const matches = await lookupSearchCandidates(query);

    if (token !== state.searchToken) {
      return [];
    }

    state.activeMatches = matches.slice(0, 8);
    renderActiveSearchResults(
      matches.length ? "" : translate("search.placeNoMatches"),
    );
    queueVisibleRegionNames();

    if (matches.length) {
      setStatus(
        explicit ? "status.searchResultsReady" : "search.pickResult",
        "success",
        { count: matches.length },
      );
    } else if (explicit) {
      setStatus("status.regionNotFound", "error");
    }

    return matches;
  }

  async function lookupSearchCandidates(query) {
    const normalizedQuery = normalizeText(query);
    const cacheKey = `${state.language}::${state.selectedCountryIso ?? "ALL"}::${normalizedQuery}`;

    if (state.globalSearchCache.has(cacheKey)) {
      return state.globalSearchCache.get(cacheKey);
    }

    const lookupPromise = (async () => {
      const localCandidates = await lookupLocalRegionCandidates(query);
      const airportCandidates = looksLikeAirportCode(query)
        ? await lookupGlobalAirportCandidates(query)
        : [];
      const placeCandidates = await lookupGlobalPlaceCandidates(query);

      return dedupeCandidates(
        [
          ...localCandidates,
          ...airportCandidates,
          ...placeCandidates,
        ],
        query,
      );
    })().catch((error) => {
      state.globalSearchCache.delete(cacheKey);
      throw error;
    });

    state.globalSearchCache.set(cacheKey, lookupPromise);
    return lookupPromise;
  }

  async function lookupLocalRegionCandidates(query) {
    if (!state.selectedCountryIso) {
      return [];
    }

    const data = await ensureAdminData(state, state.selectedCountryIso);
    return findMatches(data.features, query)
      .slice(0, 6)
      .map((feature) => createRegionCandidate(feature));
  }

  async function lookupGlobalPlaceCandidates(query) {
    const normalizedQuery = normalizeText(query);
    const cacheKey = `${state.language}::global-place::${normalizedQuery}`;

    if (state.placeSearchCache.has(cacheKey)) {
      return state.placeSearchCache.get(cacheKey);
    }

    const lookupPromise = (async () => {
      const results = await throttlePlaceLookup(() =>
        searchPlaceResults({
          query,
          language: state.language,
        }),
      );
      const countryIsos = [...new Set(
        results
          .map((candidate) => toAlpha3CountryCode(candidate.address?.country_code))
          .filter((iso) => state.adm0ByIso.has(iso)),
      )];

      await Promise.all(
        countryIsos.map((iso) =>
          ensureAdminData(state, iso).catch(() => null),
        ),
      );

      return dedupeCandidates(
        results.flatMap((candidate) => {
          const iso = toAlpha3CountryCode(candidate.address?.country_code);
          const data = state.adminDataByIso.get(iso);

          if (!iso || !data) {
            return [];
          }

          const feature =
            findFeatureContainingPoint(data.features, [
              Number(candidate.lon),
              Number(candidate.lat),
            ]) ??
            findAdministrativeNameMatches(data.features, candidate.address ?? {})[0];

          if (!feature) {
            return [];
          }

          return [createPlaceCandidate(candidate, feature, iso)];
        }),
      );
    })().catch((error) => {
      state.placeSearchCache.delete(cacheKey);
      throw error;
    });

    state.placeSearchCache.set(cacheKey, lookupPromise);
    return lookupPromise;
  }

  async function lookupGlobalAirportCandidates(query) {
    const airports = await findAirportCandidates(query);
    const countryIsos = [...new Set(
      airports
        .map((airport) => toAlpha3CountryCode(airport.countryAlpha2))
        .filter((iso) => state.adm0ByIso.has(iso)),
    )];

    await Promise.all(
      countryIsos.map((iso) =>
        ensureAdminData(state, iso).catch(() => null),
      ),
    );

    return dedupeCandidates(
      airports.flatMap((airport) => {
        const iso = toAlpha3CountryCode(airport.countryAlpha2);
        const data = state.adminDataByIso.get(iso);

        if (!iso || !data) {
          return [];
        }

        const feature = findFeatureContainingPoint(data.features, [
          airport.longitude,
          airport.latitude,
        ]);

        if (!feature) {
          return [];
        }

        return [createAirportCandidate(airport, feature, iso)];
      }),
    );
  }

  async function selectSearchCandidate(candidate) {
    const meta = state.adm0ByIso.get(candidate.iso);

    if (!meta) {
      return;
    }

    state.selectedContinent = meta.uiContinent ?? state.selectedContinent;
    state.selectedCountryIso = candidate.iso;
    state.selectedRegionKey = candidate.feature.properties.visitKey;
    dom.regionInput.value = candidate.feature.properties.regionName;
    persistUiState();
    clearSearchResults();
    renderContinentTabsView();
    renderCountrySelectView();
    renderContinentView();
    renderArchivePanel();
    await loadSelectedCountry();
    renderSelectionPanel();
    renderCountryView();
    setStatus("status.resultSelected", "success", {
      region: getRegionLabel(candidate.feature),
      country: getCountryLabelByIso(candidate.iso),
    });
  }

  function createRegionCandidate(feature) {
    return {
      id: `region:${feature.properties.visitKey}`,
      source: "region",
      iso: feature.properties.iso,
      feature,
      matchedName: feature.properties.regionName,
    };
  }

  function createPlaceCandidate(candidate, feature, iso) {
    return {
      id: `place:${iso}:${feature.properties.visitKey}:${normalizeText(getPlaceCandidateName(candidate))}`,
      source: "place",
      iso,
      feature,
      matchedName: getPlaceCandidateName(candidate),
    };
  }

  function createAirportCandidate(airport, feature, iso) {
    return {
      id: `airport:${iso}:${feature.properties.visitKey}:${airport.matchedCode}:${airport.ident}`,
      source: "airport",
      iso,
      feature,
      matchedName: airport.name || airport.municipality || airport.matchedCode,
      municipality: airport.municipality || "",
      code: airport.matchedCode,
    };
  }

  function getCandidateTitle(candidate) {
    if (candidate.source === "airport") {
      return candidate.matchedName && normalizeText(candidate.matchedName) !== normalizeText(candidate.code)
        ? `${candidate.code} · ${candidate.matchedName}`
        : candidate.code;
    }

    if (
      candidate.source === "place" &&
      normalizeText(candidate.matchedName) !== normalizeText(candidate.feature.properties.regionName)
    ) {
      return candidate.matchedName;
    }

    return getRegionLabel(candidate.feature);
  }

  function getCandidateMeta(candidate) {
    const parts = [];

    if (candidate.source === "airport" && candidate.municipality) {
      parts.push(candidate.municipality);
    }

    const lastPart = parts[parts.length - 1] ?? "";

    if (
      candidate.source !== "region" ||
      !parts.length ||
      normalizeText(lastPart) !== normalizeText(candidate.feature.properties.regionName)
    ) {
      parts.push(getRegionLabel(candidate.feature));
    }

    parts.push(getCountryLabelByIso(candidate.iso));

    return [...new Set(parts.filter(Boolean))].join(" · ");
  }

  function getCandidateBadge(candidate) {
    return translate(`search.badges.${candidate.source}`);
  }

  function dedupeCandidates(candidates, query = "") {
    const deduped = [...new Map(
      candidates.map((candidate) => [
        candidate.feature?.properties?.visitKey ?? candidate.id,
        candidate,
      ]),
    ).values()];

    return deduped.sort((left, right) => sortCandidates(left, right, query));
  }

  function sortCandidates(left, right, query) {
    const leftSelectedCountry = left.iso === state.selectedCountryIso ? 1 : 0;
    const rightSelectedCountry = right.iso === state.selectedCountryIso ? 1 : 0;

    if (leftSelectedCountry !== rightSelectedCountry) {
      return rightSelectedCountry - leftSelectedCountry;
    }

    const sourceWeight = {
      airport: 3,
      place: 2,
      region: 1,
    };

    const leftWeight = sourceWeight[left.source] ?? 0;
    const rightWeight = sourceWeight[right.source] ?? 0;

    if (leftWeight !== rightWeight) {
      return rightWeight - leftWeight;
    }

    const normalizedQuery = normalizeText(query);
    const leftScore = normalizeText(getCandidateTitle(left)).startsWith(normalizedQuery) ? 1 : 0;
    const rightScore = normalizeText(getCandidateTitle(right)).startsWith(normalizedQuery) ? 1 : 0;

    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    return getCandidateMeta(left).localeCompare(getCandidateMeta(right));
  }

  function queryMatchesSelectedFeature(query, feature) {
    const normalizedQuery = normalizeText(query);
    return (
      normalizedQuery === normalizeText(feature.properties.regionName) ||
      normalizedQuery === normalizeText(getRegionLabel(feature))
    );
  }

  function getPlaceCandidateName(candidate) {
    return String(
      candidate.name ||
        candidate.address?.city ||
        candidate.address?.town ||
        candidate.address?.village ||
        candidate.address?.municipality ||
        candidate.address?.county ||
        String(candidate.display_name ?? "").split(",")[0],
    ).trim();
  }

  function throttlePlaceLookup(task) {
    return (async () => {
      const elapsed = Date.now() - state.lastPlaceSearchAt;

      if (elapsed < 1100) {
        await wait(1100 - elapsed);
      }

      state.lastPlaceSearchAt = Date.now();
      return task();
    })();
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
    if (state.language !== "zh") {
      return;
    }

    const visibleFeatures = [];
    const selectedFeature = getSelectedFeature();

    if (selectedFeature) {
      visibleFeatures.push(selectedFeature);
    }

    state.activeMatches.slice(0, 8).forEach((candidate) => {
      if (candidate.feature) {
        visibleFeatures.push(candidate.feature);
      }
    });

    if (state.selectedCountryIso) {
      const currentData = state.adminDataByIso.get(state.selectedCountryIso);

      if (currentData?.features?.length) {
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
      }
    }

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
        renderActiveSearchResults();
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

function loadUrlState() {
  const params = new URLSearchParams(window.location.search);
  const state = {};
  const continent = params.get("continent");
  const country = params.get("country");
  const region = params.get("region");
  const query = params.get("query");

  if (continent) {
    state.selectedContinent = continent;
  }

  if (country) {
    state.selectedCountryIso = country;
  }

  if (region) {
    state.selectedRegionKey = region;
  }

  if (query) {
    state.regionQuery = query;
  }

  return state;
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
