const MAX_ID_PART_LENGTH = 120;

export function normalizeIdPart(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_ID_PART_LENGTH);
}

export function getAssignmentNumber(topic, fallbackValue = "") {
  const topicText = String(topic || "");
  const chapterMatch = topicText.match(/\bchapter\s+(\d+(?:\.\d+)?(?:\s*(?:and|&)\s*\d+(?:\.\d+)?)?)/i);
  if (chapterMatch?.[1]) {
    return chapterMatch[1].replace(/\s*(?:and|&)\s*/gi, "_").replace(/\s+/g, "");
  }

  const match = topicText.match(/(\d+(?:\.\d+)?)/);
  return match?.[1] || String(fallbackValue || "");
}

export function buildChapterKey(title) {
  const cleanedTitle = String(title || "")
    .replace(/^\s*[A-Z]\d\s*[-:_]?\s*/i, "")
    .trim();

  return normalizeIdPart(cleanedTitle);
}

export function buildSubmissionAssignmentId({ title, preferredLevel, entry } = {}) {
  const level = normalizeIdPart(preferredLevel || "general") || "general";
  const assignmentFromEntry = normalizeIdPart(entry?.assignmentId || entry?.assignment_id || "");
  if (assignmentFromEntry) return `${level}-${assignmentFromEntry}`;

  const chapterFromEntry = normalizeIdPart(entry?.chapter || "");
  if (chapterFromEntry) return `${level}-${chapterFromEntry}`;

  const normalizedNumber = normalizeIdPart(getAssignmentNumber(title));
  if (normalizedNumber) return `${level}-${normalizedNumber}`;

  const chapterKey = buildChapterKey(title);
  if (chapterKey) return `${level}-${chapterKey}`;

  return `${level}-${normalizeIdPart(title || "") || "assignment"}`;
}

export function buildAssignmentId(level, topic, fallbackValue = "") {
  const safeLevel = String(level || "").trim().toUpperCase();
  const number = getAssignmentNumber(topic, fallbackValue);
  if (!safeLevel) return number;
  if (!number) return safeLevel;
  return `${safeLevel}-${number}`;
}
