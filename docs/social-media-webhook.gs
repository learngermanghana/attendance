function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || "{}");
    const token = "REPLACE_WITH_OPTIONAL_SHARED_TOKEN"; // Set "" to disable token check.

    if (token && body.token !== token) {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: false, error: "Unauthorized" })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = body.sheet_gid
      ? ss.getSheets().find((s) => String(s.getSheetId()) === String(body.sheet_gid))
      : (body.sheet_name ? ss.getSheetByName(body.sheet_name) : ss.getActiveSheet());

    if (!sheet) {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: false, error: "Target sheet not found" })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const row = body.row || {};

    sheet.appendRow([
      row.date || "",
      row.brand || "",
      row.platform || "",
      row.content_type || "",
      row.topic || "",
      row.format || "",
      row.account || "",
      row.time || "",
      row.likes ?? "",
      row.comments ?? "",
      row.shares ?? "",
      row.followers ?? "",
      row.created_at || new Date().toISOString(),
    ]);

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
