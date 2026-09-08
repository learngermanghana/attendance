const baseExports = require("./index.js");
const admin = require("firebase-admin");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { createExpiredPendingStudentCleanupJob } = require("./pendingStudentCleanup.js");

const studentDeleteAppsScriptUrlSecret = defineSecret("STUDENT_DELETE_APPS_SCRIPT_URL");
const studentDeleteSyncSecret = defineSecret("STUDENT_DELETE_SYNC_SECRET");

module.exports = baseExports;
module.exports.cleanupExpiredPendingStudents = createExpiredPendingStudentCleanupJob({
  admin,
  db: admin.firestore(),
  onSchedule,
  appsScriptUrlSecret: studentDeleteAppsScriptUrlSecret,
  syncSecret: studentDeleteSyncSecret,
});
