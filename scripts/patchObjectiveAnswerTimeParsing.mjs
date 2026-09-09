import fs from "node:fs";

const objectiveTarget = new URL("../src/utils/objectiveMarking.js", import.meta.url);
let objectiveSource = fs.readFileSync(objectiveTarget, "utf8");

const legacyCompactPattern = '  const compactPattern = /(?:^|\\s)(\\d{1,3})\\s*[).:–-]?\\s*(.*?)(?=\\s+\\d{1,3}\\s*[).:–-]?|$)/g;';
const timeSafeCompactPattern = '  const compactPattern = /(?:^|\\s)(\\d{1,3})(?:\\s*[).:–-](?!\\d)\\s*|\\s+)(.*?)(?=\\s+\\d{1,3}(?:\\s*[).:–-](?!\\d)\\s*|\\s+)|$)/g;';
const priceAndTimeSafeCompactPattern = '  const compactPattern = /(?:^|\\s)(\\d{1,3})(?:\\s*[)–-]\\s*|\\s*[.,:](?!\\d)\\s*|\\s+(?=[A-FX](?:\\s*[).,:–-]|\\s|$)))(.*?)(?=\\s+\\d{1,3}(?:\\s*[)–-]\\s*|\\s*[.,:](?!\\d)\\s*|\\s+(?=[A-FX](?:\\s*[).,:–-]|\\s|$)))|$)/g;';

if (objectiveSource.includes(legacyCompactPattern)) {
  objectiveSource = objectiveSource.replace(legacyCompactPattern, timeSafeCompactPattern);
} else if (!objectiveSource.includes(timeSafeCompactPattern) && !objectiveSource.includes(priceAndTimeSafeCompactPattern)) {
  throw new Error("objective answer compact parser changed; update patchObjectiveAnswerTimeParsing.mjs");
}

fs.writeFileSync(objectiveTarget, objectiveSource);

const feedbackTarget = new URL("../src/utils/naturalMarkingFeedback.js", import.meta.url);
let feedbackSource = fs.readFileSync(feedbackTarget, "utf8");

const legacyDescription = '    const descriptions = groupedEntries.map(([part, questions]) => `${part === "main" ? "questions" : part} ${humanList(questions)}`);';
const clearerDescription = '    const descriptions = groupedEntries.map(([part, questions]) => part === "main"\n      ? `questions ${humanList(questions)}`\n      : `${part} question${questions.length === 1 ? "" : "s"} ${humanList(questions)}`);';

if (feedbackSource.includes(legacyDescription)) {
  feedbackSource = feedbackSource.replace(legacyDescription, clearerDescription);
} else if (!feedbackSource.includes(clearerDescription)) {
  throw new Error("multipart feedback description changed; update patchObjectiveAnswerTimeParsing.mjs");
}

fs.writeFileSync(feedbackTarget, feedbackSource);
console.log("Objective parsing now preserves clock times and labels multipart review questions clearly.");
await import("./patchA1TimeRestartedPartParsing.mjs");
