import test from "node:test";
import assert from "node:assert/strict";

import { buildAuditMetrics } from "../src/services/auditMetricsService.js";

test("buildAuditMetrics uses provided sheet headers for paid, balance and contracts", () => {
  const today = new Date();
  const format = (date) => date.toISOString().slice(0, 10);
  const in10Days = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000);
  const in120Days = new Date(today.getTime() + 120 * 24 * 60 * 60 * 1000);
  const tenDaysAgo = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000);

  const metrics = buildAuditMetrics([
    {
      name: "Ama Mensah",
      studentcode: "STU-001",
      paid: "2000",
      balance: "0",
      contractstart: format(today),
      contractend: format(in10Days),
      dailylimit: "35",
    },
    {
      name: "Kwame Boateng",
      studentcode: "STU-002",
      paid: "1200",
      balance: "800",
      contractstart: format(today),
      enrollmentsent: "yes",
      dailylimit: "0",
    },
    {
      name: "Esi Addo",
      studentcode: "STU-003",
      paid: "0",
      balance: "1500",
      contractstart: format(today),
      contractend: format(tenDaysAgo),
      dailylimit: "15",
    },
    {
      name: "Kofi Armah",
      studentcode: "STU-004",
      paid: "0",
      balance: "0",
      contractstart: format(today),
      contractend: format(in120Days),
      dailylimit: "0",
    },
    {
      name: "Naa Odoi",
      studentcode: "STU-005",
      paid: "0",
      balance: "0",
      dailylimit: "0",
    },
  ]);

  assert.equal(metrics.finance.totalStudents, 5);
  assert.equal(metrics.finance.paid, 1);
  assert.equal(metrics.finance.partial, 1);
  assert.equal(metrics.finance.unpaid, 1);
  assert.equal(metrics.finance.totalPaid, 3200);
  assert.equal(metrics.finance.outstanding, 2300);

  assert.equal(metrics.contracts.signed, 3);
  assert.equal(metrics.contracts.pending, 1);
  assert.equal(metrics.contracts.missing, 1);
  assert.equal(metrics.contracts.withDates, 3);
  assert.equal(metrics.contracts.endingIn30Days, 1);
  assert.equal(metrics.contracts.expired, 1);

  assert.equal(metrics.expenses.approved, 2);
  assert.equal(metrics.expenses.pending, 0);
  assert.equal(metrics.expenses.totalExpense, 50);
});
