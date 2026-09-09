import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const workspaceRoot = resolve(appRoot, "..");
const ieltsRoot = resolve(workspaceRoot, "IELTS");
const manifest = JSON.parse(await readFile(resolve(ieltsRoot, "Cambridge IELTS", "local-library-manifest.json"), "utf8"));
const catalog = JSON.parse(await readFile(resolve(appRoot, "public", "catalog.local.json"), "utf8"));

if (manifest.files.length !== 39) throw new Error(`Expected 39 imported files, found ${manifest.files.length}`);
if (manifest.files.some((entry) => /[^\x20-\x7E]/.test(entry.path))) throw new Error("Imported paths must use printable English/ASCII names only.");

for (const entry of manifest.files) {
  const path = resolve(ieltsRoot, entry.path);
  const metadata = await stat(path);
  if (metadata.size !== entry.bytes) throw new Error(`Size mismatch: ${entry.path}`);
  const hash = createHash("sha256").update(await readFile(path)).digest("hex");
  if (hash !== entry.sha256) throw new Error(`SHA-256 mismatch: ${entry.path}`);
}

for (const [volume, expected] of [[19, 17], [20, 17], [21, 5]]) {
  const localFiles = catalog.materials.filter((item) => item.location === "local" && item.volume === volume && item.path?.startsWith("Cambridge IELTS/"));
  if (localFiles.length !== expected) throw new Error(`CAM${volume}: expected ${expected} local resources, found ${localFiles.length}`);
}

console.log("Verified 39 English-named CAM19–21 files, hashes, sizes, and local catalog records.");
