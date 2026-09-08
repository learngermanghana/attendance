import fs from "node:fs";

const replacements = [
  {
    path: new URL("../src/utils/objectiveMarking.js", import.meta.url),
    pairs: [
      ['(?:\\\\s*[().:-]|\\\\s+|$)', '(?:\\\\s*[().:/-]|\\\\s+|$)'],
      ['(?:\\\\s*[().:-]|\\\\s+)', '(?:\\\\s*[().:/-]|\\\\s+)'],
    ],
  },
  {
    path: new URL("../src/utils/autoMarking.js", import.meta.url),
    pairs: [
      ['(?:\\s*[).:-]|\\s+|$)', '(?:\\s*[).:/-]|\\s+|$)'],
      ['(?:\\s*[).:-]|\\s+)', '(?:\\s*[).:/-]|\\s+)'],
    ],
  },
  {
    path: new URL("../api/router.js", import.meta.url),
    pairs: [
      ['(?:\\\\s*[().:-]|\\\\s+|$)', '(?:\\\\s*[().:/-]|\\\\s+|$)'],
      ['(?:\\\\s*[().:-]|\\\\s+)', '(?:\\\\s*[().:/-]|\\\\s+)'],
    ],
  },
];

for (const target of replacements) {
  let source = fs.readFileSync(target.path, "utf8");
  for (const [legacy, updated] of target.pairs) {
    if (source.includes(updated)) continue;
    if (!source.includes(legacy)) throw new Error(`Slash option parsing anchor changed in ${target.path.pathname}`);
    source = source.replace(legacy, updated);
  }
  fs.writeFileSync(target.path, source);
}

// Some A2/B1 submissions use explicit Teil headings but paste the multiple-choice
// answers as one bare option per line, e.g. "Teil 3\nC\nA\nB\nC\nA". The
// deterministic section parser previously accepted numbered answers or bilingual
// vocabulary pairs only, so these valid objective blocks were treated as empty.
// Keep this fallback narrow: every non-empty line in the section must itself look
// like a choice answer, which prevents prose/writing sections from becoming
// positional objective answers.
const unnumberedChoiceTarget = new URL("../src/utils/objectiveMarking.js", import.meta.url);
let unnumberedChoiceSource = fs.readFileSync(unnumberedChoiceTarget, "utf8");
const unnumberedChoiceAnchor = [
  'function extractSectionAnswerEntries(text = "") {',
  '  const numberedEntries = extractRestartedNumberingEntries(text);',
  '  if (numberedEntries.length) return numberedEntries;',
  '',
  '  // Vocabulary sections are sometimes pasted as unnumbered bilingual pairs.',
].join("\n");
const unnumberedChoiceReplacement = [
  'function extractSectionAnswerEntries(text = "") {',
  '  const numberedEntries = extractRestartedNumberingEntries(text);',
  '  if (numberedEntries.length) return numberedEntries;',
  '',
  '  const unnumberedLines = String(text || "")',
  '    .split(/\\r?\\n/)',
  '    .map((line) => line.trim())',
  '    .filter(Boolean);',
  '  const unnumberedChoicePattern = /^[A-FX](?:(?:\\s*[).:/-]\\s*.*)|(?:\\s+.+))?$/i;',
  '  if (unnumberedLines.length >= 2 && unnumberedLines.every((line) => unnumberedChoicePattern.test(line))) {',
  '    return unnumberedLines.map((answer, index) => ({ number: index + 1, answer }));',
  '  }',
  '',
  '  // Vocabulary sections are sometimes pasted as unnumbered bilingual pairs.',
].join("\n");
if (!unnumberedChoiceSource.includes("const unnumberedChoicePattern = /^[A-FX]")) {
  if (!unnumberedChoiceSource.includes(unnumberedChoiceAnchor)) {
    throw new Error("Unnumbered objective choice-block anchor changed in objectiveMarking.js");
  }
  unnumberedChoiceSource = unnumberedChoiceSource.replace(unnumberedChoiceAnchor, unnumberedChoiceReplacement);
}

// Explicitly labelled sections take precedence over all flat fallback parsing. Use
// the same section-aware extractor here as well; otherwise a valid bare-choice
// block is discovered above but discarded by the labelled-section resolver.
const matchingSectionBefore = [
  '  if (matchingSectionText !== undefined) {',
  '    const matchingSectionAnswers = extractNumberedTextAnswers(matchingSectionText);',
  '    return matchingSectionAnswers[item.questionNumber] ?? "";',
  '  }',
].join("\n");
const matchingSectionAfter = [
  '  if (matchingSectionText !== undefined) {',
  '    const matchingSectionAnswers = Object.fromEntries(',
  '      extractSectionAnswerEntries(matchingSectionText).map((entry) => [entry.number, entry.answer]),',
  '    );',
  '    return matchingSectionAnswers[item.questionNumber] ?? "";',
  '  }',
].join("\n");
if (unnumberedChoiceSource.includes(matchingSectionBefore)) {
  unnumberedChoiceSource = unnumberedChoiceSource.replace(matchingSectionBefore, matchingSectionAfter);
} else if (!unnumberedChoiceSource.includes(matchingSectionAfter)) {
  throw new Error("Labelled objective section resolver anchor changed in objectiveMarking.js");
}

fs.writeFileSync(unnumberedChoiceTarget, unnumberedChoiceSource);
console.log("Slash-separated and unnumbered multipart objective choice answers are parsed deterministically.");
