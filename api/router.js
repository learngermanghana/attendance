import { Buffer } from "node:buffer";
import socialMetricsHandler from "./social-metrics.js";
import studentResultsSheetUpsertHandler from "./student-results-sheet-upsert.js";
import { autoMarkSubmission } from "../src/utils/autoMarking.js";

const OBJECTIVE_WEIGHT = 0.5;
const WRITING_WEIGHT = 0.5;
// Matching exercises can use more than the usual A–F multiple-choice range.
// Keep X for "no matching option", which is used by some Goethe exercises.
const OBJECTIVE_OPTION_LETTERS = "ABCDEFGHIJX";
const VALID_PART_IDS = new Set(["main", "teil1", "teil2", "teil3", "teil4"]);

const FALOWEN_FUNCTION_BASE_URL =
  process.env.FALOWEN_FUNCTION_BASE_URL ||
  "https://us-central1-falowen-examiner-trainer.cloudfunctions.net/api";

const ANSWER_KEY_MANIFEST_URL =
  process.env.FALOWEN_ANSWER_KEY_MANIFEST_URL ||
  "https://raw.githubusercontent.com/learngermanghana/falowenadmin/main/src/data/answers_dictionary.json";

let answerKeyManifestCache = null;
let answerKeyManifestCacheTime = 0;
const ANSWER_KEY_MANIFEST_CACHE_MS = 5 * 60 * 1000;

async function ensureJsonBody(req) {
  if (req.body !== undefined) return req.body;

  if (req.method === "GET" || req.method === "HEAD") {
    req.body = undefined;
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  if (!rawBody) {
    req.body = {};
    return req.body;
  }

  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  req.body = contentType.includes("application/json") ? JSON.parse(rawBody) : rawBody;
  return req.body;
}

function normalizeForCompare(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeRegistryId(value) {
  return String(value || "")
    .trim()
    .replace(/[/#?[\]]+/g, "_")
    .replace(/_{2,}/g, "_");
}

function inferLevelFromAssignment(value = "") {
  const match = String(value || "").match(/\b(A1|A2|B1)\b/i);
  return match ? match[1].toUpperCase() : "";
}

function inferPartId(value = "") {
  const normalized = normalizeForCompare(value).replace(/\s+/g, "");
  if (/teil(?:2|zwei)|part(?:2|two)|schreiben|writing/.test(normalized)) return "teil2";
  if (/teil(?:3|drei)|part(?:3|three)|lesen|reading/.test(normalized)) return "teil3";
  if (/teil(?:4|vier)|part(?:4|four)|audio|horen|hoeren|listening/.test(normalized)) return "teil4";
  if (/teil(?:1|eins)|part(?:1|one)/.test(normalized)) return "teil1";
  if (/main|flat/.test(normalized)) return "main";
  return "unknown";
}

function normalizeExpectedPartId(value = "") {
  const raw = String(value || "").trim().toLowerCase();
  if (VALID_PART_IDS.has(raw)) return raw;
  const inferred = inferPartId(raw);
  return VALID_PART_IDS.has(inferred) ? inferred : "";
}

function normalizeExpectedParts(value, parts = {}) {
  const explicit = Array.isArray(value)
    ? value.map(normalizeExpectedPartId).filter(Boolean)
    : [];
  if (explicit.length) return [...new Set(explicit)];

  const fromParts = Object.keys(parts || {}).filter((partId) => VALID_PART_IDS.has(partId));
  return fromParts.length ? fromParts : ["main"];
}

function inferQuestionNumber(key = "", fallbackIndex = 0, value = "") {
  const fromValue = String(value || "").match(/(?:frage|answer|antwort|aufgabe|task|exercise|nr\.?|q)\s*(\d{1,3})\b/i);
  if (fromValue?.[1]) return fromValue[1];

  const fromKey = String(key || "").match(/(\d{1,3})/);
  if (fromKey?.[1]) return fromKey[1];

  return String(fallbackIndex + 1);
}

function stripLeadingQuestionLabel(value = "") {
  return String(value || "")
    .replace(/^\s*(?:frage|answer|antwort|aufgabe|task|exercise|nr\.?|q)\s*\d{1,3}\s*[).:-]?\s*/i, "")
    .replace(/^\s*anzeige\s*:\s*/i, "Anzeige ")
    .trim();
}

function extractOptionLetter(value = "") {
  const cleaned = stripLeadingQuestionLabel(value);
  const match = cleaned.match(new RegExp(`^([${OBJECTIVE_OPTION_LETTERS}])(?:\\s*[().:/-]|\\s+|$)`, "i"));
  return match ? match[1].toUpperCase() : "";
}

function extractOptionText(value = "") {
  return stripLeadingQuestionLabel(value)
    .replace(new RegExp(`^\\s*[${OBJECTIVE_OPTION_LETTERS}](?:\\s*[().:/-]|\\s+)\\s*`, "i"), "")
    .trim();
}

function parseLetterAndText(value = "") {
  const cleaned = stripLeadingQuestionLabel(value);
  const optionMatch = cleaned.match(new RegExp(`^([${OBJECTIVE_OPTION_LETTERS}])\\s*[).:-]?\\s+(.+)$`, "i"))
    || cleaned.match(new RegExp(`^([${OBJECTIVE_OPTION_LETTERS}])\\s*[).:-]?$`, "i"));

  if (optionMatch) {
    return {
      correctLetter: optionMatch[1].toUpperCase(),
      correctText: String(optionMatch[2] || "").trim(),
    };
  }

  const anzeigeMatch = cleaned.match(/^Anzeige\s+([A-Z])$/i);
  if (anzeigeMatch) {
    return {
      correctLetter: anzeigeMatch[1].toUpperCase(),
      correctText: `Anzeige ${anzeigeMatch[1].toUpperCase()}`,
    };
  }

  const booleanMap = {
    true: "Richtig",
    false: "Falsch",
    richtig: "Richtig",
    falsch: "Falsch",
    wahr: "Wahr",
    yes: "Ja",
    no: "Nein",
    ja: "Ja",
    nein: "Nein",
  };
  const booleanKey = cleaned.toLowerCase();
  if (booleanMap[booleanKey]) {
    return {
      correctLetter: ["false", "falsch", "no", "nein"].includes(booleanKey) ? "F" : "R",
      correctText: booleanMap[booleanKey],
    };
  }

  return { correctLetter: "", correctText: cleaned };
}

function uniq(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function normalizeReferenceAnswerEntry(key, value, index = 0) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const rawCorrectAnswer = String(value.rawCorrectAnswer || value.raw || value.correctText || value.correctLetter || "").trim();
    const parsed = parseLetterAndText(rawCorrectAnswer || value.correctText || value.correctLetter || "");
    const correctLetter = String(value.correctLetter || parsed.correctLetter || "").toUpperCase();
    const correctText = String(value.correctText || parsed.correctText || "").trim();
    const questionNumber = String(value.questionNumber || inferQuestionNumber(key, index, rawCorrectAnswer));

    return {
      questionKey: String(key || value.questionKey || `Answer${index + 1}`),
      questionNumber,
      rawCorrectAnswer,
      raw: rawCorrectAnswer,
      correctLetter,
      correctText,
      acceptedAnswers: uniq([
        correctLetter,
        correctText,
        correctLetter && correctText ? `${correctLetter} ${correctText}` : "",
        correctLetter && correctText ? `${correctLetter}) ${correctText}` : "",
        rawCorrectAnswer.replace(/[)_:.-]+/g, " ").replace(/\s+/g, " "),
        ...(Array.isArray(value.acceptedAnswers) ? value.acceptedAnswers : []),
      ]),
    };
  }

  const rawCorrectAnswer = String(value ?? "").trim();
  const questionKey = String(key || `Answer${index + 1}`);
  const questionNumber = inferQuestionNumber(questionKey, index, rawCorrectAnswer);
  const { correctLetter, correctText } = parseLetterAndText(rawCorrectAnswer);

  return {
    questionKey,
    questionNumber,
    rawCorrectAnswer,
    raw: rawCorrectAnswer,
    correctLetter,
    correctText,
    acceptedAnswers: uniq([
      correctLetter,
      correctText,
      correctLetter && correctText ? `${correctLetter} ${correctText}` : "",
      correctLetter && correctText ? `${correctLetter}) ${correctText}` : "",
      rawCorrectAnswer.replace(/[)_:.-]+/g, " ").replace(/\s+/g, " "),
    ]),
  };
}

function isPlaceholderReferenceValue(value = "") {
  return /^(read|see|check) (the )?(comment|comments|instructions?)( for (the )?answers?)?$/.test(String(value || "").trim().toLowerCase());
}

function flattenPlainAnswers(value, prefix = []) {
  if (Array.isArray(value)) {
    return value.flatMap((nested, index) => flattenPlainAnswers(nested, [...prefix, String(index + 1)]));
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    if (typeof value === "string" && isPlaceholderReferenceValue(value)) return [];
    return [{ key: prefix.join(".") || `Answer${prefix[prefix.length - 1] || 1}`, value: String(value) }];
  }

  if (!value || typeof value !== "object") return [];

  const isLeaf = Boolean(value.correctLetter || value.correctText || value.rawCorrectAnswer || value.raw || value.acceptedAnswers);
  if (isLeaf) {
    return [{ key: prefix.join(".") || value.questionKey || `Answer${value.questionNumber || 1}`, value }];
  }

  return Object.entries(value).flatMap(([key, nested]) => flattenPlainAnswers(nested, [...prefix, key]));
}

function normalizePart(partId, answers = {}) {
  const entries = flattenPlainAnswers(answers).map((entry, index) => normalizeReferenceAnswerEntry(entry.key, entry.value, index));
  return {
    partId,
    answers: entries,
    answerCount: entries.length,
  };
}

function splitAnswersIntoParts(answers = {}) {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return { main: normalizePart("main", answers) };
  }

  const entries = Object.entries(answers || {});
  const answerKeyPattern = /^(?:answer|antwort|frage|aufgabe|task|exercise|question|q|nr\.?)?[\s_-]*\d{1,3}$/i;
  const partIdPattern = /teil\s*[1-4]|part\s*[1-4]|lesen|h[oö]ren|hoeren|schreiben|writing|reading|listening/i;
  const looksFlat = !entries.length || entries.every(([key, nested]) => answerKeyPattern.test(key) && (["string", "number", "boolean"].includes(typeof nested) || nested == null || (nested && typeof nested === "object" && !Array.isArray(nested) && (nested.correctLetter || nested.correctText || nested.rawCorrectAnswer || nested.raw))));

  if (looksFlat) return { main: normalizePart("main", answers) };

  const explicitPartKeys = Object.keys(answers).filter((key) => partIdPattern.test(key));
  if (explicitPartKeys.length) {
    return explicitPartKeys.reduce((parts, key) => {
      const partId = inferPartId(key);
      parts[partId] = normalizePart(partId, answers[key]);
      return parts;
    }, {});
  }

  return { main: normalizePart("main", answers) };
}

function countPartAnswers(parts = {}) {
  return Object.values(parts).reduce((sum, part) => sum + Number(part?.answerCount || part?.answers?.length || 0), 0);
}

function normalizeManifestEntry(sourceKey, sourceEntry = {}) {
  const assignmentKey = String(sourceEntry.assignment_id || sourceEntry.assignmentId || sourceEntry.assignmentKey || "").trim();
  const title = String(sourceEntry.title || sourceEntry.assignment || sourceKey || assignmentKey).trim();
  const level = inferLevelFromAssignment(assignmentKey) || String(sourceEntry.level || "").toUpperCase();
  const format = String(sourceEntry.format || "objective").toLowerCase();
  const rawAnswers = sourceEntry.answers || {};
  const parts = splitAnswersIntoParts(rawAnswers);
  const totalAnswers = countPartAnswers(parts);
  const expectedParts = normalizeExpectedParts(sourceEntry.expectedParts || sourceEntry.expected_parts, parts);
  const writingParts = normalizeExpectedParts(sourceEntry.writingParts || sourceEntry.writing_parts, {})
    .filter((partId) => format === "writing" || partId !== "main");
  const referenceAnswerParts = normalizeExpectedParts(sourceEntry.referenceAnswerParts || sourceEntry.reference_answer_parts, {})
    .filter((partId) => !writingParts.includes(partId) && totalAnswers > 0);

  return {
    assignmentKey,
    title,
    level,
    format,
    answerUrl: sourceEntry.answerUrl || sourceEntry.answer_url || "",
    sheetUrl: sourceEntry.sheetUrl || sourceEntry.sheet_url || "",
    rawAnswers,
    parts,
    expectedParts,
    writingParts,
    aiGradedParts: normalizeExpectedParts(sourceEntry.aiGradedParts || sourceEntry.ai_graded_parts, writingParts),
    referenceAnswerParts,
    answerLayout: sourceEntry.answerLayout || sourceEntry.answer_layout || (expectedParts.includes("main") ? "flat" : "parts"),
    totalAnswers,
    source: "github-answer-manifest",
  };
}

function readPayloadAssignmentKey(payload = {}) {
  const submission = payload.submission || {};
  return String(
    payload.assignmentKey ||
      payload.referenceEntry?.assignmentKey ||
      payload.referenceEntry?.assignment_id ||
      submission.assignmentKey ||
      submission.assignment_key ||
      submission.assignmentId ||
      submission.assignment_id ||
      submission.canonicalAssignmentKey ||
      submission.assignment ||
      "",
  ).trim();
}

async function loadAnswerKeyManifest() {
  const now = Date.now();
  if (answerKeyManifestCache && now - answerKeyManifestCacheTime < ANSWER_KEY_MANIFEST_CACHE_MS) {
    return answerKeyManifestCache;
  }

  const response = await fetch(ANSWER_KEY_MANIFEST_URL, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Failed to load answer key manifest (${response.status})`);

  const manifest = await response.json();
  answerKeyManifestCache = manifest;
  answerKeyManifestCacheTime = now;
  return manifest;
}

async function findManifestEntryForAssignment(assignmentKey = "") {
  const safeKey = safeRegistryId(assignmentKey);
  if (!safeKey) return null;

  const manifest = await loadAnswerKeyManifest();
  for (const [sourceKey, sourceEntry] of Object.entries(manifest || {})) {
    const normalized = normalizeManifestEntry(sourceKey, sourceEntry);
    if (safeRegistryId(normalized.assignmentKey) === safeKey && normalized.totalAnswers > 0) return normalized;
  }

  return null;
}

function splitSubmissionIntoParts(submissionText = "") {
  const text = String(submissionText || "").trim();
  if (!text) return [{ partId: "main", title: "Main", text: "", confidence: 0 }];

  const markerRegex = /(?:^|\n)\s*((?:teil|part)\s*(?:[1-4]|eins|zwei|drei|vier|one|two|three|four)\b[^\n]*|(?:schreiben|lesen|h[oö]ren|hoeren|writing|reading|listening)\b[^\n]*)\s*:?\s*(?=\n|$)/gi;
  const markers = [];
  let match;

  while ((match = markerRegex.exec(text))) {
    markers.push({ index: match.index, end: markerRegex.lastIndex, title: match[1].trim(), partId: inferPartId(match[1]) });
  }

  if (!markers.length) return [{ partId: "main", title: "Main", text, confidence: 0.7 }];

  const parts = [];
  const leadingText = text.slice(0, markers[0].index).trim();
  if (leadingText) parts.push({ partId: "main", title: "Unlabelled", text: leadingText, confidence: 0.55 });

  markers.forEach((marker, index) => {
    const next = markers[index + 1];
    const partText = text.slice(marker.end, next ? next.index : text.length).trim();
    if (partText || marker.partId !== "unknown") {
      parts.push({ partId: marker.partId === "unknown" ? "main" : marker.partId, title: marker.title, text: partText, confidence: 0.9 });
    }
  });

  return parts.filter((part) => part.text || part.partId !== "main");
}

function splitObjectiveAnswerTokens(text = "") {
  return String(text || "")
    .split(/\r?\n/)
    .flatMap((line) => line.split(/[,;]+/))
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeBooleanAnswer(value = "") {
  const normalized = normalizeForCompare(value);
  if (["true", "r", "richtig", "wahr", "yes", "ja"].includes(normalized)) return "R";
  if (["false", "f", "falsch", "nein", "no"].includes(normalized)) return "F";
  return "";
}

function parseStudentAnswerToken(token = "", pendingQuestion = null) {
  const trimmed = String(token || "").trim();
  if (!trimmed) return null;

  const headingOnly = trimmed.match(/^(?:answer|antwort|frage|question|aufgabe|task|exercise|nr\.?|q)\s*(\d{1,3})\s*[).:-]?$/i);
  if (headingOnly) return { pendingQuestion: Number.parseInt(headingOnly[1], 10) };

  const compactOption = trimmed.match(new RegExp(`^(?:answer|antwort|frage|question|aufgabe|task|exercise|nr\\.?|q)?\\s*(\\d{1,3})\\s*(?:anzeige\\s*)?([${OBJECTIVE_OPTION_LETTERS}])\\s*$`, "i"));
  if (compactOption) {
    return { question: Number.parseInt(compactOption[1], 10), answer: compactOption[2].toUpperCase() };
  }

  const numbered = trimmed.match(/^(?:answer|antwort|frage|question|aufgabe|task|exercise|nr\.?|q)?\s*(\d{1,3})\s*[).:–-]?\s*(.+)$/i);
  if (numbered) {
    const answer = numbered[2].trim().replace(/^anzeige\s*[).:-]?\s*/i, "");
    return { question: Number.parseInt(numbered[1], 10), answer };
  }

  const booleanAnswer = normalizeBooleanAnswer(trimmed);
  if (booleanAnswer) return { question: pendingQuestion, answer: booleanAnswer, consumePending: Boolean(pendingQuestion) };

  const unnumberedOption = trimmed.match(new RegExp(`^([${OBJECTIVE_OPTION_LETTERS}])(?:\\s*[).:-]|\\s+|$)(.*)$`, "i"));
  if (unnumberedOption) {
    const suffix = String(unnumberedOption[2] || "").trim();
    return {
      question: pendingQuestion,
      answer: suffix ? `${unnumberedOption[1].toUpperCase()}) ${suffix}` : unnumberedOption[1].toUpperCase(),
      consumePending: Boolean(pendingQuestion),
    };
  }

  if (pendingQuestion) return { question: pendingQuestion, answer: trimmed, consumePending: true };
  return null;
}

function parseStudentPartAnswers(text = "") {
  const map = new Map();
  let pendingQuestion = null;
  let orderedQuestion = 0;

  for (const token of splitObjectiveAnswerTokens(text)) {
    const parsed = parseStudentAnswerToken(token, pendingQuestion);
    if (!parsed) continue;

    if (parsed.pendingQuestion) {
      pendingQuestion = parsed.pendingQuestion;
      orderedQuestion = Math.max(orderedQuestion, pendingQuestion);
      continue;
    }

    let question = parsed.question;
    if (!question) {
      orderedQuestion += 1;
      question = orderedQuestion;
    }

    map.set(question, parsed.answer);
    orderedQuestion = Math.max(orderedQuestion, question);
    if (parsed.consumePending) pendingQuestion = null;
  }

  return {
    map,
    ordered: [...map.entries()].sort((left, right) => left[0] - right[0]).map(([question, answer]) => ({ question, answer })),
    answerCount: map.size,
  };
}

function levenshteinDistance(a = "", b = "") {
  const left = String(a);
  const right = String(b);
  if (!left) return right.length;
  if (!right) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 0; i < left.length; i += 1) {
    const current = [i + 1];
    for (let j = 0; j < right.length; j += 1) {
      current[j + 1] = left[i] === right[j]
        ? previous[j]
        : Math.min(previous[j] + 1, current[j] + 1, previous[j + 1] + 1);
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

function stripGermanStem(value = "") {
  return normalizeForCompare(value).replace(/(en|ern|er|em|es|e|n|s)$/i, "");
}

function textMatches(expectedTextRaw, studentTextRaw) {
  const expectedText = normalizeForCompare(expectedTextRaw);
  const studentText = normalizeForCompare(studentTextRaw);
  if (!expectedText || !studentText) return false;
  if (expectedText === studentText) return true;
  if (expectedText.includes(studentText) || studentText.includes(expectedText)) return true;

  const expectedStem = stripGermanStem(expectedText);
  const studentStem = stripGermanStem(studentText);
  if (expectedStem.length >= 4 && studentStem.length >= 4 && (expectedStem.includes(studentStem) || studentStem.includes(expectedStem))) return true;

  const maxLength = Math.max(expectedText.length, studentText.length);
  const distance = levenshteinDistance(expectedText, studentText);
  return maxLength >= 5 && distance <= Math.max(1, Math.floor(maxLength * 0.25));
}

function valueMatches(expectedEntry = {}, studentRaw = "") {
  const student = String(studentRaw || "").trim();
  if (!student) return { status: "wrong" };

  const expectedLetter = String(expectedEntry.correctLetter || "").toUpperCase();
  const expectedText = expectedEntry.correctText || extractOptionText(expectedEntry.rawCorrectAnswer || expectedEntry.raw || "");
  const studentLetter = extractOptionLetter(student);
  const studentText = extractOptionText(student) || student;
  const booleanAnswer = normalizeBooleanAnswer(student);

  if (expectedLetter && (studentLetter || booleanAnswer)) {
    const submittedLetter = studentLetter || booleanAnswer;
    if (submittedLetter === expectedLetter) return { status: "correct", reason: "Correct option letter" };
    if (expectedText && textMatches(expectedText, studentText)) return { status: "needs_review", reason: "Conflicting option letter and answer text" };
    return { status: "wrong" };
  }

  if (expectedText && textMatches(expectedText, studentText)) return { status: "correct", reason: "Correct answer text" };

  const acceptedMatch = (expectedEntry.acceptedAnswers || []).some((answer) => {
    const accepted = String(answer || "").trim();
    if (!accepted || normalizeForCompare(accepted) === normalizeForCompare(expectedLetter)) return false;
    return textMatches(accepted, student);
  });

  if (acceptedMatch) return { status: "correct", reason: "Accepted answer text" };
  return { status: "wrong" };
}

function formatExpectedDisplay(entry = {}) {
  const letter = String(entry.correctLetter || "").toUpperCase();
  const text = String(entry.correctText || "").trim();
  if (letter && text) return `${letter}) ${text}`;
  return letter || text || String(entry.rawCorrectAnswer || entry.raw || "").trim();
}

function primaryExpectedValue(entry = {}) {
  return String(entry.correctLetter || entry.correctText || entry.rawCorrectAnswer || entry.raw || "").trim().toUpperCase();
}

function scoreEntriesWithAnswers(entries = [], studentAnswers = [], partId = "main") {
  const correct = [];
  const wrong = [];
  const missing = [];
  const needsReview = [];

  entries.forEach((entry, index) => {
    const question = Number.parseInt(entry.questionNumber, 10) || index + 1;
    const studentRaw = String(studentAnswers[index] ?? "").trim();
    const item = {
      partId,
      question,
      expected: primaryExpectedValue(entry),
      expectedDisplay: formatExpectedDisplay(entry),
      student: studentRaw,
      submitted: studentRaw,
    };

    if (!studentRaw) {
      missing.push(item);
      return;
    }

    const match = valueMatches(entry, studentRaw);
    if (match.status === "correct") correct.push({ ...item, reason: match.reason });
    else if (match.status === "needs_review") needsReview.push({ ...item, reason: match.reason });
    else wrong.push(item);
  });

  const total = entries.length;
  const percentage = total ? Math.round((correct.length / total) * 100) : 0;
  return {
    correct,
    wrong,
    missing,
    needsReview,
    score: correct.length,
    total,
    percentage,
    status: needsReview.length ? "needs_review" : "marked",
    feedback: `Objective score: ${correct.length}/${total} correct (${percentage}%).`,
    confidence: needsReview.length ? 0.55 : missing.length === total ? 0.45 : 0.95,
  };
}

function alignRestartedAnswerGroups(entries = [], groups = []) {
  if (!groups.length || !entries.length) return [];
  if (groups.length === 1 && groups[0].length >= entries.length) return [];
  let candidates = [{ answers: Array(entries.length).fill(""), nextStart: 0 }];
  for (const group of groups) {
    const ordered = [...group].sort((left, right) => left.question - right.question);
    const nextCandidates = [];
    for (const candidate of candidates) {
      const lastStart = entries.length - ordered.length;
      for (let start = candidate.nextStart; start <= lastStart; start += 1) {
        const answers = [...candidate.answers];
        ordered.forEach((item, index) => { answers[start + index] = item.answer; });
        const preview = scoreEntriesWithAnswers(entries, answers, "main");
        nextCandidates.push({ answers, nextStart: start + ordered.length, correct: preview.correct.length, missing: preview.missing.length, wrong: preview.wrong.length + preview.needsReview.length });
      }
    }
    candidates = nextCandidates
      .sort((left, right) => right.correct - left.correct || left.missing - right.missing || left.wrong - right.wrong)
      .slice(0, 40);
  }
  return candidates[0]?.answers || [];
}

function chooseBestFlatStudentAnswers(entries = [], sections = []) {
  const parsedSections = sections
    .map((section) => ({ ...section, parsed: parseStudentPartAnswers(section.text) }))
    .filter((section) => section.parsed.answerCount > 0);

  if (!parsedSections.length) return [];

  const candidates = [];
  for (let start = 0; start < parsedSections.length; start += 1) {
    const answers = parsedSections.slice(start).flatMap((section) => section.parsed.ordered.map((item) => item.answer));
    const preview = scoreEntriesWithAnswers(entries, answers.slice(0, entries.length), "main");
    candidates.push({ answers, correct: preview.correct.length, missing: preview.missing.length, wrong: preview.wrong.length + preview.needsReview.length });
  }
  const restartedGroups = String(sections.map((section) => section.text).join("\n\n"))
    .split(/\n\s*\n+/)
    .map((block) => parseStudentPartAnswers(block).ordered)
    .filter((group) => group.length);
  const aligned = alignRestartedAnswerGroups(entries, restartedGroups);
  if (aligned.length) {
    const preview = scoreEntriesWithAnswers(entries, aligned, "main");
    candidates.push({ answers: aligned, correct: preview.correct.length, missing: preview.missing.length, wrong: preview.wrong.length + preview.needsReview.length });
  }

  candidates.sort((a, b) => b.correct - a.correct || a.missing - b.missing || a.wrong - b.wrong);
  return candidates[0]?.answers || [];
}

function normalizeReferenceEntry(referenceEntry = {}) {
  const rawParts = referenceEntry.parts && Object.keys(referenceEntry.parts || {}).length
    ? Object.entries(referenceEntry.parts).reduce((parts, [key, part]) => {
        const partId = inferPartId(key) || key;
        if (partId === "teil2") return parts;
        parts[partId] = normalizePart(partId, part?.answers || part);
        return parts;
      }, {})
    : splitAnswersIntoParts(referenceEntry.answers || referenceEntry.answerKeys || referenceEntry.key || {});

  const parts = Object.fromEntries(Object.entries(rawParts).filter(([, part]) => Number(part?.answerCount || 0) > 0));
  const expectedParts = normalizeExpectedParts(referenceEntry.expectedParts || referenceEntry.expected_parts, parts);

  return {
    ...referenceEntry,
    format: String(referenceEntry.format || "").toLowerCase(),
    parts,
    expectedParts,
    totalAnswers: countPartAnswers(parts),
  };
}

function objectiveMarkerForRouter(referenceEntry = {}, submissionText = "") {
  const normalizedReference = normalizeReferenceEntry(referenceEntry);
  const sections = splitSubmissionIntoParts(submissionText);
  const markedParts = [];

  for (const [partId, part] of Object.entries(normalizedReference.parts || {})) {
    const entries = part.answers || [];
    if (!entries.length || partId === "teil2") continue;

    let result;
    if (partId === "main") {
      const answers = chooseBestFlatStudentAnswers(entries, sections);
      result = scoreEntriesWithAnswers(entries, answers.slice(0, entries.length), "main");
    } else {
      const matchingText = sections
        .filter((section) => section.partId === partId)
        .map((section) => section.text)
        .join("\n");
      const parsed = parseStudentPartAnswers(matchingText || submissionText);
      const answers = entries.map((entry, index) => {
        const question = Number.parseInt(entry.questionNumber, 10) || index + 1;
        return parsed.map.get(question) || "";
      });
      result = scoreEntriesWithAnswers(entries, answers, partId);
    }

    markedParts.push({ partId, partType: "objective", result });
  }

  if (!markedParts.length) return null;

  const objectiveCorrect = markedParts.reduce((sum, part) => sum + part.result.correct.length, 0);
  const objectiveTotal = markedParts.reduce((sum, part) => sum + part.result.total, 0);
  if (!objectiveTotal) return null;

  const wrongAnswers = markedParts.flatMap((part) => [...part.result.wrong, ...part.result.missing, ...part.result.needsReview].map((item) => ({
    partId: part.partId,
    question: item.question,
    expected: item.expected,
    expectedDisplay: item.expectedDisplay,
    student: item.student || item.submitted || "",
    ...(item.reason ? { reason: item.reason } : {}),
  })));

  return {
    objectiveScore: Math.round((objectiveCorrect / objectiveTotal) * 100),
    objectiveCorrect,
    objectiveTotal,
    wrongAnswers,
    detectedParts: markedParts.map((part) => {
      const base = { partId: part.partId, partType: "objective", correct: part.result.correct.length, total: part.result.total };
      if (part.partId === "main") return base;
      const wrong = part.result.wrong.length + part.result.missing.length + part.result.needsReview.length;
      return { ...base, answerCount: part.result.total, wrong, summary: `${part.partId}: ${part.result.total} objective answers found, ${part.result.correct.length} correct, ${wrong} wrong` };
    }),
    parts: markedParts,
    confidence: Math.min(...markedParts.map((part) => part.result.confidence || 0.95)),
  };
}

async function hydrateMarkingPayloadWithManifest(req, path) {
  if (req.method !== "POST" || path !== "marking/ai") return;
  let payload = req.body && typeof req.body === "object" ? req.body : {};

  if (!(payload.referenceEntry?.parts && Object.keys(payload.referenceEntry.parts || {}).length)) {
    const assignmentKey = readPayloadAssignmentKey(payload);
    if (assignmentKey) {
      try {
        const manifestEntry = await findManifestEntryForAssignment(assignmentKey);
        if (manifestEntry) {
          payload = {
            ...payload,
            assignmentKey: manifestEntry.assignmentKey,
            level: payload.level || manifestEntry.level,
            referenceEntry: manifestEntry,
          };
        }
      } catch (error) {
        console.error("Answer key manifest fallback failed:", error);
      }
    }
  }

  const submissionText = payload.submissionText || payload.submission?.text || "";
  const objective = objectiveMarkerForRouter(payload.referenceEntry || {}, submissionText);
  req.body = {
    ...payload,
    objectiveFeedbackContext: objective?.objectiveTotal ? {
      correct: objective.objectiveCorrect,
      total: objective.objectiveTotal,
      score: objective.objectiveScore,
      wrongAnswers: objective.wrongAnswers,
    } : null,
  };
}

function stripBoldMarkdown(value = "") {
  return String(value || "").replace(/\*\*/g, "");
}

function formatAnswerForFeedback(value = "", fallback = "blank") {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  const safe = normalized || fallback;
  return `"${safe.length > 70 ? `${safe.slice(0, 67)}...` : safe}"`;
}

function formatObjectiveMistake(item = {}, index = 0) {
  const label = item.partId && item.partId !== "main" ? `${item.partId} question ${item.question}` : `Question ${item.question}`;
  const submitted = formatAnswerForFeedback(item.student || item.submitted || "", "blank");
  const expected = item.expectedDisplay || item.expected || "the correct answer";
  const reason = item.reason ? `\n   - Note: ${item.reason}` : "";
  const compactLabel = label.replace(/\bquestion\s+/i, "");
  const compactExpected = String(expected || "").match(/^[A-FX]\b/i)?.[0]?.toUpperCase() || expected;
  return `${index + 1}. ${label}\n   - ${compactLabel}: Your answer was ${submitted}; correct answer is "${compactExpected}"\n   - Your answer: ${submitted}\n   - Correct: ${expected}${reason}`;
}

function buildObjectiveFeedback({ name = "Student", correct = 0, total = 0, wrongAnswers = [] } = {}) {
  const firstName = String(name || "Student").trim().split(/\s+/)[0] || "Student";
  const percent = total > 0 ? Math.round((Number(correct || 0) / Number(total)) * 100) : 0;
  const details = wrongAnswers.slice(0, 8).map(formatObjectiveMistake);
  const extraCount = Math.max(0, wrongAnswers.length - details.length);

  return [
    "📌 Marking summary",
    percent === 100 ? `Excellent work, ${firstName}.` : `Good effort, ${firstName}.`,
    "",
    "📊 Score",
    `- Objective score: ${correct}/${total} correct (${percent}%)`,
    "",
    details.length
      ? ["🛠 Corrections to review", ...details, extraCount ? `...and ${extraCount} more answer(s).` : ""].filter(Boolean).join("\n")
      : "✅ All objective answers were correct.",
    "",
    details.length
      ? "Next step: Review only the correction list above, then compare your answer with the full correct answer."
      : "Next step: Continue to the next task.",
  ].join("\n");
}

function writingFeedbackFromResult(result = {}) {
  const partFeedback = (Array.isArray(result.parts) ? result.parts : [])
    .filter((part) => part?.partType === "writing" || part?.partId === "teil2")
    .map((part) => part?.result?.feedback || part?.feedback)
    .filter(Boolean)
    .join("\n");
  return partFeedback || result.feedback || "";
}

function hasWritingPart(result = {}) {
  return Array.isArray(result.parts) && result.parts.some((part) => part?.partType === "writing" || part?.partId === "teil2");
}

function isFlatObjectiveOnly(referenceEntry = {}) {
  const normalized = normalizeReferenceEntry(referenceEntry);
  const partIds = Object.keys(normalized.parts || {});
  return String(referenceEntry.format || "").toLowerCase() === "objective" && partIds.length === 1 && partIds[0] === "main";
}

function shouldMarkWriting(payload = {}) {
  const referenceEntry = payload.referenceEntry || {};
  const submissionText = payload.submissionText || payload.submission?.text || "";
  if (isFlatObjectiveOnly(referenceEntry)) return false;
  return /(teil\s*2|part\s*2|schreiben|writing)/i.test(submissionText);
}

function buildSupplementalWritingResult(payload = {}) {
  const submissionText = payload.submissionText || payload.submission?.text || "";
  if (!submissionText || !shouldMarkWriting(payload)) return null;

  try {
    const marked = autoMarkSubmission({
      referenceEntry: payload.referenceEntry || {},
      submission: {
        ...(payload.submission || {}),
        assignmentKey: payload.assignmentKey || payload.referenceEntry?.assignmentKey || payload.submission?.assignmentKey,
        level: payload.level || payload.referenceEntry?.level || payload.submission?.level,
      },
      submissionText,
    });

    const writingParts = (marked.parts || []).filter((part) => part.partType === "writing");
    if (!writingParts.length) return null;

    return {
      writingScore: marked.writingScore,
      writingParts,
      writingFeedback: writingParts.map((part) => part.result?.feedback).filter(Boolean).join("\n"),
      writingImprovementSummary: writingParts.map((part) => part.result?.improvementSummary).filter(Boolean).join("\n"),
      confidence: marked.confidence,
    };
  } catch (error) {
    console.error("Supplemental writing mark failed:", error);
    return null;
  }
}

function normalizeScoreCandidate(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return null;
  return Math.max(0, Math.min(100, Math.round(numberValue)));
}

function writingScoreFromParts(parts = []) {
  const scores = (Array.isArray(parts) ? parts : [])
    .filter((part) => part?.partType === "writing" || part?.partId === "teil2")
    .map((part) => normalizeScoreCandidate(part?.result?.score ?? part?.result?.writingScore ?? part?.score ?? part?.writingScore))
    .filter((score) => score !== null);

  if (!scores.length) return null;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function resolveWritingScore(existingResult = {}, supplementalWriting = null, allowExistingWriting = true) {
  if (allowExistingWriting) {
    const partScore = writingScoreFromParts(existingResult.parts);
    if (partScore !== null) return partScore;

    const topLevelScore = normalizeScoreCandidate(existingResult.writingScore);
    if (topLevelScore !== null) return topLevelScore;
  }

  return normalizeScoreCandidate(supplementalWriting?.writingScore);
}

function mergeObjectiveAndWritingParts({ existingResult = {}, writingParts = [], objectiveParts = [], allowExistingWriting = true } = {}) {
  const existingParts = Array.isArray(existingResult.parts) ? existingResult.parts : [];
  const existingWritingParts = allowExistingWriting ? existingParts.filter((part) => part?.partType === "writing" || part?.partId === "teil2") : [];
  const existingOtherParts = existingParts.filter((part) => !(part?.partType === "writing" || part?.partId === "teil2") && !(part?.partId && objectiveParts.some((objectivePart) => objectivePart.partId === part.partId)));

  return [
    ...(existingWritingParts.length ? existingWritingParts : writingParts),
    ...objectiveParts,
    ...existingOtherParts,
  ];
}

function buildWritingFeedbackSection(rawFeedback = "", writingScore = null) {
  const cleaned = stripBoldMarkdown(rawFeedback).replace(/\s*\n\s*/g, "\n").trim();
  if (!cleaned) return "";

  return [
    "✍️ Writing feedback",
    writingScore !== null ? `- Writing score: ${writingScore}%` : "",
    cleaned,
  ].filter(Boolean).join("\n");
}

function buildDeterministicObjectiveResult(payload = {}, existingResult = {}) {
  const referenceEntry = payload.referenceEntry || {};
  const submissionText = payload.submissionText || payload.submission?.text || "";
  const deterministicObjective = objectiveMarkerForRouter(referenceEntry, submissionText);
  if (!deterministicObjective?.objectiveTotal) return null;

  const name = payload.submission?.studentName || payload.submission?.name || "Student";
  const allowExistingWriting = shouldMarkWriting(payload);
  const supplementalWriting = hasWritingPart(existingResult) && allowExistingWriting ? null : buildSupplementalWritingResult(payload);
  const writingScore = resolveWritingScore(existingResult, supplementalWriting, allowExistingWriting);
  const hasWriting = writingScore !== null;
  const objectiveScore = deterministicObjective.objectiveScore;
  const finalScore = hasWriting ? Math.round((objectiveScore * OBJECTIVE_WEIGHT) + (writingScore * WRITING_WEIGHT)) : objectiveScore;

  const objectiveFeedback = buildObjectiveFeedback({
    name,
    correct: deterministicObjective.objectiveCorrect,
    total: deterministicObjective.objectiveTotal,
    wrongAnswers: deterministicObjective.wrongAnswers,
  });

  const writingFeedback = allowExistingWriting && hasWritingPart(existingResult)
    ? writingFeedbackFromResult(existingResult)
    : supplementalWriting?.writingFeedback;

  const feedback = stripBoldMarkdown([
    hasWriting ? buildWritingFeedbackSection(writingFeedback, writingScore) : "",
    objectiveFeedback,
  ].filter(Boolean).join("\n\n"));

  const objectiveCorrections = deterministicObjective.wrongAnswers.map((item) => ({
    partId: item.partId,
    questionNumber: item.question,
    expected: item.expectedDisplay || item.expected,
    given: item.student,
  }));

  return {
    ...(existingResult || {}),
    score: finalScore,
    passed: finalScore >= 60,
    level: referenceEntry.level || payload.level || existingResult.level || "UNKNOWN",
    assignmentKey: referenceEntry.assignmentKey || payload.assignmentKey || existingResult.assignmentKey || "",
    detectedParts: [
      ...(hasWriting ? [{ partId: "teil2", partType: "writing", answerCount: 1, summary: "teil2: writing answer marked" }] : []),
      ...deterministicObjective.detectedParts,
    ],
    expectedParts: referenceEntry.expectedParts || existingResult.expectedParts || [],
    parts: mergeObjectiveAndWritingParts({
      existingResult,
      writingParts: supplementalWriting?.writingParts || [],
      objectiveParts: deterministicObjective.parts,
      allowExistingWriting,
    }),
    objectiveScore,
    objectiveCorrect: deterministicObjective.objectiveCorrect,
    objectiveTotal: deterministicObjective.objectiveTotal,
    wrongAnswers: deterministicObjective.wrongAnswers,
    writingScore: hasWriting ? writingScore : null,
    finalScore,
    feedback,
    corrections: [...(Array.isArray(existingResult.corrections) && allowExistingWriting ? existingResult.corrections : []), ...objectiveCorrections],
    improvementSummary: stripBoldMarkdown([supplementalWriting?.writingImprovementSummary, objectiveFeedback].filter(Boolean).join("\n\n") || existingResult.improvementSummary || feedback),
    confidence: Math.max(Number(existingResult.confidence || 0), deterministicObjective.confidence || 0.95),
    status: existingResult.status === "needs_review" ? "needs_review" : "marked",
    shouldSendAutomatically: false,
    ai: {
      ...(existingResult.ai || {}),
      deterministicObjectiveMarked: true,
      deterministicObjectiveWeight: hasWriting ? OBJECTIVE_WEIGHT : 1,
      deterministicWritingWeight: hasWriting ? WRITING_WEIGHT : 0,
      supplementalWritingMarked: Boolean(supplementalWriting?.writingParts?.length),
      note: "Objective score calculated deterministically from the answer key; writing feedback is only included for real writing sections.",
    },
  };
}

function mergeDeterministicMarkingResponse(originalBody, deterministicResult) {
  if (!deterministicResult) return originalBody;
  if (originalBody && typeof originalBody === "object" && originalBody.result) {
    return { ...originalBody, result: { ...originalBody.result, ...deterministicResult } };
  }
  return { ...(originalBody || {}), ...deterministicResult };
}

async function proxyToFalowenFunction(req, res, path, url) {
  try {
    const target = new URL(`${FALOWEN_FUNCTION_BASE_URL.replace(/\/+$/, "")}/${path}`);

    for (const [key, value] of url.searchParams.entries()) {
      if (key === "path" || key === "route") continue;
      target.searchParams.append(key, value);
    }

    const headers = {
      "content-type": req.headers["content-type"] || "application/json",
      accept: req.headers.accept || "application/json",
    };

    if (req.headers.authorization) headers.authorization = req.headers.authorization;

    await ensureJsonBody(req);
    await hydrateMarkingPayloadWithManifest(req, path);

    const response = await fetch(target.toString(), {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : JSON.stringify(req.body || {}),
    });

    const text = await response.text();
    res.status(response.status);

    try {
      const parsed = JSON.parse(text);
      const baseResult = parsed?.result || parsed || {};
      const deterministic = path === "marking/ai" ? buildDeterministicObjectiveResult(req.body || {}, baseResult) : null;
      return res.json(mergeDeterministicMarkingResponse(parsed, deterministic));
    } catch {
      return res.send(text);
    }
  } catch (error) {
    console.error("Falowen function proxy failed:", error);
    return res.status(502).json({ status: "error", message: "Falowen function proxy failed" });
  }
}

function normalizePath(value) {
  return String(value || "")
    .replace(/^\/+/, "")
    .replace(/^api\//, "")
    .replace(/^router\/?/, "");
}

function getRequestUrl(req) {
  const host = req.headers.host || "localhost";
  return new URL(req.url || "/", `https://${host}`);
}

function getRouterPath(req, url) {
  const queryPath = url.searchParams.get("path") || url.searchParams.get("route");
  if (queryPath) return normalizePath(queryPath);
  return normalizePath(url.pathname);
}

function methodAllowed(req, res, allowedMethods) {
  if (allowedMethods.includes(req.method)) return true;
  res.setHeader("Allow", allowedMethods.join(", "));
  res.status(405).json({ status: "error", message: "Method Not Allowed" });
  return false;
}

const FALOWEN_PROXY_ROUTES = new Set([
  "checkin",
  "checkin-token",
  "checkinStatus",
  "credits",
  "health",
  "member-invite",
  "messages",
  "migrateSessionIds",
  "openSession",
  "self-checkin-token",
  "transaction",
  "transactions",
  "verify-checkin",
]);

export default async function handler(req, res) {
  const url = getRequestUrl(req);
  const path = getRouterPath(req, url);
  const firstSegment = path.split("/")[0];

  if (!path || path === "health") {
    return res.status(200).json({ ok: true, status: "ok", service: "falowenadmin-api-router" });
  }

  if (path === "social-metrics") return socialMetricsHandler(req, res);

  if (path === "student-results/sheet-upsert") return studentResultsSheetUpsertHandler(req, res);

  if (FALOWEN_PROXY_ROUTES.has(path) || FALOWEN_PROXY_ROUTES.has(firstSegment)) {
    return proxyToFalowenFunction(req, res, path, url);
  }

  if (
    path.startsWith("holidays/") ||
    path.startsWith("orientation/") ||
    path.startsWith("class-schedule/") ||
    path.startsWith("students/") ||
    path.startsWith("marking/")
  ) {
    return proxyToFalowenFunction(req, res, path, url);
  }

  if (!methodAllowed(req, res, ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"])) return undefined;

  return res.status(404).json({ status: "error", message: "API route not found" });
}

export { proxyToFalowenFunction };
