import test from "node:test";
import assert from "node:assert/strict";

import { buildScheduleExports, generateCourseSchedule } from "../src/utils/courseScheduleGenerator.js";

test("generateCourseSchedule assigns dates in curriculum order and skips holidays", () => {
  const rows = generateCourseSchedule({
    level: "A1",
    startDate: "2026-02-09", // Monday
    defaultWeekdays: ["Monday", "Tuesday"],
    holidayDates: ["2026-02-10"],
  });

  assert.equal(rows.length, 24);
  assert.equal(rows[0].dateIso, "2026-02-09");
  assert.equal(rows[1].dateIso, "2026-02-16");
  assert.equal(rows[0].day, "Day 1");
  assert.equal(rows[1].day, "Day 2");
});

test("generateCourseSchedule advanced mode falls back to default weekdays when a week has no selected days", () => {
  const rows = generateCourseSchedule({
    level: "A1",
    startDate: "2026-02-09",
    defaultWeekdays: ["Wednesday"],
    useAdvancedWeekdays: true,
    weekDaysMap: {
      "Week Two": ["Friday"],
    },
  });

  assert.equal(rows[0].dateIso, "2026-02-11"); // Week One fallback Wednesday
  assert.equal(rows[1].dateIso, "2026-02-13"); // Week Two custom Friday
});

test("buildScheduleExports serializes metadata and sessions", () => {
  const rows = [
    { week: "Week One", day: "Day 1", date: "Monday, 09 February 2026", dateIso: "2026-02-09", topic: "Intro" },
  ];

  const result = buildScheduleExports({
    level: "A1",
    startDate: "2026-02-09",
    holidayDates: ["2026-02-12"],
    rows,
  });

  assert.match(result.txt, /Course Schedule \(A1\)/);
  assert.equal(result.json.course_level, "A1");
  assert.equal(result.json.total_sessions, 1);
  assert.deepEqual(result.json.holidays, ["2026-02-12"]);
  assert.equal(result.json.sessions[0].topic, "Intro");
});
