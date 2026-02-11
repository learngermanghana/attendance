const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");

setGlobalOptions({ region: "us-central1" });

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const STUDENTS_COLLECTION = "students";

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
const teacherAllowlist = String(attendanceConfig.teacher_emails || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const pinSalt = String(attendanceConfig.pin_salt || "").trim();

if (!pinSalt) {
  throw new Error("Missing required runtime config: attendance.pin_salt");
}

function normalizeClassId(value) {
  return String(value || "").trim();
}

function resolveStudentClassId(student = {}) {
  return normalizeClassId(student.classId || student.className || student.group || student.groupId || student.groupName);
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || "").replace(/\D+/g, "");
}

function buildSecretCode({ classId, date, email, phone }) {
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

function sessionDocRef(classId, date) {
  return db.doc(`attendance/${classId}/sessions/${date}`);
}

app.post("/openSession", async (req, res) => {
  try {
    const user = await requireAuth(req);

    const body = req.body || {};
    const classId = normalizeClassId(body.classId || body.className);
    const { date, action, windowMinutes, lesson } = body;

    if (!classId || !date) {
      return res.status(400).json({ error: "classId and date are required" });
    }

    const ref = sessionDocRef(classId, date);

    if (action === "close") {
      await ref.set(
        {
          classId,
          date,
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
    const payload = {
      classId,
      date,
      lesson: String(lesson || "").trim(),
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
    const classId = normalizeClassId(body.classId || body.className);
    const { date, email, phoneNumber, lesson } = body;

    if (!classId || !date || !email || !phoneNumber) {
      return res.status(400).json({ error: "classId, date, email, phoneNumber are required" });
    }

    const sessionRef = sessionDocRef(classId, date);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) return res.status(400).json({ error: "Session not opened" });

    const session = sessionSnap.data();
    if (!session.opened) return res.status(400).json({ error: "Check-in is closed" });

    const now = admin.firestore.Timestamp.now();
    const openFrom = session.openFrom;
    const openTo = session.openTo;

    if (openFrom && now.toMillis() < openFrom.toMillis()) return res.status(400).json({ error: "Check-in not started" });
    if (openTo && now.toMillis() > openTo.toMillis()) return res.status(400).json({ error: "Check-in time ended" });

    const rawEmail = String(email || "").trim();
    const normalizedEmail = normalizeText(rawEmail);
    const normalizedPhone = normalizePhone(phoneNumber);

    async function findStudentByEmail(candidateEmail) {
      const qs = await db.collection(STUDENTS_COLLECTION).where("email", "==", candidateEmail).limit(1).get();
      return qs.empty ? null : qs.docs[0];
    }

    let studentDoc = await findStudentByEmail(rawEmail);
    if (!studentDoc && normalizedEmail !== rawEmail) {
      studentDoc = await findStudentByEmail(normalizedEmail);
    }
    if (!studentDoc) return res.status(404).json({ error: "Student not found" });

    const st = studentDoc.data();
    const storedPhone = normalizePhone(resolveStudentPhone(st));
    if (!storedPhone) return res.status(400).json({ error: "Student phone is missing in records" });
    if (!normalizedPhone || storedPhone !== normalizedPhone) {
      return res.status(400).json({ error: "Email and phone number do not match student records" });
    }

    if (String(st.role || "").toLowerCase() !== "student") return res.status(400).json({ error: "Not a student account" });
    if (String(st.status || "").toLowerCase() !== "active") return res.status(400).json({ error: "Student not active" });

    const studentClassId = resolveStudentClassId(st);
    if (studentClassId !== classId) return res.status(400).json({ error: "Student not in this class" });

    const uid = st.uid || studentDoc.id;

    const checkinRef = sessionRef.collection("checkins").doc(uid);
    const checkinSnap = await checkinRef.get();

    const checkinPayload = {
      uid,
      studentCode: st.studentCode || st.studentcode || "",
      name: st.name || "",
      email: st.email || "",
      phoneNumber: resolveStudentPhone(st),
      secretCode: buildSecretCode({ classId, date, email: st.email || normalizedEmail, phone: storedPhone }),
      classId,
      date,
      lesson: String(lesson || session.lesson || "").trim(),
      status: "present",
      method: "qr",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      checkedInAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (!checkinSnap.exists) {
      checkinPayload.createdAt = admin.firestore.FieldValue.serverTimestamp();
    }

    await checkinRef.set(checkinPayload, { merge: true });

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

exports.api = onRequest(app);
