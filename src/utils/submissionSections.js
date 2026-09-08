function normalizedLabel(value = "") {
  return String(value || "")
    .toLocaleLowerCase("de")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, "")
    .trim();
}

function partNumberFromToken(value = "") {
  const token = String(value || "").trim().toUpperCase();
  if (/^[1-4]$/.test(token)) return Number(token);
  return ({ I: 1, II: 2, III: 3, IV: 4 })[token] || null;
}

export function normalizeSubmissionPart(label = "", explicitNumber = "") {
  const normalized = normalizedLabel(label);
  const explicitPart = partNumberFromToken(explicitNumber);
  const rawLabel = String(label || "");

  // Some B1 workbook exports repeat the Schreiben prefix for later sections,
  // producing the exact heading style "Teil 2 · Lesen" / "Teil 2 · Hören".
  // Scope the correction to the middle-dot workbook heading so legacy exam
  // prompts such as "Teil 2. Lesen Sie ..." keep their intentional part number.
  if (explicitPart === 2 && /(?:teil|tiel|part)\s*2\s*·\s*(?:lesen|reading)\b/i.test(rawLabel)) return "teil3";
  if (explicitPart === 2 && /(?:teil|tiel|part)\s*2\s*·\s*(?:h[oö]ren|hoeren|listening|audio)\b/i.test(rawLabel)) return "teil4";

  if (explicitPart) return `teil${explicitPart}`;
  const numbered = normalized.match(/(?:teil|tiel|part)([1-4]|i{1,3}|iv)/i);
  const numberedPart = partNumberFromToken(numbered?.[1]);
  if (numberedPart) return `teil${numberedPart}`;
  if (/schreiben|writing/.test(normalized)) return "teil2";
  if (/lesen|reading/.test(normalized)) return "teil3";
  if (/horen|hoeren|listening|audio/.test(normalized)) return "teil4";
  return "main";
}

function normalizeLeadingShortAnswerBlock(text = "") {
  const raw = String(text || "");
  const blocks = raw.split(/\n\s*\n+/);
  if (blocks.length !== 2) return raw;

  const leadingLines = blocks[0]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (leadingLines.length !== 5) return raw;

  const invalidLeadingLine = leadingLines.some((line) => {
    if (/^(?:teil|tiel|part)\b|^(?:lesen|reading|h[oö]ren|hoeren|listening|schreiben|writing)\b/i.test(line)) return true;
    if (/^\s*(?:answer|antwort|frage|question|aufgabe|task|exercise|nr\.?|q)?\s*\d{1,3}\s*[).:–-]/i.test(line)) return true;
    if (/\?\s*$/.test(line)) return true;
    return line.split(/\s+/).length !== 1;
  });
  if (invalidLeadingLine) return raw;

  const numberedChoiceLines = blocks[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (numberedChoiceLines.length !== 7) return raw;

  const numbers = numberedChoiceLines.map((line) => {
    const match = line.match(/^\s*(\d{1,3})\s*[).:–-]?\s*([A-FX])(?:\s*[).,:;–-]|\s|$)/i);
    return match ? Number(match[1]) : null;
  });
  if (numbers.some((number) => number === null)) return raw;
  if (!numbers.every((number, index) => number === index + 1)) return raw;

  const startNumber = numbers.length + 1;
  const normalizedLeading = leadingLines
    .map((line, index) => `${startNumber + index}) ${line}`)
    .join("\n");

  return `${normalizedLeading}\n\n${blocks[1]}`;
}

function normalizeQSectionAliases(text = "") {
  const raw = String(text || "");
  const alias = /(^|\n)[ \t]*q(?:uestion)?[ \t]*([1-4])(?:\.[ \t]*\d+(?=[ \t]+\d{1,3}\s*[).:])|\.[ \t]*(?=\d{1,3}\s*[).:])|(?=[ \t]*(?:\n|$)))[ \t]*/gi;
  const normalized = raw.replace(alias, (_match, prefix, partNumber) => `${prefix}Teil ${partNumber}\n`);

  const hasImplicitOpeningAnswers = normalized !== raw
    && /^\s*\d{1,3}\s*[).:]/.test(normalized)
    && /(?:^|\n)Teil 2\n/i.test(normalized);

  return hasImplicitOpeningAnswers ? `Teil 1\n${normalized}` : normalized;
}

function normalizeQuestionAnswerPayload(value = "") {
  let answer = String(value || "")
    .replace(/^\s*(?:ans(?:wer)?|antwort)\s*[:.-]?\s*/i, "")
    .trim();
  if (!answer) return "";

  let option = "";
  const leadingOption = answer.match(/^([A-FX])(?:\s*[.)]\s*|\s+|$)/i);
  if (leadingOption) {
    option = leadingOption[1].toUpperCase();
    answer = answer.slice(leadingOption[0].length).trim();
  } else {
    const trailingOption = answer.match(/\s+([A-FX])\s*[.)]?\s*$/i);
    if (trailingOption) {
      option = trailingOption[1].toUpperCase();
      answer = answer.slice(0, trailingOption.index).trim();
    }
  }

  if (/^\d{1,2}\s*:\s*\d{2}\s*(?:uhr)?[.!]?\s*$/i.test(answer)) {
    answer = `Um ${answer}`;
  }

  if (option && answer) return `${option}) ${answer}`;
  if (option) return option;
  return answer;
}

function normalizeNumberedQuestionAnswerPairs(text = "") {
  const lines = String(text || "").split(/\r?\n/);
  const normalized = [];

  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index];
    const question = current.match(/^(\s*)(\d{1,3})\s*[).:–-]\s*(.+\?)\s*$/);
    const next = lines[index + 1] || "";
    const nextIsAnswer = /^\s*(?:ans(?:wer)?|antwort)\s*[:.-]?\s*\S/i.test(next);

    if (question && nextIsAnswer) {
      const answer = normalizeQuestionAnswerPayload(next);
      if (answer) {
        normalized.push(`${question[1]}${Number(question[2])}) ${answer}`);
        index += 1;
        continue;
      }
    }

    normalized.push(current);
  }

  return normalized.join("\n");
}

function normalizeStandaloneAnswerPrefixes(text = "") {
  return String(text || "").replace(
    /(^|\n)([ \t]*)(?:ans(?:wer)?|antwort)[ \t]*[:.-]?[ \t]*([A-FX])(?:[ \t]*[.)])?[ \t]*(?=\n|$)/gi,
    (_match, prefix, indent, option) => `${prefix}${indent}${option.toUpperCase()}`,
  );
}

function normalizeCompactObjectiveSeparators(text = "") {
  return String(text || "").replace(
    /\s*[·•|]\s*(?=\d{1,3}\s*[A-FX](?:\b|[).,:;–-]))/gi,
    " ",
  );
}

export function parseSubmissionSections(text = "") {
  const source = normalizeStandaloneAnswerPrefixes(
    normalizeNumberedQuestionAnswerPairs(
      normalizeQSectionAliases(normalizeLeadingShortAnswerBlock(text)),
    ),
  );
  const markerRegex = /(?:^|\n)[ \t]*((?:teil|tiel|part)[ \t]*([1-4]|I{1,3}|IV)(?:[ \t]*(?:[.:;|·•–-][ \t]*)?(?:lesen|reading|h[oö]ren|hoeren|listening|schreiben|writing))?|lesen|reading|h[oö]ren|hoeren|listening|schreiben|writing)[ \t]*(?:\([^\n)]*\))?[ \t]*[.:;]?[ \t]*/gi;
  const markers = [];
  let match;

  while ((match = markerRegex.exec(source))) {
    const partId = normalizeSubmissionPart(match[1], match[2]);
    markers.push({
      index: match.index,
      end: markerRegex.lastIndex,
      partId,
      partNumber: Number(partId.replace("teil", "")) || null,
      heading: String(match[1] || "").trim(),
    });
  }

  if (!markers.length) {
    return [{ partId: "main", partNumber: null, heading: "", text: source }];
  }

  const sections = [];
  markers.forEach((marker, index) => {
    const next = markers[index + 1];
    const rawText = source.slice(marker.end, next ? next.index : source.length).trim();
    const sectionText = marker.partId === "teil3" || marker.partId === "teil4"
      ? normalizeCompactObjectiveSeparators(rawText)
      : rawText;
    sections.push({
      partId: marker.partId,
      partNumber: marker.partNumber,
      heading: marker.heading,
      text: sectionText,
    });
  });
  return sections;
}
