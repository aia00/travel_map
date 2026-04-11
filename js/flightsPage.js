import { findAirportCandidates, looksLikeAirportCode } from "./airportData.js";
import {
  compareFlightsByDepartureDesc,
  createFlightRecord,
  formatDistanceKm,
  formatDurationMinutes,
  formatFlightDateTime,
  getAirportCode,
  getAirportDisplayLabel,
  getAirportSearchMeta,
  getFlightRouteLabel,
  normalizeFlightRecord,
  summarizeFlights,
} from "./flightUtils.js";
import { initializePageShell } from "./pageShell.js";
import { loadFlights, saveFlights } from "./storage.js";

const dom = {
  flightForm: document.querySelector("#flightForm"),
  flightStatusPill: document.querySelector("#flightStatusPill"),
  flightAirline: document.querySelector("#flightAirline"),
  flightNumber: document.querySelector("#flightNumber"),
  departureCode: document.querySelector("#departureCode"),
  arrivalCode: document.querySelector("#arrivalCode"),
  departureAt: document.querySelector("#departureAt"),
  durationHours: document.querySelector("#durationHours"),
  durationMinutes: document.querySelector("#durationMinutes"),
  flightStatus: document.querySelector("#flightStatus"),
  cabinClass: document.querySelector("#cabinClass"),
  flightAircraft: document.querySelector("#flightAircraft"),
  flightSeat: document.querySelector("#flightSeat"),
  flightNotes: document.querySelector("#flightNotes"),
  flightResetButton: document.querySelector("#flightResetButton"),
  departureSuggestions: document.querySelector("#departureSuggestions"),
  arrivalSuggestions: document.querySelector("#arrivalSuggestions"),
  departureSelected: document.querySelector("#departureSelected"),
  arrivalSelected: document.querySelector("#arrivalSelected"),
  flightFilter: document.querySelector("#flightFilter"),
  flightHistoryList: document.querySelector("#flightHistoryList"),
  airlineRanking: document.querySelector("#airlineRanking"),
  routeRanking: document.querySelector("#routeRanking"),
  annualSummary: document.querySelector("#annualSummary"),
  favoriteAirline: document.querySelector("#favoriteAirline"),
  favoriteAirlineMeta: document.querySelector("#favoriteAirlineMeta"),
  busiestRoute: document.querySelector("#busiestRoute"),
  busiestRouteMeta: document.querySelector("#busiestRouteMeta"),
  longestFlight: document.querySelector("#longestFlight"),
  longestFlightMeta: document.querySelector("#longestFlightMeta"),
  metricTotal: document.querySelector('[data-flight-metric="total"]'),
  metricCompleted: document.querySelector('[data-flight-metric="completed"]'),
  metricUpcoming: document.querySelector('[data-flight-metric="upcoming"]'),
  metricDistance: document.querySelector('[data-flight-metric="distance"]'),
  metricDuration: document.querySelector('[data-flight-metric="duration"]'),
  metricAirports: document.querySelector('[data-flight-metric="airports"]'),
};

const state = {
  flights: loadFlights().map(normalizeFlightRecord),
  filter: "all",
  departureAirport: null,
  arrivalAirport: null,
  departureMatches: [],
  arrivalMatches: [],
  lookupToken: 0,
  status: {
    key: "flights.status.ready",
    tone: "success",
    params: {},
  },
};

const shell = initializePageShell({
  titleKey: "flights.pageTitle",
  onRender: () => {
    renderPage();
  },
});

bindEvents();
resetFlightForm({ preserveStatus: true });
renderPage();

function bindEvents() {
  dom.flightForm.addEventListener("submit", handleFlightSubmit);
  dom.flightResetButton.addEventListener("click", () => {
    resetFlightForm();
  });
  dom.flightFilter.addEventListener("change", () => {
    state.filter = dom.flightFilter.value;
    renderHistory();
  });

  dom.departureCode.addEventListener("input", () => {
    handleAirportInput("departure");
  });
  dom.arrivalCode.addEventListener("input", () => {
    handleAirportInput("arrival");
  });

  dom.departureSuggestions.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-airport-index]");
    if (!button) {
      return;
    }

    const airport = state.departureMatches[Number(button.dataset.airportIndex)];
    if (!airport) {
      return;
    }

    selectAirport("departure", airport);
  });

  dom.arrivalSuggestions.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-airport-index]");
    if (!button) {
      return;
    }

    const airport = state.arrivalMatches[Number(button.dataset.airportIndex)];
    if (!airport) {
      return;
    }

    selectAirport("arrival", airport);
  });

  dom.departureSelected.addEventListener("click", (event) => {
    if (event.target.closest("[data-clear-airport='departure']")) {
      clearAirportSelection("departure");
    }
  });

  dom.arrivalSelected.addEventListener("click", (event) => {
    if (event.target.closest("[data-clear-airport='arrival']")) {
      clearAirportSelection("arrival");
    }
  });

  dom.flightHistoryList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-delete-flight]");
    if (!button) {
      return;
    }

    deleteFlight(button.dataset.deleteFlight);
  });
}

async function handleAirportInput(side) {
  const input = side === "departure" ? dom.departureCode : dom.arrivalCode;
  const query = input.value.trim().toUpperCase();
  input.value = query;

  const selectedAirport = side === "departure" ? state.departureAirport : state.arrivalAirport;
  if (selectedAirport && getAirportCode(selectedAirport) !== query) {
    if (side === "departure") {
      state.departureAirport = null;
    } else {
      state.arrivalAirport = null;
    }
  }

  if (!looksLikeAirportCode(query)) {
    setMatches(side, []);
    renderSelectedAirports();
    renderSuggestions(side);
    setStatus("flights.status.ready", "success");
    return;
  }

  const token = ++state.lookupToken;
  setStatus("flights.status.loadingAirports", "loading", { query });

  try {
    const candidates = dedupeAirports(await findAirportCandidates(query));
    if (token !== state.lookupToken) {
      return;
    }

    setMatches(side, candidates);
    renderSelectedAirports();
    renderSuggestions(side);

    setStatus(
      candidates.length ? "flights.status.airportResults" : "flights.status.airportNotFound",
      candidates.length ? "loading" : "error",
      {
        query,
        count: candidates.length,
      },
    );
  } catch (error) {
    console.error(error);
    setMatches(side, []);
    renderSuggestions(side);
    setStatus("flights.status.airportNotFound", "error", { query });
  }
}

function handleFlightSubmit(event) {
  event.preventDefault();

  if (!state.departureAirport) {
    setStatus("flights.status.selectDepartureAirport", "error");
    return;
  }

  if (!state.arrivalAirport) {
    setStatus("flights.status.selectArrivalAirport", "error");
    return;
  }

  if (getAirportCode(state.departureAirport) === getAirportCode(state.arrivalAirport)) {
    setStatus("flights.status.sameAirport", "error");
    return;
  }

  const durationMinutes = getDurationMinutes();
  if (durationMinutes <= 0) {
    setStatus("flights.status.durationRequired", "error");
    return;
  }

  const record = createFlightRecord({
    airline: dom.flightAirline.value,
    flightNumber: dom.flightNumber.value,
    status: dom.flightStatus.value,
    departureAt: dom.departureAt.value,
    durationMinutes,
    cabinClass: dom.cabinClass.value,
    aircraft: dom.flightAircraft.value,
    seat: dom.flightSeat.value,
    notes: dom.flightNotes.value,
    departureAirport: state.departureAirport,
    arrivalAirport: state.arrivalAirport,
  });

  state.flights = [record, ...state.flights].sort(compareFlightsByDepartureDesc);
  saveFlights(state.flights);
  renderPage();
  resetFlightForm({ preserveStatus: true });
  setStatus("flights.status.saved", "success", {
    route: getFlightRouteLabel(record),
  });
}

function deleteFlight(flightId) {
  const flight = state.flights.find((item) => item.id === flightId);
  if (!flight) {
    return;
  }

  state.flights = state.flights.filter((item) => item.id !== flightId);
  saveFlights(state.flights);
  renderPage();
  setStatus("flights.status.deleted", "success", {
    route: getFlightRouteLabel(flight),
  });
}

function renderPage() {
  renderMetrics();
  renderInsights();
  renderSuggestions("departure");
  renderSuggestions("arrival");
  renderSelectedAirports();
  renderHistory();
  renderStatus();
}

function renderMetrics() {
  const summary = summarizeFlights(state.flights);
  dom.metricTotal.textContent = String(summary.totalCount);
  dom.metricCompleted.textContent = String(summary.completedCount);
  dom.metricUpcoming.textContent = String(summary.upcomingCount);
  dom.metricDistance.textContent = formatDistanceKm(summary.totalDistanceKm, shell.language);
  dom.metricDuration.textContent = formatDurationMinutes(
    summary.totalDurationMinutes,
    shell.language,
  );
  dom.metricAirports.textContent = String(summary.uniqueAirports);
}

function renderInsights() {
  const summary = summarizeFlights(state.flights);

  if (summary.favoriteAirline) {
    dom.favoriteAirline.textContent = summary.favoriteAirline.label;
    dom.favoriteAirlineMeta.textContent = shell.t("flights.labels.flightsCount", {
      count: summary.favoriteAirline.count,
    });
  } else {
    dom.favoriteAirline.textContent = shell.t("flights.labels.noLeader");
    dom.favoriteAirlineMeta.textContent = "";
  }

  if (summary.busiestRoute) {
    dom.busiestRoute.textContent = summary.busiestRoute.label;
    dom.busiestRouteMeta.textContent = shell.t("flights.labels.flightsCount", {
      count: summary.busiestRoute.count,
    });
  } else {
    dom.busiestRoute.textContent = shell.t("flights.labels.noLeader");
    dom.busiestRouteMeta.textContent = "";
  }

  if (summary.longestFlight) {
    dom.longestFlight.textContent = `${summary.longestFlight.airline} ${summary.longestFlight.flightNumber}`.trim();
    dom.longestFlightMeta.textContent = shell.t("flights.labels.durationsAndDistance", {
      duration: formatDurationMinutes(summary.longestFlight.durationMinutes, shell.language),
      distance: formatDistanceKm(summary.longestFlight.distanceKm, shell.language),
    });
  } else {
    dom.longestFlight.textContent = shell.t("flights.labels.noLeader");
    dom.longestFlightMeta.textContent = "";
  }

  renderRankingList(dom.airlineRanking, summary.airlineRanking, (entry) => ({
    title: entry.label,
    meta: shell.t("flights.labels.flightsCount", { count: entry.count }),
  }), "flights.emptyRankings");

  renderRankingList(dom.routeRanking, summary.routeRanking, (entry) => ({
    title: entry.label,
    meta: shell.t("flights.labels.flightsCount", { count: entry.count }),
  }), "flights.emptyRankings");

  renderRankingList(dom.annualSummary, summary.annualSummary, (entry) => ({
    title: String(entry.year),
    meta: shell.t("flights.labels.durationsAndDistance", {
      duration: formatDurationMinutes(entry.durationMinutes, shell.language),
      distance: formatDistanceKm(entry.distanceKm, shell.language),
    }),
    trailing: shell.t("flights.labels.flightsCount", { count: entry.count }),
  }), "flights.emptyYears");
}

function renderRankingList(container, items, formatItem, emptyKey) {
  if (!items.length) {
    container.innerHTML = `<div class="saved-empty">${shell.t(emptyKey)}</div>`;
    return;
  }

  container.innerHTML = "";
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "flight-ranking-item";

    const copy = document.createElement("div");
    copy.className = "flight-ranking-copy";

    const title = document.createElement("strong");
    const { title: itemTitle, meta, trailing = "" } = formatItem(item);
    title.textContent = itemTitle;
    copy.appendChild(title);

    const metaNode = document.createElement("span");
    metaNode.textContent = meta;
    copy.appendChild(metaNode);
    row.appendChild(copy);

    if (trailing) {
      const trailingNode = document.createElement("span");
      trailingNode.className = "saved-chip travel";
      trailingNode.textContent = trailing;
      row.appendChild(trailingNode);
    }

    container.appendChild(row);
  });
}

function renderHistory() {
  const flights = [...state.flights]
    .sort(compareFlightsByDepartureDesc)
    .filter((flight) => state.filter === "all" || flight.status === state.filter);

  if (!flights.length) {
    dom.flightHistoryList.innerHTML = `<div class="saved-empty">${shell.t("flights.emptyHistory")}</div>`;
    return;
  }

  dom.flightHistoryList.innerHTML = "";
  flights.forEach((flight) => {
    const card = document.createElement("article");
    card.className = "flight-history-card";

    const copy = document.createElement("div");
    copy.className = "flight-history-copy";

    const heading = document.createElement("div");
    heading.className = "flight-history-heading";

    const title = document.createElement("h3");
    title.textContent = `${flight.airline} ${flight.flightNumber}`.trim();
    heading.appendChild(title);

    const statusChip = document.createElement("span");
    statusChip.className = `saved-chip ${toVisitChipType(flight.status)}`;
    statusChip.textContent = shell.t(`flights.statusLabels.${flight.status}`);
    heading.appendChild(statusChip);
    copy.appendChild(heading);

    const route = document.createElement("p");
    route.className = "flight-route";
    route.textContent = getFlightRouteLabel(flight);
    copy.appendChild(route);

    const meta = document.createElement("p");
    meta.className = "flight-history-meta";
    meta.textContent = [
      formatFlightDateTime(flight.departureAt, shell.language),
      formatDurationMinutes(flight.durationMinutes, shell.language),
      formatDistanceKm(flight.distanceKm, shell.language),
      flight.cabinClass ? shell.t(`flights.cabinLabels.${flight.cabinClass}`) : "",
      flight.aircraft,
      flight.seat,
    ]
      .filter(Boolean)
      .join(" · ");
    copy.appendChild(meta);

    const airportMeta = document.createElement("p");
    airportMeta.className = "flight-airport-meta";
    airportMeta.textContent = `${getAirportDisplayLabel(flight.departureAirport)} -> ${getAirportDisplayLabel(flight.arrivalAirport)}`;
    copy.appendChild(airportMeta);

    if (flight.notes) {
      const notes = document.createElement("p");
      notes.className = "flight-notes";
      notes.textContent = flight.notes;
      copy.appendChild(notes);
    }

    const actions = document.createElement("div");
    actions.className = "flight-history-actions";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "ghost-button";
    deleteButton.dataset.deleteFlight = flight.id;
    deleteButton.textContent = shell.t("buttons.delete");
    actions.appendChild(deleteButton);

    card.appendChild(copy);
    card.appendChild(actions);
    dom.flightHistoryList.appendChild(card);
  });
}

function renderSuggestions(side) {
  const container = side === "departure" ? dom.departureSuggestions : dom.arrivalSuggestions;
  const matches = side === "departure" ? state.departureMatches : state.arrivalMatches;
  const query = side === "departure" ? dom.departureCode.value.trim() : dom.arrivalCode.value.trim();
  const selectedAirport = side === "departure" ? state.departureAirport : state.arrivalAirport;

  if (selectedAirport && !matches.length) {
    container.innerHTML = "";
    return;
  }

  if (!query) {
    container.innerHTML = `<div class="saved-empty compact">${shell.t("flights.emptySuggestions")}</div>`;
    return;
  }

  if (!matches.length) {
    container.innerHTML = `<div class="saved-empty compact">${shell.t("flights.status.airportNotFound", { query })}</div>`;
    return;
  }

  container.innerHTML = "";
  matches.forEach((airport, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "airport-suggestion";
    button.dataset.airportIndex = String(index);

    const title = document.createElement("strong");
    title.textContent = getAirportCode(airport);
    button.appendChild(title);

    const name = document.createElement("span");
    name.textContent = airport.name;
    button.appendChild(name);

    const meta = document.createElement("span");
    meta.textContent = getAirportSearchMeta(airport);
    button.appendChild(meta);

    container.appendChild(button);
  });
}

function renderSelectedAirports() {
  renderAirportSelectionChip(dom.departureSelected, state.departureAirport, "departure");
  renderAirportSelectionChip(dom.arrivalSelected, state.arrivalAirport, "arrival");
}

function renderAirportSelectionChip(container, airport, side) {
  if (!airport) {
    container.innerHTML = "";
    container.hidden = true;
    return;
  }

  container.hidden = false;
  container.innerHTML = "";

  const label = document.createElement("span");
  label.textContent = shell.t("flights.selectedAirport", {
    airport: getAirportDisplayLabel(airport),
  });
  container.appendChild(label);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "ghost-button airport-clear-button";
  button.dataset.clearAirport = side;
  button.textContent = shell.t("buttons.clear");
  container.appendChild(button);
}

function renderStatus() {
  dom.flightStatusPill.textContent = shell.t(state.status.key, state.status.params);
  dom.flightStatusPill.className = `status-pill ${state.status.tone || ""}`.trim();
}

function selectAirport(side, airport) {
  if (side === "departure") {
    state.departureAirport = airport;
    state.departureMatches = [];
    dom.departureCode.value = getAirportCode(airport);
  } else {
    state.arrivalAirport = airport;
    state.arrivalMatches = [];
    dom.arrivalCode.value = getAirportCode(airport);
  }

  renderSelectedAirports();
  renderSuggestions(side);
  setStatus("flights.status.ready", "success");
}

function clearAirportSelection(side) {
  if (side === "departure") {
    state.departureAirport = null;
    state.departureMatches = [];
    dom.departureCode.value = "";
  } else {
    state.arrivalAirport = null;
    state.arrivalMatches = [];
    dom.arrivalCode.value = "";
  }

  renderSelectedAirports();
  renderSuggestions(side);
}

function resetFlightForm({ preserveStatus = false } = {}) {
  dom.flightForm.reset();
  dom.flightStatus.value = "completed";
  dom.cabinClass.value = "economy";
  dom.durationHours.value = "2";
  dom.durationMinutes.value = "0";
  state.departureAirport = null;
  state.arrivalAirport = null;
  state.departureMatches = [];
  state.arrivalMatches = [];
  renderSelectedAirports();
  renderSuggestions("departure");
  renderSuggestions("arrival");
  if (!preserveStatus) {
    setStatus("flights.status.ready", "success");
  }
}

function setMatches(side, matches) {
  if (side === "departure") {
    state.departureMatches = matches;
    return;
  }

  state.arrivalMatches = matches;
}

function setStatus(key, tone = "", params = {}) {
  state.status = { key, tone, params };
  renderStatus();
}

function getDurationMinutes() {
  const hours = Math.max(0, Number(dom.durationHours.value) || 0);
  const minutes = Math.max(0, Number(dom.durationMinutes.value) || 0);
  return hours * 60 + minutes;
}

function dedupeAirports(airports) {
  return [...new Map(airports.map((airport) => [getAirportDedupKey(airport), airport])).values()];
}

function getAirportDedupKey(airport) {
  return [
    getAirportCode(airport),
    airport.name,
    airport.municipality,
    airport.countryAlpha2,
  ].join("|");
}

function toVisitChipType(flightStatus) {
  if (flightStatus === "completed") {
    return "travel";
  }
  if (flightStatus === "upcoming") {
    return "resident";
  }
  return "transit";
}
