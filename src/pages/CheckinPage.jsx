import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function CheckinPage() {
  const [sp] = useSearchParams();
  const classId = sp.get("classId") || sp.get("className") || "";
  const date = sp.get("date") || "";
  const [studentCode, setStudentCode] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const validationError = useMemo(() => {
    if (!studentCode.trim()) return "Student code or email is required.";
    if (!pin.trim()) return "PIN is required.";
    if (pin.trim().length < 4) return "PIN must be at least 4 characters.";
    return "";
  }, [studentCode, pin]);

  const canSubmit = useMemo(() => {
    return classId && date && !validationError;
  }, [classId, date, validationError]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (validationError) {
      setMsg(`❌ ${validationError}`);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(import.meta.env.VITE_CHECKIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          date,
          studentCodeOrEmail: studentCode.trim(),
          pin: pin.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Check-in failed");
      setMsg("✅ Check-in successful. You are marked present.");
      setStudentCode("");
      setPin("");
    } catch (err) {
      setMsg("❌ " + (err?.message || "Error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: "30px auto", padding: 16 }}>
      <h2>Student Check-in</h2>

      <div style={{ marginBottom: 12, fontSize: 13, opacity: 0.85 }}>
        <div>
          <b>Class:</b> {classId || "-"}
        </div>
        <div>
          <b>Date:</b> {date || "-"}
        </div>
      </div>

      {(!classId || !date) && (
        <div style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8, marginBottom: 12 }}>
          Missing classId/date in QR link. Ask your teacher to show the QR again.
        </div>
      )}

      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <input
          placeholder="Student code (or email)"
          value={studentCode}
          onChange={(e) => setStudentCode(e.target.value)}
          aria-label="Student code"
        />
        <div>
          <input
            placeholder="Secret PIN"
            type={showPin ? "text" : "password"}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            aria-label="PIN"
          />
          <label style={{ fontSize: 12, marginTop: 4, display: "block" }}>
            <input type="checkbox" checked={showPin} onChange={(e) => setShowPin(e.target.checked)} /> Show PIN
          </label>
        </div>

        {!canSubmit && classId && date && <div style={{ color: "#a00000", fontSize: 12 }}>{validationError}</div>}

        <button disabled={!canSubmit || busy}>{busy ? "Submitting..." : "Mark me present"}</button>

        {msg && <div style={{ marginTop: 6 }}>{msg}</div>}
      </form>
    </div>
  );
}
