import { loadPublishedStudentRows, readPublishedStudentCode, readPublishedStudentName } from "./publishedSheetService.js";

function normalize(value) {
  return String(value || "").trim();
}

function normalizeKey(value) {
  return normalize(value).toLowerCase();
}

function readAny(row, keys) {
  for (const key of keys) {
    const value = normalize(row[key]);
    if (value) return value;
  }
  return "";
}

function parseMoney(value) {
  const cleaned = normalize(value).replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function inferPaymentStatus(row) {
  const explicit = normalizeKey(readAny(row, ["paymentstatus", "payment", "feestatus", "finance"]));
  if (explicit) {
    if (["paid", "paidinfull", "complete", "completed"].includes(explicit)) return "paid";
    if (["partial", "partiallypaid", "partpaid"].includes(explicit)) return "partial";
    if (["unpaid", "overdue", "due"].includes(explicit)) return "unpaid";
  }

  const amountPaid = parseMoney(readAny(row, ["paid", "amountpaid", "paidamount"]));
  const balance = parseMoney(readAny(row, ["balance", "amountdue", "tuition", "fee", "totalfee"]));
  const amountDue = amountPaid + Math.max(balance, 0);

  if (amountDue <= 0 && amountPaid <= 0) return "unknown";
  if (amountPaid >= amountDue && amountDue > 0) return "paid";
  if (amountPaid > 0 && amountPaid < amountDue) return "partial";
  if (amountDue > 0 && amountPaid <= 0) return "unpaid";

  return "unknown";
}

function inferContractStatus(row) {
  const explicit = normalizeKey(readAny(row, ["contractstatus", "contract", "agreementstatus"]));
  if (["signed", "complete", "completed"].includes(explicit)) return "signed";
  if (["pending", "awaiting", "review"].includes(explicit)) return "pending";
  if (["missing", "notstarted", "unsigned"].includes(explicit)) return "missing";

  const startDate = normalize(readAny(row, ["contractstart"]));
  const endDate = normalize(readAny(row, ["contractend"]));
  const enrollmentSent = normalizeKey(readAny(row, ["enrollmentsent"]));

  if (startDate && endDate) return "signed";
  if (startDate || endDate || ["yes", "true", "sent"].includes(enrollmentSent)) return "pending";

  return explicit ? "pending" : "missing";
}

function inferExpenseStatus(row) {
  const explicit = normalizeKey(readAny(row, ["expensestatus", "expenseapproval", "expense"]));
  if (["approved", "reimbursed", "paid"].includes(explicit)) return "approved";
  if (["pending", "submitted", "review"].includes(explicit)) return "pending";

  const expenseAmount = parseMoney(readAny(row, ["dailylimit", "expense", "expenseamount", "cost"]));
  if (expenseAmount > 0) return "approved";

  return explicit ? "pending" : "none";
}

function toAuditRow(row) {
  return {
    studentCode: normalize(readPublishedStudentCode(row)),
    studentName: normalize(readPublishedStudentName(row)) || "Unknown student",
    paymentStatus: inferPaymentStatus(row),
    contractStatus: inferContractStatus(row),
    expenseStatus: inferExpenseStatus(row),
    amountPaid: parseMoney(readAny(row, ["paid", "amountpaid", "paidamount"])),
    amountDue:
      parseMoney(readAny(row, ["paid", "amountpaid", "paidamount"])) +
      Math.max(parseMoney(readAny(row, ["balance", "amountdue", "tuition", "fee", "totalfee"])), 0),
    balance: Math.max(parseMoney(readAny(row, ["balance", "amountdue", "tuition", "fee", "totalfee"])), 0),
    expenseAmount: parseMoney(readAny(row, ["dailylimit", "expense", "expenseamount", "cost"])),
  };
}

export function buildAuditMetrics(rows) {
  const auditRows = rows.map(toAuditRow);

  const finance = {
    totalStudents: auditRows.length,
    paid: auditRows.filter((row) => row.paymentStatus === "paid").length,
    partial: auditRows.filter((row) => row.paymentStatus === "partial").length,
    unpaid: auditRows.filter((row) => row.paymentStatus === "unpaid").length,
    totalDue: auditRows.reduce((sum, row) => sum + row.amountDue, 0),
    totalPaid: auditRows.reduce((sum, row) => sum + row.amountPaid, 0),
  };

  const contracts = {
    signed: auditRows.filter((row) => row.contractStatus === "signed").length,
    pending: auditRows.filter((row) => row.contractStatus === "pending").length,
    missing: auditRows.filter((row) => row.contractStatus === "missing").length,
  };

  const expenses = {
    approved: auditRows.filter((row) => row.expenseStatus === "approved").length,
    pending: auditRows.filter((row) => row.expenseStatus === "pending").length,
    totalExpense: auditRows.reduce((sum, row) => sum + row.expenseAmount, 0),
  };

  return {
    rows: auditRows,
    finance: { ...finance, outstanding: Math.max(finance.totalDue - finance.totalPaid, 0) },
    contracts,
    expenses,
  };
}

export async function loadAuditMetrics() {
  const rows = await loadPublishedStudentRows();
  return buildAuditMetrics(rows);
}
