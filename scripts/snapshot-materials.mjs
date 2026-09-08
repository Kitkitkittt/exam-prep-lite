import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

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
  return {
    id: createHash("sha1").update(`${exam}:${item.path}`).digest("hex").slice(0, 12),
    exam,
    path: item.path,
    size: item.size || 0,
    format: extension(item.path).toUpperCase(),
    kind: kindFor(item.path),
    ...details,
    ...links(repo, item.path),
  };
}

const ieltsNameMap = new Map([
  ["IELTS 整体介绍&考试内容", "IELTS exam overview and format"],
  ["IELTS16_体验版", "Cambridge IELTS 16 — Trial edition"],
  ["加拿大毕业生图", "Canadian graduates chart"],
  ["港口对比图", "Port comparison diagram"],
  ["社交中心活动图", "Social centre activities chart"],
  ["英国快餐消费图", "UK fast-food consumption chart"],
  ["折线图范文", "Line graph model answer"],
  ["港口变化对比-剑桥19", "Port changes comparison — Cambridge 19"],
  ["社交中心活动参与-剑桥19", "Social centre participation — Cambridge 19"],
  ["2022年1-4月大作文真题范文", "Task 2 model answers — January to April 2022"],
  ["7周突破雅思写作7分-杨凡", "Seven weeks to IELTS Writing Band 7"],
  ["Ideas-for-IELTS-Topics", "Ideas for IELTS topics"],
  ["剑桥图表题大全", "Cambridge chart-question collection"],
  ["剑桥雅思写作高分范文", "High-scoring Cambridge IELTS writing samples"],
  ["过雅思写作6.5", "Path to IELTS Writing Band 6.5"],
  ["雅思写作7分288词", "Band 7 writing sample — 288 words"],
  ["雅思写作7范文", "IELTS Band 7 model essays"],
  ["雅思写作真经", "IELTS Writing master guide"],
  ["雅思写作词汇", "IELTS Writing vocabulary"],
  ["黑眼睛雅思写作教程", "IELTS Writing tutorial"],
  ["4周攻克雅思听力", "Four weeks to IELTS Listening"],
  ["剑桥雅思听力考点词", "Cambridge IELTS Listening key vocabulary"],
  ["雅思听力词汇小伴侣", "IELTS Listening vocabulary companion"],
  ["雅思词汇精讲-听力", "IELTS vocabulary focus — Listening"],
]);

function baseName(path) {
  return path.split("/").pop().replace(/\.[^.]+$/, "");
}

function audioLabel(path) {
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
    if (match) return `Test ${match[1]} · Part ${match[2]}`;
  }
  const part = basename.match(/(?:Part|Audio)[\s._-]*([1-5])/i)?.[1];
  if (testFromDirectory && part) return `Test ${testFromDirectory} · Part ${part}`;
  return basename.replace(/^\d+[\s._-]*/, "").replaceAll("_", " ").replaceAll(".", " · ");
}

function ieltsMaterials(tree, repo) {
  const accepted = tree.filter((item) =>
    /^(IELTS 整体介绍&考试内容\.md|IELTS16_体验版\.pdf|剑桥雅思真题\d+\.pdf|雅思真题音频\/|雅思作文案例\/|雅思作文资料\/|雅思听力资料\/)/.test(item.path),
  );
  return accepted.map((item) => {
    const book = item.path.match(/^剑桥雅思真题(\d+)\.pdf$/);
    const audioVolume = item.path.match(/^雅思真题音频\/(\d+)-剑桥雅思(\d+)\//);
    const volume = book ? Number(book[1]) : audioVolume ? Number(audioVolume[2]) : item.path === "IELTS16_体验版.pdf" ? 16 : null;
    if (book) return makeMaterial("ielts", repo, item, { title: `Cambridge IELTS ${volume} — Practice book`, category: "cambridge", volume });
    if (audioVolume) return makeMaterial("ielts", repo, item, { title: `Cambridge IELTS ${volume} — ${audioLabel(item.path)}`, category: "cambridge", volume });
    const basename = baseName(item.path);
    const category = item.path.startsWith("雅思听力资料/") ? "listening" : item.path.startsWith("雅思作文") ? "writing" : item.path === "IELTS16_体验版.pdf" ? "cambridge" : "guides";
    return makeMaterial("ielts", repo, item, { title: ieltsNameMap.get(basename) || `IELTS ${category} material`, category, volume });
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

const trees = Object.fromEntries(await Promise.all(Object.entries(repositories).map(async ([exam, repo]) => [exam, await treeFor(repo)])));
const materials = [
  ...ieltsMaterials(trees.ielts, repositories.ielts),
  ...greMaterials(trees.gre, repositories.gre),
  ...gmatMaterials(trees.gmat, repositories.gmat),
];
const volumes = Array.from({ length: 21 }, (_, index) => {
  const volume = index + 1;
  const files = materials.filter((item) => item.exam === "ielts" && item.volume === volume);
  return { volume, available: files.length > 0, files: files.length, bytes: files.reduce((sum, item) => sum + item.size, 0) };
});

const catalog = {
  generatedAt: new Date().toISOString(),
  repositories,
  volumes,
  materials,
};

await mkdir(new URL("../public/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/catalog.json", import.meta.url), `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Wrote ${materials.length} materials (${materials.filter((item) => item.exam === "ielts").length} IELTS, ${materials.filter((item) => item.exam === "gre").length} GRE, ${materials.filter((item) => item.exam === "gmat").length} GMAT).`);
