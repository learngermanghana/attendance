const crypto = require("crypto");

const TZ = "Africa/Accra";
const DEFAULT_REMINDER_WINDOW_DAYS = 3;
const PROCESSING_STALE_MS = 30 * 60 * 1000;
const DEFAULT_LEADS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTDD46qAiCuuza-u4jTzwgiuMR5HwtBhQdvElQw5SIQOHCEJ7RCNLx7Zlarf7HvhYOCXkiVcwTCyXp6/pub?gid=1052282144&single=true&output=csv";
const DEFAULT_ACCOUNT_URL = "https://www.falowen.app/campus/account";

const BLOCKED_LEAD_STATUSES = new Set([
  "student registered", "paid", "class started no followup", "completed", "complete",
  "converted", "closed", "not interested", "cancelled", "canceled", "archived", "deleted",
]);
const BLOCKED_PAYMENT_STATUSES = new Set([
  "paid", "registered paid", "registered partial", "registered unpaid", "success", "successful",
  "completed", "complete",
]);

function text(value) {
  return String(value || "").trim();
}

function comparable(value) {
  return text(value).toLowerCase().replace(/[\s_-]+/g, " ");
}

function normalizeHeader(value) {
  return text(value)
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/[()]/g, "")
    .replace(/_/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEmail(value) {
  return text(value).toLowerCase();
}

function firstValue(row = {}, names = []) {
  for (const name of names) {
    const value = row[normalizeHeader(name)];
    if (text(value)) return text(value);
  }
  return "";
}

function parseCsv(csvText = "") {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => text(value))) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell);
  if (row.some((value) => text(value))) rows.push(row);
  return rows;
}

function csvToObjects(csvText = "") {
  const rows = parseCsv(csvText);
  if (!rows.length) return [];
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((values) => headers.reduce((record, header, index) => {
    if (header) record[header] = values[index] || "";
    return record;
  }, {}));
}

function normalizeLead(row = {}, index = 0) {
  const email = firstValue(row, ["email", "email address"]);
  const name = firstValue(row, ["name", "full name", "student name"]);
  const className = firstValue(row, ["class name", "class_name", "class"]);
  const classId = firstValue(row, ["class id", "class_id"]);
  const startDate = firstValue(row, ["start date", "start_date", "class start", "class_start"]);
  const leadId = firstValue(row, ["lead id", "lead_id", "id"]);
  return {
    id: leadId || [normalizeEmail(email), comparable(classId || className), text(startDate), index].join("|"),
    leadId,
    name,
    email,
    classId,
    className,
    level: firstValue(row, ["level", "language level", "class level"]).toUpperCase(),
    startDate,
    meetingTimes: firstValue(row, ["meeting times", "meeting_times", "class time", "class times"]),
    scheduleUrl: firstValue(row, ["schedule url", "schedule_url", "class schedule", "class link"]),
    status: firstValue(row, ["status", "lead status", "lead_status"]),
    paymentStatus: firstValue(row, ["payment status", "payment_status"]),
    studentCode: firstValue(row, ["student code", "student_code"]),
    followUpCount: Number(firstValue(row, ["follow up count", "follow_up_count"]) || 0),
    lastFollowUpAt: firstValue(row, ["last follow up at", "last_follow_up_at"]),
    createdAt: firstValue(row, ["created at", "created_at", "registration date"]),
  };
}

function parseLeadStartDate(value) {
  const raw = text(value);
  if (!raw) return null;

  let match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\b|T)/);
  if (match) return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));

  match = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (match) {
    const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]);
    return new Date(Date.UTC(year, Number(match[2]) - 1, Number(match[1]), 12));
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isoDate(value, timezone = TZ) {
  const date = value instanceof Date ? value : parseLeadStartDate(value);
  if (!date || Number.isNaN(date.getTime())) return "";
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dateKeyToUtc(dateKey = "") {
  const match = text(dateKey).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : NaN;
}

function daysUntilStart(startDate, now = new Date(), timezone = TZ) {
  const startKey = isoDate(startDate, timezone);
  const nowKey = isoDate(now, timezone);
  if (!startKey || !nowKey) return null;
  return Math.round((dateKeyToUtc(startKey) - dateKeyToUtc(nowKey)) / 86400000);
}

function formatDate(value, timezone = TZ) {
  const date = value instanceof Date ? value : parseLeadStartDate(value);
  if (!date || Number.isNaN(date.getTime())) return text(value);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function isDisabled(value) {
  return value === false || ["false", "off", "disabled", "paused"].includes(comparable(value));
}

function resolveLeadReminderConfig(runtimeConfig = {}, env = process.env) {
  const communication = runtimeConfig.communication || runtimeConfig.announcements || runtimeConfig.announcement || {};
  const leads = runtimeConfig.lead_reminders || runtimeConfig.leads || {};
  const rawDays = Number(
    env.LEAD_CLASS_START_REMINDER_DAYS
    ?? env.LEAD_REMINDER_DAYS_BEFORE_CLASS
    ?? leads.class_start_days_before
    ?? leads.days_before_class
    ?? communication.lead_reminder_days_before_class
    ?? DEFAULT_REMINDER_WINDOW_DAYS,
  );
  const daysBeforeClass = Number.isFinite(rawDays)
    ? Math.max(1, Math.min(Math.round(rawDays), 30))
    : DEFAULT_REMINDER_WINDOW_DAYS;

  return {
    enabled: !isDisabled(
      env.LEAD_CLASS_START_REMINDER_ENABLED
      ?? leads.class_start_reminder_enabled
      ?? leads.enabled
      ?? communication.lead_class_start_reminder_enabled,
    ),
    daysBeforeClass,
    csvUrl: text(
      env.LEAD_REMINDER_CSV_URL
      || leads.csv_url
      || leads.published_csv_url
      || communication.lead_reminder_csv_url
      || DEFAULT_LEADS_CSV_URL,
    ),
    accountUrl: text(
      env.LEAD_REMINDER_ACCOUNT_URL
      || leads.account_url
      || communication.lead_reminder_account_url
      || DEFAULT_ACCOUNT_URL,
    ),
    webhook: {
      url: text(
        env.LEAD_CLASS_START_REMINDER_WEBHOOK_URL
        || env.LEAD_REMINDER_WEBHOOK_URL
        || env.ANNOUNCEMENT_WEBHOOK_URL
        || env.VITE_ANNOUNCEMENT_WEBHOOK_URL
        || leads.webhook_url
        || communication.lead_class_start_reminder_webhook_url
        || communication.lead_reminder_webhook_url
        || communication.announcement_webhook_url
        || communication.webhook_url,
      ),
      token: text(
        env.LEAD_CLASS_START_REMINDER_WEBHOOK_TOKEN
        || env.LEAD_REMINDER_WEBHOOK_TOKEN
        || env.ANNOUNCEMENT_WEBHOOK_TOKEN
        || env.VITE_ANNOUNCEMENT_WEBHOOK_TOKEN
        || leads.webhook_token
        || communication.lead_class_start_reminder_webhook_token
        || communication.lead_reminder_webhook_token
        || communication.announcement_webhook_token
        || communication.webhook_token,
      ),
      sheetName: text(
        env.LEAD_REMINDER_SHEET_NAME
        || env.ANNOUNCEMENT_WEBHOOK_SHEET_NAME
        || env.VITE_ANNOUNCEMENT_WEBHOOK_SHEET_NAME
        || leads.sheet_name
        || communication.lead_reminder_sheet_name
        || communication.announcement_sheet_name
        || communication.sheet_name,
      ),
      sheetGid: text(
        env.LEAD_REMINDER_SHEET_GID
        || env.ANNOUNCEMENT_WEBHOOK_SHEET_GID
        || env.VITE_ANNOUNCEMENT_WEBHOOK_SHEET_GID
        || leads.sheet_gid
        || communication.lead_reminder_sheet_gid
        || communication.announcement_sheet_gid
        || communication.sheet_gid,
      ),
    },
  };
}

function leadIsBlocked(lead = {}) {
  return BLOCKED_LEAD_STATUSES.has(comparable(lead.status))
    || BLOCKED_PAYMENT_STATUSES.has(comparable(lead.paymentStatus))
    || Boolean(text(lead.studentCode))
    || Number(lead.followUpCount || 0) >= 1
    || Boolean(text(lead.lastFollowUpAt));
}

function dueDedupeKey(item = {}) {
  const lead = item.lead || item;
  return [
    normalizeEmail(lead.email),
    comparable(lead.classId || lead.className || lead.level),
    text(item.startDateKey || isoDate(lead.startDate)),
  ].join("::");
}

function findDueLeadReminders({ leads = [], now = new Date(), daysBeforeClass = DEFAULT_REMINDER_WINDOW_DAYS } = {}) {
  const maxDays = Math.max(1, Number(daysBeforeClass) || DEFAULT_REMINDER_WINDOW_DAYS);
  const seen = new Set();
  const due = [];

  leads.forEach((lead) => {
    if (!normalizeEmail(lead.email) || leadIsBlocked(lead)) return;
    const startDate = parseLeadStartDate(lead.startDate);
    if (!startDate) return;
    const remaining = daysUntilStart(startDate, now);
    if (remaining === null || remaining <= 0 || remaining > maxDays) return;
    const item = {
      lead,
      startDate,
      startDateKey: isoDate(startDate),
      daysUntilStart: remaining,
    };
    const key = dueDedupeKey(item);
    if (seen.has(key)) return;
    seen.add(key);
    due.push(item);
  });

  return due.sort((left, right) => left.daysUntilStart - right.daysUntilStart
    || comparable(left.lead.className).localeCompare(comparable(right.lead.className)));
}

async function fetchPublishedLeads(csvUrl, fetchImpl = fetch) {
  const response = await fetchImpl(csvUrl, {
    method: "GET",
    headers: { accept: "text/csv,text/plain;q=0.9,*/*;q=0.8" },
  });
  const csvText = await response.text();
  if (!response.ok) throw new Error(`Lead sheet returned HTTP ${response.status}`);
  if (/^\s*</.test(csvText)) throw new Error("Lead sheet returned HTML instead of CSV");
  const rawRows = csvToObjects(csvText);
  if (!rawRows.length && !/email|phone|lead/i.test(csvText.split(/\r?\n/, 1)[0] || "")) {
    throw new Error("Lead sheet CSV did not contain recognizable lead headers");
  }
  return rawRows.map(normalizeLead).filter((lead) => lead.email || lead.name || lead.className);
}

function buildLeadReminderMessage({ lead = {}, startDate, daysUntilStart: remaining, accountUrl = DEFAULT_ACCOUNT_URL } = {}) {
  const className = text(lead.className || lead.level) || "the German class";
  const dayLabel = Number(remaining) === 1 ? "1 day" : `${remaining} days`;
  const actionUrl = text(lead.scheduleUrl) || accountUrl;
  const lines = [
    `Hello ${text(lead.name) || "there"},`,
    "",
    `The ${className} class you showed interest in starts in ${dayLabel}.`,
    "",
    `Start date: ${formatDate(startDate)}`,
  ];
  if (text(lead.meetingTimes)) lines.push(`Meeting times: ${text(lead.meetingTimes)}`);
  lines.push(
    "",
    "To secure your seat, open Falowen, choose the class under Upcoming Classes, and make payment:",
    actionUrl,
    "",
    "Already registered or paid? You can ignore this email.",
    "",
    "Best regards,",
    "Learn Language Education Academy (Falowen)",
  );
  return lines.join("\n");
}

function rowForLeadReminder({ item = {}, message = "", accountUrl = DEFAULT_ACCOUNT_URL } = {}) {
  const { lead = {}, startDateKey = "", daysUntilStart: remaining = "" } = item;
  const actionUrl = text(lead.scheduleUrl) || accountUrl;
  return {
    announcement: message,
    class: text(lead.className || lead.level),
    date: startDateKey,
    link: actionUrl,
    topic: `Class starts soon — ${text(lead.className || lead.level) || "German class"}`,
    email: normalizeEmail(lead.email),
    attach_certificate: "FALSE",
    cert_level: text(lead.level),
    delivery_mode: "individual",
    allow_bcc_fallback: "FALSE",
    email_type: "lead_class_start_reminder",
    reminder_lead_days: String(remaining),
    show_progress: "FALSE",
    show_review: "FALSE",
    show_app_button: "FALSE",
    show_class: "TRUE",
    show_date: "TRUE",
    button_label: "Secure your seat",
  };
}

async function postRows(config, rows, fetchImpl = fetch) {
  if (!config.url) {
    throw new Error("Configure communication.announcement_webhook_url or LEAD_REMINDER_WEBHOOK_URL for lead reminder emails.");
  }
  const response = await fetchImpl(config.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(config.token ? { token: config.token } : {}),
      ...(config.sheetName ? { sheet_name: config.sheetName } : {}),
      ...(config.sheetGid ? { sheet_gid: config.sheetGid } : {}),
      rows,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.ok === false) {
    throw new Error(body?.error || body?.message || `Announcement webhook returned HTTP ${response.status}`);
  }
  return body;
}

function sendId(item = {}) {
  const lead = item.lead || {};
  return crypto.createHash("sha256").update([
    text(lead.leadId || lead.id),
    normalizeEmail(lead.email),
    comparable(lead.classId || lead.className || lead.level),
    text(item.startDateKey),
    "lead-class-start-reminder",
  ].join("::")).digest("hex");
}

async function reserveLeadSend({ db, admin, item, now }) {
  const ref = db.collection("leadClassStartReminderSends").doc(sendId(item));
  let reserved = false;
  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const existing = snap.exists ? snap.data() || {} : {};
    const updatedRaw = existing.updatedAt || existing.processingStartedAt;
    const updated = typeof updatedRaw?.toDate === "function" ? updatedRaw.toDate() : new Date(updatedRaw || 0);
    const processingFresh = comparable(existing.status) === "processing"
      && !Number.isNaN(updated.getTime())
      && now.getTime() - updated.getTime() < PROCESSING_STALE_MS;
    if (comparable(existing.status) === "sent" || processingFresh) return;

    reserved = true;
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    transaction.set(ref, {
      leadId: text(item.lead.leadId || item.lead.id),
      leadEmail: normalizeEmail(item.lead.email),
      leadName: text(item.lead.name),
      classId: text(item.lead.classId),
      className: text(item.lead.className || item.lead.level),
      classStartDate: item.startDateKey,
      daysUntilStart: Number(item.daysUntilStart),
      status: "processing",
      attemptCount: Number(existing.attemptCount || 0) + 1,
      processingStartedAt: timestamp,
      updatedAt: timestamp,
      ...(snap.exists ? {} : { createdAt: timestamp }),
    }, { merge: true });
  });
  return reserved ? ref : null;
}

async function markRefs(refs, patch) {
  await Promise.all(refs.map((ref) => ref.set(patch, { merge: true })));
}

async function runLeadClassStartReminderEmailJob({
  admin, db, runtimeConfig = {}, now = new Date(), fetchImpl = fetch,
} = {}) {
  const config = resolveLeadReminderConfig(runtimeConfig);
  if (!config.enabled) return { enabled: false, checked: 0, due: 0, sent: 0, results: [] };

  const leads = await fetchPublishedLeads(config.csvUrl, fetchImpl);
  const due = findDueLeadReminders({ leads, now, daysBeforeClass: config.daysBeforeClass });
  const nowDate = now instanceof Date ? now : new Date(now);
  const reserved = [];

  for (const item of due) {
    const ref = await reserveLeadSend({ db, admin, item, now: nowDate });
    if (ref) reserved.push({ ref, item });
  }
  if (!reserved.length) {
    return { enabled: true, checked: leads.length, due: due.length, sent: 0, results: [] };
  }

  const rows = reserved.map(({ item }) => {
    const message = buildLeadReminderMessage({
      ...item,
      accountUrl: config.accountUrl,
    });
    return rowForLeadReminder({ item, message, accountUrl: config.accountUrl });
  });
  const timestamp = admin.firestore.FieldValue.serverTimestamp();

  try {
    const upstream = await postRows(config.webhook, rows, fetchImpl);
    await markRefs(reserved.map(({ ref }) => ref), {
      status: "sent",
      sentAt: timestamp,
      updatedAt: timestamp,
      upstreamCount: Number(upstream?.count || upstream?.sent || rows.length),
      lastError: "",
    });
    return {
      enabled: true,
      checked: leads.length,
      due: due.length,
      sent: rows.length,
      results: rows.map((row) => ({ email: row.email, className: row.class, date: row.date })),
    };
  } catch (error) {
    const message = error?.message || "Lead class-start reminder delivery failed";
    await markRefs(reserved.map(({ ref }) => ref), {
      status: "failed",
      failedAt: timestamp,
      updatedAt: timestamp,
      lastError: message,
    });
    throw error;
  }
}

function createLeadClassStartReminderEmailJob({ admin, db, onSchedule, runtimeConfig = {} }) {
  return onSchedule({
    schedule: "0 8 * * *",
    timeZone: TZ,
    retryCount: 1,
  }, async () => {
    const result = await runLeadClassStartReminderEmailJob({ admin, db, runtimeConfig });
    console.log("lead_class_start_reminder_job_complete", result);
    return result;
  });
}

module.exports = {
  createLeadClassStartReminderEmailJob,
  runLeadClassStartReminderEmailJob,
  _test: {
    buildLeadReminderMessage,
    csvToObjects,
    daysUntilStart,
    dueDedupeKey,
    fetchPublishedLeads,
    findDueLeadReminders,
    isoDate,
    leadIsBlocked,
    normalizeLead,
    parseCsv,
    parseLeadStartDate,
    resolveLeadReminderConfig,
    rowForLeadReminder,
    sendId,
  },
};