import test from "node:test";
import assert from "node:assert/strict";

import { getSlidesByCourse } from "../src/data/teachingSlides.js";
import { a1WorkbookAlignedSlidesDays1To5 } from "../src/data/a1WorkbookAlignedSlidesDays1To5.js";
import { a1WorkbookAlignedSlidesDays6To10 } from "../src/data/a1WorkbookAlignedSlidesDays6To10.js";
import { a1LaterTeachingSlides } from "../src/data/a1LaterTeachingSlides.js";
import {
  buildTeachingPresenterStages,
  isA1PresenterV2Slide,
  isTeachingPresenterV2Slide,
} from "../src/utils/teachingPresenter.js";

const REQUIRED_CORE_STAGES = [
  "intro", "warmup", "phrases", "grammar", "examples",
  "practice", "mistakes", "questions", "wrapup",
];

const WORKBOOK_ALIGNED = [
  ...a1WorkbookAlignedSlidesDays1To5,
  ...a1WorkbookAlignedSlidesDays6To10,
];

const VERIFIED_LATER_IDS = new Set(
  a1LaterTeachingSlides.map((slide) => String(slide.assignmentId || "").toUpperCase()),
);

function isTutorial(slide = {}) {
  return String(slide.assignmentId || "").trim().toUpperCase() === "A1-TUTORIAL";
}

test("all real A1 teaching lessons use Presenter 2.0 while orientation stays classic", () => {
  const slides = getSlidesByCourse("A1");
  assert.ok(slides.length > WORKBOOK_ALIGNED.length, "A1 should include later lessons beyond Day 10");

  for (const slide of slides) {
    if (isTutorial(slide)) {
      assert.equal(isA1PresenterV2Slide(slide), false);
      continue;
    }

    assert.equal(isA1PresenterV2Slide(slide), true, slide.assignmentId);
    assert.equal(isTeachingPresenterV2Slide(slide), true, slide.assignmentId);

    const stages = buildTeachingPresenterStages(slide, slide.topic);
    const ids = stages.map((stage) => stage.id);
    REQUIRED_CORE_STAGES.forEach((stageId) => {
      assert.ok(ids.includes(stageId), `${slide.assignmentId} missing ${stageId}`);
    });

    const questions = stages.find((stage) => stage.id === "questions");
    const practice = stages.find((stage) => stage.id === "practice");
    assert.equal(questions.type, "question-reveal", slide.assignmentId);
    assert.ok(questions.supportItems.length >= 3, `${slide.assignmentId} missing model support`);
    assert.equal(practice.type, "flow", slide.assignmentId);
    assert.ok(practice.items.some((item) => item.minutes > 0), `${slide.assignmentId} missing timer-ready practice`);
  }
});

test("A1 Day 11 and Day 12 teaching slides use the official class-day mapping", () => {
  const slides = getSlidesByCourse("A1");
  const day11 = slides.find((slide) => slide.assignmentId === "A1-7");
  const day12 = slides.find((slide) => slide.assignmentId === "A1-8");

  assert.ok(day11, "A1 Day 11 / A1-7 teaching slide missing");
  assert.ok(day12, "A1 Day 12 / A1-8 teaching slide missing");

  assert.equal(day11.dayNumber, 11);
  assert.equal(day11.day, "Day 11");
  assert.match(day11.title, /^A1 Day 11 ·/);
  assert.match(day11.topic, /Die 12-Stunden-Uhr/);

  assert.equal(day12.dayNumber, 12);
  assert.equal(day12.day, "Day 12");
  assert.match(day12.title, /^A1 Day 12 ·/);
  assert.match(day12.topic, /Die 24-Stunden-Uhr und Datum/);

  assert.ok(slides.some((slide) => slide.dayNumber === 11), "A1 Day 11 should be visible in the teacher slide list");
  assert.ok(slides.some((slide) => slide.dayNumber === 12), "A1 Day 12 should be visible in the teacher slide list");
});

test("A1 workbook-aligned Day 1-10 lessons retain their real workbook bridge", () => {
  assert.ok(WORKBOOK_ALIGNED.length >= 10);

  for (const slide of WORKBOOK_ALIGNED) {
    const stages = buildTeachingPresenterStages(slide, slide.topic);
    const workbook = stages.find((stage) => stage.id === "workbook");
    assert.ok(workbook, `${slide.assignmentId} missing workbook stage`);
    assert.ok(workbook.items.length >= 3, `${slide.assignmentId} missing workbook parts`);
    assert.match(workbook.workbookUrl, /^\/campus\/course\//, `${slide.assignmentId} workbook route`);
  }
});

test("A1-5.10 has a dedicated conjunctions slide linked to the Falowen grammar page", () => {
  const slide = getSlidesByCourse("A1").find((entry) => entry.assignmentId === "A1-5.10");
  assert.ok(slide, "A1-5.10 slide missing");
  assert.equal(slide.id, "a1-5-10");
  assert.equal(slide.workbookConnection?.grammarUrl, "/campus/course/conjunctions-5-10");
  assert.equal(slide.workbookConnection?.workbookUrl, "");

  const stages = buildTeachingPresenterStages(slide, slide.topic);
  const workbook = stages.find((stage) => stage.id === "workbook");
  assert.ok(workbook, "A1-5.10 missing workbook/grammar bridge stage");
  assert.equal(workbook.grammarUrl, "/campus/course/conjunctions-5-10");
  assert.equal(workbook.workbookUrl, "");
  assert.ok(workbook.items.length >= 4);

  const classroomContent = JSON.stringify(stages);
  for (const conjunction of ["und", "aber", "oder", "denn"]) {
    assert.match(classroomContent, new RegExp(`\\b${conjunction}\\b`, "i"), `A1-5.10 missing ${conjunction}`);
  }
});

test("later A1 generic lessons do not invent workbook links", () => {
  const alignedIds = new Set(WORKBOOK_ALIGNED.map((slide) => String(slide.assignmentId || "").toUpperCase()));
  const laterSlides = getSlidesByCourse("A1").filter((slide) => {
    const assignmentId = String(slide.assignmentId || "").toUpperCase();
    return !isTutorial(slide) && !alignedIds.has(assignmentId) && !VERIFIED_LATER_IDS.has(assignmentId);
  });
  assert.ok(laterSlides.length > 0);

  for (const slide of laterSlides) {
    const stages = buildTeachingPresenterStages(slide, slide.topic);
    const workbook = stages.find((stage) => stage.id === "workbook");
    if (workbook) {
      assert.equal(workbook.workbookUrl, "", `${slide.assignmentId} should not invent a workbook URL`);
      assert.equal(workbook.grammarUrl, "", `${slide.assignmentId} should not invent a grammar URL`);
    }
  }
});
