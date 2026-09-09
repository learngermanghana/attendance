const VARIANTS = [
  (question) => question,
  (question) => `Explain this in your own words: ${question}`,
  (question) => `Answer this, then give one simple German example: ${question}`,
  (question) => `Teach this rule to a classmate in one clear sentence: ${question}`,
  (question) => `Answer briefly, then explain why: ${question}`,
  (question) => `Give the rule first, then one simple example: ${question}`,
  (question) => `Answer without looking at the grammar note: ${question}`,
  (question) => `How would you explain this idea to a beginner? ${question}`,
];

const clean = (value) => String(value ?? "").trim();

function normalizeQuestion(question = {}, index = 0) {
  const questionText = clean(question.questionDe || question.question || question.prompt);
  if (!questionText) return null;
  return {
    sourceIndex: index,
    questionDe: questionText,
    answerDe: clean(question.answerDe || question.answer || question.modelAnswer),
    noteEn: clean(question.noteEn || question.note || ""),
  };
}

/**
 * Expand the small curated A1 concept bank into a roster-sized live-class pool.
 * Variants deliberately stay concept-first: no gap-fill or workbook duplication.
 */
export function buildA1PresenterQuestionPool(baseQuestions = [], targetSize = 0, seedPrefix = "a1") {
  const normalized = (Array.isArray(baseQuestions) ? baseQuestions : [])
    .map(normalizeQuestion)
    .filter(Boolean);
  if (!normalized.length) return [];

  const requested = Math.max(1, Math.min(Number(targetSize) || normalized.length, 150));
  const pool = [];
  let cycle = 0;

  while (pool.length < requested) {
    for (let sourceIndex = 0; sourceIndex < normalized.length && pool.length < requested; sourceIndex += 1) {
      const base = normalized[sourceIndex];
      const variantIndex = cycle % VARIANTS.length;
      const round = Math.floor(cycle / VARIANTS.length);
      const rendered = VARIANTS[variantIndex](base.questionDe);
      const questionDe = round > 0 ? `Follow-up ${round + 1}: ${rendered}` : rendered;
      pool.push({
        id: `${clean(seedPrefix) || "a1"}-q${sourceIndex + 1}-v${cycle + 1}`,
        questionDe,
        answerDe: base.answerDe,
        noteEn: base.noteEn,
        sourceQuestion: base.questionDe,
        sourceIndex,
        variantIndex,
      });
    }
    cycle += 1;
  }

  return pool;
}

export function resultLabel(result = "") {
  if (result === "correct") return "Correct";
  if (result === "needs_review") return "Needs review";
  if (result === "skipped") return "Skipped";
  if (result === "presenter_absent") return "Presenter absent";
  return clean(result) || "Recorded";
}
