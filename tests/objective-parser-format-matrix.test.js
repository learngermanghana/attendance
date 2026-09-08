import test from "node:test";
import assert from "node:assert/strict";
import { computeObjectiveScore } from "../src/utils/objectiveMarking.js";

const A1_9 = ["B", "C", "A", "C", "B", "B", "A", "C", "C", "B", "A", "A", "D", "A", "C"];

function numbered(answers, render) {
  return answers.map((answer, index) => render(index + 1, answer)).join("\n");
}

function assertPerfect(assignmentId, submission, total, label) {
  const result = computeObjectiveScore(assignmentId, submission);
  assert.equal(result.totalCount, total, `${label}: expected ${total} objective questions, got ${result.totalCount}`);
  assert.equal(result.correctCount, total, `${label}: ${result.correctCount}/${result.totalCount}\n${submission}`);
}

test("A1-9 flat choice answers survive common numbering and answer-label formats", () => {
  const variants = [
    ["dot numbering", numbered(A1_9, (n, a) => `${n}. ${a}`)],
    ["parenthesis numbering", numbered(A1_9, (n, a) => `${n}) ${a}`)],
    ["compact number-letter", numbered(A1_9, (n, a) => `${n}${a}`)],
    ["explicit Answer labels", numbered(A1_9, (n, a) => `Answer${n}: ${a}`)],
    ["explicit Q labels", numbered(A1_9, (n, a) => `Q${n}. ${a}`)],
  ];

  variants.forEach(([label, submission]) => assertPerfect("A1-9", submission, 15, label));
});

test("A1-9 accepts standalone Ans/Answer/Antwort prefixes below copied questions", () => {
  const labels = ["Ans", "Answer:", "Antwort"];
  labels.forEach((prefix) => {
    const submission = A1_9.map((answer, index) => `${index + 1}) copied question?\n${prefix} ${answer}${index % 3 === 0 ? "." : ""}`).join("\n");
    assertPerfect("A1-9", submission, 15, `standalone ${prefix}`);
  });
});

const A1_12_1_PARTS = {
  1: ["B", "A", "B", "C", "C"],
  2: ["B", "B", "B", "B", "B"],
  3: ["A", "A", "A", "A", "A"],
};

function multipart(headings, renderAnswer = (n, a) => `${n}. ${a}`) {
  return [1, 2, 3].map((part) => {
    const heading = headings[part];
    return `${heading}\n${numbered(A1_12_1_PARTS[part], renderAnswer)}`;
  }).join("\n\n");
}

test("A1-12.1 multipart answers survive Teil/Tiel/Part/Roman heading variants", () => {
  const variants = [
    ["Teil headings", multipart({ 1: "Teil 1", 2: "Teil 2", 3: "Teil 3" })],
    ["Tiel typo", multipart({ 1: "Tiel 1", 2: "Tiel 2", 3: "Tiel 3" }, (n, a) => `${n}) ${a}`)],
    ["Part headings", multipart({ 1: "Part 1", 2: "Part 2", 3: "Part 3" })],
    ["Roman first heading", multipart({ 1: "Teil I", 2: "Teil 2", 3: "Teil 3" })],
    ["punctuated headings", multipart({ 1: "Teil 1:", 2: "Teil 2.", 3: "Teil 3 -" })],
  ];

  variants.forEach(([label, submission]) => assertPerfect("A1-12.1", submission, 15, label));
});

test("A1-12.1 Q2/Q3 aliases do not shift answers between parts", () => {
  const opening = numbered(A1_12_1_PARTS[1], (n, a) => `${n}. ${a}`);
  const part2 = numbered(A1_12_1_PARTS[2], (n, a) => `${n}. ${a}`);
  const part3 = numbered(A1_12_1_PARTS[3], (n, a) => `${n}. ${a}`);
  const variants = [
    `Teil 1\n${opening}\n\nQ2\n${part2}\n\nQ3\n${part3}`,
    `${opening}\n\nQ2. 1. B\n${numbered(A1_12_1_PARTS[2].slice(1), (n, a) => `${n + 1}. ${a}`)}\n\nQ3.1 1. A\n${numbered(A1_12_1_PARTS[3].slice(1), (n, a) => `${n + 1}. ${a}`)}`,
  ];
  variants.forEach((submission, index) => assertPerfect("A1-12.1", submission, 15, `Q alias variant ${index + 1}`));
});

test("B1-3.9 recognizes compact answers under stale Teil 2 middle-dot Lesen/Hören headings", () => {
  const submission = `Teil 2 · Schreiben
Work-Life-Balance im modernen Arbeitsumfeld

Heutzutage ist das Thema Work-Life-Balance sehr wichtig. Ich bin der Meinung, dass flexible Arbeitsmodelle hilfreich sind.

Teil 2 · Lesen 1B · 2C · 3A · 4B · 5C · 6B · 7B

Teil 2 · Hören 1B · 2C · 3A · 4B · 5B`;

  assertPerfect("B1-3.9", submission, 12, "stale B1 middle-dot headings");
});

test("A2-6.16 parses unnumbered choice lines inside labelled Teil 3 and Teil 4", () => {
  const submission = `Teil 2
Sehr geehrte Damen und Herren,
ich schreibe Ihnen, weil ich seit einigen Tagen gesundheitliche Probleme habe. Ich möchte gern einen Termin vereinbaren.
Mit freundlichen Grüßen
Sarah

Teil 3
C
A
B
C
A

Teil 4
B
C
A
B
A`;

  const result = computeObjectiveScore("A2-6.16", submission);

  assert.equal(result.totalCount, 10);
  assert.equal(result.correctCount, 9);
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((question) => result.details[`teil3.${question}`].student),
    ["C", "A", "B", "C", "A"],
  );
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((question) => result.details[`teil4.${question}`].student),
    ["B", "C", "A", "B", "A"],
  );
  assert.equal(Object.values(result.details).filter((detail) => detail.student).length, 10);
  assert.equal(result.details["teil3.1"].correct, false);
  assert.equal(Object.entries(result.details).filter(([, detail]) => detail.correct).length, 9);
});
