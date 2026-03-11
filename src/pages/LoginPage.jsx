import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { isStaffEmail, STAFF_ACCOUNT_PASSWORD } from "../utils/authRoles";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      await login(normalizedEmail, password);
      nav(isStaffEmail(normalizedEmail) ? "/social-post-tracker" : "/");
    } catch (e2) {
      const canProvisionStaffAccount =
        isStaffEmail(normalizedEmail) &&
        password === STAFF_ACCOUNT_PASSWORD &&
        e2?.code === "auth/invalid-credential";

      if (canProvisionStaffAccount) {
        try {
          await createUserWithEmailAndPassword(auth, normalizedEmail, password);
          nav("/social-post-tracker");
          return;
        } catch (createError) {
          if (createError?.code !== "auth/email-already-in-use") {
            setErr(createError?.message || "Login failed");
            return;
          }

          await login(normalizedEmail, password);
          nav("/social-post-tracker");
          return;
        }
      }

      setErr(e2?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h2>Teacher Login</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <div style={{ color: "crimson" }}>{err}</div>}
        <button disabled={busy}>{busy ? "Signing in..." : "Sign In"}</button>
      </form>
    </div>
  );
}
