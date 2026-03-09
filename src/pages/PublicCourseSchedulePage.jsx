import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import { generateCourseSchedule } from "../utils/courseScheduleGenerator.js";

function parseList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseWeekDaysMap(value) {
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export default function PublicCourseSchedulePage() {
  const [searchParams] = useSearchParams();

  const level = searchParams.get("level") || "A1";
  const startDate = searchParams.get("startDate") || dayjs().format("YYYY-MM-DD");
  const holidayDates = parseList(searchParams.get("holidayDates"));
  const defaultWeekdays = parseList(searchParams.get("defaultWeekdays"));
  const useAdvancedWeekdays = searchParams.get("useAdvancedWeekdays") === "true";
  const weekDaysMap = parseWeekDaysMap(searchParams.get("weekDaysMap"));

  const rows = useMemo(
    () =>
      generateCourseSchedule({
        level,
        startDate,
        holidayDates,
        defaultWeekdays,
        useAdvancedWeekdays,
        weekDaysMap,
      }),
    [level, startDate, holidayDates, defaultWeekdays, useAdvancedWeekdays, weekDaysMap],
  );

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <h2>Course Schedule (Public View)</h2>
      <div>
        <b>Level:</b> {level}
      </div>
      <div>
        <b>Start date:</b> {dayjs(startDate).format("YYYY-MM-DD")}
      </div>
      <div>
        <b>Sessions:</b> {rows.length}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Week</th>
              <th align="left">Day</th>
              <th align="left">Assignment ID</th>
              <th align="left">Date</th>
              <th align="left">Topic</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.day}-${row.dateIso}`}>
                <td>{row.week}</td>
                <td>{row.day}</td>
                <td>
                  <code>{row.assignmentId}</code>
                </td>
                <td>{row.date}</td>
                <td>{row.topic}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
