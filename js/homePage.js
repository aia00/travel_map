import { summarizeFlights, formatDistanceKm } from "./flightUtils.js";
import { initializePageShell } from "./pageShell.js";
import { loadFlights, loadVisited } from "./storage.js";

const dom = {
  homeMapMarks: document.querySelector("#homeMapMarks"),
  homeVisitedCountries: document.querySelector("#homeVisitedCountries"),
  homeFlights: document.querySelector("#homeFlights"),
  homeFlightDistance: document.querySelector("#homeFlightDistance"),
  homeUpcomingFlights: document.querySelector("#homeUpcomingFlights"),
  homeAtlasMeta: document.querySelector("#homeAtlasMeta"),
  homeFlightMeta: document.querySelector("#homeFlightMeta"),
};

const state = {
  visited: loadVisited(),
  flights: loadFlights(),
};

initializePageShell({
  titleKey: "portal.pageTitle",
  onRender: (shell) => {
    renderHome(shell);
  },
});

function renderHome(shell) {
  const visitedEntries = Object.values(state.visited);
  const visitedCountryCount = new Set(visitedEntries.map((entry) => entry.iso)).size;
  const flightSummary = summarizeFlights(state.flights);

  dom.homeMapMarks.textContent = String(visitedEntries.length);
  dom.homeVisitedCountries.textContent = String(visitedCountryCount);
  dom.homeFlights.textContent = String(flightSummary.totalCount);
  dom.homeFlightDistance.textContent = formatDistanceKm(
    flightSummary.totalDistanceKm,
    shell.language,
  );
  dom.homeUpcomingFlights.textContent = String(flightSummary.upcomingCount);

  dom.homeAtlasMeta.textContent = shell.t("portal.cards.atlasMeta", {
    regions: visitedEntries.length,
    countries: visitedCountryCount,
  });
  dom.homeFlightMeta.textContent = shell.t("portal.cards.flightsMeta", {
    count: flightSummary.totalCount,
    distance: formatDistanceKm(flightSummary.totalDistanceKm, shell.language),
  });
}
