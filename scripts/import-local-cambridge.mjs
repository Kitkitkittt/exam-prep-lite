import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const workspaceRoot = resolve(appRoot, "..");
const ieltsRoot = resolve(workspaceRoot, "IELTS");
const sourceFlag = process.argv.indexOf("--source");

if (sourceFlag === -1 || !process.argv[sourceFlag + 1]) {
  throw new Error("Usage: node scripts/import-local-cambridge.mjs --source /absolute/path/to/cam19-20");
}

const sourceRoot = resolve(process.argv[sourceFlag + 1]);

function destination(volume, ...segments) {
  return resolve(ieltsRoot, "Cambridge IELTS", `Volume ${volume}`, "Academic", ...segments);
}

const files = [
  {
    volume: 19,
    kind: "book",
    source: "Cambridge 19.pdf",
    destination: destination(19, "Practice Book", "Cambridge IELTS 19 Academic Practice Book.pdf"),
  },
  {
    volume: 20,
    kind: "book",
    source: "CAMBRIDGE 20 IELTS.pdf",
    destination: destination(20, "Practice Book", "Cambridge IELTS 20 Academic Practice Book.pdf"),
  },
  {
    volume: 21,
    kind: "book",
    source: "Cambridge IELTS 21.pdf",
    destination: destination(21, "Practice Book", "Cambridge IELTS 21 Academic Practice Book.pdf"),
  },
];

for (let test = 1; test <= 4; test += 1) {
  for (let part = 1; part <= 4; part += 1) {
    files.push({
      volume: 19,
      kind: "audio",
      test,
      part,
      source: `IELTS 19 Audio/Test${test} Part${part}.mp3`,
      destination: destination(19, "Listening", `Test ${test}`, `Part ${part}.mp3`),
    });
    files.push({
      volume: 20,
      kind: "audio",
      test,
      part,
      source: `cambridge ielts 20 audio/剑桥20/T${test}S${part}.m4a`,
      destination: destination(20, "Listening", `Test ${test}`, `Part ${part}.m4a`),
    });
  }

  files.push({
    volume: 21,
    kind: "audio",
    test,
    part: null,
    source: `Cambridge IELTS 21 Audio/Cambridge 21 - Test ${test}.mp3`,
    destination: destination(21, "Listening", `Test ${test}`, "Complete Listening Test.mp3"),
  });
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

const entries = [];
for (const file of files) {
  const source = resolve(sourceRoot, file.source);
  await mkdir(dirname(file.destination), { recursive: true });
  await copyFile(source, file.destination);
  const [sourceHash, destinationHash, metadata] = await Promise.all([
    sha256(source),
    sha256(file.destination),
    stat(file.destination),
  ]);
  if (sourceHash !== destinationHash) throw new Error(`Hash mismatch after copying ${file.source}`);
  entries.push({
    volume: file.volume,
    kind: file.kind,
    test: file.test ?? null,
    part: file.part ?? null,
    path: relative(ieltsRoot, file.destination).split("\\").join("/"),
    bytes: metadata.size,
    sha256: destinationHash,
  });
}

const manifestPath = resolve(ieltsRoot, "Cambridge IELTS", "local-library-manifest.json");
await writeFile(manifestPath, `${JSON.stringify({
  title: "Private local Cambridge IELTS library",
  scope: "Local educational use only; not prepared for publication or distribution.",
  importedAt: new Date().toISOString(),
  source: "User-provided local folder",
  files: entries,
}, null, 2)}\n`);

console.log(`Imported ${entries.length} files into ${relative(workspaceRoot, ieltsRoot)} with verified SHA-256 hashes.`);
