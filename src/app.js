import "./styles.css";
import { EXAMS, QUESTIONS, RESOURCES, VOCABULARY, WRITING_PROMPTS } from "./data.js";
import {
  calculateExamStats,
  formatTime,
  getDueVocabulary,
  parseImportedQuestions,
  scheduleCard,
  selectSessionQuestions,
} from "./core.js";
import {
  exportState,
  getMediaFile,
  listMediaFiles,
  loadState,
  removeMediaFile,
  saveMediaFiles,
  saveState,
} from "./storage.js";

const app = document.querySelector("#app");
let state = loadState();
let view = "dashboard";
let session = null;
let sessionTimer = null;
let reviewCardId = null;
let reviewRevealed = false;
let libraryQuery = "";
let toastTimer = null;

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const currentExam = () => EXAMS[state.exam];
const allQuestions = () => [...QUESTIONS, ...state.importedQuestions];
const icon = (name) => `<span class="icon icon-${name}" aria-hidden="true"></span>`;

function showToast(message, tone = "default") {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast is-visible ${tone}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

function setExam(exam) {
  if (!EXAMS[exam]) return;
  state.exam = exam;
  saveState(state);
  session = null;
  reviewCardId = null;
  document.documentElement.style.setProperty("--accent", EXAMS[exam].accent);
  render();
}

function shell(content) {
  const exam = currentExam();
  const navigation = [
    ["dashboard", "home", "Today"],
    ["practice", "practice", "Practice"],
    ["review", "review", "Review"],
    ["library", "library", "Library"],
  ];
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <button class="brand" data-view="dashboard" aria-label="ExamPrep Lite home">
          <span class="brand-mark">EP</span>
          <span><strong>ExamPrep</strong><small>LITE</small></span>
        </button>
        <nav class="main-nav" aria-label="Primary navigation">
          ${navigation.map(([id, symbol, label]) => `
            <button class="nav-item ${view === id ? "is-active" : ""}" data-view="${id}">
              ${icon(symbol)}<span>${label}</span>
            </button>
          `).join("")}
        </nav>
        <div class="sidebar-note">
          <span class="privacy-dot"></span>
          <div><strong>Private by design</strong><small>Your progress stays on this device.</small></div>
        </div>
      </aside>
      <main class="main-content">
        <header class="topbar">
          <div class="mobile-brand"><span class="brand-mark">EP</span><strong>ExamPrep</strong></div>
          <div class="exam-switcher" aria-label="Choose an exam">
            ${Object.entries(EXAMS).map(([id, item]) => `
              <button class="exam-option ${state.exam === id ? "is-active" : ""}" data-exam="${id}">
                <span>${item.name}</span><small>${item.track}</small>
              </button>
            `).join("")}
          </div>
          <button class="icon-button" data-action="export" aria-label="Export progress" title="Export progress">${icon("download")}</button>
        </header>
        <div class="page" style="--exam-accent:${exam.accent}">${content}</div>
      </main>
      <nav class="mobile-nav" aria-label="Mobile navigation">
        ${navigation.map(([id, symbol, label]) => `
          <button class="${view === id ? "is-active" : ""}" data-view="${id}">${icon(symbol)}<span>${label}</span></button>
        `).join("")}
      </nav>
      <div id="toast" class="toast" role="status" aria-live="polite"></div>
    </div>
  `;
}

function dashboardView() {
  const stats = calculateExamStats(state.attempts, state.exam);
  const due = getDueVocabulary(VOCABULARY, state.vocabularyReviews, state.exam).length;
  const examQuestions = allQuestions().filter((question) => question.exam === state.exam).length;
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";
  const skillRows = currentExam().skills.map((skill) => {
    const skillStats = stats.bySkill[skill] ?? { attempts: 0, accuracy: 0 };
    return `
      <div class="skill-row">
        <div><strong>${escapeHtml(skill)}</strong><small>${skillStats.attempts} answered</small></div>
        <div class="skill-bar"><span style="width:${skillStats.accuracy}%"></span></div>
        <b>${skillStats.attempts ? `${skillStats.accuracy}%` : "—"}</b>
      </div>`;
  }).join("");
  return `
    <section class="welcome-row">
      <div>
        <p class="eyebrow">${greeting}</p>
        <h1>Make today's work count.</h1>
        <p class="lede">A focused plan for your ${currentExam().name} ${currentExam().track} preparation.</p>
      </div>
      <div class="date-stamp"><span>${new Intl.DateTimeFormat("en", { weekday: "short" }).format(new Date())}</span><strong>${new Date().getDate()}</strong></div>
    </section>

    <section class="dashboard-grid">
      <article class="focus-card card">
        <div class="card-heading">
          <div><p class="eyebrow">Recommended next</p><h2>Mixed practice sprint</h2></div>
          <span class="status-pill">10 min</span>
        </div>
        <p>Build speed across ${currentExam().skills.slice(0, 3).join(", ")} with a short adaptive set.</p>
        <div class="focus-meta">
          <span>${icon("question")} ${examQuestions} questions ready</span>
          <span>${icon("target")} ${stats.accuracy || 0}% current accuracy</span>
        </div>
        <button class="primary-button" data-action="quick-start">Start practice ${icon("arrow")}</button>
      </article>

      <article class="progress-card card">
        <div class="card-heading"><p class="eyebrow">Your progress</p><span class="subtle">On this device</span></div>
        <div class="progress-content">
          <div class="progress-ring" style="--progress:${stats.accuracy * 3.6}deg"><span><strong>${stats.accuracy}%</strong><small>accuracy</small></span></div>
          <div class="metric-stack">
            <div><strong>${stats.attempts}</strong><span>questions answered</span></div>
            <div><strong>${stats.activeDays}</strong><span>active days</span></div>
            <div><strong>${due}</strong><span>cards due</span></div>
          </div>
        </div>
      </article>
    </section>

    <section class="section-block">
      <div class="section-title"><div><p class="eyebrow">Daily plan</p><h2>Three ways forward</h2></div><span class="subtle">Choose one or complete all three</span></div>
      <div class="action-grid">
        <button class="action-card" data-action="quick-start">
          <span class="action-number">01</span><span class="action-icon practice-tone">${icon("practice")}</span>
          <strong>Practice a mixed set</strong><small>5 original questions · timed</small><span class="text-link">Begin ${icon("arrow")}</span>
        </button>
        <button class="action-card" data-view="review">
          <span class="action-number">02</span><span class="action-icon review-tone">${icon("review")}</span>
          <strong>Review your weak spots</strong><small>${due} vocabulary cards ready</small><span class="text-link">Review ${icon("arrow")}</span>
        </button>
        <button class="action-card" data-view="writing">
          <span class="action-number">03</span><span class="action-icon writing-tone">${icon("writing")}</span>
          <strong>Open the writing lab</strong><small>Prompt, timer, rubric, local draft</small><span class="text-link">Write ${icon("arrow")}</span>
        </button>
      </div>
    </section>

    <section class="two-column">
      <article class="card skill-card">
        <div class="card-heading"><div><p class="eyebrow">Performance</p><h2>Accuracy by skill</h2></div><button class="plain-button" data-view="review">Review errors</button></div>
        <div class="skill-list">${skillRows}</div>
      </article>
      <article class="card library-preview">
        <p class="eyebrow">Official library</p>
        <h2>Learn from trusted sources.</h2>
        <p>Open the official prep catalog or import materials you already have permission to use.</p>
        <div class="library-count"><strong>${RESOURCES.filter((resource) => resource.exam === state.exam).length}</strong><span>curated ${currentExam().name} resources</span></div>
        <button class="secondary-button" data-view="library">Browse library ${icon("arrow")}</button>
      </article>
    </section>
  `;
}

function practiceView() {
  if (!session) {
    const available = allQuestions().filter((question) => question.exam === state.exam).length;
    return `
      <section class="page-heading"><div><p class="eyebrow">Practice</p><h1>Train under gentle pressure.</h1><p>Original questions, clear explanations, and a timer you control.</p></div></section>
      <div class="practice-setup card">
        <div class="setup-copy"><span class="large-index">01</span><div><h2>Mixed ${currentExam().name} sprint</h2><p>A balanced set drawn from every available skill. Your answers and timing stay on this device.</p></div></div>
        <div class="setup-grid">
          <label><span>Questions</span><select id="session-length">${[3, 5, 6].filter((n) => n <= available).map((n) => `<option value="${n}" ${n === 5 ? "selected" : ""}>${n} questions</option>`).join("")}</select></label>
          <label><span>Time limit</span><select id="session-minutes"><option value="5">5 minutes</option><option value="10" selected>10 minutes</option><option value="15">15 minutes</option></select></label>
          <div><span>Question bank</span><strong>${available} ready</strong></div>
        </div>
        <button class="primary-button wide-button" data-action="start-session">Start timed session ${icon("arrow")}</button>
      </div>
      <div class="practice-note"><span>${icon("privacy")}</span><p><strong>No account needed.</strong> Imported material and progress remain in your browser.</p></div>
    `;
  }

  if (session.completed) {
    const correct = session.answers.filter((answer) => answer.correct).length;
    const percent = session.answers.length ? Math.round((correct / session.questions.length) * 100) : 0;
    return `
      <section class="results card">
        <p class="eyebrow">Session complete</p>
        <div class="result-mark">${percent}<small>%</small></div>
        <h1>${percent >= 80 ? "Strong work." : percent >= 60 ? "A useful baseline." : "Now you know what to review."}</h1>
        <p>You answered ${correct} of ${session.questions.length} questions correctly.</p>
        <div class="result-actions"><button class="primary-button" data-action="new-session">Try another set</button><button class="secondary-button" data-view="review">Review mistakes</button></div>
      </section>`;
  }

  const question = session.questions[session.index];
  const answerState = session.answers.find((answer) => answer.questionId === question.id);
  const selected = session.selected;
  return `
    <section class="practice-header">
      <button class="back-button" data-action="exit-session">${icon("back")} Exit session</button>
      <div class="session-progress"><span>Question ${session.index + 1} of ${session.questions.length}</span><div><i style="width:${((session.index + 1) / session.questions.length) * 100}%"></i></div></div>
      <div class="timer ${session.seconds <= 60 ? "is-low" : ""}">${icon("clock")}<strong>${formatTime(session.seconds)}</strong></div>
    </section>
    <article class="question-card card">
      <div class="question-meta"><span>${escapeHtml(question.skill)}</span><span>${escapeHtml(question.difficulty)}</span>${question.imported ? "<span>Your import</span>" : ""}</div>
      ${question.passage ? `<div class="passage">${escapeHtml(question.passage)}</div>` : ""}
      <h1>${escapeHtml(question.prompt)}</h1>
      <div class="choices" role="radiogroup" aria-label="Answer choices">
        ${question.choices.map((choice, index) => {
          const classes = [selected === index ? "is-selected" : ""];
          if (answerState) {
            if (index === question.answer) classes.push("is-correct");
            else if (index === selected) classes.push("is-wrong");
          }
          return `<button class="choice ${classes.join(" ")}" data-choice="${index}" ${answerState ? "disabled" : ""} role="radio" aria-checked="${selected === index}"><span>${String.fromCharCode(65 + index)}</span><b>${escapeHtml(choice)}</b></button>`;
        }).join("")}
      </div>
      ${answerState ? `<div class="explanation ${answerState.correct ? "correct" : "incorrect"}"><strong>${answerState.correct ? "Correct" : "Not quite"}</strong><p>${escapeHtml(question.explanation)}</p></div>` : ""}
      <div class="question-actions">
        <button class="plain-button" data-action="flag-question">${icon("flag")} ${session.flagged.has(question.id) ? "Flagged" : "Mark for review"}</button>
        ${answerState
          ? `<button class="primary-button" data-action="next-question">${session.index === session.questions.length - 1 ? "See results" : "Next question"} ${icon("arrow")}</button>`
          : `<button class="primary-button" data-action="submit-answer" ${selected === null ? "disabled" : ""}>Check answer</button>`}
      </div>
    </article>
  `;
}

function reviewView() {
  const examAttempts = state.attempts.filter((attempt) => attempt.exam === state.exam);
  const wrongIds = [...new Set(examAttempts.filter((attempt) => !attempt.correct).reverse().map((attempt) => attempt.questionId))];
  const mistakes = wrongIds.map((id) => allQuestions().find((question) => question.id === id)).filter(Boolean).slice(0, 4);
  const dueCards = getDueVocabulary(VOCABULARY, state.vocabularyReviews, state.exam);
  const examWords = VOCABULARY.filter((word) => word.exam === state.exam);
  const card = VOCABULARY.find((word) => word.id === reviewCardId) ?? dueCards[0] ?? examWords[0];
  reviewCardId = card?.id ?? null;
  return `
    <section class="page-heading"><div><p class="eyebrow">Review</p><h1>Turn misses into memory.</h1><p>Clear your mistake queue and keep vocabulary moving.</p></div><span class="counter-badge">${wrongIds.length + dueCards.length} items ready</span></section>
    <div class="review-grid">
      <article class="flashcard-panel card">
        <div class="card-heading"><div><p class="eyebrow">Spaced repetition</p><h2>Vocabulary card</h2></div><span class="status-pill">${dueCards.length} due</span></div>
        ${card ? `
          <div class="flashcard ${reviewRevealed ? "is-revealed" : ""}">
            <small>${currentExam().name} vocabulary</small><strong>${escapeHtml(card.word)}</strong>
            ${reviewRevealed ? `<div class="definition"><p>${escapeHtml(card.definition)}</p><q>${escapeHtml(card.example)}</q></div>` : `<p>Say the meaning aloud, then reveal the answer.</p>`}
          </div>
          ${reviewRevealed ? `
            <p class="rating-label">How well did you remember it?</p>
            <div class="rating-row">
              <button data-rating="0"><strong>Again</strong><small>10 min</small></button>
              <button data-rating="1"><strong>Hard</strong><small>2 days</small></button>
              <button data-rating="2"><strong>Good</strong><small>Growing</small></button>
              <button data-rating="3"><strong>Easy</strong><small>Longer</small></button>
            </div>
          ` : `<button class="primary-button wide-button" data-action="reveal-card">Reveal answer</button>`}
        ` : `<div class="empty-state"><h3>No cards available</h3><p>Choose another exam to review its vocabulary.</p></div>`}
      </article>
      <article class="mistakes-panel card">
        <div class="card-heading"><div><p class="eyebrow">Mistake queue</p><h2>Recent weak spots</h2></div><span class="subtle">Newest first</span></div>
        ${mistakes.length ? `<div class="mistake-list">${mistakes.map((question) => `
          <div class="mistake-item"><span>${escapeHtml(question.skill.slice(0, 2).toUpperCase())}</span><div><strong>${escapeHtml(question.prompt)}</strong><small>${escapeHtml(question.skill)} · ${escapeHtml(question.difficulty)}</small></div></div>
        `).join("")}</div><button class="secondary-button wide-button" data-action="mistake-session">Practise these again</button>` : `
          <div class="empty-state"><span class="empty-check">✓</span><h3>No mistakes yet</h3><p>Complete a practice set and missed questions will appear here.</p><button class="secondary-button" data-view="practice">Start practice</button></div>`}
      </article>
    </div>
  `;
}

function libraryView() {
  const resources = RESOURCES.filter((resource) => resource.exam === state.exam && [resource.title, resource.provider, resource.skill, resource.description].join(" ").toLowerCase().includes(libraryQuery.toLowerCase()));
  return `
    <section class="page-heading library-heading"><div><p class="eyebrow">Library</p><h1>Use what you trust.</h1><p>Official resources online. Licensed personal material stays local.</p></div><div class="search-box">${icon("search")}<input id="resource-search" type="search" placeholder="Search ${currentExam().name} resources" value="${escapeHtml(libraryQuery)}" /></div></section>
    <div class="library-layout">
      <section class="resource-section">
        <div class="section-title"><div><p class="eyebrow">Curated catalog</p><h2>${resources.length} official resources</h2></div><span class="subtle">Links open at the provider</span></div>
        <div class="resource-list">
          ${resources.map((resource) => `
            <a class="resource-card" href="${resource.url}" target="_blank" rel="noreferrer">
              <span class="provider-mark">${escapeHtml(resource.provider.slice(0, 3).toUpperCase())}</span>
              <div><div class="resource-meta"><span>${escapeHtml(resource.skill)}</span><span>${escapeHtml(resource.access)}</span></div><h3>${escapeHtml(resource.title)}</h3><p>${escapeHtml(resource.description)}</p></div>
              <span class="external-arrow">↗</span>
            </a>
          `).join("") || `<div class="empty-state card"><h3>No matching resources</h3><p>Try a broader search.</p></div>`}
        </div>
      </section>
      <aside class="import-panel card">
        <p class="eyebrow">Local importer</p><h2>Bring your own material.</h2><p>Questions, PDFs, documents, and audio are stored in your browser—not uploaded.</p>
        <label class="drop-zone" for="question-import">${icon("upload")}<strong>Import question bank</strong><span>JSON or CSV · up to your browser limit</span><input id="question-import" type="file" accept=".json,.csv" hidden /></label>
        <label class="drop-zone compact" for="media-import">${icon("paperclip")}<strong>Add study media</strong><span>PDF, DOCX, MP3, M4A, WAV</span><input id="media-import" type="file" accept=".pdf,.docx,audio/*" multiple hidden /></label>
        <div class="import-summary"><span><strong>${state.importedQuestions.length}</strong> custom questions</span><span><strong id="media-count">—</strong> local files</span></div>
        <div id="media-list" class="media-list"><span class="subtle">Loading local files…</span></div>
        <details class="format-help"><summary>Question file format</summary><p>JSON: an array of objects with exam, skill, prompt, choices, answer, and explanation. CSV: use those names as headers and separate choices with |.</p></details>
      </aside>
    </div>
  `;
}

function writingView() {
  const prompts = WRITING_PROMPTS[state.exam];
  const draft = state.writingDrafts[state.exam] ?? { prompt: prompts[0], text: "", updatedAt: null };
  const words = draft.text.trim() ? draft.text.trim().split(/\s+/).length : 0;
  return `
    <section class="writing-toolbar"><button class="back-button" data-view="dashboard">${icon("back")} Back to today</button><div><p class="eyebrow">Writing lab</p><h1>Think clearly on the page.</h1></div><button class="secondary-button" data-action="save-draft">Save draft</button></section>
    <div class="writing-layout">
      <aside class="prompt-panel card">
        <p class="eyebrow">Choose a prompt</p>
        ${prompts.map((prompt, index) => `<button class="prompt-choice ${draft.prompt === prompt ? "is-active" : ""}" data-prompt="${index}"><span>0${index + 1}</span><p>${escapeHtml(prompt)}</p></button>`).join("")}
        <div class="rubric"><p class="eyebrow">Self-check</p>${["Clear position or claim", "Logical paragraph structure", "Specific supporting evidence", "Accurate and varied language"].map((item) => `<label><input type="checkbox" /> <span>${item}</span></label>`).join("")}</div>
      </aside>
      <article class="editor-panel card">
        <div class="editor-prompt"><span>${currentExam().name} prompt</span><p>${escapeHtml(draft.prompt)}</p></div>
        <textarea id="writing-draft" aria-label="Writing draft" placeholder="Start building your response…">${escapeHtml(draft.text)}</textarea>
        <div class="editor-footer"><span id="word-count">${words} words</span><span>${draft.updatedAt ? `Saved ${new Date(draft.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Not saved yet"}</span></div>
      </article>
    </div>
  `;
}

function render() {
  document.documentElement.style.setProperty("--accent", currentExam().accent);
  const views = { dashboard: dashboardView, practice: practiceView, review: reviewView, library: libraryView, writing: writingView };
  app.innerHTML = shell((views[view] ?? dashboardView)());
  attachEvents();
  if (view === "library") refreshMediaList();
}

function startSession(customQuestions = null) {
  const length = Number(document.querySelector("#session-length")?.value ?? 5);
  const minutes = Number(document.querySelector("#session-minutes")?.value ?? currentExam().duration);
  const questions = customQuestions ?? selectSessionQuestions(allQuestions(), state.exam, length);
  session = { questions, index: 0, selected: null, answers: [], seconds: minutes * 60, flagged: new Set(), completed: false };
  startTimer();
  render();
}

function startTimer() {
  clearInterval(sessionTimer);
  sessionTimer = setInterval(() => {
    if (!session || session.completed) return clearInterval(sessionTimer);
    session.seconds -= 1;
    const timer = document.querySelector(".timer strong");
    if (timer) timer.textContent = formatTime(session.seconds);
    if (session.seconds <= 0) finishSession();
  }, 1000);
}

function finishSession() {
  if (!session) return;
  session.completed = true;
  clearInterval(sessionTimer);
  render();
}

async function refreshMediaList() {
  const list = document.querySelector("#media-list");
  try {
    const files = (await listMediaFiles()).sort((a, b) => b.addedAt - a.addedAt);
    const count = document.querySelector("#media-count");
    if (count) count.textContent = files.length;
    if (!list) return;
    list.innerHTML = files.length ? files.map((file) => `
      <div class="media-item"><span>${file.type.startsWith("audio") ? "AU" : "DOC"}</span><div><strong>${escapeHtml(file.name)}</strong><small>${(file.size / 1024 / 1024).toFixed(1)} MB</small></div><div class="media-actions"><button data-open-media="${file.id}" aria-label="Open ${escapeHtml(file.name)}">Open</button><button data-remove-media="${file.id}" aria-label="Remove ${escapeHtml(file.name)}">×</button></div></div>
    `).join("") : `<span class="subtle">No local files added yet.</span>`;
    list.querySelectorAll("[data-remove-media]").forEach((button) => button.addEventListener("click", async () => {
      await removeMediaFile(button.dataset.removeMedia);
      refreshMediaList();
      showToast("Local file removed.");
    }));
    list.querySelectorAll("[data-open-media]").forEach((button) => button.addEventListener("click", async () => {
      const file = await getMediaFile(button.dataset.openMedia);
      if (!file) return;
      const url = URL.createObjectURL(file.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }));
  } catch {
    if (list) list.innerHTML = `<span class="subtle">Local file storage is unavailable in this browser.</span>`;
  }
}

function attachEvents() {
  document.querySelectorAll("[data-exam]").forEach((button) => button.addEventListener("click", () => setExam(button.dataset.exam)));
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
    clearInterval(sessionTimer);
    view = button.dataset.view;
    render();
  }));

  document.querySelectorAll("[data-choice]").forEach((button) => button.addEventListener("click", () => {
    if (!session) return;
    session.selected = Number(button.dataset.choice);
    render();
  }));

  document.querySelectorAll("[data-rating]").forEach((button) => button.addEventListener("click", () => {
    const card = VOCABULARY.find((word) => word.id === reviewCardId);
    if (!card) return;
    state.vocabularyReviews[card.id] = scheduleCard(state.vocabularyReviews[card.id], Number(button.dataset.rating));
    saveState(state);
    const next = getDueVocabulary(VOCABULARY, state.vocabularyReviews, state.exam).find((word) => word.id !== card.id);
    reviewCardId = next?.id ?? VOCABULARY.find((word) => word.exam === state.exam && word.id !== card.id)?.id;
    reviewRevealed = false;
    render();
    showToast("Review scheduled.", "success");
  }));

  document.querySelectorAll("[data-prompt]").forEach((button) => button.addEventListener("click", () => {
    const currentText = document.querySelector("#writing-draft")?.value ?? "";
    state.writingDrafts[state.exam] = { prompt: WRITING_PROMPTS[state.exam][Number(button.dataset.prompt)], text: currentText, updatedAt: Date.now() };
    saveState(state);
    render();
  }));

  document.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", async () => {
    const action = button.dataset.action;
    if (action === "quick-start") { view = "practice"; render(); startSession(); }
    if (action === "start-session") startSession();
    if (action === "new-session") { session = null; render(); }
    if (action === "exit-session") { clearInterval(sessionTimer); session = null; render(); }
    if (action === "flag-question" && session) { session.flagged.has(session.questions[session.index].id) ? session.flagged.delete(session.questions[session.index].id) : session.flagged.add(session.questions[session.index].id); render(); }
    if (action === "submit-answer" && session && session.selected !== null) {
      const question = session.questions[session.index];
      const answer = { questionId: question.id, exam: question.exam, skill: question.skill, selected: session.selected, correct: session.selected === question.answer, completedAt: Date.now() };
      session.answers.push(answer);
      state.attempts.push(answer);
      state.attempts = state.attempts.slice(-500);
      saveState(state);
      render();
    }
    if (action === "next-question" && session) {
      if (session.index === session.questions.length - 1) finishSession();
      else { session.index += 1; session.selected = null; render(); }
    }
    if (action === "reveal-card") { reviewRevealed = true; render(); }
    if (action === "mistake-session") {
      const ids = [...new Set(state.attempts.filter((attempt) => attempt.exam === state.exam && !attempt.correct).reverse().map((attempt) => attempt.questionId))];
      const questions = ids.map((id) => allQuestions().find((question) => question.id === id)).filter(Boolean).slice(0, 5);
      view = "practice";
      startSession(questions);
    }
    if (action === "export") exportState(state);
    if (action === "save-draft") {
      const textarea = document.querySelector("#writing-draft");
      const current = state.writingDrafts[state.exam] ?? { prompt: WRITING_PROMPTS[state.exam][0] };
      state.writingDrafts[state.exam] = { ...current, text: textarea?.value ?? "", updatedAt: Date.now() };
      saveState(state);
      render();
      showToast("Draft saved locally.", "success");
    }
  }));

  const search = document.querySelector("#resource-search");
  search?.addEventListener("input", () => {
    libraryQuery = search.value;
    const position = search.selectionStart;
    render();
    const nextSearch = document.querySelector("#resource-search");
    nextSearch?.focus();
    nextSearch?.setSelectionRange(position, position);
  });

  const questionInput = document.querySelector("#question-import");
  questionInput?.addEventListener("change", async () => {
    const file = questionInput.files[0];
    if (!file) return;
    try {
      const imported = parseImportedQuestions(file.name, await file.text());
      state.importedQuestions.push(...imported);
      saveState(state);
      render();
      showToast(`${imported.length} questions imported.`, "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  const mediaInput = document.querySelector("#media-import");
  mediaInput?.addEventListener("change", async () => {
    if (!mediaInput.files.length) return;
    try {
      await saveMediaFiles(mediaInput.files);
      await refreshMediaList();
      showToast(`${mediaInput.files.length} local files added.`, "success");
    } catch {
      showToast("This browser could not store the selected files.", "error");
    }
  });

  const draft = document.querySelector("#writing-draft");
  draft?.addEventListener("input", () => {
    const count = draft.value.trim() ? draft.value.trim().split(/\s+/).length : 0;
    document.querySelector("#word-count").textContent = `${count} words`;
  });
}

window.addEventListener("beforeunload", () => clearInterval(sessionTimer));
render();
