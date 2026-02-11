const DEFAULT_PUBLISHED_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTDD46qAiCuuza-u4jTzwgiuMR5HwtBhQdvElQw5SIQOHCEJ7RCNLx7Zlarf7HvhYOCXkiVcwTCyXp6/pub?output=csv";

const PUBLISHED_SHEET_CSV_URL =
  import.meta.env.VITE_STUDENTS_SHEET_CSV_URL || DEFAULT_PUBLISHED_SHEET_CSV_URL;

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
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

export async function loadPublishedStudentRows() {
  const res = await fetch(PUBLISHED_SHEET_CSV_URL);
  if (!res.ok) {
    throw new Error("Failed to load published student sheet");
  }

  const csv = await res.text();
  const rows = parseCsv(csv);

  if (rows.length === 0) return [];

  const [rawHeaders, ...dataRows] = rows;
  const headers = rawHeaders.map(normalizeHeader);

  return dataRows.map((row) => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = String(row[index] || "").trim();
    });
    return entry;
  });
}

export function readPublishedStudentName(row) {
  return row.name || "";
}

export function readPublishedClassName(row) {
  return row.classname || "";
}

export function readPublishedStatus(row) {
  return row.status || "";
}

export function readPublishedStudentCode(row) {
  return row.studentcode || row.uid || "";
}
