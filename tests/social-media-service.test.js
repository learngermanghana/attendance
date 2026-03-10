import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCsvUrl,
  buildSocialMetrics,
  loadPostTrackerRows,
  parsePublishedTabs,
  toRows,
} from "../src/services/socialMediaService.js";

test("parsePublishedTabs reads tab names and gids from published sheet html", () => {
  const html = `
    <a href="/spreadsheets/d/e/abc/pubhtml?gid=111111&single=true">Post_Tracker</a>
    <a href="/spreadsheets/d/e/abc/pubhtml?gid=222222&single=true">Followers_Growth</a>
    <a href="/spreadsheets/d/e/abc/pubhtml?gid=333333&single=true">Content_Calendar</a>
  `;

  const tabs = parsePublishedTabs(html);

  assert.equal(tabs.length, 3);
  assert.deepEqual(tabs[0], {
    href: "/spreadsheets/d/e/abc/pubhtml?gid=111111&single=true",
    gid: "111111",
    name: "Post_Tracker",
  });
});

test("parsePublishedTabs supports anchor labels wrapped in nested markup", () => {
  const html = `
    <a class="docs-sheet-link" href="/spreadsheets/d/e/abc/pubhtml?gid=444444&single=true"><span>Post_Tracker</span></a>
    <a class="docs-sheet-link" href="/spreadsheets/d/e/abc/pubhtml?gid=555555&single=true"><span>Followers_Growth</span></a>
    <a class="docs-sheet-link" href="/spreadsheets/d/e/abc/pubhtml?gid=666666&single=true"><span>Content_Calendar</span></a>
  `;

  const tabs = parsePublishedTabs(html);

  assert.equal(tabs.length, 3);
  assert.deepEqual(
    tabs.map((tab) => tab.name),
    ["Post_Tracker", "Followers_Growth", "Content_Calendar"],
  );
});



test("parsePublishedTabs reads tab names from aria-label when anchor text is empty", () => {
  const html = `
    <a class="docs-sheet-link" aria-label="Post_Tracker" href="/spreadsheets/d/e/abc/pubhtml?gid=777777&single=true"></a>
    <a class="docs-sheet-link" aria-label="Followers_Growth" href="/spreadsheets/d/e/abc/pubhtml?gid=888888&single=true"></a>
    <a class="docs-sheet-link" aria-label="Content_Calendar" href="/spreadsheets/d/e/abc/pubhtml?gid=999999&single=true"></a>
  `;

  const tabs = parsePublishedTabs(html);

  assert.equal(tabs.length, 3);
  assert.deepEqual(
    tabs.map((tab) => tab.name),
    ["Post_Tracker", "Followers_Growth", "Content_Calendar"],
  );
});

test("buildCsvUrl converts pubhtml url into tab-specific csv export url", () => {
  const csvUrl = buildCsvUrl("https://docs.google.com/spreadsheets/d/e/id/pubhtml", "987654321");
  assert.equal(
    csvUrl,
    "https://docs.google.com/spreadsheets/d/e/id/pub?gid=987654321&single=true&output=csv",
  );
});

test("buildCsvUrl builds sheet-name export urls for standard Google Sheets edit links", () => {
  const csvUrl = buildCsvUrl(
    "https://docs.google.com/spreadsheets/d/1BxKGkGCWynv7jr1oze0MjfkM2SuQmohAQZtoIfV6jDk/edit",
    "Post_Tracker",
  );

  assert.equal(
    csvUrl,
    "https://docs.google.com/spreadsheets/d/1BxKGkGCWynv7jr1oze0MjfkM2SuQmohAQZtoIfV6jDk/export?format=csv&sheet=Post_Tracker",
  );
});

test("toRows maps csv headers and values to record objects", () => {
  const rows = toRows("Date,Brand,Platform\n2026-01-12,Falowen,Instagram\n");

  assert.equal(rows.length, 1);
  assert.equal(rows[0].date, "2026-01-12");
  assert.equal(rows[0].brand, "Falowen");
  assert.equal(rows[0].platform, "Instagram");
});

test("buildSocialMetrics returns recent posts, platform snapshots and upcoming content", () => {
  const metrics = buildSocialMetrics({
    postTrackerRows: [
      { date: "2026-01-12", brand: "Falowen", platform: "Instagram", topic: "Topic 1" },
      { date: "2026-01-14", brand: "Falowen", platform: "LinkedIn", topic: "Topic 2" },
    ],
    followerGrowthRows: [
      { date: "2026-01-10", platform: "Instagram", followers: "1000" },
      { date: "2026-01-15", platform: "Instagram", followers: "1025" },
      { date: "2026-01-11", platform: "LinkedIn", followers: "500" },
    ],
    contentCalendarRows: [
      { scheduleddate: "2026-01-20", platform: "Instagram", status: "Planned", contenttype: "Vocabulary" },
      { scheduleddate: "2026-01-19", platform: "Facebook", status: "Scheduled", contenttype: "Motivation" },
      { scheduleddate: "2026-01-18", platform: "TikTok", status: "Done", contenttype: "Video" },
    ],
  });

  assert.equal(metrics.totalPosts, 2);
  assert.equal(metrics.totalFollowerSnapshots, 3);
  assert.equal(metrics.totalCalendarItems, 3);
  assert.equal(metrics.recentPosts[0].topic, "Topic 2");
  assert.equal(metrics.latestSnapshotByPlatform.length, 2);
  assert.equal(metrics.upcomingContent.length, 2);
});

test("loadSocialMediaData falls back to direct sheet fetch when api route is unavailable", async () => {
  const { loadSocialMediaData } = await import("../src/services/socialMediaService.js");

  const originalFetch = global.fetch;
  let call = 0;

  global.fetch = async (url) => {
    call += 1;

    if (call === 1) {
      throw new TypeError("NetworkError when attempting to fetch resource");
    }

    const requestUrl = String(url);
    if (requestUrl.includes("Post_Tracker") || requestUrl.includes("gid=184774716")) {
      return { ok: true, text: async () => "Date,Topic\n2026-01-01,Welcome\n" };
    }

    if (requestUrl.includes("Followers_Growth")) {
      return { ok: true, text: async () => "Date,Platform,Followers\n2026-01-01,Instagram,100\n" };
    }

    if (requestUrl.includes("Content_Calendar")) {
      return { ok: true, text: async () => "Scheduled Date,Status\n2026-01-10,Planned\n" };
    }

    throw new Error(`Unexpected URL: ${requestUrl}`);
  };

  try {
    const data = await loadSocialMediaData();

    assert.equal(data.postTrackerRows.length, 1);
    assert.equal(data.followerGrowthRows.length, 1);
    assert.equal(data.contentCalendarRows.length, 1);
    assert.equal(data.metrics.totalPosts, 1);
  } finally {
    global.fetch = originalFetch;
  }
});


test("loadPostTrackerRows fetches Post_Tracker only", async () => {
  const originalFetch = global.fetch;
  let capturedUrl = "";

  global.fetch = async (url) => {
    capturedUrl = String(url);
    return {
      ok: true,
      text: async () => "Date,Brand,Platform\n3/9/2026 14:06:16,Falowen,Instagram\n",
    };
  };

  try {
    const rows = await loadPostTrackerRows();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].brand, "Falowen");
    assert.ok(capturedUrl.includes("Post_Tracker") || capturedUrl.includes("gid="));
  } finally {
    global.fetch = originalFetch;
  }
});
