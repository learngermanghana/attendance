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
import { resolveWithSheetFallback } from "./fallbackResolvers.js";

function isActiveStudent(data) {
  return String(data?.status || "").toLowerCase() === "active" && String(data?.role || "").toLowerCase() === "student";
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

function mapPublishedStudent(row) {
  return {
    id: normalize(readPublishedStudentCode(row) || readPublishedStudentName(row)),
    uid: normalize(readPublishedStudentCode(row)),
    studentCode: normalize(readPublishedStudentCode(row)),
    className: normalize(resolvePublishedClass(row)),
    name: normalize(readPublishedStudentName(row)),
    status: normalize(readPublishedStatus(row)) || "Active",
    role: "student",
  };
}

function isActivePublishedRow(row) {
  const status = normalize(readPublishedStatus(row)).toLowerCase();
  return !status || status === "active";
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
  return resolveWithSheetFallback({
    loadFromSheet: () => loadPublishedStudentsByClass(classId),
    loadFromFallbackFields: (field) => loadStudentsByField(field, classId),
    fallbackFields: ["classId", "className", "group", "groupId", "groupName"],
  });
}

export async function listStudentsByClass(classId) {
  return listStudentsByClassWithDeps(classId);
}
