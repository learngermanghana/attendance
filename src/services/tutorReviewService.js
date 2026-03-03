import {
  collection,
  getDocs,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";

const REVIEW_COLLECTION = "examTutorReviewQueue";
const PENDING_REVIEW_STATUSES = new Set(["pending", "pending_review", "awaiting_review"]);

function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function hasNewStudentReplySinceLastTutorAction(review) {
  const replies = Array.isArray(review?.studentReplies) ? review.studentReplies : [];
  if (replies.length === 0) return false;

  const lastReplyMillis = Math.max(...replies.map((reply) => toMillis(reply?.createdAt)));
  const lastTutorActionMillis = toMillis(review?.reviewedAt);

  if (!lastTutorActionMillis) return true;

  return lastReplyMillis > lastTutorActionMillis;
}

function hasCampusWritingQuestion(review) {
  if (review?.source !== "campus-writing") return false;
  const hasReflectionQuestion = typeof review?.reflection === "string" && review.reflection.trim().length > 0;
  if (!hasReflectionQuestion) return false;

  const hasTutorResponse = Boolean(toMillis(review?.reviewedAt) || String(review?.tutorFeedback || "").trim());
  return !hasTutorResponse;
}

function isActionableReview(review) {
  const normalizedStatus = String(review?.reviewStatus || "").trim().toLowerCase();
  return (
    PENDING_REVIEW_STATUSES.has(normalizedStatus)
    || hasNewStudentReplySinceLastTutorAction(review)
    || hasCampusWritingQuestion(review)
  );
}

export async function loadPendingTutorReviews() {
  const snap = await getDocs(collection(db, REVIEW_COLLECTION));
  return snap.docs.map((reviewDoc) => ({
    id: reviewDoc.id,
    ...reviewDoc.data(),
  })).filter(isActionableReview);
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
