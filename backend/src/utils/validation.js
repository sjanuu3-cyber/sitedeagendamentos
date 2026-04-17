const { AppError } = require("./errors");
const { timeToMinutes } = require("./time");

const VALID_SEGMENTS = [
  "barbearia",
  "manicure",
  "salao",
  "odontologia",
  "outro",
];

const VALID_APPOINTMENT_STATUSES = ["agendado", "cancelado", "concluido"];

function assertRequiredFields(payload, fields) {
  const missing = fields.filter((field) => !hasRequiredValue(payload[field]));

  if (missing.length > 0) {
    throw new AppError(
      `Campos obrigatórios: ${missing.join(", ")}`,
      422,
      { missing }
    );
  }
}

function hasRequiredValue(value) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return true;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidEmail(value) {
  if (!isNonEmptyString(value)) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsedDate = new Date(year, month - 1, day);

  return (
    parsedDate.getFullYear() === year &&
    parsedDate.getMonth() === month - 1 &&
    parsedDate.getDate() === day
  );
}

function isValidTime(value) {
  if (!/^\d{2}:\d{2}$/.test(String(value))) {
    return false;
  }

  const [hours, minutes] = value.split(":").map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function isPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
}

function isNonNegativeNumber(value) {
  const parsed = Number(value);
  return !Number.isNaN(parsed) && parsed >= 0;
}

function normalizeSlug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeAvailability(availability) {
  if (
    availability === null ||
    availability === undefined ||
    availability === ""
  ) {
    return {};
  }

  if (typeof availability !== "object" || Array.isArray(availability)) {
    throw new AppError(
      "A disponibilidade deve ser enviada como objeto por dia da semana.",
      422
    );
  }

  const normalized = {};

  for (const [day, ranges] of Object.entries(availability)) {
    const dayNumber = Number(day);

    if (!Number.isInteger(dayNumber) || dayNumber < 0 || dayNumber > 6) {
      throw new AppError("Os dias da semana devem estar entre 0 e 6.", 422);
    }

    if (!Array.isArray(ranges)) {
      throw new AppError(
        `A disponibilidade do dia ${day} precisa ser uma lista de horários.`,
        422
      );
    }

    const cleanedRanges = ranges
      .filter((range) => range && isNonEmptyString(range.start) && isNonEmptyString(range.end))
      .map((range) => {
        const start = range.start.trim();
        const end = range.end.trim();

        if (!isValidTime(start) || !isValidTime(end)) {
          throw new AppError(
            `Horário inválido na disponibilidade do dia ${day}. Use HH:MM.`,
            422
          );
        }

        if (timeToMinutes(start) >= timeToMinutes(end)) {
          throw new AppError(
            `O horário inicial deve ser menor que o final no dia ${day}.`,
            422
          );
        }

        return { start, end };
      })
      .sort((left, right) => timeToMinutes(left.start) - timeToMinutes(right.start));

    for (let index = 1; index < cleanedRanges.length; index += 1) {
      const previousRange = cleanedRanges[index - 1];
      const currentRange = cleanedRanges[index];

      if (timeToMinutes(currentRange.start) < timeToMinutes(previousRange.end)) {
        throw new AppError(
          `Existem faixas de disponibilidade sobrepostas no dia ${day}.`,
          422
        );
      }
    }

    normalized[String(dayNumber)] = cleanedRanges;
  }

  return normalized;
}

function validatePassword(password) {
  if (!isNonEmptyString(password) || password.trim().length < 6) {
    throw new AppError("A senha deve ter pelo menos 6 caracteres.", 422);
  }
}

function validateSegment(segment) {
  if (!VALID_SEGMENTS.includes(segment)) {
    throw new AppError(
      `Segmento inválido. Use um destes valores: ${VALID_SEGMENTS.join(", ")}.`,
      422
    );
  }
}

module.exports = {
  VALID_SEGMENTS,
  VALID_APPOINTMENT_STATUSES,
  assertRequiredFields,
  hasRequiredValue,
  isNonEmptyString,
  isValidEmail,
  isValidDate,
  isValidTime,
  isPositiveInteger,
  isNonNegativeNumber,
  normalizeSlug,
  sanitizeAvailability,
  validatePassword,
  validateSegment,
};
