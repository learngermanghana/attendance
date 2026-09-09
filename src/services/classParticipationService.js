import { auth } from "../firebase.js";

async function authHeaders() {
  const user = auth?.currentUser;
  if (!user) throw new Error("You must be signed in to use class participation.");
  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function parseResponse(response) {
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }
  if (!response.ok || data?.ok === false) {
    const safeText = text && !/^\s*</.test(text) ? text.slice(0, 500) : "";
    const error = new Error(String(data?.error || data?.message || safeText || `Participation request failed (${response.status}).`));
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export async function saveClassParticipationSession(payload = {}) {
  const response = await fetch("/api/class-participation/session", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function getCurrentClassParticipationSession({ classId = "", assignmentId = "", sessionDate = "" } = {}) {
  const query = new URLSearchParams({ classId, assignmentId, sessionDate }).toString();
  const response = await fetch(`/api/class-participation/current?${query}`, {
    method: "GET",
    headers: await authHeaders(),
  });
  return parseResponse(response);
}

export async function listClassParticipationSessions(classId = "") {
  const query = classId ? `?classId=${encodeURIComponent(classId)}` : "";
  const response = await fetch(`/api/class-participation/sessions${query}`, {
    method: "GET",
    headers: await authHeaders(),
  });
  const data = await parseResponse(response);
  return Array.isArray(data?.sessions) ? data.sessions : [];
}

export async function getClassParticipationSession(sessionId = "") {
  const id = String(sessionId || "").trim();
  if (!id) throw new Error("Participation session ID is required.");
  const response = await fetch(`/api/class-participation/session/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: await authHeaders(),
  });
  return parseResponse(response);
}
