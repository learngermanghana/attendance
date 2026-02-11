import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";

function normalizeClassId(value) {
  return String(value || "").trim();
}

function resolveClassKey(data = {}) {
  return normalizeClassId(data.classId || data.className || data.group || data.groupId || data.groupName || data.name || data.id);
}

export async function listClasses() {
  const classesCollection = collection(db, "classes");
  const classesSnap = await getDocs(query(classesCollection, orderBy("name", "asc")));

  if (!classesSnap.empty) {
    return classesSnap.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .map((c) => ({
        classId: resolveClassKey(c),
        name: c.name || c.className || c.classId || c.id,
      }))
      .filter((c) => c.classId);
  }

  const studentsSnap = await getDocs(collection(db, "students"));
  const classesMap = new Map();

  studentsSnap.forEach((docSnap) => {
    const data = docSnap.data();
    const classId = resolveClassKey(data);
    if (!classId) return;
    if (!classesMap.has(classId)) {
      classesMap.set(classId, {
        classId,
        name: data.className || data.groupName || data.group || classId,
      });
    }
  });

  return [...classesMap.values()].sort((a, b) => a.name.localeCompare(b.name));
}
