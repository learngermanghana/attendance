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

function sessionRefFor(classId, date) {
  return doc(collection(db, `attendance/${classId}/sessions`), date);
}

export async function loadAttendanceSession({ classId, date }) {
  const sessionRef = sessionRefFor(classId, date);
  const snap = await getDoc(sessionRef);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function saveAttendance({ classId, date, teacherUid, records }) {
  const sessionRef = sessionRefFor(classId, date);
  const snap = await getDoc(sessionRef);

  const payload = {
    classId,
    date,
    markedBy: teacherUid,
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
  const snap = await getDocs(collection(db, `attendance/${classId}/sessions/${date}/checkins`));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
