const baseExports = require("./index.js");
const admin = require("firebase-admin");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const {
  createExpiredPendingStudentCleanupJob,
  runExpiredPendingStudentCleanup,
} = require("./pendingStudentCleanup.js");
const { runClassSessionReminderEmailJob } = require("./classSessionReminderEmails.js");

const studentDeleteAppsScriptUrlSecret = defineSecret("STUDENT_DELETE_APPS_SCRIPT_URL");
const studentDeleteSyncSecret = defineSecret("STUDENT_DELETE_SYNC_SECRET");
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

function secretValue(secret, envName) {
  try {
    return String(secret?.value?.() || process.env[envName] || "").trim();
  } catch {
    return String(process.env[envName] || "").trim();
  }
}

async function cleanupExpiredPendingStudentsNow() {
  return runExpiredPendingStudentCleanup({
    admin,
    db,
    now: Date.now(),
    appsScriptUrl: secretValue(studentDeleteAppsScriptUrlSecret, "STUDENT_DELETE_APPS_SCRIPT_URL"),
    syncSecret: secretValue(studentDeleteSyncSecret, "STUDENT_DELETE_SYNC_SECRET"),
  });
}

module.exports = baseExports;

module.exports.cleanupExpiredPendingStudents = createExpiredPendingStudentCleanupJob({
  admin,
  db,
  onSchedule,
  appsScriptUrlSecret: studentDeleteAppsScriptUrlSecret,
  syncSecret: studentDeleteSyncSecret,
});

// Replace the original reminder export with a cleanup-first version. Pending
// students keep receiving reminders during their valid 7-day window, but once
// that window expires they are deleted before the reminder job reads students.
module.exports.sendClassSessionReminderEmails = onSchedule({
  schedule: "*/5 * * * *",
  timeZone: "Africa/Accra",
  retryCount: 1,
  secrets: [studentDeleteAppsScriptUrlSecret, studentDeleteSyncSecret],
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
