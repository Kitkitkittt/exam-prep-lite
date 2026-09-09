import "./styles.css";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { EXAM_LABELS, filterMaterials, formatBytes, summarizeExam } from "./library.js";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const app = document.querySelector("#app");
const storageKeys = {
  bookmarks: "exam-prep-archive:bookmarks",
  completed: "exam-prep-archive:completed",
  recent: "exam-prep-archive:recent",
  lastOpened: "exam-prep-archive:last-opened",
};

function storedArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

const preferences = {
  bookmarks: new Set(storedArray(storageKeys.bookmarks)),
  completed: new Set(storedArray(storageKeys.completed)),
  recent: storedArray(storageKeys.recent),
};

const state = {
  exam: "ielts",
  category: "cambridge",
  volume: 21,
  query: "",
  kindFilter: "all",
  accessFilter: "all",
  selectedId: null,
};

let catalog = null;
let previewRequest = 0;

const categoryConfig = {
  ielts: [
    ["recent", "Recent"],
    ["bookmarks", "Bookmarks"],
    ["cambridge", "Cambridge 1–21"],
    ["official", "Official tests"],
    ["listening", "Listening"],
    ["reading", "Reading"],
    ["writing", "Writing"],
    ["speaking", "Speaking"],
    ["guides", "Exam guides"],
  ],
  gre: [
    ["recent", "Recent"],
    ["bookmarks", "Bookmarks"],
    ["official", "Official ETS"],
    ["practice-tests", "Practice tests"],
    ["quant", "Quant"],
    ["lectures", "Videos"],
    ["vocabulary", "Vocabulary archive"],
    ["reading", "Reading archive"],
  ],
  gmat: [
    ["recent", "Recent"],
    ["bookmarks", "Bookmarks"],
    ["official", "Official GMAT"],
    ["quant", "Quant"],
    ["verbal", "Verbal"],
    ["data-insights", "Data Insights"],
    ["lectures", "Video courses"],
    ["question-banks", "Question banks"],
  ],
};

const accessLabels = {
  hosted: "Hosted",
  public_official: "Official",
  licensed: "Licensed",
  third_party_free: "Free course",
};

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function persistPreferences() {
  localStorage.setItem(storageKeys.bookmarks, JSON.stringify([...preferences.bookmarks]));
  localStorage.setItem(storageKeys.completed, JSON.stringify([...preferences.completed]));
  localStorage.setItem(storageKeys.recent, JSON.stringify(preferences.recent));
}

function fileGlyph(kind) {
  const labels = { pdf: "PDF", audio: "AUD", image: "IMG", markdown: "MD", json: "JSON", text: "TXT", video: "VID", external: "LINK", download: "FILE" };
  return `<span class="file-glyph file-${kind}">${labels[kind] || "FILE"}</span>`;
}

function accessBadge(material) {
  const label = material.location === "local" ? "Private local" : accessLabels[material.access] || material.access;
  return `<span class="access-badge access-${material.access}">${label}</span>`;
}

function selectedMaterial() {
  return catalog.materials.find((material) => material.id === state.selectedId) || null;
}

function filterState() {
  const searching = Boolean(state.query.trim());
  return {
    ...state,
    category: searching ? "all" : state.category,
    volume: searching ? null : state.volume,
    bookmarkedIds: [...preferences.bookmarks],
    recentIds: preferences.recent,
  };
}

function visibleMaterials() {
  return filterMaterials(catalog.materials, filterState());
}

function categoryCount(category) {
  return filterMaterials(catalog.materials, {
    exam: state.exam,
    category,
    bookmarkedIds: [...preferences.bookmarks],
    recentIds: preferences.recent,
  }).length;
}

function materialDetails(material) {
  const details = [material.format];
  if (material.size) details.push(formatBytes(material.size));
  if (material.publisher) details.push(material.publisher);
  return details.join(" · ");
}

function volumeStatusLabel(item) {
  if (item.status === "hosted") return `${item.hostedFiles} hosted files`;
  if (item.status === "official") return `${item.externalFiles} official resources`;
  if (item.status === "licensed") return `${item.externalFiles} licensed resources`;
  return "missing";
}

function sidebar() {
  const categories = categoryConfig[state.exam];
  return `
    <aside class="sidebar">
      <div class="side-section">
        <p class="section-label">Collections</p>
        <nav class="category-list" aria-label="Material categories">
          ${categories.map(([id, label]) => `
            <button class="category-button ${state.category === id && state.volume === null ? "is-active" : ""}" data-category="${id}">
              <span>${escapeHtml(label)}</span><b>${categoryCount(id)}</b>
            </button>
          `).join("")}
        </nav>
      </div>
      ${state.exam === "ielts" ? `
        <div class="side-section volume-section">
          <div class="section-line"><p class="section-label">Cambridge edition</p><span>Newest first</span></div>
          <div class="volume-grid">
            ${[...catalog.volumes].reverse().map((item) => `
              <button class="volume-button ${state.volume === item.volume ? "is-active" : ""} is-${item.status}" data-volume="${item.volume}" aria-label="Cambridge IELTS ${item.volume}, ${volumeStatusLabel(item)}">
                ${String(item.volume).padStart(2, "0")}<i></i>
              </button>
            `).join("")}
          </div>
          <div class="legend">
            <span><i class="dot hosted"></i>Hosted</span>
            <span><i class="dot official"></i>Official</span>
            <span><i class="dot licensed"></i>Licensed</span>
            <span><i class="dot missing"></i>Missing</span>
          </div>
        </div>
      ` : ""}
      <div class="registry-note">
        <span>Source registry</span>
        <strong>Verified ${escapeHtml(catalog.verifiedOn)}</strong>
        <small>Hosted files and external official sources are labelled separately.</small>
      </div>
    </aside>
  `;
}

function filterBar() {
  const kinds = [["all", "All"], ["pdf", "PDF"], ["audio", "Audio"], ["video", "Video"], ["external", "Web / Pack"]];
  const access = [["all", "Any access"], ["hosted", "Hosted"], ["public_official", "Official"], ["licensed", "Licensed"], ["third_party_free", "Free"]];
  return `
    <div class="filter-bar">
      <div aria-label="Resource type filters">${kinds.map(([id, label]) => `<button class="${state.kindFilter === id ? "is-active" : ""}" data-kind-filter="${id}">${label}</button>`).join("")}</div>
      <div aria-label="Access filters">${access.map(([id, label]) => `<button class="${state.accessFilter === id ? "is-active" : ""}" data-access-filter="${id}">${label}</button>`).join("")}</div>
    </div>
  `;
}

function materialRows(materials) {
  let previousTest = null;
  return materials.map((material) => {
    const testHeading = material.test && material.test !== previousTest
      ? `<div class="file-group"><span>Listening</span><strong>Test ${material.test}</strong></div>`
      : "";
    if (material.test) previousTest = material.test;
    const completion = preferences.completed.has(material.id) ? `<span class="completion-mark" aria-label="Completed">✓</span>` : "";
    const bookmark = preferences.bookmarks.has(material.id) ? `<span class="bookmark-mark" aria-label="Bookmarked">★</span>` : "";
    return `${testHeading}
      <button class="file-row ${state.selectedId === material.id ? "is-selected" : ""}" data-material="${material.id}">
        ${fileGlyph(material.kind)}
        <span class="file-copy"><strong>${escapeHtml(material.title)}</strong><small>${escapeHtml(materialDetails(material))}</small></span>
        <span class="row-status">${accessBadge(material)}${bookmark}${completion}</span>
        <span class="row-arrow">›</span>
      </button>`;
  }).join("");
}

function materialList() {
  const materials = visibleMaterials();
  const title = state.query.trim()
    ? `Search: ${state.query.trim()}`
    : state.volume !== null
      ? `Cambridge IELTS ${state.volume}`
      : categoryConfig[state.exam].find(([id]) => id === state.category)?.[1] || "All materials";
  return `
    <section class="file-panel">
      <header class="panel-header">
        <div><span>${EXAM_LABELS[state.exam]}</span><h2>${escapeHtml(title)}</h2></div>
        <b>${materials.length}</b>
      </header>
      ${filterBar()}
      <div class="file-scroll" id="file-scroll">
        ${materials.length ? materialRows(materials) : `
          <div class="empty-list">
            <h3>No matching resources</h3>
            <p>${state.volume ? `No hosted or verified external resources are currently catalogued for Cambridge IELTS ${state.volume}.` : "Change the collection or filters to see more material."}</p>
          </div>
        `}
      </div>
    </section>
  `;
}

function previewPanel() {
  const material = selectedMaterial();
  if (!material) {
    return `
      <section class="preview-panel empty-preview">
        <p class="section-label">Preview</p>
        <h2>Choose a resource</h2>
        <p>Select a Cambridge pack, PDF, audio track, question bank, or official learning source.</p>
      </section>
    `;
  }
  const primaryLabel = material.location === "local" ? "Open local file" : material.location === "github" ? "Open raw" : material.access === "licensed" ? "Open licensed source" : "Open official source";
  return `
    <section class="preview-panel">
      <header class="preview-header">
        <button class="mobile-back" data-back aria-label="Back to material list">‹ Back</button>
        <div class="preview-title">${fileGlyph(material.kind)}<div><span>${EXAM_LABELS[material.exam]}${material.volume ? ` / CAM ${material.volume}` : ` / ${escapeHtml(material.category)}`}</span><h2>${escapeHtml(material.title)}</h2><small>${escapeHtml(materialDetails(material))}</small></div></div>
        <div class="preview-actions">
          <button class="utility-action ${preferences.bookmarks.has(material.id) ? "is-active" : ""}" data-bookmark>${preferences.bookmarks.has(material.id) ? "★ Saved" : "☆ Save"}</button>
          <button class="utility-action ${preferences.completed.has(material.id) ? "is-active" : ""}" data-complete>${preferences.completed.has(material.id) ? "✓ Done" : "Mark done"}</button>
          ${material.repositoryUrl ? `<a href="${material.repositoryUrl}" target="_blank" rel="noreferrer">View file</a>` : ""}
          <a class="primary-action" href="${material.url}" target="_blank" rel="noreferrer">${primaryLabel}</a>
        </div>
      </header>
      <div class="preview-body">${previewMarkup(material)}</div>
      <footer class="preview-footer"><span><i></i>${material.location === "local" ? "Private file in your local repository" : material.location === "github" ? "Hosted in your GitHub repository" : `${accessLabels[material.access]} external source`}</span><code>${escapeHtml(material.publisher || "Source")}</code></footer>
    </section>
  `;
}

function previewMarkup(material) {
  if (material.kind === "pdf") return `
    <div id="pdf-preview" class="pdf-preview">
      <div class="pdf-toolbar">
        <button data-pdf-previous disabled aria-label="Previous PDF page">‹</button>
        <span id="pdf-page-status">Loading document…</span>
        <button data-pdf-next disabled aria-label="Next PDF page">›</button>
      </div>
      <div class="pdf-stage"><canvas id="pdf-canvas" aria-label="${escapeHtml(material.title)} preview"></canvas></div>
    </div>`;
  if (material.kind === "audio") return `<div class="audio-preview"><div class="audio-art"><span></span><i></i></div><p class="section-label">${material.test ? `Test ${material.test}${material.part ? ` · Part ${material.part}` : ""}` : "Listening material"}</p><h3>${escapeHtml(material.title)}</h3><audio controls preload="metadata" src="${material.url}"></audio><p>Play this track here or open the original source.</p></div>`;
  if (material.kind === "image") return `<div class="image-preview"><img src="${material.url}" alt="${escapeHtml(material.title)}" /></div>`;
  if (["markdown", "json", "text"].includes(material.kind)) return `<div id="text-preview" class="text-preview"><span class="loading-line"></span><span class="loading-line short"></span><p>Loading file preview…</p></div>`;
  return `
    <div class="external-preview">
      ${fileGlyph(material.kind)}
      ${accessBadge(material)}
      <p class="section-label">${escapeHtml(material.publisher || "External source")}</p>
      <h3>${escapeHtml(material.title)}</h3>
      ${material.notes ? `<p>${escapeHtml(material.notes)}</p>` : ""}
      <dl>
        ${material.variant ? `<div><dt>Variant</dt><dd>${escapeHtml(material.variant.replaceAll("_", " "))}</dd></div>` : ""}
        ${material.year ? `<div><dt>Edition year</dt><dd>${material.year}</dd></div>` : ""}
        ${material.isbn ? `<div><dt>ISBN</dt><dd>${escapeHtml(material.isbn)}</dd></div>` : ""}
        <div><dt>Access</dt><dd>${escapeHtml(material.location === "local" ? "Private local" : accessLabels[material.access] || material.access)}</dd></div>
      </dl>
      <a class="primary-action" href="${material.url}" target="_blank" rel="noreferrer">Open source</a>
    </div>`;
}

function render() {
  previewRequest += 1;
  const materials = visibleMaterials();
  const summary = summarizeExam(catalog.materials, state.exam);
  app.innerHTML = `
    <div class="archive-app ${state.selectedId ? "has-selection" : ""}">
      <header class="topbar">
        <button class="brand" data-home aria-label="Exam Prep Archive home"><span class="brand-mark">EA</span><span><strong>Exam Prep Archive</strong><small>Verified sources · ${catalog.verifiedOn}</small></span></button>
        <nav class="exam-tabs" aria-label="Choose exam">
          ${Object.entries(EXAM_LABELS).map(([id, label]) => `<button class="${state.exam === id ? "is-active" : ""}" data-exam="${id}">${label}</button>`).join("")}
        </nav>
        <label class="global-search"><span></span><input type="search" id="material-search" placeholder="Search titles, publishers, editions, skills…" value="${escapeHtml(state.query)}" /><kbd>/</kbd></label>
      </header>
      <main class="workspace">
        ${sidebar()}
        ${materialList()}
        ${previewPanel()}
      </main>
      <footer class="legal-strip">Independent educational archive. Licensed products open at their official source. <span>${summary.hosted} hosted · ${summary.external} external · ${materials.length} visible</span></footer>
    </div>
  `;
  attachEvents();
  const material = selectedMaterial();
  if (material?.kind === "pdf") loadPdfPreview(material);
  if (material && ["markdown", "json", "text"].includes(material.kind)) loadTextPreview(material);
}

async function loadPdfPreview(material) {
  const request = ++previewRequest;
  const container = document.querySelector("#pdf-preview");
  const canvas = document.querySelector("#pdf-canvas");
  const status = document.querySelector("#pdf-page-status");
  const previous = document.querySelector("[data-pdf-previous]");
  const next = document.querySelector("[data-pdf-next]");
  if (!container || !canvas || !status || !previous || !next) return;

  try {
    const documentTask = getDocument({ url: material.url, withCredentials: false });
    const pdf = await documentTask.promise;
    if (request !== previewRequest) {
      await documentTask.destroy();
      return;
    }

    let pageNumber = 1;
    let rendering = false;
    const renderPage = async (requestedPage) => {
      if (rendering || request !== previewRequest) return;
      rendering = true;
      pageNumber = Math.min(Math.max(requestedPage, 1), pdf.numPages);
      status.textContent = `Page ${pageNumber} of ${pdf.numPages}`;
      previous.disabled = pageNumber <= 1;
      next.disabled = pageNumber >= pdf.numPages;
      const page = await pdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(320, Math.min(container.clientWidth - 42, 980));
      const cssScale = Math.min(1.6, availableWidth / baseViewport.width);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: cssScale * pixelRatio });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / pixelRatio}px`;
      canvas.style.height = `${viewport.height / pixelRatio}px`;
      await page.render({ canvas, canvasContext: canvas.getContext("2d"), viewport }).promise;
      rendering = false;
    };

    previous.addEventListener("click", () => renderPage(pageNumber - 1));
    next.addEventListener("click", () => renderPage(pageNumber + 1));
    await renderPage(1);
  } catch {
    if (request === previewRequest) container.innerHTML = `<div class="preview-error"><h3>PDF preview unavailable</h3><p>Open the original source to view this document.</p></div>`;
  }
}

async function loadTextPreview(material) {
  const request = ++previewRequest;
  const container = document.querySelector("#text-preview");
  try {
    const response = await fetch(material.url);
    if (!response.ok) throw new Error(String(response.status));
    const text = await response.text();
    if (request !== previewRequest || !container) return;
    const preview = material.kind === "json" ? JSON.stringify(JSON.parse(text), null, 2) : text;
    container.innerHTML = `<pre>${escapeHtml(preview.slice(0, 120_000))}</pre>${preview.length > 120_000 ? "<p>Preview truncated. Open the source for the complete material.</p>" : ""}`;
  } catch {
    if (request === previewRequest && container) container.innerHTML = `<div class="preview-error"><h3>Preview unavailable</h3><p>Open the source to retrieve this file directly.</p></div>`;
  }
}

function selectMaterial(id, { track = true } = {}) {
  const material = catalog.materials.find((item) => item.id === id);
  if (!material) return;
  state.selectedId = id;
  if (track) {
    preferences.recent = [id, ...preferences.recent.filter((recentId) => recentId !== id)].slice(0, 16);
    localStorage.setItem(storageKeys.lastOpened, id);
    persistPreferences();
  }
  history.replaceState(null, "", `#resource=${encodeURIComponent(id)}`);
  render();
}

function chooseExam(exam) {
  state.exam = exam;
  state.category = exam === "ielts" ? "cambridge" : "official";
  state.volume = exam === "ielts" ? 21 : null;
  state.query = "";
  state.kindFilter = "all";
  state.accessFilter = "all";
  state.selectedId = null;
  history.replaceState(null, "", location.pathname + location.search);
  render();
}

function togglePreference(set, id) {
  if (set.has(id)) set.delete(id);
  else set.add(id);
  persistPreferences();
  render();
}

function clearSelection() {
  state.selectedId = null;
  history.replaceState(null, "", location.pathname + location.search);
}

function attachEvents() {
  document.querySelectorAll("[data-exam]").forEach((button) => button.addEventListener("click", () => chooseExam(button.dataset.exam)));
  document.querySelector("[data-home]")?.addEventListener("click", () => chooseExam("ielts"));
  document.querySelectorAll("[data-category]").forEach((button) => button.addEventListener("click", () => {
    state.category = button.dataset.category;
    state.volume = null;
    clearSelection();
    render();
  }));
  document.querySelectorAll("[data-volume]").forEach((button) => button.addEventListener("click", () => {
    state.category = "cambridge";
    state.volume = Number(button.dataset.volume);
    clearSelection();
    render();
  }));
  document.querySelectorAll("[data-kind-filter]").forEach((button) => button.addEventListener("click", () => {
    state.kindFilter = button.dataset.kindFilter;
    clearSelection();
    render();
  }));
  document.querySelectorAll("[data-access-filter]").forEach((button) => button.addEventListener("click", () => {
    state.accessFilter = button.dataset.accessFilter;
    clearSelection();
    render();
  }));
  document.querySelectorAll("[data-material]").forEach((button) => button.addEventListener("click", () => selectMaterial(button.dataset.material)));
  document.querySelector("[data-bookmark]")?.addEventListener("click", () => togglePreference(preferences.bookmarks, state.selectedId));
  document.querySelector("[data-complete]")?.addEventListener("click", () => togglePreference(preferences.completed, state.selectedId));
  document.querySelector("[data-back]")?.addEventListener("click", () => {
    state.selectedId = null;
    history.replaceState(null, "", location.pathname + location.search);
    render();
  });
  const search = document.querySelector("#material-search");
  search?.addEventListener("input", () => {
    state.query = search.value;
    clearSelection();
    const cursor = search.selectionStart;
    render();
    const next = document.querySelector("#material-search");
    next?.focus();
    next?.setSelectionRange(cursor, cursor);
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
    event.preventDefault();
    document.querySelector("#material-search")?.focus();
  }
});

fetch(import.meta.env.VITE_CATALOG_FILE || "./catalog.json")
  .then((response) => {
    if (!response.ok) throw new Error(`Catalog request failed with ${response.status}`);
    return response.json();
  })
  .then((data) => {
    catalog = data;
    const hashId = new URLSearchParams(location.hash.slice(1)).get("resource");
    const preferredId = hashId || localStorage.getItem(storageKeys.lastOpened);
    const preferred = catalog.materials.find((material) => material.id === preferredId);
    if (preferred) {
      state.exam = preferred.exam;
      state.category = preferred.category;
      state.volume = preferred.volume;
      selectMaterial(preferred.id, { track: false });
      return;
    }
    render();
  })
  .catch(() => {
    app.innerHTML = `<div class="fatal-error"><span class="brand-mark">EA</span><h1>The material catalog could not load.</h1><p>Refresh the page or check the GitHub Pages deployment.</p></div>`;
  });
