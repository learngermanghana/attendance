export function getAssignmentNumber(topic, fallbackValue = "") {
  const match = String(topic || "").match(/(\d+(?:\.\d+)?)/);
  return match?.[1] || String(fallbackValue || "");
}

export function buildAssignmentId(level, topic, fallbackValue = "") {
  const safeLevel = String(level || "").trim().toUpperCase();
  const number = getAssignmentNumber(topic, fallbackValue);
  if (!safeLevel) return number;
  if (!number) return safeLevel;
  return `${safeLevel}-${number}`;
}
