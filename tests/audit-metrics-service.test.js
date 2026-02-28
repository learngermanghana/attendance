import test from "node:test";
import assert from "node:assert/strict";

import { buildAuditMetrics } from "../src/services/auditMetricsService.js";

test("buildAuditMetrics uses provided sheet headers for paid, balance and contracts", () => {
  const metrics = buildAuditMetrics([
    {
      name: "Ama Mensah",
      studentcode: "STU-001",
      paid: "2000",
      balance: "0",
      contractstart: "2026-01-01",
      contractend: "2026-12-31",
      dailylimit: "35",
    },
    {
      name: "Kwame Boateng",
      studentcode: "STU-002",
      paid: "1200",
      balance: "800",
      contractstart: "2026-01-01",
      enrollmentsent: "yes",
      dailylimit: "0",
    },
    {
      name: "Esi Addo",
      studentcode: "STU-003",
      paid: "0",
      balance: "1500",
      dailylimit: "15",
    },
  ]);

  assert.equal(metrics.finance.totalStudents, 3);
  assert.equal(metrics.finance.paid, 1);
  assert.equal(metrics.finance.partial, 1);
  assert.equal(metrics.finance.unpaid, 1);
  assert.equal(metrics.finance.totalPaid, 3200);
  assert.equal(metrics.finance.outstanding, 2300);

  assert.equal(metrics.contracts.signed, 1);
  assert.equal(metrics.contracts.pending, 1);
  assert.equal(metrics.contracts.missing, 1);

  assert.equal(metrics.expenses.approved, 2);
  assert.equal(metrics.expenses.pending, 0);
  assert.equal(metrics.expenses.totalExpense, 50);
});
