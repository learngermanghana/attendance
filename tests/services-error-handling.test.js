import test from "node:test";
import assert from "node:assert/strict";

import { resolveWithSheetFallback, resolveWithSheetThenFirestore } from "../src/services/fallbackResolvers.js";

test("resolveWithSheetFallback returns fallback data when sheet loader throws", async () => {
  const calls = [];

  const result = await resolveWithSheetFallback({
    loadFromSheet: async () => {
      throw new Error("sheet unavailable");
    },
    loadFromFallbackFields: async (field) => {
      calls.push(field);
      return field === "classId" ? [{ id: "student-1" }] : [];
    },
    fallbackFields: ["classId", "className"],
  });

  assert.deepEqual(result, [{ id: "student-1" }]);
  assert.deepEqual(calls, ["classId"]);
});

test("resolveWithSheetThenFirestore returns firestore data when sheet loader throws", async () => {
  let called = false;

  const result = await resolveWithSheetThenFirestore({
    loadFromSheet: async () => {
      throw new Error("sheet unavailable");
    },
    loadFromFirestore: async () => {
      called = true;
      return [{ classId: "A", name: "Class A" }];
    },
  });

  assert.equal(called, true);
  assert.deepEqual(result, [{ classId: "A", name: "Class A" }]);
});
