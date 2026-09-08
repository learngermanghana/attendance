const test = require("node:test");
const assert = require("node:assert/strict");

const {
  TRIAL_DURATION_MS,
  expiredPendingReason,
  hasQualifyingPayment,
  isExpiredPendingStudent,
  pendingStartedAtMillis,
} = require("../functions/pendingStudentCleanup.js");

const NOW = Date.UTC(2026, 8, 8, 12, 0, 0);

function pendingStudent(overrides = {}) {
  return {
    id: "student-1",
    role: "student",
    status: "pending",
    paymentStatus: "pending",
    paid: 0,
    createdAt: new Date(NOW - TRIAL_DURATION_MS),
    ...overrides,
  };
}

test("pending student remains eligible during the seven-day trial", () => {
  const student = pendingStudent({ createdAt: new Date(NOW - TRIAL_DURATION_MS + 60_000) });
  assert.equal(expiredPendingReason(student, NOW), "trial_active");
  assert.equal(isExpiredPendingStudent(student, NOW), false);
});

test("unpaid pending student expires at seven days", () => {
  const student = pendingStudent();
  assert.equal(expiredPendingReason(student, NOW), "expired");
  assert.equal(isExpiredPendingStudent(student, NOW), true);
});

test("paid pending student is never selected for deletion", () => {
  const student = pendingStudent({ paymentStatus: "Paid", paid: 2800 });
  assert.equal(hasQualifyingPayment(student), true);
  assert.equal(expiredPendingReason(student, NOW), "has_payment");
  assert.equal(isExpiredPendingStudent(student, NOW), false);
});

test("partially paid pending student is never selected for deletion", () => {
  const student = pendingStudent({ paymentStatus: "Partially Paid", paid: 300 });
  assert.equal(hasQualifyingPayment(student), true);
  assert.equal(isExpiredPendingStudent(student, NOW), false);
});

test("positive paid amount protects student even if payment status has not synced", () => {
  const student = pendingStudent({ paymentStatus: "pending", amountPaid: "15.00" });
  assert.equal(hasQualifyingPayment(student), true);
  assert.equal(isExpiredPendingStudent(student, NOW), false);
});

test("missing registration date is skipped rather than guessed", () => {
  const student = pendingStudent({
    createdAt: null,
    registrationDate: null,
    registeredAt: null,
    trialStartedAt: null,
  });
  assert.equal(pendingStartedAtMillis(student), 0);
  assert.equal(expiredPendingReason(student, NOW), "missing_start_date");
  assert.equal(isExpiredPendingStudent(student, NOW), false);
});

test("only pending enrollment status can be deleted by this cleanup", () => {
  assert.equal(isExpiredPendingStudent(pendingStudent({ status: "active" }), NOW), false);
  assert.equal(isExpiredPendingStudent(pendingStudent({ status: "inactive" }), NOW), false);
  assert.equal(isExpiredPendingStudent(pendingStudent({ status: "Paid" }), NOW), false);
});
