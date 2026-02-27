import {
  collection,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";

const REVIEW_COLLECTION = "examTutorReviewQueue";

export async function loadPendingTutorReviews() {
  const reviewsQuery = query(
    collection(db, REVIEW_COLLECTION),
    where("reviewStatus", "==", "pending"),
  );

  const snap = await getDocs(reviewsQuery);
  return snap.docs.map((reviewDoc) => ({
    id: reviewDoc.id,
    ...reviewDoc.data(),
  }));
}

export async function saveTutorReviewResponse({ reviewId, reviewStatus, tutorFeedback }) {
  const safeReviewId = String(reviewId || "").trim();
  if (!safeReviewId) {
    throw new Error("Missing reviewId.");
  }

  const status = String(reviewStatus || "").trim();
  if (!["approved", "needs_improvement"].includes(status)) {
    throw new Error("reviewStatus must be approved or needs_improvement.");
  }

  await updateDoc(doc(db, REVIEW_COLLECTION, safeReviewId), {
    reviewStatus: status,
    tutorFeedback: String(tutorFeedback || "").trim(),
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
