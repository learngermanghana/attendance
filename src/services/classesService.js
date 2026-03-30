import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase.js";
import { loadPublishedStudentRows, readPublishedClassName, readPublishedLevel } from "./publishedSheetService.js";
import { resolveWithSheetThenFirestore } from "./fallbackResolvers.js";

function normalizeClassId(value) {
  return String(value || "").trim();
}

const INACTIVE_CLASS_IDS = new Set([
  "A1 Bonn Klasse",
  "A1 Munich Klasse",
]);

function isInactiveClassId(classId) {
  return INACTIVE_CLASS_IDS.has(normalizeClassId(classId));
}

function resolveClassKey(data = {}) {
  return normalizeClassId(data.classId || data.className || data.group || data.groupId || data.groupName || data.name || data.id);
}

function resolvePublishedClassIdentifier(row) {
  const className = normalizeClassId(readPublishedClassName(row));
  if (className) return className;
  return normalizeClassId(readPublishedLevel(row));
}

export async function listClassesFromPublishedSheetWithLoader(loadRows = loadPublishedStudentRows) {
  const rows = await loadRows();
  const classesMap = new Map();

  rows.forEach((row) => {
    const classIdentifier = resolvePublishedClassIdentifier(row);
    if (!classIdentifier || isInactiveClassId(classIdentifier)) return;

    if (!classesMap.has(classIdentifier)) {
      classesMap.set(classIdentifier, {
        classId: classIdentifier,
        name: classIdentifier,
      });
    }
  });

  return [...classesMap.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function listClassesWithDeps(
  {
    listClassesFromPublishedSheet = listClassesFromPublishedSheetWithLoader,
    collectionFn = collection,
    getDocsFn = getDocs,
    orderByFn = orderBy,
    queryFn = query,
    dbInstance = db,
  } = {},
) {
  return resolveWithSheetThenFirestore({
    loadFromSheet: () => listClassesFromPublishedSheet(),
    loadFromFirestore: async () => {
      const classesCollection = collectionFn(dbInstance, "classes");
      const classesSnap = await getDocsFn(queryFn(classesCollection, orderByFn("name", "asc")));

      if (!classesSnap.empty) {
        return classesSnap.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .map((c) => ({
            classId: resolveClassKey(c),
            name: c.name || c.className || c.classId || c.id,
          }))
          .filter((c) => c.classId && !isInactiveClassId(c.classId));
      }

      const studentsSnap = await getDocsFn(collectionFn(dbInstance, "students"));
      const classesMap = new Map();

      studentsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const classId = resolveClassKey(data);
        if (!classId || isInactiveClassId(classId)) return;
        if (!classesMap.has(classId)) {
          classesMap.set(classId, {
            classId,
            name: data.className || data.groupName || data.group || classId,
          });
        }
      });

      return [...classesMap.values()].sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

export async function listClasses() {
  return listClassesWithDeps();
}
