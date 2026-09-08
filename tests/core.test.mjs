import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateExamStats,
  csvToObjects,
  formatTime,
  getDueVocabulary,
  parseImportedQuestions,
  scheduleCard,
  seededShuffle,
  selectSessionQuestions,
} from "../src/core.js";

test("seededShuffle is deterministic without mutating input", () => {
  const input = [1, 2, 3, 4, 5];
  assert.deepEqual(seededShuffle(input, 42), seededShuffle(input, 42));
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
});

test("selectSessionQuestions filters by exam and caps the result", () => {
  const questions = [
    { id: "a", exam: "ielts" },
    { id: "b", exam: "gre" },
    { id: "c", exam: "gre" },
  ];
  const result = selectSessionQuestions(questions, "gre", 5, 7);
  assert.equal(result.length, 2);
  assert.ok(result.every((question) => question.exam === "gre"));
});

test("calculateExamStats reports overall and per-skill accuracy", () => {
  const attempts = [
    { exam: "gre", skill: "Verbal", correct: true, completedAt: "2026-09-08T10:00:00Z" },
    { exam: "gre", skill: "Verbal", correct: false, completedAt: "2026-09-08T11:00:00Z" },
    { exam: "ielts", skill: "Reading", correct: true, completedAt: "2026-09-08T12:00:00Z" },
  ];
  const result = calculateExamStats(attempts, "gre");
  assert.equal(result.attempts, 2);
  assert.equal(result.accuracy, 50);
  assert.equal(result.bySkill.Verbal.accuracy, 50);
  assert.equal(result.activeDays, 1);
});

test("scheduleCard moves successful reviews into the future and resets misses", () => {
  const now = Date.UTC(2026, 8, 9);
  const good = scheduleCard({}, 2, now);
  assert.equal(good.repetitions, 1);
  assert.ok(good.dueAt > now);
  const missed = scheduleCard(good, 0, now);
  assert.equal(missed.repetitions, 0);
  assert.ok(missed.dueAt > now);
  assert.ok(missed.dueAt < now + 60 * 60 * 1000);
});

test("getDueVocabulary respects exam and due date", () => {
  const now = 1_000_000;
  const words = [{ id: "one", exam: "gre" }, { id: "two", exam: "gre" }, { id: "three", exam: "gmat" }];
  const reviews = { one: { dueAt: now - 1 }, two: { dueAt: now + 1 } };
  assert.deepEqual(getDueVocabulary(words, reviews, "gre", now).map((word) => word.id), ["one"]);
});

test("formatTime clamps negative values and pads seconds", () => {
  assert.equal(formatTime(65), "01:05");
  assert.equal(formatTime(-2), "00:00");
});

test("CSV parser handles quoted commas", () => {
  const rows = csvToObjects('exam,prompt,choices,answer\ngre,"Read, then answer","A|B",1');
  assert.equal(rows[0].prompt, "Read, then answer");
});

test("question importer accepts JSON and CSV", () => {
  const json = parseImportedQuestions("set.json", JSON.stringify([{ exam: "gre", prompt: "Choose", choices: ["A", "B"], answer: 1 }]));
  assert.equal(json[0].answer, 1);
  assert.equal(json[0].imported, true);

  const csv = parseImportedQuestions("set.csv", "exam,skill,prompt,choices,answer\nielts,Reading,Choose,A|B,0");
  assert.equal(csv[0].exam, "ielts");
  assert.deepEqual(csv[0].choices, ["A", "B"]);
});

test("question importer rejects unsupported exams", () => {
  assert.throws(
    () => parseImportedQuestions("set.json", JSON.stringify([{ exam: "sat", prompt: "Choose", choices: ["A", "B"], answer: 0 }])),
    /exam must be IELTS, GRE, or GMAT/,
  );
});
