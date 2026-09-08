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

if (!workerSource.includes('const DEFAULT_FALOWEN_LEARNING_BASE_URL = "https://www.falowen.app";')) {
  const anchor = 'const DEFAULT_CHECKIN_BASE_URL = "https://admin.falowen.app";';
  if (!workerSource.includes(anchor)) throw new Error("Could not find the check-in URL constant for learning-link patching.");
  workerSource = workerSource.replace(
    anchor,
    `${anchor}\nconst DEFAULT_FALOWEN_LEARNING_BASE_URL = "https://www.falowen.app";`,
  );
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

if (!workerSource.includes("function buildChapterLinks")) {
  const helperAnchor = "function buildCheckinUrl";
  if (!workerSource.includes(helperAnchor)) throw new Error("Could not find the class reminder check-in URL builder.");
  const helperBlock = `function resolveReminderLearningBaseUrl(runtimeConfig = {}, env = process.env) {
  const communication = runtimeConfig.communication
    || runtimeConfig.announcements
    || runtimeConfig.announcement
    || {};
  return text(
    env.FALOWEN_LEARNING_BASE_URL
    || communication.falowen_learning_base_url
    || communication.learning_base_url
    || DEFAULT_FALOWEN_LEARNING_BASE_URL,
  ).replace(/\\/+$/, "") || DEFAULT_FALOWEN_LEARNING_BASE_URL;
}

function resolveSessionDay(session = {}) {
  const candidates = [
    session.curriculumIndex,
    session.curriculumDay,
    session.day,
    session.dayNumber,
    session.officialSessionIndex,
    session.sessionIndex,
    session.dayIndex,
  ];
  for (const value of candidates) {
    const numeric = Number(value);
    if (Number.isInteger(numeric) && numeric >= 0) return numeric;
  }
  const label = text(session.topic || session.title || session.sessionLabel || session.lessonTitle);
  const match = label.match(/\\bday\\s*(\\d+)\\b/i);
  return match?.[1] ? Number(match[1]) : null;
}

function assignmentLearningIdentity(assignmentId = "") {
  const raw = text(assignmentId);
  const match = raw.match(/^([A-C]\\d)-(.+)$/i);
  if (!match) return null;
  const level = match[1].toUpperCase();
  let identity = text(match[2]);
  if (!identity || /^(tutorial|complete)$/i.test(identity)) return null;
  const practice = /-PRACTICE$/i.test(identity);
  identity = identity.replace(/-PRACTICE$/i, "");
  const routeKey = `${identity.toLowerCase()}${practice ? "-practice" : ""}`;
  return { level, chapter: identity, routeKey, practice };
}

function buildChapterLinks({ klass = {}, session = {}, baseUrl = DEFAULT_FALOWEN_LEARNING_BASE_URL } = {}) {
  const root = text(baseUrl).replace(/\\/+$/, "") || DEFAULT_FALOWEN_LEARNING_BASE_URL;
  const fallbackLevel = text(klass.levelId || klass.level).toUpperCase();
  const day = resolveSessionDay(session);
  const seen = new Set();
  return assignmentIds(session).flatMap((assignmentId) => {
    const identity = assignmentLearningIdentity(assignmentId);
    if (!identity) return [];
    const level = identity.level || fallbackLevel;
    let route = "";
    if (level === "A1") {
      const segment = encodeURIComponent(identity.routeKey);
      route = identity.routeKey.includes(".")
        ? `/campus/course/lesson/A1/${segment}`
        : `/campus/course/lesson/A1/chapter/${segment}`;
    } else if (level && Number.isInteger(day)) {
      route = `/campus/course/lesson/${encodeURIComponent(level)}/${day}?view=workbook`;
    }
    if (!route) return [];
    const url = `${root}${route}`;
    if (seen.has(url)) return [];
    seen.add(url);
    return [{
      assignmentId: text(assignmentId),
      chapter: identity.chapter,
      label: `Open Chapter ${identity.chapter}${identity.practice ? " Practice" : ""}`,
      url,
    }];
  });
}

`;
  workerSource = workerSource.replace(helperAnchor, `${helperBlock}${helperAnchor}`);
}

if (!workerSource.includes("new URLSearchParams({ classId, sessionId })")) {
  const checkinPattern = /function buildCheckinUrl\(\{ klass = \{\}, session = \{\}, students = \[\], baseUrl = DEFAULT_CHECKIN_BASE_URL \} = \{\}\) \{[\s\S]*?\n\}\n\nfunction zoomDetails/;
  const shortCheckin = `function buildCheckinUrl({ klass = {}, session = {}, baseUrl = DEFAULT_CHECKIN_BASE_URL } = {}) {
  const classId = text(klass.id || klass.classId || klass.classRecordId);
  const sessionId = text(session.id);
  if (!classId || !sessionId) return "";
  const params = new URLSearchParams({ classId, sessionId });
  return `${text(baseUrl).replace(/\\/+$/, "") || DEFAULT_CHECKIN_BASE_URL}/checkin?${params.toString()}`;
}

function zoomDetails`;
  if (!checkinPattern.test(workerSource)) throw new Error("Could not find the long class reminder check-in URL builder.");
  workerSource = workerSource.replace(checkinPattern, shortCheckin);
}

if (!workerSource.includes("Open today’s Course Book:")) {
  const messagePattern = /function buildReminderMessage\(\{[\s\S]*?\n\}\n\nfunction rowForReminder/;
  const conciseMessage = `function buildReminderMessage({ student, klass, session, leadMin, zoom = {}, checkinUrl = "", chapterLinks = [] } = {}) {
  const timezone = text(klass.timezone) || TZ;
  const startsAt = sessionStart(session);
  const name = text(student.name || student.displayName) || "Student";
  const className = text(klass.name || klass.className || klass.classId || klass.id) || "your class";
  const assignments = assignmentIds(session);
  const lines = [
    `Hello ${name},`,
    "",
    `Your ${className} class starts in ${leadMin} minutes.`,
    "",
    `Topic: ${topicForSession(session)}`,
    ...(assignments.length ? [`Assignment${assignments.length === 1 ? "" : "s"}: ${assignments.join(" + ")}`] : []),
    `Date: ${formatDate(startsAt, timezone)}`,
    `Time: ${formatTime(startsAt, timezone)} Ghana time`,
  ];
  if (zoom.url) {
    lines.push("", "Join Zoom: use the Join Zoom button in this email.");
  }
  if (chapterLinks.length) {
    lines.push("", "Open today’s Course Book:");
    chapterLinks.forEach((link) => lines.push(`${link.label}: ${link.url}`));
  }
  if (checkinUrl) {
    lines.push("", "Check In Now", checkinUrl);
  }
  if (zoom.meetingId || zoom.passcode) {
    lines.push("");
    if (zoom.meetingId) lines.push(`Meeting ID: ${zoom.meetingId}`);
    if (zoom.passcode) lines.push(`Passcode: ${zoom.passcode}`);
  }
  lines.push("", "Please join 5 minutes early.", "", "Best regards,", "Learn Language Education Academy (Falowen)");
  return lines.join("\\n");
}

function rowForReminder`;
  if (!messagePattern.test(workerSource)) throw new Error("Could not find the class reminder message builder.");
  workerSource = workerSource.replace(messagePattern, conciseMessage);
}

if (!workerSource.includes("chapter_links: JSON.stringify(chapterLinks),")) {
  const rowPattern = /function rowForReminder\(\{[\s\S]*?\n\}\n\nasync function postRows/;
  const rowBlock = `function rowForReminder({ klass, student, session, leadMin, message, checkinUrl = "", zoom = {}, chapterLinks = [] } = {}) {
  return {
    announcement: message,
    class: text(klass.name || klass.className || klass.classId || klass.id),
    date: isoDate(sessionStart(session), text(klass.timezone) || TZ),
    link: text(zoom.url || DEFAULT_CLASS_REMINDER_ZOOM.joinUrl),
    button_label: text(zoom.url || DEFAULT_CLASS_REMINDER_ZOOM.joinUrl) ? "Join Zoom" : "",
    checkin_link: checkinUrl,
    checkin_link_label: checkinUrl ? "Check In Now" : "",
    course_link: chapterLinks[0]?.url || "",
    course_link_label: chapterLinks.length ? "Open Course Book" : "",
    chapter_links: JSON.stringify(chapterLinks),
    topic: `Class reminder — ${topicForSession(session)}`,
    email: text(student.email),
    attach_certificate: "FALSE",
    cert_level: text(klass.levelId || klass.level),
    delivery_mode: "individual",
    allow_bcc_fallback: "FALSE",
    email_type: "class_reminder",
    reminder_lead_minutes: String(leadMin),
    show_progress: "FALSE",
    show_review: "FALSE",
    show_app_button: "FALSE",
    show_class: "TRUE",
    show_date: "TRUE",
  };
}

async function postRows`;
  if (!rowPattern.test(workerSource)) throw new Error("Could not find the class reminder webhook row builder.");
  workerSource = workerSource.replace(rowPattern, rowBlock);
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

if (!workerSource.includes("const chapterLinks = buildChapterLinks")) {
  const rowsBlock = `  const rows = recipients.map((student) => {
    const message = buildReminderMessage({ student, klass, session, leadMin, zoom, checkinUrl });
    return rowForReminder({ klass, student, session, leadMin, message, checkinUrl });
  });`;
  const replacement = `  const chapterLinks = buildChapterLinks({
    klass,
    session,
    baseUrl: resolveReminderLearningBaseUrl(runtimeConfig),
  });
  const rows = recipients.map((student) => {
    const message = buildReminderMessage({ student, klass, session, leadMin, zoom, checkinUrl, chapterLinks });
    return rowForReminder({ klass, student, session, leadMin, message, checkinUrl, zoom, chapterLinks });
  });`;
  if (!workerSource.includes(rowsBlock)) throw new Error("Could not find class reminder row creation block.");
  workerSource = workerSource.replace(rowsBlock, replacement);
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

if (!workerSource.includes("    buildChapterLinks,")) {
  workerSource = workerSource.replace("    buildCheckinUrl,", "    buildChapterLinks,\n    buildCheckinUrl,");
}
if (!workerSource.includes("    resolveReminderLearningBaseUrl,")) {
  workerSource = workerSource.replace(
    "    resolveCheckinBaseUrl,",
    "    resolveCheckinBaseUrl,\n    resolveReminderLearningBaseUrl,\n    resolveSessionDay,",
  );
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
  [worker.includes('button_label: text(zoom.url || DEFAULT_CLASS_REMINDER_ZOOM.joinUrl) ? "Join Zoom" : "",'), "Join Zoom button label is missing."],
  [worker.includes("function buildChapterLinks"), "Course Book chapter link builder is missing."],
  [worker.includes("Open today’s Course Book:"), "Course Book links are missing from reminder copy."],
  [worker.includes("new URLSearchParams({ classId, sessionId })"), "Short check-in URL is missing."],
  [worker.includes("chapter_links: JSON.stringify(chapterLinks),"), "Structured chapter links are missing from webhook rows."],
  [worker.includes("runAutoOpenCheckins"), "Automatic 30-minute attendance opener is missing."],
  [worker.includes("baseUrl: resolveCheckinBaseUrl(runtimeConfig)"), "Runtime check-in base URL is not threaded into reminder delivery."],
];
for (const [passed, message] of checks) {
  if (!passed) throw new Error(message);
}

console.log("Class reminders now use concise Zoom CTA, short check-in URLs and task-matched Course Book links.");
