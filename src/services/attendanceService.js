import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

function normalizeClassId(classId) {
  return String(classId || "").trim();
}

function sessionRefFor(classId, sessionId) {
  return doc(collection(db, "attendance", normalizeClassId(classId), "sessions"), String(sessionId));
}

function normalizeStudentEntry(studentCode, value) {
  if (typeof value === "boolean") {
    return {
      name: "",
      present: value,
    };
  }

  if (value && typeof value === "object") {
    return {
      name: String(value.name || "").trim(),
      present: Boolean(value.present),
    };
  }

  return {
    name: "",
    present: false,
  };
}

function normalizeSessionDoc(data = {}) {
  const students = {};

  if (data.students && typeof data.students === "object") {
    for (const [studentCode, entry] of Object.entries(data.students)) {
      students[studentCode] = normalizeStudentEntry(studentCode, entry);
    }
  } else if (Array.isArray(data.records)) {
    for (const record of data.records) {
      const studentCode = String(record.studentCode || record.studentId || "").trim();
      if (!studentCode) continue;
      students[studentCode] = {
        name: String(record.studentName || "").trim(),
        present: String(record.status || "").toLowerCase() === "present",
      };
    }
  }

  return {
    title: String(data.title || data.lesson || "").trim(),
    date: String(data.date || "").trim(),
    students,
  };
}

export async function loadAttendanceFromFirestore(classId) {
  const safeClassId = normalizeClassId(classId);
  if (!safeClassId) return {};

  const snap = await getDocs(collection(db, "attendance", safeClassId, "sessions"));
  const attendanceMap = {};

  snap.forEach((docSnap) => {
    attendanceMap[docSnap.id] = normalizeSessionDoc(docSnap.data());
  });

  return attendanceMap;
}

export async function saveAttendanceToFirestore(classId, attendanceMap) {
  const safeClassId = normalizeClassId(classId);
  if (!safeClassId) {
    throw new Error("Missing classId. Unable to save attendance.");
  }

  const writes = Object.entries(attendanceMap).map(async ([sessionId, session]) => {
    const payload = {
      classId: safeClassId,
      title: String(session?.title || "").trim(),
      date: String(session?.date || "").trim(),
      students: session?.students || {},
      updatedAt: serverTimestamp(),
    };

    const ref = sessionRefFor(safeClassId, sessionId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      payload.createdAt = serverTimestamp();
    }

    return setDoc(ref, payload, { merge: true });
  });

  await Promise.all(writes);
}

export async function loadAttendanceSession({ classId, date }) {
  const sessionRef = sessionRefFor(classId, date);
  const snap = await getDoc(sessionRef);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function saveAttendance({ classId, date, teacherUid, lesson, records }) {
  const sessionRef = sessionRefFor(classId, date);
  const snap = await getDoc(sessionRef);

  const payload = {
    classId: normalizeClassId(classId),
    date,
    markedBy: teacherUid,
    lesson: String(lesson || "").trim(),
    updatedAt: serverTimestamp(),
    records,
  };

  if (!snap.exists()) {
    payload.createdAt = serverTimestamp();
  }

  await setDoc(sessionRef, payload, { merge: true });
}

export async function listAttendanceSessions({ classId, dateFrom, dateTo }) {
  const constraints = [];
  if (classId) constraints.push(where("classId", "==", classId));
  if (dateFrom) constraints.push(where("date", ">=", dateFrom));
  if (dateTo) constraints.push(where("date", "<=", dateTo));

  const q = query(collectionGroup(db, "sessions"), ...constraints);
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listSessionCheckins({ classId, date }) {
  const safeClassId = normalizeClassId(classId);
  if (!safeClassId) return [];

  const snap = await getDocs(collection(db, "attendance", safeClassId, "sessions", String(date), "checkins"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
