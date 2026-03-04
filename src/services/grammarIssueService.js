import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase.js";

function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function normalizeGrammarIssueDoc(issueDoc) {
  const data = issueDoc.data();
  const createdAt = data.createdAt || data.reportedAt || data.timestamp || null;

  return {
    id: issueDoc.id,
    ...data,
    createdAt,
    createdAtMillis: toMillis(createdAt),
  };
}

export async function loadGrammarIssueReports(firestore = {
  collection,
  getDocs,
  orderBy,
  query,
  db,
}) {
  const reportsCollection = firestore.collection(firestore.db, "ai_issue_reports");

  let snap;
  try {
    snap = await firestore.getDocs(firestore.query(reportsCollection, firestore.orderBy("createdAt", "desc")));
  } catch {
    snap = await firestore.getDocs(reportsCollection);
  }

  return snap.docs
    .map(normalizeGrammarIssueDoc)
    .sort((a, b) => b.createdAtMillis - a.createdAtMillis);
}
