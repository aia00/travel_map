const TRANSLATIONS = {
  en: {
    pageTitle: "Visited Administrative Map",
    eyebrow: "Visited Atlas",
    languageSwitchAria: "Language switch",
    heroTitle: "Track your footprints by continent, country, and region.",
    heroText:
      "Choose a continent, open a country, then mark states, provinces, prefectures, or equivalent first-level divisions by search or directly on the map.",
    metrics: {
      total: "Total Marks",
    },
    sections: {
      continents: "Continents",
      markPlaces: "Mark Places",
      currentSelection: "Current Selection",
      saved: "Saved",
      continentView: "Continent View",
      adminLevel1: "Administrative Level 1",
    },
    continentSectionTitle:
      "Choose a continent first, then drill into each country’s administrative regions.",
    markPlacesTitle: "Search and color-code",
    savedTitle: "Marked regions in this country",
    fields: {
      country: "Country",
      countryPlaceholder: "Select a country",
      regionSearch: "Region search",
      visitType: "Visit type",
    },
    regionPlaceholder:
      "Search a state, province, prefecture, or equivalent",
    buttons: {
      addOrUpdate: "Add / update color",
      clearCurrent: "Clear current mark",
      clear: "Clear",
      delete: "Delete",
    },
    labels: {
      unmarked: "Unmarked",
    },
    selection: {
      emptyTitle: "No region selected yet",
      emptyMeta: "Click a map region or type into the search box.",
      meta: "{country} · Current status: {status}",
    },
    search: {
      noMatches: "No matches found",
    },
    saved: {
      emptySelectCountry: "Select a country first.",
      emptyNoRegions:
        "No marked regions in this country yet. Click a region on the map to color it.",
    },
    visitTypes: {
      resident: {
        label: "Resident",
        description: "Long-term living, working, or sustained stay.",
      },
      travel: {
        label: "Travel",
        description: "Trips, business travel, study, or short visits.",
      },
      transit: {
        label: "Transit",
        description: "Passing through, layovers, transfers, or brief stops.",
      },
    },
    continents: {
      asia: "Asia",
      europe: "Europe",
      africa: "Africa",
      "north-america": "North America",
      "south-america": "South America",
      oceania: "Oceania",
      antarctica: "Antarctica",
    },
    map: {
      continentTitleSuffix: "Map",
      countryTitleSuffix: "Administrative Level 1",
      continentMeta:
        "Visited {visitedCount}/{count} countries or territories in this continent. Click the map or dropdown to switch countries.",
      continentMarkedRegions: "Marked regions: {count}",
      continentNoMarks: "No marks yet.",
      continentBreakdown:
        "{residentLabel} {resident} / {travelLabel} {travel} / {transitLabel} {transit}",
      countryMetaFallback:
        "ADM1 is unavailable for this country, so the view falls back to the country boundary.",
      countryMetaLoaded:
        "Visited {visitedCount}/{count} first-level administrative regions. Click a region to mark it.",
      countryTitleEmpty: "Administrative map",
      adminStatus: "Status: {status}",
      emptyContinent:
        "No country boundaries are available for this continent right now.",
      emptyCountryPrompt:
        "Select a country to view its first-level administrative regions.",
      emptyCountryLoading: "First-level boundaries are still loading.",
      emptyCountryNoAdm1:
        "This country does not have displayable first-level administrative boundaries.",
      emptyCountryUnavailable:
        "Unable to load first-level administrative boundaries right now.",
      emptyContinentLoad:
        "Failed to load the world map. Refresh the page and try again.",
      emptyContinentNoCountryData:
        "This continent does not currently have loadable country data.",
    },
    status: {
      loadingGlobalData: "Loading global country metadata and base map…",
      ready: "The map is ready.",
      initError:
        "Initialization failed. Make sure your browser can reach the external data sources.",
      loadingCountry:
        "Loading first-level administrative boundaries for {country}…",
      loadedCountry:
        "Loaded first-level administrative boundaries for {country}.",
      countryLoadError: "Failed to load first-level administrative boundaries.",
      selectCountryFirst: "Select a country first.",
      enterRegion: "Enter a region name.",
      regionNotFound:
        "No matching region was found. Pick one from the suggestions first.",
      multipleMatches:
        "Multiple regions matched. Pick the exact one before saving.",
      savedVisit: "{region} is now marked as {type}.",
      saveFailed: "Failed to save the mark. Try again.",
      selectRegionFirst:
        "Select a region from the map or search results first.",
      noMarkToClear: "The selected region does not have a mark yet.",
      clearedVisit: "Cleared the mark for {region}.",
      updatedVisit: "Updated {region} to {type}.",
      deletedVisit: "Deleted the mark for {region}.",
    },
    aria: {
      continentMap: "Continent map",
      countryMap: "Administrative map",
    },
  },
  zh: {
    pageTitle: "足迹行政区地图",
    eyebrow: "Visited Atlas",
    languageSwitchAria: "语言切换",
    heroTitle: "按大洲整理你的足迹，再细到每个国家的一级行政区。",
    heroText:
      "先选大洲，再选国家。地图会加载该国的州、省、郡或同级一级行政区；你可以通过搜索或点击地图，把地区标记为常住、途径或旅行。",
    metrics: {
      total: "总标记数",
    },
    sections: {
      continents: "大洲",
      markPlaces: "标记地区",
      currentSelection: "当前选择",
      saved: "已保存",
      continentView: "大洲视图",
      adminLevel1: "一级行政区",
    },
    continentSectionTitle: "先切换大洲，再进入国家一级行政区。",
    markPlacesTitle: "搜索并上色",
    savedTitle: "当前国家已标记地区",
    fields: {
      country: "国家",
      countryPlaceholder: "请选择国家",
      regionSearch: "地区搜索",
      visitType: "足迹类型",
    },
    regionPlaceholder: "输入州、省、府、郡等一级行政区名称",
    buttons: {
      addOrUpdate: "添加 / 更新颜色",
      clearCurrent: "清除当前标记",
      clear: "清除",
      delete: "删除",
    },
    labels: {
      unmarked: "未标记",
    },
    selection: {
      emptyTitle: "还没有选中地区",
      emptyMeta: "可以点击地图，或在搜索框里输入地区名称。",
      meta: "{country} · 当前状态：{status}",
    },
    search: {
      noMatches: "没有找到匹配项",
    },
    saved: {
      emptySelectCountry: "先选择一个国家。",
      emptyNoRegions:
        "这个国家还没有标记地区。选中地图区域后，可以一键上色。",
    },
    visitTypes: {
      resident: {
        label: "常住",
        description: "长期生活、工作或稳定停留。",
      },
      travel: {
        label: "旅行",
        description: "旅行、出差、游学、短期访问。",
      },
      transit: {
        label: "途径",
        description: "路过、转机、换乘、短暂停留。",
      },
    },
    continents: {
      asia: "亚洲",
      europe: "欧洲",
      africa: "非洲",
      "north-america": "北美洲",
      "south-america": "南美洲",
      oceania: "大洋洲",
      antarctica: "南极洲",
    },
    map: {
      continentTitleSuffix: "地图",
      countryTitleSuffix: "一级行政区",
      continentMeta:
        "本大洲已访问 {visitedCount}/{count} 个国家 / 地区。点击地图或下拉框切换国家。",
      continentMarkedRegions: "已标记地区：{count}",
      continentNoMarks: "还没有标记。",
      continentBreakdown:
        "{residentLabel} {resident} / {travelLabel} {travel} / {transitLabel} {transit}",
      countryMetaFallback: "该国家未能加载 ADM1，当前退回到国家边界视图。",
      countryMetaLoaded:
        "已访问 {visitedCount}/{count} 个一级行政区。点击区域可直接标记。",
      countryTitleEmpty: "一级行政区地图",
      adminStatus: "状态：{status}",
      emptyContinent: "这个大洲当前没有可展示的国家边界。",
      emptyCountryPrompt: "先选择一个国家，再查看一级行政区地图。",
      emptyCountryLoading: "一级行政区边界还在加载中。",
      emptyCountryNoAdm1: "当前国家没有可展示的一级行政区边界。",
      emptyCountryUnavailable: "当前无法加载一级行政区边界。",
      emptyContinentLoad: "加载全球地图失败。请刷新页面后重试。",
      emptyContinentNoCountryData: "这个大洲当前没有可加载的国家数据。",
    },
    status: {
      loadingGlobalData: "正在加载全球国家元数据和地图底图…",
      ready: "地图已准备好，可以开始标记。",
      initError: "初始化失败：请确认浏览器能访问外部数据源。",
      loadingCountry: "正在加载 {country} 的一级行政区边界…",
      loadedCountry: "已加载 {country} 的一级行政区边界。",
      countryLoadError: "一级行政区边界加载失败。",
      selectCountryFirst: "请先选择国家。",
      enterRegion: "请输入地区名称。",
      regionNotFound: "没有找到这个地区，请从候选结果里点选。",
      multipleMatches: "匹配到多个地区，请先点选具体地区。",
      savedVisit: "{region} 已标记为 {type}。",
      saveFailed: "保存标记失败，请稍后重试。",
      selectRegionFirst: "请先点击地图或从搜索结果里选择地区。",
      noMarkToClear: "当前地区还没有颜色标记。",
      clearedVisit: "{region} 的标记已清除。",
      updatedVisit: "{region} 已更新为 {type}。",
      deletedVisit: "{region} 的标记已删除。",
    },
    aria: {
      continentMap: "大洲地图",
      countryMap: "一级行政区地图",
    },
  },
};

export function t(language, key, params = {}) {
  const bundle = TRANSLATIONS[language] ?? TRANSLATIONS.en;
  const value = key.split(".").reduce((current, part) => current?.[part], bundle);
  return typeof value === "string" ? formatMessage(value, params) : key;
}

export function getVisitTypeLabel(language, type) {
  return t(language, `visitTypes.${type}.label`);
}

export function getContinentLabel(language, continentId) {
  return t(language, `continents.${continentId}`);
}

export function formatContinentTitle(language, continentId) {
  const label = getContinentLabel(language, continentId);
  const suffix = t(language, "map.continentTitleSuffix");
  return language === "zh" ? `${label}${suffix}` : `${label} ${suffix}`;
}

export function formatCountryTitle(language, countryName) {
  const suffix = t(language, "map.countryTitleSuffix");
  return language === "zh" ? `${countryName}${suffix}` : `${countryName} ${suffix}`;
}

export function applyStaticTranslations({ dom, language }) {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.title = t(language, "pageTitle");

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(language, node.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(language, node.dataset.i18nPlaceholder);
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    node.setAttribute("aria-label", t(language, node.dataset.i18nAriaLabel));
  });

  [...dom.visitTypeSelect.options].forEach((option) => {
    option.textContent = getVisitTypeLabel(language, option.value);
  });

  dom.continentMap.setAttribute("aria-label", t(language, "aria.continentMap"));
  dom.countryMap.setAttribute("aria-label", t(language, "aria.countryMap"));

  dom.langButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.lang === language);
  });
}

function formatMessage(template, params) {
  return template.replace(/\{(\w+)\}/g, (_, token) => `${params[token] ?? ""}`);
}
