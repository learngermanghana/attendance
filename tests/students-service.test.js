import test from "node:test";
import assert from "node:assert/strict";

import { listPublishedStudentsByClassWithLoader } from "../src/services/studentsService.js";

test("matches by full className when present", async () => {
  const rows = [
    { classname: "A2 Stuttgart Klasse", level: "A2", status: "Active", studentcode: "S-001", name: "Student One" },
    { classname: "A2 Berlin Klasse", level: "A2", status: "Active", studentcode: "S-002", name: "Student Two" },
  ];

  const result = await listPublishedStudentsByClassWithLoader("A2 Stuttgart Klasse", async () => rows);

  assert.deepEqual(result.map((s) => s.name), ["Student One"]);
});

test("falls back to level matching when no exact class match exists", async () => {
  const rows = [
    { classname: "", level: "A2", status: "Active", studentcode: "S-001", name: "Student One" },
    { classname: "", level: "B1", status: "Active", studentcode: "S-002", name: "Student Two" },
  ];

  const result = await listPublishedStudentsByClassWithLoader("A2 Stuttgart Klasse", async () => rows);

  assert.deepEqual(result.map((s) => s.name), ["Student One"]);
});

test("normalizes spacing in class name matching", async () => {
  const rows = [
    { classname: "A2   Stuttgart   Klasse", level: "A2", status: "Active", studentcode: "S-001", name: "Student One" },
  ];

  const result = await listPublishedStudentsByClassWithLoader("A2 Stuttgart Klasse", async () => rows);

  assert.equal(result.length, 1);
});


test("includes paid published students for class match", async () => {
  const rows = [
    { classname: "A2 Stuttgart Klasse", level: "A2", status: "Paid", studentcode: "S-003", name: "Paid Student" },
    { classname: "A2 Stuttgart Klasse", level: "A2", status: "Inactive", studentcode: "S-004", name: "Inactive Student" },
  ];

  const result = await listPublishedStudentsByClassWithLoader("A2 Stuttgart Klasse", async () => rows);

  assert.deepEqual(result.map((s) => s.name), ["Paid Student"]);
});


test("includes published students with missing status for class match", async () => {
  const rows = [
    { classname: "A2 Stuttgart Klasse", level: "A2", status: "", studentcode: "S-005", name: "No Status Student" },
    { classname: "A2 Stuttgart Klasse", level: "A2", status: "Inactive", studentcode: "S-006", name: "Inactive Student" },
  ];

  const result = await listPublishedStudentsByClassWithLoader("A2 Stuttgart Klasse", async () => rows);

  assert.deepEqual(result.map((s) => s.name), ["No Status Student"]);
});
