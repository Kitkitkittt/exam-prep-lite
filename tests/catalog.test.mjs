import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const catalog = JSON.parse(await readFile(new URL("../public/catalog.json", import.meta.url), "utf8"));
const registry = JSON.parse(await readFile(new URL("../sources/official.json", import.meta.url), "utf8"));
const hosted = catalog.materials.filter((material) => material.access === "hosted");
const external = catalog.materials.filter((material) => material.location === "external");

test("hosted files remain in material repositories owned by the user", () => {
  for (const repository of Object.values(catalog.repositories)) assert.equal(repository.owner, "Kitkitkittt");
  for (const material of hosted) {
    assert.match(material.url, /^https:\/\/raw\.githubusercontent\.com\/Kitkitkittt\//);
    assert.match(material.repositoryUrl, /^https:\/\/github\.com\/Kitkitkittt\//);
    assert.equal(material.location, "github");
  }
});

test("curated records retain external-source policy and verification metadata", () => {
  assert.equal(catalog.verifiedOn, registry.verified_on);
  assert.equal(external.length, registry.sources.length);
  assert.equal(new Set(registry.sources.map((source) => source.id)).size, registry.sources.length);
  for (const material of external) {
    assert.match(material.url, /^https:\/\//);
    assert.equal(material.repositoryUrl, null);
    assert.ok(["public_official", "licensed", "third_party_free"].includes(material.access));
    assert.ok(material.verifiedOn);
  }
});

test("Cambridge editions distinguish hosted, official, and missing states", () => {
  assert.deepEqual(catalog.volumes.map((item) => item.volume), Array.from({ length: 21 }, (_, index) => index + 1));
  assert.deepEqual(catalog.volumes.filter((item) => item.status === "missing").map((item) => item.volume), [1, 2, 3]);
  assert.deepEqual(catalog.volumes.filter((item) => item.status === "hosted").map((item) => item.volume), [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
  assert.deepEqual(catalog.volumes.filter((item) => item.status === "official").map((item) => item.volume), [19, 20, 21]);
  assert.equal(catalog.materials.some((item) => item.exam === "ielts" && item.volume >= 19 && item.access === "hosted"), false);
});

test("catalog includes current IELTS, GRE, and GMAT source layers", () => {
  assert.ok(catalog.materials.filter((item) => item.exam === "ielts").length >= 300);
  assert.ok(catalog.materials.filter((item) => item.exam === "gre").length >= 40);
  assert.ok(catalog.materials.filter((item) => item.exam === "gmat").length >= 9);
  assert.ok(catalog.materials.some((item) => item.id === "ielts-cam21-academic-pack" && item.access === "licensed"));
  assert.ok(catalog.materials.some((item) => item.id === "gre-powerprep"));
  assert.ok(catalog.materials.some((item) => item.id === "gmat-official-starter-kit"));
});

test("hosted Cambridge audio is grouped by test and part metadata", () => {
  const cam18Audio = catalog.materials.filter((item) => item.volume === 18 && item.role === "listening_audio");
  assert.equal(cam18Audio.length, 16);
  assert.deepEqual([...new Set(cam18Audio.map((item) => item.test))], [1, 2, 3, 4]);
  assert.deepEqual([...new Set(cam18Audio.map((item) => item.part))], [1, 2, 3, 4]);
});

test("visible titles are English and regular hosted files respect GitHub limits", () => {
  for (const material of catalog.materials) {
    assert.doesNotMatch(material.title, /\p{Script=Han}/u);
    if (material.location === "github") assert.ok(material.size < 100 * 1024 * 1024, `${material.title} exceeds GitHub's regular file limit`);
  }
});

test("every material has normalized retrieval and access metadata", () => {
  for (const material of catalog.materials) {
    assert.ok(material.id);
    assert.ok(material.title);
    assert.ok(material.kind);
    assert.ok(material.format);
    assert.ok(material.publisher);
    assert.ok(["hosted", "public_official", "licensed", "third_party_free"].includes(material.access));
    assert.ok(["github", "external"].includes(material.location));
    assert.match(material.url, /^https:\/\//);
  }
});
