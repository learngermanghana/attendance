import test from "node:test";
import assert from "node:assert/strict";
import { loadPublishedStudentRows, readPublishedStudentCode } from "../src/services/publishedSheetService.js";

test("loadPublishedStudentRows handles embedded newlines in quoted fields", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => ({
    ok: true,
    async text() {
      return [
        "name,student code,class name,start date,end date,status",
        'Patricia Addae Mensah,594483835,A1 Dortmund Klasse,"2026-03-03T19:20:34.305Z',
        '","2026-09-03T19:20:34.305Z',
        '",Paid',
      ].join("\n");
    },
  });

  try {
    const rows = await loadPublishedStudentRows();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, "Patricia Addae Mensah");
    assert.equal(readPublishedStudentCode(rows[0]), "594483835");
    assert.equal(rows[0].classname, "A1 Dortmund Klasse");
    assert.equal(rows[0].startdate, "2026-03-03T19:20:34.305Z");
    assert.equal(rows[0].enddate, "2026-09-03T19:20:34.305Z");
    assert.equal(rows[0].status, "Paid");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
