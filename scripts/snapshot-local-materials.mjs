import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const workspaceRoot = resolve(appRoot, "..");
const baselinePath = resolve(appRoot, "public", "catalog.json");
const outputPath = resolve(appRoot, "public", "catalog.local.json");
const repositoryRoots = {
  ielts: resolve(workspaceRoot, "IELTS"),
  gre: resolve(workspaceRoot, "GRE-CN"),
  gmat: resolve(workspaceRoot, "gmat.site"),
};

function encodeAbsolutePath(path) {
  return `/@fs/${path.split(sep).map(encodeURIComponent).join("/")}`;
}

function assertWithin(root, path) {
  if (path !== root && !path.startsWith(`${root}${sep}`)) throw new Error(`Path escapes local repository: ${path}`);
}

async function localize(material) {
  if (material.location !== "github") return material;
  const root = repositoryRoots[material.exam];
  if (!root || !material.path) return material;
  const path = resolve(root, material.path);
  assertWithin(root, path);
  const metadata = await stat(path);
  const url = encodeAbsolutePath(path);
  return {
    ...material,
    size: metadata.size,
    location: "local",
    url,
    sourceUrl: url,
    repositoryUrl: null,
  };
}

function importedMaterial(entry) {
  const path = resolve(repositoryRoots.ielts, entry.path);
  assertWithin(repositoryRoots.ielts, path);
  const extension = extname(entry.path).slice(1).toLowerCase();
  const isBook = entry.kind === "book";
  const listeningLabel = entry.part
    ? `Test ${entry.test} · Part ${entry.part}`
    : `Test ${entry.test} · Complete Listening Test`;
  const url = encodeAbsolutePath(path);
  return {
    id: createHash("sha1").update(`local:ielts:${entry.path}`).digest("hex").slice(0, 12),
    exam: "ielts",
    path: entry.path,
    size: entry.bytes,
    format: extension.toUpperCase(),
    kind: isBook ? "pdf" : "audio",
    collection: "cambridge",
    category: "cambridge",
    volume: entry.volume,
    variant: "academic",
    skill: isBook ? null : "listening",
    test: entry.test,
    part: entry.part,
    role: isBook ? "practice_book" : "listening_audio",
    title: isBook
      ? `Cambridge IELTS ${entry.volume} — Academic Practice Book`
      : `Cambridge IELTS ${entry.volume} — ${listeningLabel}`,
    publisher: "Cambridge University Press & Assessment",
    access: "hosted",
    location: "local",
    verifiedOn: null,
    url,
    sourceUrl: url,
    repositoryUrl: null,
  };
}

function sortMaterials(left, right) {
  if (left.exam !== right.exam) return left.exam.localeCompare(right.exam);
  if ((left.volume ?? -1) !== (right.volume ?? -1)) return (right.volume ?? -1) - (left.volume ?? -1);
  if ((left.test ?? 0) !== (right.test ?? 0)) return (left.test ?? 0) - (right.test ?? 0);
  if ((left.part ?? 0) !== (right.part ?? 0)) return (left.part ?? 0) - (right.part ?? 0);
  return left.title.localeCompare(right.title);
}

const [baseline, manifest] = await Promise.all([
  readFile(baselinePath, "utf8").then(JSON.parse),
  readFile(resolve(repositoryRoots.ielts, "Cambridge IELTS", "local-library-manifest.json"), "utf8").then(JSON.parse),
]);

const localized = await Promise.all(baseline.materials.map(localize));
const imported = manifest.files.map(importedMaterial);
const existingPaths = new Set(localized.map((material) => material.path).filter(Boolean));
const materials = [...localized, ...imported.filter((material) => !existingPaths.has(material.path))].sort(sortMaterials);

const volumes = Array.from({ length: 21 }, (_, index) => {
  const volume = index + 1;
  const files = materials.filter((item) => item.exam === "ielts" && item.volume === volume);
  const hostedFiles = files.filter((item) => item.access === "hosted");
  const publicOfficial = files.filter((item) => item.access === "public_official");
  const licensed = files.filter((item) => item.access === "licensed");
  return {
    volume,
    available: files.length > 0,
    status: hostedFiles.length ? "hosted" : publicOfficial.length ? "official" : licensed.length ? "licensed" : "missing",
    files: files.length,
    hostedFiles: hostedFiles.length,
    externalFiles: files.length - hostedFiles.length,
    bytes: hostedFiles.reduce((sum, item) => sum + (item.size || 0), 0),
  };
});

await writeFile(outputPath, `${JSON.stringify({
  ...baseline,
  generatedAt: new Date().toISOString(),
  mode: "private_local",
  volumes,
  materials,
}, null, 2)}\n`);

console.log(`Wrote private local catalog with ${materials.length} resources, including ${imported.length} CAM19–21 files.`);
