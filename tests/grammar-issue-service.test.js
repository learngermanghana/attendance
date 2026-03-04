import test from "node:test";
import assert from "node:assert/strict";
import { loadGrammarIssueReports } from "../src/services/grammarIssueService.js";

test("loadGrammarIssueReports sorts reports from newest to oldest", async () => {
  const firestore = {
    db: {},
    collection: () => "ai_issue_reports_ref",
    orderBy: () => "createdAt_desc",
    query: (ref) => ref,
    getDocs: async () => ({
      docs: [
        {
          id: "old",
          data: () => ({ createdAt: { seconds: 1000 }, studentName: "A", issue: "Old issue" }),
        },
        {
          id: "new",
          data: () => ({ createdAt: { seconds: 2000 }, studentName: "B", issue: "New issue" }),
        },
      ],
    }),
  };

  const reports = await loadGrammarIssueReports(firestore);
  assert.deepEqual(reports.map((row) => row.id), ["new", "old"]);
});

test("loadGrammarIssueReports falls back when ordered query fails", async () => {
  let calls = 0;
  const firestore = {
    db: {},
    collection: () => "ai_issue_reports_ref",
    orderBy: () => "createdAt_desc",
    query: (ref) => ref,
    getDocs: async () => {
      calls += 1;
      if (calls === 1) throw new Error("missing index");
      return {
        docs: [
          {
            id: "fallback",
            data: () => ({ reportedAt: "2025-10-11T00:00:00.000Z", studentId: "S1", message: "Fallback load" }),
          },
        ],
      };
    },
  };

  const reports = await loadGrammarIssueReports(firestore);
  assert.equal(calls, 2);
  assert.equal(reports[0].id, "fallback");
  assert.equal(reports[0].createdAt, "2025-10-11T00:00:00.000Z");
});
