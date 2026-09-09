const PART_IDS = ["teil1", "teil2", "teil3", "teil4", "unknown"];
const WRITING_CONFIDENCE_THRESHOLD = 0.75;
const OBJECTIVE_OPTION_LETTERS = "ABCDEFGHIJX";


const WRITING_RUBRICS = {
  A1: ["task completion", "greeting/closing", "simple grammar", "word order", "vocabulary", "spelling"],
  A2: ["task completion", "structure", "connectors", "grammar", "sentence variety", "vocabulary"],
  B1: ["task completion", "argument/clarity", "structure", "grammar control", "vocabulary", "coherence"],
};

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

function normalizeLevel(value) {
  const match = String(value || "").match(/\b(A1|A2|B1)\b/i);
  return match ? match[1].toUpperCase() : "";
}

export function normalizeTextForAnswerMatching(value) {
  return normalizeForCompare(value);
}

function normalizeAnswer(value) {
  const normalized = normalizeForCompare(value);
  if (["true", "r", "richtig", "wahr", "yes", "ja"].includes(normalized)) return "R";
  if (["false", "f", "falsch", "nein", "no"].includes(normalized)) return "F";

  const option = String(value || "").trim().match(new RegExp(`^([${OBJECTIVE_OPTION_LETTERS}])\\s*[).:-]?$`, "i"));
  if (option) return option[1].toUpperCase();

  return normalized;
}

function extractOptionLetter(value) {
  const trimmed = String(value || "").trim();
  const match = trimmed.match(new RegExp(`^([${OBJECTIVE_OPTION_LETTERS}])(?:\\s*[).:/-]|\\s+|$)`, "i"));
  return match ? match[1].toUpperCase() : "";
}

function extractOptionText(value) {
  return String(value || "")
    .replace(/^\s*[A-Z](?:\s*[).:/-]|\s+)\s*/i, "")
    .trim();
}

function getQuestionIndex(key) {
  const match = String(key || "").match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function detectLevel({ submission = {}, referenceEntry = {}, submissionText = "" } = {}) {
  return normalizeLevel(submission.level)
    || normalizeLevel(referenceEntry.level)
    || normalizeLevel(submission.assignmentKey)
    || normalizeLevel(submission.assignmentId)
    || normalizeLevel(referenceEntry.assignmentKey)
    || normalizeLevel(referenceEntry.assignmentId)
    || normalizeLevel(submission.assignment)
    || normalizeLevel(referenceEntry.assignment)
    || normalizeLevel(submissionText)
    || "";
}

function detectAssignmentKey({ submission = {}, referenceEntry = {} } = {}) {
  return String(
    submission.assignmentKey
      || submission.assignment_key
      || submission.assignmentId
      || submission.assignment_id
      || referenceEntry.assignmentKey
      || referenceEntry.assignment_key
      || referenceEntry.assignmentId
      || referenceEntry.assignment_id
      || referenceEntry.assignment
      || submission.assignment
      || "",
  ).trim();
}

function findPartId(value = "") {
  const normalized = normalizeForCompare(value);
  if (/\bteil\s*(?:1|eins|i)\b|\bpart\s*(?:1|one|i)\b/.test(normalized)) return "teil1";
  if (/\bteil\s*(?:2|zwei|ii)\b|\bpart\s*(?:2|two|ii)\b|\bschreiben\b|\bwriting\b/.test(normalized)) return "teil2";
  if (/\bteil\s*(?:3|drei|iii)\b|\bpart\s*(?:3|three|iii)\b|\blesen\b|\breading\b/.test(normalized)) return "teil3";
  if (/\bteil\s*(?:4|vier|iv)\b|\bpart\s*(?:4|four|iv)\b|\bhoren\b|\bhoeren\b|\blistening\b/.test(normalized)) return "teil4";
  return "unknown";
}

function splitSubmissionIntoParts(submissionText = "") {
  const text = String(submissionText || "").trim();
  if (!text) return [{ partId: "unknown", title: "Unknown", text: "", confidence: 0 }];

  const markerRegex = /(?:^|\n)\s*((?:teil|part)\s*(?:[1-4]|iv|iii|ii|i|eins|zwei|drei|vier|one|two|three|four)\b[^\n]*|(?:schreiben|lesen|h[oö]ren|hoeren|writing|reading|listening)\b[^\n]*)\s*:?\s*(?=\n|$)/gi;
  const markers = [];
  let match;
  while ((match = markerRegex.exec(text))) {
    markers.push({ index: match.index, end: markerRegex.lastIndex, title: match[1].trim(), partId: findPartId(match[1]) });
  }

  if (!markers.length) {
    return [{ partId: "unknown", title: "Unlabelled submission", text, confidence: 0.45 }];
  }

  const parts = [];
  const leadingText = text.slice(0, markers[0].index).trim();
  if (leadingText) {
    parts.push({
      partId: "unknown",
      title: "Unlabelled writing before objective section",
      text: leadingText,
      confidence: 0.7,
    });
  }

  markers.forEach((marker, index) => {
    const next = markers[index + 1];
    const partText = text.slice(marker.end, next ? next.index : text.length).trim();
    if (partText || marker.partId !== "unknown") {
      parts.push({
        partId: marker.partId,
        title: marker.title,
        text: partText,
        confidence: marker.partId === "unknown" ? 0.5 : 0.9,
      });
    }
  });

  return parts.filter((part) => part.text || part.partId !== "unknown");
}

function looksLikeWritingTask(text = "") {
  const normalized = normalizeForCompare(text);
  const wordCount = normalized ? normalized.split(" ").length : 0;
  const hasGreeting = /\b(lieber|liebe|hallo|guten tag|sehr geehrte|dear|hello|hi)\b/i.test(text);
  const hasClosing = /\b(viele grusse|viele gruesse|mit freundlichen grussen|mit freundlichen gruessen|tschuss|bis bald|regards|sincerely|best wishes)\b/i.test(text);
  const firstPerson = /\bich|mir|mich|mein|meine|wir|uns\b/i.test(text);
  const sentenceCount = (String(text).match(/[.!?]/g) || []).length;
  return (hasGreeting && (hasClosing || wordCount >= 25)) || (firstPerson && sentenceCount >= 3 && wordCount >= 30);
}

function detectPartType({ partId, text, referenceEntry = {} } = {}) {
  const format = String(referenceEntry?.format || "").toLowerCase();
  if (partId === "teil2") return "writing";
  if (["teil3", "teil4"].includes(partId)) return "objective";
  if (looksLikeWritingTask(text)) return "writing";
  if (format === "objective") return "objective";
  if (format === "writing") return "writing";
  return "objective";
}

function normalizeObjectiveOption(value = "") {
  const match = String(value || "").trim().match(new RegExp(`^([${OBJECTIVE_OPTION_LETTERS}])(?:\\b|\\s|[).:-]|$)`, "i"));
  return match ? match[1].toUpperCase() : "";
}

function parseNumberedObjectiveLine(line = "") {
  const trimmed = String(line || "").trim();
  if (!trimmed) return null;

  // Some students repeat the local option number after the question label,
  // for example "Frage3:2. Anzeige B". The outer Frage number identifies
  // the question; the repeated number must not become part of the answer.
  const nestedAnzeige = trimmed.match(new RegExp(`^(?:answer|antwort|frage|aufgabe|task|exercise|nr\\.?|q)\\s*(\\d{1,3})\\s*[).:-]?\\s*\\d{1,3}\\s*[).:-]\\s*anzeige\\s*[).:-]?\\s*([${OBJECTIVE_OPTION_LETTERS}])(?:\\b|\\s|[).:-]|$)`, "i"));
  if (nestedAnzeige) {
    return { question: Number.parseInt(nestedAnzeige[1], 10), answer: nestedAnzeige[2].toUpperCase() };
  }

  const numbered = trimmed.match(new RegExp(`^(?:answer|antwort|frage|aufgabe|task|exercise|nr\\.?|q)?\\s*(\\d{1,3})\\s*[).:-]?\\s*(?:anzeige\\s*[).:-]?\\s*)?([${OBJECTIVE_OPTION_LETTERS}])(?:\\b|\\s|[).:-]|$)`, "i"));
  if (numbered) {
    return { question: Number.parseInt(numbered[1], 10), answer: numbered[2].toUpperCase() };
  }

  const anzeigeNumbered = trimmed.match(new RegExp(`^(?:answer|antwort|frage|aufgabe|task|exercise|nr\\.?|q)?\\s*(\\d{1,3})\\s*[).:-]?\\s*anzeige\\s*[).:-]?\\s*([${OBJECTIVE_OPTION_LETTERS}])(?:\\b|\\s|[).:-]|$)`, "i"));
  if (anzeigeNumbered) {
    return { question: Number.parseInt(anzeigeNumbered[1], 10), answer: anzeigeNumbered[2].toUpperCase() };
  }

  const textAnswer = trimmed.match(/^(?:answer|antwort|frage|aufgabe|task|exercise|nr\.?|q)?\s*(\d{1,3})\s*[).:–-]\s*(.+)$/i);
  if (textAnswer) {
    return { question: Number.parseInt(textAnswer[1], 10), answer: textAnswer[2].trim() };
  }

  return null;
}

function splitCompactNumberedObjectiveSequence(line = "") {
  const trimmed = String(line || "").trim();
  if (!trimmed) return [];

  const tokenPattern = new RegExp(
    `\\d{1,3}\\s*[).:-]?\\s*[${OBJECTIVE_OPTION_LETTERS}]\\s*[).:-]?(?=\\s|$)`,
    "gi",
  );
  const matches = [...trimmed.matchAll(tokenPattern)];
  if (matches.length < 2) return [trimmed];

  let cursor = 0;
  const unmatched = matches.reduce((remainder, match) => {
    const index = Number(match.index || 0);
    const gap = trimmed.slice(cursor, index);
    cursor = index + match[0].length;
    return remainder + gap;
  }, "") + trimmed.slice(cursor);

  if (unmatched.trim()) return [trimmed];
  return matches.map((match) => match[0].trim());
}

function splitObjectiveAnswerTokens(text = "") {
  return String(text || "")
    .split(/\r?\n/)
    .flatMap((line) => line.split(/[,;]+/))
    .flatMap((line) => splitCompactNumberedObjectiveSequence(line))
    .map((line) => line.trim())
    .filter(Boolean);
}

function parsePrefixedObjectiveAnswer(line = "") {
  const trimmed = String(line || "").trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^(?:ans(?:wer)?|antwort)\b\s*[:=.\-)\]]?\s*(.+)$/i);
  return match ? String(match[1] || "").trim() : "";
}

function isObjectiveOptionAnswer(answer = "") {
  const normalized = normalizeAnswer(answer);
  return new RegExp(`^[${OBJECTIVE_OPTION_LETTERS}]$`).test(normalized) || normalized === "R" || normalized === "F";
}

function countObjectiveAnswerEvidence(text = "") {
  return splitObjectiveAnswerTokens(text).reduce((count, token) => {
    const prefixedAnswer = parsePrefixedObjectiveAnswer(token);
    if (prefixedAnswer) return count + 1;

    const numbered = parseNumberedObjectiveLine(token);
    if (numbered && isObjectiveOptionAnswer(numbered.answer)) return count + 1;

    const optionOnly = token.match(new RegExp(`^(?:anzeige\\s*[).:-]?\\s*)?([${OBJECTIVE_OPTION_LETTERS}])(?:\\b|\\s|[).:-]|$)`, "i"));
    if (optionOnly && (/^anzeige\b/i.test(token) || token.length <= 2 || new RegExp(`^[${OBJECTIVE_OPTION_LETTERS}]\\s*[).:-]`, "i").test(token))) return count + 1;

    return isObjectiveOptionAnswer(token) ? count + 1 : count;
  }, 0);
}

function parseStudentObjectiveAnswerTokens(tokens = [], { questionOffset = 0 } = {}) {
  const map = new Map();
  let orderedQuestion = 0;
  let pendingQuestion = null;

  for (const trimmed of tokens) {
    if (!trimmed) continue;

    const prefixedAnswer = parsePrefixedObjectiveAnswer(trimmed);
    if (prefixedAnswer) {
      if (pendingQuestion !== null) {
        map.set(questionOffset + pendingQuestion, prefixedAnswer);
        orderedQuestion = Math.max(orderedQuestion, pendingQuestion);
        pendingQuestion = null;
      } else {
        orderedQuestion += 1;
        map.set(questionOffset + orderedQuestion, prefixedAnswer);
      }
      continue;
    }

    const numbered = parseNumberedObjectiveLine(trimmed);
    if (numbered) {
      const question = questionOffset + numbered.question;
      map.set(question, numbered.answer);
      orderedQuestion = Math.max(orderedQuestion, numbered.question);
      pendingQuestion = numbered.question;
      continue;
    }

    const anzeigeOnly = trimmed.match(new RegExp(`^(?:anzeige\\s*[).:-]?\\s*)?([${OBJECTIVE_OPTION_LETTERS}])(?:\\b|\\s|[).:-]|$)`, "i"));
    if (anzeigeOnly && (/^anzeige\b/i.test(trimmed) || trimmed.length <= 2 || new RegExp(`^[${OBJECTIVE_OPTION_LETTERS}]\\s*[).:-]`, "i").test(trimmed))) {
      orderedQuestion += 1;
      map.set(questionOffset + orderedQuestion, anzeigeOnly[1].toUpperCase());
      pendingQuestion = null;
      continue;
    }

    if (isObjectiveOptionAnswer(trimmed)) {
      orderedQuestion += 1;
      map.set(questionOffset + orderedQuestion, trimmed);
      pendingQuestion = null;
    }
  }

  return { map, localQuestionCount: orderedQuestion };
}

function mergeAnswerMaps(target, source) {
  source.forEach((value, key) => target.set(key, value));
}

function parseStudentObjectiveAnswers(submissionText = "") {
  const text = String(submissionText || "");
  const parts = splitSubmissionIntoParts(text).filter((part) => part.partId !== "unknown");
  const objectiveParts = parts.filter((part) => countObjectiveAnswerEvidence(part.text) > 0);

  if (objectiveParts.length > 1) {
    const map = new Map();
    let questionOffset = 0;

    for (const part of objectiveParts) {
      const parsed = parseStudentObjectiveAnswerTokens(splitObjectiveAnswerTokens(part.text), { questionOffset });
      mergeAnswerMaps(map, parsed.map);
      questionOffset += parsed.localQuestionCount;
    }

    return map;
  }

  return parseStudentObjectiveAnswerTokens(splitObjectiveAnswerTokens(text)).map;
}

const VOCABULARY_ALIASES = {
  head: ["head"],
  arm: ["arm"],
  leg: ["leg"],
  eye: ["eye"],
  nose: ["nose"],
  ear: ["ear"],
  mouth: ["mouth"],
  hand: ["hand"],
  foot: ["foot"],
  stomach: ["stomach", "belly"],
};

function findVocabularyKey(value = "") {
  const normalized = normalizeForCompare(value);
  return Object.entries(VOCABULARY_ALIASES).find(([, aliases]) => aliases.some((alias) => normalized.includes(alias)))?.[0] || "";
}

function parseVocabularyPair(value = "") {
  const trimmed = String(value || "").trim();
  const aliasPattern = Object.values(VOCABULARY_ALIASES)
    .flat()
    .sort((a, b) => b.length - a.length)
    .map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const match = trimmed.match(new RegExp(`^(?:[a-z]\\s*[).]\\s*)?((?:${aliasPattern})(?:\\s*/\\s*(?:${aliasPattern}))?)\\s*(?:[-–:/]\\s*|\\s+)([A-Za-zÄÖÜäöüß]+(?:\\s*/\\s*[A-Za-zÄÖÜäöüß]+)*)`, "i"));
  if (!match) return null;
  const vocabularyKey = findVocabularyKey(match[1]);
  if (!vocabularyKey) return null;
  const german = String(match[2] || "").split("/")[0].trim();
  return { vocabularyKey, english: match[1].trim(), german };
}

function extractVocabularyAnswers(text = "") {
  const pairs = {};
  const lines = String(text || "").split(/\n| {2,}/);

  for (const line of lines) {
    const pair = parseVocabularyPair(line);
    if (pair) pairs[pair.vocabularyKey] = pair.german;
  }

  return pairs;
}

function parseObjectiveReferenceText(text = "") {
  const entries = [];
  let orderedQuestion = 0;

  for (const line of String(text || "").split(/\r?\n|[,;]+/)) {
    const trimmed = line.trim();
    if (!trimmed || /^(teil|part)\s*\d+\s*:?$/i.test(trimmed)) continue;

    const numbered = parseNumberedObjectiveLine(trimmed);
    if (numbered) {
      entries.push({ key: `Answer${numbered.question}`, value: numbered.answer });
      orderedQuestion = Math.max(orderedQuestion, numbered.question);
      continue;
    }

    const vocabularyPair = parseVocabularyPair(trimmed);
    if (vocabularyPair) {
      orderedQuestion += 1;
      entries.push({ key: `Answer${orderedQuestion}`, value: trimmed });
      continue;
    }

    const anzeigeOnly = trimmed.match(new RegExp(`^(?:anzeige\\s*[).:-]?\\s*)?([${OBJECTIVE_OPTION_LETTERS}])(?:\\b|\\s|[).:-]|$)`, "i"));
    if (anzeigeOnly && (/^anzeige\b/i.test(trimmed) || trimmed.length <= 2 || new RegExp(`^[${OBJECTIVE_OPTION_LETTERS}]\\s*[).:-]`, "i").test(trimmed))) {
      orderedQuestion += 1;
      entries.push({ key: `Answer${orderedQuestion}`, value: anzeigeOnly[1].toUpperCase() });
    }
  }

  return entries;
}

function isObjectiveLeaf(value) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true;
  if (!value || typeof value !== "object") return false;
  return Boolean(value.correctLetter || value.correctText || value.rawCorrectAnswer || value.raw || value.acceptedAnswers);
}

function isPlaceholderReferenceValue(value = "") {
  return /^(read|see|check) (the )?(comment|comments|instructions?)( for (the )?answers?)?$/.test(String(value || "").trim().toLowerCase());
}

function extractObjectiveEntries(referenceAnswers = {}, path = []) {
  if (typeof referenceAnswers === "string") {
    if (isPlaceholderReferenceValue(referenceAnswers)) return [];
    const parsed = parseObjectiveReferenceText(referenceAnswers);
    if (parsed.length > 1) return parsed;
    return [{ key: path.join("."), value: referenceAnswers }];
  }
  if (typeof referenceAnswers === "number" || typeof referenceAnswers === "boolean") {
    return [{ key: path.join("."), value: String(referenceAnswers) }];
  }
  if (!referenceAnswers || typeof referenceAnswers !== "object") return [];
  if (isObjectiveLeaf(referenceAnswers)) return [{ key: path.join("."), value: referenceAnswers }];
  return Object.entries(referenceAnswers).flatMap(([key, value]) => extractObjectiveEntries(value, [...path, key]));
}

function extractReferenceTextForPart(text = "", partId = "unknown") {
  const lines = String(text || "").split(/\r?\n/);
  const markerPattern = /^\s*((?:teil|part)\s*(?:[1-4]|eins|zwei|drei|vier|one|two|three|four)\b|(?:schreiben|lesen|h[oö]ren|hoeren|writing|reading|listening)\b)\s*:?[ \t]*(.*)$/i;
  let currentPart = "unknown";
  let sawPartMarker = false;
  const selected = [];

  for (const line of lines) {
    const marker = line.match(markerPattern);
    if (marker) {
      const markerPart = findPartId(marker[1]);
      const rest = String(marker[2] || "").trim();
      if (markerPart !== "unknown") {
        sawPartMarker = true;
        currentPart = markerPart;
        if (markerPart === partId && rest) selected.push(rest);
        continue;
      }
    }

    if (currentPart === partId) selected.push(line);
  }

  if (selected.length) return selected.join("\n");
  return sawPartMarker ? "" : String(text || "");
}

function getObjectiveAnswerKey(referenceEntry = {}, partId = "unknown") {
  if (referenceEntry.parts?.[partId]?.answers) return referenceEntry.parts[partId].answers;
  if (partId === "unknown" && referenceEntry.parts?.main?.answers) return referenceEntry.parts.main.answers;
  if (partId !== "unknown") {
    const matchingPartKey = Object.keys(referenceEntry.parts || {}).find((key) => findPartId(key) === partId);
    if (matchingPartKey && referenceEntry.parts[matchingPartKey]?.answers) return referenceEntry.parts[matchingPartKey].answers;
  }

  if (partId === "teil3" && referenceEntry.parts?.teil3?.answers) return referenceEntry.parts.teil3.answers;
  if (partId === "teil4" && referenceEntry.parts?.teil4?.answers) return referenceEntry.parts.teil4.answers;
  if (partId === "unknown" && Object.keys(referenceEntry.parts || {}).length === 1) {
    const onlyPart = Object.values(referenceEntry.parts)[0];
    if (onlyPart?.answers) return onlyPart.answers;
  }

  const candidates = [
    referenceEntry.answerKeys,
    referenceEntry.answer_key,
    referenceEntry.answers,
    referenceEntry.key,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      return partId === "unknown" ? candidate : extractReferenceTextForPart(candidate, partId);
    }
    if (candidate?.[partId]) return candidate[partId];
    if (partId !== "unknown") {
      const matchingKey = Object.keys(candidate || {}).find((key) => findPartId(key) === partId);
      if (matchingKey) return candidate[matchingKey];
    }
  }

  if (partId === "unknown" || String(referenceEntry.format || "").toLowerCase() === "objective") {
    return referenceEntry.answers || referenceEntry.answerKeys || referenceEntry.key || {};
  }

  return {};
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

function expectedMetadata(expectedRaw) {
  const objectRaw = expectedRaw && typeof expectedRaw === "object"
    ? expectedRaw.rawCorrectAnswer || expectedRaw.raw || expectedRaw.correctText || expectedRaw.correctLetter || ""
    : String(expectedRaw ?? "");
  const vocabularyPair = parseVocabularyPair(objectRaw);

  if (expectedRaw && typeof expectedRaw === "object") {
    return {
      raw: vocabularyPair?.german || expectedRaw.rawCorrectAnswer || expectedRaw.raw || expectedRaw.correctText || expectedRaw.correctLetter || "",
      correctLetter: vocabularyPair ? "" : String(expectedRaw.correctLetter || "").toUpperCase(),
      correctText: vocabularyPair?.german || expectedRaw.correctText || extractOptionText(expectedRaw.rawCorrectAnswer || expectedRaw.raw || ""),
      acceptedAnswers: vocabularyPair
        ? [vocabularyPair.german, ...vocabularyPair.english.split("/").map((value) => value.trim())]
        : expectedRaw.acceptedAnswers || [],
      questionNumber: expectedRaw.questionNumber,
      vocabularyKey: vocabularyPair?.vocabularyKey || "",
      isVocabulary: Boolean(vocabularyPair),
    };
  }
  const raw = String(expectedRaw ?? "");
  const letter = vocabularyPair ? "" : extractOptionLetter(raw);
  return {
    raw: vocabularyPair?.german || raw,
    correctLetter: letter,
    correctText: vocabularyPair?.german || extractOptionText(raw),
    acceptedAnswers: vocabularyPair
      ? [vocabularyPair.german, ...vocabularyPair.english.split("/").map((value) => value.trim())]
      : [],
    questionNumber: "",
    vocabularyKey: vocabularyPair?.vocabularyKey || "",
    isVocabulary: Boolean(vocabularyPair),
  };
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
  return maxLength >= 5 && distance <= Math.max(1, Math.floor(maxLength * 0.35));
}

function valuesMatch(expectedRaw, studentRaw) {
  const meta = expectedMetadata(expectedRaw);
  const expected = normalizeAnswer(meta.raw);
  const student = normalizeAnswer(studentRaw);
  if (!expected || !student) return { status: "wrong" };
  if (expected === student) return { status: "correct", reason: "Exact answer match" };

  const acceptedVocabularyMatch = meta.isVocabulary && meta.acceptedAnswers.some(
    (answer) => normalizeForCompare(answer) === normalizeForCompare(studentRaw),
  );
  if (acceptedVocabularyMatch) return { status: "correct", reason: "Accepted vocabulary language" };
  if (meta.isVocabulary) return { status: "wrong" };

  const expectedLetter = meta.correctLetter || extractOptionLetter(meta.raw);
  const studentLetter = extractOptionLetter(studentRaw);
  const studentText = extractOptionText(studentRaw);
  const expectedText = meta.correctText || extractOptionText(meta.raw);

  if (expectedLetter && studentLetter) {
    if (expectedLetter === studentLetter) return { status: "correct", reason: "Correct option letter" };
    if (textMatches(expectedText, studentText || studentRaw)) {
      return { status: "needs_review", reason: "Conflicting option letter and answer text" };
    }
    return { status: "wrong" };
  }

  if (expectedLetter && normalizeForCompare(studentRaw) === normalizeForCompare(expectedLetter)) {
    return { status: "correct", reason: "Correct option letter" };
  }

  const normalizedExpectedLetter = normalizeForCompare(expectedLetter);
  const acceptedTextMatch = meta.acceptedAnswers.some((answer) => {
    const normalizedAccepted = normalizeForCompare(answer);
    if (!normalizedAccepted || normalizedAccepted === normalizedExpectedLetter || normalizedAccepted.length < 3) return false;
    return textMatches(answer, studentRaw);
  });
  if (acceptedTextMatch || textMatches(expectedText || meta.raw, studentText || studentRaw)) {
    return { status: "correct", reason: "Correct answer text" };
  }

  return { status: "wrong" };
}

function formatExpectedAnswer(expectedRaw) {
  const meta = expectedMetadata(expectedRaw);
  return String(meta.correctLetter || normalizeObjectiveOption(meta.raw) || meta.correctText || meta.raw || "").toUpperCase();
}

function alignLabeledPartialObjectiveAnswers(studentAnswers, entries, submissionText = "") {
  if (!(studentAnswers instanceof Map) || !studentAnswers.size || studentAnswers.size >= entries.length) return studentAnswers;

  const parts = splitSubmissionIntoParts(submissionText).filter((part) => part.partId !== "unknown");
  const objectiveParts = parts.filter((part) => countObjectiveAnswerEvidence(part.text) > 0);
  if (!objectiveParts.length) return studentAnswers;

  const expectedKind = (value) => {
    const meta = expectedMetadata(value);
    const normalized = normalizeAnswer(meta.raw);
    if (normalized === "R" || normalized === "F") return "boolean";
    if (meta.correctLetter || extractOptionLetter(meta.raw)) return "choice";
    return "text";
  };

  const studentKind = (value) => {
    const normalized = normalizeAnswer(value);
    if (normalized === "R" || normalized === "F") return "boolean";
    if (extractOptionLetter(value)) return "choice";
    return "text";
  };

  const pairFitScore = (reference, studentRaw) => {
    if (!reference || !studentRaw) return -1000;
    const match = valuesMatch(reference.value, studentRaw);
    const typeBonus = expectedKind(reference.value) === studentKind(studentRaw) ? 1 : 0;
    return (match.status === "correct" ? 4 : 0) + typeBonus;
  };

  const mapFitScore = (answerMap) => [...answerMap.entries()].reduce((score, [question, studentRaw]) => {
    const reference = entries[question - 1];
    return reference ? score + pairFitScore(reference, studentRaw) : score;
  }, 0);

  if (objectiveParts.length > 1) {
    const aligned = new Map();
    let minimumGlobalQuestion = 1;

    objectiveParts.forEach((part, partIndex) => {
      const localParsed = parseStudentObjectiveAnswerTokens(splitObjectiveAnswerTokens(part.text));
      const localEntries = [...localParsed.map.entries()].sort(([left], [right]) => left - right);
      if (!localEntries.length) return;

      const minLocal = localEntries[0][0];
      const maxLocal = localEntries[localEntries.length - 1][0];
      let chosenOffset = 0;

      if (partIndex > 0) {
        const minOffset = Math.max(0, minimumGlobalQuestion - minLocal);
        const maxOffset = entries.length - maxLocal;
        const candidates = [];

        for (let offset = minOffset; offset <= maxOffset; offset += 1) {
          const score = localEntries.reduce((total, [question, studentRaw]) => {
            const reference = entries[question + offset - 1];
            return total + pairFitScore(reference, studentRaw);
          }, 0);
          candidates.push({ offset, score });
        }

        candidates.sort((left, right) => right.score - left.score || left.offset - right.offset);
        chosenOffset = candidates[0]?.offset ?? minOffset;
      }

      localEntries.forEach(([question, answer]) => aligned.set(question + chosenOffset, answer));
      minimumGlobalQuestion = Math.max(
        minimumGlobalQuestion,
        ...localEntries.map(([question]) => question + chosenOffset + 1),
      );
    });

    if (aligned.size && mapFitScore(aligned) > mapFitScore(studentAnswers)) return aligned;
  }

  if (objectiveParts.length !== 1 || objectiveParts[0].partId !== "teil2") return studentAnswers;

  const localEntries = [...studentAnswers.entries()].sort(([left], [right]) => left - right);
  const maxOffset = entries.length - Math.max(...localEntries.map(([question]) => question));
  if (maxOffset <= 0) return studentAnswers;

  const scoreOffset = (offset) => localEntries.reduce((score, [question, studentRaw]) => {
    const reference = entries[question + offset - 1];
    return score + (reference && valuesMatch(reference.value, studentRaw).status === "correct" ? 1 : 0);
  }, 0);
  const candidates = Array.from({ length: maxOffset + 1 }, (_, offset) => ({ offset, score: scoreOffset(offset) }))
    .sort((left, right) => right.score - left.score || right.offset - left.offset);
  const best = candidates[0];
  const unshiftedScore = scoreOffset(0);

  if (!best?.offset || best.score < 2 || best.score <= unshiftedScore) return studentAnswers;
  return new Map(localEntries.map(([question, answer]) => [question + best.offset, answer]));
}

function objectiveMarker(referenceAnswers = {}, submissionText = "", { partId = "unknown" } = {}) {
  let studentAnswers = parseStudentObjectiveAnswers(submissionText);
  const vocabularyAnswers = extractVocabularyAnswers(submissionText);
  const entries = Array.isArray(referenceAnswers)
    ? referenceAnswers.map((entry, index) => ({ key: entry.questionNumber || entry.questionKey || entry.sourceKey || `Answer${index + 1}`, value: entry }))
    : extractObjectiveEntries(referenceAnswers);
  const total = entries.length;

  studentAnswers = alignLabeledPartialObjectiveAnswers(studentAnswers, entries, submissionText);

  if (!total) {
    return {
      correct: [],
      wrong: [],
      missing: [],
      score: 0,
      percentage: 0,
      total: 0,
      needsReview: [{ reason: `No answer key found for ${partId === "unknown" ? "this assignment" : partId}` }],
      status: "needs_review",
      feedback: partId === "teil4" ? "No Teil 4 answer key found" : "No answer key found for this assignment",
      confidence: 0.25,
    };
  }

  const correct = [];
  const wrong = [];
  const missing = [];
  const needsReview = [];

  for (const [entryIndex, entry] of entries.entries()) {
    const questionIndex = getQuestionIndex(entry.key) || entryIndex + 1;
    const meta = expectedMetadata(entry.value);
    const studentRaw = studentAnswers.get(questionIndex) || (meta.vocabularyKey ? vocabularyAnswers[meta.vocabularyKey] : "") || "";
    const item = { question: questionIndex, expected: formatExpectedAnswer(entry.value), student: String(studentRaw || ""), submitted: String(studentRaw || "") };

    if (!studentRaw) {
      missing.push(item);
    } else {
      const match = valuesMatch(entry.value, studentRaw);
      if (match.status === "correct") {
        correct.push({ ...item, reason: match.reason });
      } else if (match.status === "needs_review") {
        needsReview.push({ ...item, reason: match.reason });
      } else {
        wrong.push(item);
      }
    }
  }

  const percentage = Math.round((correct.length / total) * 100);
  return {
    correct,
    wrong,
    missing,
    needsReview,
    score: correct.length,
    total,
    percentage,
    status: needsReview.length ? "needs_review" : "marked",
    feedback: needsReview.length
      ? `Objective score: ${correct.length}/${total} correct (${percentage}%). ${needsReview.length} answer(s) need review.`
      : `Objective score: ${correct.length}/${total} correct (${percentage}%).`,
    confidence: needsReview.length ? 0.55 : missing.length === total ? 0.45 : 0.95,
  };
}

function tokenize(value) {
  return normalizeForCompare(value).split(" ").filter(Boolean);
}

function estimateGrammarSignal(text = "") {
  const sentences = String(text).split(/[.!?\n]+/).map((line) => line.trim()).filter(Boolean);
  if (!sentences.length) return 0.25;
  const capitalized = sentences.filter((sentence) => /^[A-ZÄÖÜ]/.test(sentence)).length / sentences.length;
  const verbLike = sentences.filter((sentence) => /\b(bin|bist|ist|sind|seid|habe|hat|haben|möchte|mochte|will|kann|gehe|komme|wohne|lerne|arbeite)\b/i.test(sentence)).length / sentences.length;
  return Math.min(1, (capitalized + verbLike) / 2);
}


function clipFeedbackSnippet(value = "", maxLength = 70) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
}

function highlightWritingSnippet(value = "", fallback = "this sentence") {
  return `"${clipFeedbackSnippet(value) || fallback}"`;
}

function extractWritingSentences(text = "") {
  return String(text || "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function isWritingGreetingLine(value = "") {
  const normalized = String(value || "").trim();
  if (!normalized) return false;

  const withoutTrailingPunctuation = normalized.replace(/[.,!?;:]+$/g, "").trim();
  return /^(?:lieber|liebe|hallo|guten tag|sehr geehrte(?:r|n)?|dear|hello|hi)\b/i.test(withoutTrailingPunctuation);
}

function isWritingSignoffLine(value = "") {
  const normalized = String(value || "").trim();
  if (!normalized) return true;

  const normalizedCompare = normalizeForCompare(normalized);
  if (/^(viele|liebe|herzliche|beste) (grusse|gruesse|grusse,|gruesse,)|^(mit freundlichen|freundliche) (grussen|gruessen)/i.test(normalizedCompare)) return true;
  if (/^(regards|best wishes|kind regards|sincerely|yours sincerely|thank you)$/i.test(normalized)) return true;
  if (/^ich freue mich (?:im voraus )?auf deine antwort/i.test(normalizedCompare)) return true;

  const words = normalized.replace(/[.,!?;:]+$/g, "").split(/\s+/).filter(Boolean);
  const hasSentencePunctuation = /[.!?]$/.test(normalized);
  const hasVerbLikeWord = /\b(?:ist|bin|bist|sind|seid|war|hat|habe|hast|haben|geht|gehe|gehen|macht|machen|finde|denke|mochte|möchte|kann|können|werde|wird|schreibe|freue|hoffe|mag|liebe|bevorzuge|schmeckt)\b/i.test(normalized);

  return words.length <= 2 && !hasSentencePunctuation && !hasVerbLikeWord;
}

function findWritingExpansionTarget(text = "") {
  const sentences = extractWritingSentences(text);
  const candidates = sentences.filter((sentence) => !isWritingSignoffLine(sentence));
  if (!candidates.length) return sentences[sentences.length - 1] || text;

  return candidates[candidates.length - 1];
}

function addWritingIssue(issues, issue) {
  if (!issue?.submitted || issues.some((existing) => existing.submitted === issue.submitted)) return;
  issues.push(issue);
}

function findWritingIssues(text = "") {
  const issues = [];
  const sourceText = String(text || "");
  const lines = sourceText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let previousLine = "";

  for (const line of lines) {
    const formalGreetingCase = line.match(/\bSehr\s+Geehrte\b/);
    if (formalGreetingCase) {
      addWritingIssue(issues, {
        submitted: clipFeedbackSnippet(formalGreetingCase[0]),
        suggestion: "Sehr geehrte",
        message: `Use lower-case ${highlightWritingSnippet("geehrte")} in the formal greeting: ${highlightWritingSnippet(formalGreetingCase[0])} → ${highlightWritingSnippet("Sehr geehrte")}.`,
      });
      break;
    }

    if (/^[a-zäöüß]/.test(line) && !/[,;:]$/.test(previousLine)) {
      addWritingIssue(issues, {
        submitted: clipFeedbackSnippet(line),
        suggestion: `${line.charAt(0).toUpperCase()}${line.slice(1)}`,
        message: `Write ${highlightWritingSnippet(`${line.charAt(0).toUpperCase()}${line.slice(1)}`)} instead of ${highlightWritingSnippet(line)}.`,
      });
      break;
    }
    previousLine = line;
  }

  const englishPronoun = sourceText.match(/\bI\s+(?:möchte|moechte|will|kann|habe|bin)\b/i);
  if (englishPronoun) {
    const submitted = clipFeedbackSnippet(englishPronoun[0]);
    addWritingIssue(issues, {
      submitted,
      suggestion: submitted.replace(/^I\b/, "Ich"),
      message: `Use the German subject pronoun in ${highlightWritingSnippet(submitted)}: write ${highlightWritingSnippet(submitted.replace(/^I\b/, "Ich"))}.`,
    });
  }

  const nextWeekFriday = sourceText.match(/\bnächsten\s+Woche\s+um\s+Freitag\b/i);
  if (nextWeekFriday) {
    const submitted = clipFeedbackSnippet(nextWeekFriday[0]);
    addWritingIssue(issues, {
      submitted,
      suggestion: "nächste Woche am Freitag",
      message: `Fix the time phrase ${highlightWritingSnippet(submitted)}: write ${highlightWritingSnippet("nächste Woche am Freitag")}.`,
    });
  } else {
    const nextWeek = sourceText.match(/\bnächsten\s+Woche\b/i);
    if (nextWeek) {
      const submitted = clipFeedbackSnippet(nextWeek[0]);
      addWritingIssue(issues, {
        submitted,
        suggestion: "nächste Woche",
        message: `Use nominative for this time phrase: ${highlightWritingSnippet(submitted)} → ${highlightWritingSnippet("nächste Woche")}.`,
      });
    }

    const friday = sourceText.match(/\bum\s+Freitag\b/i);
    if (friday) {
      const submitted = clipFeedbackSnippet(friday[0]);
      addWritingIssue(issues, {
        submitted,
        suggestion: "am Freitag",
        message: `For days, use ${highlightWritingSnippet("am")} instead of ${highlightWritingSnippet("um")} in ${highlightWritingSnippet(submitted)}.`,
      });
    }
  }

  const autohausInvite = sourceText.match(/\bzu\s+einem\s+Autohaus\s+einladen\b/i);
  if (autohausInvite) {
    const submitted = clipFeedbackSnippet(autohausInvite[0]);
    addWritingIssue(issues, {
      submitted,
      suggestion: "in ein Autohaus einladen",
      message: `Make the invitation phrase more natural: ${highlightWritingSnippet(submitted)} → ${highlightWritingSnippet("in ein Autohaus einladen")}.`,
    });
  }

  const zumSchluss = sourceText.match(/\bZum Schluss,\s*([^.!?]{3,80})/i);
  if (zumSchluss) {
    const submitted = clipFeedbackSnippet(zumSchluss[0]);
    addWritingIssue(issues, {
      submitted,
      suggestion: submitted.replace(/Zum Schluss,\s*/i, "Zum Schluss "),
      message: `Remove the comma in ${highlightWritingSnippet("Zum Schluss,")} and keep the verb in position two.`,
    });
  }

  const missingPunctuationLine = lines.find((line) => {
    if (isWritingGreetingLine(line) || isWritingSignoffLine(line)) return false;
    const words = line.split(/\s+/).filter(Boolean);
    return words.length >= 4 && !/[.!?]$/.test(line);
  });
  if (missingPunctuationLine) {
    const submitted = clipFeedbackSnippet(missingPunctuationLine);
    addWritingIssue(issues, {
      submitted,
      suggestion: `${submitted}.`,
      message: `Add sentence punctuation after ${highlightWritingSnippet(submitted)}.`,
    });
  }

  const longSentence = extractWritingSentences(text).find((sentence) => tokenize(sentence).length >= 24);
  if (longSentence) {
    addWritingIssue(issues, {
      submitted: clipFeedbackSnippet(longSentence),
      suggestion: "Split this into two shorter sentences or add clearer connectors.",
      message: `This sentence is long: ${highlightWritingSnippet(longSentence)}. Split it or connect the ideas more clearly.`,
    });
  }

  return issues.slice(0, 3);
}

function extractWritingStrengths(text = "") {
  const strengths = [];
  const greeting = String(text || "").match(/\b(?:Lieber|Liebe|Hallo|Guten Tag|Sehr geehrte|Dear|Hello|Hi)\b[^\n,.!]*/i);
  if (greeting) strengths.push(`clear greeting ${highlightWritingSnippet(greeting[0])}`);

  const connector = String(text || "").match(/\b(?:weil|danach|zuerst|außerdem|ausserdem|deshalb|aber|und)\b/i);
  if (connector) strengths.push(`connector ${highlightWritingSnippet(connector[0])}`);

  const closing = String(text || "").match(/\b(?:Viele Grüße|Viele Gruesse|Mit freundlichen Grüßen|Mit freundlichen Gruessen|Liebe Grüße|Liebe Gruesse|Regards|Best wishes)\b/i);
  if (closing) strengths.push(`closing ${highlightWritingSnippet(closing[0])}`);

  return strengths.slice(0, 2);
}

function buildWritingFeedback({ level = "", score = 0, rubric = [], text = "" } = {}) {
  const strengths = extractWritingStrengths(text);
  const issues = findWritingIssues(text);
  const sentences = extractWritingSentences(text);
  const expansionTarget = findWritingExpansionTarget(text);
  const isHotelReservationWriting = /\b(?:urlaub|zimmer|reservier|doppelzimmer|balkon|dusche|bergblick|preis|leistungen|hotel)\b/i.test(text);
  const strengthText = strengths.length
    ? `You used ${strengths.join(" and ")}.`
    : `You included ${highlightWritingSnippet(sentences[0] || text, "your own sentences")}.`;
  const issueText = issues.length
    ? `Review exact wording: ${issues.map((issue) => issue.message).join(" ")}`
    : isHotelReservationWriting
      ? "Your letter has a clear structure, an appropriate greeting, and a polite closing. Continue improving your vocabulary by adding specific details about breakfast, parking, cancellation conditions, and other hotel services."
      : `Next step: add one more clear detail to ${highlightWritingSnippet(expansionTarget, "one sentence")}.`;

  return `Writing marked with ${level || "default"} rubric (${rubric.join(", ")}). Writing score: ${score}%. ${strengthText} ${issueText}`;
}

function buildWritingImprovementSummary({ score = 0, text = "" } = {}) {
  const issues = findWritingIssues(text);
  if (issues.length) {
    return `Writing focus: ${issues.map((issue) => `${highlightWritingSnippet(issue.submitted)} → ${issue.suggestion}`).join("; ")}`;
  }
  const expansionTarget = findWritingExpansionTarget(text);
  return score >= 75
    ? `Good structure. Keep improving accuracy and range by adding detail to ${highlightWritingSnippet(expansionTarget, "one sentence")}.`
    : "Improve task completion, sentence accuracy, structure, and level-appropriate vocabulary.";
}

function heuristicWritingMarker({ level = "", partId = "unknown", text = "" } = {}) {
  const words = tokenize(text);
  const wordCount = words.length;
  const hasGreeting = /\b(lieber|liebe|hallo|guten tag|sehr geehrte|dear|hello|hi)\b/i.test(text);
  const hasClosing = /\b(viele grusse|viele gruesse|mit freundlichen grussen|mit freundlichen gruessen|tschuss|bis bald|regards|sincerely|best wishes)\b/i.test(text);
  const connectors = (normalizeForCompare(text).match(/\b(und|aber|denn|weil|dass|deshalb|trotzdem|zuerst|danach|außerdem|ausserdem)\b/g) || []).length;
  const grammarSignal = estimateGrammarSignal(text);
  const targetWords = level === "B1" ? 85 : level === "A2" ? 55 : 30;
  const completion = Math.min(1, wordCount / targetWords);
  const structure = Math.min(1, ((hasGreeting ? 0.35 : 0) + (hasClosing ? 0.35 : 0) + (String(text).split(/\n+/).filter((line) => line.trim()).length > 1 ? 0.3 : 0.15)));
  const connectorScore = Math.min(1, connectors / (level === "B1" ? 4 : level === "A2" ? 3 : 1));
  const lexicalRange = Math.min(1, new Set(words).size / Math.max(8, wordCount * 0.7));

  const score = Math.round((completion * 0.3 + structure * 0.2 + grammarSignal * 0.25 + connectorScore * 0.1 + lexicalRange * 0.15) * 100);
  const confidence = Math.max(0.45, Math.min(0.9, 0.45 + completion * 0.25 + (hasGreeting || hasClosing ? 0.1 : 0) + (wordCount > 15 ? 0.1 : 0)));
  const rubric = WRITING_RUBRICS[level] || WRITING_RUBRICS.A1;

  const writingIssues = findWritingIssues(text);

  return {
    score,
    passed: score >= 60,
    level: level || "UNKNOWN",
    partId,
    feedback: buildWritingFeedback({ level, score, rubric, text }),
    corrections: writingIssues.map((issue) => ({
      partId,
      type: "writing",
      submitted: issue.submitted,
      suggestion: issue.suggestion,
      message: issue.message,
    })),
    improvementSummary: buildWritingImprovementSummary({ score, text }),
    confidence: Number(confidence.toFixed(2)),
    rubric,
  };
}

function stripBoldMarkdown(value = "") {
  return String(value || "").replace(/\*\*/g, "");
}

function combinePartFeedback(parts = []) {
  return stripBoldMarkdown(parts.map((part) => part.result?.feedback).filter(Boolean).join(" "));
}

function aggregatePartResults(parts = []) {
  const objectiveResults = parts.filter((part) => part.partType === "objective" && part.result);
  const writingResults = parts.filter((part) => part.partType === "writing" && part.result);

  const objectiveCorrect = objectiveResults.reduce((sum, part) => sum + (part.result.correct?.length || 0), 0);
  const objectiveTotal = objectiveResults.reduce((sum, part) => sum + (part.result.total || 0), 0);
  const objectivePercentage = objectiveTotal ? Math.round((objectiveCorrect / objectiveTotal) * 100) : null;
  const writingScore = writingResults.length
    ? Math.round(writingResults.reduce((sum, part) => sum + Number(part.result.score || 0), 0) / writingResults.length)
    : null;

  const availableScores = [objectivePercentage, writingScore].filter((value) => value !== null);
  const finalScore = availableScores.length ? Math.round(availableScores.reduce((sum, value) => sum + value, 0) / availableScores.length) : 0;
  const confidenceValues = parts.map((part) => Number(part.confidence || part.result?.confidence || 0)).filter(Boolean);
  const confidence = confidenceValues.length
    ? Number((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length).toFixed(2))
    : 0;

  return { objectiveCorrect, objectiveTotal, objectivePercentage, writingScore, finalScore, confidence };
}

function routeAndMarkSubmission({ referenceEntry = {}, submission = {}, submissionText = "", aiWritingMarker = heuristicWritingMarker } = {}) {
  const level = detectLevel({ submission, referenceEntry, submissionText });
  const assignmentKey = detectAssignmentKey({ submission, referenceEntry });
  const rawParts = splitSubmissionIntoParts(submissionText);

  const parts = rawParts.map((part) => {
    const partType = detectPartType({ level, partId: part.partId, text: part.text, referenceEntry });
    if (partType === "writing") {
      const writingResult = aiWritingMarker({ level, partId: part.partId, text: part.text, rubric: WRITING_RUBRICS[level] || WRITING_RUBRICS.A1 });
      return { ...part, partType, result: writingResult, confidence: Math.min(part.confidence || 0.5, writingResult.confidence || 0.5) };
    }

    const answerKey = getObjectiveAnswerKey(referenceEntry, part.partId);
    const objectiveResult = objectiveMarker(answerKey, part.text, { partId: part.partId });
    return { ...part, partType, result: objectiveResult, confidence: objectiveResult.confidence || part.confidence || 0.5 };
  });

  const aggregate = aggregatePartResults(parts);
  const hasWriting = parts.some((part) => part.partType === "writing");
  const isObjectiveAssignment = String(referenceEntry?.format || "").toLowerCase() === "objective";
  const unclearStructure = !level || !assignmentKey || (!isObjectiveAssignment && parts.some((part) => part.partId === "unknown" && !looksLikeWritingTask(part.text)));
  const objectiveNeedsReview = parts.some((part) => part.partType === "objective" && (part.result?.status === "needs_review" || part.result?.needsReview?.length));
  const missingRequiredObjectiveKey = parts.some((part) => part.partType === "objective" && !part.result?.total);
  const needsReview = unclearStructure || aggregate.confidence < WRITING_CONFIDENCE_THRESHOLD || missingRequiredObjectiveKey || objectiveNeedsReview;
  const status = needsReview ? "needs_review" : "marked";
  const shouldSendAutomatically = !hasWriting || aggregate.confidence >= WRITING_CONFIDENCE_THRESHOLD;

  return {
    score: aggregate.finalScore,
    passed: aggregate.finalScore >= 60,
    level: level || "UNKNOWN",
    assignmentKey,
    detectedParts: parts.map(({ partId, title, partType, confidence }) => ({ partId, title, partType, confidence })),
    parts,
    objectiveScore: aggregate.objectivePercentage,
    objectiveCorrect: aggregate.objectiveCorrect,
    objectiveTotal: aggregate.objectiveTotal,
    writingScore: aggregate.writingScore,
    finalScore: aggregate.finalScore,
    feedback: combinePartFeedback(parts),
    corrections: parts.flatMap((part) => part.result?.corrections || []),
    improvementSummary: stripBoldMarkdown(parts.map((part) => part.result?.improvementSummary).filter(Boolean).join("\n")),
    confidence: aggregate.confidence,
    status,
    shouldSendAutomatically,
    dataModel: {
      markingProfilePath: assignmentKey ? `markingProfiles/${assignmentKey}` : "markingProfiles/{assignmentKey}",
      answerKeyPath: assignmentKey ? `answerKeyRegistry/${assignmentKey}` : "answerKeyRegistry/{assignmentKey}",
      submissionPath: submission.id ? `submissions/${submission.id}` : "submissions/{submissionId}",
      markingResultPath: submission.id ? `markingResults/${submission.id}` : "markingResults/{submissionId}",
      markingJobPath: "markingJobs/{jobId}",
    },
  };
}

export function autoMarkSubmission({ referenceEntry = {}, submission = {}, submissionText = "", aiWritingMarker } = {}) {
  return routeAndMarkSubmission({ referenceEntry, submission, submissionText, aiWritingMarker });
}

function getReferenceObjectivePartIds(referenceEntry = {}) {
  const partIds = [];
  for (const key of Object.keys(referenceEntry.parts || {})) {
    const partId = findPartId(key);
    if (partId !== "unknown" && getObjectiveAnswerKey(referenceEntry, partId)) partIds.push(partId);
  }
  for (const source of [referenceEntry.answers, referenceEntry.answerKeys, referenceEntry.key, referenceEntry.answer_key]) {
    if (!source || typeof source !== "object" || Array.isArray(source)) continue;
    for (const key of Object.keys(source)) {
      const partId = findPartId(key);
      if (partId !== "unknown") partIds.push(partId);
    }
  }
  const textSources = [referenceEntry.answers, referenceEntry.answerKeys, referenceEntry.key].filter((value) => typeof value === "string");
  for (const text of textSources) {
    const matches = String(text).match(/\b(?:teil|part)\s*(?:[1-4]|eins|zwei|drei|vier|one|two|three|four)\b|\b(?:lesen|h[oö]ren|hoeren|reading|listening)\b/gi) || [];
    matches.map(findPartId).filter((partId) => partId !== "unknown").forEach((partId) => partIds.push(partId));
  }
  return [...new Set(partIds)].filter((partId) => partId !== "teil2");
}

function selectSubmissionTextForPart(submissionText = "", partId = "main") {
  if (partId === "main" || partId === "unknown") return submissionText;
  const matchingParts = splitSubmissionIntoParts(submissionText).filter((part) => part.partId === partId);
  if (!matchingParts.length) return submissionText;
  return matchingParts.map((part) => part.text).filter(Boolean).join("\n");
}

export function checkDeterministicObjectiveAnswers({ referenceEntry = {}, submissionText = "", partId = "main" } = {}) {
  const requestedParts = partId && partId !== "main" ? [partId] : getReferenceObjectivePartIds(referenceEntry);
  const partIds = requestedParts.length ? requestedParts : [partId || "main"];
  const markedParts = [];

  for (const currentPartId of partIds) {
    const answerKey = getObjectiveAnswerKey(referenceEntry, currentPartId === "main" ? "unknown" : currentPartId);
    const textForPart = selectSubmissionTextForPart(submissionText, currentPartId);
    const result = objectiveMarker(answerKey, textForPart, { partId: currentPartId });
    if (!result.total) continue;
    markedParts.push({ partId: currentPartId, partType: "objective", result });
  }

  if (!markedParts.length) return null;

  const objectiveCorrect = markedParts.reduce((sum, part) => sum + part.result.correct.length, 0);
  const objectiveTotal = markedParts.reduce((sum, part) => sum + part.result.total, 0);
  if (!objectiveTotal) return null;

  const wrongAnswers = markedParts.flatMap((part) => [...part.result.wrong, ...part.result.missing, ...part.result.needsReview].map((item) => ({
    partId: part.partId,
    question: item.question,
    expected: item.expected,
    student: item.student || item.submitted || "",
    ...(item.reason ? { reason: item.reason } : {}),
  })));

  return {
    objectiveScore: Math.round((objectiveCorrect / objectiveTotal) * 100),
    objectiveCorrect,
    objectiveTotal,
    wrongAnswers,
    detectedParts: markedParts.map((part) => {
      const base = {
        partId: part.partId,
        partType: "objective",
        correct: part.result.correct.length,
        total: part.result.total,
      };
      if (part.partId === "main") return base;
      const wrong = part.result.wrong.length + part.result.missing.length + part.result.needsReview.length;
      return {
        ...base,
        answerCount: part.result.total,
        wrong,
        summary: `${part.partId}: ${part.result.total} objective answers found, ${part.result.correct.length} correct, ${wrong} wrong`,
      };
    }),
    parts: markedParts,
    confidence: Math.min(...markedParts.map((part) => part.result.confidence || 0.95)),
  };
}

export {
  WRITING_CONFIDENCE_THRESHOLD,
  WRITING_RUBRICS,
  detectAssignmentKey,
  detectLevel,
  detectPartType,
  getObjectiveAnswerKey,
  heuristicWritingMarker,
  looksLikeWritingTask,
  normalizeAnswer,
  objectiveMarker,
  routeAndMarkSubmission,
  splitSubmissionIntoParts,
};

export const __testing__ = {
  normalizeForCompare,
  extractOptionLetter,
  extractOptionText,
  parseStudentObjectiveAnswers,
  extractVocabularyAnswers,
  objectiveMarker,
  splitSubmissionIntoParts,
  detectPartType,
  looksLikeWritingTask,
};
