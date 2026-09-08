import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase.js";
import { deleteStudentAccount, updateStudentById } from "../services/studentsService.js";

const REVIEW_LINK = "https://g.page/r/Cdogveq3Hy69EBM/review";

function displayValue(...values) {
  return values.map((value) => String(value ?? "").trim()).find(Boolean) || "";
}

function normalizeDateValue(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const asDate = new Date(raw);
  if (Number.isNaN(asDate.getTime())) return raw;
  const year = asDate.getUTCFullYear();
  const month = String(asDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(asDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  const normalized = normalizeDateValue(value);
  if (!normalized) return "Not set";
  const date = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return normalized;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(value) {
  const normalized = normalizeDateValue(value);
  if (!normalized) return null;
  const target = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function normalizePhoneForWhatsapp(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("233")) return digits;
  if (digits.startsWith("0")) return `233${digits.slice(1)}`;
  if (digits.length === 9) return `233${digits}`;
  return digits;
}

function whatsappUrl(phone, message) {
  const normalizedPhone = normalizePhoneForWhatsapp(phone);
  if (!normalizedPhone) return "";
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

function resolveStudentCode(student, draft = {}) {
  return displayValue(draft.studentCode, student?.studentCode, student?.studentcode, student?.id);
}

function resolveStudentName(student) {
  return displayValue(student?.name, student?.displayName, student?.fullName, student?.email, student?.id) || "Student";
}

function resolveStudentPhone(student, draft = {}) {
  return displayValue(draft.phone, student?.phone, student?.whatsapp, student?.phoneNumber, student?.guardianPhone);
}

function resolveStudentClass(student, draft = {}) {
  return displayValue(draft.className, draft.level, draft.program, student?.className, student?.level, student?.program, student?.location) || "your German class";
}

function parseMoney(value) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatGhs(value) {
  const amount = parseMoney(value);
  return `GHS ${amount.toLocaleString("en-GH", { maximumFractionDigits: 2 })}`;
}

function buildPaymentReminderMessage(student, draft = {}) {
  const name = resolveStudentName(student);
  const className = resolveStudentClass(student, draft);
  const balance = displayValue(draft.balanceDue, student?.balanceDue, student?.balance, student?.outstandingBalance, student?.amountDue);
  const balanceText = parseMoney(balance) > 0 ? formatGhs(balance) : "your outstanding balance";
  return `Hello ${name}, this is a reminder from Learn Language Education Academy / Falowen. Your ${className} record shows a balance of ${balanceText}. Kindly make payment early so your learning can continue smoothly. Please update us after payment. Thank you.`;
}

function buildReviewRequestMessage(student) {
  const name = resolveStudentName(student);
  return `Hello ${name}, thank you for learning with Learn Language Education Academy / Falowen. Please share a review about your course, the school, and the app here: ${REVIEW_LINK}. Your feedback helps us improve and helps other students find us. Thank you.`;
}

export default function StudentSupportTools({ student, draft = {}, onStudentDeleted, onStudentUpdated, pushToast }) {
  const [busyAction, setBusyAction] = useState("");

  if (!student) return null;

  const studentName = resolveStudentName(student);
  const studentCode = resolveStudentCode(student, draft);
  const email = displayValue(draft.email, student?.email);
  const phone = resolveStudentPhone(student, draft);
  const contractEnd = displayValue(draft.contractEnd, student?.contractEnd);
  const contractDaysLeft = daysUntil(contractEnd);
  const paymentStatus = displayValue(draft.paymentStatus, student?.paymentStatus) || "Not set";
  const balanceDue = displayValue(draft.balanceDue, student?.balanceDue, student?.balance) || "Not set";

  const notify = (type, message) => {
    if (typeof pushToast === "function") pushToast({ type, message });
  };

  const runAction = async (key, handler) => {
    setBusyAction(key);
    try {
      await handler();
    } catch (error) {
      notify("error", error?.message || "The requested student action failed.");
    } finally {
      setBusyAction("");
    }
  };

  const updateStudent = async (payload, successMessage) => {
    await updateStudentById(student.id, payload);
    onStudentUpdated?.(student.id, payload);
    notify("success", successMessage);
  };

  const resetPassword = () =>
    runAction("reset", async () => {
      if (!email) {
        notify("error", "This student has no email address for password reset.");
        return;
      }
      if (!auth) {
        notify("error", "Firebase Auth is not configured in this admin app.");
        return;
      }
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      notify("success", `Password reset email sent to ${email}.`);
    });

  const reactivateAccount = () =>
    runAction("reactivate", async () => {
      const cleanedStatus = window.confirm("Reactivate this student account and set status to Enrolled?") ? "Enrolled" : "";
      if (!cleanedStatus) return;
      await updateStudent({ status: cleanedStatus }, `Account status updated to ${cleanedStatus}.`);
    });

  const openWhatsappWithMessage = (message, missingPhoneMessage) => {
    const url = whatsappUrl(phone, message);
    if (!url) {
      notify("error", missingPhoneMessage || "This student has no valid WhatsApp/phone number.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const sendPaymentReminder = () => {
    openWhatsappWithMessage(buildPaymentReminderMessage(student, draft));
  };

  const sendReviewLink = () => {
    openWhatsappWithMessage(buildReviewRequestMessage(student), "This student has no valid WhatsApp/phone number for the review link.");
  };

  const deleteAccount = () =>
    runAction("delete", async () => {
      const typed = window.prompt(
        `ADMIN OVERRIDE: permanently delete ${studentName}'s Falowen account even if an active contract exists. This deletes submissions, scores, notifications, attendance check-ins, and linked Google Sheet rows where configured. Type DELETE to continue.`,
      );
      if (typed !== "DELETE") {
        notify("info", "Student account deletion cancelled.");
        return;
      }

      const result = await deleteStudentAccount({ ...student, ...draft, id: student.id });
      onStudentDeleted?.(student.id, result);
      const warningCount = Array.isArray(result?.firestore?.warnings) ? result.firestore.warnings.length : 0;
      const sheetMessage = result?.sheet?.attempted
        ? (result.sheet.success ? " Google Sheet cleanup completed." : ` Google Sheet cleanup needs attention: ${result.sheet.message || "failed"}.`)
        : " Google Sheet cleanup was skipped because the webhook is not configured.";
      const warningMessage = warningCount ? ` ${warningCount} additional cleanup warning(s) were recorded.` : "";
      notify(
        "success",
        `Deleted ${studentName}'s student account and ${result?.firestore?.deleted || 0} Firestore record(s).${sheetMessage}${warningMessage}`,
      );
    });

  return (
    <section
      style={{
        marginTop: 18,
        border: "1px solid #bae6fd",
        borderRadius: 14,
        padding: 14,
        background: "linear-gradient(135deg, #f0f9ff, #ffffff)",
        display: "grid",
        gap: 12,
      }}
    >
      <div>
        <h3 style={{ margin: "0 0 4px" }}>Student support</h3>
        <p style={{ margin: 0, color: "#64748b" }}>
          Main actions only: password, account status, payment reminder, review link, and permanent account deletion. Contract status never blocks an admin deletion.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
        <button type="button" onClick={resetPassword} disabled={busyAction === "reset"}>
          {busyAction === "reset" ? "Sending..." : "Reset password"}
        </button>
        <button type="button" onClick={reactivateAccount} disabled={busyAction === "reactivate"}>
          Reactivate account
        </button>
        <button type="button" onClick={sendPaymentReminder}>
          Payment reminder
        </button>
        <button type="button" onClick={sendReviewLink}>
          Review link
        </button>
        <button
          type="button"
          onClick={deleteAccount}
          disabled={busyAction === "delete"}
          style={{ background: "#dc2626", borderColor: "#b91c1c" }}
          title="Admin override: permanently delete even with an active contract"
        >
          {busyAction === "delete" ? "Deleting..." : "Delete account (override)"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 10, background: "#fff" }}>
          <strong>{studentName}</strong>
          <div style={{ color: "#64748b", fontSize: 13 }}>{studentCode || "No student code"}</div>
        </div>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 10, background: "#fff" }}>
          <strong>Contract</strong>
          <div style={{ color: "#64748b", fontSize: 13 }}>
            Ends: {formatDate(contractEnd)} {contractDaysLeft === null ? "" : `(${contractDaysLeft} day(s) left)`}
          </div>
        </div>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 10, background: "#fff" }}>
          <strong>Payment</strong>
          <div style={{ color: "#64748b", fontSize: 13 }}>{paymentStatus} · Balance: {balanceDue}</div>
        </div>
      </div>
    </section>
  );
}