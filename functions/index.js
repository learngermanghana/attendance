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

// ====== CONFIG ======
const STUDENTS_COLLECTION = "students";

// Set with:
// firebase functions:config:set attendance.teacher_emails="a@b.com,c@d.com"
// firebase functions:config:set attendance.pin_salt="long_random_secret"
function getTeacherAllowlist() {
  // v1 runtime config still accessible in v2 via process.env after deploy
  const raw =
    process.env.FIREBASE_CONFIG && process.env.FIREBASE_CONFIG.length
      ? "" // keep fallback below
      : "";

  // Firebase runtime config is injected as JSON string in process.env.CLOUD_RUNTIME_CONFIG on deploy
  const cfgRaw = process.env.CLOUD_RUNTIME_CONFIG || "{}";
  const cfg = JSON.parse(cfgRaw);

  const teacherEmails = (cfg.attendance && cfg.attendance.teacher_emails) || "";
  return String(teacherEmails)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function getPinSalt() {
  const cfgRaw = process.env.CLOUD_RUNTIME_CONFIG || "{}";
  const cfg = JSON.parse(cfgRaw);
  return (cfg.attendance && cfg.attendance.pin_salt) || "CHANGE_ME_PIN_SALT";
}
// ====================

function slugify(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function hashPin(pin) {
  const salt = getPinSalt();
  return crypto
    .createHash("sha256")
    .update(`${salt}::${String(pin).trim()}`)
    .digest("hex");
}

function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

async function requireAuth(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer (.+)$/);
  if (!match) throw new Error("Missing Authorization Bearer token");

  const decoded = await admin.auth().verifyIdToken(match[1]);

  // Optional allowlist
  const allowlist = getTeacherAllowlist();
  if (allowlist.length > 0) {
    const email = String(decoded.email || "").toLowerCase();
    if (!allowlist.includes(email)) throw new Error("Not allowed");
  }

  return decoded;
}

function sessionDocRef(className, date) {
  const classSlug = slugify(className);
  return db.doc(`attendance_sessions/${classSlug}/sessions/${date}`);
}

// ---- TEACHER: open/close session ----
app.post("/openSession", async (req, res) => {
  try {
    const user = await requireAuth(req);

    const { className, date, action, windowMinutes } = req.body || {};
    if (!className || !date) return res.status(400).json({ error: "className and date are required" });

    const ref = sessionDocRef(className, date);

    if (action === "close") {
      await ref.set(
        {
          className,
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

    await ref.set(
      {
        className,
        date,
        opened: true,
        pinHash: hashPin(pin),
        openFrom: now,
        openTo,
        createdBy: user.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.json({ ok: true, opened: true, pin, openFrom: now.toMillis(), openTo: openTo.toMillis() });
  } catch (e) {
    return res.status(401).json({ error: e?.message || "Unauthorized" });
  }
});

// ---- STUDENT: check in ----
app.post("/checkin", async (req, res) => {
  try {
    const { className, date, studentCodeOrEmail, pin } = req.body || {};
    if (!className || !date || !studentCodeOrEmail || !pin) {
      return res.status(400).json({ error: "className, date, studentCodeOrEmail, pin are required" });
    }

    // 1) validate session
    const sessionRef = sessionDocRef(className, date);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) return res.status(400).json({ error: "Session not opened" });

    const session = sessionSnap.data();
    if (!session.opened) return res.status(400).json({ error: "Check-in is closed" });

    const now = admin.firestore.Timestamp.now();
    const openFrom = session.openFrom;
    const openTo = session.openTo;

    if (openFrom && now.toMillis() < openFrom.toMillis()) return res.status(400).json({ error: "Check-in not started" });
    if (openTo && now.toMillis() > openTo.toMillis()) return res.status(400).json({ error: "Check-in time ended" });

    // 2) validate pin
    const incomingHash = hashPin(pin);
    if (!session.pinHash || incomingHash !== session.pinHash) {
      return res.status(400).json({ error: "Invalid PIN" });
    }

    // 3) find student by studentCode OR studentcode OR email
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

    // 4) validate student status + role + class
    if (String(st.role || "").toLowerCase() !== "student") return res.status(400).json({ error: "Not a student account" });
    if (String(st.status || "").toLowerCase() !== "active") return res.status(400).json({ error: "Student not active" });
    if (String(st.className || "") !== String(className)) return res.status(400).json({ error: "Student not in this class" });

    const uid = st.uid || studentDoc.id;

    // 5) write check-in doc (idempotent)
    const checkinRef = sessionRef.collection("checkins").doc(uid);
    await checkinRef.set(
      {
        uid,
        studentCode: st.studentCode || st.studentcode || "",
        name: st.name || "",
        email: st.email || "",
        className,
        date,
        status: "present",
        method: "qr",
        checkedInAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

exports.api = onRequest(app);
