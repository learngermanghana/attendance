import dayjs from "dayjs";

const HOLIDAY_STORAGE_KEY = "course_schedule_holidays_v1";

function normalizeHolidayDate(value) {
  const parsed = dayjs(value);
  if (!parsed.isValid()) return "";
  return parsed.format("YYYY-MM-DD");
}

function readRawHolidayDates() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HOLIDAY_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadSavedHolidayDates() {
  const normalized = readRawHolidayDates()
    .map((value) => normalizeHolidayDate(value))
    .filter(Boolean);
  return [...new Set(normalized)].sort();
}

export function saveHolidayDates(dates) {
  if (typeof window === "undefined") return;
  const normalized = [...new Set((dates || []).map((value) => normalizeHolidayDate(value)).filter(Boolean))].sort();
  window.localStorage.setItem(HOLIDAY_STORAGE_KEY, JSON.stringify(normalized));
}

export function listUpcomingHolidayReminders({ daysAhead = 30 } = {}) {
  const now = dayjs().startOf("day");
  const end = now.add(daysAhead, "day");

  return loadSavedHolidayDates()
    .map((holidayIso) => {
      const holidayDate = dayjs(holidayIso);
      if (!holidayDate.isValid()) return null;
      if (holidayDate.isBefore(now) || holidayDate.isAfter(end)) return null;

      return {
        isoDate: holidayIso,
        displayDate: holidayDate.format("dddd, DD MMMM YYYY"),
        daysUntil: holidayDate.diff(now, "day"),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.daysUntil - b.daysUntil || a.isoDate.localeCompare(b.isoDate));
}

