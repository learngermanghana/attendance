const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_REMINDERS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/12NXf5FeVHr7JJT47mRHh7Jp-TC1yhPS7ZG6nzZVTt1U/export?format=csv";

const REMINDERS_CSV_URL = import.meta?.env?.VITE_WHATSAPP_REMINDERS_SHEET_CSV_URL || DEFAULT_REMINDERS_CSV_URL;

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function parseCsv(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map(parseCsvLine);
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function parseBalance(value) {
  const numericValue = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(numericValue)) return 0;
  return numericValue;
}

function daysBetween(from, to) {
  const fromDay = new Date(from);
  const toDay = new Date(to);
  fromDay.setHours(0, 0, 0, 0);
  toDay.setHours(0, 0, 0, 0);
  return Math.ceil((toDay - fromDay) / DAY_MS);
}

function readPaidStatus(row) {
  return String(row.paid || "").trim().toLowerCase();
}

function shouldSendUnpaidReminder(row) {
  const balance = parseBalance(row.balance);
  const paidStatus = readPaidStatus(row);
  if (balance <= 0) return false;
  if (["yes", "y", "paid", "true", "1"].includes(paidStatus)) return false;
  return true;
}

function buildReminderRow(row, today) {
  const contractStart = parseDate(row.contractstart);
  const contractEnd = parseDate(row.contractend);
  const paymentDueDate = contractStart ? new Date(contractStart.getTime() + 30 * DAY_MS) : null;

  return {
    name: row.name || "Unknown",
    phone: row.phone || "",
    location: row.location || "",
    className: row.classname || "",
    level: row.level || "",
    paid: row.paid || "",
    balance: parseBalance(row.balance),
    contractStart,
    contractEnd,
    paymentDueDate,
    daysUntilPaymentDue: paymentDueDate ? daysBetween(today, paymentDueDate) : null,
    daysUntilContractEnd: contractEnd ? daysBetween(today, contractEnd) : null,
  };
}

function buildWhatsAppMessage(student) {
  const daysLeftText =
    student.daysUntilPaymentDue == null
      ? "N/A"
      : student.daysUntilPaymentDue >= 0
        ? `${student.daysUntilPaymentDue} day(s)`
        : `${Math.abs(student.daysUntilPaymentDue)} day(s) overdue`;

  return `Hi ${student.name}, this is a reminder that your outstanding balance is ${student.balance}. Payment is due within 30 days from contract start (${daysLeftText} remaining). When convenient, please arrange payment at your earliest opportunity. Thank you.`;
}

export async function loadWhatsappReminderDashboard() {
  const res = await fetch(REMINDERS_CSV_URL);
  if (!res.ok) {
    throw new Error("Failed to load WhatsApp reminders sheet");
  }

  const csv = await res.text();
  const rows = parseCsv(csv);
  if (rows.length === 0) {
    return { unpaidStudents: [], contractEndingSoon: [] };
  }

  const [rawHeaders, ...dataRows] = rows;
  const headers = rawHeaders.map(normalizeHeader);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mappedRows = dataRows.map((rawRow) => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = String(rawRow[index] || "").trim();
    });
    return buildReminderRow(entry, today);
  });

  const unpaidStudents = mappedRows
    .filter((row) => shouldSendUnpaidReminder(row))
    .map((student) => ({
      ...student,
      whatsappMessage: buildWhatsAppMessage(student),
    }))
    .sort((a, b) => {
      if (a.daysUntilPaymentDue == null) return 1;
      if (b.daysUntilPaymentDue == null) return -1;
      return a.daysUntilPaymentDue - b.daysUntilPaymentDue;
    });

  const contractEndingSoon = mappedRows
    .filter((row) => row.daysUntilContractEnd != null && row.daysUntilContractEnd >= 0 && row.daysUntilContractEnd <= 10)
    .sort((a, b) => a.daysUntilContractEnd - b.daysUntilContractEnd);

  return {
    unpaidStudents,
    contractEndingSoon,
  };
}

export function formatDate(dateValue) {
  if (!dateValue) return "-";
  return dateValue.toLocaleDateString();
}
