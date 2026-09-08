import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const workerPath = path.join(repoRoot, "functions", "classSessionReminderEmails.js");
let source = fs.readFileSync(workerPath, "utf8");

const replaceOnce = (before, after, label) => {
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`Could not patch ${label}: source anchor missing.`);
  source = source.replace(before, after);
};

if (!source.includes('const DEFAULT_FALOWEN_LEARNING_BASE_URL = "https://www.falowen.app";')) {
  replaceOnce(
    'const DEFAULT_CHECKIN_BASE_URL = "https://admin.falowen.app";',
    'const DEFAULT_CHECKIN_BASE_URL = "https://admin.falowen.app";\nconst DEFAULT_FALOWEN_LEARNING_BASE_URL = "https://www.falowen.app";',
    "learning base URL",
  );
}

if (!source.includes("function buildChapterLinks")) {
  const helpers = [
    'function resolveReminderLearningBaseUrl(runtimeConfig = {}, env = process.env) {',
    '  const communication = runtimeConfig.communication',
    '    || runtimeConfig.announcements',
    '    || runtimeConfig.announcement',
    '    || {};',
    '  return text(',
    '    env.FALOWEN_LEARNING_BASE_URL',
    '    || communication.falowen_learning_base_url',
    '    || communication.learning_base_url',
    '    || DEFAULT_FALOWEN_LEARNING_BASE_URL,',
    '  ).replace(/\\/+$/, "") || DEFAULT_FALOWEN_LEARNING_BASE_URL;',
    '}',
    '',
    'function resolveSessionDay(session = {}) {',
    '  const candidates = [',
    '    session.curriculumDay, session.day, session.dayNumber, session.curriculumIndex,',
    '    session.officialSessionIndex, session.sessionIndex, session.dayIndex,',
    '  ];',
    '  for (const value of candidates) {',
    '    const numeric = Number(value);',
    '    if (Number.isInteger(numeric) && numeric >= 0) return numeric;',
    '  }',
    '  const label = text(session.topic || session.title || session.sessionLabel || session.lessonTitle);',
    '  const match = label.match(/\\bday\\s*(\\d+)\\b/i);',
    '  return match?.[1] ? Number(match[1]) : null;',
    '}',
    '',
    'function assignmentLearningIdentity(assignmentId = "") {',
    '  const raw = text(assignmentId);',
    '  const match = raw.match(/^([A-C]\\d)-(.+)$/i);',
    '  if (!match) return null;',
    '  const level = match[1].toUpperCase();',
    '  let identity = text(match[2]);',
    '  if (!identity || /^(tutorial|orientation|complete)$/i.test(identity)) return null;',
    '  const practice = /-PRACTICE$/i.test(identity);',
    '  identity = identity.replace(/-PRACTICE$/i, "");',
    '  const routeKey = `${identity.toLowerCase()}${practice ? "-practice" : ""}`;',
    '  return { level, chapter: identity, routeKey, practice };',
    '}',
    '',
    'function buildChapterLinks({ klass = {}, session = {}, baseUrl = DEFAULT_FALOWEN_LEARNING_BASE_URL } = {}) {',
    '  const root = text(baseUrl).replace(/\\/+$/, "") || DEFAULT_FALOWEN_LEARNING_BASE_URL;',
    '  const fallbackLevel = text(klass.levelId || klass.level).toUpperCase();',
    '  const day = resolveSessionDay(session);',
    '  const seen = new Set();',
    '  return assignmentIds(session).flatMap((assignmentId) => {',
    '    const identity = assignmentLearningIdentity(assignmentId);',
    '    if (!identity) return [];',
    '    const level = identity.level || fallbackLevel;',
    '    let route = "";',
    '    if (level === "A1") {',
    '      const segment = encodeURIComponent(identity.routeKey);',
    '      route = identity.routeKey.includes(".")',
    '        ? `/campus/course/lesson/A1/${segment}`',
    '        : `/campus/course/lesson/A1/chapter/${segment}`;',
    '    } else if (level && Number.isInteger(day)) {',
    '      route = `/campus/course/lesson/${encodeURIComponent(level)}/${day}?view=workbook`;',
    '    }',
    '    if (!route) return [];',
    '    const url = `${root}${route}`;',
    '    if (seen.has(url)) return [];',
    '    seen.add(url);',
    '    return [{',
    '      assignmentId: text(assignmentId),',
    '      chapter: identity.chapter,',
    '      label: `Open Chapter ${identity.chapter}${identity.practice ? " Practice" : ""}` ,',
    '      url,',
    '    }];',
    '  });',
    '}',
    '',
  ].join("\n");
  replaceOnce("function buildCheckinUrl", `${helpers}function buildCheckinUrl`, "Course Book helpers");
}

const checkinPattern = /function buildCheckinUrl\(\{ klass = \{\}, session = \{\}, students = \[\], baseUrl = DEFAULT_CHECKIN_BASE_URL \} = \{\}\) \{[\s\S]*?\n\}\n\nfunction zoomDetails/;
if (!source.includes("new URLSearchParams({ classId, sessionId })")) {
  const replacement = [
    'function buildCheckinUrl({ klass = {}, session = {}, baseUrl = DEFAULT_CHECKIN_BASE_URL } = {}) {',
    '  const classId = text(klass.id || klass.classId || klass.classRecordId);',
    '  const sessionId = text(session.id);',
    '  if (!classId || !sessionId) return "";',
    '  const params = new URLSearchParams({ classId, sessionId });',
    '  return `${text(baseUrl).replace(/\\/+$/, "") || DEFAULT_CHECKIN_BASE_URL}/checkin?${params.toString()}`;',
    '}',
    '',
    'function zoomDetails',
  ].join("\n");
  if (!checkinPattern.test(source)) throw new Error("Could not find long reminder check-in URL builder.");
  source = source.replace(checkinPattern, replacement);
}

const messagePattern = /function buildReminderMessage\(\{[\s\S]*?\n\}\n\nfunction rowForReminder/;
if (!source.includes("Attendance Check-in")) {
  const replacement = [
    'function buildReminderMessage({ student, klass, session, leadMin, zoom = {}, checkinUrl = "", chapterLinks = [] } = {}) {',
    '  const timezone = text(klass.timezone) || TZ;',
    '  const startsAt = sessionStart(session);',
    '  const name = text(student.name || student.displayName) || "Student";',
    '  const className = text(klass.name || klass.className || klass.classId || klass.id) || "your class";',
    '  const assignments = assignmentIds(session);',
    '  const lines = [',
    '    `Hello ${name},`,',
    '    "",',
    '    `Your ${className} class starts in ${leadMin} minutes.`,',
    '    "",',
    '    `Topic: ${topicForSession(session)}` ,',
    '    ...(assignments.length ? [`Assignment${assignments.length === 1 ? "" : "s"}: ${assignments.join(" + ")}`] : []),',
    '    `Date: ${formatDate(startsAt, timezone)}` ,',
    '    `Time: ${formatTime(startsAt, timezone)} Ghana time` ,',
    '  ];',
    '  if (zoom.url) lines.push("", "Join Zoom: use the Join Zoom button in this email.");',
    '  if (zoom.meetingId || zoom.passcode) {',
    '    lines.push("");',
    '    if (zoom.meetingId) lines.push(`Meeting ID: ${zoom.meetingId}`);',
    '    if (zoom.passcode) lines.push(`Passcode: ${zoom.passcode}`);',
    '  }',
    '  if (checkinUrl) lines.push("", "Attendance Check-in", "Check In Now", checkinUrl);',
    '  if (chapterLinks.length) {',
    '    lines.push("", "Open today’s Course Book:");',
    '    chapterLinks.forEach((link) => lines.push(`${link.label}: ${link.url}`));',
    '  }',
    '  lines.push("", "Please join 5 minutes early.", "", "Best regards,", "Learn Language Education Academy (Falowen)");',
    '  return lines.join("\\n");',
    '}',
    '',
    'function rowForReminder',
  ].join("\n");
  if (!messagePattern.test(source)) throw new Error("Could not find class reminder message builder.");
  source = source.replace(messagePattern, replacement);
}

const rowPattern = /function rowForReminder\(\{[\s\S]*?\n\}\n\nasync function postRows/;
if (!source.includes("chapter_links: JSON.stringify(chapterLinks),")) {
  const replacement = [
    'function rowForReminder({ klass, student, session, leadMin, message, checkinUrl = "", zoom = {}, chapterLinks = [] } = {}) {',
    '  return {',
    '    announcement: message,',
    '    class: text(klass.name || klass.className || klass.classId || klass.id),',
    '    date: isoDate(sessionStart(session), text(klass.timezone) || TZ),',
    '    link: text(zoom.url || DEFAULT_CLASS_REMINDER_ZOOM.joinUrl),',
    '    button_label: text(zoom.url || DEFAULT_CLASS_REMINDER_ZOOM.joinUrl) ? "Join Zoom" : "",',
    '    checkin_link: checkinUrl,',
    '    checkin_link_label: checkinUrl ? "Check In Now" : "",',
    '    course_link: chapterLinks[0]?.url || "",',
    '    course_link_label: chapterLinks.length ? "Open Course Book" : "",',
    '    chapter_links: JSON.stringify(chapterLinks),',
    '    topic: `Class reminder — ${topicForSession(session)}` ,',
    '    email: text(student.email),',
    '    attach_certificate: "FALSE",',
    '    cert_level: text(klass.levelId || klass.level),',
    '    delivery_mode: "individual",',
    '    allow_bcc_fallback: "FALSE",',
    '    email_type: "class_reminder",',
    '    reminder_lead_minutes: String(leadMin),',
    '    show_progress: "FALSE",',
    '    show_review: "FALSE",',
    '    show_app_button: "FALSE",',
    '    show_class: "TRUE",',
    '    show_date: "TRUE",',
    '  };',
    '}',
    '',
    'async function postRows',
  ].join("\n");
  if (!rowPattern.test(source)) throw new Error("Could not find reminder webhook row builder.");
  source = source.replace(rowPattern, replacement);
}

if (!source.includes("const chapterLinks = buildChapterLinks")) {
  const before = [
    '  const rows = recipients.map((student) => {',
    '    const message = buildReminderMessage({ student, klass, session, leadMin, zoom, checkinUrl });',
    '    return rowForReminder({ klass, student, session, leadMin, message, checkinUrl });',
    '  });',
  ].join("\n");
  const after = [
    '  const chapterLinks = buildChapterLinks({',
    '    klass,',
    '    session,',
    '    baseUrl: resolveReminderLearningBaseUrl(runtimeConfig),',
    '  });',
    '  const rows = recipients.map((student) => {',
    '    const message = buildReminderMessage({ student, klass, session, leadMin, zoom, checkinUrl, chapterLinks });',
    '    return rowForReminder({ klass, student, session, leadMin, message, checkinUrl, zoom, chapterLinks });',
    '  });',
  ].join("\n");
  replaceOnce(before, after, "chapter links in reminder rows");
}

if (!source.includes("    buildChapterLinks,")) {
  replaceOnce("    buildCheckinUrl,", "    buildChapterLinks,\n    buildCheckinUrl,", "chapter link test export");
}
if (!source.includes("    resolveReminderLearningBaseUrl,")) {
  replaceOnce(
    "    resolveCheckinBaseUrl,",
    "    resolveCheckinBaseUrl,\n    resolveReminderLearningBaseUrl,\n    resolveSessionDay,",
    "learning link test exports",
  );
}

const required = [
  'const DEFAULT_FALOWEN_LEARNING_BASE_URL = "https://www.falowen.app";',
  "function buildChapterLinks",
  "new URLSearchParams({ classId, sessionId })",
  "Attendance Check-in",
  "Open today’s Course Book:",
  'button_label: text(zoom.url || DEFAULT_CLASS_REMINDER_ZOOM.joinUrl) ? "Join Zoom" : "",',
  "chapter_links: JSON.stringify(chapterLinks),",
  "const chapterLinks = buildChapterLinks",
  "/^(tutorial|orientation|complete)$/i",
];
required.forEach((marker) => {
  if (!source.includes(marker)) throw new Error(`Concise class reminder marker missing: ${marker}`);
});

const zoomActionIndex = source.indexOf("Join Zoom: use the Join Zoom button in this email.");
const attendanceActionIndex = source.indexOf("Attendance Check-in");
const courseBookActionIndex = source.indexOf("Open today’s Course Book:");
if (!(zoomActionIndex >= 0 && zoomActionIndex < attendanceActionIndex && attendanceActionIndex < courseBookActionIndex)) {
  throw new Error("Class reminder actions must be ordered Zoom, Attendance Check-in, Course Book.");
}

fs.writeFileSync(workerPath, source, "utf8");
console.log("Class reminders now use short check-in URLs with actions ordered Zoom, Attendance Check-in, then Course Book.");
