import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const workerPath = path.join(repoRoot, "functions", "classSessionReminderEmails.js");
const patchPath = path.join(repoRoot, "scripts", "patchClassSessionReminderEmails.mjs");
const concisePatchPath = path.join(repoRoot, "scripts", "patchClassReminderConciseLinks.mjs");
const workerSource = fs.readFileSync(workerPath, "utf8");
const patchSource = fs.readFileSync(patchPath, "utf8");
const concisePatchSource = fs.readFileSync(concisePatchPath, "utf8");

const JOIN_URL = "https://us06web.zoom.us/j/6886900916?pwd=bEdtR3RLQ2dGTytvYzNrMUV3eFJwUT09";
const CHAT_URL = "https://us06web.zoom.us/launch/jc/6886900916";

function reminderFixture() {
  return {
    student: { name: "Felix", email: "felix@example.com" },
    klass: {
      id: "a1-berlin",
      name: "A1 Berlin Klasse",
      levelId: "A1",
      timezone: "Africa/Accra",
      zoomUrl: "https://example.com/old-class-link",
      zoomMeetingId: "OLD-ID",
      zoomPasscode: "old-passcode",
    },
    session: {
      id: "a1-berlin-day-1",
      startsAt: "2026-07-22T17:00:00.000Z",
      topic: "German cases",
    },
  };
}

test("deployment patches contain the standard Zoom meeting and concise CTA", () => {
  assert.ok(patchSource.includes(JOIN_URL));
  assert.ok(patchSource.includes(CHAT_URL));
  assert.ok(patchSource.includes('meetingId: "688 690 0916"'));
  assert.ok(patchSource.includes('passcode: "german"'));
  assert.ok(patchSource.includes('sip: "6886900916@zoomcrc.com"'));
  assert.ok(concisePatchSource.includes('"Join Zoom"'));
});

if (workerSource.includes("const DEFAULT_CLASS_REMINDER_ZOOM")) {
  const require = createRequire(import.meta.url);
  const { _test } = require("../functions/classSessionReminderEmails.js");
  const {
    buildReminderMessage,
    rowForReminder,
    zoomDetails,
  } = _test;

  test("30-minute and 10-minute reminders use a clean Zoom CTA with backup credentials", () => {
    const fixture = reminderFixture();
    const zoom = zoomDetails(fixture.klass, {
      joinUrl: "https://example.com/old-profile-link",
      meetingId: "OLD-PROFILE-ID",
    });

    assert.deepEqual(zoom, {
      url: JOIN_URL,
      chatUrl: CHAT_URL,
      meetingId: "688 690 0916",
      passcode: "german",
      sip: "6886900916@zoomcrc.com",
    });

    for (const leadMin of [30, 10]) {
      const message = buildReminderMessage({ ...fixture, leadMin, zoom });
      assert.match(message, new RegExp(`starts in ${leadMin} minutes`));
      assert.match(message, /Join Zoom: use the Join Zoom button in this email\./);
      assert.ok(!message.includes(JOIN_URL));
      assert.ok(!message.includes(CHAT_URL));
      assert.doesNotMatch(message, /Meeting chat link/);
      assert.doesNotMatch(message, /Join by SIP/);
      assert.match(message, /Meeting ID: 688 690 0916/);
      assert.match(message, /Passcode: german/);

      const row = rowForReminder({
        klass: fixture.klass,
        student: fixture.student,
        session: fixture.session,
        leadMin,
        message,
        zoom,
      });
      assert.equal(row.link, JOIN_URL);
      assert.equal(row.button_label, "Join Zoom");
    }
  });
} else {
  test("runtime Zoom assertions run after the deployment patches", {
    skip: "Run class reminder deployment patches before this runtime test.",
  }, () => {});
}
