import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../sources/official.json", import.meta.url), "utf8"));
const allowedAccess = new Set(["public_official", "licensed", "third_party_free"]);
const allowedPolicies = new Set(["external_only", "external_link_or_cache_only_if_permission_verified"]);
const required = ["id", "exam", "collection", "title", "resource_kind", "publisher", "access", "mirror_policy", "url"];
const issues = [];
const ids = new Set();

for (const source of manifest.sources) {
  for (const field of required) {
    if (!source[field]) issues.push(`${source.id || "unnamed source"}: missing ${field}`);
  }
  if (ids.has(source.id)) issues.push(`${source.id}: duplicate id`);
  ids.add(source.id);
  if (!allowedAccess.has(source.access)) issues.push(`${source.id}: unsupported access ${source.access}`);
  if (!allowedPolicies.has(source.mirror_policy)) issues.push(`${source.id}: unsupported mirror policy ${source.mirror_policy}`);
  try {
    const url = new URL(source.url);
    if (url.protocol !== "https:") issues.push(`${source.id}: source URL must use HTTPS`);
  } catch {
    issues.push(`${source.id}: invalid URL`);
  }
  if (source.access === "licensed" && source.mirror_policy !== "external_only") issues.push(`${source.id}: licensed material must remain external-only`);
}

if (!manifest.verified_on) issues.push("registry: missing verified_on");
if (issues.length) {
  console.error(`Source registry validation failed (${issues.length}):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Registry valid: ${manifest.sources.length} unique HTTPS sources, verified ${manifest.verified_on}.`);

if (!process.argv.includes("--live")) process.exit(0);

async function request(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    let response = await fetch(source.url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "exam-prep-archive-source-checker" },
    });
    if ([400, 405, 501].includes(response.status)) {
      response = await fetch(source.url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { Range: "bytes=0-0", "User-Agent": "exam-prep-archive-source-checker" },
      });
    }
    if (response.status === 403) return { source, state: "blocked", status: 403 };
    if ([404, 410].includes(response.status)) return { source, state: "missing", status: response.status };
    if (response.ok || response.status === 206) return { source, state: "ok", status: response.status };
    return { source, state: "warning", status: response.status };
  } catch (error) {
    return { source, state: "warning", status: error.name === "AbortError" ? "timeout" : "network error" };
  } finally {
    clearTimeout(timeout);
  }
}

const results = [];
for (let index = 0; index < manifest.sources.length; index += 6) {
  results.push(...await Promise.all(manifest.sources.slice(index, index + 6).map(request)));
}

for (const result of results) console.log(`${result.state.toUpperCase().padEnd(7)} ${String(result.status).padEnd(5)} ${result.source.id}`);
const counts = results.reduce((groups, result) => {
  groups[result.state] ||= [];
  groups[result.state].push(result);
  return groups;
}, {});
console.log(`Health summary: ${counts.ok?.length || 0} ok, ${counts.blocked?.length || 0} automation-blocked, ${counts.warning?.length || 0} warnings, ${counts.missing?.length || 0} missing.`);
if (counts.missing?.length) process.exitCode = 1;
