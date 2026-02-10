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

function hashPin(pin) {
  return crypto
    .createHash("sha256")
    .update(`${pinSalt}::${String(pin).trim()}`)
    .digest("hex");
}

function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
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
    const { date, action, windowMinutes } = body;

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

    const pin = generatePin();
    const now = admin.firestore.Timestamp.now();
    const mins = Number(windowMinutes || 180);
    const openTo = admin.firestore.Timestamp.fromMillis(now.toMillis() + mins * 60 * 1000);

    const existing = await ref.get();
    const payload = {
      classId,
      date,
      opened: true,
      pinHash: hashPin(pin),
      openFrom: now,
      openTo,
      createdBy: user.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (!existing.exists) {
      payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
    }

    await ref.set(payload, { merge: true });

    return res.json({ ok: true, opened: true, pin, openFrom: now.toMillis(), openTo: openTo.toMillis() });
  } catch (e) {
    return res.status(401).json({ error: e?.message || "Unauthorized" });
  }
});

app.post("/checkin", async (req, res) => {
  try {
    const body = req.body || {};
    const classId = normalizeClassId(body.classId || body.className);
    const { date, studentCodeOrEmail, pin } = body;

    if (!classId || !date || !studentCodeOrEmail || !pin) {
      return res.status(400).json({ error: "classId, date, studentCodeOrEmail, pin are required" });
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

    const incomingHash = hashPin(pin);
    if (!session.pinHash || incomingHash !== session.pinHash) {
      return res.status(400).json({ error: "Invalid PIN" });
    }

    const key = String(studentCodeOrEmail).trim();

    async function findBy(field) {
      const qs = await db.collection(STUDENTS_COLLECTION).where(field, "==", key).limit(1).get();
      if (!qs.empty) return qs.docs[0];
      return null;
    }

    let studentDoc = await findBy("studentCode");
    if (!studentDoc) studentDoc = await findBy("studentcode");
    if (!studentDoc) studentDoc = await findBy("email");
    if (!studentDoc) return res.status(404).json({ error: "Student not found" });

    const st = studentDoc.data();

    if (String(st.role || "").toLowerCase() !== "student") return res.status(400).json({ error: "Not a student account" });
    if (String(st.status || "").toLowerCase() !== "active") return res.status(400).json({ error: "Student not active" });

    const studentClassId = normalizeClassId(st.classId || st.className);
    if (studentClassId !== classId) return res.status(400).json({ error: "Student not in this class" });

    const uid = st.uid || studentDoc.id;

    const checkinRef = sessionRef.collection("checkins").doc(uid);
    const checkinSnap = await checkinRef.get();

    const checkinPayload = {
      uid,
      studentCode: st.studentCode || st.studentcode || "",
      name: st.name || "",
      email: st.email || "",
      classId,
      date,
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
