import test from "node:test";
import assert from "node:assert/strict";

import { buildCandidateCsvUrls, loadCsvFromCandidateUrls } from "../api/social-metrics.js";

test("buildCandidateCsvUrls includes underscore and spaced aliases for Content_Calendar", () => {
  const urls = buildCandidateCsvUrls({
    sheetName: "Content_Calendar",
    publishedUrl: "https://docs.google.com/spreadsheets/d/abc123/edit",
    preferredIdentifier: "Content_Calendar",
  });

  assert.equal(urls.length, 2);
  assert.ok(urls.some((url) => url.includes("sheet=Content_Calendar")));
  assert.ok(urls.some((url) => url.includes("sheet=Content%20Calendar")));
});

test("loadCsvFromCandidateUrls retries alternate URLs when initial identifier fails", async () => {
  const originalFetch = global.fetch;
  const calls = [];

  global.fetch = async (url) => {
    const requestUrl = String(url);
    calls.push(requestUrl);

    if (requestUrl.includes("Content_Calendar")) {
      return { ok: false, status: 400 };
    }

    if (requestUrl.includes("Content%20Calendar")) {
      return {
        ok: true,
        text: async () => "Scheduled Date,Status\n2026-03-10,Planned\n",
      };
    }

    throw new Error(`Unexpected URL: ${requestUrl}`);
  };

  try {
    const text = await loadCsvFromCandidateUrls({
      sheetName: "Content_Calendar",
      candidateCsvUrls: [
        "https://docs.google.com/spreadsheets/d/abc123/export?format=csv&sheet=Content_Calendar",
        "https://docs.google.com/spreadsheets/d/abc123/export?format=csv&sheet=Content%20Calendar",
      ],
    });

    assert.ok(text.includes("Planned"));
    assert.equal(calls.length, 2);
  } finally {
    global.fetch = originalFetch;
  }
});
