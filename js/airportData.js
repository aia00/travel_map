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

export async function findAirportCandidates(query) {
  const normalizedCode = String(query ?? "").trim().toUpperCase();

  if (!looksLikeAirportCode(normalizedCode)) {
    return [];
  }

  const airportIndex = await ensureAirportIndex();
  return (airportIndex.get(normalizedCode) ?? []).map((airport) => ({
    ...airport,
    matchedCode: normalizedCode,
  }));
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
  const headers = parseCsvLine(rows[0] ?? "");
  const columnIndex = Object.fromEntries(
    headers.map((header, index) => [header, index]),
  );
  const airportIndex = new Map();

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const line = rows[rowIndex];

    if (!line) {
      continue;
    }

    const fields = parseCsvLine(line);
    if (fields.length < headers.length) {
      continue;
    }

    const latitude = Number(getField(fields, columnIndex, "latitude_deg"));
    const longitude = Number(getField(fields, columnIndex, "longitude_deg"));

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue;
    }

    const airport = {
      ident: getField(fields, columnIndex, "ident"),
      name: getField(fields, columnIndex, "name"),
      municipality: getField(fields, columnIndex, "municipality"),
      regionCode: getField(fields, columnIndex, "iso_region"),
      countryAlpha2: getField(fields, columnIndex, "iso_country"),
      gpsCode: getField(fields, columnIndex, "gps_code"),
      iataCode: getField(fields, columnIndex, "iata_code"),
      localCode: getField(fields, columnIndex, "local_code"),
      latitude,
      longitude,
    };

    [airport.ident, airport.gpsCode, airport.iataCode, airport.localCode].forEach((code) => {
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

function getField(fields, columnIndex, fieldName) {
  return fields[columnIndex[fieldName] ?? -1] ?? "";
}

export function toAlpha3CountryCode(alpha2) {
  if (String(alpha2 ?? "").toUpperCase() === "XK") {
    return "XKX";
  }

  return isoCountries.alpha2ToAlpha3(alpha2 ?? "") ?? "";
}

function toAlpha2CountryCode(alpha3) {
  if (alpha3 === "XKX") {
    return "XK";
  }

  return isoCountries.alpha3ToAlpha2(alpha3 ?? "") ?? "";
}
