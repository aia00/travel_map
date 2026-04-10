export const SOURCES = {
  worldAtlas: "https://cdn.jsdelivr.net/npm/visionscarto-world-atlas@1/world/110m.json",
  adm0Meta: "https://www.geoboundaries.org/api/current/gbOpen/ALL/ADM0/",
  boundaryApi: "https://www.geoboundaries.org/api/current/gbOpen",
};

export const VISIT_TYPES = {
  resident: { color: "#c65239" },
  travel: { color: "#19887b" },
  transit: { color: "#d29b2b" },
};

export const VISIT_PRIORITY = ["resident", "travel", "transit"];

export const CONTINENTS = [
  { id: "asia", sourceNames: ["Asia"] },
  { id: "europe", sourceNames: ["Europe"] },
  { id: "africa", sourceNames: ["Africa"] },
  { id: "north-america", sourceNames: ["Northern America"] },
  { id: "south-america", sourceNames: ["South America"] },
  { id: "oceania", sourceNames: ["Oceania"] },
  { id: "antarctica", sourceNames: ["Antarctica"] },
];
