import fs from "node:fs";

const presenterPaths = [
  new URL("../src/components/TeachingSlidePresenter.jsx", import.meta.url),
  new URL("../src/components/A1GrammarPresenter.jsx", import.meta.url),
];

const importAnchor = 'import "./TeachingSlidePresenter.css";';
const importLine = 'import PresenterStudentPicker from "./PresenterStudentPicker.jsx";';

for (const path of presenterPaths) {
  let source = fs.readFileSync(path, "utf8");

  if (!source.includes(importLine)) {
    if (!source.includes(importAnchor)) {
      throw new Error(`Presenter student picker import anchor missing in ${path.pathname}`);
    }
    source = source.replace(importAnchor, `${importAnchor}\n${importLine}`);
  }

  if (!source.includes("<PresenterStudentPicker slide={slide} />")) {
    const mainAnchor = "        <main className={`presenter-content presenter-content-${stage.type}`}>";
    if (!source.includes(mainAnchor)) {
      throw new Error(`Presenter student picker render anchor missing in ${path.pathname}`);
    }
    source = source.replace(
      mainAnchor,
      `        <PresenterStudentPicker slide={slide} />\n\n${mainAnchor}`,
    );
  }

  fs.writeFileSync(path, source);
}

console.log("Random student participation picker patched into A1-C1 presenter modes.");
