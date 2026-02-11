import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

function isActiveStudent(data) {
  return String(data?.status || "").toLowerCase() === "active" && String(data?.role || "").toLowerCase() === "student";
}

function byNameAsc(a, b) {
  return String(a?.name || "").localeCompare(String(b?.name || ""));
}

async function loadStudentsByField(fieldName, classId) {
  const q = query(collection(db, "students"), where(fieldName, "==", classId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isActiveStudent).sort(byNameAsc);
}

export async function listStudentsByClass(classId) {
  const candidateFields = ["classId", "className", "group", "groupId", "groupName"];

  for (const field of candidateFields) {
    const matches = await loadStudentsByField(field, classId);
    if (matches.length > 0) return matches;
  }

  return [];
}
