const crypto = require("node:crypto");

const SESSION_COLLECTION = "classParticipationSessions";
const RECORD_COLLECTION = "classParticipationRecords";
const MAX_QUESTION_RESPONSES = 60;
const QUESTION_RESULTS = new Set(["correct", "needs_review", "skipped", "presenter_absent"]);

function clean(value) {
  return String(value || "").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function clampCount(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.round(number));
}

function safeText(value, max = 500) {
  return clean(value).slice(0, max);
}

function stableId(...parts) {
  return crypto.createHash("sha1").update(parts.map(clean).join("|")).digest("hex");
}

function timestampToIso(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function serializeDoc(snapshot) {
  const data = snapshot?.data?.() || {};
  return {
    id: snapshot.id,
    ...data,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

function studentIdentity(student = {}, index = 0) {
  return lower(
    student.studentUid
      || student.studentCode
      || student.studentEmail
      || student.studentName
      || `student-${index}`,
  );
}

function normalizeQuestionResponse(response = {}, index = 0) {
  const rawResult = lower(response.result || response.status);
  const result = rawResult === "needshelp" || rawResult === "needs_help"
    ? "needs_review"
    : rawResult === "absent"
      ? "presenter_absent"
      : rawResult;
  if (!QUESTION_RESULTS.has(result)) return null;
  const question = safeText(response.question || response.questionText, 700);
  if (!question && result !== "presenter_absent") return null;
  return {
    questionId: safeText(response.questionId || `question-${index + 1}`, 160),
    question,
    sourceQuestion: safeText(response.sourceQuestion, 700),
    result,
    questionContext: safeText(response.questionContext, 120),
    recordedAt: safeText(response.recordedAt, 80),
  };
}

function normalizeStudent(student = {}, index = 0) {
  const questionResponses = (Array.isArray(student.questionResponses) ? student.questionResponses : [])
    .slice(-MAX_QUESTION_RESPONSES)
    .map(normalizeQuestionResponse)
    .filter(Boolean);
  return {
    studentUid: clean(student.studentUid),
    studentCode: lower(student.studentCode),
    studentEmail: clean(student.studentEmail),
    studentEmailNormalized: lower(student.studentEmail),
    studentName: clean(student.studentName) || "Student",
    turns: clampCount(student.turns),
    correct: clampCount(student.correct),
    needsReview: clampCount(student.needsReview ?? student.needsHelp),
    skipped: clampCount(student.skipped),
    presenterAbsent: Boolean(student.presenterAbsent),
    questionResponses,
    identity: studentIdentity(student, index),
  };
}

function lessonSessionId(payload = {}) {
  return stableId(payload.classId, payload.assignmentId || payload.lessonId, payload.sessionDate);
}

function assertDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean(value))) {
    const error = new Error("sessionDate must be YYYY-MM-DD");
    error.status = 400;
    throw error;
  }
}

function assertStaff(user = {}, staffEmails = []) {
  const configured = (Array.isArray(staffEmails) ? staffEmails : [])
    .map(lower)
    .filter(Boolean);
  if (!configured.length) return;
  if (!configured.includes(lower(user.email))) {
    const error = new Error("Not allowed");
    error.status = 403;
    throw error;
  }
}

async function requireAnyFirebaseUser(req, admin) {
  const header = clean(req.headers?.authorization);
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const error = new Error("Missing Authorization Bearer token");
    error.status = 401;
    throw error;
  }
  try {
    return await admin.auth().verifyIdToken(match[1]);
  } catch (cause) {
    const error = new Error("Invalid authentication token");
    error.status = 401;
    error.cause = cause;
    throw error;
  }
}

function statusFor(error) {
  const value = Number(error?.status || 0);
  if (value >= 400 && value < 600) return value;
  if (/not allowed/i.test(String(error?.message || ""))) return 403;
  if (/auth|token|unauthor/i.test(String(error?.message || ""))) return 401;
  return 500;
}

async function queryRecords(db, field, value, limit = 100) {
  if (!clean(value)) return [];
  const snapshot = await db.collection(RECORD_COLLECTION)
    .where(field, "==", value)
    .limit(limit)
    .get();
  return snapshot.docs.map(serializeDoc);
}

function studentSafeParticipationRecord(row = {}) {
  return {
    id: clean(row.id),
    sessionId: clean(row.sessionId),
    classId: clean(row.classId),
    className: clean(row.className),
    course: clean(row.course),
    assignmentId: clean(row.assignmentId),
    lessonDay: clean(row.lessonDay),
    lessonTitle: clean(row.lessonTitle),
    sessionDate: clean(row.sessionDate),
    turns: clampCount(row.turns),
    correct: clampCount(row.correct),
    needsReview: clampCount(row.needsReview),
    skipped: clampCount(row.skipped),
    questionResponses: (Array.isArray(row.questionResponses) ? row.questionResponses : [])
      .map(normalizeQuestionResponse)
      .filter((response) => response && (response.result === "correct" || response.result === "needs_review"))
      .map(({ questionId, question, result, questionContext, recordedAt }) => ({
        questionId,
        question,
        result,
        questionContext,
        recordedAt,
      })),
    updatedAt: row.updatedAt || null,
  };
}

function registerClassParticipationRoutes({ app, db, admin, requireAuth, staffEmails = [] }) {
  if (!app?.post || !app?.get || !db?.collection || !admin?.firestore?.FieldValue?.serverTimestamp || typeof requireAuth !== "function") {
    throw new Error("Class participation route dependencies are incomplete");
  }

  const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

  app.post("/class-participation/session", async (req, res) => {
    try {
      const user = await requireAuth(req);
      assertStaff(user, staffEmails);

      const payload = req.body || {};
      const classId = clean(payload.classId);
      const assignmentId = clean(payload.assignmentId || payload.lessonId);
      const sessionDate = clean(payload.sessionDate);
      const students = Array.isArray(payload.students) ? payload.students : [];

      if (!classId) return res.status(400).json({ ok: false, error: "classId is required" });
      if (!assignmentId) return res.status(400).json({ ok: false, error: "assignmentId is required" });
      assertDate(sessionDate);
      if (students.length > 150) return res.status(400).json({ ok: false, error: "Too many students in one participation session" });

      const normalizedStudents = students.map(normalizeStudent);
      const sessionId = lessonSessionId({ classId, assignmentId, sessionDate });
      const sessionRef = db.collection(SESSION_COLLECTION).doc(sessionId);
      const previousSession = await sessionRef.get();

      const totals = normalizedStudents.reduce((summary, student) => {
        if (student.turns > 0) summary.participatedCount += 1;
        summary.correctCount += student.correct;
        summary.needsReviewCount += student.needsReview;
        summary.skippedCount += student.skipped;
        summary.questionResponseCount += student.questionResponses.filter((response) => response.result === "correct" || response.result === "needs_review").length;
        if (student.presenterAbsent) summary.presenterAbsentCount += 1;
        return summary;
      }, {
        participatedCount: 0,
        correctCount: 0,
        needsReviewCount: 0,
        skippedCount: 0,
        presenterAbsentCount: 0,
        questionResponseCount: 0,
      });

      await sessionRef.set({
        classId,
        className: clean(payload.className) || classId,
        course: clean(payload.course).toUpperCase(),
        assignmentId,
        lessonId: clean(payload.lessonId) || assignmentId,
        lessonDay: clean(payload.lessonDay),
        lessonTitle: clean(payload.lessonTitle),
        sessionDate,
        source: "teaching-slides-presenter",
        teacherUid: clean(user.uid),
        teacherEmail: clean(user.email),
        rosterCount: normalizedStudents.length,
        eligibleCount: Math.max(0, normalizedStudents.length - totals.presenterAbsentCount),
        questionPoolSize: clampCount(payload.questionPoolSize),
        ...totals,
        ...(previousSession.exists ? {} : { createdAt: serverTimestamp() }),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      const incomingRecordIds = new Set();
      const batch = db.batch();
      normalizedStudents.forEach((student, index) => {
        const recordId = stableId(sessionId, student.identity || index);
        incomingRecordIds.add(recordId);
        const ref = db.collection(RECORD_COLLECTION).doc(recordId);
        batch.set(ref, {
          sessionId,
          classId,
          className: clean(payload.className) || classId,
          course: clean(payload.course).toUpperCase(),
          assignmentId,
          lessonDay: clean(payload.lessonDay),
          lessonTitle: clean(payload.lessonTitle),
          sessionDate,
          studentUid: student.studentUid,
          studentCode: student.studentCode,
          studentEmail: student.studentEmail,
          studentEmailNormalized: student.studentEmailNormalized,
          studentName: student.studentName,
          turns: student.turns,
          correct: student.correct,
          needsReview: student.needsReview,
          skipped: student.skipped,
          presenterAbsent: student.presenterAbsent,
          questionResponses: student.questionResponses,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      });

      const existing = await db.collection(RECORD_COLLECTION).where("sessionId", "==", sessionId).limit(200).get();
      existing.docs.forEach((snapshot) => {
        if (!incomingRecordIds.has(snapshot.id)) batch.delete(snapshot.ref);
      });
      await batch.commit();

      return res.json({ ok: true, sessionId, ...totals, rosterCount: normalizedStudents.length });
    } catch (error) {
      console.error("class_participation_save_failed", { message: error?.message });
      return res.status(statusFor(error)).json({ ok: false, error: error?.message || "Could not save class participation" });
    }
  });

  app.get("/class-participation/sessions", async (req, res) => {
    try {
      const user = await requireAuth(req);
      assertStaff(user, staffEmails);
      const classId = clean(req.query?.classId);
      let query = db.collection(SESSION_COLLECTION);
      if (classId) query = query.where("classId", "==", classId);
      const snapshot = await query.limit(120).get();
      const sessions = snapshot.docs
        .map(serializeDoc)
        .sort((a, b) => String(b.sessionDate || b.updatedAt || "").localeCompare(String(a.sessionDate || a.updatedAt || "")));
      return res.json({ ok: true, sessions });
    } catch (error) {
      return res.status(statusFor(error)).json({ ok: false, error: error?.message || "Could not load class participation" });
    }
  });

  app.get("/class-participation/session/:sessionId", async (req, res) => {
    try {
      const user = await requireAuth(req);
      assertStaff(user, staffEmails);
      const sessionId = clean(req.params?.sessionId);
      if (!sessionId) return res.status(400).json({ ok: false, error: "sessionId is required" });
      const sessionSnap = await db.collection(SESSION_COLLECTION).doc(sessionId).get();
      if (!sessionSnap.exists) return res.status(404).json({ ok: false, error: "Participation session not found" });
      const records = await queryRecords(db, "sessionId", sessionId, 200);
      records.sort((a, b) => String(a.studentName || "").localeCompare(String(b.studentName || "")));
      return res.json({ ok: true, session: serializeDoc(sessionSnap), records });
    } catch (error) {
      return res.status(statusFor(error)).json({ ok: false, error: error?.message || "Could not load participation session" });
    }
  });

  app.get("/class-participation/me", async (req, res) => {
    try {
      const user = await requireAnyFirebaseUser(req, admin);
      const uid = clean(user.uid);
      const email = lower(user.email);
      const rows = [];
      if (uid) rows.push(...await queryRecords(db, "studentUid", uid, 100));
      if (email) rows.push(...await queryRecords(db, "studentEmailNormalized", email, 100));
      const unique = [...new Map(rows.map((row) => [row.id, row])).values()]
        .sort((a, b) => String(b.sessionDate || b.updatedAt || "").localeCompare(String(a.sessionDate || a.updatedAt || "")))
        .map(studentSafeParticipationRecord);
      return res.json({ ok: true, participation: unique });
    } catch (error) {
      return res.status(statusFor(error)).json({ ok: false, error: error?.message || "Could not load your participation" });
    }
  });
}

module.exports = {
  SESSION_COLLECTION,
  RECORD_COLLECTION,
  lessonSessionId,
  normalizeQuestionResponse,
  normalizeStudent,
  studentSafeParticipationRecord,
  registerClassParticipationRoutes,
};
