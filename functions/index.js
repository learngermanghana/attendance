const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");

setGlobalOptions({ region: "us-central1" });

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const STUDENTS_COLLECTION = "students";
const attendancePinSaltSecret = defineSecret("ATTENDANCE_PIN_SALT");

function parseRuntimeConfig() {
  const raw = process.env.CLOUD_RUNTIME_CONFIG || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid CLOUD_RUNTIME_CONFIG JSON");
  }
}

const runtimeConfig = parseRuntimeConfig();
const attendanceConfig = runtimeConfig.attendance || {};
const teacherAllowlist = String(attendanceConfig.teacher_emails || process.env.ATTENDANCE_TEACHER_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function resolvePinSalt() {
  return String(
    attendancePinSaltSecret.value() ||
      attendanceConfig.pin_salt ||
      process.env.ATTENDANCE_PIN_SALT ||
      ""
  ).trim();
}

function normalizeClassId(value) {
  return String(value || "").trim();
}

function normalizeClassLookupKey(value) {
  return normalizeClassId(value)
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const CLASS_ID_ALIASES = new Map([
  ["a1 leipzig", "A1 Leipzig Klasse"],
  ["a1 leipzig klasse", "A1 Leipzig Klasse"],
  ["a1 leipzip", "A1 Leipzig Klasse"],
  ["a1 leipzip klasse", "A1 Leipzig Klasse"],
]);

function normalizeClassComparable(value) {
  const normalized = normalizeClassId(value);
  if (!normalized) return "";
  return CLASS_ID_ALIASES.get(normalizeClassLookupKey(normalized)) || normalized;
}

function resolveStudentClassId(student = {}) {
  return normalizeClassComparable(student.classId || student.className || student.group || student.groupId || student.groupName);
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || "").replace(/\D+/g, "");
}

function normalizePhoneKey(value) {
  const digits = normalizePhone(value);
  if (!digits) return "";
  return digits.length > 9 ? digits.slice(-9) : digits;
}

function candidatePhoneNumbers(value) {
  const digits = normalizePhone(value);
  if (!digits) return [];

  const key = normalizePhoneKey(digits);
  const variants = new Set([digits, key]);
  if (digits.startsWith("0") && digits.length > 1) variants.add(digits.slice(1));
  if (!digits.startsWith("0")) variants.add(`0${digits}`);
  if (key) {
    variants.add(`0${key}`);
    variants.add(`233${key}`);
  }

  return Array.from(variants);
}

function buildSecretCode({ classId, date, email, phone }) {
  const pinSalt = resolvePinSalt();
  if (!pinSalt) {
    throw new Error("Missing required secret: ATTENDANCE_PIN_SALT");
  }

  const payload = [normalizeClassId(classId), String(date || "").trim(), normalizeText(email), normalizePhone(phone)].join("::");
  return crypto.createHash("sha256").update(`${pinSalt}::${payload}`).digest("hex").slice(0, 10).toUpperCase();
}

function resolveStudentPhone(student = {}) {
  return (
    student.phone ||
    student.phoneNumber ||
    student.phone_number ||
    student.contactNumber ||
    student.contactNo ||
    ""
  );
}

function isStudentRoleAllowed(student = {}) {
  const role = normalizeText(student.role);
  return !role || role === "student";
}

function isStudentStatusAllowed(student = {}) {
  const status = normalizeText(student.status);
  if (!status) return true;

  if (["inactive", "suspended", "blocked", "deleted", "archived"].includes(status)) {
    return false;
  }

  return ["active", "paid", "enrolled"].includes(status) || true;
}

async function requireAuth(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer (.+)$/);
  if (!match) {
    console.warn("auth_failure", { reason: "missing_bearer" });
    throw new Error("Missing Authorization Bearer token");
  }

  const decoded = await admin.auth().verifyIdToken(match[1]);

  if (teacherAllowlist.length > 0) {
    const email = String(decoded.email || "").toLowerCase();
    if (!teacherAllowlist.includes(email)) {
      console.warn("auth_failure", { reason: "allowlist_reject", uid: decoded.uid, email });
      throw new Error("Not allowed");
    }
  }

  return decoded;
}

function sessionDocRef(classId, sessionId) {
  return db.doc(`attendance/${classId}/sessions/${sessionId}`);
}

function parseAssignmentChapter(assignmentId) {
  const normalized = String(assignmentId || "").trim();
  const parts = normalized.split("-");
  return parts.length > 1 ? String(parts.slice(1).join("-")).trim() : "";
}

function resolveSessionMetadata({ assignmentId, sessionLabel, lesson, topic, chapter, existingSession = {} }) {
  const canonicalAssignmentId = String(
    assignmentId || existingSession.assignmentId || existingSession.assignment_id || ""
  ).trim();
  const resolvedTopic = String(topic || existingSession.topic || sessionLabel || lesson || existingSession.sessionLabel || "").trim();
  const resolvedChapter = String(chapter || existingSession.chapter || parseAssignmentChapter(canonicalAssignmentId)).trim();
  const resolvedSessionLabel = String(sessionLabel || lesson || existingSession.sessionLabel || resolvedTopic).trim();

  return {
    assignmentId: canonicalAssignmentId,
    topic: resolvedTopic,
    chapter: resolvedChapter,
    sessionLabel: resolvedSessionLabel,
  };
}

function resolveSessionIdCandidates(sessionId) {
  const normalized = String(sessionId || "").trim();
  if (!normalized) return [];

  const candidates = [normalized];
  const numeric = Number.parseInt(normalized, 10);

  if (Number.isInteger(numeric) && String(numeric) === normalized && numeric > 0) {
    candidates.push(String(numeric - 1));
  }

  return candidates;
}

async function getExistingSessionRef(classId, sessionId) {
  const candidates = resolveSessionIdCandidates(sessionId);

  for (const candidateSessionId of candidates) {
    const candidateRef = sessionDocRef(classId, candidateSessionId);
    const candidateSnap = await candidateRef.get();
    if (candidateSnap.exists) {
      return {
        requestedRef: sessionDocRef(classId, String(sessionId || "").trim()),
        existingRef: candidateRef,
        existingSnap: candidateSnap,
        usedFallback: candidateSessionId !== String(sessionId || "").trim(),
      };
    }
  }

  return {
    requestedRef: sessionDocRef(classId, String(sessionId || "").trim()),
    existingRef: null,
    existingSnap: null,
    usedFallback: false,
  };
}

app.post("/openSession", async (req, res) => {
  try {
    const user = await requireAuth(req);

    const body = req.body || {};
    const classId = normalizeClassComparable(body.classId || body.className);
    const {
      sessionId: rawSessionId,
      date,
      action,
      windowMinutes,
      sessionLabel,
      lesson,
      assignmentId,
      topic,
      chapter,
    } = body;
    const sessionId = String(rawSessionId || "").trim();

    if (!classId || !sessionId) {
      return res.status(400).json({ error: "classId and sessionId are required" });
    }

    const ref = sessionDocRef(classId, sessionId);

    if (action === "close") {
      await ref.set(
        {
          classId,
          sessionId,
          opened: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          closedBy: user.uid,
        },
        { merge: true }
      );
      return res.json({ ok: true, opened: false });
    }

    const now = admin.firestore.Timestamp.now();
    const mins = Number(windowMinutes || 180);
    const openTo = admin.firestore.Timestamp.fromMillis(now.toMillis() + mins * 60 * 1000);

    const existing = await ref.get();
    const existingSession = existing.exists ? existing.data() : {};
    const metadata = resolveSessionMetadata({ assignmentId, sessionLabel, lesson, topic, chapter, existingSession });
    const payload = {
      classId,
      sessionId,
      date: String(date || existingSession.date || "").trim(),
      sessionLabel: metadata.sessionLabel,
      assignmentId: metadata.assignmentId,
      topic: metadata.topic,
      chapter: metadata.chapter,
      assignment_id: admin.firestore.FieldValue.delete(),
      opened: true,
      openFrom: now,
      openTo,
      createdBy: user.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (!existing.exists) {
      payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
    }

    await ref.set(payload, { merge: true });

    return res.json({ ok: true, opened: true, openFrom: now.toMillis(), openTo: openTo.toMillis() });
  } catch (e) {
    return res.status(401).json({ error: e?.message || "Unauthorized" });
  }
});

app.post("/checkin", async (req, res) => {
  try {
    const body = req.body || {};
    const classId = normalizeClassComparable(body.classId || body.className);
    const {
      sessionId: rawSessionId,
      date,
      email,
      phoneNumber,
      sessionLabel,
      lesson,
      assignmentId,
      topic,
      chapter,
    } = body;
    const sessionId = String(rawSessionId || "").trim();

    if (!classId || !sessionId || !email || !phoneNumber) {
      return res.status(400).json({ error: "classId, sessionId, email, phoneNumber are required" });
    }

    const sessionLookup = await getExistingSessionRef(classId, sessionId);
    if (!sessionLookup.existingSnap) {
      return res.status(400).json({ error: "Session not opened" });
    }

    const sessionRef = sessionLookup.existingRef || sessionLookup.requestedRef;
    const sessionSnap = sessionLookup.existingSnap;

    const session = sessionSnap.data();
    const metadata = resolveSessionMetadata({ assignmentId, sessionLabel, lesson, topic, chapter, existingSession: session });
    if (!session.opened) return res.status(400).json({ error: "Check-in is closed" });

    const now = admin.firestore.Timestamp.now();
    const openFrom = session.openFrom;
    const openTo = session.openTo;

    if (openFrom && now.toMillis() < openFrom.toMillis()) return res.status(400).json({ error: "Check-in not started" });
    if (openTo && now.toMillis() > openTo.toMillis()) return res.status(400).json({ error: "Check-in time ended" });

    const rawEmail = String(email || "").trim();
    const normalizedEmail = normalizeText(rawEmail);
    const normalizedPhone = normalizePhoneKey(phoneNumber);

    async function findStudentByEmail(candidateEmail) {
      const qs = await db.collection(STUDENTS_COLLECTION).where("email", "==", candidateEmail).limit(1).get();
      return qs.empty ? null : qs.docs[0];
    }

    async function findStudentByPhone(candidatePhone) {
      const phoneFields = ["phone", "phoneNumber", "phone_number", "contactNumber", "contactNo"];
      for (const field of phoneFields) {
        const qs = await db.collection(STUDENTS_COLLECTION).where(field, "==", candidatePhone).limit(1).get();
        if (!qs.empty) return qs.docs[0];
      }
      return null;
    }

    let studentDoc = await findStudentByEmail(rawEmail);
    if (!studentDoc && normalizedEmail !== rawEmail) {
      studentDoc = await findStudentByEmail(normalizedEmail);
    }

    if (!studentDoc) {
      for (const phoneCandidate of candidatePhoneNumbers(phoneNumber)) {
        studentDoc = await findStudentByPhone(phoneCandidate);
        if (studentDoc) break;
      }
    }

    if (!studentDoc) return res.status(404).json({ error: "Student not found" });

    const st = studentDoc.data();
    const storedPhone = normalizePhoneKey(resolveStudentPhone(st));
    if (!storedPhone) return res.status(400).json({ error: "Student phone is missing in records" });
    if (!normalizedPhone || storedPhone !== normalizedPhone) {
      return res.status(400).json({ error: "Email and phone number do not match student records" });
    }

    if (!isStudentRoleAllowed(st)) return res.status(400).json({ error: "Not a student account" });
    if (!isStudentStatusAllowed(st)) return res.status(400).json({ error: "Student not active" });

    const studentClassId = resolveStudentClassId(st);
    if (normalizeClassComparable(studentClassId) !== normalizeClassComparable(classId)) return res.status(400).json({ error: "Student not in this class" });

    const uid = st.uid || studentDoc.id;

    const checkinDocId = String(uid || st.studentCode || st.studentcode || studentDoc.id || "").trim();
    const checkinRef = sessionRef.collection("checkins").doc(checkinDocId);
    const checkinSnap = await checkinRef.get();

    const checkinPayload = {
      uid,
      studentCode: st.studentCode || st.studentcode || "",
      name: st.name || "",
      email: st.email || "",
      phoneNumber: resolveStudentPhone(st),
      secretCode: buildSecretCode({ classId, date: sessionId, email: st.email || normalizedEmail, phone: storedPhone }),
      classId,
      sessionId: sessionRef.id,
      date: String(date || session.date || "").trim(),
      sessionLabel: metadata.sessionLabel,
      assignmentId: metadata.assignmentId,
      topic: metadata.topic,
      chapter: metadata.chapter,
      assignment_id: admin.firestore.FieldValue.delete(),
      status: "present",
      method: "qr",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      checkedInAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (!checkinSnap.exists) {
      checkinPayload.createdAt = admin.firestore.FieldValue.serverTimestamp();
    }

    await checkinRef.set(checkinPayload, { merge: true });

    return res.json({
      ok: true,
      savedSessionId: sessionRef.id,
      requestedSessionId: sessionId,
      usedFallbackSession: sessionLookup.usedFallback,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

app.get("/checkinStatus", async (req, res) => {
  try {
    const classId = normalizeClassComparable(req.query.classId || req.query.className);
    const sessionId = String(req.query.sessionId || req.query.session || "").trim();

    if (!classId || !sessionId) {
      return res.status(400).json({ error: "classId and sessionId are required" });
    }

    const sessionLookup = await getExistingSessionRef(classId, sessionId);
    const sessionRef = sessionLookup.requestedRef;
    const sessionSnap = sessionLookup.existingSnap || await sessionRef.get();
    if (!sessionSnap.exists) {
      return res.json({
        ok: true,
        status: "not_opened",
        opened: false,
        serverTime: admin.firestore.Timestamp.now().toMillis(),
      });
    }

    const session = sessionSnap.data() || {};
    const now = admin.firestore.Timestamp.now().toMillis();
    const opened = Boolean(session.opened);
    const openFrom = session.openFrom?.toMillis?.() || null;
    const openTo = session.openTo?.toMillis?.() || null;

    let status = "closed";
    if (opened) {
      if (openFrom && now < openFrom) status = "scheduled";
      else if (openTo && now > openTo) status = "ended";
      else status = "open";
    }

    return res.json({
      ok: true,
      status,
      opened,
      openFrom,
      openTo,
      serverTime: now,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});


async function mergeSessionDocuments({ classId, sourceSessionId, targetSessionId, deleteSource = false }) {
  const sourceRef = sessionDocRef(classId, sourceSessionId);
  const targetRef = sessionDocRef(classId, targetSessionId);

  const sourceSnap = await sourceRef.get();
  if (!sourceSnap.exists) {
    return { migrated: false, reason: "source_missing" };
  }

  const sourceData = sourceSnap.data() || {};
  const sourceCheckins = await sourceRef.collection("checkins").get();

  await targetRef.set(
    {
      ...sourceData,
      classId,
      sessionId: targetSessionId,
      legacySessionIds: admin.firestore.FieldValue.arrayUnion(String(sourceSessionId)),
      migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  for (const checkinDoc of sourceCheckins.docs) {
    await targetRef.collection("checkins").doc(checkinDoc.id).set(checkinDoc.data() || {}, { merge: true });
  }

  if (deleteSource && String(sourceSessionId) !== String(targetSessionId)) {
    for (const checkinDoc of sourceCheckins.docs) {
      await sourceRef.collection("checkins").doc(checkinDoc.id).delete();
    }
    await sourceRef.set(
      {
        migratedToSessionId: String(targetSessionId),
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        opened: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  return {
    migrated: true,
    copiedCheckins: sourceCheckins.size,
  };
}

app.post("/migrateSessionIds", async (req, res) => {
  try {
    await requireAuth(req);

    const body = req.body || {};
    const classId = normalizeClassId(body.classId || body.className);
    const mapping = body.mapping && typeof body.mapping === "object" ? body.mapping : {};
    const dryRun = Boolean(body.dryRun);
    const deleteSource = Boolean(body.deleteSource);

    if (!classId) return res.status(400).json({ error: "classId is required" });
    const mapEntries = Object.entries(mapping)
      .map(([from, to]) => [String(from || "").trim(), String(to || "").trim()])
      .filter(([from, to]) => from && to && from !== to);

    if (mapEntries.length === 0) {
      return res.status(400).json({ error: "mapping must include at least one from->to sessionId pair" });
    }

    const result = [];
    for (const [fromSessionId, toSessionId] of mapEntries) {
      if (dryRun) {
        const sourceSnap = await sessionDocRef(classId, fromSessionId).get();
        const targetSnap = await sessionDocRef(classId, toSessionId).get();
        result.push({
          fromSessionId,
          toSessionId,
          sourceExists: sourceSnap.exists,
          targetExists: targetSnap.exists,
        });
        continue;
      }

      const migrated = await mergeSessionDocuments({
        classId,
        sourceSessionId: fromSessionId,
        targetSessionId: toSessionId,
        deleteSource,
      });
      result.push({ fromSessionId, toSessionId, ...migrated });
    }

    return res.json({ ok: true, classId, dryRun, deleteSource, result });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

exports.api = onRequest({ secrets: [attendancePinSaltSecret] }, app);
