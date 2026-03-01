function normalizeForCompare(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractOptionLetter(value) {
  const match = String(value || "").trim().match(/^([A-Z])\s*[\).:-]?/i);
  return match ? match[1].toUpperCase() : "";
}

function extractOptionText(value) {
  return String(value || "")
    .replace(/^\s*[A-Z]\s*[\).:-]?\s*/i, "")
    .trim();
}

function getQuestionIndex(key) {
  const match = String(key || "").match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function parseStudentObjectiveAnswers(submissionText = "") {
  const lines = String(submissionText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const explicitByIndex = new Map();
  const implicitByOrder = [];

  for (const line of lines) {
    const explicitMatch = line.match(/^(?:answer\s*)?(\d{1,3})\s*[\).:-]?\s*(.+)$/i);
    if (explicitMatch) {
      explicitByIndex.set(Number.parseInt(explicitMatch[1], 10), explicitMatch[2].trim());
      continue;
    }

    implicitByOrder.push(line);
  }

  return { explicitByIndex, implicitByOrder };
}

function scoreObjective(referenceAnswers = {}, submissionText = "") {
  const { explicitByIndex, implicitByOrder } = parseStudentObjectiveAnswers(submissionText);
  const entries = Object.entries(referenceAnswers || {});

  const total = entries.length;
  if (!total) {
    return {
      score: 0,
      feedback: "Could not auto-mark objective answers because no reference options were found.",
    };
  }

  let matched = 0;
  const missed = [];

  for (const [position, [key, value]] of entries.entries()) {
    const questionIndex = getQuestionIndex(key);
    const studentRaw = (questionIndex ? explicitByIndex.get(questionIndex) : "") || implicitByOrder[position] || "";

    const expectedLetter = extractOptionLetter(value);
    const expectedText = normalizeForCompare(extractOptionText(value));

    const studentTextNormalized = normalizeForCompare(studentRaw);
    const studentLetter = extractOptionLetter(studentRaw);

    const letterMatches = Boolean(expectedLetter && studentLetter && studentLetter === expectedLetter);
    const textMatches = Boolean(expectedText && studentTextNormalized && (
      studentTextNormalized.includes(expectedText) || expectedText.includes(studentTextNormalized)
    ));

    if (letterMatches || textMatches) {
      matched += 1;
    } else {
      missed.push(questionIndex || key);
    }
  }

  const score = Math.round((matched / total) * 100);
  const missedPreview = missed.slice(0, 6).join(", ");
  const missedSuffix = missed.length > 6 ? ` (+${missed.length - 6} more)` : "";

  const feedback = matched === total
    ? `Auto-marked objective answers: ${matched}/${total} correct. Great work.`
    : `Auto-marked objective answers: ${matched}/${total} correct. Review and improve missed items: ${missedPreview}${missedSuffix}.`;

  return { score, feedback };
}

function tokenize(value) {
  return normalizeForCompare(value)
    .split(" ")
    .filter((token) => token.length > 2);
}

function scoreWriting(referenceText = "", submissionText = "") {
  const referenceTokens = new Set(tokenize(referenceText));
  const submissionTokens = new Set(tokenize(submissionText));

  if (!referenceTokens.size || !submissionTokens.size) {
    return {
      score: 0,
      feedback: "Auto-mark could not find enough content. Please review manually.",
    };
  }

  let overlapCount = 0;
  for (const token of submissionTokens) {
    if (referenceTokens.has(token)) overlapCount += 1;
  }

  const precision = overlapCount / submissionTokens.size;
  const recall = overlapCount / referenceTokens.size;
  const harmonic = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const score = Math.max(0, Math.min(100, Math.round(harmonic * 100)));

  return {
    score,
    feedback: `Auto-marked writing similarity score: ${score}%. Please review wording, grammar, and task completeness before saving.`,
  };
}

export function autoMarkSubmission({ referenceEntry, submissionText }) {
  const format = String(referenceEntry?.format || "").toLowerCase();
  const answers = referenceEntry?.answers;
  const referenceText = String(referenceEntry?.reference || "").trim();

  if (format === "objective" && answers && typeof answers === "object") {
    return scoreObjective(answers, submissionText);
  }

  const flattenedReference = referenceText || Object.values(answers || {}).join(" ");
  return scoreWriting(flattenedReference, submissionText);
}

export const __testing__ = {
  normalizeForCompare,
  extractOptionLetter,
  extractOptionText,
  parseStudentObjectiveAnswers,
  scoreObjective,
  scoreWriting,
};
