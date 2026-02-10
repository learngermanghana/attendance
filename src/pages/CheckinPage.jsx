import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function CheckinPage() {
  const [sp] = useSearchParams();
  const className = sp.get("className") || "";
  const date = sp.get("date") || "";
  const [studentCode, setStudentCode] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const canSubmit = useMemo(() => {
    return className && date && studentCode.trim() && pin.trim();
  }, [className, date, studentCode, pin]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    try {
      const res = await fetch(import.meta.env.VITE_CHECKIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          className,
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
        <div><b>Class:</b> {className || "-"}</div>
        <div><b>Date:</b> {date || "-"}</div>
      </div>

      {(!className || !date) && (
        <div style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8, marginBottom: 12 }}>
          Missing className/date in QR link. Ask your teacher to show the QR again.
        </div>
      )}

      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <input
          placeholder="Student code (or email)"
          value={studentCode}
          onChange={(e) => setStudentCode(e.target.value)}
        />
        <input
          placeholder="Secret PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />

        <button disabled={!canSubmit || busy}>
          {busy ? "Submitting..." : "Mark me present"}
        </button>

        {msg && <div style={{ marginTop: 6 }}>{msg}</div>}
      </form>
    </div>
  );
}
