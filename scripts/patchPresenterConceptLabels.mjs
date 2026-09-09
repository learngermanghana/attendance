import fs from "node:fs";

function replaceOnce(source, anchor, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(anchor)) throw new Error(`${label} anchor missing.`);
  return source.replace(anchor, replacement);
}

const pickerPath = new URL("../src/components/PresenterStudentPicker.jsx", import.meta.url);
let pickerSource = fs.readFileSync(pickerPath, "utf8");

const pickerImport = 'import { presenterConceptLabel } from "../utils/presenterConceptLabels.js";';
if (!pickerSource.includes(pickerImport)) {
  const importAnchor = 'import { buildA1PresenterQuestionPool, resultLabel } from "../utils/a1PresenterQuestionPool.js";';
  pickerSource = replaceOnce(
    pickerSource,
    importAnchor,
    `${importAnchor}\n${pickerImport}`,
    "Presenter concept-label import",
  );
}

const responseConceptLine = '      conceptLabel: currentQuestion.conceptLabel || presenterConceptLabel(currentQuestion.sourceQuestion || currentQuestion.questionDe, { fallback: normalize(slide?.title || slide?.topic || "Lesson concept") }),';
if (!pickerSource.includes(responseConceptLine)) {
  const responseAnchor = '      sourceQuestion: currentQuestion.sourceQuestion || currentQuestion.questionDe,\n      result,';
  pickerSource = replaceOnce(
    pickerSource,
    responseAnchor,
    `      sourceQuestion: currentQuestion.sourceQuestion || currentQuestion.questionDe,\n${responseConceptLine}\n      result,`,
    "Presenter saved concept label",
  );
}

const rawPresenterConcept = '        const concept = normalize(response.sourceQuestion || response.question || response.questionContext);';
const labeledPresenterConcept = '        const concept = normalize(response.conceptLabel || presenterConceptLabel(response.sourceQuestion || response.question || response.questionContext, { fallback: normalize(slide?.title || slide?.topic || "Lesson concept") }));';
if (pickerSource.includes(rawPresenterConcept) && !pickerSource.includes(labeledPresenterConcept)) {
  pickerSource = pickerSource.replace(rawPresenterConcept, labeledPresenterConcept);
}

fs.writeFileSync(pickerPath, pickerSource);

const adminPath = new URL("../src/pages/ClassParticipationPage.jsx", import.meta.url);
let adminSource = fs.readFileSync(adminPath, "utf8");
const adminImport = 'import { presenterConceptLabel } from "../utils/presenterConceptLabels.js";';
if (!adminSource.includes(adminImport)) {
  const adminImportAnchor = 'import "./ClassParticipationPage.css";';
  adminSource = replaceOnce(
    adminSource,
    adminImportAnchor,
    `${adminImport}\n${adminImportAnchor}`,
    "Class Participation concept-label import",
  );
}

const rawAdminConcept = '        const concept = clean(response.sourceQuestion || response.question || response.questionContext);';
const labeledAdminConcept = '        const concept = clean(response.conceptLabel || presenterConceptLabel(response.sourceQuestion || response.question || response.questionContext, { fallback: detail?.session?.lessonTitle || "Lesson concept" }));';
if (adminSource.includes(rawAdminConcept) && !adminSource.includes(labeledAdminConcept)) {
  // buildParticipationInsights is a pure helper and cannot access detail. Keep its
  // fallback generic while preserving explicit/saved concept labels.
  adminSource = adminSource.replace(
    rawAdminConcept,
    '        const concept = clean(response.conceptLabel || presenterConceptLabel(response.sourceQuestion || response.question || response.questionContext));',
  );
}

fs.writeFileSync(adminPath, adminSource);

const apiPath = new URL("../functions/classParticipationApi.js", import.meta.url);
let apiSource = fs.readFileSync(apiPath, "utf8");
const backendImport = 'const { presenterConceptLabel } = require("./presenterConceptLabels");';
if (!apiSource.includes(backendImport)) {
  const backendImportAnchor = 'const crypto = require("node:crypto");';
  apiSource = replaceOnce(
    apiSource,
    backendImportAnchor,
    `${backendImportAnchor}\n${backendImport}`,
    "Class participation backend concept-label import",
  );
}

const oldNormalizeResponse = `function normalizeQuestionResponse(response = {}, index = 0) {
  const rawResult = lower(response.result || response.status);
  const result = rawResult === "needshelp" || rawResult === "needs_help"
    ? "needs_review"
    : rawResult === "absent"
      ? "presenter_absent"
      : rawResult;
  if (!QUESTION_RESULTS.has(result)) return null;
  const question = safeText(response.question || response.questionText, 700);
  if (!question && result !== "presenter_absent") return null;
  return {
    questionId: safeText(response.questionId || \`question-\${index + 1}\`, 160),
    question,
    sourceQuestion: safeText(response.sourceQuestion, 700),
    result,
    questionContext: safeText(response.questionContext, 120),
    recordedAt: safeText(response.recordedAt, 80),
  };
}`;

const newNormalizeResponse = `function normalizeQuestionResponse(response = {}, index = 0) {
  const rawResult = lower(response.result || response.status);
  const result = rawResult === "needshelp" || rawResult === "needs_help"
    ? "needs_review"
    : rawResult === "absent"
      ? "presenter_absent"
      : rawResult;
  if (!QUESTION_RESULTS.has(result)) return null;
  const question = safeText(response.question || response.questionText, 700);
  if (!question && result !== "presenter_absent") return null;
  const sourceQuestion = safeText(response.sourceQuestion, 700);
  const questionContext = safeText(response.questionContext, 120);
  const conceptLabel = safeText(
    response.conceptLabel || presenterConceptLabel({ sourceQuestion, question, questionContext }),
    160,
  );
  return {
    questionId: safeText(response.questionId || \`question-\${index + 1}\`, 160),
    question,
    sourceQuestion,
    conceptLabel,
    result,
    questionContext,
    recordedAt: safeText(response.recordedAt, 80),
  };
}`;

if (!apiSource.includes(newNormalizeResponse)) {
  apiSource = replaceOnce(
    apiSource,
    oldNormalizeResponse,
    newNormalizeResponse,
    "Class participation response normalization",
  );
}

const oldStudentSafe = `function studentSafeParticipationRecord(row = {}) {
  return {
    id: clean(row.id),
    sessionId: clean(row.sessionId),
    classId: clean(row.classId),
    className: clean(row.className),
    course: clean(row.course),
    assignmentId: clean(row.assignmentId),
    lessonDay: clean(row.lessonDay),
    lessonTitle: clean(row.lessonTitle),
    sessionDate: clean(row.sessionDate),
    turns: clampCount(row.turns),
    correct: clampCount(row.correct),
    needsReview: clampCount(row.needsReview),
    skipped: clampCount(row.skipped),
    questionResponses: (Array.isArray(row.questionResponses) ? row.questionResponses : [])
      .map(normalizeQuestionResponse)
      .filter((response) => response && (response.result === "correct" || response.result === "needs_review"))
      .map(({ questionId, question, result, questionContext, recordedAt }) => ({
        questionId,
        question,
        result,
        questionContext,
        recordedAt,
      })),
    updatedAt: row.updatedAt || null,
  };
}`;

const newStudentSafe = `function studentSafeParticipationRecord(row = {}) {
  const questionResponses = (Array.isArray(row.questionResponses) ? row.questionResponses : [])
    .map(normalizeQuestionResponse)
    .filter((response) => response && (response.result === "correct" || response.result === "needs_review"))
    .map(({ questionId, question, conceptLabel, result, questionContext, recordedAt }) => ({
      questionId,
      question,
      conceptLabel,
      result,
      questionContext,
      recordedAt,
    }));
  const reviewConcepts = [...new Set(
    questionResponses
      .filter((response) => response.result === "needs_review")
      .map((response) => response.conceptLabel)
      .filter(Boolean),
  )];
  return {
    id: clean(row.id),
    sessionId: clean(row.sessionId),
    classId: clean(row.classId),
    className: clean(row.className),
    course: clean(row.course),
    assignmentId: clean(row.assignmentId),
    lessonDay: clean(row.lessonDay),
    lessonTitle: clean(row.lessonTitle),
    sessionDate: clean(row.sessionDate),
    turns: clampCount(row.turns),
    correct: clampCount(row.correct),
    needsReview: clampCount(row.needsReview),
    skipped: clampCount(row.skipped),
    questionResponses,
    reviewConcepts,
    reviewRecommendation: reviewConcepts.length ? \`Review recommended: \${reviewConcepts.join(" · ")}\` : "",
    updatedAt: row.updatedAt || null,
  };
}`;

if (!apiSource.includes(newStudentSafe)) {
  apiSource = replaceOnce(
    apiSource,
    oldStudentSafe,
    newStudentSafe,
    "Student-safe participation concept summary",
  );
}

fs.writeFileSync(apiPath, apiSource);

console.log("Presenter concept labels are attached to saved responses and student-safe participation summaries.");
