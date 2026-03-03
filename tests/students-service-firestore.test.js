import test from "node:test";
import assert from "node:assert/strict";

import { listStudentsByClassWithDeps, loadStudentsByFieldWithFirestore } from "../src/services/studentsService.js";

function createFirestoreMock(records) {
  return {
    db: {},
    collection: (...args) => args,
    where: (...args) => args,
    query: (...args) => args,
    getDocs: async () => ({
      docs: records.map((record, index) => ({
        id: `id-${index}`,
        data: () => record,
      })),
    }),
  };
}

test("includes active students when role field is missing", async () => {
  const firestore = createFirestoreMock([
    { name: "Angiella", status: "active", className: "A2 Stuttgart Klasse" },
    { name: "Inactive", status: "inactive", className: "A2 Stuttgart Klasse" },
  ]);

  const result = await loadStudentsByFieldWithFirestore("className", "A2 Stuttgart Klasse", firestore);

  assert.deepEqual(result.map((student) => student.name), ["Angiella"]);
});

test("excludes active records with non-student role", async () => {
  const firestore = createFirestoreMock([
    { name: "Teacher", status: "active", role: "teacher", className: "A2 Stuttgart Klasse" },
    { name: "Student", status: "active", role: "student", className: "A2 Stuttgart Klasse" },
  ]);

  const result = await loadStudentsByFieldWithFirestore("className", "A2 Stuttgart Klasse", firestore);

  assert.deepEqual(result.map((student) => student.name), ["Student"]);
});


test("includes paid students when role field is missing", async () => {
  const firestore = createFirestoreMock([
    { name: "Fred", status: "Paid", className: "A2 Stuttgart Klasse" },
    { name: "Inactive", status: "inactive", className: "A2 Stuttgart Klasse" },
  ]);

  const result = await loadStudentsByFieldWithFirestore("className", "A2 Stuttgart Klasse", firestore);

  assert.deepEqual(result.map((student) => student.name), ["Fred"]);
});


test("includes students with missing status when role is missing", async () => {
  const firestore = createFirestoreMock([
    { name: "Vincent", className: "A2 Stuttgart Klasse" },
    { name: "Teacher", role: "teacher", className: "A2 Stuttgart Klasse" },
  ]);

  const result = await loadStudentsByFieldWithFirestore("className", "A2 Stuttgart Klasse", firestore);

  assert.deepEqual(result.map((student) => student.name), ["Vincent"]);
});


test("merges fallback field results so className-only students are included", async () => {
  const result = await listStudentsByClassWithDeps("A2 Stuttgart Klasse", {
    loadPublishedStudentsByClass: async () => [],
    loadStudentsByField: async (field) => {
      if (field === "classId") {
        return [{ id: "s-1", name: "Alpha", status: "active" }];
      }
      if (field === "className") {
        return [{ id: "s-2", name: "Vincent Frimpong", status: "Paid" }];
      }
      return [];
    },
  });

  assert.deepEqual(result.map((student) => student.name), ["Alpha", "Vincent Frimpong"]);
});

test("deduplicates fallback records returned from multiple fields", async () => {
  const result = await listStudentsByClassWithDeps("A2 Stuttgart Klasse", {
    loadPublishedStudentsByClass: async () => [],
    loadStudentsByField: async (field) => {
      if (field === "classId" || field === "className") {
        return [{ id: "same-id", name: "Vincent Frimpong", status: "Paid" }];
      }
      return [];
    },
  });

  assert.deepEqual(result.map((student) => student.name), ["Vincent Frimpong"]);
});
