import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function CheckinPage() {
  const [sp] = useSearchParams();
  const classId = sp.get("classId") || sp.get("className") || "";
  const date = sp.get("date") || "";
  const lesson = sp.get("lesson") || "";
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const validationError = useMemo(() => {
    if (!email.trim()) return "Email is required.";
    if (!phoneNumber.trim()) return "Phone number is required.";
    return "";
  }, [email, phoneNumber]);

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
          email: email.trim(),
          phoneNumber: phoneNumber.trim(),
          lesson,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Check-in failed");
      setMsg("✅ Check-in successful. You are marked present.");
      setEmail("");
      setPhoneNumber("");
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
        <div>
          <b>Lesson:</b> {lesson || "-"}
        </div>
      </div>

      {(!classId || !date) && (
        <div style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8, marginBottom: 12 }}>
          Missing classId/date in QR link. Ask your teacher to show the QR again.
        </div>
      )}

      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
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

        {!canSubmit && classId && date && <div style={{ color: "#a00000", fontSize: 12 }}>{validationError}</div>}

        <button disabled={!canSubmit || busy}>{busy ? "Submitting..." : "Mark me present"}</button>

        {msg && <div style={{ marginTop: 6 }}>{msg}</div>}
      </form>
    </div>
  );
}
