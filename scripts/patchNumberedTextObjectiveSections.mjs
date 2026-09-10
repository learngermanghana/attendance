import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "src/utils/autoMarking.js");
let content = fs.readFileSync(file, "utf8");

function replaceOnce(needle, replacement, label) {
  if (content.includes(replacement)) return;
  if (!content.includes(needle)) throw new Error(`Could not find ${label}`);
  content = content.replace(needle, replacement);
}

function replaceAny(needles, replacement, label) {
  if (content.includes(replacement)) return;
  const needle = needles.find((candidate) => content.includes(candidate));
  if (!needle) throw new Error(`Could not find ${label}`);
  content = content.replace(needle, replacement);
}

replaceAny(
  [
    'const markerRegex = /(?:^|\\n)\\s*((?:teil|part)\\s*(?:[1-4]|eins|zwei|drei|vier|one|two|three|four)\\b[^\\n]*|(?:schreiben|lesen|h[oö]ren|hoeren|writing|reading|listening)\\b[^\\n]*)\\s*:?\\s*(?=\\n|$)/gi;',
    'const markerRegex = /(?:^|\\n)\\s*((?:teil|part)\\s*(?:[1-4]|iv|iii|ii|i|eins|zwei|drei|vier|one|two|three|four)\\b[^\\n]*|(?:schreiben|lesen|h[oö]ren|hoeren|writing|reading|listening)\\b[^\\n]*)\\s*:?\\s*(?=\\n|$)/gi;',
  ],
  'const markerRegex = /(?:^|\\n)\\s*((?:teil|part)\\s*\\(?\\s*(?:[1-4]|iv|iii|ii|i|eins|zwei|drei|vier|one|two|three|four)(?=\\s|\\)|:|$)\\s*\\)?[^\\n]*|(?:schreiben|lesen|h[oö]ren|hoeren|writing|reading|listening)\\b[^\\n]*)\\s*:?\\s*(?=\\n|$)/gi;',
  "part heading parser",
);

replaceAny(
  [
    'const textAnswer = trimmed.match(/^(?:answer|antwort|frage|aufgabe|task|exercise|nr\\.?|q)?\\s*(\\d{1,3})\\s*[).:–-]\\s*(.+)$/i);',
    'const textAnswer = trimmed.match(/^(?:answer|antwort|frage|aufgabe|task|exercise|nr\\.?|q)?\\s*(?:\\d{1,3}\\s*[.]\\s*)?(\\d{1,3})\\s*[).:–-]\\s*(.+)$/i);',
  ],
  'const textAnswer = trimmed.match(/^(?:answer|antwort|frage|aufgabe|task|exercise|nr\\.?|q)?\\s*(?:\\d{1,3}\\s*[.]\\s*)?(\\d{1,3})\\s*(?:[).:–-]|\\()\\s*(.+)$/i);',
  "numbered text answer parser",
);

replaceOnce(
  '    if (numbered && isObjectiveOptionAnswer(numbered.answer)) return count + 1;',
  '    if (numbered && String(numbered.answer || "").trim()) return count + 1;',
  "objective evidence counter",
);

replaceOnce(
  '  const parts = splitSubmissionIntoParts(text).filter((part) => part.partId !== "unknown");\n  const objectiveParts = parts.filter((part) => countObjectiveAnswerEvidence(part.text) > 0);',
  '  const parts = splitSubmissionIntoParts(text).filter((part) => part.partId !== "unknown");\n  const objectiveParts = parts.filter((part) => countObjectiveAnswerEvidence(part.text) > 0);',
  "objective part selection",
);

const trailingTextRecovery = `function recoverTrailingSequentialTextObjectiveAnswers(studentAnswers, entries, submissionText = "") {
  if (!(studentAnswers instanceof Map) || !studentAnswers.size || !Array.isArray(entries) || !entries.length) {
    return studentAnswers;
  }

  const mappedQuestions = [...studentAnswers.keys()].filter((question) => Number.isInteger(question) && question > 0);
  if (!mappedQuestions.length) return studentAnswers;

  const highestMappedQuestion = Math.max(...mappedQuestions);
  if (highestMappedQuestion >= entries.length) return studentAnswers;

  const remainingEntries = entries
    .map((entry, index) => ({
      question: getQuestionIndex(entry.key) || index + 1,
      value: entry.value,
    }))
    .filter(({ question }) => question > highestMappedQuestion && !studentAnswers.has(question));

  if (!remainingEntries.length) return studentAnswers;

  const isTextReference = ({ value }) => {
    const meta = expectedMetadata(value);
    const normalized = normalizeAnswer(meta.raw);
    if (normalized === "R" || normalized === "F") return false;
    return !(meta.correctLetter || extractOptionLetter(meta.raw));
  };

  // Only infer order when every unanswered item after the last numbered response
  // is a text-answer question. This keeps the recovery deterministic and avoids
  // accidentally consuming prose from mixed objective/writing submissions.
  if (!remainingEntries.every(isTextReference)) return studentAnswers;

  const lines = String(submissionText || "")
    .split(/\\r?\\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let anchorIndex = -1;
  lines.forEach((line, index) => {
    const numbered = parseNumberedObjectiveLine(line);
    if (numbered?.question === highestMappedQuestion) anchorIndex = index;
  });
  if (anchorIndex < 0) return studentAnswers;

  const trailingCandidates = lines.slice(anchorIndex + 1).filter((line) => {
    if (!line) return false;
    if (parseNumberedObjectiveLine(line) || parsePrefixedObjectiveAnswer(line) || isObjectiveOptionAnswer(line)) return false;
    if (/^(?:teil|part)\\b|^(?:schreiben|lesen|h[oö]ren|hoeren|writing|reading|listening)\\b/i.test(line)) return false;
    if (/^(?:student submission|reference answer|answer key)\\b/i.test(line)) return false;
    if (/[?]/.test(line)) return false;

    const normalized = normalizeForCompare(line);
    if (!normalized) return false;
    const wordCount = normalized.split(" ").filter(Boolean).length;
    return wordCount >= 1 && wordCount <= 6 && line.length <= 80;
  });

  // Without numbering, a missing answer would make later answers ambiguous.
  // Recover only when the remaining short lines map one-to-one to the remaining
  // text questions.
  if (trailingCandidates.length !== remainingEntries.length) return studentAnswers;

  const recovered = new Map(studentAnswers);
  remainingEntries.forEach(({ question }, index) => {
    recovered.set(question, trailingCandidates[index]);
  });
  return recovered;
}`;

if (!content.includes("function recoverTrailingSequentialTextObjectiveAnswers(")) {
  replaceOnce(
    "const VOCABULARY_ALIASES = {",
    `${trailingTextRecovery}\n\nconst VOCABULARY_ALIASES = {`,
    "trailing sequential text objective recovery helper",
  );
}

replaceOnce(
  '  studentAnswers = alignLabeledPartialObjectiveAnswers(studentAnswers, entries, submissionText);',
  '  studentAnswers = recoverTrailingSequentialTextObjectiveAnswers(studentAnswers, entries, submissionText);\n  studentAnswers = alignLabeledPartialObjectiveAnswers(studentAnswers, entries, submissionText);',
  "objective text recovery hook",
);

fs.writeFileSync(file, content, "utf8");
console.log("Patched numbered and trailing unnumbered text objective sections.");
