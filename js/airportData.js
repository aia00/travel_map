import isoCountries from "https://cdn.jsdelivr.net/npm/i18n-iso-countries@7.14.0/+esm";

import { SOURCES } from "./config.js";
import { findFeatureContainingPoint } from "./mapData.js";

let airportIndexPromise = null;

export function looksLikeAirportCode(query) {
  return /^[A-Z0-9]{3,4}$/.test(String(query ?? "").trim().toUpperCase());
}

export async function findAirportMatches({ query, countryIsoAlpha3, features }) {
  const normalizedCode = String(query ?? "").trim().toUpperCase();

  if (!looksLikeAirportCode(normalizedCode)) {
    return [];
  }

  const airportIndex = await ensureAirportIndex();
  const countryAlpha2 = toAlpha2CountryCode(countryIsoAlpha3);
  const airports = (airportIndex.get(normalizedCode) ?? []).filter((airport) =>
    countryAlpha2 ? airport.countryAlpha2 === countryAlpha2 : true,
  );
  const matchedFeatures = airports
    .map((airport) =>
      findFeatureContainingPoint(features, [airport.longitude, airport.latitude]),
    )
    .filter(Boolean);

  return dedupeFeatures(matchedFeatures);
}

function ensureAirportIndex() {
  if (!airportIndexPromise) {
    airportIndexPromise = fetch(SOURCES.airportsCsv)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch airport data: ${response.status}`);
        }

        return response.text();
      })
      .then(buildAirportIndex);
  }

  return airportIndexPromise;
}

function buildAirportIndex(csvText) {
  const rows = csvText.split(/\r?\n/);
  const airportIndex = new Map();

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const line = rows[rowIndex];

    if (!line) {
      continue;
    }

    const fields = parseCsvLine(line);
    if (fields.length < 16) {
      continue;
    }

    const latitude = Number(fields[4]);
    const longitude = Number(fields[5]);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue;
    }

    const airport = {
      countryAlpha2: fields[8],
      latitude,
      longitude,
    };

    [fields[1], fields[12], fields[13], fields[14], fields[15]].forEach((code) => {
      addAirportCode(airportIndex, code, airport);
    });
  }

  return airportIndex;
}

function addAirportCode(airportIndex, code, airport) {
  const normalizedCode = String(code ?? "").trim().toUpperCase();

  if (!/^[A-Z0-9]{3,4}$/.test(normalizedCode)) {
    return;
  }

  const airports = airportIndex.get(normalizedCode) ?? [];
  airports.push(airport);
  airportIndex.set(normalizedCode, airports);
}

function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      fields.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  fields.push(current);
  return fields;
}

function dedupeFeatures(features) {
  return [...new Map(features.map((feature) => [feature.properties.visitKey, feature])).values()];
}

function toAlpha2CountryCode(alpha3) {
  if (alpha3 === "XKX") {
    return "XK";
  }

  return isoCountries.alpha3ToAlpha2(alpha3 ?? "") ?? "";
}
