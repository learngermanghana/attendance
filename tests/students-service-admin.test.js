import test from "node:test";
import assert from "node:assert/strict";

import { listAllStudentsWithFirestore, updateStudentByIdWithFirestore } from "../src/services/studentsService.js";

test("listAllStudentsWithFirestore returns sorted student records", async () => {
  const firestore = {
    db: {},
    collection: (...args) => args,
    getDocs: async () => ({
      docs: [
        { id: "2", data: () => ({ name: "Zara" }) },
        { id: "1", data: () => ({ name: "Alex" }) },
      ],
    }),
  };

  const result = await listAllStudentsWithFirestore(firestore);

  assert.deepEqual(result.map((row) => row.name), ["Alex", "Zara"]);
  assert.deepEqual(result.map((row) => row.id), ["1", "2"]);
});

test("updateStudentByIdWithFirestore writes payload to the students collection", async () => {
  const calls = [];
  const firestore = {
    db: {},
    doc: (...args) => ({ args }),
    updateDoc: async (ref, payload) => {
      calls.push({ ref, payload });
    },
  };

  await updateStudentByIdWithFirestore("student-1", { status: "active" }, firestore);

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].ref.args, [{}, "students", "student-1"]);
  assert.deepEqual(calls[0].payload, { status: "active" });
});

test("updateStudentByIdWithFirestore rejects empty student IDs", async () => {
  await assert.rejects(() => updateStudentByIdWithFirestore("", {}, { doc: () => null, updateDoc: async () => null, db: {} }), /Student ID is required/);
});
