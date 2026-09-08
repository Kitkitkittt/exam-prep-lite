import "./styles.css";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { EXAM_LABELS, filterMaterials, formatBytes, summarizeExam } from "./library.js";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const app = document.querySelector("#app");
const state = {
  exam: "ielts",
  category: "cambridge",
  volume: null,
  query: "",
  selectedId: null,
};

let catalog = null;
let previewRequest = 0;

const categoryConfig = {
  ielts: [
    ["cambridge", "Cambridge 1–21"],
    ["listening", "Listening guides"],
    ["writing", "Writing library"],
    ["guides", "Exam guides"],
  ],
  gre: [
    ["vocabulary", "Vocabulary"],
    ["reading", "Reading"],
  ],
  gmat: [
    ["question-banks", "Question banks"],
  ],
};

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function fileGlyph(kind) {
  const labels = { pdf: "PDF", audio: "AUD", image: "IMG", markdown: "MD", json: "JSON", text: "TXT", download: "FILE" };
  return `<span class="file-glyph file-${kind}">${labels[kind] || "FILE"}</span>`;
}

function selectedMaterial() {
  return catalog.materials.find((material) => material.id === state.selectedId) || null;
}

function visibleMaterials() {
  return filterMaterials(catalog.materials, state);
}

function repositoryName(material) {
  try {
    return new URL(material.repositoryUrl).pathname.split("/").slice(1, 3).join("/");
  } catch {
    return "GitHub material repository";
  }
}

function coverageText() {
  if (state.exam === "ielts") {
    const available = catalog.volumes.filter((volume) => volume.available).map((volume) => volume.volume);
    return available.length ? `Cambridge ${Math.min(...available)}–${Math.max(...available)} hosted` : "No Cambridge files hosted";
  }
  const summary = summarizeExam(catalog.materials, state.exam);
  return `${summary.files} hosted files`;
}

function sidebar() {
  const categories = categoryConfig[state.exam];
  const summary = summarizeExam(catalog.materials, state.exam);
  return `
    <aside class="sidebar">
      <div class="side-section">
        <p class="section-label">Collection</p>
        <nav class="category-list" aria-label="Material categories">
          ${categories.map(([id, label]) => `
            <button class="category-button ${state.category === id && state.volume === null ? "is-active" : ""}" data-category="${id}">
              <span>${escapeHtml(label)}</span><b>${catalog.materials.filter((item) => item.exam === state.exam && item.category === id).length}</b>
            </button>
          `).join("")}
        </nav>
      </div>
      ${state.exam === "ielts" ? `
        <div class="side-section volume-section">
          <div class="section-line"><p class="section-label">Cambridge volume</p><span>1–21</span></div>
          <div class="volume-grid">
            ${catalog.volumes.map((item) => `
              <button class="volume-button ${state.volume === item.volume ? "is-active" : ""} ${item.available ? "is-available" : "is-missing"}" data-volume="${item.volume}" aria-label="Cambridge IELTS ${item.volume}${item.available ? `, ${item.files} files` : ", not hosted"}">
                ${String(item.volume).padStart(2, "0")}<i></i>
              </button>
            `).join("")}
          </div>
          <div class="legend"><span><i class="dot available"></i>Hosted</span><span><i class="dot missing"></i>Not present</span></div>
        </div>
      ` : ""}
      <div class="repository-card">
        <div class="repo-status"><i></i><span>Repository connected</span></div>
        <strong>${summary.files} files</strong>
        <span>${formatBytes(summary.bytes)} indexed</span>
        <small>Files open directly from your GitHub material repository.</small>
      </div>
    </aside>
  `;
}

function materialList() {
  const materials = visibleMaterials();
  const title = state.volume !== null ? `Cambridge IELTS ${state.volume}` : categoryConfig[state.exam].find(([id]) => id === state.category)?.[1] || "All materials";
  return `
    <section class="file-panel">
      <header class="panel-header">
        <div><span>${EXAM_LABELS[state.exam]}</span><h2>${escapeHtml(title)}</h2></div>
        <b>${materials.length}</b>
      </header>
      <div class="file-scroll" id="file-scroll">
        ${materials.length ? materials.map((material) => `
          <button class="file-row ${state.selectedId === material.id ? "is-selected" : ""}" data-material="${material.id}">
            ${fileGlyph(material.kind)}
            <span class="file-copy"><strong>${escapeHtml(material.title)}</strong><small>${material.format} · ${formatBytes(material.size)}</small></span>
            <span class="row-arrow">›</span>
          </button>
        `).join("") : `
          <div class="empty-list">
            <span>${state.volume ? String(state.volume).padStart(2, "0") : "0"}</span>
            <h3>No hosted files yet</h3>
            <p>${state.volume ? `The inspected repositories do not contain a Cambridge IELTS ${state.volume} practice book or audio set.` : "No material matches this filter."}</p>
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
        <div class="empty-orbit"><span></span><i></i></div>
        <p class="section-label">Preview</p>
        <h2>Select a material</h2>
        <p>Choose a file from the list to preview a PDF, play audio, inspect text, or open the original download.</p>
        <div class="preview-capabilities"><span>PDF</span><span>Audio</span><span>Images</span><span>Data</span></div>
      </section>
    `;
  }
  return `
    <section class="preview-panel">
      <header class="preview-header">
        <div class="preview-title">${fileGlyph(material.kind)}<div><span>${EXAM_LABELS[material.exam]} / ${escapeHtml(material.category)}</span><h2>${escapeHtml(material.title)}</h2><small>${material.format} · ${formatBytes(material.size)}</small></div></div>
        <div class="preview-actions">
          <a href="${material.repositoryUrl}" target="_blank" rel="noreferrer">View file</a>
          <a class="primary-action" href="${material.url}" target="_blank" rel="noreferrer">Open raw</a>
        </div>
      </header>
      <div class="preview-body">
        ${previewMarkup(material)}
      </div>
      <footer class="preview-footer"><span><i></i> Served from your GitHub repository</span><code>${escapeHtml(repositoryName(material))}</code></footer>
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
  if (material.kind === "audio") return `<div class="audio-preview"><div class="audio-art"><span></span><i></i></div><p class="section-label">Listening material</p><h3>${escapeHtml(material.title)}</h3><audio controls preload="metadata" src="${material.url}"></audio><p>Stream this track from GitHub or use “Open raw” to retrieve the file.</p></div>`;
  if (material.kind === "image") return `<div class="image-preview"><img src="${material.url}" alt="${escapeHtml(material.title)}" /></div>`;
  if (["markdown", "json", "text"].includes(material.kind)) return `<div id="text-preview" class="text-preview"><span class="loading-line"></span><span class="loading-line short"></span><p>Loading file preview…</p></div>`;
  return `<div class="download-preview">${fileGlyph(material.kind)}<h3>${escapeHtml(material.title)}</h3><p>This file format is available for retrieval from your repository.</p><a class="primary-action" href="${material.url}" target="_blank" rel="noreferrer">Open file</a></div>`;
}

function render() {
  const materials = visibleMaterials();
  const summary = summarizeExam(catalog.materials, state.exam);
  app.innerHTML = `
    <div class="archive-app">
      <header class="topbar">
        <button class="brand" data-home aria-label="Exam Prep Archive home"><span class="brand-mark">EA</span><span><strong>Exam Prep Archive</strong><small>IELTS · GRE · GMAT</small></span></button>
        <nav class="exam-tabs" aria-label="Choose exam">
          ${Object.entries(EXAM_LABELS).map(([id, label]) => `<button class="${state.exam === id ? "is-active" : ""}" data-exam="${id}">${label}</button>`).join("")}
        </nav>
        <label class="global-search"><span></span><input type="search" id="material-search" placeholder="Search ${EXAM_LABELS[state.exam]} materials" value="${escapeHtml(state.query)}" /><kbd>/</kbd></label>
        <div class="archive-status"><i></i><span>${coverageText()}</span></div>
      </header>
      <main class="workspace">
        ${sidebar()}
        ${materialList()}
        ${previewPanel()}
      </main>
      <footer class="legal-strip">Independent educational archive. Not affiliated with IELTS, Cambridge, ETS, or GMAC. <span>${summary.files} ${EXAM_LABELS[state.exam]} files · ${materials.length} visible</span></footer>
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
    if (request === previewRequest) {
      container.innerHTML = `<div class="preview-error"><h3>PDF preview unavailable</h3><p>Use “View file” or “Open raw” to retrieve the complete document.</p></div>`;
    }
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
    container.innerHTML = `<pre>${escapeHtml(preview.slice(0, 120_000))}</pre>${preview.length > 120_000 ? "<p>Preview truncated. Open the raw file for the complete material.</p>" : ""}`;
  } catch {
    if (request === previewRequest && container) container.innerHTML = `<div class="preview-error"><h3>Preview unavailable</h3><p>Use “Open raw” to retrieve this file directly.</p></div>`;
  }
}

function chooseExam(exam) {
  state.exam = exam;
  state.category = categoryConfig[exam][0][0];
  state.volume = null;
  state.query = "";
  state.selectedId = null;
  render();
}

function attachEvents() {
  document.querySelectorAll("[data-exam]").forEach((button) => button.addEventListener("click", () => chooseExam(button.dataset.exam)));
  document.querySelector("[data-home]")?.addEventListener("click", () => chooseExam("ielts"));
  document.querySelectorAll("[data-category]").forEach((button) => button.addEventListener("click", () => {
    state.category = button.dataset.category;
    state.volume = null;
    state.selectedId = null;
    render();
  }));
  document.querySelectorAll("[data-volume]").forEach((button) => button.addEventListener("click", () => {
    state.category = "cambridge";
    state.volume = Number(button.dataset.volume);
    state.selectedId = null;
    render();
  }));
  document.querySelectorAll("[data-material]").forEach((button) => button.addEventListener("click", () => {
    state.selectedId = button.dataset.material;
    render();
  }));
  const search = document.querySelector("#material-search");
  search?.addEventListener("input", () => {
    state.query = search.value;
    state.selectedId = null;
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

fetch("./catalog.json")
  .then((response) => {
    if (!response.ok) throw new Error(`Catalog request failed with ${response.status}`);
    return response.json();
  })
  .then((data) => {
    catalog = data;
    render();
  })
  .catch(() => {
    app.innerHTML = `<div class="fatal-error"><span class="brand-mark">EA</span><h1>The material catalog could not load.</h1><p>Refresh the page or check the GitHub Pages deployment.</p></div>`;
  });
