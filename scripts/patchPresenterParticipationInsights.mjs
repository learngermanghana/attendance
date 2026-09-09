import fs from "node:fs";

const pickerPath = new URL("../src/components/PresenterStudentPicker.jsx", import.meta.url);
let pickerSource = fs.readFileSync(pickerPath, "utf8");

const insightsMarker = "const followUpStudents = eligible";
if (!pickerSource.includes(insightsMarker)) {
  const metricsAnchor = [
    "  const currentNeedsHelp = Number(currentParticipation.needsHelp || currentParticipation.needsReview || 0);",
    "  const correctCount = Object.values(stats).reduce((sum, row) => sum + Number(row?.correct || 0), 0);",
    "  const helpCount = Object.values(stats).reduce((sum, row) => sum + Number(row?.needsHelp || row?.needsReview || 0), 0);",
  ].join("\n");
  const metricsReplacement = [
    "  const currentNeedsHelp = Number(currentParticipation.needsHelp || currentParticipation.needsReview || 0);",
    "  const correctCount = Object.values(stats).reduce((sum, row) => sum + Number(row?.correct || 0), 0);",
    "  const helpCount = Object.values(stats).reduce((sum, row) => sum + Number(row?.needsHelp || row?.needsReview || 0), 0);",
    "  const unparticipatedStudents = eligible.filter((entry) => Number(stats[entry.key]?.turns || 0) === 0);",
    "  const followUpStudents = eligible",
    "    .map((entry) => ({ ...entry, needsHelp: Number(stats[entry.key]?.needsHelp || stats[entry.key]?.needsReview || 0) }))",
    "    .filter((entry) => entry.needsHelp >= 2)",
    "    .sort((a, b) => b.needsHelp - a.needsHelp || a.name.localeCompare(b.name));",
    "  const reteachConceptMap = new Map();",
    "  eligible.forEach((entry) => {",
    "    const responses = Array.isArray(stats[entry.key]?.responses) ? stats[entry.key].responses : [];",
    "    responses",
    "      .filter((response) => response?.result === \"needs_review\")",
    "      .forEach((response) => {",
    "        const concept = normalize(response.sourceQuestion || response.question || response.questionContext);",
    "        if (!concept) return;",
    "        reteachConceptMap.set(concept, Number(reteachConceptMap.get(concept) || 0) + 1);",
    "      });",
    "  });",
    "  const reteachConcepts = [...reteachConceptMap.entries()]",
    "    .map(([concept, count]) => ({ concept, count }))",
    "    .filter((item) => item.count >= 2)",
    "    .sort((a, b) => b.count - a.count || a.concept.localeCompare(b.concept));",
  ].join("\n");
  if (!pickerSource.includes(metricsAnchor)) {
    throw new Error("Presenter participation insight metrics anchor missing.");
  }
  pickerSource = pickerSource.replace(metricsAnchor, metricsReplacement);
}

const fairPickMarker = "const fairCandidates = availableStudents.filter";
if (!pickerSource.includes(fairPickMarker)) {
  const pickAnchor = "    const picked = randomItem(availableStudents);";
  const pickReplacement = [
    "    const minimumTurns = Math.min(...availableStudents.map((entry) => Number(stats[entry.key]?.turns || 0)));",
    "    const fairCandidates = availableStudents.filter((entry) => Number(stats[entry.key]?.turns || 0) === minimumTurns);",
    "    const picked = randomItem(fairCandidates);",
  ].join("\n");
  if (!pickerSource.includes(pickAnchor)) {
    throw new Error("Presenter fair-pick anchor missing.");
  }
  pickerSource = pickerSource.replace(pickAnchor, pickReplacement);
}

const summaryMarker = 'className="presenter-end-summary"';
if (!pickerSource.includes(summaryMarker)) {
  const moreAnchor = '        <details className="presenter-student-more">';
  const summaryBlock = [
    '        <details className="presenter-end-summary">',
    "          <summary>",
    '            Class summary{followUpStudents.length || reteachConcepts.length ? " · action" : ""}',
    "          </summary>",
    '          <div className="presenter-end-summary-panel">',
    "            <strong>End-of-class summary</strong>",
    "            <p>{classParticipatedCount}/{eligible.length} participated ({classParticipationPercent}%) · {correctCount} correct · {helpCount} need review.</p>",
    "            <div className=\"presenter-end-summary-item\">",
    "              <span>No turn yet</span>",
    "              <strong>{unparticipatedStudents.length}</strong>",
    "              <p>{unparticipatedStudents.length ? unparticipatedStudents.map((entry) => entry.name).join(\", \") : \"Every active student has participated.\"}</p>",
    "            </div>",
    "            <div className=\"presenter-end-summary-item\">",
    "              <span>Needs follow-up</span>",
    "              <strong>{followUpStudents.length}</strong>",
    "              <p>{followUpStudents.length ? followUpStudents.map((entry) => `${entry.name} (${entry.needsHelp})`).join(\", \") : \"No student has reached the follow-up threshold.\"}</p>",
    "            </div>",
    "            <div className=\"presenter-end-summary-item\">",
    "              <span>Reteach recommended</span>",
    "              <strong>{reteachConcepts.length}</strong>",
    "              {reteachConcepts.length ? (",
    "                <ul className=\"presenter-reteach-list\">",
    "                  {reteachConcepts.slice(0, 4).map((item) => (",
    "                    <li key={item.concept}><strong>{item.count}× review</strong><span>{item.concept}</span></li>",
    "                  ))}",
    "                </ul>",
    "              ) : <p>No repeated concept difficulty detected yet.</p>}",
    "            </div>",
    "            <small>Diagnostic teaching insight only. It does not change grades or official attendance.</small>",
    "          </div>",
    "        </details>",
    "",
    moreAnchor,
  ].join("\n");
  if (!pickerSource.includes(moreAnchor)) {
    throw new Error("Presenter end-of-class summary anchor missing.");
  }
  pickerSource = pickerSource.replace(moreAnchor, summaryBlock);
}

const fairStatusMarker = 'className="presenter-fair-pick-status"';
if (!pickerSource.includes(fairStatusMarker)) {
  const statusAnchor = '        <span aria-label="Class participation summary">Class participation {classParticipatedCount}/{eligible.length} ({classParticipationPercent}%) · {correctCount} correct · {helpCount} need review</span>';
  const statusReplacement = [
    statusAnchor,
    '        <span className="presenter-fair-pick-status">Fair pick on · least turns first</span>',
  ].join("\n");
  if (!pickerSource.includes(statusAnchor)) {
    throw new Error("Presenter fair-pick status anchor missing.");
  }
  pickerSource = pickerSource.replace(statusAnchor, statusReplacement);
}

fs.writeFileSync(pickerPath, pickerSource);

const pickerCssPath = new URL("../src/components/PresenterStudentPicker.css", import.meta.url);
let pickerCss = fs.readFileSync(pickerCssPath, "utf8");
const pickerCssMarker = "/* presenter-participation-insights */";
if (!pickerCss.includes(pickerCssMarker)) {
  pickerCss += `\n${pickerCssMarker}\n.presenter-end-summary {\n  position: relative;\n  flex: 0 0 auto;\n}\n\n.presenter-end-summary > summary {\n  border: 1px solid #bfdbfe;\n  border-radius: 8px;\n  background: #eff6ff;\n  color: #1d4ed8;\n  padding: 0.42rem 0.58rem;\n  font-size: 0.76rem;\n  font-weight: 850;\n  line-height: 1;\n  cursor: pointer;\n  list-style: none;\n  white-space: nowrap;\n}\n\n.presenter-end-summary > summary::-webkit-details-marker {\n  display: none;\n}\n\n.presenter-end-summary-panel {\n  position: absolute;\n  z-index: 32;\n  top: calc(100% + 0.45rem);\n  right: 0;\n  width: min(440px, 90vw);\n  display: grid;\n  gap: 0.65rem;\n  border: 1px solid #cbd5e1;\n  border-radius: 12px;\n  background: #fff;\n  padding: 0.85rem;\n  box-shadow: 0 14px 35px rgba(15, 23, 42, 0.18);\n}\n\n.presenter-end-summary-panel > p,\n.presenter-end-summary-panel > small,\n.presenter-end-summary-item p {\n  margin: 0;\n  color: #64748b;\n  line-height: 1.4;\n}\n\n.presenter-end-summary-item {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto;\n  gap: 0.2rem 0.55rem;\n  border-top: 1px solid #eef2f7;\n  padding-top: 0.55rem;\n}\n\n.presenter-end-summary-item > span {\n  color: #475569;\n  font-size: 0.75rem;\n  font-weight: 800;\n}\n\n.presenter-end-summary-item > strong {\n  color: #0f172a;\n}\n\n.presenter-end-summary-item > p,\n.presenter-reteach-list {\n  grid-column: 1 / -1;\n}\n\n.presenter-reteach-list {\n  display: grid;\n  gap: 0.35rem;\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n\n.presenter-reteach-list li {\n  display: grid;\n  gap: 0.12rem;\n  border-radius: 8px;\n  background: #fff7ed;\n  padding: 0.45rem 0.55rem;\n}\n\n.presenter-reteach-list li strong {\n  color: #b45309;\n  font-size: 0.7rem;\n}\n\n.presenter-reteach-list li span {\n  color: #334155;\n  font-size: 0.75rem;\n  line-height: 1.3;\n}\n\n.presenter-fair-pick-status {\n  color: #1d4ed8;\n  font-weight: 750;\n}\n\n@media (max-width: 700px) {\n  .presenter-end-summary-panel {\n    right: -42px;\n    width: min(380px, calc(100vw - 1.2rem));\n  }\n}\n`;
  fs.writeFileSync(pickerCssPath, pickerCss);
}

const adminPath = new URL("../src/pages/ClassParticipationPage.jsx", import.meta.url);
let adminSource = fs.readFileSync(adminPath, "utf8");

const adminHelperMarker = "function buildParticipationInsights";
if (!adminSource.includes(adminHelperMarker)) {
  const exportAnchor = "export default function ClassParticipationPage() {";
  const helper = `function buildParticipationInsights(records = []) {\n  const active = (Array.isArray(records) ? records : []).filter((record) => !record.presenterAbsent);\n  const followUp = active\n    .filter((record) => Number(record.needsReview || 0) >= 2)\n    .sort((a, b) => Number(b.needsReview || 0) - Number(a.needsReview || 0));\n  const noTurn = active.filter((record) => Number(record.turns || 0) === 0);\n  const conceptMap = new Map();\n  active.forEach((record) => {\n    const responses = Array.isArray(record.questionResponses) ? record.questionResponses : [];\n    responses\n      .filter((response) => response?.result === \"needs_review\")\n      .forEach((response) => {\n        const concept = clean(response.sourceQuestion || response.question || response.questionContext);\n        if (!concept) return;\n        conceptMap.set(concept, Number(conceptMap.get(concept) || 0) + 1);\n      });\n  });\n  const reteach = [...conceptMap.entries()]\n    .map(([concept, count]) => ({ concept, count }))\n    .filter((item) => item.count >= 2)\n    .sort((a, b) => b.count - a.count || a.concept.localeCompare(b.concept));\n  return { followUp, noTurn, reteach };\n}\n\n${exportAnchor}`;
  if (!adminSource.includes(exportAnchor)) {
    throw new Error("Class Participation insights helper anchor missing.");
  }
  adminSource = adminSource.replace(exportAnchor, helper);
}

const adminInsightsMarker = "const insights = useMemo(() => buildParticipationInsights(records), [records]);";
if (!adminSource.includes(adminInsightsMarker)) {
  const recordsAnchor = "  const records = Array.isArray(detail?.records) ? detail.records : [];";
  const recordsReplacement = `${recordsAnchor}\n  const insights = useMemo(() => buildParticipationInsights(records), [records]);`;
  if (!adminSource.includes(recordsAnchor)) {
    throw new Error("Class Participation records insight anchor missing.");
  }
  adminSource = adminSource.replace(recordsAnchor, recordsReplacement);
}

const adminPanelMarker = 'className="class-participation-insights"';
if (!adminSource.includes(adminPanelMarker)) {
  const tableAnchor = '            <div className="class-participation-table-wrap">\n              <table>';
  const tableReplacement = `            <div className="class-participation-table-wrap">\n              <section className="class-participation-insights" aria-label="Lesson teaching insights">\n                <article>\n                  <span>Students to follow up</span>\n                  <strong>{insights.followUp.length}</strong>\n                  <p>{insights.followUp.length ? insights.followUp.map((record) => \`${'${record.studentName || record.studentCode || "Student"}'} (${'${record.needsReview || 0}'})\`).join(\", \") : \"No student has 2 or more needs-review responses.\"}</p>\n                </article>\n                <article>\n                  <span>Reteach concepts</span>\n                  <strong>{insights.reteach.length}</strong>\n                  <p>{insights.reteach.length ? insights.reteach.slice(0, 4).map((item) => \`${'${item.count}'}× ${'${item.concept}'}\`).join(\" · \") : \"No repeated concept difficulty detected.\"}</p>\n                </article>\n                <article>\n                  <span>No turn yet</span>\n                  <strong>{insights.noTurn.length}</strong>\n                  <p>{insights.noTurn.length ? insights.noTurn.map((record) => record.studentName || record.studentCode || \"Student\").join(\", \") : \"Every active student participated.\"}</p>\n                </article>\n              </section>\n              <table>`;
  if (!adminSource.includes(tableAnchor)) {
    throw new Error("Class Participation insight panel anchor missing.");
  }
  adminSource = adminSource.replace(tableAnchor, tableReplacement);
}

fs.writeFileSync(adminPath, adminSource);

const adminCssPath = new URL("../src/pages/ClassParticipationPage.css", import.meta.url);
let adminCss = fs.readFileSync(adminCssPath, "utf8");
const adminCssMarker = "/* participation-teaching-insights */";
if (!adminCss.includes(adminCssMarker)) {
  adminCss += `\n${adminCssMarker}\n.class-participation-insights {\n  display: grid;\n  grid-template-columns: repeat(3, minmax(0, 1fr));\n  gap: 0.65rem;\n  min-width: min(900px, 100%);\n  padding: 0.9rem;\n  border-bottom: 1px solid #e2e8f0;\n  background: #f8fafc;\n}\n\n.class-participation-insights article {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto;\n  gap: 0.25rem 0.55rem;\n  border: 1px solid #dbe4f0;\n  border-radius: 12px;\n  background: #fff;\n  padding: 0.75rem;\n}\n\n.class-participation-insights span {\n  color: #64748b;\n  font-size: 0.75rem;\n  font-weight: 800;\n}\n\n.class-participation-insights strong {\n  color: #0f172a;\n}\n\n.class-participation-insights p {\n  grid-column: 1 / -1;\n  margin: 0;\n  color: #475569;\n  font-size: 0.78rem;\n  line-height: 1.4;\n  white-space: normal;\n}\n\n@media (max-width: 780px) {\n  .class-participation-insights {\n    grid-template-columns: 1fr;\n  }\n}\n`;
  fs.writeFileSync(adminCssPath, adminCss);
}

console.log("Presenter fair-pick, end-of-class summary, follow-up, and reteach insights are build-safe.");
