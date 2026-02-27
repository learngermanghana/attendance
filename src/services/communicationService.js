import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase.js";

const ANNOUNCEMENT_WEBHOOK_URL = String(import.meta.env.VITE_ANNOUNCEMENT_WEBHOOK_URL || "").trim();
const ANNOUNCEMENT_WEBHOOK_TOKEN = String(import.meta.env.VITE_ANNOUNCEMENT_WEBHOOK_TOKEN || "").trim();
const ANNOUNCEMENT_WEBHOOK_SHEET_NAME = String(import.meta.env.VITE_ANNOUNCEMENT_WEBHOOK_SHEET_NAME || "").trim();
const ANNOUNCEMENT_WEBHOOK_SHEET_GID = String(import.meta.env.VITE_ANNOUNCEMENT_WEBHOOK_SHEET_GID || "").trim();
const SAVE_ANNOUNCEMENTS_TO_FIRESTORE = String(import.meta.env.VITE_ENABLE_ANNOUNCEMENT_FIRESTORE || "false").toLowerCase() === "true";

function normalize(value) {
  return String(value || "").trim();
}

function boolToSheetValue(value) {
  return value ? "TRUE" : "FALSE";
}

function isLikelyNetworkError(error) {
  return error instanceof TypeError || /networkerror|failed to fetch/i.test(String(error?.message || ""));
}

export function buildAnnouncementRow(input = {}) {
  const rowDate = normalize(input.date) || new Date().toISOString().slice(0, 10);

  return {
    announcement: normalize(input.announcement),
    class: normalize(input.className),
    date: rowDate,
    link: normalize(input.link),
    topic: normalize(input.topic),
    email: normalize(input.email),
    attach_certificate: boolToSheetValue(Boolean(input.attachCertificate)),
    cert_level: normalize(input.certLevel),
  };
}

async function postAnnouncementToWebhook(payload) {
  const response = await fetch(ANNOUNCEMENT_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Failed to write announcement to Google Sheets webhook");
  }

  const responseBody = await response.json().catch(() => ({}));
  if (responseBody?.ok === false) {
    throw new Error(responseBody?.error || "Validation failed while saving announcement");
  }
}

async function postAnnouncementToWebhookNoCors(payload) {
  await fetch(ANNOUNCEMENT_WEBHOOK_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify(payload),
  });
}

export async function saveAnnouncementRow(input) {
  const row = buildAnnouncementRow(input);

  const payload = {
    ...(ANNOUNCEMENT_WEBHOOK_TOKEN ? { token: ANNOUNCEMENT_WEBHOOK_TOKEN } : {}),
    ...(ANNOUNCEMENT_WEBHOOK_SHEET_NAME ? { sheet_name: ANNOUNCEMENT_WEBHOOK_SHEET_NAME } : {}),
    ...(ANNOUNCEMENT_WEBHOOK_SHEET_GID ? { sheet_gid: ANNOUNCEMENT_WEBHOOK_SHEET_GID } : {}),
    row,
    rows: [row],
  };

  const receipt = {
    row,
    sheet: {
      attempted: Boolean(ANNOUNCEMENT_WEBHOOK_URL),
      success: !ANNOUNCEMENT_WEBHOOK_URL,
      message: ANNOUNCEMENT_WEBHOOK_URL
        ? "Pending"
        : "Sheet save skipped (webhook not configured).",
      unverified: false,
    },
    firestore: {
      attempted: SAVE_ANNOUNCEMENTS_TO_FIRESTORE,
      success: !SAVE_ANNOUNCEMENTS_TO_FIRESTORE,
      message: SAVE_ANNOUNCEMENTS_TO_FIRESTORE
        ? "Pending"
        : "Firestore mirror skipped (disabled by config).",
    },
  };

  if (ANNOUNCEMENT_WEBHOOK_URL) {
    try {
      await postAnnouncementToWebhook(payload);
      receipt.sheet.success = true;
      receipt.sheet.message = "Saved to Google Sheets.";
    } catch (error) {
      if (!isLikelyNetworkError(error)) {
        receipt.sheet.message = String(error?.message || "Failed to write announcement to Google Sheets webhook");
      } else {
        try {
          await postAnnouncementToWebhookNoCors(payload);
          receipt.sheet.success = true;
          receipt.sheet.unverified = true;
          receipt.sheet.message = "Sheet request sent via no-cors fallback (delivery cannot be confirmed by browser).";
        } catch (fallbackError) {
          receipt.sheet.message = String(fallbackError?.message || error?.message || "Google Sheets save failed.");
        }
      }
    }
  }

  if (SAVE_ANNOUNCEMENTS_TO_FIRESTORE) {
    try {
      await addDoc(collection(db, "announcements"), {
        ...row,
        createdAt: new Date().toISOString(),
      });
      receipt.firestore.success = true;
      receipt.firestore.message = "Saved to Firestore mirror.";
    } catch (error) {
      receipt.firestore.message = String(error?.message || "Firestore mirror save failed.");
    }
  }

  if (!receipt.sheet.success && !receipt.firestore.success) {
    const saveError = new Error(receipt.sheet.message || "Save failed for both Google Sheets and Firestore.");
    saveError.receipt = receipt;
    throw saveError;
  }

  return receipt;
}
