import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

import { CONTINENTS } from "./config.js";

const CONTINENT_VIEWBOX = {
  width: 960,
  height: 560,
  padding: 24,
};

const COUNTRY_VIEWBOX = {
  width: 960,
  height: 620,
  padding: 26,
};

export function hideTooltip(dom) {
  dom.tooltip.hidden = true;
}

export function showTooltip(dom, event, html) {
  dom.tooltip.hidden = false;
  dom.tooltip.innerHTML = html;
  const offset = 16;
  const maxLeft = window.innerWidth - dom.tooltip.offsetWidth - 12;
  const maxTop = window.innerHeight - dom.tooltip.offsetHeight - 12;
  const left = Math.min(event.clientX + offset, Math.max(12, maxLeft));
  const top = Math.min(event.clientY + offset, Math.max(12, maxTop));

  dom.tooltip.style.left = `${left}px`;
  dom.tooltip.style.top = `${top}px`;
}

export function renderContinentTabs({
  dom,
  selectedContinent,
  getContinentLabel,
  onSelectContinent,
}) {
  dom.continentTabs.innerHTML = "";

  CONTINENTS.forEach((continent) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tab-button ${continent.id === selectedContinent ? "is-active" : ""}`;
    button.textContent = getContinentLabel(continent.id);
    button.addEventListener("click", () => {
      onSelectContinent(continent.id);
    });
    dom.continentTabs.appendChild(button);
  });
}

export function renderCountrySelect({
  dom,
  countries,
  selectedCountryIso,
  continentTitle,
  continentMeta,
  countryPlaceholder,
  getCountryLabel,
}) {
  dom.countrySelect.innerHTML = "";

  if (!selectedCountryIso) {
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = countryPlaceholder;
    placeholderOption.selected = true;
    dom.countrySelect.appendChild(placeholderOption);
  }

  countries.forEach((country) => {
    const option = document.createElement("option");
    option.value = country.boundaryISO;
    option.textContent = getCountryLabel(country);
    option.selected = country.boundaryISO === selectedCountryIso;
    dom.countrySelect.appendChild(option);
  });

  dom.continentTitle.textContent = continentTitle;
  dom.continentMeta.textContent = continentMeta;
}

export function renderContinentMap({
  dom,
  worldFeatures,
  selectedContinent,
  selectedCountryIso,
  getCountrySummaryColor,
  summarizeCountry,
  t,
  getCountryLabel,
  getVisitTypeLabel,
  onSelectCountry,
  onClearCountrySelection,
}) {
  const svg = d3.select(dom.continentMap);
  svg.selectAll("*").remove();
  hideTooltip(dom);

  const continentFeatures = worldFeatures.filter(
    (feature) => feature.properties.meta?.uiContinent === selectedContinent,
  );

  if (!continentFeatures.length) {
    renderContinentMapError(dom, t("map.emptyContinent"));
    return;
  }

  const projection = d3
    .geoNaturalEarth1()
    .fitExtent(
      [
        [CONTINENT_VIEWBOX.padding, CONTINENT_VIEWBOX.padding],
        [
          CONTINENT_VIEWBOX.width - CONTINENT_VIEWBOX.padding,
          CONTINENT_VIEWBOX.height - CONTINENT_VIEWBOX.padding,
        ],
      ],
      toFeatureCollection(continentFeatures),
    );
  const path = d3.geoPath(projection);
  svg.attr("preserveAspectRatio", "xMidYMid meet");

  svg
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", CONTINENT_VIEWBOX.width)
    .attr("height", CONTINENT_VIEWBOX.height)
    .attr("fill", "transparent")
    .on("click", () => {
      onClearCountrySelection();
    })
    .on("mouseleave", () => {
      hideTooltip(dom);
    });

  svg
    .append("g")
    .selectAll("path")
    .data(continentFeatures)
    .join("path")
    .attr("class", (feature) =>
      `continent-country ${feature.properties.iso === selectedCountryIso ? "is-selected" : ""}`,
    )
    .attr("d", path)
    .attr("fill", (feature) => getCountrySummaryColor(feature.properties.iso))
    .attr("stroke", "rgba(20, 37, 52, 0.36)")
    .attr("stroke-width", 0.9)
    .on("click", (_, feature) => {
      onSelectCountry(feature.properties.iso);
    })
    .on("mousemove", (event, feature) => {
      const summary = summarizeCountry(feature.properties.iso);
      const lines = [
        `<strong>${getCountryLabel(feature.properties.meta)}</strong>`,
        t("map.continentMarkedRegions", { count: summary.total }),
      ];

      if (summary.total > 0) {
        lines.push(
          t("map.continentBreakdown", {
            residentLabel: getVisitTypeLabel("resident"),
            resident: summary.resident,
            travelLabel: getVisitTypeLabel("travel"),
            travel: summary.travel,
            transitLabel: getVisitTypeLabel("transit"),
            transit: summary.transit,
          }),
        );
      } else {
        lines.push(t("map.continentNoMarks"));
      }

      showTooltip(dom, event, lines.join("<br />"));
    })
    .on("mouseleave", () => {
      hideTooltip(dom);
    });
}

export function renderContinentMapError(dom, message) {
  const svg = d3.select(dom.continentMap);
  svg.selectAll("*").remove();
  hideTooltip(dom);
  svg
    .append("foreignObject")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", CONTINENT_VIEWBOX.width)
    .attr("height", CONTINENT_VIEWBOX.height)
    .html(
      `<div xmlns="http://www.w3.org/1999/xhtml" class="map-empty-state">${message}</div>`,
    );
}

export function renderCountryMap({
  dom,
  selectedCountryIso,
  countryMeta,
  countryData,
  selectedRegionKey,
  getRegionFill,
  t,
  getCountryLabel,
  getRegionLabel,
  onHoverRegion,
  onSelectRegion,
  onClearSelection,
  getVisitLabel,
}) {
  const svg = d3.select(dom.countryMap);
  svg.selectAll("*").remove();
  hideTooltip(dom);

  if (!selectedCountryIso) {
    renderCountryMapError(dom, t("map.emptyCountryPrompt"));
    return;
  }

  if (!countryData) {
    renderCountryMapError(dom, t("map.emptyCountryLoading"));
    return;
  }

  const features = countryData.features;
  if (!features.length) {
    renderCountryMapError(dom, t("map.emptyCountryNoAdm1"));
    return;
  }

  const projection = createCountryProjection(selectedCountryIso, features);
  const path = d3.geoPath(projection);

  svg.attr("preserveAspectRatio", "xMidYMid meet");

  svg
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", COUNTRY_VIEWBOX.width)
    .attr("height", COUNTRY_VIEWBOX.height)
    .attr("fill", "transparent")
    .on("click", () => {
      onClearSelection();
    })
    .on("mouseleave", () => {
      hideTooltip(dom);
    });

  svg
    .append("g")
    .attr("class", "country-region-fills")
    .selectAll("path")
    .data(features)
    .join("path")
    .attr("class", (feature) =>
      `admin-region ${feature.properties.visitKey === selectedRegionKey ? "is-selected" : ""}`,
    )
    .attr("d", path)
    .attr("fill", (feature) => getRegionFill(feature.properties.visitKey))
    .attr("stroke", "rgba(20, 37, 52, 0.48)")
    .attr("stroke-width", 1.05);

  svg
    .append("g")
    .attr("class", "country-region-hits")
    .selectAll("path")
    .data(features)
    .join("path")
    .attr("class", "admin-region-hit")
    .attr("d", path)
    .attr("fill", "transparent")
    .attr("stroke", "transparent")
    .on("click", (_, feature) => {
      onSelectRegion(feature);
    })
    .on("mousemove", (event, feature) => {
      onHoverRegion(feature);
      const lines = [
        `<strong>${getRegionLabel(feature)}</strong>`,
        `${getCountryLabel(countryMeta)}`,
        t("map.adminStatus", { status: getVisitLabel(feature.properties.visitKey) }),
      ];
      showTooltip(dom, event, lines.join("<br />"));
    })
    .on("mouseleave", () => {
      hideTooltip(dom);
    });
}

export function renderCountryMapError(dom, message) {
  const svg = d3.select(dom.countryMap);
  svg.selectAll("*").remove();
  hideTooltip(dom);
  dom.countryMeta.textContent = message;
  svg
    .append("foreignObject")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", COUNTRY_VIEWBOX.width)
    .attr("height", COUNTRY_VIEWBOX.height)
    .html(
      `<div xmlns="http://www.w3.org/1999/xhtml" class="map-empty-state">${message}</div>`,
    );
}

function toFeatureCollection(features) {
  return {
    type: "FeatureCollection",
    features,
  };
}

function createCountryProjection(countryIso, features) {
  const fitExtent = [
    [COUNTRY_VIEWBOX.padding, COUNTRY_VIEWBOX.padding],
    [
      COUNTRY_VIEWBOX.width - COUNTRY_VIEWBOX.padding,
      COUNTRY_VIEWBOX.height - COUNTRY_VIEWBOX.padding,
    ],
  ];
  const featureCollection = toFeatureCollection(features);

  if (countryIso === "USA") {
    return d3.geoAlbersUsa().fitExtent(fitExtent, featureCollection);
  }

  return d3.geoIdentity().reflectY(true).fitExtent(fitExtent, featureCollection);
}
