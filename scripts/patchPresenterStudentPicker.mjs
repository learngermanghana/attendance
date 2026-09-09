import "./patchClassParticipationApi.mjs";
import fs from "node:fs";

const presenterPaths = [
  {
    path: new URL("../src/components/TeachingSlidePresenter.jsx", import.meta.url),
    signature: "export default function TeachingSlidePresenter({ slide, topicLabel, onExit })",
    nextSignature: "export default function TeachingSlidePresenter({ slide, topicLabel, onExit, nextLessonHref = \"\", nextLessonLabel = \"\" })",
    fallbackPicker: "<PresenterStudentPicker slide={slide} />",
  },
  {
    path: new URL("../src/components/A1GrammarPresenter.jsx", import.meta.url),
    signature: "export default function A1GrammarPresenter({ slide, topicLabel, onExit })",
    nextSignature: "export default function A1GrammarPresenter({ slide, topicLabel, onExit, nextLessonHref = \"\", nextLessonLabel = \"\" })",
    fallbackPicker: '<PresenterStudentPicker slide={slide} questions={stage?.id === "grammar-check" ? stage.items : []} questionContext={stage?.id === "grammar-check" ? stage.id : ""} />',
  },
];

const importAnchor = 'import "./TeachingSlidePresenter.css";';
const importLine = 'import PresenterStudentPicker from "./PresenterStudentPicker.jsx";';

for (const { path, signature, nextSignature, fallbackPicker } of presenterPaths) {
  let source = fs.readFileSync(path, "utf8");

  if (!source.includes(importLine)) {
    if (!source.includes(importAnchor)) {
      throw new Error(`Presenter student picker import anchor missing in ${path.pathname}`);
    }
    source = source.replace(importAnchor, `${importAnchor}\n${importLine}`);
  }

  // A1 now owns a richer roster-sized question integration directly in the
  // component. Treat any existing PresenterStudentPicker render as authoritative
  // so prebuild never inserts a second toolbar over concurrent source updates.
  if (!source.includes("<PresenterStudentPicker")) {
    const mainAnchor = "        <main className={`presenter-content presenter-content-${stage.type}`}>";
    if (!source.includes(mainAnchor)) {
      throw new Error(`Presenter student picker render anchor missing in ${path.pathname}`);
    }
    source = source.replace(
      mainAnchor,
      `        ${fallbackPicker}\n\n${mainAnchor}`,
    );
  }

  if (!source.includes("nextLessonHref")) {
    if (!source.includes(signature)) {
      throw new Error(`Next lesson presenter signature anchor missing in ${path.pathname}`);
    }
    source = source.replace(signature, nextSignature);
  }

  if (!source.includes('className="presenter-next-lesson"')) {
    const footerAnchor = "          </button>\n        </footer>";
    if (!source.includes(footerAnchor)) {
      throw new Error(`Next lesson footer anchor missing in ${path.pathname}`);
    }
    source = source.replace(
      footerAnchor,
      `          </button>\n          {nextLessonHref ? (\n            <a\n              className="presenter-next-lesson"\n              href={nextLessonHref}\n              title={nextLessonLabel || "Open next lesson in Presenter Mode"}\n            >\n              Next lesson{nextLessonLabel ? \` · \${nextLessonLabel}\` : ""} →\n            </a>\n          ) : null}\n        </footer>`,
    );
  }

  fs.writeFileSync(path, source);
}

const pagePath = new URL("../src/pages/TeachingSlidesPage.jsx", import.meta.url);
let pageSource = fs.readFileSync(pagePath, "utf8");

if (!pageSource.includes("const nextLessonHref = next ?")) {
  const navigationAnchor = "  const { previous, next } = getSlideNavigation(slide.id, courseId);";
  if (!pageSource.includes(navigationAnchor)) {
    throw new Error("Teaching Slides next lesson navigation anchor missing.");
  }
  pageSource = pageSource.replace(
    navigationAnchor,
    `${navigationAnchor}\n  const nextLessonHref = next ? \`/teaching-slides/course/\${courseId}/\${next.id}?present=1\` : "";\n  const nextLessonLabel = next?.day || "";`,
  );
}

const a1Call = "      return <A1GrammarPresenter slide={slide} topicLabel={topicLabel} onExit={() => setPresenterMode(false)} />;";
const a1CallUpdated = "      return <A1GrammarPresenter slide={slide} topicLabel={topicLabel} onExit={() => setPresenterMode(false)} nextLessonHref={nextLessonHref} nextLessonLabel={nextLessonLabel} />;";
if (!pageSource.includes(a1CallUpdated)) {
  if (!pageSource.includes(a1Call)) throw new Error("A1 presenter next lesson call anchor missing.");
  pageSource = pageSource.replace(a1Call, a1CallUpdated);
}

const standardCall = "    return <TeachingSlidePresenter slide={slide} topicLabel={topicLabel} onExit={() => setPresenterMode(false)} />;";
const standardCallUpdated = "    return <TeachingSlidePresenter slide={slide} topicLabel={topicLabel} onExit={() => setPresenterMode(false)} nextLessonHref={nextLessonHref} nextLessonLabel={nextLessonLabel} />;";
if (!pageSource.includes(standardCallUpdated)) {
  if (!pageSource.includes(standardCall)) throw new Error("Teaching presenter next lesson call anchor missing.");
  pageSource = pageSource.replace(standardCall, standardCallUpdated);
}

fs.writeFileSync(pagePath, pageSource);

const pickerPath = new URL("../src/components/PresenterStudentPicker.jsx", import.meta.url);
let pickerSource = fs.readFileSync(pickerPath, "utf8");

const classMetricsMarker = "const classParticipatedCount = eligible.filter";
if (!pickerSource.includes(classMetricsMarker)) {
  const metricsAnchor = [
    "  const participatedKeys = new Set(Object.keys(stats).filter((key) => Number(stats[key]?.turns || 0) > 0));",
    "  const correctCount = Object.values(stats).reduce((sum, row) => sum + Number(row?.correct || 0), 0);",
    "  const helpCount = Object.values(stats).reduce((sum, row) => sum + Number(row?.needsHelp || row?.needsReview || 0), 0);",
  ].join("\n");
  const metricsReplacement = [
    "  const classParticipatedCount = eligible.filter((entry) => Number(stats[entry.key]?.turns || 0) > 0).length;",
    "  const classParticipationPercent = eligible.length ? Math.round((classParticipatedCount / eligible.length) * 100) : 0;",
    "  const currentParticipation = current ? stats[current.key] || {} : {};",
    "  const currentTurns = Number(currentParticipation.turns || 0);",
    "  const currentCorrect = Number(currentParticipation.correct || 0);",
    "  const currentNeedsHelp = Number(currentParticipation.needsHelp || currentParticipation.needsReview || 0);",
    "  const correctCount = Object.values(stats).reduce((sum, row) => sum + Number(row?.correct || 0), 0);",
    "  const helpCount = Object.values(stats).reduce((sum, row) => sum + Number(row?.needsHelp || row?.needsReview || 0), 0);",
  ].join("\n");
  if (!pickerSource.includes(metricsAnchor)) {
    throw new Error("Presenter class participation metrics anchor missing.");
  }
  pickerSource = pickerSource.replace(metricsAnchor, metricsReplacement);
}

if (!pickerSource.includes('className="presenter-student-current-stats"')) {
  const currentStudentAnchor = [
    '          <strong>{current?.name || (students.length ? `${students.length} ready` : "Select class")}</strong>',
    "        </div>",
  ].join("\n");
  const currentStudentReplacement = [
    '          <strong>{current?.name || (students.length ? `${students.length} ready` : "Select class")}</strong>',
    "          {current ? (",
    '            <small className="presenter-student-current-stats">',
    '              Participated {currentTurns} {currentTurns === 1 ? "time" : "times"} · Correct {currentCorrect} · Needs help {currentNeedsHelp}',
    "            </small>",
    "          ) : null}",
    "        </div>",
  ].join("\n");
  if (!pickerSource.includes(currentStudentAnchor)) {
    throw new Error("Presenter current student summary anchor missing.");
  }
  pickerSource = pickerSource.replace(currentStudentAnchor, currentStudentReplacement);
}

const participationDetailsAnchor = "            <p>Participated {participatedKeys.size}/{eligible.length} · Correct {correctCount} · Needs review {helpCount} · Presenter absent {absentKeys.size}</p>";
const participationDetailsReplacement = "            <p>Class participation {classParticipatedCount}/{eligible.length} ({classParticipationPercent}%) · Correct {correctCount} · Needs review {helpCount} · Presenter absent {absentKeys.size}</p>";
if (!pickerSource.includes(participationDetailsReplacement)) {
  if (!pickerSource.includes(participationDetailsAnchor)) {
    throw new Error("Presenter participation details anchor missing.");
  }
  pickerSource = pickerSource.replace(participationDetailsAnchor, participationDetailsReplacement);
}

const participationStatusAnchor = "        <span>Participation {participatedKeys.size}/{eligible.length} · {correctCount} correct · {helpCount} need review</span>";
const participationStatusReplacement = '        <span aria-label="Class participation summary">Class participation {classParticipatedCount}/{eligible.length} ({classParticipationPercent}%) · {correctCount} correct · {helpCount} need review</span>';
if (!pickerSource.includes(participationStatusReplacement)) {
  if (!pickerSource.includes(participationStatusAnchor)) {
    throw new Error("Presenter participation status anchor missing.");
  }
  pickerSource = pickerSource.replace(participationStatusAnchor, participationStatusReplacement);
}

fs.writeFileSync(pickerPath, pickerSource);

const pickerCssPath = new URL("../src/components/PresenterStudentPicker.css", import.meta.url);
let pickerCss = fs.readFileSync(pickerCssPath, "utf8");
let pickerCssChanged = false;
const footerPolishMarker = "/* presenter-next-lesson-footer-polish */";
if (!pickerCss.includes(footerPolishMarker)) {
  pickerCss += `\n${footerPolishMarker}\n.presenter-stage > .presenter-footer > button:last-of-type {\n  border-color: #1d4ed8;\n  background: #1d4ed8;\n  color: #fff;\n}\n\n.presenter-stage > .presenter-footer > .presenter-next-lesson {\n  margin-left: -0.35rem;\n}\n`;
  pickerCssChanged = true;
}

const participationClarityMarker = "/* class-participation-metric-clarity */";
if (!pickerCss.includes(participationClarityMarker)) {
  pickerCss += `\n${participationClarityMarker}\n.presenter-student-current-stats {\n  overflow: hidden;\n  color: #475569;\n  font-size: 0.66rem;\n  font-weight: 750;\n  line-height: 1.15;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.presenter-student-status-line > span:first-child {\n  color: #334155;\n  font-weight: 750;\n}\n`;
  pickerCssChanged = true;
}

if (pickerCssChanged) fs.writeFileSync(pickerCssPath, pickerCss);

console.log("Random student toolbar, class/student participation clarity, A1 unique questions, and next-lesson navigation are build-safe.");
