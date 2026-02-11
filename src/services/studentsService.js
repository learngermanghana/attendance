import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import {
  loadPublishedStudentRows,
  readPublishedClassName,
  readPublishedStatus,
  readPublishedStudentCode,
  readPublishedStudentName,
} from "./publishedSheetService";

function isActiveStudent(data) {
  return String(data?.status || "").toLowerCase() === "active" && String(data?.role || "").toLowerCase() === "student";
}

function byNameAsc(a, b) {
  return String(a?.name || "").localeCompare(String(b?.name || ""));
}

function normalize(value) {
  return String(value || "").trim();
}

async function listPublishedStudentsByClass(classId) {
  const targetClassName = normalize(classId).toLowerCase();
  if (!targetClassName) return [];

  const rows = await loadPublishedStudentRows();

  return rows
    .filter((row) => normalize(readPublishedClassName(row)).toLowerCase() === targetClassName)
    .filter((row) => {
      const status = normalize(readPublishedStatus(row)).toLowerCase();
      return !status || status === "active";
    })
    .map((row) => ({
      id: normalize(readPublishedStudentCode(row) || readPublishedStudentName(row)),
      uid: normalize(readPublishedStudentCode(row)),
      studentCode: normalize(readPublishedStudentCode(row)),
      className: normalize(readPublishedClassName(row)),
      name: normalize(readPublishedStudentName(row)),
      status: normalize(readPublishedStatus(row)) || "Active",
      role: "student",
    }))
    .filter((row) => row.name)
    .sort(byNameAsc);
}

async function loadStudentsByField(fieldName, classId) {
  const q = query(collection(db, "students"), where(fieldName, "==", classId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isActiveStudent).sort(byNameAsc);
}

export async function listStudentsByClass(classId) {
  const publishedStudents = await listPublishedStudentsByClass(classId);
  if (publishedStudents.length > 0) return publishedStudents;

  const candidateFields = ["classId", "className", "group", "groupId", "groupName"];

  for (const field of candidateFields) {
    const matches = await loadStudentsByField(field, classId);
    if (matches.length > 0) return matches;
  }

  return [];
}
