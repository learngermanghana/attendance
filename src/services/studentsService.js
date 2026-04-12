import { collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase.js";
import {
  loadPublishedStudentRows,
  readPublishedClassName,
  readPublishedLevel,
  readPublishedStatus,
  readPublishedStudentCode,
  readPublishedStudentEmail,
  readPublishedStudentName,
} from "./publishedSheetService.js";

function byNameAsc(a, b) {
  return String(a?.name || "").localeCompare(String(b?.name || ""));
}

function normalize(value) {
  return String(value || "").trim();
}

function normalizeComparable(value) {
  return normalize(value).toLowerCase().replace(/\s+/g, " ");
}

function resolvePublishedClass(row) {
  const className = normalize(readPublishedClassName(row));
  if (className) return className;
  return normalize(readPublishedLevel(row));
}
function mapPublishedStudent(row) {
  return {
    id: String(readPublishedStudentCode(row) || readPublishedStudentName(row) || "").trim(),
    name: normalize(readPublishedStudentName(row)),
    email: normalize(readPublishedStudentEmail(row)),
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

  return rows
    .filter((row) => {
      const className = normalizeComparable(readPublishedClassName(row));
      return className === targetClassName;
    })
    .map(mapPublishedStudent)
    .filter((row) => row.name)
    .sort(byNameAsc);
}

export async function loadStudentsByFieldWithFirestore(fieldName, classId, firestore = { collection, getDocs, query, where, db }) {
  const q = firestore.query(firestore.collection(firestore.db, "students"), firestore.where(fieldName, "==", classId));
  const snap = await firestore.getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byNameAsc);
}

export async function listAllStudentsWithFirestore(firestore = { collection, getDocs, db }) {
  const snap = await firestore.getDocs(firestore.collection(firestore.db, "students"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byNameAsc);
}

export async function updateStudentByIdWithFirestore(studentId, payload, firestore = { doc, updateDoc, db }) {
  if (!normalize(studentId)) {
    throw new Error("Student ID is required");
  }

  const studentRef = firestore.doc(firestore.db, "students", studentId);
  await firestore.updateDoc(studentRef, payload);
}

export async function createStudentWithFirestore(
  studentId,
  payload,
  firestore = { doc, setDoc, serverTimestamp, db },
) {
  if (!normalize(studentId)) {
    throw new Error("Student ID is required");
  }

  const studentRef = firestore.doc(firestore.db, "students", studentId);
  await firestore.setDoc(studentRef, { ...payload, updated_at: firestore.serverTimestamp() }, { merge: true });
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

  const fields = ["className"];
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

export async function listAllStudents() {
  return listAllStudentsWithFirestore();
}

export async function updateStudentById(studentId, payload) {
  return updateStudentByIdWithFirestore(studentId, payload);
}

export async function createStudent(studentId, payload) {
  return createStudentWithFirestore(studentId, payload);
}
