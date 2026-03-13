import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getClassSchedule } from "../data/classSchedules";
import { QRCodeCanvas } from "qrcode.react";
import { useToast } from "../context/ToastContext.jsx";
import "./CheckinPage.css";

function resolveStatusApiUrl() {
  const checkinUrl = String(import.meta.env.VITE_CHECKIN_API_URL || "").trim();
  if (!checkinUrl) return "";
  return checkinUrl.replace(/\/checkin\/?$/, "/checkinStatus");
}

function formatClock(timestamp) {
  if (!timestamp) return "-";
  const d = new Date(Number(timestamp));
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(ms) {
  if (!Number.isFinite(ms)) return "-";
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatInterval(openFrom, openTo) {
  if (!openFrom && !openTo) return "-";
  return `${formatClock(openFrom)} to ${formatClock(openTo)}`;
}

function parseExpectedNames(raw) {
  return String(raw || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, 15);
}

export default function CheckinPage() {
  const { success, error } = useToast();
  const [sp] = useSearchParams();
  const classId = sp.get("classId") || sp.get("className") || "";
  const sessionId = sp.get("sessionId") || sp.get("session") || "";
  const date = sp.get("date") || "";
  const sessionLabel = sp.get("sessionLabel") || sp.get("lesson") || "";
  const assignmentId = sp.get("assignmentId") || sp.get("assignment_id") || "";
  const startTime = sp.get("startTime") || "";
  const endTime = sp.get("endTime") || "";
  const expectedStudentsRaw = sp.get("expectedStudents") || "";
  const expectedCount = Number(sp.get("expectedCount") || 0) || 0;

  const scheduleInfo = useMemo(() => {
    const sessionIndex = Number.parseInt(String(sessionId || ""), 10);
    if (!Number.isInteger(sessionIndex) || sessionIndex < 0) return null;

    const schedule = getClassSchedule(classId);
    const item = schedule[sessionIndex];
    if (!item) return null;

    return {
      dateLabel: item.date || String(date || ""),
      sessionDisplayLabel: `${item.day || ""} - ${item.topic || ""}`.trim().replace(/^\s*-\s*/, ""),
    };
  }, [classId, sessionId, date]);

  const hasDateFromUrl = Boolean(String(date || "").trim());
  const hasSessionLabelFromUrl = Boolean(String(sessionLabel || "").trim());
  const dateLabel = hasDateFromUrl ? String(date).trim() : (scheduleInfo?.dateLabel || "");
  const sessionDisplayLabel = hasSessionLabelFromUrl
    ? String(sessionLabel).trim()
    : (scheduleInfo?.sessionDisplayLabel || "");

  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [submittedInfo, setSubmittedInfo] = useState(null);

  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [checkinStatus, setCheckinStatus] = useState(null);
  const [serverTimeMs, setServerTimeMs] = useState(null);

  const expectedStudents = useMemo(() => parseExpectedNames(expectedStudentsRaw), [expectedStudentsRaw]);

  const normalizedPhonePreview = useMemo(() => {
    const digits = String(phoneNumber || "").replace(/\D+/g, "");
    if (!digits) return "";
    return digits.length > 9 ? digits.slice(-9) : digits;
  }, [phoneNumber]);

  const selfCheckinUrl = useMemo(() => window.location.href, []);

  const assignmentStoragePath = useMemo(() => {
    if (!classId || !sessionId) return "-";
    return `attendance/${classId}/sessions/${sessionId}/checkins`;
  }, [classId, sessionId]);

  const validationError = useMemo(() => {
    if (!email.trim()) return "Email is required.";
    if (!phoneNumber.trim()) return "Phone number is required.";
    return "";
  }, [email, phoneNumber]);

  const canSubmit = useMemo(() => {
    return classId && sessionId && !validationError;
  }, [classId, sessionId, validationError]);

  const statusApiUrl = useMemo(resolveStatusApiUrl, []);

  useEffect(() => {
    if (!classId || !sessionId || !statusApiUrl) return;

    let canceled = false;

    const loadStatus = async () => {
      setStatusBusy(true);
      setStatusError("");
      try {
        const u = new URL(statusApiUrl);
        u.searchParams.set("classId", classId);
        u.searchParams.set("sessionId", sessionId);
        const res = await fetch(u.toString());
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to load check-in status");
        if (canceled) return;
        setCheckinStatus(data);
        if (Number.isFinite(data?.serverTime)) setServerTimeMs(Number(data.serverTime));
      } catch (e) {
        if (canceled) return;
        setStatusError(e?.message || "Failed to load check-in status");
      } finally {
        if (!canceled) setStatusBusy(false);
      }
    };

    loadStatus();
    const poll = window.setInterval(loadStatus, 30000);
    return () => {
      canceled = true;
      window.clearInterval(poll);
    };
  }, [classId, sessionId, statusApiUrl]);

  useEffect(() => {
    if (!Number.isFinite(serverTimeMs)) return undefined;
    const t = window.setInterval(() => {
      setServerTimeMs((prev) => (Number.isFinite(prev) ? prev + 1000 : prev));
    }, 1000);
    return () => window.clearInterval(t);
  }, [serverTimeMs]);


  const attendanceWindowLabel = useMemo(() => {
    if (checkinStatus?.openFrom || checkinStatus?.openTo) {
      return formatInterval(checkinStatus.openFrom, checkinStatus.openTo);
    }
    if (startTime || endTime) return `${startTime || "--:--"} to ${endTime || "--:--"}`;
    return "-";
  }, [checkinStatus, startTime, endTime]);

  const statusSummary = useMemo(() => {
    if (!checkinStatus) return null;

    const status = String(checkinStatus.status || "");
    const openFrom = Number(checkinStatus.openFrom || 0) || null;
    const openTo = Number(checkinStatus.openTo || 0) || null;

    if (status === "open") {
      return {
        tone: "open",
        label: "Class starts at this time.",
        detail: [
          "Please check in before the meeting starts.",
          openTo && serverTimeMs ? `Ends in ${formatDuration(openTo - serverTimeMs)}` : "",
        ].filter(Boolean).join(" "),
      };
    }

    if (status === "scheduled") {
      return {
        tone: "scheduled",
        label: "Class starts at this time.",
        detail: [
          "Please check in before the meeting starts.",
          openFrom && serverTimeMs ? `Starts in ${formatDuration(openFrom - serverTimeMs)}` : `Starts at ${formatClock(openFrom)}`,
        ].filter(Boolean).join(" "),
      };
    }

    if (status === "ended") {
      return {
        tone: "ended",
        label: "Class has ended",
        detail: `If you still have not checked in, submit now. Closed at ${formatClock(openTo)}.`,
      };
    }

    if (status === "not_opened") {
      return {
        tone: "closed",
        label: "Session not opened",
        detail: "Ask your teacher to open check-in.",
      };
    }

    return {
      tone: "closed",
      label: "Check-in closed",
      detail: "Ask your teacher to open check-in.",
    };
  }, [checkinStatus, serverTimeMs]);

  const submit = async (e) => {
    e.preventDefault();
    if (validationError) {
      error(validationError);
      return;
    }

    setBusy(true);
    try {
      const trimmedEmail = email.trim();
      const trimmedPhone = phoneNumber.trim();
      const res = await fetch(import.meta.env.VITE_CHECKIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          sessionId,
          date,
          email: trimmedEmail,
          phoneNumber: trimmedPhone,
          sessionLabel: sessionDisplayLabel,
          assignmentId: assignmentId.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Check-in failed");
      success("Check-in successful. You are marked present.");
      setSubmittedInfo({
        checkedInAt: Date.now(),
        maskedEmail: trimmedEmail.replace(/(^.).*(@.*$)/, "$1***$2"),
      });
      setEmail("");
      setPhoneNumber("");
    } catch (err) {
      error(err?.message || "Check-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="checkin-page">
      <div className="checkin-card">
        <h2>Student Check-in</h2>
        <p className="checkin-subtitle">Class starts at this time. Please check in before the meeting starts.</p>

        {statusSummary && (
          <div className={`checkin-status checkin-status-${statusSummary.tone}`}>
            <div className="checkin-status-label">{statusSummary.label}</div>
            {statusSummary.detail && <div className="checkin-status-detail">{statusSummary.detail}</div>}
          </div>
        )}
        {statusBusy && <div className="checkin-help">Refreshing check-in status...</div>}
        {statusError && <div className="checkin-inline-error">{statusError}</div>}

        <div className="checkin-info-block">
          <div className="checkin-info-title">Today in class</div>
          <div>Welcome to <b>{classId || "-"}</b>.</div>
          <div>You will be working on <b>{sessionDisplayLabel || "today's lesson"}</b>.</div>
          <div>Attendance window: <b>{attendanceWindowLabel || formatInterval(checkinStatus?.openFrom, checkinStatus?.openTo)}</b></div>
          <div className="checkin-help">Please check in before the meeting starts. If class has ended and you still have not checked in, submit now.</div>
        </div>

        {(expectedCount > 0 || expectedStudents.length > 0) && (
          <div className="checkin-expected">
            <div><b>Expected students:</b> {expectedCount || expectedStudents.length}</div>
            {expectedStudents.length > 0 && (
              <div className="checkin-help">{expectedStudents.join(", ")}</div>
            )}
          </div>
        )}

        <div className="checkin-meta">
          <div><b>Class:</b> {classId || "-"}</div>
          <div><b>Date:</b> {dateLabel || "-"}</div>
          <div><b>Session:</b> {sessionDisplayLabel || "-"}</div>
          <div><b>Assignment ID:</b> {assignmentId || "-"}</div>
          <div><b>Saved to:</b> <code>{assignmentStoragePath}</code></div>
        </div>

        {submittedInfo && (
          <div className="checkin-success-card" role="status" aria-live="polite">
            <div><b>✅ You are checked in.</b></div>
            <div>Time: {new Date(submittedInfo.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            <div>Email: {submittedInfo.maskedEmail}</div>
            <div>Session: {sessionDisplayLabel || "-"}</div>
          </div>
        )}

        {(!classId || !sessionId) && (
          <div className="checkin-warning">
            Missing classId/sessionId in QR link. Ask your teacher to show the QR again.
          </div>
        )}

        <form onSubmit={submit} className="checkin-form">
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
            type="email"
          />
          <input
            placeholder="Phone number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            aria-label="Phone number"
            type="tel"
          />

          {normalizedPhonePreview && (
            <div className="checkin-help">
              Normalized student number: <b>{normalizedPhonePreview}</b>
            </div>
          )}

          {!canSubmit && classId && sessionId && <div className="checkin-inline-error">{validationError}</div>}

          <button disabled={!canSubmit || busy}>{busy ? "Submitting..." : "Mark me present"}</button>
        </form>

        <div className="checkin-share">
          <div><b>Need to continue on another device?</b> Scan this QR code to open this same form.</div>
          <div className="checkin-share-box">
            <QRCodeCanvas value={selfCheckinUrl} size={130} includeMargin />
          </div>
        </div>
      </div>
    </div>
  );
}
