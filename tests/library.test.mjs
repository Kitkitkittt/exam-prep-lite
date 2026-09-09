import test from "node:test";
import assert from "node:assert/strict";
import { filterMaterials, formatBytes, isPreviewable, summarizeExam } from "../src/library.js";

const materials = [
  { id: "one", exam: "ielts", category: "cambridge", volume: 18, title: "Cambridge IELTS 18", format: "PDF", kind: "pdf", size: 2_000_000, access: "hosted", location: "github", publisher: "Cambridge" },
  { id: "two", exam: "ielts", category: "writing", volume: null, title: "Writing guide", format: "PDF", kind: "pdf", size: 1_000_000, access: "public_official", location: "external", publisher: "IELTS.org" },
  { id: "four", exam: "ielts", category: "cambridge", volume: 21, title: "Cambridge IELTS 21", format: "DIGITAL PACK", kind: "external", size: 0, access: "licensed", location: "external", publisher: "Cambridge" },
  { id: "three", exam: "gre", category: "vocabulary", volume: null, title: "GRE words", format: "CSV", kind: "text", size: 500_000, access: "hosted", location: "github", publisher: "Kitkitkittt/GRE-CN" },
];

test("formatBytes produces compact readable values", () => {
  assert.equal(formatBytes(900), "900 B");
  assert.equal(formatBytes(1024), "1.0 KB");
  assert.equal(formatBytes(10 * 1024 * 1024), "10 MB");
});

test("filterMaterials combines exam, category, volume, and search", () => {
  assert.deepEqual(filterMaterials(materials, { exam: "ielts", category: "cambridge", volume: 18, query: "pdf" }).map((item) => item.id), ["one"]);
  assert.deepEqual(filterMaterials(materials, { exam: "ielts", category: "all", volume: null, query: "writing" }).map((item) => item.id), ["two"]);
  assert.deepEqual(filterMaterials(materials, { exam: "ielts", category: "all", kindFilter: "external", accessFilter: "licensed", query: "Cambridge" }).map((item) => item.id), ["four"]);
  assert.deepEqual(filterMaterials(materials, { exam: "ielts", category: "bookmarks", bookmarkedIds: ["two"] }).map((item) => item.id), ["two"]);
});

test("summarizeExam reports file count, byte count, and categories", () => {
  assert.deepEqual(summarizeExam(materials, "ielts"), { files: 3, bytes: 3_000_000, hosted: 1, external: 2, categories: ["cambridge", "writing"] });
});

test("previewable formats are explicit", () => {
  assert.equal(isPreviewable({ kind: "audio" }), true);
  assert.equal(isPreviewable({ kind: "download" }), false);
});
