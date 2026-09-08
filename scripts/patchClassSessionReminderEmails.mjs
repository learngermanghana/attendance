import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const indexPath = path.join(repoRoot, "functions", "index.js");
const workerPath = path.join(repoRoot, "functions", "classSessionReminderEmails.js");

let source = fs.readFileSync(indexPath, "utf8");
const requireLine = 'const { createClassSessionReminderEmailJob } = require("./classSessionReminderEmails.js");';
const requireAnchor = 'const { defineSecret } = require("firebase-functions/params");';
const exportLine = 'exports.sendClassSessionReminderEmails = createClassSessionReminderEmailJob({ admin, db, onSchedule, runtimeConfig });';
const exportAnchor = "exports.api = onRequest({";

if (!source.includes(requireLine)) {
  if (!source.includes(requireAnchor)) throw new Error("Could not find the Firebase params import for class reminder patching.");
  source = source.replace(requireAnchor, `${requireAnchor}\n${requireLine}`);
}

if (!source.includes(exportLine)) {
  if (!source.includes(exportAnchor)) throw new Error("Could not find the Firebase API export anchor for class reminder patching.");
  source = source.replace(exportAnchor, `${exportLine}\n\n${exportAnchor}`);
}

fs.writeFileSync(indexPath, source);

let workerSource = fs.readFileSync(workerPath, "utf8");
const zoomConfigAnchor = "const DEFAULT_GRACE_MIN = 7;";
const zoomConfigBlock = [
  "const DEFAULT_CLASS_REMINDER_ZOOM = Object.freeze({",
  '  joinUrl: "https://us06web.zoom.us/j/6886900916?pwd=bEdtR3RLQ2dGTytvYzNrMUV3eFJwUT09",',
  '  chatUrl: "https://us06web.zoom.us/launch/jc/6886900916",',
  '  meetingId: "688 690 0916",',
  '  passcode: "german",',
  '  sip: "6886900916@zoomcrc.com",',
  "});",
].join("\n");

if (!workerSource.includes("const DEFAULT_CLASS_REMINDER_ZOOM")) {
  if (!workerSource.includes(zoomConfigAnchor)) throw new Error("Could not find the class reminder Zoom configuration anchor.");
  workerSource = workerSource.replace(zoomConfigAnchor, `${zoomConfigAnchor}\n${zoomConfigBlock}`);
}

if (!workerSource.includes("chatUrl: DEFAULT_CLASS_REMINDER_ZOOM.chatUrl")) {
  const zoomDetailsPattern = /function zoomDetails\(klass = \{\}, profile = \{\}\) \{[\s\S]*?\n\}\n\nfunction buildReminderMessage/;
  const fixedZoomDetails = [
    "function zoomDetails() {",
    "  return {",
    "    url: DEFAULT_CLASS_REMINDER_ZOOM.joinUrl,",
    "    chatUrl: DEFAULT_CLASS_REMINDER_ZOOM.chatUrl,",
    "    meetingId: DEFAULT_CLASS_REMINDER_ZOOM.meetingId,",
    "    passcode: DEFAULT_CLASS_REMINDER_ZOOM.passcode,",
    "    sip: DEFAULT_CLASS_REMINDER_ZOOM.sip,",
    "  };",
    "}",
    "",
    "function buildReminderMessage",
  ].join("\n");
  if (!zoomDetailsPattern.test(workerSource)) throw new Error("Could not find the class reminder Zoom details function.");
  workerSource = workerSource.replace(zoomDetailsPattern, fixedZoomDetails);
}

if (!workerSource.includes('lines.push("", "Meeting chat link", zoom.chatUrl);')) {
  const joinBlockPattern = /  if \(zoom\.url \|\| zoom\.meetingId \|\| zoom\.passcode\) \{[\s\S]*?\n  \}\n  lines\.push/;
  const fixedJoinBlock = [
    "  if (zoom.url || zoom.chatUrl || zoom.meetingId || zoom.passcode || zoom.sip) {",
    '    lines.push("", "Join Zoom Meeting");',
    "    if (zoom.url) lines.push(zoom.url);",
    '    if (zoom.chatUrl) lines.push("", "Meeting chat link", zoom.chatUrl);',
    '    if (zoom.meetingId) lines.push("", `Meeting ID: ${zoom.meetingId}`);',
    '    if (zoom.passcode) lines.push(`Passcode: ${zoom.passcode}`);',
    '    if (zoom.sip) lines.push("", "Join by SIP", `• ${zoom.sip}`);',
    "  }",
    "  lines.push",
  ].join("\n");
  if (!joinBlockPattern.test(workerSource)) throw new Error("Could not find the class reminder Zoom message block.");
  workerSource = workerSource.replace(joinBlockPattern, fixedJoinBlock);
}

if (!workerSource.includes("link: text(DEFAULT_CLASS_REMINDER_ZOOM.joinUrl),")) {
  if (!workerSource.includes('    link: "",')) throw new Error("Could not find the class reminder announcement link field.");
  workerSource = workerSource.replace('    link: "",', "    link: text(DEFAULT_CLASS_REMINDER_ZOOM.joinUrl),");
}

const stateHelper = `async function writeClassReminderState({ db, admin, klass, session, leadMin, status, skipReason = "", error = "", recipientCount = null }) {
  if (!klass?.id) return;
  const timestamp = admin.firestore.FieldValue.serverTimestamp();
  const payload = {
    classReminderEmailLastRunAt: timestamp,
    classReminderEmailLastStatus: status,
    classReminderEmailLastSkipReason: skipReason,
    classReminderEmailLastError: error,
    classReminderEmailLastSessionId: text(session?.id),
    classReminderEmailLastTopic: topicForSession(session || {}),
    classReminderEmailLastLeadMinutes: Number(leadMin || 0),
    classReminderEmailLastSessionStartsAt: sessionStart(session)?.toISOString() || "",
  };
  if (recipientCount !== null) payload.classReminderEmailLastRecipientCount = Number(recipientCount || 0);
  await db.collection("classes").doc(klass.id).set(payload, { merge: true });
}

`;

if (!workerSource.includes("async function writeClassReminderState")) {
  const anchor = "async function processReminder({ admin, db, due, classes, students, config, now, fetchImpl, runtimeConfig = {} }) {";
  if (!workerSource.includes(anchor)) throw new Error("Could not find class reminder process function.");
  workerSource = workerSource.replace(anchor, `${stateHelper}${anchor}`);
}

if (!workerSource.includes('status: "skipped", skipReason: "inactive_or_missing_class"')) {
  workerSource = workerSource.replace(
`  if (!klass || BLOCKED_CLASS_STATUSES.has(comparable(klass.status)) || !classReminderEnabled(klass)) {
    return { sent: 0, skipped: "inactive_or_missing_class" };
  }`,
`  if (!klass || BLOCKED_CLASS_STATUSES.has(comparable(klass.status)) || !classReminderEnabled(klass)) {
    if (klass) await writeClassReminderState({ db, admin, klass, session, leadMin, status: "skipped", skipReason: "inactive_or_missing_class" });
    return { sent: 0, skipped: "inactive_or_missing_class" };
  }`);
}

if (!workerSource.includes('skipReason: "holiday_closed"')) {
  workerSource = workerSource.replace(
`    return { sent: 0, skipped: "holiday_closed" };`,
`    await writeClassReminderState({ db, admin, klass, session, leadMin, status: "skipped", skipReason: "holiday_closed" });
    return { sent: 0, skipped: "holiday_closed" };`);
}

if (!workerSource.includes('skipReason: "no_recipients"')) {
  workerSource = workerSource.replace(
`  if (!recipients.length) return { sent: 0, skipped: "no_recipients" };`,
`  if (!recipients.length) {
    await writeClassReminderState({ db, admin, klass, session, leadMin, status: "skipped", skipReason: "no_recipients", recipientCount: 0 });
    return { sent: 0, skipped: "no_recipients" };
  }`);
}

if (!workerSource.includes('skipReason: "already_sent_or_changed"')) {
  workerSource = workerSource.replace(
`  if (!sendRef) return { sent: 0, skipped: "already_sent_or_changed" };`,
`  if (!sendRef) {
    await writeClassReminderState({ db, admin, klass, session, leadMin, status: "skipped", skipReason: "already_sent_or_changed", recipientCount: recipients.length });
    return { sent: 0, skipped: "already_sent_or_changed" };
  }`);
}

if (!workerSource.includes('status: "processing", recipientCount: recipients.length')) {
  workerSource = workerSource.replace(
`  const profile = await loadZoomProfile(db, klass);`,
`  await writeClassReminderState({ db, admin, klass, session, leadMin, status: "processing", recipientCount: recipients.length });

  const profile = await loadZoomProfile(db, klass);`);
}

if (!workerSource.includes('classReminderEmailLastSkipReason: "",')) {
  workerSource = workerSource.replace(
`      classReminderEmailLastStatus: "sent",
      classReminderEmailLastSentCount: rows.length,`,
`      classReminderEmailLastStatus: "sent",
      classReminderEmailLastSkipReason: "",
      classReminderEmailLastLeadMinutes: leadMin,
      classReminderEmailLastSessionStartsAt: sessionStart(session)?.toISOString() || "",
      classReminderEmailLastSentCount: rows.length,`);
}

if (!workerSource.includes('classReminderEmailLastStatus: "failed",\n      classReminderEmailLastSkipReason: "",')) {
  workerSource = workerSource.replace(
`      classReminderEmailLastStatus: "failed",
      classReminderEmailLastError: message,`,
`      classReminderEmailLastStatus: "failed",
      classReminderEmailLastSkipReason: "",
      classReminderEmailLastLeadMinutes: leadMin,
      classReminderEmailLastSessionStartsAt: sessionStart(session)?.toISOString() || "",
      classReminderEmailLastError: message,`);
}

fs.writeFileSync(workerPath, workerSource);

const patchedIndex = fs.readFileSync(indexPath, "utf8");
const worker = fs.readFileSync(workerPath, "utf8");
const checks = [
  [patchedIndex.includes(requireLine), "Class reminder worker import is missing."],
  [patchedIndex.includes(exportLine), "Class reminder scheduled export is missing."],
  [worker.includes('schedule: "*/5 * * * *"'), "Five-minute class reminder schedule is missing."],
  [worker.includes("topicForSession"), "Session topic resolution is missing."],
  [worker.includes("remindersSuppressed"), "Cancelled-session reminder suppression is missing."],
  [worker.includes("holidayCalendar"), "Holiday closure lookup is missing."],
  [worker.includes("classReminderSends"), "Class reminder deduplication is missing."],
  [worker.includes("async function writeClassReminderState"), "Server reminder diagnostic writer is missing."],
  [worker.includes('skipReason: "already_sent_or_changed"'), "Reminder reservation skip diagnostics are missing."],
  [worker.includes('skipReason: "no_recipients"'), "Reminder recipient skip diagnostics are missing."],
  [worker.includes("https://us06web.zoom.us/j/6886900916?pwd=bEdtR3RLQ2dGTytvYzNrMUV3eFJwUT09"), "Class reminder Zoom join link is missing."],
  [worker.includes("https://us06web.zoom.us/launch/jc/6886900916"), "Class reminder Zoom chat link is missing."],
  [worker.includes("6886900916@zoomcrc.com"), "Class reminder Zoom SIP address is missing."],
  [worker.includes("link: text(DEFAULT_CLASS_REMINDER_ZOOM.joinUrl),"), "Announcement row Zoom link is missing."],
  [worker.includes("runAutoOpenCheckins"), "Automatic 30-minute attendance opener is missing."],
  [worker.includes("baseUrl: resolveCheckinBaseUrl(runtimeConfig)"), "Runtime check-in base URL is not threaded into reminder delivery."],
];
for (const [passed, message] of checks) {
  if (!passed) throw new Error(message);
}

console.log("Session-topic class reminder scheduler, auto check-in, runtime URL delivery diagnostics and standard Zoom meeting verified.");
