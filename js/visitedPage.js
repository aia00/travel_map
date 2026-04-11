import { t, getVisitTypeLabel } from "./i18n.js";
import { loadWorldData, normalizeText } from "./mapData.js";
import {
  ensureZhCountryNamesLoaded,
  getCountryDisplayName,
  getRegionDisplayName,
} from "./placeNames.js";
import {
  loadLanguage,
  loadPlaceNames,
  loadVisited,
  saveLanguage,
} from "./storage.js";

const dom = {
  archiveCount: document.querySelector("#archiveCount"),
  archiveFilter: document.querySelector("#archiveFilter"),
  archiveList: document.querySelector("#archivePageList"),
  langButtons: [...document.querySelectorAll(".lang-button")],
};

const state = {
  language: loadLanguage(),
  placeNames: loadPlaceNames(),
  visited: loadVisited(),
  adm0ByIso: new Map(),
  filter: "",
};

applyPageTranslations();
bindEvents();
initialize();

function bindEvents() {
  dom.archiveFilter.addEventListener("input", () => {
    state.filter = dom.archiveFilter.value;
    renderArchiveList();
  });

  dom.langButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.dataset.lang === state.language) {
        return;
      }

      state.language = button.dataset.lang;
      saveLanguage(state.language);
      if (state.language === "zh") {
        await ensureZhCountryNamesLoaded().catch((error) => {
          console.warn("Failed to load Chinese country names", error);
        });
      }
      applyPageTranslations();
      renderArchiveList();
    });
  });
}

async function initialize() {
  if (state.language === "zh") {
    await ensureZhCountryNamesLoaded().catch((error) => {
      console.warn("Failed to load Chinese country names", error);
    });
  }

  try {
    const worldData = await loadWorldData();
    state.adm0ByIso = worldData.adm0ByIso;
  } catch (error) {
    console.warn("Failed to load world metadata for archive page", error);
  }

  renderArchiveList();
}

function applyPageTranslations() {
  document.documentElement.lang = state.language === "zh" ? "zh-CN" : "en";
  document.title = t(state.language, "archive.pageTitle");

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(state.language, node.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(state.language, node.dataset.i18nPlaceholder);
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    node.setAttribute("aria-label", t(state.language, node.dataset.i18nAriaLabel));
  });

  dom.langButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.lang === state.language);
  });
}

function renderArchiveList() {
  const entries = Object.entries(state.visited)
    .filter(([visitKey, value]) => matchesArchiveFilter(visitKey, value))
    .sort((left, right) => {
      const leftCountry = getCountryLabel(left[1]);
      const rightCountry = getCountryLabel(right[1]);
      if (leftCountry !== rightCountry) {
        return leftCountry.localeCompare(rightCountry);
      }

      return left[1].regionName.localeCompare(right[1].regionName);
    });

  dom.archiveCount.textContent = t(state.language, "archive.count", {
    count: entries.length,
  });

  if (!entries.length) {
    dom.archiveList.innerHTML = `<div class="saved-empty">${t(state.language, "archive.empty")}</div>`;
    return;
  }

  const groups = new Map();
  entries.forEach(([visitKey, value]) => {
    const iso = value.iso || "UNKNOWN";
    const items = groups.get(iso) ?? [];
    items.push([visitKey, value]);
    groups.set(iso, items);
  });

  dom.archiveList.innerHTML = "";

  [...groups.entries()].forEach(([iso, items]) => {
    const section = document.createElement("section");
    section.className = "archive-country-group";

    const header = document.createElement("div");
    header.className = "archive-country-header";
    const headerCopy = document.createElement("div");
    const headerTitle = document.createElement("h3");
    headerTitle.textContent = getCountryLabel(items[0][1]);
    const headerMeta = document.createElement("p");
    headerMeta.textContent = t(state.language, "archive.count", {
      count: items.length,
    });
    headerCopy.appendChild(headerTitle);
    headerCopy.appendChild(headerMeta);
    header.appendChild(headerCopy);

    const list = document.createElement("div");
    list.className = "archive-country-list";

    items.forEach(([visitKey, value]) => {
      const item = document.createElement("article");
      item.className = "archive-entry";
      const copy = document.createElement("div");
      copy.className = "archive-entry-copy";

      const title = document.createElement("strong");
      title.textContent = getRegionLabel(visitKey, value);
      copy.appendChild(title);

      const meta = document.createElement("div");
      meta.className = "saved-meta";

      const chip = document.createElement("span");
      chip.className = `saved-chip ${value.type}`;
      chip.textContent = getVisitTypeLabel(state.language, value.type);
      meta.appendChild(chip);

      const date = document.createElement("span");
      date.className = "archive-date";
      date.textContent = t(state.language, "archive.updatedAt", {
        date: formatDate(value.updatedAt),
      });
      meta.appendChild(date);

      copy.appendChild(meta);

      const link = document.createElement("a");
      link.className = "ghost-button archive-open-button";
      link.href = buildMapLink(iso, visitKey, value);
      link.textContent = t(state.language, "archive.openMap");

      item.appendChild(copy);
      item.appendChild(link);
      list.appendChild(item);
    });

    section.appendChild(header);
    section.appendChild(list);
    dom.archiveList.appendChild(section);
  });
}

function matchesArchiveFilter(visitKey, value) {
  const normalizedFilter = normalizeText(state.filter);

  if (!normalizedFilter) {
    return true;
  }

  const haystack = [
    value.regionName,
    getRegionLabel(visitKey, value),
    value.countryName,
    getCountryLabel(value),
    getVisitTypeLabel(state.language, value.type),
  ]
    .map((item) => normalizeText(item))
    .join(" ");

  return haystack.includes(normalizedFilter);
}

function getCountryLabel(value) {
  return (
    getCountryDisplayName(state.language, state.adm0ByIso.get(value.iso)) ||
    value.countryName
  );
}

function getRegionLabel(visitKey, value) {
  return getRegionDisplayName(
    state.language,
    value.regionName,
    state.placeNames.regions[visitKey] ?? "",
  );
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat(
    state.language === "zh" ? "zh-CN" : "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );

  return formatter.format(new Date(value));
}

function buildMapLink(iso, visitKey, value) {
  const params = new URLSearchParams({
    country: iso,
    region: visitKey,
    query: value.regionName,
  });
  return `./index.html?${params.toString()}`;
}
