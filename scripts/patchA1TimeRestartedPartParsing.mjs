import fs from "node:fs";

const target = new URL("../src/utils/objectiveMarking.js", import.meta.url);
let source = fs.readFileSync(target, "utf8");

const before = `  let flatAnswers = flatMainReference ? chooseBestFlatAnswers(referenceItems, submissionText) : [];
  if (flatMainReference) {
    const sectionAnswers = sections
      .filter((section) => section.partId !== "main")
      .flatMap((section) => extractRestartedNumberingEntries(section.text).sort((a, b) => a.number - b.number).map((entry) => entry.answer));
    if (scoreFlatCandidate(referenceItems, sectionAnswers).correct > scoreFlatCandidate(referenceItems, flatAnswers).correct) flatAnswers = sectionAnswers;
  }`;

const after = `  let flatAnswers = flatMainReference ? chooseBestFlatAnswers(referenceItems, submissionText) : [];
  if (flatMainReference) {
    // Flat A1 answer keys often represent several workbook Teile as one
    // Answer1..AnswerN sequence. When the student explicitly labels those Teile
    // and restarts numbering at 1, preserve the section order instead of moving
    // answers around based on which alignment happens to score highest.
    //
    // Keep this narrow: it applies only to all-choice reference keys and either
    // (a) a submission that starts with Teil 1 and continues into another
    // choice section, or (b) explicit choice sections whose combined answer
    // count exactly fills the flat reference key. This protects partial trailing
    // blocks that intentionally rely on the legacy best-alignment fallback.
    const explicitChoiceSections = sections
      .filter((section) => section.partId !== "main")
      .map((section) => ({
        partId: section.partId,
        entries: extractRestartedNumberingEntries(section.text).sort((a, b) => a.number - b.number),
      }))
      .filter(({ entries }) => entries.length && entries.every((entry) => Boolean(extractOptionLetter(entry.answer))));
    const orderedExplicitChoiceAnswers = explicitChoiceSections.flatMap(({ entries }) => entries.map((entry) => entry.answer));
    const preserveExplicitChoiceOrder = referenceItems.every((item) => item.type === "choice")
      && explicitChoiceSections.length >= 2
      && (
        explicitChoiceSections[0]?.partId === "teil1"
        || orderedExplicitChoiceAnswers.length === referenceItems.length
      );

    if (preserveExplicitChoiceOrder) {
      flatAnswers = orderedExplicitChoiceAnswers;
    } else {
      const sectionAnswers = sections
        .filter((section) => section.partId !== "main")
        .flatMap((section) => extractRestartedNumberingEntries(section.text).sort((a, b) => a.number - b.number).map((entry) => entry.answer));
      if (scoreFlatCandidate(referenceItems, sectionAnswers).correct > scoreFlatCandidate(referenceItems, flatAnswers).correct) flatAnswers = sectionAnswers;
    }
  }`;

if (source.includes(after)) {
  console.log("Restarted Teil numbering for flat choice keys is already patched.");
} else if (source.includes(before)) {
  source = source.replace(before, after);
  fs.writeFileSync(target, source, "utf8");
  console.log("Flat A1 choice keys now preserve explicit Teil order when numbering restarts.");
} else {
  throw new Error("Could not patch restarted Teil numbering: objectiveMarking.js anchor changed.");
}
