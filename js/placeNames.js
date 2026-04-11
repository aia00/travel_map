import isoCountries from "https://cdn.jsdelivr.net/npm/i18n-iso-countries@7.14.0/+esm";

import { SOURCES } from "./config.js";
import { normalizeText } from "./mapData.js";

let zhCountryNamesReady = false;
let zhCountryNamesPromise = null;

export function getCountryDisplayName(language, countryMeta) {
  const englishName = countryMeta?.boundaryName ?? "";

  if (language !== "zh" || !englishName) {
    return englishName;
  }

  const alpha2 = toAlpha2CountryCode(countryMeta?.boundaryISO);
  const zhName = alpha2 ? isoCountries.getName(alpha2, "zh") : "";
  return formatBilingualName(englishName, zhName);
}

export function getRegionDisplayName(language, englishName, translatedName = "") {
  if (language !== "zh") {
    return englishName;
  }

  return formatBilingualName(englishName, translatedName);
}

export async function ensureZhCountryNamesLoaded() {
  if (zhCountryNamesReady) {
    return;
  }

  if (!zhCountryNamesPromise) {
    zhCountryNamesPromise = fetch(SOURCES.countryNamesZh)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch Chinese country names: ${response.status}`);
        }

        return response.json();
      })
      .then((locale) => {
        isoCountries.registerLocale(locale);
        zhCountryNamesReady = true;
      });
  }

  return zhCountryNamesPromise;
}

export function extractChinesePlaceName(result, englishName) {
  const address = result?.address ?? {};
  const candidates = [
    address.state,
    address.province,
    address.region,
    address.state_district,
    address.county,
    address.city,
    address.municipality,
    address.district,
    result?.name,
    String(result?.display_name ?? "").split(",")[0],
  ]
    .map(cleanLocalizedName)
    .filter(Boolean);

  return (
    candidates.find((candidate) => normalizeText(candidate) !== normalizeText(englishName)) ??
    ""
  );
}

function toAlpha2CountryCode(alpha3) {
  if (alpha3 === "XKX") {
    return "XK";
  }

  return isoCountries.alpha3ToAlpha2(alpha3 ?? "") ?? "";
}

function cleanLocalizedName(value) {
  return String(value ?? "")
    .split(";")[0]
    .replace(/\s+/g, " ")
    .trim();
}

function formatBilingualName(englishName, translatedName) {
  const cleanEnglishName = String(englishName ?? "").trim();
  const cleanTranslatedName = cleanLocalizedName(translatedName);

  if (!cleanTranslatedName) {
    return cleanEnglishName;
  }

  if (normalizeText(cleanEnglishName) === normalizeText(cleanTranslatedName)) {
    return cleanEnglishName;
  }

  return `${cleanEnglishName} / ${cleanTranslatedName}`;
}
