import * as topojson from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";

import { CONTINENTS, SOURCES } from "./config.js";

export async function loadWorldData() {
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

  const enrichedAdm0Meta = adm0Meta
    .map((item) => ({
      ...item,
      uiContinent: deriveContinent(item),
    }))
    .filter((item) => item.uiContinent);

  const adm0ByIso = new Map(
    enrichedAdm0Meta.map((item) => [item.boundaryISO, item]),
  );

  const linkedWorldFeatures = worldFeatures
    .filter((feature) => adm0ByIso.has(feature.properties.iso))
    .map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        meta: adm0ByIso.get(feature.properties.iso),
      },
    }));

  return {
    adm0Meta: enrichedAdm0Meta,
    adm0ByIso,
    worldFeatures: linkedWorldFeatures,
  };
}

export async function ensureAdminData(state, iso) {
  if (state.adminCache.has(iso)) {
    return state.adminCache.get(iso);
  }

  const loader = (async () => {
    try {
      const meta = await fetchJson(`${SOURCES.boundaryApi}/${iso}/ADM1/`);
      const geometry = await fetchJson(
        toGeoBoundariesGeometryUrl(meta.simplifiedGeometryGeoJSON),
      );
      const data = {
        meta,
        features: enrichFeatures(geometry?.features ?? [], iso, state.adm0ByIso),
        fallback: false,
      };
      state.adminDataByIso.set(iso, data);
      return data;
    } catch (adm1Error) {
      const meta = await fetchJson(`${SOURCES.boundaryApi}/${iso}/ADM0/`);
      const geometry = await fetchJson(
        toGeoBoundariesGeometryUrl(meta.simplifiedGeometryGeoJSON),
      );
      const data = {
        meta,
        features: enrichFeatures(geometry?.features ?? [], iso, state.adm0ByIso, true),
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

export function getCountriesForContinent(adm0Meta, continentId) {
  return adm0Meta
    .filter((item) => item.uiContinent === continentId)
    .sort((left, right) => left.boundaryName.localeCompare(right.boundaryName));
}

export function findMatches(features, query) {
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

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
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

function enrichFeatures(features, iso, adm0ByIso, fallbackToCountry = false) {
  return features.map((feature, index) => {
    const props = feature.properties ?? {};
    const regionName =
      props.shapeName ??
      props.name ??
      props.NAME_1 ??
      props.NAME ??
      adm0ByIso.get(iso)?.boundaryName ??
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

function toGeoBoundariesGeometryUrl(url) {
  if (!url) {
    throw new Error("Missing geometry url");
  }

  if (url.startsWith("https://github.com/") && url.includes("/raw/")) {
    return url.replace(
      /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/raw\//,
      "https://media.githubusercontent.com/media/$1/$2/",
    );
  }

  if (url.startsWith("https://raw.githubusercontent.com/")) {
    return url.replace(
      /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\//,
      "https://media.githubusercontent.com/media/$1/$2/",
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
