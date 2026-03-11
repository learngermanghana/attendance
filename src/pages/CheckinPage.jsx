import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getClassSchedule } from "../data/classSchedules";
import { QRCodeCanvas } from "qrcode.react";
import { useToast } from "../context/ToastContext.jsx";
import "./CheckinPage.css";

export default function CheckinPage() {
  const { success, error } = useToast();
  const [sp] = useSearchParams();
  const classId = sp.get("classId") || sp.get("className") || "";
  const sessionId = sp.get("sessionId") || sp.get("session") || "";
  const date = sp.get("date") || "";
  const sessionLabel = sp.get("sessionLabel") || sp.get("lesson") || "";
  const assignmentId = sp.get("assignmentId") || sp.get("assignment_id") || "";

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

  const dateLabel = scheduleInfo?.dateLabel || date || "";
  const sessionDisplayLabel = sessionLabel || scheduleInfo?.sessionDisplayLabel || "";

  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [busy, setBusy] = useState(false);

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

  const submit = async (e) => {
    e.preventDefault();
    if (validationError) {
      error(validationError);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(import.meta.env.VITE_CHECKIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          sessionId,
          date,
          email: email.trim(),
          phoneNumber: phoneNumber.trim(),
          sessionLabel: sessionDisplayLabel,
          assignmentId: assignmentId.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Check-in failed");
      success("Check-in successful. You are marked present.");
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
        <p className="checkin-subtitle">Fill in your details to mark your attendance.</p>

        <div className="checkin-meta">
          <div><b>Class:</b> {classId || "-"}</div>
          <div><b>Date:</b> {dateLabel || "-"}</div>
          <div><b>Session:</b> {sessionDisplayLabel || "-"}</div>
          <div><b>Assignment ID:</b> {assignmentId || "-"}</div>
          <div><b>Saved to:</b> <code>{assignmentStoragePath}</code></div>
        </div>

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
