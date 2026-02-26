import { addDoc, collection, collectionGroup, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
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
  const submissionLink = data?.submissionLink || data?.submission_link || data?.link || "";

  return (
    data?.content ||
    data?.text ||
    data?.submissionText ||
    data?.submission_text ||
    data?.submission ||
    data?.finalSubmission ||
    data?.answerText ||
    data?.response ||
    data?.answer ||
    data?.body ||
    (submissionLink ? `Submission link: ${submissionLink}` : "") ||
    ""
  );
}

function extractPathInfo(path = "") {
  const segments = String(path).split("/").filter(Boolean);
  const submissionsIndex = segments.indexOf("submissions");

  if (submissionsIndex === -1) {
    return { levelFromPath: "", studentCodeFromPath: "" };
  }

  const levelFromPath = normalize(segments[submissionsIndex + 1] || "");
  const studentCodeFromPath = normalize(segments[submissionsIndex + 2] || "");
  return { levelFromPath, studentCodeFromPath };
}

function normalizeSubmission(id, data = {}, path = "") {
  const { levelFromPath, studentCodeFromPath } = extractPathInfo(path);
  const createdAt =
    normalizeTimestamp(data.createdAt) ||
    normalizeTimestamp(data.timestamp) ||
    normalizeTimestamp(data.created_at) ||
    normalizeTimestamp(data.submittedAt) ||
    null;

  return {
    id,
    status: normalize(data.status || data.submissionStatus),
    studentCode: normalize(data.studentCode || data.student_code || data.uid || data.studentId || data.student_id || studentCodeFromPath),
    studentName: normalize(data.studentName || data.student_name || data.student || data.name || data.fullName),
    assignment: normalize(data.assignment || data.assignmentTitle || data.task || data.topic || data.chapterKey || data.chapterTitle),
    level: normalize(data.level || data.className || data.class || data.group || levelFromPath),
    text: normalize(readSubmissionText(data)),
    submissionLink: normalize(data.submissionLink || data.submission_link || data.link),
    createdAt,
    updatedAt: normalizeTimestamp(data.updatedAt) || normalizeTimestamp(data.lastUpdatedAt) || null,
    originalSubmittedAt: normalizeTimestamp(data.originalSubmittedAt) || null,
    improvementSummary: normalize(data.improvementSummary),
    previousSubmissionText: normalize(data.previousSubmissionText),
    raw: data,
  };
}


function isFinalSubmission(submission) {
  const status = normalize(submission?.status).toLowerCase();
  return status !== "draft";
}

function sortNewestFirst(rows) {
  return [...rows].sort((a, b) => {
    const aTime = a.createdAt ? a.createdAt.getTime() : 0;
    const bTime = b.createdAt ? b.createdAt.getTime() : 0;
    return bTime - aTime;
  });
}

function normalizeDocs(snapshot) {
  const rows = [];
  snapshot.forEach((docSnap) => {
    const normalized = normalizeSubmission(docSnap.id, docSnap.data(), docSnap.ref.path);
    if (!isFinalSubmission(normalized)) return;
    rows.push({
      ...normalized,
      path: docSnap.ref.path,
    });
  });

  const deduped = Array.from(new Map(rows.map((row) => [row.path || row.id, row])).values());
  return sortNewestFirst(deduped);
}

export async function fetchSubmissions(level, studentCode) {
  const safeLevel = normalize(level);
  const safeStudentCode = normalize(studentCode);

  if (!safeLevel || !safeStudentCode) {
    return [];
  }

  const oldNestedPathRows = normalizeDocs(await getDocs(collection(db, "submissions", safeLevel, safeStudentCode)));
  if (oldNestedPathRows.length) return oldNestedPathRows;

  const flatRows = normalizeDocs(
    await getDocs(query(collection(db, "submissions"), where("studentCode", "==", safeStudentCode))),
  ).filter((row) => normalize(row.level) === safeLevel);
  if (flatRows.length) return flatRows;

  const flatSnakeRows = normalizeDocs(
    await getDocs(query(collection(db, "submissions"), where("student_code", "==", safeStudentCode))),
  ).filter((row) => normalize(row.level) === safeLevel);
  if (flatSnakeRows.length) return flatSnakeRows;

  const olderPostsRows = normalizeDocs(
    await getDocs(query(collection(db, "submissions", safeLevel, "posts"), where("studentCode", "==", safeStudentCode))),
  );

  return olderPostsRows;
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
    records.push(...normalizeDocs(snapResult.value));
  });

  const deduped = Array.from(new Map(records.map((record) => [record.path || record.id, record])).values());
  return sortNewestFirst(deduped);
}

export async function deleteSubmission(path) {
  if (!path) {
    throw new Error("Missing submission path for delete.");
  }

  await deleteDoc(doc(db, path));
}

const DEFAULT_SCORES_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbxYrtdvehwxI56zBHDv_1ngJMzNGkPEefT9lgp3KlFczRlSTStcwhQPDzc02jXVjdvJJQ/exec";
const SCORES_WEBHOOK_URL = import.meta.env.VITE_SCORES_WEBHOOK_URL || DEFAULT_SCORES_WEBHOOK_URL;
const SCORES_WEBHOOK_TOKEN = String(import.meta.env.VITE_SCORES_WEBHOOK_TOKEN || "Xenomexpress7727/").trim();
const SCORES_WEBHOOK_SHEET_NAME = String(import.meta.env.VITE_SCORES_WEBHOOK_SHEET_NAME || "").trim();
const SCORES_WEBHOOK_SHEET_GID = String(import.meta.env.VITE_SCORES_WEBHOOK_SHEET_GID || "2121051612").trim();
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

  const receipt = {
    row,
    sheet: {
      attempted: Boolean(SCORES_WEBHOOK_URL),
      success: !SCORES_WEBHOOK_URL,
      message: SCORES_WEBHOOK_URL ? "Pending" : "Sheet save skipped (webhook not configured).",
    },
    firestore: {
      attempted: SAVE_SCORES_TO_FIRESTORE,
      success: !SAVE_SCORES_TO_FIRESTORE,
      message: SAVE_SCORES_TO_FIRESTORE ? "Pending" : "Firestore mirror skipped (disabled by config).",
    },
  };

  if (SCORES_WEBHOOK_URL) {
    try {
      await postScoreToWebhook(webhookPayload);
      receipt.sheet.success = true;
      receipt.sheet.message = "Saved to Google Sheets.";
    } catch (error) {
      if (!isLikelyNetworkError(error)) {
        receipt.sheet.success = false;
        receipt.sheet.message = String(error?.message || "Google Sheets save failed.");
      } else {
        try {
          await postScoreToWebhookNoCors(webhookPayload);
          receipt.sheet.success = true;
          receipt.sheet.message = "Sheet request sent via no-cors fallback (delivery cannot be confirmed by browser).";
        } catch (fallbackError) {
          receipt.sheet.success = false;
          receipt.sheet.message = String(fallbackError?.message || error?.message || "Google Sheets save failed.");
        }
      }
    }
  }

  if (SAVE_SCORES_TO_FIRESTORE) {
    try {
      await addDoc(collection(db, "scores"), {
        ...row,
        createdAt: new Date().toISOString(),
      });
      receipt.firestore.success = true;
      receipt.firestore.message = "Saved to Firestore mirror.";
    } catch (error) {
      receipt.firestore.success = false;
      receipt.firestore.message = String(error?.message || "Firestore mirror save failed.");
    }
  }

  if (!receipt.sheet.success && !receipt.firestore.success) {
    const saveError = new Error("Save failed for both Google Sheets and Firestore.");
    saveError.receipt = receipt;
    throw saveError;
  }

  return receipt;
}
