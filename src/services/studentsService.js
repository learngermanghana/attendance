import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase.js";
import {
  loadPublishedStudentRows,
  readPublishedClassName,
  readPublishedLevel,
  readPublishedStatus,
  readPublishedStudentCode,
  readPublishedStudentName,
} from "./publishedSheetService.js";

function isRosterEligibleStatus(statusValue) {
  const status = String(statusValue || "").toLowerCase().trim();
  return !status || status === "active" || status === "paid";
}

function isActiveStudent(data) {
  const status = String(data?.status || "").toLowerCase();
  const role = String(data?.role || "").toLowerCase();
  const hasCompatibleRole = !role || role === "student";
  return status === "active" && hasCompatibleRole;
}

function byNameAsc(a, b) {
  return String(a?.name || "").localeCompare(String(b?.name || ""));
}

function normalize(value) {
  return String(value || "").trim();
}

function normalizeComparable(value) {
  return normalize(value).toLowerCase().replace(/\s+/g, " ");
}

function extractLevelToken(value) {
  const match = normalize(value).toUpperCase().match(/\b(A1|A2|B1|B2|C1|C2)\b/);
  return match?.[1] || "";
}

function resolvePublishedClass(row) {
  const className = normalize(readPublishedClassName(row));
  if (className) return className;
  return normalize(readPublishedLevel(row));
}


function isActivePublishedRow(row) {
  return String(readPublishedStatus(row) || "").toLowerCase() === "active";
}

function mapPublishedStudent(row) {
  return {
    id: String(readPublishedStudentCode(row) || readPublishedStudentName(row) || "").trim(),
    name: normalize(readPublishedStudentName(row)),
    studentCode: normalize(readPublishedStudentCode(row)),
    className: resolvePublishedClass(row),
    status: normalize(readPublishedStatus(row)).toLowerCase(),
    role: "student",
  };
}

export async function listPublishedStudentsByClassWithLoader(classId, loadRows = loadPublishedStudentRows) {
  const targetClassName = normalizeComparable(classId);
  if (!targetClassName) return [];

  const rows = await loadRows();

  const exactRows = rows.filter((row) => {
    const className = normalizeComparable(readPublishedClassName(row));
    const level = normalizeComparable(readPublishedLevel(row));
    return className === targetClassName || level === targetClassName;
  });

  const rowsToUse = exactRows.length > 0
    ? exactRows
    : rows.filter((row) => {
      const targetLevel = extractLevelToken(classId);
      if (!targetLevel) return false;
      return extractLevelToken(readPublishedClassName(row)) === targetLevel || extractLevelToken(readPublishedLevel(row)) === targetLevel;
    });

  return rowsToUse
    .filter(isActivePublishedRow)
    .map(mapPublishedStudent)
    .filter((row) => row.name)
    .sort(byNameAsc);
}

export async function loadStudentsByFieldWithFirestore(fieldName, classId, firestore = { collection, getDocs, query, where, db }) {
  const q = firestore.query(firestore.collection(firestore.db, "students"), firestore.where(fieldName, "==", classId));
  const snap = await firestore.getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isActiveStudent).sort(byNameAsc);
}

export async function listStudentsByClassWithDeps(
  classId,
  {
    loadPublishedStudentsByClass = listPublishedStudentsByClassWithLoader,
    loadStudentsByField = loadStudentsByFieldWithFirestore,
  } = {},
) {
  try {
    const fromSheet = await loadPublishedStudentsByClass(classId);
    if (fromSheet.length > 0) return fromSheet;
  } catch {
    // Fall back when published sheet is unavailable.
  }

  const fields = ["classId", "className", "group", "groupId", "groupName"];
  const merged = [];
  const seenIds = new Set();

  for (const field of fields) {
    const records = await loadStudentsByField(field, classId);
    for (const record of records) {
      const dedupeKey = String(record?.id || record?.studentCode || record?.studentcode || record?.uid || record?.email || "").trim();
      if (dedupeKey && seenIds.has(dedupeKey)) continue;
      if (dedupeKey) seenIds.add(dedupeKey);
      merged.push(record);
    }
  }

  return merged.sort(byNameAsc);
}

export async function listStudentsByClass(classId) {
  return listStudentsByClassWithDeps(classId);
}
