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

function resolvePublishedClass(row) {
  const level = normalize(readPublishedLevel(row));
  if (level) return level;
  return normalize(readPublishedClassName(row));
}

export async function listPublishedStudentsByClassWithLoader(classId, loadRows = loadPublishedStudentRows) {
  const targetClassName = normalize(classId).toLowerCase();
  if (!targetClassName) return [];

  const rows = await loadRows();

  return rows
    .filter((row) => normalize(resolvePublishedClass(row)).toLowerCase() === targetClassName)
    .filter((row) => {
      const status = normalize(readPublishedStatus(row)).toLowerCase();
      return !status || status === "active";
    })
    .map((row) => ({
      id: normalize(readPublishedStudentCode(row) || readPublishedStudentName(row)),
      uid: normalize(readPublishedStudentCode(row)),
      studentCode: normalize(readPublishedStudentCode(row)),
      className: normalize(resolvePublishedClass(row)),
      name: normalize(readPublishedStudentName(row)),
      status: normalize(readPublishedStatus(row)) || "Active",
      role: "student",
    }))
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
