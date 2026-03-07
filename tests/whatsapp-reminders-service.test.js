import test from "node:test";
import assert from "node:assert/strict";
import { loadWhatsappReminderDashboard } from "../src/services/whatsappRemindersService.js";

test("loadWhatsappReminderDashboard filters unpaid and contract-ending students", async () => {
  const today = new Date();
  const iso = (date) => date.toISOString().slice(0, 10);
  const plusDays = (days) => {
    const value = new Date(today);
    value.setDate(value.getDate() + days);
    return iso(value);
  };

  const csv = [
    "Name,Phone,Location,Level,Paid,Balance,ContractStart,ContractEnd,ClassName",
    `Alice,111,Campus A,A1,No,120,${plusDays(-10)},${plusDays(8)},General English`,
    `Bob,222,Campus B,A2,Yes,0,${plusDays(-40)},${plusDays(30)},IELTS`,
    `Cara,333,Campus C,B1,NO,80,${plusDays(-40)},${plusDays(3)},Business`,
  ].join("\n");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    text: async () => csv,
  });

  try {
    const result = await loadWhatsappReminderDashboard();

    assert.equal(result.unpaidStudents.length, 2);
    assert.equal(result.unpaidStudents[0].name, "Cara");
    assert.equal(result.unpaidStudents[0].daysUntilPaymentDue, -10);
    assert.match(result.unpaidStudents[0].whatsappMessage, /outstanding balance is 80/);

    assert.equal(result.contractEndingSoon.length, 2);
    assert.deepEqual(
      result.contractEndingSoon.map((item) => item.name),
      ["Cara", "Alice"],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
