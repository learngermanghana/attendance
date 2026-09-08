const baseExports = require("./index.js");
const admin = require("firebase-admin");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const {
  runExpiredPendingStudentCleanup,
} = require("./pendingStudentCleanup.js");
const { runClassSessionReminderEmailJob } = require("./classSessionReminderEmails.js");

const db = admin.firestore();

function parseRuntimeConfig() {
  const raw = process.env.CLOUD_RUNTIME_CONFIG || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    console.warn("pending_cleanup_runtime_config_invalid");
    return {};
  }
}

async function cleanupExpiredPendingStudentsNow() {
  return runExpiredPendingStudentCleanup({
    admin,
    db,
    now: Date.now(),
    // Google Sheet cleanup is optional. The production Firebase project does
    // not currently have the student-delete webhook secrets configured, so
    // account/data deletion must never depend on them.
    appsScriptUrl: String(process.env.STUDENT_DELETE_APPS_SCRIPT_URL || "").trim(),
    syncSecret: String(process.env.STUDENT_DELETE_SYNC_SECRET || "").trim(),
  });
}

module.exports = baseExports;

module.exports.cleanupExpiredPendingStudents = onSchedule({
  schedule: "*/5 * * * *",
  timeZone: "Africa/Accra",
  retryCount: 1,
  memory: "256MiB",
}, async () => {
  const result = await cleanupExpiredPendingStudentsNow();
  console.log("expired_pending_student_cleanup", {
    checked: result.checked,
    candidates: result.candidates,
    deleted: result.deleted,
  });
  return result;
});

// Replace the original reminder export with a cleanup-first version. Pending
// students keep receiving reminders during their valid 7-day window, but once
// that window expires they are deleted before the reminder job reads students.
module.exports.sendClassSessionReminderEmails = onSchedule({
  schedule: "*/5 * * * *",
  timeZone: "Africa/Accra",
  retryCount: 1,
}, async () => {
  const cleanup = await cleanupExpiredPendingStudentsNow();
  console.log("class_reminder_pre_cleanup", {
    checked: cleanup.checked,
    candidates: cleanup.candidates,
    deleted: cleanup.deleted,
  });
  return runClassSessionReminderEmailJob({
    admin,
    db,
    runtimeConfig: parseRuntimeConfig(),
    now: new Date(),
  });
});
