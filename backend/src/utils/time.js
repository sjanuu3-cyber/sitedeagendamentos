function normalizeTimeString(value) {
  if (typeof value !== "string") {
    return "";
  }

  const [hours = "00", minutes = "00"] = value.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

function timeToMinutes(value) {
  const [hours, minutes] = normalizeTimeString(value).split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function addMinutesToTime(value, minutesToAdd) {
  return minutesToTime(timeToMinutes(value) + Number(minutesToAdd));
}

function rangesOverlap(startA, endA, startB, endB) {
  return timeToMinutes(startA) < timeToMinutes(endB) &&
    timeToMinutes(startB) < timeToMinutes(endA);
}

function getWeekDay(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

function isDateInPast(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const targetDate = new Date(year, month - 1, day);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  return targetDate < today;
}

module.exports = {
  normalizeTimeString,
  timeToMinutes,
  minutesToTime,
  addMinutesToTime,
  rangesOverlap,
  getWeekDay,
  isDateInPast,
};
