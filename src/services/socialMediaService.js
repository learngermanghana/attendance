const DEFAULT_SOCIAL_SHEET_PUBLISHED_HTML_URL =
  "https://docs.google.com/spreadsheets/d/1BxKGkGCWynv7jr1oze0MjfkM2SuQmohAQZtoIfV6jDk/edit";

const SOCIAL_SHEET_PUBLISHED_HTML_URL =
  import.meta?.env?.VITE_SOCIAL_SHEET_PUBLISHED_HTML_URL || DEFAULT_SOCIAL_SHEET_PUBLISHED_HTML_URL;

const REQUIRED_SHEETS = ["Post_Tracker", "Followers_Growth", "Content_Calendar"];

const DEFAULT_POST_TRACKER_GID = "184774716";

const SOCIAL_CSV_URLS = {
  Post_Tracker:
    import.meta?.env?.VITE_SOCIAL_POST_TRACKER_CSV_URL ||
    buildCsvUrl(SOCIAL_SHEET_PUBLISHED_HTML_URL, DEFAULT_POST_TRACKER_GID),
  Followers_Growth:
    import.meta?.env?.VITE_SOCIAL_FOLLOWERS_GROWTH_CSV_URL ||
    buildCsvUrl(SOCIAL_SHEET_PUBLISHED_HTML_URL, "Followers_Growth"),
  Content_Calendar:
    import.meta?.env?.VITE_SOCIAL_CONTENT_CALENDAR_CSV_URL ||
    buildCsvUrl(SOCIAL_SHEET_PUBLISHED_HTML_URL, "Content_Calendar"),
};

function toErrorMessage(error) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;

  const name = String(error?.name || "").trim();
  const message = String(error?.message || "").trim();
  if (name && message && !message.startsWith(`${name}:`)) {
    return `${name}: ${message}`;
  }

  return message || name || "Unknown error";
}

async function readErrorBody(response) {
  try {
    const body = await response.text();
    return String(body || "").trim().slice(0, 200);
  } catch {
    return "";
  }
}

async function fetchOrThrow(url, contextLabel) {
  let response;

  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(`${contextLabel} request failed (${url}): ${toErrorMessage(error)}`, { cause: error });
  }

  if (!response.ok) {
    const bodyPreview = await readErrorBody(response);
    const bodySuffix = bodyPreview ? ` | body: ${bodyPreview}` : "";
    throw new Error(
      `${contextLabel} request failed (${url}) with HTTP ${response.status} ${response.statusText}${bodySuffix}`,
    );
  }

  return response;
}

function buildCsvCandidateUrls(sheetSourceUrl, identifier) {
  const primaryUrl = buildCsvUrl(sheetSourceUrl, identifier);
  const urls = [primaryUrl];

  const directSheetMatch = String(sheetSourceUrl || "").match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (directSheetMatch) {
    const sheetId = directSheetMatch[1];
    const value = String(identifier || "").trim();
    const isNumericGid = /^\d+$/.test(value);

    const gvizQuery = isNumericGid
      ? `gid=${encodeURIComponent(value)}`
      : `sheet=${encodeURIComponent(value)}`;

    urls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&${gvizQuery}`);
  }

  return [...new Set(urls)];
}

async function fetchCsvWithFallback(sheetName, identifier) {
  const csvCandidates = buildCsvCandidateUrls(SOCIAL_SHEET_PUBLISHED_HTML_URL, identifier);
  const errors = [];

  for (const csvUrl of csvCandidates) {
    try {
      const response = await fetchOrThrow(csvUrl, `${sheetName} CSV`);
      return response.text();
    } catch (error) {
      errors.push(toErrorMessage(error));
    }
  }

  throw new Error(`${sheetName} CSV request failed. Tried ${csvCandidates.length} URL(s): ${errors.join(" | ")}`);
}

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

  if (typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const document = parser.parseFromString(source, "text/html");

      return Array.from(document.querySelectorAll('a[href*="gid="]'))
        .map((anchor) => {
          const href = String(anchor.getAttribute("href") || "");
          const gidMatch = href.match(/[?&]gid=([0-9]+)/);
          if (!gidMatch) return null;

          const textLabel = String(anchor.textContent || "").trim();
          const attributeLabel =
            String(anchor.getAttribute("aria-label") || "").trim() ||
            String(anchor.getAttribute("data-name") || "").trim() ||
            String(anchor.getAttribute("title") || "").trim();

          return {
            href,
            gid: gidMatch[1],
            name: textLabel || attributeLabel,
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

async function loadSocialMediaDataDirectFromSheets() {
  const sheetIdentifiers = {
    Post_Tracker: DEFAULT_POST_TRACKER_GID,
    Followers_Growth: "Followers_Growth",
    Content_Calendar: "Content_Calendar",
  };

  const [postTrackerCsv, followerGrowthCsv, contentCalendarCsv] = await Promise.all(
    REQUIRED_SHEETS.map(async (sheetName) => {
      const explicitCsvUrl = String(SOCIAL_CSV_URLS[sheetName] || "").trim();
      if (explicitCsvUrl && import.meta?.env?.[`VITE_SOCIAL_${sheetName.toUpperCase()}_CSV_URL`]) {
        const response = await fetchOrThrow(explicitCsvUrl, `${sheetName} CSV`);
        return response.text();
      }

      return fetchCsvWithFallback(sheetName, sheetIdentifiers[sheetName] || sheetName);
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

export async function loadPostTrackerRows() {
  const explicitCsvUrl = String(import.meta?.env?.VITE_SOCIAL_POST_TRACKER_CSV_URL || "").trim();
  if (explicitCsvUrl) {
    const response = await fetchOrThrow(explicitCsvUrl, "Post_Tracker CSV");
    const csv = await response.text();
    return toRows(csv);
  }

  const csv = await fetchCsvWithFallback("Post_Tracker", DEFAULT_POST_TRACKER_GID);
  return toRows(csv);
}

export async function loadSocialMediaData() {
  let response = null;
  let apiFetchError = null;

  try {
    response = await fetch("/api/social-metrics");
  } catch (error) {
    response = null;
    apiFetchError = error;
  }

  if (response?.ok) {
    const payload = await response.json();
    if (payload?.ok) {
      return {
        postTrackerRows: payload.postTrackerRows || [],
        followerGrowthRows: payload.followerGrowthRows || [],
        contentCalendarRows: payload.contentCalendarRows || [],
        metrics:
          payload.metrics ||
          buildSocialMetrics({
            postTrackerRows: payload.postTrackerRows || [],
            followerGrowthRows: payload.followerGrowthRows || [],
            contentCalendarRows: payload.contentCalendarRows || [],
          }),
      };
    }
  }

  try {
    return await loadSocialMediaDataDirectFromSheets();
  } catch (sheetError) {
    if (apiFetchError) {
      throw new Error(
        `Unable to load social media data. API fetch failed: ${toErrorMessage(apiFetchError)}. Direct sheet fetch failed: ${toErrorMessage(sheetError)}`,
        { cause: sheetError },
      );
    }

    throw sheetError;
  }
}

export { buildCsvUrl, buildSocialMetrics, parsePublishedTabs, toRows };
