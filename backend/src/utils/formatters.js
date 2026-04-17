const { normalizeTimeString } = require("./time");

function parseJsonObject(value, fallback = {}) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function formatDateValue(value) {
  if (!value) {
    return null;
  }

  return String(value).slice(0, 10);
}

function formatTimeValue(value) {
  if (!value) {
    return null;
  }

  return normalizeTimeString(String(value).slice(0, 5));
}

function toBoolean(value) {
  return value === true || value === 1 || value === "1";
}

module.exports = {
  parseJsonObject,
  formatDateValue,
  formatTimeValue,
  toBoolean,
};
