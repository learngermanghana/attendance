import crypto from "node:crypto";

const DEFAULT_SOCIAL_SHEET_PUBLISHED_HTML_URL =
  "https://docs.google.com/spreadsheets/d/1BxKGkGCWynv7jr1oze0MjfkM2SuQmohAQZtoIfV6jDk/edit";

const REQUIRED_SHEETS = ["Post_Tracker", "Followers_Growth", "Content_Calendar"];

const DEFAULT_POST_TRACKER_GID = "184774716";
const DEFAULT_POST_TRACKER_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1BxKGkGCWynv7jr1oze0MjfkM2SuQmohAQZtoIfV6jDk/export?format=csv&gid=184774716";

function normalizeSheetName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[_-]+/g, "");
}

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
  const tabs = [];
  const regex = /<a[^>]*href="([^"]*gid=([0-9]+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
  let match = regex.exec(source);

  while (match) {
    const anchorHtml = String(match[0] || "");
    const innerText = String(match[3] || "")
      .replace(/<[^>]+>/g, "")
      .trim();
    const attributeNameMatch = anchorHtml.match(/(?:aria-label|data-name|title)="([^"]+)"/i);

    tabs.push({
      href: match[1],
      gid: match[2],
      name: innerText || String(attributeNameMatch?.[1] || "").trim(),
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

function toRowsFromValues(values = []) {
  if (!Array.isArray(values) || values.length === 0) return [];

  const [headersRaw = [], ...dataRows] = values;
  const headers = headersRaw.map(normalizeHeader);

  return dataRows.map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header || `column${index + 1}`] = String(row[index] || "").trim();
    });
    return record;
  });
}

function sheetIdFromUrl(url) {
  const match = String(url || "").match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] || null;
}

function getServiceAccountCredentials() {
  const clientEmail =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GCP_CLIENT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL;
  const privateKeyRaw =
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.GCP_PRIVATE_KEY ||
    process.env.GOOGLE_PRIVATE_KEY;
  const privateKey = String(privateKeyRaw || "").replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    return null;
  }

  return { clientEmail, privateKey };
}

async function loadSocialSheetDataFromServiceAccount({ publishedUrl, originalError }) {
  const credentials = getServiceAccountCredentials();
  if (!credentials) {
    throw originalError;
  }

  const spreadsheetId =
    process.env.SOCIAL_SHEET_ID ||
    process.env.GOOGLE_SOCIAL_SHEET_ID ||
    sheetIdFromUrl(publishedUrl);

  if (!spreadsheetId) {
    throw originalError;
  }

  const accessToken = await getAccessTokenFromServiceAccount(credentials);
  const [postTrackerValues, followerGrowthValues, contentCalendarValues] = await Promise.all(
    REQUIRED_SHEETS.map((sheetName) =>
      readSheetValues({
        spreadsheetId,
        sheetName,
        accessToken,
      }),
    ),
  );

  const postTrackerRows = toRowsFromValues(postTrackerValues);
  const followerGrowthRows = toRowsFromValues(followerGrowthValues);
  const contentCalendarRows = toRowsFromValues(contentCalendarValues);

  return {
    postTrackerRows,
    followerGrowthRows,
    contentCalendarRows,
    metrics: buildSocialMetrics({ postTrackerRows, followerGrowthRows, contentCalendarRows }),
  };
}

function encodeBase64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createSignedJwt({ clientEmail, privateKey }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createSign("RSA-SHA256")
    .update(signatureInput)
    .sign(privateKey, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signatureInput}.${signature}`;
}

async function getAccessTokenFromServiceAccount(credentials) {
  const assertion = createSignedJwt(credentials);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to obtain service account access token");
  }

  const body = await response.json();
  if (!body?.access_token) {
    throw new Error("Missing service account access token");
  }

  return body.access_token;
}

async function readSheetValues({ spreadsheetId, sheetName, accessToken }) {
  const range = encodeURIComponent(`${sheetName}!A:ZZ`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load ${sheetName} via service account`);
  }

  const body = await response.json();
  return body.values || [];
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

async function loadSocialSheetData() {
  const publishedUrl =
    process.env.SOCIAL_SHEET_PUBLISHED_HTML_URL ||
    process.env.VITE_SOCIAL_SHEET_PUBLISHED_HTML_URL ||
    DEFAULT_SOCIAL_SHEET_PUBLISHED_HTML_URL;

  let sheetIdentifiersByName = {
    Post_Tracker: DEFAULT_POST_TRACKER_GID,
    Followers_Growth: "Followers_Growth",
    Content_Calendar: "Content_Calendar",
  };

  if (publishedUrl.includes("/d/e/")) {
    const htmlResponse = await fetch(publishedUrl);
    if (!htmlResponse.ok) {
      throw new Error("Failed to load published social media sheet");
    }

    const html = await htmlResponse.text();
    const tabs = parsePublishedTabs(html);

    const tabByNormalizedName = Object.fromEntries(
      tabs.map((tab) => [normalizeSheetName(tab.name), tab]),
    );

    const missingSheets = REQUIRED_SHEETS.filter((name) => !tabByNormalizedName[normalizeSheetName(name)]);

    if (missingSheets.length > 0) {
      throw new Error(`Missing required sheet tabs: ${missingSheets.join(", ")}`);
    }

    sheetIdentifiersByName = Object.fromEntries(
      REQUIRED_SHEETS.map((sheetName) => [
        sheetName,
        tabByNormalizedName[normalizeSheetName(sheetName)].gid,
      ]),
    );
  }

  try {
    const [postTrackerCsv, followerGrowthCsv, contentCalendarCsv] = await Promise.all(
      REQUIRED_SHEETS.map(async (sheetName) => {
        const csvUrl =
          sheetName === "Post_Tracker"
            ? process.env.SOCIAL_POST_TRACKER_CSV_URL ||
              process.env.VITE_SOCIAL_POST_TRACKER_CSV_URL ||
              DEFAULT_POST_TRACKER_CSV_URL
            : buildCsvUrl(publishedUrl, sheetIdentifiersByName[sheetName]);
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
  } catch (csvError) {
    return loadSocialSheetDataFromServiceAccount({
      publishedUrl,
      originalError: csvError,
    });
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const data = await loadSocialSheetData();
    return res.status(200).json({ ok: true, ...data });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Failed to fetch social metrics",
    });
  }
}
