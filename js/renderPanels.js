export function renderStatus({ dom, text, tone }) {
  dom.statusPill.textContent = text;
  dom.statusPill.className = `status-pill ${tone}`.trim();
}

export function renderMetrics({ dom, values }) {
  dom.metricTotal.textContent = `${values.length}`;
  dom.metricResident.textContent = `${values.filter((item) => item.type === "resident").length}`;
  dom.metricTravel.textContent = `${values.filter((item) => item.type === "travel").length}`;
  dom.metricTransit.textContent = `${values.filter((item) => item.type === "transit").length}`;
}

export function renderMatches({
  dom,
  query,
  selectedCountryIso,
  data,
  findMatches,
  t,
  onSelectRegion,
}) {
  if (!query.trim() || !selectedCountryIso || !data) {
    dom.searchResults.innerHTML = "";
    return [];
  }

  const matches = findMatches(data.features, query);

  renderMatchChips({
    dom,
    features: matches.slice(0, 8),
    emptyText: t("search.noMatches"),
    onSelectRegion,
  });

  return matches;
}

export function renderMatchChips({ dom, features, emptyText = "", onSelectRegion }) {
  dom.searchResults.innerHTML = "";

  if (!features.length) {
    if (!emptyText) {
      return;
    }

    const empty = document.createElement("span");
    empty.className = "saved-chip";
    empty.textContent = emptyText;
    dom.searchResults.appendChild(empty);
    return;
  }

  features.forEach((feature) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "result-chip";
    button.textContent = feature.properties.regionName;
    button.addEventListener("click", () => {
      onSelectRegion(feature);
    });
    dom.searchResults.appendChild(button);
  });
}

export function renderSelectionCard({
  dom,
  selectedFeature,
  selectedVisit,
  countryName,
  t,
  getVisitTypeLabel,
  onApplyType,
  onClear,
}) {
  dom.selectionActions.innerHTML = "";

  if (!selectedFeature) {
    dom.selectionTitle.textContent = t("selection.emptyTitle");
    dom.selectionMeta.textContent = t("selection.emptyMeta");
    return;
  }

  dom.selectionTitle.textContent = selectedFeature.properties.regionName;
  dom.selectionMeta.textContent = t("selection.meta", {
    country: countryName,
    status: selectedVisit
      ? getVisitTypeLabel(selectedVisit.type)
      : t("labels.unmarked"),
  });

  ["resident", "travel", "transit"].forEach((type) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `quick-action ${selectedVisit?.type === type ? "is-active" : ""}`;
    button.dataset.type = type;
    button.textContent = getVisitTypeLabel(type);
    button.addEventListener("click", () => {
      onApplyType(type);
    });
    dom.selectionActions.appendChild(button);
  });

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "ghost-button";
  remove.textContent = t("buttons.clear");
  remove.addEventListener("click", onClear);
  dom.selectionActions.appendChild(remove);
}

export function renderSavedList({
  dom,
  selectedCountryIso,
  entries,
  selectedRegionKey,
  t,
  getVisitTypeLabel,
  onSelectEntry,
  onDeleteEntry,
}) {
  dom.savedList.innerHTML = "";

  if (!selectedCountryIso) {
    dom.savedList.innerHTML = `<div class="saved-empty">${t("saved.emptySelectCountry")}</div>`;
    return;
  }

  if (!entries.length) {
    dom.savedList.innerHTML = `<div class="saved-empty">${t("saved.emptyNoRegions")}</div>`;
    return;
  }

  entries.forEach(([visitKey, value]) => {
    const item = document.createElement("article");
    item.className = `saved-item ${visitKey === selectedRegionKey ? "is-selected" : ""}`;

    const left = document.createElement("button");
    left.type = "button";
    left.className = "saved-item-trigger";
    left.innerHTML = `
      <strong>${value.regionName}</strong>
      <p>${value.countryName}</p>
      <div class="saved-meta">
        <span class="saved-chip ${value.type}">${getVisitTypeLabel(value.type)}</span>
      </div>
    `;
    left.addEventListener("click", () => {
      onSelectEntry(visitKey, value);
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-button";
    remove.textContent = t("buttons.delete");
    remove.addEventListener("click", () => {
      onDeleteEntry(visitKey, value);
    });

    item.appendChild(left);
    item.appendChild(remove);
    dom.savedList.appendChild(item);
  });
}
