import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { _test = {} } = require("../functions/classSessionReminderEmails.js");

if (typeof _test.buildChapterLinks === "function" && typeof _test.resolveSessionDay === "function") {
  test("explicit curriculum day wins over curriculum index", () => {
    assert.equal(_test.resolveSessionDay({ curriculumIndex: 1, curriculumDay: 0 }), 0);
  });

  test("A2 and B1 orientation assignments do not emit Course Book links", () => {
    for (const level of ["A2", "B1"]) {
      const links = _test.buildChapterLinks({
        klass: { levelId: level },
        session: {
          assignmentIds: [`${level}-ORIENTATION`],
          curriculumIndex: 1,
          curriculumDay: 0,
          topic: "Orientation",
        },
        baseUrl: "https://www.falowen.app",
      });
      assert.deepEqual(links, []);
    }
  });
} else {
  test("orientation link assertions run after the reminder patch", {
    skip: "Run patchClassSessionReminderEmails.mjs and patchClassReminderConciseLinks.mjs before this test.",
  }, () => {});
}
