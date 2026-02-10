import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";

function normalizeClassId(value) {
  return String(value || "").trim();
}

export async function listClasses() {
  const classesCollection = collection(db, "classes");
  const classesSnap = await getDocs(query(classesCollection, orderBy("name", "asc")));

  if (!classesSnap.empty) {
    return classesSnap.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .map((c) => ({
        classId: normalizeClassId(c.classId || c.id),
        name: c.name || c.classId || c.id,
      }))
      .filter((c) => c.classId);
  }

  const studentsSnap = await getDocs(collection(db, "students"));
  const classesMap = new Map();

  studentsSnap.forEach((docSnap) => {
    const data = docSnap.data();
    const classId = normalizeClassId(data.classId || data.className);
    if (!classId) return;
    if (!classesMap.has(classId)) {
      classesMap.set(classId, {
        classId,
        name: data.className || classId,
      });
    }
  });

  return [...classesMap.values()].sort((a, b) => a.name.localeCompare(b.name));
}
