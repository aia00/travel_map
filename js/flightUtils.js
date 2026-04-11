const ACTIVE_FLIGHT_STATUSES = new Set(["completed", "upcoming"]);

export function summarizeFlights(flights) {
  const normalizedFlights = [...flights].map(normalizeFlightRecord);
  const completedFlights = normalizedFlights.filter((flight) => flight.status === "completed");
  const upcomingFlights = normalizedFlights.filter((flight) => flight.status === "upcoming");
  const activeFlights = normalizedFlights.filter((flight) =>
    ACTIVE_FLIGHT_STATUSES.has(flight.status),
  );

  const uniqueAirports = new Set();
  const uniqueCountries = new Set();
  const airlineCounts = new Map();
  const routeCounts = new Map();
  const yearlySummary = new Map();

  activeFlights.forEach((flight) => {
    const departureCode = getAirportCode(flight.departureAirport);
    const arrivalCode = getAirportCode(flight.arrivalAirport);
    const routeKey = departureCode && arrivalCode ? `${departureCode} -> ${arrivalCode}` : "";

    if (departureCode) {
      uniqueAirports.add(departureCode);
    }
    if (arrivalCode) {
      uniqueAirports.add(arrivalCode);
    }

    if (flight.departureAirport?.countryAlpha2) {
      uniqueCountries.add(flight.departureAirport.countryAlpha2);
    }
    if (flight.arrivalAirport?.countryAlpha2) {
      uniqueCountries.add(flight.arrivalAirport.countryAlpha2);
    }

    if (flight.airline) {
      airlineCounts.set(flight.airline, (airlineCounts.get(flight.airline) ?? 0) + 1);
    }

    if (routeKey) {
      routeCounts.set(routeKey, (routeCounts.get(routeKey) ?? 0) + 1);
    }

    const year = getFlightYear(flight.departureAt);
    const currentYear = yearlySummary.get(year) ?? {
      year,
      count: 0,
      distanceKm: 0,
      durationMinutes: 0,
    };
    currentYear.count += 1;
    currentYear.distanceKm += flight.distanceKm;
    currentYear.durationMinutes += flight.durationMinutes;
    yearlySummary.set(year, currentYear);
  });

  return {
    totalCount: normalizedFlights.length,
    completedCount: completedFlights.length,
    upcomingCount: upcomingFlights.length,
    canceledCount: normalizedFlights.filter((flight) => flight.status === "canceled").length,
    totalDistanceKm: roundDistance(
      completedFlights.reduce((sum, flight) => sum + flight.distanceKm, 0),
    ),
    upcomingDistanceKm: roundDistance(
      upcomingFlights.reduce((sum, flight) => sum + flight.distanceKm, 0),
    ),
    totalDurationMinutes: completedFlights.reduce(
      (sum, flight) => sum + flight.durationMinutes,
      0,
    ),
    upcomingDurationMinutes: upcomingFlights.reduce(
      (sum, flight) => sum + flight.durationMinutes,
      0,
    ),
    uniqueAirports: uniqueAirports.size,
    uniqueCountries: uniqueCountries.size,
    uniqueAirlines: [...airlineCounts.keys()].length,
    longestFlight: [...completedFlights].sort(
      (left, right) => right.distanceKm - left.distanceKm,
    )[0] ?? null,
    favoriteAirline: getTopCountEntry(airlineCounts),
    busiestRoute: getTopCountEntry(routeCounts),
    airlineRanking: getSortedCountEntries(airlineCounts).slice(0, 5),
    routeRanking: getSortedCountEntries(routeCounts).slice(0, 5),
    annualSummary: [...yearlySummary.values()].sort((left, right) => right.year - left.year),
    recentFlights: [...normalizedFlights].sort(compareFlightsByDepartureDesc).slice(0, 8),
  };
}

export function normalizeFlightRecord(flight) {
  const durationMinutes = Math.max(0, Number(flight?.durationMinutes) || 0);
  const departureAirport = normalizeAirport(flight?.departureAirport);
  const arrivalAirport = normalizeAirport(flight?.arrivalAirport);
  const distanceKm =
    Number(flight?.distanceKm) ||
    calculateDistanceKm(departureAirport, arrivalAirport);

  return {
    id: flight?.id ?? "",
    airline: String(flight?.airline ?? "").trim(),
    flightNumber: String(flight?.flightNumber ?? "").trim().toUpperCase(),
    status: normalizeFlightStatus(flight?.status),
    departureAt: String(flight?.departureAt ?? ""),
    durationMinutes,
    cabinClass: String(flight?.cabinClass ?? "economy").trim(),
    aircraft: String(flight?.aircraft ?? "").trim(),
    seat: String(flight?.seat ?? "").trim(),
    notes: String(flight?.notes ?? "").trim(),
    departureAirport,
    arrivalAirport,
    distanceKm: roundDistance(distanceKm),
    createdAt: String(flight?.createdAt ?? ""),
    updatedAt: String(flight?.updatedAt ?? ""),
  };
}

export function createFlightRecord({
  airline,
  flightNumber,
  status,
  departureAt,
  durationMinutes,
  cabinClass,
  aircraft,
  seat,
  notes,
  departureAirport,
  arrivalAirport,
}) {
  const timestamp = new Date().toISOString();
  const normalizedDepartureAirport = normalizeAirport(departureAirport);
  const normalizedArrivalAirport = normalizeAirport(arrivalAirport);

  return normalizeFlightRecord({
    id:
      globalThis.crypto?.randomUUID?.() ??
      `flight-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
    airline,
    flightNumber,
    status,
    departureAt,
    durationMinutes,
    cabinClass,
    aircraft,
    seat,
    notes,
    departureAirport: normalizedDepartureAirport,
    arrivalAirport: normalizedArrivalAirport,
    distanceKm: calculateDistanceKm(normalizedDepartureAirport, normalizedArrivalAirport),
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function calculateDistanceKm(departureAirport, arrivalAirport) {
  const departureLatitude = Number(departureAirport?.latitude);
  const departureLongitude = Number(departureAirport?.longitude);
  const arrivalLatitude = Number(arrivalAirport?.latitude);
  const arrivalLongitude = Number(arrivalAirport?.longitude);

  if (
    !Number.isFinite(departureLatitude) ||
    !Number.isFinite(departureLongitude) ||
    !Number.isFinite(arrivalLatitude) ||
    !Number.isFinite(arrivalLongitude)
  ) {
    return 0;
  }

  const earthRadiusKm = 6371;
  const deltaLatitude = toRadians(arrivalLatitude - departureLatitude);
  const deltaLongitude = toRadians(arrivalLongitude - departureLongitude);
  const departureLatitudeRadians = toRadians(departureLatitude);
  const arrivalLatitudeRadians = toRadians(arrivalLatitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(departureLatitudeRadians) *
      Math.cos(arrivalLatitudeRadians) *
      Math.sin(deltaLongitude / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function getAirportCode(airport) {
  return (
    String(
      airport?.iataCode ||
        airport?.gpsCode ||
        airport?.localCode ||
        airport?.ident ||
        "",
    )
      .trim()
      .toUpperCase()
  );
}

export function getAirportDisplayLabel(airport) {
  if (!airport) {
    return "";
  }

  const code = getAirportCode(airport);
  const placeParts = [airport.municipality, airport.countryAlpha2].filter(Boolean);
  const location = placeParts.join(" · ");
  return [code, airport.name, location].filter(Boolean).join(" · ");
}

export function getAirportSearchMeta(airport) {
  return [airport.municipality, airport.regionCode, airport.countryAlpha2]
    .filter(Boolean)
    .join(" · ");
}

export function formatDurationMinutes(totalMinutes, language) {
  const minutes = Math.max(0, Math.round(Number(totalMinutes) || 0));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (language === "zh") {
    if (!hours) {
      return `${remainingMinutes} 分钟`;
    }
    if (!remainingMinutes) {
      return `${hours} 小时`;
    }
    return `${hours} 小时 ${remainingMinutes} 分钟`;
  }

  if (!hours) {
    return `${remainingMinutes}m`;
  }
  if (!remainingMinutes) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

export function formatDistanceKm(distanceKm, language) {
  const formatter = new Intl.NumberFormat(language === "zh" ? "zh-CN" : "en-US", {
    maximumFractionDigits: distanceKm >= 100 ? 0 : 1,
  });
  return `${formatter.format(distanceKm || 0)} km`;
}

export function formatFlightDateTime(dateTimeValue, language) {
  if (!dateTimeValue) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat(
    language === "zh" ? "zh-CN" : "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  );

  return formatter.format(new Date(dateTimeValue));
}

export function compareFlightsByDepartureDesc(left, right) {
  return getFlightTimestamp(right.departureAt) - getFlightTimestamp(left.departureAt);
}

export function getFlightRouteLabel(flight) {
  return `${getAirportCode(flight.departureAirport)} -> ${getAirportCode(flight.arrivalAirport)}`;
}

function getSortedCountEntries(sourceMap) {
  return [...sourceMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.label.localeCompare(right.label);
    });
}

function getTopCountEntry(sourceMap) {
  return getSortedCountEntries(sourceMap)[0] ?? null;
}

function normalizeAirport(airport) {
  if (!airport) {
    return null;
  }

  return {
    ident: String(airport.ident ?? "").trim().toUpperCase(),
    name: String(airport.name ?? "").trim(),
    municipality: String(airport.municipality ?? "").trim(),
    regionCode: String(airport.regionCode ?? "").trim(),
    countryAlpha2: String(airport.countryAlpha2 ?? "").trim().toUpperCase(),
    gpsCode: String(airport.gpsCode ?? "").trim().toUpperCase(),
    iataCode: String(airport.iataCode ?? "").trim().toUpperCase(),
    localCode: String(airport.localCode ?? "").trim().toUpperCase(),
    latitude: Number(airport.latitude),
    longitude: Number(airport.longitude),
  };
}

function normalizeFlightStatus(status) {
  return status === "upcoming" || status === "canceled" ? status : "completed";
}

function getFlightYear(dateTimeValue) {
  const timestamp = getFlightTimestamp(dateTimeValue);
  if (!timestamp) {
    return 0;
  }

  return new Date(timestamp).getFullYear();
}

function getFlightTimestamp(dateTimeValue) {
  const timestamp = new Date(dateTimeValue).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function roundDistance(distanceKm) {
  return Math.round((Number(distanceKm) || 0) * 10) / 10;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}
