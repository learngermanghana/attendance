import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { _test } = require("../functions/classSessionReminderEmails.js");

const {
  buildCheckinUrl,
  buildReminderMessage,
  resolveCheckinBaseUrl,
  rowForReminder,
} = _test;

test("class reminder check-in URL carries only the canonical class and session identity", () => {
  const klass = {
    id: "Y4xjoaF5wK0RmDyIEvkY",
    name: "A2 Munich Klasse",
    timezone: "Africa/Accra",
    levelId: "A2",
  };
  const session = {
    id: "A2 Munich Klasse_2026-09-02_1900",
    classId: klass.id,
    startsAt: "2026-09-02T19:00:00.000Z",
    endsAt: "2026-09-02T20:30:00.000Z",
    topic: "Day 14: Beruf und Karriere",
    assignmentIds: ["A2-5.14"],
  };
  const students = Array.from({ length: 10 }, (_, index) => ({
    id: `student-${index + 1}`,
    classId: klass.id,
    role: "student",
    status: "active",
    name: `Student ${index + 1}`,
    email: `student${index + 1}@example.com`,
  }));

  const url = buildCheckinUrl({ klass, session, students });

  assert.equal(
    url,
    "https://admin.falowen.app/checkin?classId=Y4xjoaF5wK0RmDyIEvkY&sessionId=A2+Munich+Klasse_2026-09-02_1900",
  );
  assert.ok(!url.includes("expectedStudents"));
  assert.ok(!url.includes("expectedCount"));
  assert.ok(!url.includes("sessionLabel"));
  assert.ok(!url.includes("assignmentId"));
  assert.ok(url.length < 150);
});

test("short check-in URL is included in reminder text and dedicated webhook fields", () => {
  const klass = { id: "a2-munich", name: "A2 Munich Klasse", timezone: "Africa/Accra" };
  const session = {
    id: "a2-munich-2026-09-02-1900",
    startsAt: "2026-09-02T19:00:00.000Z",
    endsAt: "2026-09-02T20:30:00.000Z",
    topic: "Day 14: Beruf und Karriere",
    assignmentIds: ["A2-5.14"],
  };
  const student = { name: "Ama", email: "ama@example.com" };
  const checkinUrl = "https://admin.falowen.app/checkin?classId=a2-munich&sessionId=a2-munich-2026-09-02-1900";

  const message = buildReminderMessage({
    student,
    klass,
    session,
    leadMin: 10,
    checkinUrl,
  });
  const row = rowForReminder({
    klass,
    student,
    session,
    leadMin: 10,
    message,
    checkinUrl,
  });

  assert.match(message, /Check In Now/);
  assert.ok(message.includes(checkinUrl));
  assert.equal(row.checkin_link, checkinUrl);
  assert.equal(row.checkin_link_label, "Check In Now");
});

test("check-in base URL can be configured but defaults to Falowen Admin", () => {
  assert.equal(resolveCheckinBaseUrl({}, {}), "https://admin.falowen.app");
  assert.equal(
    resolveCheckinBaseUrl({ communication: { class_checkin_base_url: "https://admin.example.com/" } }, {}),
    "https://admin.example.com",
  );
});
