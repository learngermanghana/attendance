import { collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function loadAttendanceSession({ classId, date }) {
  const sessionRef = doc(collection(db, `attendance/${classId}/sessions`), date);
  const snap = await getDoc(sessionRef);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function saveAttendance({ classId, date, teacherUid, records }) {
  const sessionRef = doc(collection(db, `attendance/${classId}/sessions`), date);

  await setDoc(
    sessionRef,
    {
      classId,
      date,
      markedBy: teacherUid,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      records,
    },
    { merge: true }
  );
}
