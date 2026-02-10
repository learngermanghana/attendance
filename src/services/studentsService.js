import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";

export async function listStudentsByClass(className) {
  const q = query(
    collection(db, "students"),
    where("className", "==", className),
    where("status", "==", "Active"),
    where("role", "==", "student"),
    orderBy("name", "asc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
