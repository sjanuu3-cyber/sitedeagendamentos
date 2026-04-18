const { normalizeTimeString } = require("./time");

const LONG_DURATION_MINUTES = 24 * 60;

function isLongDuration(durationMinutes) {
  return Number(durationMinutes) >= LONG_DURATION_MINUTES;
}

function buildSchedulingMeta(durationMinutes) {
  const longDuration = isLongDuration(durationMinutes);

  return {
    schedulingMode: longDuration ? "date_only" : "date_time",
    requiresTimeSelection: !longDuration,
  };
}

function parseLocalDate(dateString, timeString = "00:00") {
  const [year, month, day] = String(dateString).split("-").map(Number);
  const [hours, minutes] = normalizeTimeString(timeString).split(":").map(Number);

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function formatIsoDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatSqlDateTime(date) {
  return `${formatIsoDate(date)} ${formatTime(date)}:00`;
}

function buildScheduleWindow(dateString, startTime, durationMinutes) {
  const startDateTime = parseLocalDate(dateString, startTime);
  const endDateTime = new Date(startDateTime.getTime());

  endDateTime.setMinutes(endDateTime.getMinutes() + Number(durationMinutes));

  return {
    startTime: formatTime(startDateTime),
    endTime: formatTime(endDateTime),
    endDate: formatIsoDate(endDateTime),
    startDateTime: formatSqlDateTime(startDateTime),
    endDateTime: formatSqlDateTime(endDateTime),
  };
}

function buildDayWindow(dateString) {
  const dayStart = parseLocalDate(dateString, "00:00");
  const nextDayStart = new Date(dayStart.getTime());

  nextDayStart.setDate(nextDayStart.getDate() + 1);

  return {
    startDateTime: formatSqlDateTime(dayStart),
    endDateTime: formatSqlDateTime(nextDayStart),
  };
}

module.exports = {
  LONG_DURATION_MINUTES,
  isLongDuration,
  buildSchedulingMeta,
  buildScheduleWindow,
  buildDayWindow,
};
