const VALID_EXAMS = new Set(["ielts", "gre", "gmat"]);
const DAY = 86_400_000;

export function seededShuffle(items, seed = Date.now()) {
  const copy = [...items];
  let state = Math.abs(Math.trunc(seed)) || 1;
  const random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

export function selectSessionQuestions(questions, exam, length = 5, seed = Date.now()) {
  const matching = questions.filter((question) => question.exam === exam);
  return seededShuffle(matching, seed).slice(0, Math.max(1, Math.min(length, matching.length)));
}

export function calculateExamStats(attempts, exam) {
  const matching = attempts.filter((attempt) => attempt.exam === exam);
  const correct = matching.filter((attempt) => attempt.correct).length;
  const accuracy = matching.length ? Math.round((correct / matching.length) * 100) : 0;
  const bySkill = matching.reduce((stats, attempt) => {
    const current = stats[attempt.skill] ?? { attempts: 0, correct: 0, accuracy: 0 };
    current.attempts += 1;
    current.correct += attempt.correct ? 1 : 0;
    current.accuracy = Math.round((current.correct / current.attempts) * 100);
    stats[attempt.skill] = current;
    return stats;
  }, {});
  const days = new Set(matching.map((attempt) => new Date(attempt.completedAt).toDateString())).size;
  return { attempts: matching.length, correct, accuracy, activeDays: days, bySkill };
}

export function scheduleCard(previous = {}, rating, now = Date.now()) {
  const safeRating = Math.max(0, Math.min(3, Number(rating)));
  const repetitions = safeRating === 0 ? 0 : (previous.repetitions ?? 0) + 1;
  const baseEase = previous.ease ?? 2.5;
  const ease = Math.max(1.3, Math.min(3, baseEase + [-0.2, -0.05, 0.05, 0.15][safeRating]));
  let interval;
  if (safeRating === 0) interval = 0.007;
  else if (repetitions === 1) interval = 1;
  else if (repetitions === 2) interval = safeRating === 1 ? 2 : 3;
  else interval = Math.max(1, Math.round((previous.interval ?? 1) * ease * [0.8, 1, 1.15, 1.35][safeRating]));
  return {
    repetitions,
    ease: Number(ease.toFixed(2)),
    interval,
    lastRating: safeRating,
    reviewedAt: now,
    dueAt: now + interval * DAY,
  };
}

export function getDueVocabulary(words, reviews, exam, now = Date.now()) {
  return words.filter((word) => word.exam === exam && (!reviews[word.id] || reviews[word.id].dueAt <= now));
}

export function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.trunc(totalSeconds));
  const minutes = Math.floor(safe / 60).toString().padStart(2, "0");
  const seconds = (safe % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else value += character;
  }
  values.push(value.trim());
  return values;
}

export function csvToObjects(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function normalizeImportedQuestion(item, index) {
  const exam = String(item.exam ?? "").toLowerCase();
  if (!VALID_EXAMS.has(exam)) throw new Error(`Question ${index + 1}: exam must be IELTS, GRE, or GMAT.`);
  const prompt = String(item.prompt ?? item.question ?? "").trim();
  if (!prompt) throw new Error(`Question ${index + 1}: prompt is required.`);
  let choices = item.choices;
  if (typeof choices === "string") choices = choices.split("|").map((choice) => choice.trim());
  if (!Array.isArray(choices)) {
    choices = [item.choice_a, item.choice_b, item.choice_c, item.choice_d].filter(Boolean);
  }
  if (choices.length < 2) throw new Error(`Question ${index + 1}: provide at least two choices.`);
  const rawAnswer = item.answer ?? item.correct_answer;
  let answer = Number(rawAnswer);
  if (!Number.isInteger(answer) && typeof rawAnswer === "string") {
    answer = choices.findIndex((choice) => choice.toLowerCase() === rawAnswer.toLowerCase());
  }
  if (answer >= 1 && answer <= choices.length && !choices[answer] && choices[answer - 1]) answer -= 1;
  if (!Number.isInteger(answer) || answer < 0 || answer >= choices.length) {
    throw new Error(`Question ${index + 1}: answer must be a zero-based choice number or exact choice text.`);
  }
  return {
    id: `imported-${Date.now()}-${index}`,
    exam,
    skill: String(item.skill ?? "Imported"),
    difficulty: String(item.difficulty ?? "Custom"),
    passage: String(item.passage ?? ""),
    prompt,
    choices: choices.map(String),
    answer,
    explanation: String(item.explanation ?? "Imported from your local file."),
    imported: true,
  };
}

export function parseImportedQuestions(filename, text) {
  const extension = filename.toLowerCase().split(".").pop();
  let raw;
  if (extension === "json") {
    raw = JSON.parse(text);
    raw = Array.isArray(raw) ? raw : raw.questions;
  } else if (extension === "csv") raw = csvToObjects(text);
  else throw new Error("Use a .json or .csv question file.");
  if (!Array.isArray(raw) || !raw.length) throw new Error("The file does not contain any questions.");
  return raw.map(normalizeImportedQuestion);
}
