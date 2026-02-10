import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";

function isActiveStudent(data) {
  return String(data?.status || "").toLowerCase() === "active" && String(data?.role || "").toLowerCase() === "student";
}

export async function listStudentsByClass(classId) {
  const q = query(collection(db, "students"), where("classId", "==", classId), orderBy("name", "asc"));
  const snap = await getDocs(q);
  const preferred = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isActiveStudent);
  if (preferred.length > 0) return preferred;

  const fallback = query(collection(db, "students"), where("className", "==", classId), orderBy("name", "asc"));
  const fallbackSnap = await getDocs(fallback);
  return fallbackSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isActiveStudent);
}
