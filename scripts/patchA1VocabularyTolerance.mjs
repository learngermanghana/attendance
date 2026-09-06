import fs from "node:fs";

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`${label} anchor changed; update patchA1VocabularyTolerance.mjs`);
  return source.replace(before, after);
}

const target = new URL("../src/utils/autoMarking.js", import.meta.url);
let source = fs.readFileSync(target, "utf8");

const textMatchesAnchor = `function textMatches(expectedTextRaw, studentTextRaw) {
  const expectedText = normalizeForCompare(expectedTextRaw);`;

const helpers = `function stripLeadingGermanArticle(value = "") {
  return normalizeForCompare(value).replace(/^(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines)\\s+/, "").trim();
}

function vocabularyTextMatches(expectedRaw = "", studentRaw = "") {
  const expected = stripLeadingGermanArticle(expectedRaw);
  const student = stripLeadingGermanArticle(studentRaw);
  if (!expected || !student) return false;
  if (expected === student) return true;
  const maxLength = Math.max(expected.length, student.length);
  return maxLength >= 4 && levenshteinDistance(expected, student) <= 1;
}

function bilingualHeadword(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const first = raw.split(/\\s*[–—-]\\s*/)[0] || raw;
  return first.replace(/^\\s*[a-j]\\s*[).:]\\s*/i, "").trim();
}

function bilingualHeadwordMatches(expectedRaw = "", studentRaw = "") {
  if (!/[–—-]/.test(String(expectedRaw || "")) || !/[–—-]/.test(String(studentRaw || ""))) return false;
  const expected = normalizeForCompare(bilingualHeadword(expectedRaw));
  const student = normalizeForCompare(bilingualHeadword(studentRaw));
  return Boolean(expected && student && expected === student);
}

${textMatchesAnchor}`;

source = replaceOnce(source, textMatchesAnchor, helpers, "vocabulary tolerance helpers");

source = replaceOnce(
  source,
  `  if (meta.isVocabulary) return { status: "wrong" };`,
  `  if (meta.isVocabulary) {
    return vocabularyTextMatches(meta.raw, studentRaw)
      ? { status: "correct", reason: "Correct vocabulary answer with minor spelling/article variation" }
      : { status: "wrong" };
  }
  if (bilingualHeadwordMatches(meta.raw, studentRaw)) {
    return { status: "correct", reason: "Correct bilingual vocabulary headword" };
  }`,
  "vocabulary matching branch",
);

fs.writeFileSync(target, source);
console.log("A1 vocabulary tolerance patch applied.");
