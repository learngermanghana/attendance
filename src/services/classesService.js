import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase.js";
import { loadPublishedStudentRows, readPublishedClassName, readPublishedLevel } from "./publishedSheetService.js";
import { resolveWithSheetThenFirestore } from "./fallbackResolvers.js";

function normalizeClassId(value) {
  return String(value || "").trim();
}

function normalizeClassLookupKey(value) {
  return normalizeClassId(value)
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const CLASS_ID_ALIASES = new Map([
  ["a1 dortmund", "A1 Dortmund Klasse"],
  ["a1 dortmund klasse", "A1 Dortmund Klasse"],
  ["a1 berlin", "A1 Berlin Klasse"],
  ["a1 berlin klasse", "A1 Berlin Klasse"],
  ["a1 hamburg", "A1 Hamburg Klasse"],
  ["a1 hamburg klasse", "A1 Hamburg Klasse"],
  ["a1 leipzig", "A1 Leipzig Klasse"],
  ["a1 leipzig klasse", "A1 Leipzig Klasse"],
  ["a1 leipzip", "A1 Leipzig Klasse"],
  ["a1 leipzip klasse", "A1 Leipzig Klasse"],
  ["a2 stuttgart", "A2 Stuttgart Klasse"],
  ["a2 stuttgart klasse", "A2 Stuttgart Klasse"],
]);

const ACTIVE_CLASS_IDS = new Set([
  "A1 Dortmund Klasse",
  "A1 Berlin Klasse",
  "A1 Hamburg Klasse",
  "A1 Leipzig Klasse",
  "A2 Stuttgart Klasse",
]);

function normalizeToCanonicalClassId(value) {
  const normalized = normalizeClassId(value);
  if (!normalized) return "";

  return CLASS_ID_ALIASES.get(normalizeClassLookupKey(normalized)) || normalized;
}

function isActiveClassId(classId) {
  return ACTIVE_CLASS_IDS.has(normalizeToCanonicalClassId(classId));
}

function resolveClassKey(data = {}) {
  return normalizeToCanonicalClassId(data.classId || data.className || data.group || data.groupId || data.groupName || data.name || data.id);
}

function resolvePublishedClassIdentifier(row) {
  const className = normalizeToCanonicalClassId(readPublishedClassName(row));
  if (className) return className;
  return normalizeToCanonicalClassId(readPublishedLevel(row));
}

export async function listClassesFromPublishedSheetWithLoader(loadRows = loadPublishedStudentRows) {
  const rows = await loadRows();
  const classesMap = new Map();

  rows.forEach((row) => {
    const classIdentifier = resolvePublishedClassIdentifier(row);
    if (!classIdentifier || !isActiveClassId(classIdentifier)) return;

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
            name: normalizeToCanonicalClassId(c.name || c.className || c.classId || c.id),
          }))
          .filter((c) => c.classId && isActiveClassId(c.classId));
      }

      const studentsSnap = await getDocsFn(collectionFn(dbInstance, "students"));
      const classesMap = new Map();

      studentsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const classId = resolveClassKey(data);
        if (!classId || !isActiveClassId(classId)) return;
        if (!classesMap.has(classId)) {
          classesMap.set(classId, {
            classId,
            name: normalizeToCanonicalClassId(data.className || data.groupName || data.group || classId),
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
