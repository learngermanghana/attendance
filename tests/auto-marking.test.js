import test from "node:test";
import assert from "node:assert/strict";
import { autoMarkSubmission } from "../src/utils/autoMarking.js";

test("objective auto-mark accepts option letter only", () => {
  const result = autoMarkSubmission({
    referenceEntry: {
      format: "objective",
      answers: {
        Answer1: "B) Um sieben Uhr",
        Answer2: "C) In Berlin",
      },
    },
    submissionText: "Answer1: B\nAnswer2: C",
  });

  assert.equal(result.score, 100);
});

test("objective auto-mark accepts answer text without option letter", () => {
  const result = autoMarkSubmission({
    referenceEntry: {
      format: "objective",
      answers: {
        Answer1: "B) Um sieben Uhr",
        Answer2: "C) In Berlin",
      },
    },
    submissionText: "Answer1: um sieben uhr\nAnswer2: In Berlin",
  });

  assert.equal(result.score, 100);
});

test("objective auto-mark catches partial correctness", () => {
  const result = autoMarkSubmission({
    referenceEntry: {
      format: "objective",
      answers: {
        Answer1: "B) Um sieben Uhr",
        Answer2: "C) In Berlin",
      },
    },
    submissionText: "Answer1: B\nAnswer2: A",
  });

  assert.equal(result.score, 50);
  assert.match(result.feedback, /1\/2/);
});

test("objective auto-mark matches numbered lines without Answer prefix", () => {
  const result = autoMarkSubmission({
    referenceEntry: {
      format: "objective",
      answers: {
        Answer1: "A) sieben",
        Answer2: "B) Drei",
        Answer3: "B) Sechs",
        Answer4: "B) Neun",
        Answer5: "B) Sieben",
        Answer6: "C) Fünf",
        Answer7: "B) zweihundertzweiundzwanzig",
        Answer8: "A) fünfhundertneun",
        Answer9: "A) zweitausendvierzig",
        Answer10: "A) fünftausendfünfhundertneun",
        Answer11: "16 – sechzehn",
        Answer12: "98 – achtundneunzig",
        Answer13: "555 – fünfhundertfünfundfünfzig",
        Answer14: "1020 – tausendzwanzig",
        Answer15: "8553 – achttausendfünfhundertdreiundfünfzig",
      },
    },
    submissionText: [
      "1: A) sieben",
      "2: B) Drei",
      "3: B) Sechs",
      "4: B) Neun",
      "5: B) Sieben",
      "6: C) Fünf",
      "7: B) zweihundertzweiundzwanzig",
      "8: A) fünfhundertneun",
      "9: A) zweitausendvierzig",
      "10: A) fünftausendfünfhundertneun",
      "11: 16 – sechzehn",
      "12: 98 – achtundneunzig",
      "13: 555 – fünfhundertfünfundfünfzig",
      "14: 1020 – tausendzwanzig",
      "15: 8553 – achttausendfünfhundertdreiundfünfzig",
    ].join("\n"),
  });

  assert.equal(result.score, 100);
});
