import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const catalog = JSON.parse(await readFile(new URL("../public/catalog.json", import.meta.url), "utf8"));

test("catalog points only at material repositories owned by the user", () => {
  for (const repository of Object.values(catalog.repositories)) assert.equal(repository.owner, "Kitkitkittt");
  for (const material of catalog.materials) assert.match(material.url, /^https:\/\/raw\.githubusercontent\.com\/Kitkitkittt\//);
});

test("Cambridge index covers volumes 1 through 21 without inventing availability", () => {
  assert.deepEqual(catalog.volumes.map((item) => item.volume), Array.from({ length: 21 }, (_, index) => index + 1));
  assert.deepEqual(catalog.volumes.filter((item) => item.available).map((item) => item.volume), [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
  assert.deepEqual(catalog.volumes.filter((item) => !item.available).map((item) => item.volume), [1, 2, 3, 19, 20, 21]);
});

test("catalog includes substantial IELTS, GRE, and GMAT collections", () => {
  assert.ok(catalog.materials.filter((item) => item.exam === "ielts").length >= 270);
  assert.ok(catalog.materials.filter((item) => item.exam === "gre").length >= 30);
  assert.ok(catalog.materials.filter((item) => item.exam === "gmat").length >= 2);
});

test("visible titles are English and repository file limits are respected", () => {
  for (const material of catalog.materials) {
    assert.doesNotMatch(material.title, /\p{Script=Han}/u);
    assert.ok(material.size < 100 * 1024 * 1024, `${material.title} exceeds GitHub's regular file limit`);
  }
});

test("every material has complete retrieval metadata", () => {
  for (const material of catalog.materials) {
    assert.ok(material.id);
    assert.ok(material.title);
    assert.ok(material.kind);
    assert.ok(material.format);
    assert.ok(material.repositoryUrl.startsWith("https://github.com/Kitkitkittt/"));
  }
});
