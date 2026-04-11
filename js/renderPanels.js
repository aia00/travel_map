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

export function renderSearchCandidates({
  dom,
  candidates,
  emptyText = "",
  getCandidateTitle,
  getCandidateMeta = () => "",
  getCandidateBadge = () => "",
  onSelectCandidate,
}) {
  dom.searchResults.innerHTML = "";

  if (!candidates.length) {
    if (!emptyText) {
      return;
    }

    const empty = document.createElement("span");
    empty.className = "saved-chip";
    empty.textContent = emptyText;
    dom.searchResults.appendChild(empty);
    return;
  }

  candidates.forEach((candidate) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "result-chip";
    const badge = getCandidateBadge(candidate);
    const title = getCandidateTitle(candidate);
    const meta = getCandidateMeta(candidate);
    const main = document.createElement("span");
    main.className = "result-chip-main";

    const titleNode = document.createElement("span");
    titleNode.className = "result-chip-title";
    titleNode.textContent = title;
    main.appendChild(titleNode);

    if (meta) {
      const metaNode = document.createElement("span");
      metaNode.className = "result-chip-meta";
      metaNode.textContent = meta;
      main.appendChild(metaNode);
    }

    button.appendChild(main);

    if (badge) {
      const badgeNode = document.createElement("span");
      badgeNode.className = "result-chip-badge";
      badgeNode.textContent = badge;
      button.appendChild(badgeNode);
    }

    button.addEventListener("click", () => {
      onSelectCandidate(candidate);
    });
    dom.searchResults.appendChild(button);
  });
}

export function renderArchiveSummary({
  dom,
  totals,
  currentCountryCount,
  t,
}) {
  dom.savedList.innerHTML = "";

  const summary = document.createElement("div");
  summary.className = "archive-summary";

  [
    [totals.total, t("archive.totalMarks")],
    [totals.countries, t("archive.totalCountries")],
    [currentCountryCount, t("archive.currentCountry")],
  ].forEach(([value, label]) => {
    const stat = document.createElement("div");
    stat.className = "archive-stat";

    const strong = document.createElement("strong");
    strong.textContent = `${value}`;
    stat.appendChild(strong);

    const span = document.createElement("span");
    span.textContent = label;
    stat.appendChild(span);

    summary.appendChild(stat);
  });

  dom.savedList.appendChild(summary);
}

export function renderSelectionCard({
  dom,
  selectedFeature,
  selectedTitle,
  selectedVisit,
  activeVisitType,
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

  dom.selectionTitle.textContent = selectedTitle;
  dom.selectionMeta.textContent = t("selection.meta", {
    country: countryName,
    status: selectedVisit
      ? getVisitTypeLabel(selectedVisit.type)
      : t("labels.unmarked"),
  });

  ["resident", "travel", "transit"].forEach((type) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `quick-action ${activeVisitType === type ? "is-active" : ""}`;
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
  getEntryLabel,
  getEntryCountryName,
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
      <strong>${getEntryLabel(visitKey, value)}</strong>
      <p>${getEntryCountryName(visitKey, value)}</p>
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
