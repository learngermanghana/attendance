import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTutorCalibrationEvent,
  compareExaminerResults,
  ensureExplicitWritingLabel,
  hasLikelyUnlabelledWritingBeforeObjective,
  hasWritingEvidence,
} from "../src/utils/markingIntelligence.js";
import { heuristicWritingMarker } from "../src/utils/autoMarking.js";
import {
  assignmentHasScoredWriting,
  buildNaturalStudentFeedback,
  enforceRegisteredWritingScore,
} from "../src/utils/naturalMarkingFeedback.js";

test("second examiner accepts close writing scores", () => {
  const comparison = compareExaminerResults(
    { finalScore: 72, writingScore: 70, confidence: 0.9 },
    { finalScore: 75, writingScore: 74, confidence: 0.88, status: "marked" },
  );

  assert.equal(comparison.scoreDelta, 3);
  assert.equal(comparison.writingScoreDelta, 4);
  assert.equal(comparison.requiresTutorReview, false);
  assert.equal(comparison.agreement, "high");
});

test("second examiner routes large score disagreement to tutor review", () => {
  const comparison = compareExaminerResults(
    { finalScore: 78, writingScore: 82 },
    { finalScore: 61, writingScore: 58, status: "marked" },
  );

  assert.equal(comparison.scoreDelta, 17);
  assert.equal(comparison.writingScoreDelta, 24);
  assert.equal(comparison.requiresTutorReview, true);
  assert.equal(comparison.agreement, "low");
});

test("second examiner respects its own needs_review signal", () => {
  const comparison = compareExaminerResults(
    { finalScore: 70, writingScore: 68 },
    { finalScore: 71, writingScore: 69, status: "needs_review" },
  );

  assert.equal(comparison.requiresTutorReview, true);
});

test("writing evidence is detected from a credible writing score or writing part", () => {
  assert.equal(hasWritingEvidence({ writingScore: 64 }), true);
  assert.equal(hasWritingEvidence({ parts: [{ partId: "teil2", partType: "writing" }] }), true);
  assert.equal(hasWritingEvidence({ writingScore: 0, parts: [{ partId: "teil3", partType: "objective" }] }), false);
  assert.equal(hasWritingEvidence({ objectiveScore: 80, parts: [{ partId: "teil3", partType: "objective" }] }), false);
});

test("detects an unlabelled letter before Teil 3 and adds a temporary Teil 2 label", () => {
  const submission = `Hallo Anna,\n\nwie geht es dir? Ich hoffe, es geht dir gut.\n\nIch schreibe dir, weil ich dich zu meinem Geburtstagsfest einladen möchte. Das Fest ist am Samstag um 18 Uhr in meinem Haus in Accra. Ich würde mich sehr freuen, wenn du kommen könntest.\n\nViele Grüße\nDiana\n\nTeil 3\n1.B\n2.C`;

  assert.equal(hasLikelyUnlabelledWritingBeforeObjective(submission), true);
  const prepared = ensureExplicitWritingLabel(submission);
  assert.match(prepared, /^Teil 2 Schreiben\nHallo Anna,/);
  assert.match(prepared, /\nTeil 3\n1\.B/);
});

test("detects Fred's unlabelled B1 opinion essay before Hören and Lesen", () => {
  const submission = `Meine Meinung ist, dass persönlicher Kontakt in meinem Traumberuf für mich sehr wichtig ist, weil man Wissen teilen und neue Fähigkeiten direkt von anderen Menschen lernen kann.

Einerseits gibt es Vorteile beim Homeoffice. Zum Beispiel kann man mehr Zeit mit seiner Familie verbringen.

Andererseits gibt es auch Nachteile. Zum Beispiel kann es schwieriger sein, Verantwortung zu übernehmen und die Arbeit gut zu erledigen, wenn man wenig persönlichen Kontakt hat.

In meinem Heimatland arbeiten viele Menschen als Angestellte. Aber IT und KI schaffen jetzt mehr Möglichkeiten, selbstständig zu arbeiten. Dadurch gibt es auch mehr Möglichkeiten für Homeoffice-Jobs.

Zusammenfassend lässt sich sagen, dass persönlicher Kontakt für mich wichtig ist. Trotzdem hat Homeoffice Vorteile, weil man flexibler arbeiten und mehr Zeit mit der Familie verbringen kann.

Hören
1. a
2. a
3. a
4. a
5. a

Lesen
1. a
2. b
3. a
4. b
5. b
6. b
7. b`;

  assert.equal(hasLikelyUnlabelledWritingBeforeObjective(submission), true);
  const prepared = ensureExplicitWritingLabel(submission);
  assert.match(prepared, /^Teil 2 Schreiben\nMeine Meinung ist/);
  assert.match(prepared, /\nHören\n1\. a/);
  assert.match(prepared, /\nLesen\n1\. a/);
});

test("does not relabel already labelled writing or objective-only work", () => {
  const labelled = "Teil 2\nHallo Anna, ich schreibe dir.\nTeil 3\n1.B";
  const objectiveOnly = "Teil 3\n1.B\n2.C\nTeil 4\n1.A";

  assert.equal(ensureExplicitWritingLabel(labelled), labelled);
  assert.equal(ensureExplicitWritingLabel(objectiveOnly), objectiveOnly);
});

test("A1 objective-only assignment ignores an invented zero writing score", () => {
  const protectedResult = enforceRegisteredWritingScore({
    objectiveScore: 86,
    objectiveCorrect: 12,
    objectiveTotal: 14,
    writingScore: 0,
    writingScorePercent: 0,
    finalScore: 43,
    score: 43,
    status: "needs_review",
  }, {
    assignmentKey: "A1-1.2",
    expectedParts: ["main"],
    writingParts: [],
    aiGradedParts: [],
  });

  assert.equal(assignmentHasScoredWriting({ assignmentKey: "A1-1.2", expectedParts: ["main"] }), false);
  assert.equal(protectedResult.finalScore, 86);
  assert.equal(protectedResult.score, 86);
  assert.equal(protectedResult.writingScore, null);
  assert.equal(protectedResult.status, "marked");
});

test("registered A2 writing keeps its writing score for combined marking", () => {
  const result = { objectiveScore: 75, objectiveTotal: 12, writingScore: 75, finalScore: 75 };
  const referenceEntry = { assignmentKey: "A2-4.10", writingParts: ["teil2"], aiGradedParts: ["teil2"] };

  assert.equal(assignmentHasScoredWriting(referenceEntry), true);
  assert.equal(enforceRegisteredWritingScore(result, referenceEntry), result);
});

test("Mary A1 feedback uses deterministic 12 of 14 and natural tutor style", () => {
  const result = {
    studentName: "Mary",
    objectiveScore: 86,
    objectiveCorrect: 12,
    objectiveTotal: 14,
    objectiveDetails: {
      1: { correct: true },
      2: { correct: false },
      3: { correct: true },
      4: { correct: true },
      5: { correct: true },
      6: { correct: true },
      7: { correct: true },
      8: { correct: true },
      9: { correct: false },
      10: { correct: true },
      11: { correct: true },
      12: { correct: true },
      13: { correct: true },
      14: { correct: true },
    },
  };
  const submission = "Ich heiße Mary. Ich komme aus Ghana und wohne in Kasoa. Ich bin 37 jahre alt.";
  const feedback = buildNaturalStudentFeedback(result, submission);

  assert.match(feedback, /^Good work, Mary\./);
  assert.match(feedback, /12 of 14 objective questions correctly/);
  assert.match(feedback, /questions 2 and 9 carefully/);
  assert.match(feedback, /37 Jahre alt/);
  assert.doesNotMatch(feedback, /📌|📊|🛠|Marking summary|Good effort/);
  assert.ok(feedback.split(/\s+/).length <= 60);
});

test("Diana feedback praises perfect Teil 4 and lists only wrong Teil 3 questions", () => {
  const result = {
    studentName: "Diana",
    objectiveScore: 75,
    objectiveCorrect: 9,
    objectiveTotal: 12,
    objectiveDetails: {
      "teil3.1": { correct: true },
      "teil3.2": { correct: true },
      "teil3.3": { correct: true },
      "teil3.4": { correct: false },
      "teil3.5": { correct: true },
      "teil3.6": { correct: false },
      "teil3.7": { correct: false },
      "teil4.1": { correct: true },
      "teil4.2": { correct: true },
      "teil4.3": { correct: true },
      "teil4.4": { correct: true },
      "teil4.5": { correct: true },
    },
  };
  const submission = "Hallo Anna. Ich freue mich vorfreue mich auf deine Antwort. Viele Grüße Diana";
  const feedback = buildNaturalStudentFeedback(result, submission);

  assert.match(feedback, /Teil 4 is excellent, with all answers correct/);
  assert.match(feedback, /In Teil 3, review questions 4, 6, and 7 carefully/);
  assert.match(feedback, /vorfreue mich/);
  assert.doesNotMatch(feedback, /📌|📊|🛠|Marking summary/);
});

test("A2 informal letter keeps lowercase continuation after comma greeting", () => {
  const letter = `Hallo Alex,\n\nwie geht es dir? Ich hoffe, dir geht es gut. Ich schreibe dir, weil ich am Wochenende Zeit habe und gern etwas mit dir zusammen machen möchte. Hast du am Wochenende frei? Hast du einen Vorschlag für eine Aktivität?\n\nLiebe Grüße\nJoel`;
  const marked = heuristicWritingMarker({ level: "A2", partId: "teil2", text: letter });

  assert.doesNotMatch(marked.feedback, /Start this sentence with a capital letter: "wie geht es dir\?/i);
  assert.equal(marked.corrections.some((item) => /wie geht es dir/i.test(String(item?.submitted || ""))), false);
});

test("A2 deterministic feedback includes exact corrections instead of only question numbers", () => {
  const feedback = buildNaturalStudentFeedback({
    studentName: "Joel Darko",
    objectiveScore: 60,
    objectiveCorrect: 6,
    objectiveTotal: 10,
    objectiveDetails: {
      "teil3.1": { correct: false },
      "teil3.2": { correct: false },
      "teil3.3": { correct: false },
      "teil3.4": { correct: true },
      "teil3.5": { correct: false },
      "teil4.1": { correct: true },
      "teil4.2": { correct: true },
      "teil4.3": { correct: true },
      "teil4.4": { correct: true },
      "teil4.5": { correct: true },
    },
    wrongAnswers: [
      { partId: "teil3", question: 1, expected: "C) Nudeln, Pizza und Salat", student: "a" },
      { partId: "teil3", question: 2, expected: "C) Den grünen Salat", student: "b" },
      { partId: "teil3", question: 3, expected: "C) Schokoladenkuchen und Tiramisu", student: "a" },
      { partId: "teil3", question: 5, expected: "C) In bar", student: "b" },
    ],
    writingScore: 70,
    hasRegisteredWriting: true,
  }, "Hallo Alex,\nwie geht es dir?\nLiebe Grüße\nJoel");

  assert.match(feedback, /Correct answers:/);
  assert.match(feedback, /teil3 question 1 → C\) Nudeln, Pizza und Salat/i);
  assert.match(feedback, /teil3 question 2 → C\) Den grünen Salat/i);
  assert.match(feedback, /teil3 question 3 → C\) Schokoladenkuchen und Tiramisu/i);
  assert.match(feedback, /teil3 question 5 → C\) In bar/i);
});

test("tutor score increase records AI too strict calibration", () => {
  const calibration = buildTutorCalibrationEvent({
    aiScore: 72,
    tutorScore: 81,
    aiFeedback: "Improve grammar.",
    tutorFeedback: "Improve grammar.",
    capturedAt: "2026-07-27T12:00:00.000Z",
  });

  assert.equal(calibration.scoreDelta, 9);
  assert.equal(calibration.manualOverride, true);
  assert.equal(calibration.reasonCode, "ai_too_strict");
});

test("tutor score decrease records AI too generous calibration", () => {
  const calibration = buildTutorCalibrationEvent({
    aiScore: 78,
    tutorScore: 66,
    capturedAt: "2026-07-27T12:00:00.000Z",
  });

  assert.equal(calibration.scoreDelta, -12);
  assert.equal(calibration.reasonCode, "ai_too_generous");
});

test("feedback-only edit is recorded without inventing a score issue", () => {
  const calibration = buildTutorCalibrationEvent({
    aiScore: 75,
    tutorScore: 75,
    aiFeedback: "Generic feedback.",
    tutorFeedback: "Specific correction from the student's sentence.",
    capturedAt: "2026-07-27T12:00:00.000Z",
  });

  assert.equal(calibration.scoreChanged, false);
  assert.equal(calibration.feedbackChanged, true);
  assert.equal(calibration.manualOverride, true);
  assert.equal(calibration.reasonCode, "feedback_rewritten");
});

test("unchanged tutor approval becomes a positive calibration example", () => {
  const calibration = buildTutorCalibrationEvent({
    aiScore: 84,
    tutorScore: 84,
    aiFeedback: "Accurate feedback.",
    tutorFeedback: "Accurate feedback.",
    capturedAt: "2026-07-27T12:00:00.000Z",
  });

  assert.equal(calibration.manualOverride, false);
  assert.equal(calibration.reasonCode, "ai_approved");
});

test("objective feedback hides correct answers below the 60 percent pass mark", () => {
  const feedback = buildNaturalStudentFeedback({
    studentName: "Princess Ugoma Omanye Ukekwe",
    objectiveScore: 27,
    objectiveCorrect: 4,
    objectiveTotal: 15,
    wrongAnswers: [
      { question: 1, expected: "Falsch", student: "" },
      { question: 2, expected: "Wahr", student: "" },
      { question: 13, expected: "A) Ein halbes Kilo", student: "B) Ein Kilo" },
    ],
  }, "Teil 2.\n1. B\n2. C\n3. B\n4. B\n5. B");

  assert.match(feedback, /You answered 4 of 15 objective questions correctly/);
  assert.match(feedback, /Review questions 1, 2, and 13 carefully/);
  assert.doesNotMatch(feedback, /Correct answers:|Ein halbes Kilo|→/i);
});

test("objective feedback derives a passing score from authoritative counts when percentage is missing", () => {
  const feedback = buildNaturalStudentFeedback({
    studentName: "Legacy Student",
    objectiveScore: null,
    objectiveCorrect: 3,
    objectiveTotal: 4,
    wrongAnswers: [
      { question: 4, expected: "B) Correct option", student: "A) Wrong option" },
    ],
  }, "1. A\n2. B\n3. C\n4. A");

  assert.match(feedback, /You answered 3 of 4 objective questions correctly/);
  assert.match(feedback, /Correct answers:/);
  assert.match(feedback, /question 4 → B\) Correct option/i);
});
