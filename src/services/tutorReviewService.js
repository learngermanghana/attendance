import {
  Timestamp,
  arrayUnion,
  collection,
  getDocs,
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
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
  const normalizedWorkflowStage = String(review?.workflowStage || "").trim().toLowerCase();
  if (normalizedWorkflowStage === "pending_tutor") return true;
  if (review?.unreadByTutor === true) return true;

  const normalizedStatus = String(review?.reviewStatus || "").trim().toLowerCase();
  return (
    PENDING_REVIEW_STATUSES.has(normalizedStatus)
    || hasNewStudentReplySinceLastTutorAction(review)
    || hasCampusWritingQuestion(review)
  );
}

function buildMessagePreview(value) {
  const normalized = String(value || "").trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  return normalized.length <= 180 ? normalized : `${normalized.slice(0, 177)}...`;
}

export async function loadPendingTutorReviews() {
  const snap = await getDocs(collection(db, REVIEW_COLLECTION));
  return snap.docs.map((reviewDoc) => ({
    id: reviewDoc.id,
    ...reviewDoc.data(),
  })).filter(isActionableReview);
}

export async function saveTutorReviewResponse({ reviewId, reviewStatus, tutorFeedback, reviewedByUid, reviewedByName }) {
  const safeReviewId = String(reviewId || "").trim();
  if (!safeReviewId) {
    throw new Error("Missing reviewId.");
  }

  const status = String(reviewStatus || "").trim();
  if (!["approved", "needs_improvement"].includes(status)) {
    throw new Error("reviewStatus must be approved or needs_improvement.");
  }

  const normalizedFeedback = String(tutorFeedback || "").trim();
  const reviewerName = String(reviewedByName || "").trim() || "Tutor";
  const reviewerUid = String(reviewedByUid || "").trim();
  const respondedAt = Timestamp.now();
  const workflowStage = status === "needs_improvement" ? "pending_student" : "resolved";

  await updateDoc(doc(db, REVIEW_COLLECTION, safeReviewId), {
    reviewStatus: status,
    tutorFeedback: normalizedFeedback,
    reviewedAt: respondedAt,
    reviewedByUid: reviewerUid || null,
    reviewedByName: reviewerName,
    reviewerName,
    reviewerUid: reviewerUid || null,
    unreadByTutor: false,
    unreadByStudent: true,
    lastTutorReplyAt: respondedAt,
    lastActorRole: "tutor",
    workflowStage,
    lastMessageAt: respondedAt,
    lastMessageRole: "tutor",
    lastMessagePreview: buildMessagePreview(normalizedFeedback),
    tutorResponses: arrayUnion({
      message: normalizedFeedback,
      status,
      tutorId: reviewerUid || null,
      tutorName: reviewerName,
      createdAt: respondedAt,
    }),
    reviewHistory: arrayUnion({
      reviewedAt: respondedAt,
      reviewStatus: status,
      tutorFeedback: normalizedFeedback,
      reviewerName,
      reviewerUid: reviewerUid || null,
    }),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTutorReview(reviewId) {
  const safeReviewId = String(reviewId || "").trim();
  if (!safeReviewId) {
    throw new Error("Missing reviewId.");
  }

  await deleteDoc(doc(db, REVIEW_COLLECTION, safeReviewId));
}
