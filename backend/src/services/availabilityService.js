const { AppError } = require("../utils/errors");
const {
  addMinutesToTime,
  getWeekDay,
  minutesToTime,
  rangesOverlap,
  timeToMinutes,
} = require("../utils/time");

function getIntervalsForDate(availability, date) {
  const weekDay = String(getWeekDay(date));
  return availability?.[weekDay] || [];
}

function fitsInsideAvailability(availability, date, startTime, duration) {
  const endTime = addMinutesToTime(startTime, duration);
  const intervals = getIntervalsForDate(availability, date);

  return intervals.some((interval) => {
    return (
      timeToMinutes(startTime) >= timeToMinutes(interval.start) &&
      timeToMinutes(endTime) <= timeToMinutes(interval.end)
    );
  });
}

function hasConflict(appointments, startTime, endTime, ignoreAppointmentId = null) {
  return appointments.some((appointment) => {
    if (ignoreAppointmentId && Number(appointment.id) === Number(ignoreAppointmentId)) {
      return false;
    }

    return rangesOverlap(
      startTime,
      endTime,
      appointment.horario_inicio,
      appointment.horario_fim
    );
  });
}

function buildAvailableSlots({
  availability,
  date,
  duration,
  appointments,
  step = 30,
}) {
  const slots = [];
  const intervals = getIntervalsForDate(availability, date);

  for (const interval of intervals) {
    const intervalStart = timeToMinutes(interval.start);
    const intervalEnd = timeToMinutes(interval.end);

    for (
      let current = intervalStart;
      current + duration <= intervalEnd;
      current += step
    ) {
      const startTime = minutesToTime(current);
      const endTime = minutesToTime(current + duration);

      if (!hasConflict(appointments, startTime, endTime)) {
        slots.push({ startTime, endTime });
      }
    }
  }

  return slots;
}

function assertScheduleAvailable({
  availability,
  date,
  startTime,
  duration,
  appointments,
  ignoreAppointmentId = null,
}) {
  if (!fitsInsideAvailability(availability, date, startTime, duration)) {
    throw new AppError(
      "O profissional não possui atendimento disponível nesse horário.",
      409
    );
  }

  const endTime = addMinutesToTime(startTime, duration);

  if (hasConflict(appointments, startTime, endTime, ignoreAppointmentId)) {
    throw new AppError(
      "Já existe um agendamento ativo que conflita com esse horário.",
      409
    );
  }

  return { endTime };
}

module.exports = {
  getIntervalsForDate,
  fitsInsideAvailability,
  buildAvailableSlots,
  assertScheduleAvailable,
};
