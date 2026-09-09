import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const sourceManifestUrl = new URL("../sources/official.json", import.meta.url);

const repositories = {
  ielts: { owner: "Kitkitkittt", repo: "IELTS", branch: "master" },
  gre: { owner: "Kitkitkittt", repo: "GRE-CN", branch: "master" },
  gmat: { owner: "Kitkitkittt", repo: "gmat.site", branch: "main" },
};

const token = process.env.GITHUB_TOKEN;
const headers = { Accept: "application/vnd.github+json", "User-Agent": "exam-prep-archive-catalog" };
if (token) headers.Authorization = `Bearer ${token}`;

async function treeFor({ owner, repo, branch }) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers });
  if (!response.ok) throw new Error(`Could not read ${owner}/${repo}: ${response.status}`);
  const payload = await response.json();
  if (payload.truncated) throw new Error(`${owner}/${repo} tree response was truncated.`);
  return payload.tree.filter((item) => item.type === "blob");
}

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function extension(path) {
  return path.split(".").pop().toLowerCase();
}

function kindFor(path) {
  const ext = extension(path);
  if (ext === "pdf") return "pdf";
  if (["mp3", "m4a", "wav", "ogg"].includes(ext)) return "audio";
  if (["png", "jpg", "jpeg", "webp"].includes(ext)) return "image";
  if (ext === "md") return "markdown";
  if (ext === "json") return "json";
  if (["txt", "csv"].includes(ext)) return "text";
  return "download";
}

function links(repo, path) {
  const encoded = encodePath(path);
  return {
    url: `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${repo.branch}/${encoded}`,
    repositoryUrl: `https://github.com/${repo.owner}/${repo.repo}/blob/${repo.branch}/${encoded}`,
  };
}

function makeMaterial(exam, repo, item, details) {
  const materialLinks = links(repo, item.path);
  return {
    id: createHash("sha1").update(`${exam}:${item.path}`).digest("hex").slice(0, 12),
    exam,
    path: item.path,
    size: item.size || 0,
    format: extension(item.path).toUpperCase(),
    kind: kindFor(item.path),
    collection: details.category,
    variant: null,
    skill: null,
    test: null,
    part: null,
    role: null,
    publisher: `${repo.owner}/${repo.repo}`,
    access: "hosted",
    location: "github",
    verifiedOn: null,
    ...details,
    ...materialLinks,
    sourceUrl: materialLinks.repositoryUrl,
  };
}

const ieltsEnglishTitles = new Map([
  ["ielts-exam-overview", "IELTS exam overview and format"],
  ["ielts-16-trial-edition", "Cambridge IELTS 16 — Trial edition"],
  ["canadian-graduates-chart", "Canadian graduates chart"],
  ["port-comparison-diagram", "Port comparison diagram"],
  ["social-centre-activities-chart", "Social centre activities chart"],
  ["uk-fast-food-consumption-chart", "UK fast-food consumption chart"],
  ["line-graph-model-answer", "Line graph model answer"],
  ["port-harbour-changes-cambridge-19", "Port changes comparison — Cambridge 19"],
  ["social-centre-participation-cambridge-19", "Social centre participation — Cambridge 19"],
  ["task2-model-answers-jan-apr-2022", "Task 2 model answers — January to April 2022"],
  ["seven-weeks-to-writing-band-7", "Seven weeks to IELTS Writing Band 7"],
  ["ideas-for-ielts-topics", "Ideas for IELTS topics"],
  ["cambridge-chart-questions-collection", "Cambridge chart-question collection"],
  ["high-scoring-writing-samples", "High-scoring Cambridge IELTS writing samples"],
  ["path-to-writing-band-6-5", "Path to IELTS Writing Band 6.5"],
  ["band-7-writing-sample-288-words", "Band 7 writing sample — 288 words"],
  ["band-7-model-essays", "IELTS Band 7 model essays"],
  ["writing-master-guide", "IELTS Writing master guide"],
  ["writing-vocabulary", "IELTS Writing vocabulary"],
  ["ielts-writing-tutorial", "IELTS Writing tutorial"],
  ["four-weeks-to-listening", "Four weeks to IELTS Listening"],
  ["listening-key-vocabulary", "Cambridge IELTS Listening key vocabulary"],
  ["listening-vocabulary-companion", "IELTS Listening vocabulary companion"],
  ["vocabulary-focus-listening", "IELTS vocabulary focus — Listening"],
]);

function humanize(name) {
  return name.replaceAll("-", " ").replaceAll("_", " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function baseName(path) {
  return path.split("/").pop().replace(/\.[^.]+$/, "");
}

function audioDetails(path) {
  const basename = baseName(path);
  const testFromDirectory = path.match(/Test\s*([1-8])/i)?.[1];
  const patterns = [
    /Test\s*([1-8]).*?(?:Section|Part|Audio)[\s._-]*([1-5])/i,
    /t([1-8])_audio([1-5])/i,
    /section\s*([1-8])[\s._-]+(?:part)?\s*([1-5])/i,
    /Test\s*([1-8])[\s._-]+([1-5])/i,
  ];
  for (const pattern of patterns) {
    const match = basename.match(pattern);
    if (match) return { label: `Test ${match[1]} · Part ${match[2]}`, test: Number(match[1]), part: Number(match[2]) };
  }
  const part = basename.match(/(?:Part|Audio)[\s._-]*([1-5])/i)?.[1];
  if (testFromDirectory && part) return { label: `Test ${testFromDirectory} · Part ${part}`, test: Number(testFromDirectory), part: Number(part) };
  return { label: basename.replace(/^\d+[\s._-]*/, "").replaceAll("_", " ").replaceAll(".", " · "), test: null, part: null };
}

function ieltsMaterials(tree, repo) {
  const accepted = tree.filter((item) =>
    /^(guides\/|Cambridge IELTS\/Volume \d+\/|writing\/|listening\/)/.test(item.path) &&
    item.path !== "Cambridge IELTS/local-library-manifest.json",
  );
  return accepted.map((item) => {
    const newBook = item.path.match(/^Cambridge IELTS\/Volume (\d+)\/Academic\/Practice Book\/.*\.pdf$/);
    const newAudioPart = item.path.match(/^Cambridge IELTS\/Volume (\d+)\/Academic\/Listening\/Test (\d+)\/Part (\d+)\.(mp3|m4a|wav|ogg)$/);
    const newAudioComplete = item.path.match(/^Cambridge IELTS\/Volume (\d+)\/Academic\/Listening\/Test (\d+)\/Complete Listening Test\.mp3$/);
    const volume = newBook ? Number(newBook[1]) : newAudioPart ? Number(newAudioPart[1]) : newAudioComplete ? Number(newAudioComplete[1]) : item.path === "guides/ielts-16-trial-edition.pdf" ? 16 : null;
    if (newBook) return makeMaterial("ielts", repo, item, { title: `Cambridge IELTS ${volume} — Practice book`, category: "cambridge", collection: "cambridge", volume, variant: "academic", role: "practice_book", publisher: "Cambridge University Press & Assessment" });
    if (newAudioPart) return makeMaterial("ielts", repo, item, { title: `Cambridge IELTS ${volume} — Test ${newAudioPart[2]} · Part ${newAudioPart[3]}`, category: "cambridge", collection: "cambridge", volume, variant: "academic", skill: "listening", test: Number(newAudioPart[2]), part: Number(newAudioPart[3]), role: "listening_audio", publisher: "Cambridge University Press & Assessment" });
    if (newAudioComplete) return makeMaterial("ielts", repo, item, { title: `Cambridge IELTS ${volume} — Test ${newAudioComplete[2]} · Complete Listening`, category: "cambridge", collection: "cambridge", volume, variant: "academic", skill: "listening", test: Number(newAudioComplete[2]), part: null, role: "listening_audio", publisher: "Cambridge University Press & Assessment" });
    const basename = baseName(item.path);
    const category = item.path.startsWith("listening/materials/") ? "listening" : item.path.startsWith("writing/") ? "writing" : item.path.startsWith("guides/") ? "guides" : "guides";
    return makeMaterial("ielts", repo, item, { title: ieltsEnglishTitles.get(basename) || humanize(basename), category, collection: category, volume });
  }).sort((a, b) => (a.volume || 99) - (b.volume || 99) || a.title.localeCompare(b.title));
}

function greTitle(path) {
  const name = baseName(path);
  const format = extension(path).toUpperCase();
  if (/Magoosh/i.test(name)) return `Magoosh GRE flashcard deck (${format})`;
  if (/17天/.test(name)) return `17-day GRE vocabulary guide (${format})`;
  if (/词以类记/.test(name)) return `GRE vocabulary by category (${format})`;
  if (/词汇精选/.test(name)) return `Selected GRE vocabulary list (${format})`;
  if (/陈琦|再要你命|核心词汇助记/.test(name)) return `GRE Core 3000 vocabulary (${format})`;
  if (/佛脚/.test(name)) return `GRE last-minute vocabulary (${format})`;
  if (/Barron|巴朗/i.test(name)) return `Barron's 3500-word vocabulary list (${format})`;
  if (/同义词/.test(name)) return `GRE synonym list (${format})`;
  if (/补充词汇/.test(name)) return `Supplementary GRE vocabulary (${format})`;
  if (/机经词汇/.test(name)) return `High-frequency GRE vocabulary (${format})`;
  if (/阅读真题.*答案/.test(name)) return `GRE reading collection answers (${format})`;
  if (/阅读真题/.test(name)) return `GRE reading practice collection (${format})`;
  return `GRE study material (${format})`;
}

function greMaterials(tree, repo) {
  return tree.filter((item) => item.path.startsWith("L-GRE-") && !/COPYING|\.gitignore$/.test(item.path)).map((item) => makeMaterial("gre", repo, item, {
    title: greTitle(item.path),
    category: item.path.startsWith("L-GRE-阅读/") ? "reading" : "vocabulary",
    volume: null,
  })).sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
}

function gmatMaterials(tree, repo) {
  const names = {
    "client/public/data/demo-questions.json": "GMAT demonstration question bank",
    "client/public/data/demo100-questions.json": "GMAT 100-question practice bank",
  };
  return tree.filter((item) => names[item.path]).map((item) => makeMaterial("gmat", repo, item, {
    title: names[item.path],
    category: "question-banks",
    volume: null,
  }));
}

function externalCategory(source) {
  if (source.collection === "cambridge") return "cambridge";
  if (source.exam === "ielts") return source.skill || "official";
  if (source.exam === "gre") {
    if (source.skill === "quant") return "quant";
    if (source.collection === "lectures") return "lectures";
    if (source.collection === "practice_tests") return "practice-tests";
    return "official";
  }
  if (source.exam === "gmat") {
    if (source.skill === "data_insights") return "data-insights";
    if (source.skill === "quant" || source.skill === "verbal") return source.skill;
    if (source.collection === "lectures") return "lectures";
    return "official";
  }
  return source.collection;
}

function externalKind(resourceKind) {
  if (resourceKind === "pdf") return "pdf";
  if (resourceKind === "audio") return "audio";
  if (["video", "video_index", "video_course"].includes(resourceKind)) return "video";
  return "external";
}

function externalFormat(resourceKind) {
  const labels = {
    digital_pack: "DIGITAL PACK",
    web_app: "WEB APP",
    video_index: "VIDEO",
    video_course: "VIDEO COURSE",
    web: "WEB",
    zip: "ZIP",
    pdf: "PDF",
    audio: "MP3",
    digital_book: "DIGITAL BOOK",
  };
  return labels[resourceKind] || resourceKind.replaceAll("_", " ").toUpperCase();
}

function normalizeExternal(source, verifiedOn) {
  return {
    id: source.id,
    exam: source.exam,
    path: null,
    size: 0,
    format: externalFormat(source.resource_kind),
    kind: externalKind(source.resource_kind),
    title: source.title,
    category: externalCategory(source),
    collection: source.collection,
    volume: source.edition ?? null,
    variant: source.variant ?? null,
    skill: source.skill ?? null,
    test: source.test ?? null,
    part: source.part ?? null,
    role: source.role ?? source.resource_kind,
    resourceKind: source.resource_kind,
    publisher: source.publisher,
    access: source.access,
    location: "external",
    url: source.url,
    repositoryUrl: null,
    sourceUrl: source.url,
    year: source.year ?? null,
    isbn: source.isbn ?? null,
    notes: source.notes ?? null,
    mirrorPolicy: source.mirror_policy,
    verifiedOn,
  };
}

const roleOrder = new Map([
  ["digital_pack", 0],
  ["digital_book", 0],
  ["practice_book", 1],
  ["excerpt", 2],
  ["frontmatter", 2],
  ["listening_audio", 3],
]);

function sortMaterials(left, right) {
  if (left.exam !== right.exam) return left.exam.localeCompare(right.exam);
  if ((left.volume ?? -1) !== (right.volume ?? -1)) return (right.volume ?? -1) - (left.volume ?? -1);
  const roleDifference = (roleOrder.get(left.role) ?? 9) - (roleOrder.get(right.role) ?? 9);
  if (roleDifference) return roleDifference;
  if ((left.test ?? 0) !== (right.test ?? 0)) return (left.test ?? 0) - (right.test ?? 0);
  if ((left.part ?? 0) !== (right.part ?? 0)) return (left.part ?? 0) - (right.part ?? 0);
  return left.title.localeCompare(right.title);
}

const sourceManifest = JSON.parse(await readFile(sourceManifestUrl, "utf8"));
const trees = Object.fromEntries(await Promise.all(Object.entries(repositories).map(async ([exam, repo]) => [exam, await treeFor(repo)])));
const materials = [
  ...ieltsMaterials(trees.ielts, repositories.ielts),
  ...greMaterials(trees.gre, repositories.gre),
  ...gmatMaterials(trees.gmat, repositories.gmat),
  ...sourceManifest.sources.map((source) => normalizeExternal(source, sourceManifest.verified_on)),
].sort(sortMaterials);
const volumes = Array.from({ length: 21 }, (_, index) => {
  const volume = index + 1;
  const files = materials.filter((item) => item.exam === "ielts" && item.volume === volume);
  const hostedFiles = files.filter((item) => item.access === "hosted");
  const publicOfficial = files.filter((item) => item.access === "public_official");
  const licensed = files.filter((item) => item.access === "licensed");
  const status = hostedFiles.length ? "hosted" : publicOfficial.length ? "official" : licensed.length ? "licensed" : "missing";
  return {
    volume,
    available: files.length > 0,
    status,
    files: files.length,
    hostedFiles: hostedFiles.length,
    externalFiles: files.length - hostedFiles.length,
    bytes: hostedFiles.reduce((sum, item) => sum + item.size, 0),
  };
});

const catalog = {
  generatedAt: new Date().toISOString(),
  verifiedOn: sourceManifest.verified_on,
  sourceRegistryTitle: sourceManifest.title,
  repositories,
  volumes,
  materials,
};

await mkdir(new URL("../public/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/catalog.json", import.meta.url), `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Wrote ${materials.length} materials (${materials.filter((item) => item.exam === "ielts").length} IELTS, ${materials.filter((item) => item.exam === "gre").length} GRE, ${materials.filter((item) => item.exam === "gmat").length} GMAT; ${sourceManifest.sources.length} curated sources).`);
