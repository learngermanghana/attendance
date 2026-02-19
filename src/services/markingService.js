import { addDoc, collection, collectionGroup, getDocs } from "firebase/firestore";
import { db } from "../firebase.js";
import {
  loadPublishedStudentRows,
  readPublishedClassName,
  readPublishedLevel,
  readPublishedStatus,
  readPublishedStudentCode,
  readPublishedStudentName,
} from "./publishedSheetService.js";

const DEFAULT_ROSTER_SHEET_CSV_URL = import.meta.env.VITE_STUDENTS_SHEET_CSV_URL || "";
const MARKING_ROSTER_CSV_URL = import.meta.env.VITE_MARKING_ROSTER_CSV_URL || DEFAULT_ROSTER_SHEET_CSV_URL;

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalize(value) {
  return String(value || "").trim();
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function parseCsv(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map(parseCsvLine);
}

function findCol(row, aliases) {
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    if (row[key]) return normalize(row[key]);
  }
  return "";
}

function toRosterRows(rows) {
  if (rows.length === 0) return [];

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map(normalizeHeader);

  return dataRows
    .map((row) => {
      const entry = {};
      headers.forEach((header, idx) => {
        entry[header] = normalize(row[idx]);
      });

      const studentCode = findCol(entry, ["studentcode", "student_code", "uid", "code"]);
      const name = findCol(entry, ["name", "studentname", "student_name", "fullname"]);
      const level = findCol(entry, ["level", "classname", "class", "group"]);
      const status = findCol(entry, ["status"]);

      return {
        id: studentCode || `${name}-${level}`,
        studentCode,
        name,
        level,
        status: status || "Active",
      };
    })
    .filter((row) => row.studentCode || row.name);
}

async function loadCsvRows(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load CSV from ${url}`);
  }

  return parseCsv(await res.text());
}

export async function loadRoster() {
  try {
    const publishedRows = await loadPublishedStudentRows();
    const rosterFromPublishedSheet = publishedRows
      .map((row) => {
        const name = normalize(readPublishedStudentName(row) || findCol(row, ["studentname", "student_name", "fullname"]));
        const studentCode = normalize(readPublishedStudentCode(row) || findCol(row, ["student_code", "uid", "code"]));
        const level = normalize(readPublishedLevel(row) || readPublishedClassName(row) || findCol(row, ["class", "group"]));
        const status = normalize(readPublishedStatus(row) || findCol(row, ["state"]));

        return {
          id: studentCode || `${name}-${level}`,
          studentCode,
          name,
          level,
          status: status || "Active",
        };
      })
      .filter((row) => row.studentCode || row.name);

    if (rosterFromPublishedSheet.length > 0) {
      return rosterFromPublishedSheet;
    }

    throw new Error("Published student sheet has no rows");
  } catch {
    try {
      if (!MARKING_ROSTER_CSV_URL) throw new Error("No marking roster sheet URL configured");
      const rows = await loadCsvRows(MARKING_ROSTER_CSV_URL);
      return toRosterRows(rows);
    } catch {
      const localRows = await loadCsvRows("/students.csv");
      return toRosterRows(localRows);
    }
  }
}

function normalizeTimestamp(value) {
  if (!value) return null;
  if (value?.toDate && typeof value.toDate === "function") return value.toDate();
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  return null;
}

function readSubmissionText(data) {
  return (
    data?.content ||
    data?.text ||
    data?.submissionText ||
    data?.submission_text ||
    data?.answer ||
    data?.body ||
    ""
  );
}

function normalizeSubmission(id, data = {}) {
  const createdAt =
    normalizeTimestamp(data.createdAt) ||
    normalizeTimestamp(data.timestamp) ||
    normalizeTimestamp(data.created_at) ||
    normalizeTimestamp(data.submittedAt) ||
    null;

  return {
    id,
    studentCode: normalize(data.studentCode || data.student_code || data.uid),
    studentName: normalize(data.studentName || data.student_name || data.name),
    assignment: normalize(data.assignment || data.assignmentTitle || data.task || data.topic),
    level: normalize(data.level || data.className || data.class || data.group),
    text: normalize(readSubmissionText(data)),
    createdAt,
    raw: data,
  };
}

export async function loadSubmissions() {
  const records = [];

  const [flatSnap, nestedSnap, postsSnap] = await Promise.allSettled([
    getDocs(collection(db, "submissions")),
    getDocs(collectionGroup(db, "submissions")),
    getDocs(collectionGroup(db, "posts")),
  ]);

  [flatSnap, nestedSnap, postsSnap].forEach((snapResult) => {
    if (snapResult.status !== "fulfilled") return;

    snapResult.value.forEach((docSnap) => {
      records.push(normalizeSubmission(docSnap.id, docSnap.data()));
    });
  });

  const deduped = Array.from(new Map(records.map((record) => [record.id, record])).values());

  return deduped.sort((a, b) => {
    const aTime = a.createdAt ? a.createdAt.getTime() : 0;
    const bTime = b.createdAt ? b.createdAt.getTime() : 0;
    return bTime - aTime;
  });
}

const DEFAULT_SCORES_WEBHOOK_URL = "";
const SCORES_WEBHOOK_URL = import.meta.env.VITE_SCORES_WEBHOOK_URL || DEFAULT_SCORES_WEBHOOK_URL;
const SCORES_WEBHOOK_TOKEN = String(import.meta.env.VITE_SCORES_WEBHOOK_TOKEN || "").trim();
const SCORES_WEBHOOK_SHEET_NAME = String(import.meta.env.VITE_SCORES_WEBHOOK_SHEET_NAME || "").trim();
const SCORES_WEBHOOK_SHEET_GID = String(import.meta.env.VITE_SCORES_WEBHOOK_SHEET_GID || "").trim();
const SAVE_SCORES_TO_FIRESTORE = String(import.meta.env.VITE_ENABLE_SCORE_FIRESTORE || "false").toLowerCase() === "true";

function isLikelyNetworkError(error) {
  return error instanceof TypeError || /networkerror|failed to fetch/i.test(String(error?.message || ""));
}

async function postScoreToWebhook(payload) {
  const res = await fetch(SCORES_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || "Failed to write score to Google Sheets webhook");
  }

  const responseBody = await res.json().catch(() => ({}));
  if (responseBody?.ok === false) {
    throw new Error(responseBody?.error || "Validation failed while saving to sheet");
  }
}

async function postScoreToWebhookNoCors(payload) {
  await fetch(SCORES_WEBHOOK_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify(payload),
  });
}

export async function saveScoreRow({ studentCode, name, assignment, score, comments, level, link }) {
  const row = {
    studentcode: studentCode,
    name,
    assignment,
    score,
    comments,
    date: new Date().toString(),
    level,
    link: Number(score) < 60 ? "" : link,
  };

  const webhookPayload = {
    ...(SCORES_WEBHOOK_TOKEN ? { token: SCORES_WEBHOOK_TOKEN } : {}),
    ...(SCORES_WEBHOOK_SHEET_NAME ? { sheet_name: SCORES_WEBHOOK_SHEET_NAME } : {}),
    ...(SCORES_WEBHOOK_SHEET_GID ? { sheet_gid: SCORES_WEBHOOK_SHEET_GID } : {}),
    row,
    rows: [row],
  };

  if (SCORES_WEBHOOK_URL) {
    try {
      await postScoreToWebhook(webhookPayload);
    } catch (error) {
      if (!isLikelyNetworkError(error)) {
        throw error;
      }

      await postScoreToWebhookNoCors(webhookPayload);
    }
  }

  if (SAVE_SCORES_TO_FIRESTORE) {
    await addDoc(collection(db, "scores"), {
      ...row,
      createdAt: new Date().toISOString(),
    });
  }

  return row;
}
