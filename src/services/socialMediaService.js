const DEFAULT_SOCIAL_SHEET_PUBLISHED_HTML_URL =
  "https://docs.google.com/spreadsheets/d/1BxKGkGCWynv7jr1oze0MjfkM2SuQmohAQZtoIfV6jDk/edit";

const SOCIAL_SHEET_PUBLISHED_HTML_URL =
  import.meta?.env?.VITE_SOCIAL_SHEET_PUBLISHED_HTML_URL || DEFAULT_SOCIAL_SHEET_PUBLISHED_HTML_URL;

const REQUIRED_SHEETS = ["Post_Tracker", "Followers_Growth", "Content_Calendar"];

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_]/g, "");
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

function parsePublishedTabs(html) {
  const source = String(html || "");

  if (typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const document = parser.parseFromString(source, "text/html");

      return Array.from(document.querySelectorAll('a[href*="gid="]'))
        .map((anchor) => {
          const href = String(anchor.getAttribute("href") || "");
          const gidMatch = href.match(/[?&]gid=([0-9]+)/);
          if (!gidMatch) return null;

          return {
            href,
            gid: gidMatch[1],
            name: String(anchor.textContent || "").trim(),
          };
        })
        .filter(Boolean);
    } catch {
      // Fall through to regex parser.
    }
  }

  const tabs = [];
  const regex = /<a[^>]*href="([^"]*gid=([0-9]+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
  let match = regex.exec(source);

  while (match) {
    tabs.push({
      href: match[1],
      gid: match[2],
      name: String(match[3] || "")
        .replace(/<[^>]+>/g, "")
        .trim(),
    });
    match = regex.exec(source);
  }

  return tabs;
}

function buildCsvUrl(publishedHtmlUrl, gid) {
  const sourceUrl = String(publishedHtmlUrl || "").trim();

  const directSheetMatch = sourceUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (directSheetMatch && !sourceUrl.includes("/d/e/")) {
    const identifier = String(gid || "").trim();
    const isNumericGid = /^\d+$/.test(identifier);
    const query = isNumericGid
      ? `gid=${encodeURIComponent(identifier)}`
      : `sheet=${encodeURIComponent(identifier)}`;

    return `https://docs.google.com/spreadsheets/d/${directSheetMatch[1]}/export?format=csv&${query}`;
  }

  const base = String(publishedHtmlUrl || "").replace(/\/pubhtml(?:\?.*)?$/, "/pub");
  return `${base}?gid=${encodeURIComponent(gid)}&single=true&output=csv`;
}

function toRows(csvText) {
  const table = parseCsv(csvText);
  if (table.length === 0) return [];

  const [headersRaw, ...dataRows] = table;
  const headers = headersRaw.map(normalizeHeader);

  return dataRows.map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header || `column${index + 1}`] = String(row[index] || "").trim();
    });
    return record;
  });
}

function parseDate(value) {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const parts = String(value).split(/[/-]/);
  if (parts.length === 3) {
    const [d1, d2, d3] = parts.map((part) => Number(part));
    if (d1 > 999) {
      const iso = new Date(d1, d2 - 1, d3);
      if (!Number.isNaN(iso.getTime())) return iso;
    }
    const regional = new Date(d3, d2 - 1, d1);
    if (!Number.isNaN(regional.getTime())) return regional;
  }

  return null;
}

function sortByDateDescending(rows, key = "date") {
  return [...rows].sort((a, b) => {
    const aDate = parseDate(a[key]);
    const bDate = parseDate(b[key]);
    return (bDate?.getTime() || 0) - (aDate?.getTime() || 0);
  });
}

function buildSocialMetrics({ postTrackerRows, followerGrowthRows, contentCalendarRows }) {
  const recentPosts = sortByDateDescending(postTrackerRows).slice(0, 8);

  const latestSnapshotByPlatform = {};
  for (const row of sortByDateDescending(followerGrowthRows)) {
    const platform = row.platform || "Unknown";
    if (!latestSnapshotByPlatform[platform]) {
      latestSnapshotByPlatform[platform] = row;
    }
  }

  const upcomingContent = sortByDateDescending(
    contentCalendarRows.filter((row) => {
      const status = String(row.status || row.poststatus || "").toLowerCase();
      return status === "planned" || status === "scheduled";
    }),
    "scheduleddate",
  ).slice(0, 8);

  return {
    totalPosts: postTrackerRows.length,
    totalFollowerSnapshots: followerGrowthRows.length,
    totalCalendarItems: contentCalendarRows.length,
    recentPosts,
    latestSnapshotByPlatform: Object.values(latestSnapshotByPlatform),
    upcomingContent,
  };
}

export async function loadSocialMediaData() {
  let sheetIdentifiersByName = Object.fromEntries(REQUIRED_SHEETS.map((name) => [name, name]));

  if (SOCIAL_SHEET_PUBLISHED_HTML_URL.includes("/d/e/")) {
    const htmlResponse = await fetch(SOCIAL_SHEET_PUBLISHED_HTML_URL);
    if (!htmlResponse.ok) {
      throw new Error("Failed to load published social media sheet");
    }

    const html = await htmlResponse.text();
    const tabs = parsePublishedTabs(html);
    const tabByName = Object.fromEntries(tabs.map((tab) => [tab.name, tab]));
    const missingSheets = REQUIRED_SHEETS.filter((name) => !tabByName[name]);

    if (missingSheets.length > 0) {
      throw new Error(`Missing required sheet tabs: ${missingSheets.join(", ")}`);
    }

    sheetIdentifiersByName = Object.fromEntries(
      REQUIRED_SHEETS.map((sheetName) => [sheetName, tabByName[sheetName].gid]),
    );
  }

  const [postTrackerCsv, followerGrowthCsv, contentCalendarCsv] = await Promise.all(
    REQUIRED_SHEETS.map(async (sheetName) => {
      const csvUrl = buildCsvUrl(SOCIAL_SHEET_PUBLISHED_HTML_URL, sheetIdentifiersByName[sheetName]);
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(`Failed to load ${sheetName} CSV data`);
      }
      return response.text();
    }),
  );

  const postTrackerRows = toRows(await postTrackerCsv);
  const followerGrowthRows = toRows(await followerGrowthCsv);
  const contentCalendarRows = toRows(await contentCalendarCsv);

  return {
    postTrackerRows,
    followerGrowthRows,
    contentCalendarRows,
    metrics: buildSocialMetrics({ postTrackerRows, followerGrowthRows, contentCalendarRows }),
  };
}

export { buildCsvUrl, buildSocialMetrics, parsePublishedTabs, toRows };
