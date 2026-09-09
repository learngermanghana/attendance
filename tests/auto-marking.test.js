import test from "node:test";
import assert from "node:assert/strict";
import { autoMarkSubmission, checkDeterministicObjectiveAnswers } from "../src/utils/autoMarking.js";
import { objectiveMarkingRegressions } from "./fixtures/objective-marking-regressions.js";

for (const fixture of objectiveMarkingRegressions) {
  test(`objective regression: ${fixture.name}`, () => {
    const result = checkDeterministicObjectiveAnswers(fixture);
    assert.equal(result.objectiveCorrect, fixture.expectedCorrect);
    assert.equal(result.objectiveTotal, fixture.expectedTotal);
    assert.deepEqual(result.wrongAnswers, []);
  });
}

test("deterministic parser scores Anzeige A-F-X answers without AI", () => {
  const result = checkDeterministicObjectiveAnswers({
    referenceEntry: {
      answers: `teil3:
Answer1. Anzeige: f
Answer2. Anzeige: c
Answer3. Anzeige: X
Answer4. Anzeige: b
Answer5. Anzeige: a`,
    },
    submissionText: `Lesen

1. F
2. C
3. C
4. E
5. A`,
  });

  assert.equal(result.objectiveScore, 60);
  assert.equal(result.objectiveCorrect, 3);
  assert.equal(result.objectiveTotal, 5);
  assert.deepEqual(result.wrongAnswers.map(({ question, expected, student }) => ({ question, expected, student })), [
    { question: 3, expected: "X", student: "C" },
    { question: 4, expected: "B", student: "E" },
  ]);
  assert.equal(result.detectedParts[0].summary, "teil3: 5 objective answers found, 3 correct, 2 wrong");
});

test("deterministic checker scores German word part labels with prefixed reference lines", () => {
  const result = checkDeterministicObjectiveAnswers({
    referenceEntry: {
      answers: `teil3: Answer1. a) kurz vor 7 Uhr
teil3: Answer2. d) Müsli oder Toast mit Marmelade
teil3: Answer3. b) Hausaufgaben
teil3: Answer4. a) am Nachmittag
teil3: Answer5. b) Freunde treffen
teil4: Answer1. c) die Schweiz
teil4: Answer2. d) mit dem Zug
teil4: Answer3. a) an einem kleinen Bahnhof
teil4: Answer4. d) einen Zimmerschlüssel
teil4: Answer5. b) das Zimmer ist zu klein`,
    },
    submissionText: `ASSIGNMENT 25
Teil zwei

Liebe Susan,

wie geht es dir?

Teil drei
1. A
2. D
3. B
4. A
5. B

Teil vier
1. c
2. d
3. a
4. d
5. b`,
  });

  assert.equal(result.objectiveScore, 100);
  assert.equal(result.objectiveCorrect, 10);
  assert.equal(result.objectiveTotal, 10);
  assert.deepEqual(result.wrongAnswers, []);
  assert.equal(result.detectedParts[0].summary, "teil3: 5 objective answers found, 5 correct, 0 wrong");
  assert.equal(result.detectedParts[1].summary, "teil4: 5 objective answers found, 5 correct, 0 wrong");
});

test("deterministic checker ignores an empty duplicate part heading", () => {
  const result = checkDeterministicObjectiveAnswers({
    referenceEntry: {
      assignmentKey: "A2-1.2",
      level: "A2",
      answers: `teil3: Answer1. B) Ein Jahr
teil3: Answer2. B) Er ist immer gut gelaunt und organisiert
teil3: Answer3. C) Einen Anzug und eine Brille
teil3: Answer4. B) Er geht geduldig auf ihre Anliegen ein
teil3: Answer5. B) Weil er seine Mitarbeiter regelmäßig lobt
teil3: Answer6. A) Wenn eine Aufgabe nicht rechtzeitig erledigt wird
teil3: Answer7. B) Dass er fair ist und die Leistungen der Mitarbeiter wertschätzt
teil4: Answer1. B) Weil er
teil4: Answer2. C) Sprachkurse
teil4: Answer3. A) Jeden Tag`,
    },
    submissionText: `Teils 2
Lieber Felix,

Ich schreibe dir, weil ich dir von meinem Chef erzählen möchte.

Viele Grüße,
Jeffrey

Teil 3
1.B
2.B
3.C
4.B
5.B
6.A
7.B

Teil 4
Teil 4
1. B
2. C
3. A`,
  });

  assert.equal(result.objectiveScore, 100);
  assert.equal(result.objectiveCorrect, 10);
  assert.equal(result.objectiveTotal, 10);
  assert.deepEqual(result.wrongAnswers, []);
  assert.equal(result.detectedParts[1].summary, "teil4: 3 objective answers found, 3 correct, 0 wrong");
});

test("deterministic checker scores Aufgabe-labelled objective answers", () => {
  const result = checkDeterministicObjectiveAnswers({
    referenceEntry: {
      assignmentKey: "A2-8.22",
      level: "A2",
      answers: `teil3: Answer1. C) Im Moment ist vieles neu für sie.
teil3: Answer2. B) Für neue Studenten eine Stadtführung gemacht.
teil3: Answer3. C) Kocht jeder einmal für die anderen.
teil3: Answer4. B) Deutsch zu sprechen.
teil3: Answer5. C) Übernachtet Sonja in Marios Zimmer.`,
    },
    submissionText: `Assignment 22
Teil 2

Liebe Sarah,

Ich möchte dich zum Mittagessen einladen.

Teil 3

Aufgabe 1:
c) im Moment vieles neu für sie ist.

Aufgabe 2:
 a) den Neuen die Hochschule gezeigt.

Aufgabe 3:
 c) kocht jeder einmal für die anderen.

Aufgabe 4:
b) Deutsch zu sprechen.

Aufgabe 5:
 c) übernachtet Sonja in Marios Zimmer.`,
  });

  assert.equal(result.objectiveScore, 80);
  assert.equal(result.objectiveCorrect, 4);
  assert.equal(result.objectiveTotal, 5);
  assert.deepEqual(result.wrongAnswers.map(({ question, expected, student }) => ({ question, expected, student })), [
    { question: 2, expected: "B", student: "A" },
  ]);
  assert.equal(result.detectedParts[0].summary, "teil3: 5 objective answers found, 4 correct, 1 wrong");
});

test("deterministic parser scores numbered Anzeige answers", () => {
  const result = checkDeterministicObjectiveAnswers({
    referenceEntry: {
      format: "objective",
      answers: `1 Anzeige A
2 Anzeige B
3 Anzeige B
4 Anzeige A
5 Anzeige A`,
    },
    submissionText: `1 Anzeige A
2 Anzeige B
3 Anzeige B
4 Anzeige A
5 Anzeige B`,
  });

  assert.equal(result.objectiveScore, 80);
  assert.equal(result.objectiveCorrect, 4);
  assert.equal(result.objectiveTotal, 5);
  assert.deepEqual(result.wrongAnswers.map(({ question, expected, student }) => ({ question, expected, student })), [
    { question: 5, expected: "A", student: "B" },
  ]);
});

test("deterministic parser supports German body-part vocabulary pairs", () => {
  const result = checkDeterministicObjectiveAnswers({
    referenceEntry: {
      format: "objective",
      answers: `Head Kopf
Arm Arm
Leg Bein
Eye Auge
Nose Nase
Ear Ohr
Mouth Mund
Hand Hand
Foot Fuß
Stomach/Belly Bauch`,
    },
    submissionText: `Head Kopf
Arm Arm
Leg Beine
Eye Auge
Nose Nase
Ear Ohr
Mouth Mund
Hand Hand
Foot Fuß
Stomach Magen`,
  });

  assert.equal(result.objectiveCorrect, 8);
  assert.equal(result.objectiveTotal, 10);
  assert.equal(result.objectiveScore, 80);
  assert.deepEqual(result.wrongAnswers.map(({ question, expected, student }) => ({ question, expected, student })), [
    { question: 3, expected: "BEIN", student: "Beine" },
    { question: 10, expected: "BAUCH", student: "Magen" },
  ]);
});

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


test("objective auto-mark ignores case differences in text answers", () => {
  const result = autoMarkSubmission({
    referenceEntry: {
      format: "objective",
      answers: {
        Answer1: "Wasser",
        Answer2: "Brot",
      },
    },
    submissionText: "Answer1: wasser\nAnswer2: BROT",
  });

  assert.equal(result.score, 100);
  assert.equal(result.objectiveCorrect, 2);
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

test("A1 14.1 deterministic checker extracts Anzeige and body-part vocabulary answers", () => {
  const referenceEntry = {
    assignmentKey: "A1-14.1",
    level: "A1",
    format: "objective",
    answers: {
      Answer1: "Frage 1: Anzeige A",
      Answer2: "Frage 2: Anzeige B",
      Answer3: "Frage 3: Anzeige B",
      Answer4: "Frage 4: Anzeige A",
      Answer5: "Frage 5: Anzeige A",
      Answer6: "a. Head – Kopf",
      Answer7: "b. Arm – Arm",
      Answer8: "c. Leg – Bein",
      Answer9: "d. Eye – Auge",
      Answer10: "e. Nose – Nase",
      Answer11: "f. Ear – Ohr",
      Answer12: "g. Mouth – Mund",
      Answer13: "h. Hand – Hand",
      Answer14: "i. Foot – Fuß",
      Answer15: "j. Stomach / Belly – Bauch",
    },
  };

  const result = checkDeterministicObjectiveAnswers({
    referenceEntry,
    submissionText: `1 Anzeige A
2.Anzeige B
3 Anzeige B
4 Anzeige A
5 Anzeige B
Head - Kopf
Arm - Arm
Leg - Beine
Eye - Auge
Nose - Nase
Ear - Ohr
Mouth - Mund
Hand - Hand
Foot - fuss
Stomach - Magen`,
  });

  assert.equal(result.objectiveCorrect, 12);
  assert.equal(result.objectiveTotal, 15);
  assert.equal(result.objectiveScore, 80);
  assert.equal(result.wrongAnswers.length, 3);
  assert.deepEqual(result.detectedParts[0], { partId: "main", partType: "objective", correct: 12, total: 15 });
});

test("smart router splits A2 submission and routes Schreiben to writing, Lesen/Hören to objective keys", () => {
  const result = autoMarkSubmission({
    referenceEntry: {
      assignmentKey: "A2-Mock-1",
      level: "A2",
      answers: {
        teil3: { Answer1: "B", Answer2: "richtig" },
        teil4: { Answer1: "A", Answer2: "falsch" },
      },
    },
    submission: { assignmentKey: "A2-Mock-1", level: "A2" },
    submissionText: `Teil 2 Schreiben
Hallo Anna,
ich komme heute später, weil ich arbeiten muss. Kannst du bitte warten? Viele Gruesse

Teil 3 Lesen
1: b
2: R

Teil 4 Hören
1: A
2: false`,
  });

  assert.equal(result.level, "A2");
  assert.equal(result.objectiveCorrect, 4);
  assert.equal(result.objectiveTotal, 4);
  assert.equal(result.detectedParts.find((part) => part.partId === "teil2").partType, "writing");
  assert.equal(result.status, "marked");
});

test("A1 letter-like submission uses A1 writing rubric", () => {
  const result = autoMarkSubmission({
    referenceEntry: { assignmentKey: "A1-letter", level: "A1" },
    submission: { level: "A1", assignmentKey: "A1-letter" },
    submissionText: "Hallo Maria,\nich bin krank. Ich komme heute nicht. Wir sehen uns morgen. Viele Gruesse\nAma",
  });

  assert.equal(result.parts[0].partType, "writing");
  assert.equal(result.parts[0].result.level, "A1");
});

import answersDictionary from "../src/data/answers_dictionary.json" with { type: "json" };
import { normalizeAnswerDictionary, normalizeSingleAnswer } from "../src/utils/answerKeyNormalizer.js";

test("normalizes option-letter answer metadata for registry import", () => {
  const normalized = normalizeSingleAnswer("Answer1", "B) Tanzen", 0);

  assert.deepEqual(normalized.acceptedAnswers.slice(0, 3), ["B", "Tanzen", "B Tanzen"]);
  assert.equal(normalized.questionNumber, "1");
  assert.equal(normalized.correctLetter, "B");
  assert.equal(normalized.correctText, "Tanzen");
});

test("objective matching accepts stem and close spelling but flags conflicting option plus text", () => {
  const referenceEntry = {
    format: "objective",
    answers: { Answer1: "B) Tanzen", Answer2: "B) Tanzen", Answer3: "B) Tanzen" },
  };

  const result = autoMarkSubmission({
    referenceEntry,
    submissionText: "1: Tanz\n2: tansen\n3: A Tanzen",
  });

  assert.equal(result.objectiveCorrect, 2);
  assert.equal(result.status, "needs_review");
  assert.match(result.parts[0].result.needsReview[0].reason, /Conflicting option letter/);
});

test("objective matching treats correct option letter as primary over wrong text", () => {
  const result = autoMarkSubmission({
    referenceEntry: { assignmentKey: "A1-3", level: "A1", format: "objective", answers: { Answer1: "B) Tanzen" } },
    submission: { assignmentKey: "A1-3", level: "A1" },
    submissionText: "1: B Schwimmen",
  });

  assert.equal(result.objectiveCorrect, 1);
  assert.equal(result.status, "marked");
});

test("normalizes uploaded A2/B1 dictionary entries with Teil 3 and Teil 4 parts", () => {
  const registry = normalizeAnswerDictionary(answersDictionary);
  const a2 = registry.find((entry) => entry.assignmentKey === "A2-1.1");
  const b1 = registry.find((entry) => entry.assignmentKey === "B1-1.1");

  assert.ok(a2.parts.teil3.answerCount > 0);
  assert.ok(a2.parts.teil4.answerCount > 0);
  assert.ok(b1.parts.teil3.answerCount > 0);
  assert.ok(b1.parts.teil4.answerCount > 0);
});

test("marking proxy accepts A1 matching options through J", async () => {
  const { default: handler } = await import("../api/router.js");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true, status: 200,
    text: async () => JSON.stringify({ result: { feedback: "placeholder", parts: [], status: "marked" } }),
  });
  const nouns = [
    ["J", "Der Tisch", "the table"], ["C", "Die Lampe", "the lamp"], ["G", "Das Buch", "the book"],
    ["E", "Der Stuhl", "the chair"], ["F", "Die Katze", "the cat"], ["H", "Das Auto", "the car"],
    ["A", "Der Hund", "the dog"], ["B", "Die Blume", "the flower"], ["D", "Das Fenster", "the window"],
    ["I", "Der Computer", "the computer"],
  ];
  const descriptions = ["ist groß", "ist neu", "ist interessant", "ist bequem", "ist süß", "ist schnell", "ist freundlich", "ist schön", "ist offen", "ist teuer"];
  const actions = ["Ich sehe den Tisch", "Sie kauft die Lampe", "Er liest das Buch", "Wir brauchen den Stuhl", "Du fütterst die Katze", "Ich fahre das Auto", "Sie streichelt den Hund", "Er pflückt die Blume", "Wir putzen das Fenster", "Sie benutzen den Computer"];
  const answers = [
    ...nouns.map(([, german, english]) => `${german} – ${english}`),
    ...nouns.map(([, german], index) => `${german} ${descriptions[index]}`),
    ...actions,
  ];
  const numbered = (values) => values.map((value, index) => `${index + 1}. ${value}`).join("\n");
  const submissionText = [
    `Teil 1\n${numbered(nouns.map(([letter,, english]) => `${letter}- ${english}`))}`,
    `Teil 2\n${numbered(nouns.map(([, german], index) => `${german} ${descriptions[index]}.`))}`,
    `Teil 3\n${numbered(actions.map((answer) => `${answer}.`))}`,
  ].join("\n\n");
  const req = { method: "POST", url: "/marking/ai", headers: { host: "localhost", "content-type": "application/json" }, body: {
    assignmentKey: "A1-5", level: "A1", submission: { name: "Student", assignmentKey: "A1-5", level: "A1" },
    referenceEntry: { assignmentKey: "A1-5", level: "A1", format: "objective", parts: { main: { answers: Object.fromEntries(answers.map((answer, index) => [`Answer${index + 1}`, answer])) } } },
    submissionText,
  } };
  let jsonBody;
  const res = { status() { return this; }, json(body) { jsonBody = body; return body; }, send(body) { jsonBody = body; return body; }, setHeader() {} };
  try { await handler(req, res); } finally { globalThis.fetch = originalFetch; }
  assert.equal(jsonBody.result.objectiveCorrect, 30);
  assert.equal(jsonBody.result.objectiveTotal, 30);
  assert.equal(jsonBody.result.objectiveScore, 100);
  assert.deepEqual(jsonBody.result.wrongAnswers, []);
});

test("flat A1 keys do not repeat Teil 1 answers into an empty Teil 3", async () => {
  const { default: handler } = await import("../api/router.js");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true, status: 200,
    text: async () => JSON.stringify({ result: { writingScore: 80, feedback: "Writing marked.", parts: [{ partId: "teil2", partType: "writing", result: { score: 80 } }], status: "marked" } }),
  });
  const answers = ["Frage 1: Anzeige A", "Frage 2: Anzeige B", "Frage 3: Anzeige B", "Frage 4: Anzeige A", "Frage 5: Anzeige A", "a. Head – Kopf", "b. Arm – Arm", "c. Leg – Bein", "d. Eye – Auge", "e. Nose – Nase", "f. Ear – Ohr", "g. Mouth – Mund", "h. Hand – Hand", "i. Foot – Fuß", "j. Stomach / Belly – Bauch"];
  const submissionText = `Teil 1.
Frage1:1. Anzeige A
Frage2: 2. Anzeige B
Frage3:2. Anzeige B
Frage4:1. Anzeige A
Frage 5: 1. Anzeige A

Teil 2.
Hallo Felix, vielen Dank für deine Einladung zu deinem Geburtstag. Ich kann leider nicht kommen, weil ich krank bin. Können wir einen anderen Termin vereinbaren?

Liebe Grüße
Princess

Teil 3`;
  const referenceEntry = { assignmentKey: "A1-14.1", level: "A1", format: "objective", answers: Object.fromEntries(answers.map((answer, index) => [`Answer${index + 1}`, answer])) };
  const directResult = checkDeterministicObjectiveAnswers({ referenceEntry, submissionText });
  assert.deepEqual(directResult.wrongAnswers.map(({ question, student }) => ({ question, student })), [
    ...Array.from({ length: 10 }, (_, index) => ({ question: index + 6, student: "" })),
  ]);
  const req = { method: "POST", url: "/marking/ai", headers: { host: "localhost", "content-type": "application/json" }, body: {
    assignmentKey: "A1-14.1", level: "A1", submission: { name: "Princess", assignmentKey: "A1-14.1", level: "A1" },
    referenceEntry: { ...referenceEntry, parts: { main: { answers: referenceEntry.answers } } },
    submissionText,
  } };
  let jsonBody;
  const res = { status() { return this; }, json(body) { jsonBody = body; return body; }, send(body) { jsonBody = body; return body; }, setHeader() {} };
  try { await handler(req, res); } finally { globalThis.fetch = originalFetch; }
  assert.equal(jsonBody.result.objectiveCorrect, 5);
  assert.equal(jsonBody.result.objectiveTotal, 15);
  assert.deepEqual(jsonBody.result.wrongAnswers.map(({ question, student }) => ({ question, student })), [
    ...Array.from({ length: 10 }, (_, index) => ({ question: index + 6, student: "" })),
  ]);
});


test("marking proxy combines deterministic objective score with Schreiben feedback", async () => {
  const { default: handler } = await import("../api/router.js");
  const originalFetch = globalThis.fetch;
  let proxiedPayload;
  globalThis.fetch = async (_url, options = {}) => {
    proxiedPayload = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        result: {
          score: 100,
          finalScore: 100,
          objectiveScore: 100,
          objectiveCorrect: 12,
          objectiveTotal: 12,
          feedback: "Objective-only placeholder from upstream AI.",
          parts: [],
          status: "marked",
        },
      }),
    };
  };

  const req = {
    method: "POST",
    url: "/marking/ai",
    headers: { host: "localhost", "content-type": "application/json" },
    body: {
      assignmentKey: "A2-1.1",
      level: "A2",
      submission: { name: "Melchizedek", assignmentKey: "A2-1.1", level: "A2" },
      referenceEntry: {
        assignmentKey: "A2-1.1",
        level: "A2",
        expectedParts: ["teil3", "teil4"],
        parts: {
          teil3: { answers: ["B", "B", "C", "C", "B", "A", "B"].map((correctLetter, index) => ({ questionNumber: String(index + 1), correctLetter })) },
          teil4: { answers: ["B", "C", "B", "A", "B"].map((correctLetter, index) => ({ questionNumber: String(index + 1), correctLetter })) },
        },
      },
      submissionText: `Teil 2:
Lieber Felix,
Wie geht es dir? Ich hoffe, es geht dir gut.
Ich schreibe dir, weil ich Accra und Kumasi vergleiche und auch Pizza und Hamburger sowie Fußball und Tennis vergleiche.
Zuerst finde ich Accra interessanter als Kumasi, weil Accra viel schöner und sauberer ist.
Meiner Meinung nach ist Pizza besser als Hamburger, weil sie leckerer ist.
Zum Schluss, Fußball macht mehr Spaß als Tennis, weil es spannender ist.
Ich freue mich auf deine Antwort.
Viele Grüße,
Melchizedek.

Teil 3:
1. B
2. B
3. C
4. C
5. B
6. A
7. B

Teil 4:
1. B
2. C
3. B
4. A
5. B`,
    },
  };

  let statusCode = 0;
  let jsonBody;
  const res = {
    status(code) { statusCode = code; return this; },
    json(body) { jsonBody = body; return body; },
    send(body) { jsonBody = body; return body; },
    setHeader() {},
  };

  try {
    await handler(req, res);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const result = jsonBody.result;
  assert.equal(statusCode, 200);
  assert.equal(result.objectiveScore, 100);
  assert.equal(result.objectiveCorrect, 12);
  assert.equal(result.objectiveTotal, 12);
  assert.deepEqual(proxiedPayload.objectiveFeedbackContext, {
    correct: 12,
    total: 12,
    score: 100,
    wrongAnswers: [],
  });
  assert.ok(result.writingScore > 0);
  assert.ok(result.finalScore < 100);
  assert.ok(result.parts.some((part) => part.partType === "writing"));
  assert.match(result.feedback, /Writing marked/);
  assert.match(result.feedback, /Excellent work, Melchizedek/);
  assert.match(result.feedback, /Objective score: 12\/12 correct/);
  assert.doesNotMatch(result.feedback, /\*\*/);
});

test("marking proxy prefers Schreiben part score over stale top-level writing score", async () => {
  const { default: handler } = await import("../api/router.js");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({
      result: {
        score: 55,
        finalScore: 55,
        objectiveScore: 100,
        objectiveCorrect: 12,
        objectiveTotal: 12,
        writingScore: 10,
        feedback: "Upstream result with stale writing score.",
        parts: [{ partId: "teil2", partType: "writing", result: { score: 86 }, feedback: "Writing marked with A2 rubric." }],
        status: "marked",
      },
    }),
  });

  const req = {
    method: "POST",
    url: "/marking/ai",
    headers: { host: "localhost", "content-type": "application/json" },
    body: {
      assignmentKey: "A2-1.1",
      level: "A2",
      submission: { name: "Cathy", assignmentKey: "A2-1.1", level: "A2" },
      referenceEntry: {
        assignmentKey: "A2-1.1",
        level: "A2",
        expectedParts: ["teil3", "teil4"],
        parts: {
          teil3: { answers: ["B", "B", "A", "B", "B", "A", "B"].map((correctLetter, index) => ({ questionNumber: String(index + 1), correctLetter })) },
          teil4: { answers: ["B", "B", "B", "C", "B"].map((correctLetter, index) => ({ questionNumber: String(index + 1), correctLetter })) },
        },
      },
      submissionText: `SCHREIBEN
Sehr geehrte Damen und Herren,
Ich schreibe Ihnen, weil ich ein Auto für das Wochenende mieten möchte.
Mit freundlichen Grüßen,
Cathy

LESEN
1. B
2. B
3. A
4. B
5. B
6. A
7. B

HÖREN
1. B
2. B
3. B
4. C
5. B`,
    },
  };

  let statusCode = 0;
  let jsonBody;
  const res = {
    status(code) { statusCode = code; return this; },
    json(body) { jsonBody = body; return body; },
    send(body) { jsonBody = body; return body; },
    setHeader() {},
  };

  try {
    await handler(req, res);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(statusCode, 200);
  assert.equal(jsonBody.result.objectiveScore, 100);
  assert.equal(jsonBody.result.writingScore, 86);
  assert.equal(jsonBody.result.finalScore, 93);
});

test("marking proxy feedback includes the student's exact wrong objective answers", async () => {
  const { default: handler } = await import("../api/router.js");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({
      result: {
        score: 50,
        finalScore: 50,
        feedback: "Upstream placeholder.",
        parts: [],
        status: "marked",
      },
    }),
  });

  const req = {
    method: "POST",
    url: "/marking/ai",
    headers: { host: "localhost", "content-type": "application/json" },
    body: {
      assignmentKey: "A2-feedback",
      level: "A2",
      submission: { name: "Charlotte", assignmentKey: "A2-feedback", level: "A2" },
      referenceEntry: {
        assignmentKey: "A2-feedback",
        level: "A2",
        parts: {
          teil3: { answers: { Answer1: "B) Hausaufgaben", Answer2: "D) Müsli" } },
        },
      },
      submissionText: `Teil drei
1. A
2. D`,
    },
  };

  let statusCode = 0;
  let jsonBody;
  const res = {
    status(code) { statusCode = code; return this; },
    json(body) { jsonBody = body; return body; },
    send(body) { jsonBody = body; return body; },
    setHeader() {},
  };

  try {
    await handler(req, res);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const result = jsonBody.result;
  assert.equal(statusCode, 200);
  assert.equal(result.objectiveCorrect, 1);
  assert.match(result.feedback, /Good effort, Charlotte/);
  assert.match(result.feedback, /teil3 1: Your answer was "A"; correct answer is "B"/);
  assert.doesNotMatch(result.feedback, /\*\*/);
});

test("writing feedback highlights exact submitted wording and concrete corrections", () => {
  const result = autoMarkSubmission({
    referenceEntry: { assignmentKey: "A2-writing-feedback", level: "A2", format: "writing" },
    submission: { assignmentKey: "A2-writing-feedback", level: "A2" },
    submissionText: `Teil zwei
Hallo Tom
ich gehe jeden Morgen zur Schule und danach lerne ich Deutsch, weil ich in Deutschland arbeiten möchte.
Viele Grüße
Anna`,
  });

  assert.equal(result.parts[0].partType, "writing");
  assert.match(result.feedback, /clear greeting "Hallo Tom"/);
  assert.match(result.feedback, /Write "Ich gehe jeden Morgen.*instead of "ich gehe jeden Morgen/);
  assert.equal(result.corrections[0].type, "writing");
  assert.match(result.improvementSummary, /"ich gehe jeden Morgen/);
  assert.doesNotMatch(result.feedback, /\*\*/);
  assert.doesNotMatch(result.improvementSummary, /\*\*/);
});


test("A2 writing feedback names multiple exact phrase corrections", () => {
  const result = autoMarkSubmission({
    referenceEntry: { assignmentKey: "A2-9.23", level: "A2", format: "writing" },
    submission: { assignmentKey: "A2-9.23", level: "A2" },
    submissionText: `Schreiben
Liebe Anna
Wie geht es dir? Mir geht es gut
Ich hoffe, es geht dir gut
Ich schreibe dir, weil ich dich zu einem  Autohaus einladen möchte.
I möchte mit dir zum  Autohaus gehen. Ich brauche ein Auto für die Arbeit.
Ich schlage vor, wir treffen uns in Accra. Können wir uns nächsten Woche um Freitag treffen?
Welches Modell würdest du empfehlen?
Ich freue mich im Voraus auf deine Antwort!
Viele Grüße
Bernardette`,
  });

  assert.match(result.feedback, /Use the German subject pronoun in "I möchte"/);
  assert.match(result.feedback, /Fix the time phrase "nächsten Woche um Freitag"/);
  assert.match(result.feedback, /Make the invitation phrase more natural: "zu einem Autohaus einladen"/);
  assert.deepEqual(result.corrections.slice(0, 3).map((correction) => correction.submitted), [
    "I möchte",
    "nächsten Woche um Freitag",
    "zu einem Autohaus einladen",
  ]);
});

test("formal German greeting feedback does not add unclear comma-period punctuation", () => {
  const result = autoMarkSubmission({
    referenceEntry: { assignmentKey: "A2-6.17", level: "A2", format: "writing" },
    submission: { assignmentKey: "A2-6.17", level: "A2" },
    submissionText: `SCHREIBEN

Sehr Geehrte Damen und Herren,

Ich hoffe es geht Ihnen gut. Ich schreibe Ihnen weil ich ein bestimmtes Medikament kaufen möchte.

Mit freundlichen Grüßen,
Cathy Summus.`,
  });

  assert.match(result.feedback, /Use lower-case "geehrte" in the formal greeting/);
  assert.match(result.improvementSummary, /"Sehr Geehrte" → Sehr geehrte/);
  assert.doesNotMatch(result.feedback, /Add sentence punctuation after "Sehr Geehrte Damen und Herren,"/);
  assert.doesNotMatch(result.improvementSummary, /Damen und Herren,\./);
});

test("unlabelled A2 writing before Lesen is included in feedback", () => {
  const result = autoMarkSubmission({
    referenceEntry: {
      assignmentKey: "A2-5.14",
      level: "A2",
      answers: {
        teil3: {
          Answer1: "B) Die Kollegen und die Arbeit",
          Answer2: "C) Mit Sie",
          Answer3: "C) Eine Arbeitnehmervertretung",
          Answer4: "C) Arbeitskleidung, Pausen und feste Arbeitszeiten",
          Answer5: "C) Man kann Arbeitsbeginn und -ende flexibel wählen",
          Answer6: "C) 38-40 Stunden",
          Answer7: "B) Den Urlaub eintragen und genehmigen lassen",
        },
        teil4: {
          Answer1: "D) Weiter das Gehalt oder den Lohn",
          Answer2: "C) Sofort den Arbeitgeber informieren und zum Arzt gehen",
          Answer3: "C) Auf der Baustelle oder am Flughafen",
          Answer4: "C) Die Kündigung schriftlich und mit Frist einreichen",
          Answer5: "C) In der Volkshochschule",
        },
      },
    },
    submission: { assignmentKey: "A2-5.14", level: "A2" },
    submissionText: `Lieber Felix\n\nich hoffe, es geht dir gut.\nIch schreibe dir, weil ich mich für deinen Vorschlag bedanken möchte.\nIch arbeite jetzt als Projektkoordinator bei SINGA.\nIch freue mich auf deine Antwort.\n\nViele Grüße\nFred\n\nLesen\n1. b\n2. c\n3. c\n4. c\n5. c\n6. c\n7. b\n8. d\n9. c\n10. c\n11. c\n12. c`,
  });

  assert.equal(result.parts[0].partType, "writing");
  assert.match(result.feedback, /Writing score:/);
  assert.match(result.feedback, /Objective score:/);
  assert.doesNotMatch(result.feedback, /Both sections contribute equally/);
  assert.doesNotMatch(result.feedback, /\*\*/);
});


test("writing feedback expands substantive text instead of the student signature", () => {
  const result = autoMarkSubmission({
    referenceEntry: { assignmentKey: "A2-signature-feedback", level: "A2", format: "writing" },
    submission: { assignmentKey: "A2-signature-feedback", level: "A2" },
    submissionText: `Teil 2 (Schreiben)
Lieber Felix,
wie geht es dir? Ich hoffe, es geht dir gut. Ich schreibe dir, weil ich Accra und Kumasi, Pizza und Hamburger, Fußball und Tennis vergleichen möchte.
Ich finde Kumasi schöner als Accra, weil es ruhiger ist und mehr Natur hat. Accra ist größer, aber oft sehr laut.
Ich bevorzuge Pizza, weil ich Käse und Tomaten sehr mag. Hamburger sind auch lecker, aber Pizza schmeckt mir besser.
Ich finde Fußball spannender als Tennis, weil es schneller und dynamischer ist. Tennis ist interessant, aber ich schaue lieber Fußball.
Was denkst du? Welche Stadt, welches Essen und welcher Sport gefallen dir besser? Vielleicht können wir uns bald treffen und darüber sprechen.
Ich freue mich im Voraus auf deine Antwort.
Viele Grüße
Eric`,
  });

  assert.match(result.feedback, /Next step: add one more clear detail to/);
  assert.doesNotMatch(result.feedback, /add one more clear detail to "Eric"/);
  assert.doesNotMatch(result.feedback, /verb (?:position|conjugation)|conjugation/i);
  assert.match(result.feedback, /"Vielleicht können wir uns bald treffen und darüber sprechen\."/);
  assert.match(result.improvementSummary, /"Vielleicht können wir uns bald treffen und darüber sprechen\."/);
  assert.doesNotMatch(result.feedback, /\*\*/);
});


test("A2 hotel reservation feedback gives specific vocabulary extension goals", () => {
  const result = autoMarkSubmission({
    referenceEntry: { assignmentKey: "A2-4.9", level: "A2", format: "writing" },
    submission: { assignmentKey: "A2-4.9", level: "A2" },
    submissionText: `Teil 2:
Sehr geehrte Damen und Herren,
ich hoffe, es geht Ihnen gut. Ich schreibe Ihnen, weil ich eine Anfrage stellen möchte. Ich plane einen Urlaub mit meiner Familie, deshalb möchte ich ein Zimmer reservieren. Haben Sie ein freies Zimmer für drei Personen? Ich suche ein Doppelzimmer mit Balkon, Dusche und Bergblick. Könnten Sie mir bitte die Preise und die zusätzlichen Leistungen schicken? Ich freue mich auf Ihre Antwort.
Mit freundlichen Grüßen
Reuben Lamptey`,
  });

  assert.match(result.feedback, /Your letter has a clear structure, an appropriate greeting, and a polite closing/);
  assert.match(result.feedback, /breakfast, parking, cancellation conditions, and other hotel services/);
  assert.doesNotMatch(result.feedback, /add one more clear detail to "Ich freue mich auf Ihre Antwort/);
});

test("A1-4 deterministic checker continues restarted numbering across objective sections", () => {
  const result = checkDeterministicObjectiveAnswers({
    referenceEntry: {
      assignmentKey: "A1-4",
      level: "A1",
      format: "objective",
      answers: {
        Answer1: "C) Neun",
        Answer2: "B) Polnisch",
        Answer3: "D) Niederländisch",
        Answer4: "A) Deutsch",
        Answer5: "C) Paris",
        Answer6: "B) Amsterdam",
        Answer7: "C) In der Schweiz",
        Answer8: "C) In Italien und Frankreich",
        Answer9: "C) Rom",
        Answer10: "B) Das Essen",
        Answer11: "B) Paris",
        Answer12: "A) Nach Spanien",
      },
    },
    submissionText: `TEIL1
1. Ich komme aus Deutschland. Ich spreche Deutsch.
2. Sie kommt aus Frankreich. Sie spricht Französisch.
3. Sie kommen aus Russland. Sie sprechen Russisch.
4. Wir kommen aus Japan. Wir sprechen Japanisch.
5. Er kommt aus England. Er spricht Englisch.

TEIL2:
1C , 2B, 3D, 4A, 5C, 6B, 7C

TEIL3:
1C
2C
3
4B
5- Barcelona oder Madrid`,
  });

  assert.equal(result.objectiveTotal, 12);
  assert.equal(result.objectiveCorrect, 10);
  assert.equal(result.objectiveScore, 83);
  assert.deepEqual(result.wrongAnswers.map(({ question, expected, student }) => ({ question, expected, student })), [
    { question: 12, expected: "A", student: "Barcelona oder Madrid" },
    { question: 10, expected: "B", student: "" },
  ]);
});

test("flat objective keys align a Teil 2-only submission without treating 10 Euro as question 10", () => {
  const result = checkDeterministicObjectiveAnswers({
    referenceEntry: {
      assignmentKey: "A1-shopping-partial",
      level: "A1",
      format: "objective",
      answers: {
        Answer1: "Falsch", Answer2: "Wahr", Answer3: "Falsch", Answer4: "Wahr", Answer5: "Wahr",
        Answer6: "Falsch", Answer7: "Wahr", Answer8: "Falsch", Answer9: "Falsch", Answer10: "Falsch",
        Answer11: "B) Einmal pro Woche", Answer12: "C) Apfel und Bananen", Answer13: "A) Ein halbes Kilo",
        Answer14: "B) 10 Euro", Answer15: "B) Einen schönen Tag",
      },
    },
    submissionText: `Teil 2.
1. B: Jede woche
2. C: Äpfel und Bananen
3. B: Ein kilo
4. B: 10 euro
5. B: Einen schönen Tag`,
  });

  assert.equal(result.objectiveTotal, 15);
  assert.equal(result.objectiveCorrect, 4);
  assert.deepEqual(result.parts[0].result.correct.map(({ question }) => question), [11, 12, 14, 15]);
  assert.deepEqual(
    [...result.parts[0].result.wrong, ...result.parts[0].result.needsReview].map(({ question }) => question),
    [13],
  );
  assert.deepEqual(result.parts[0].result.missing.map(({ question }) => question), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});
