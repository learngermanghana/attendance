import dayjs from "dayjs";
import { WEEKDAY_OPTIONS, courseLevels } from "../data/courseTemplates.js";

const DEFAULT_WEEKDAYS = ["Monday", "Tuesday", "Wednesday"];

function normalizeWeekdays(weekdays) {
  if (!Array.isArray(weekdays) || weekdays.length === 0) return [...DEFAULT_WEEKDAYS];
  const known = weekdays
    .map((d) => String(d || "").trim())
    .filter((d) => WEEKDAY_OPTIONS.includes(d));
  return known.length > 0 ? known : [...DEFAULT_WEEKDAYS];
}

function toIsoDate(value) {
  return dayjs(value).format("YYYY-MM-DD");
}

export function getHolidayWindow(startDate, days = 120) {
  const start = dayjs(startDate);
  return Array.from({ length: days }, (_, index) => start.add(index, "day").format("YYYY-MM-DD"));
}

export function generateCourseSchedule({
  level,
  startDate,
  holidayDates = [],
  defaultWeekdays = DEFAULT_WEEKDAYS,
  useAdvancedWeekdays = false,
  weekDaysMap = {},
}) {
  const weeklyTemplate = courseLevels[level] || [];
  const holidays = new Set((holidayDates || []).map((d) => toIsoDate(d)));
  const fallbackDays = normalizeWeekdays(defaultWeekdays);

  const totalSessions = weeklyTemplate.reduce((sum, [, sessions]) => sum + sessions.length, 0);
  if (totalSessions === 0) return [];

  const rows = [];
  let cursor = dayjs(startDate);
  let dayIndex = 1;

  weeklyTemplate.forEach(([weekLabel, sessions], weekIndex) => {
    const preferredDays = useAdvancedWeekdays
      ? normalizeWeekdays(weekDaysMap[weekLabel] || weekDaysMap[String(weekIndex)] || fallbackDays)
      : fallbackDays;

    sessions.forEach((topic) => {
      while (true) {
        const cursorIso = cursor.format("YYYY-MM-DD");
        const dayName = cursor.format("dddd");
        const isPreferredDay = preferredDays.includes(dayName);
        const isHoliday = holidays.has(cursorIso);

        if (isPreferredDay && !isHoliday) {
          rows.push({
            week: weekLabel,
            day: `Day ${dayIndex}`,
            date: cursor.format("dddd, DD MMMM YYYY"),
            dateIso: cursorIso,
            topic,
          });
          dayIndex += 1;
          cursor = cursor.add(1, "day");
          break;
        }

        cursor = cursor.add(1, "day");
      }
    });
  });

  return rows;
}

export function buildScheduleExports({ level, startDate, holidayDates, rows }) {
  const cleanRows = rows || [];
  const holidays = (holidayDates || []).map((d) => toIsoDate(d));

  const textLines = [
    `Course Schedule (${level})`,
    `Start Date: ${toIsoDate(startDate)}`,
    `Total Sessions: ${cleanRows.length}`,
    `Holidays: ${holidays.length ? holidays.join(", ") : "None"}`,
    "",
    ...cleanRows.map((row) => `- ${row.day} | ${row.week} | ${row.date} | ${row.topic}`),
  ];

  return {
    txt: textLines.join("\n"),
    json: {
      course_level: level,
      start_date: toIsoDate(startDate),
      total_sessions: cleanRows.length,
      holidays,
      sessions: cleanRows.map((row) => ({
        week: row.week,
        day: row.day,
        date: row.date,
        date_iso: row.dateIso,
        topic: row.topic,
      })),
    },
  };
}

export const DEFAULT_TEACHING_DAYS = DEFAULT_WEEKDAYS;
