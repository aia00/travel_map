const STORAGE_KEYS = {
  visited: "visited-admin-map-v1",
  flights: "visited-admin-map-flights-v1",
  language: "visited-admin-map-language-v1",
  uiState: "visited-admin-map-ui-state-v1",
  placeNames: "visited-admin-map-place-names-v1",
};

const DEFAULT_UI_STATE = {
  selectedContinent: "asia",
  selectedCountryIso: null,
  selectedRegionKey: null,
  regionQuery: "",
  visitType: "travel",
};

export function saveVisited(visited) {
  localStorage.setItem(
    STORAGE_KEYS.visited,
    JSON.stringify({
      version: 1,
      visited,
    }),
  );
}

export function loadVisited() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.visited) ?? "{}");
    return parsed.visited ?? {};
  } catch (error) {
    console.warn("Failed to load saved visits", error);
    return {};
  }
}

export function saveFlights(flights) {
  localStorage.setItem(
    STORAGE_KEYS.flights,
    JSON.stringify({
      version: 1,
      flights,
    }),
  );
}

export function loadFlights() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.flights) ?? "{}");
    return Array.isArray(parsed.flights) ? parsed.flights : [];
  } catch (error) {
    console.warn("Failed to load saved flights", error);
    return [];
  }
}

export function saveLanguage(language) {
  localStorage.setItem(STORAGE_KEYS.language, language);
}

export function loadLanguage() {
  const saved = localStorage.getItem(STORAGE_KEYS.language);
  if (saved === "zh" || saved === "en") {
    return saved;
  }

  const browserLanguage = navigator.language?.toLowerCase?.() ?? "";
  return browserLanguage.startsWith("zh") ? "zh" : "en";
}

export function saveUiState(partialState) {
  const nextState = {
    ...loadUiState(),
    ...partialState,
  };
  localStorage.setItem(STORAGE_KEYS.uiState, JSON.stringify(nextState));
}

export function loadUiState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.uiState) ?? "{}");
    return {
      ...DEFAULT_UI_STATE,
      ...parsed,
    };
  } catch (error) {
    console.warn("Failed to load saved UI state", error);
    return { ...DEFAULT_UI_STATE };
  }
}

export function savePlaceNames(placeNames) {
  localStorage.setItem(
    STORAGE_KEYS.placeNames,
    JSON.stringify({
      version: 1,
      placeNames,
    }),
  );
}

export function loadPlaceNames() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.placeNames) ?? "{}");
    return {
      regions: {},
      ...parsed.placeNames,
    };
  } catch (error) {
    console.warn("Failed to load place name cache", error);
    return {
      regions: {},
    };
  }
}
