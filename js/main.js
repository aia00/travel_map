import { CONTINENTS, VISIT_PRIORITY, VISIT_TYPES } from "./config.js";
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
  getCountriesForContinent,
  loadWorldData,
  normalizeText,
} from "./mapData.js";
import {
  renderContinentMap,
  renderContinentMapError,
  renderContinentTabs,
  renderCountryMap,
  renderCountryMapError,
  renderCountrySelect,
} from "./renderMaps.js";
import {
  renderMatches,
  renderMetrics,
  renderSavedList,
  renderSelectionCard,
  renderStatus,
} from "./renderPanels.js";
import {
  loadLanguage,
  loadUiState,
  loadVisited,
  saveLanguage,
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
      boundState.selectedCountryIso = event.target.value;
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
      country: meta?.boundaryName ?? iso,
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
        country: meta?.boundaryName ?? iso,
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
      const matches = exact ? [exact] : findMatches(data.features, query);

      if (!matches.length) {
        setStatus("status.regionNotFound", "error");
        state.activeMatches = renderSearchMatches(query);
        return;
      }

      if (!exact && matches.length > 1) {
        state.activeMatches = renderSearchMatches(query);
        setStatus("status.multipleMatches", "error");
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
      saveVisited(state.visited);
      persistUiState();
      renderAll();
      setStatus("status.savedVisit", "success", {
        region: feature.properties.regionName,
        type: getVisitLabel(type),
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
    setStatus("status.clearedVisit", "success", { region: label });
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
        count: countries.length,
      }),
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
    });
  }

  function renderCountryView() {
    const countryData = state.adminDataByIso.get(state.selectedCountryIso);
    const countryMeta = state.adm0ByIso.get(state.selectedCountryIso);

    if (countryMeta) {
      dom.countryTitle.textContent = formatCountryTitle(
        state.language,
        countryMeta.boundaryName,
      );
      dom.countryMeta.textContent = countryData?.fallback
        ? translate("map.countryMetaFallback")
        : translate("map.countryMetaLoaded", {
            count: countryData?.features?.length ?? 0,
          });
    }

    renderCountryMap({
      dom,
      selectedCountryIso: state.selectedCountryIso,
      countryMeta,
      countryData,
      selectedRegionKey: state.selectedRegionKey,
      getRegionFill,
      t: translate,
      onSelectRegion: (feature) => {
        selectFeature(feature);
      },
      getVisitLabel: (visitKey) => {
        const visit = state.visited[visitKey];
        return visit ? getVisitLabel(visit.type) : translate("labels.unmarked");
      },
    });

    if (countryData?.features) {
      updateRegionSuggestions(countryData.features);
    } else {
      updateRegionSuggestions([]);
    }
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
      selectedVisit,
      countryName,
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
          region: selectedFeature.properties.regionName,
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
          region: value.regionName,
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
    return renderMatches({
      dom,
      query,
      selectedCountryIso: state.selectedCountryIso,
      data: state.adminDataByIso.get(state.selectedCountryIso),
      findMatches,
      t: translate,
      onSelectRegion: (feature) => {
        selectFeature(feature);
      },
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

  function selectFeature(feature) {
    state.selectedRegionKey = feature.properties.visitKey;
    dom.regionInput.value = feature.properties.regionName;
    persistUiState();
    state.activeMatches = renderSearchMatches(feature.properties.regionName);
    renderSelectionPanel();
    renderCountryView();
    renderSavedRegions();
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
