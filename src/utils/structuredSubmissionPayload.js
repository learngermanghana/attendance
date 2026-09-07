const normalizePartId = (value = "") => {
  const raw = String(value || "").trim().toLowerCase();
  const numbered = raw.match(/(?:teil|part)[-_ ]?([1-4])/);
  if (numbered?.[1]) return `teil${Number(numbered[1])}`;
  if (/^[1-4]$/.test(raw)) return `teil${Number(raw)}`;
  return "";
};

const readSectionText = (value) => {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (!value || typeof value !== "object") return "";
  return String(value.text ?? value.answer ?? value.content ?? value.value ?? "").trim();
};

const partNumber = (partId = "") => Number(String(partId || "").replace(/\D+/g, "")) || 0;

export function normalizeStructuredSubmissionSections(structuredSections = null) {
  const normalized = new Map();

  if (Array.isArray(structuredSections)) {
    structuredSections.forEach((entry, index) => {
      const partId = normalizePartId(entry?.partId || entry?.id || entry?.key || entry?.partNumber || index + 1);
      if (!partId) return;
      normalized.set(partId, readSectionText(entry));
    });
    return normalized;
  }

  if (!structuredSections || typeof structuredSections !== "object") return normalized;

  Object.entries(structuredSections).forEach(([key, value]) => {
    const partId = normalizePartId(key) || normalizePartId(value?.partId || value?.id || value?.partNumber);
    if (!partId) return;
    normalized.set(partId, readSectionText(value));
  });

  return normalized;
}

export function buildSubmissionTextFromStructuredSections(structuredSections = null, sectionOrder = []) {
  const normalized = normalizeStructuredSubmissionSections(structuredSections);
  if (!normalized.size) return "";

  const requestedOrder = (Array.isArray(sectionOrder) ? sectionOrder : [])
    .map(normalizePartId)
    .filter((partId, index, values) => partId && values.indexOf(partId) === index && normalized.has(partId));

  const remaining = [...normalized.keys()]
    .filter((partId) => !requestedOrder.includes(partId))
    .sort((left, right) => partNumber(left) - partNumber(right));

  return [...requestedOrder, ...remaining]
    .map((partId) => {
      const number = partNumber(partId);
      return `Teil ${number}\n${normalized.get(partId) || ""}`.trim();
    })
    .join("\n\n")
    .trim();
}

export function resolveStructuredSubmissionText({
  structuredSections = null,
  sectionOrder = [],
  fallbackText = "",
} = {}) {
  const structuredText = buildSubmissionTextFromStructuredSections(structuredSections, sectionOrder);
  return structuredText || String(fallbackText || "").trim();
}
