import fs from "node:fs";

const target = new URL("../src/services/markingServiceBase.js", import.meta.url);
let source = fs.readFileSync(target, "utf8");

const replaceOnce = (before, after, label) => {
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`Could not patch ${label}: source anchor changed.`);
  source = source.replace(before, after);
};

if (!source.includes('from "../utils/structuredSubmissionPayload.js"')) {
  replaceOnce(
    'import { shouldIncludeInIncomingQueue } from "../utils/markingQueue.js";',
    'import { shouldIncludeInIncomingQueue } from "../utils/markingQueue.js";\nimport { resolveStructuredSubmissionText } from "../utils/structuredSubmissionPayload.js";',
    "structured submission resolver import",
  );
}

replaceOnce(
  '  const text = normalize(data.text || data.answer || data.answers || data.content || data.message || data.submissionText || data.writing || data.work || "");',
  `  const legacyText = normalize(data.text || data.answer || data.answers || data.content || data.message || data.submissionText || data.writing || data.work || "");\n  const structuredSections = data.structuredSections || data.submissionSections || null;\n  const submissionSectionOrder = data.submissionSectionOrder || data.requiredSubmissionParts || [];\n  const text = resolveStructuredSubmissionText({\n    structuredSections,\n    sectionOrder: submissionSectionOrder,\n    fallbackText: legacyText,\n  });`,
  "submission text normalization",
);

replaceOnce(
  `    text,\n    assignment,`,
  `    text,\n    structuredSections,\n    submissionSectionOrder,\n    submissionStructureVersion: data.submissionStructureVersion || null,\n    assignment,`,
  "structured submission row fields",
);

const requiredMarkers = [
  'from "../utils/structuredSubmissionPayload.js"',
  "const structuredSections = data.structuredSections || data.submissionSections || null;",
  "const submissionSectionOrder = data.submissionSectionOrder || data.requiredSubmissionParts || [];",
  "resolveStructuredSubmissionText({",
  "submissionStructureVersion: data.submissionStructureVersion || null",
];

requiredMarkers.forEach((marker) => {
  if (!source.includes(marker)) throw new Error(`Structured submission admin marker missing: ${marker}`);
});

fs.writeFileSync(target, source, "utf8");
console.log("Admin marking now prefers structured submission sections with legacy text fallback.");
