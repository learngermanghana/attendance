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

  if (ANNOUNCEMENT_WEBHOOK_URL) {
    try {
      await postAnnouncementToWebhook(payload);
    } catch (error) {
      if (!isLikelyNetworkError(error)) {
        throw error;
      }

      await postAnnouncementToWebhookNoCors(payload);
    }
  }

  if (SAVE_ANNOUNCEMENTS_TO_FIRESTORE) {
    await addDoc(collection(db, "announcements"), {
      ...row,
      createdAt: new Date().toISOString(),
    });
  }

  return row;
}
