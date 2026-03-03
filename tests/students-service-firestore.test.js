import test from "node:test";
import assert from "node:assert/strict";

import { loadStudentsByFieldWithFirestore } from "../src/services/studentsService.js";

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

test("includes students regardless of status", async () => {
  const firestore = createFirestoreMock([
    { name: "Angiella", status: "active", className: "A2 Stuttgart Klasse" },
    { name: "Inactive", status: "inactive", className: "A2 Stuttgart Klasse" },
  ]);

  const result = await loadStudentsByFieldWithFirestore("className", "A2 Stuttgart Klasse", firestore);

  assert.deepEqual(result.map((student) => student.name), ["Angiella", "Inactive"]);
});

test("includes records regardless of role", async () => {
  const firestore = createFirestoreMock([
    { name: "Teacher", status: "active", role: "teacher", className: "A2 Stuttgart Klasse" },
    { name: "Student", status: "active", role: "student", className: "A2 Stuttgart Klasse" },
  ]);

  const result = await loadStudentsByFieldWithFirestore("className", "A2 Stuttgart Klasse", firestore);

  assert.deepEqual(result.map((student) => student.name), ["Student", "Teacher"]);
});
