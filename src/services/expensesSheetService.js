const DEFAULT_EXPENSES_SHEET_PUBLISHED_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTN2_HIdCUzRstQR6wxwcCGO5Oz4R0vy3ZdW84hZy49URecQe475EdsEAH_xYiGwpwLtuLkN0VusXgD/pubhtml";

const EXPENSES_PUBLISHED_URL = String(import.meta.env.VITE_EXPENSES_SHEET_PUBLISHED_URL || DEFAULT_EXPENSES_SHEET_PUBLISHED_URL).trim();
const EXPENSES_WEBHOOK_URL = String(import.meta.env.VITE_EXPENSES_WEBHOOK_URL || "").trim();

function normalize(value) {
  return String(value || "").trim();
}

function normalizeHeader(value) {
  return normalize(value).toLowerCase().replace(/\s+/g, "");
}

function toCsvUrl(url) {
  return normalize(url)
    .replace(/\/pubhtml(?:\?.*)?$/i, "/pub?output=csv")
    .replace(/\/pub(?:\?.*)?$/i, "/pub?output=csv");
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
  return String(text || "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map(parseCsvLine);
}

function parseAmount(value) {
  const numeric = Number(String(value || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function isLikelyNetworkError(error) {
  return error instanceof TypeError || /networkerror|failed to fetch/i.test(String(error?.message || ""));
}

export async function loadExpenseRows() {
  const res = await fetch(toCsvUrl(EXPENSES_PUBLISHED_URL));
  if (!res.ok) {
    throw new Error("Failed to load expenses sheet");
  }

  const csv = await res.text();
  const rows = parseCsv(csv);
  if (rows.length === 0) return [];

  const [rawHeaders, ...dataRows] = rows;
  const headers = rawHeaders.map(normalizeHeader);

  return dataRows
    .map((row) => {
      const entry = {};
      headers.forEach((header, index) => {
        entry[header] = normalize(row[index]);
      });

      return {
        type: entry.type || "",
        item: entry.item || "",
        amount: parseAmount(entry.amount),
        date: entry.date || "",
      };
    })
    .filter((entry) => entry.type || entry.item || entry.amount || entry.date);
}

async function postExpenseToWebhook(payload) {
  const response = await fetch(EXPENSES_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Failed to save expense row");
  }

  const responseBody = await response.json().catch(() => ({}));
  if (responseBody?.ok === false) {
    throw new Error(responseBody?.error || "Validation failed while saving expense row");
  }
}

async function postExpenseToWebhookNoCors(payload) {
  await fetch(EXPENSES_WEBHOOK_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify(payload),
  });
}

export async function saveExpenseRow(input = {}) {
  const row = {
    Type: normalize(input.type),
    Item: normalize(input.item),
    Amount: normalize(input.amount),
    Date: normalize(input.date) || new Date().toISOString().slice(0, 10),
  };

  if (!row.Type || !row.Item || !row.Amount) {
    throw new Error("Type, Item, and Amount are required");
  }

  if (!EXPENSES_WEBHOOK_URL) {
    throw new Error("Expense webhook is not configured. Set VITE_EXPENSES_WEBHOOK_URL.");
  }

  const payload = {
    row,
    rows: [row],
  };

  try {
    await postExpenseToWebhook(payload);
    return { success: true, unverified: false, message: "Saved to Google Sheets.", row };
  } catch (error) {
    if (!isLikelyNetworkError(error)) throw error;
    await postExpenseToWebhookNoCors(payload);
    return {
      success: true,
      unverified: true,
      message: "Sheet request sent via no-cors fallback (delivery cannot be confirmed by browser).",
      row,
    };
  }
}
