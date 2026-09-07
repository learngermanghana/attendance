import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { parseSubmissionSections } from "../src/utils/submissionSections.js";
import {
  buildSubmissionTextFromStructuredSections,
  normalizeStructuredSubmissionSections,
  resolveStructuredSubmissionText,
} from "../src/utils/structuredSubmissionPayload.js";

test("structured submission sections rebuild deterministic Teil headings in canonical order", () => {
  const structuredSections = {
    teil4: "1. A\n2. B",
    teil2: "Hallo Anna, ich schreibe dir heute.",
    teil3: "1. B\n2. C",
  };

  const text = buildSubmissionTextFromStructuredSections(structuredSections, ["teil2", "teil3", "teil4"]);
  assert.equal(
    text,
    "Teil 2\nHallo Anna, ich schreibe dir heute.\n\nTeil 3\n1. B\n2. C\n\nTeil 4\n1. A\n2. B",
  );

  const parsed = parseSubmissionSections(text);
  assert.deepEqual(parsed.map((section) => section.partId), ["teil2", "teil3", "teil4"]);
  assert.equal(parsed[1].text, "1. B\n2. C");
});

test("supports nested section objects and falls back to legacy text when structure is absent", () => {
  const normalized = normalizeStructuredSubmissionSections({
    "Teil 2": { text: "Brief" },
    teil3: { answer: "1. C" },
  });
  assert.equal(normalized.get("teil2"), "Brief");
  assert.equal(normalized.get("teil3"), "1. C");

  assert.equal(
    resolveStructuredSubmissionText({ structuredSections: null, fallbackText: "Teil 3\n1. B" }),
    "Teil 3\n1. B",
  );
});

test("marking service normalization prefers structuredSections over duplicated legacy answer text", () => {
  const source = fs.readFileSync(new URL("../src/services/markingServiceBase.js", import.meta.url), "utf8");
  assert.match(source, /from "\.\.\/utils\/structuredSubmissionPayload\.js"/);
  assert.match(source, /const structuredSections = data\.structuredSections \|\| data\.submissionSections \|\| null/);
  assert.match(source, /resolveStructuredSubmissionText\(\{/);
  assert.match(source, /submissionSectionOrder: data\.submissionSectionOrder \|\| data\.requiredSubmissionParts \|\| \[\]/);
});
