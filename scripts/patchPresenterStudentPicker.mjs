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

const pickerCssPath = new URL("../src/components/PresenterStudentPicker.css", import.meta.url);
let pickerCss = fs.readFileSync(pickerCssPath, "utf8");
const footerPolishMarker = "/* presenter-next-lesson-footer-polish */";
if (!pickerCss.includes(footerPolishMarker)) {
  pickerCss += `\n${footerPolishMarker}\n.presenter-stage > .presenter-footer > button:last-of-type {\n  border-color: #1d4ed8;\n  background: #1d4ed8;\n  color: #fff;\n}\n\n.presenter-stage > .presenter-footer > .presenter-next-lesson {\n  margin-left: -0.35rem;\n}\n`;
  fs.writeFileSync(pickerCssPath, pickerCss);
}

console.log("Random student toolbar, A1 unique questions, and next-lesson navigation are build-safe.");
