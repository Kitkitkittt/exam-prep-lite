export const EXAM_LABELS = {
  ielts: "IELTS",
  gre: "GRE",
  gmat: "GMAT",
};

export function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; value >= 1024 && index < units.length; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${unit}`;
}

export function filterMaterials(materials, {
  exam,
  category = "all",
  volume = null,
  query = "",
  kindFilter = "all",
  accessFilter = "all",
  bookmarkedIds = [],
  recentIds = [],
}) {
  const normalizedQuery = query.trim().toLowerCase();
  return materials.filter((material) => {
    if (material.exam !== exam) return false;
    if (category === "bookmarks" && !bookmarkedIds.includes(material.id)) return false;
    if (category === "recent" && !recentIds.includes(material.id)) return false;
    if (!["all", "bookmarks", "recent"].includes(category) && material.category !== category) return false;
    if (volume !== null && material.volume !== volume) return false;
    if (kindFilter !== "all" && material.kind !== kindFilter) return false;
    if (accessFilter !== "all" && material.access !== accessFilter) return false;
    const searchText = [
      material.title,
      material.publisher,
      material.exam,
      material.volume,
      material.skill,
      material.test,
      material.part,
      material.resourceKind,
      material.format,
      material.category,
    ].filter(Boolean).join(" ").toLowerCase();
    if (normalizedQuery && !searchText.includes(normalizedQuery)) return false;
    return true;
  });
}

export function summarizeExam(materials, exam) {
  const matching = materials.filter((material) => material.exam === exam);
  return {
    files: matching.length,
    bytes: matching.reduce((sum, material) => sum + (material.size || 0), 0),
    hosted: matching.filter((material) => material.access === "hosted").length,
    external: matching.filter((material) => material.location === "external").length,
    categories: [...new Set(matching.map((material) => material.category))],
  };
}

export function availableVolumes(catalog) {
  return catalog.volumes.filter((volume) => volume.available).map((volume) => volume.volume);
}

export function isPreviewable(material) {
  return ["pdf", "audio", "image", "markdown", "json", "text"].includes(material.kind);
}
