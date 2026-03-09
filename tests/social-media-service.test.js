import test from "node:test";
import assert from "node:assert/strict";

import { buildCsvUrl, buildSocialMetrics, parsePublishedTabs, toRows } from "../src/services/socialMediaService.js";

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

test("buildCsvUrl converts pubhtml url into tab-specific csv export url", () => {
  const csvUrl = buildCsvUrl("https://docs.google.com/spreadsheets/d/e/id/pubhtml", "987654321");
  assert.equal(
    csvUrl,
    "https://docs.google.com/spreadsheets/d/e/id/pub?gid=987654321&single=true&output=csv",
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
