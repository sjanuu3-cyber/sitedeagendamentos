const { AppError } = require("../utils/errors");
const { getWeekDay, timeToMinutes } = require("../utils/time");
const {
  buildScheduleWindow,
  buildSchedulingMeta,
  isLongDuration,
} = require("../utils/scheduling");

function getIntervalsForDate(availability, date) {
  const weekDay = String(getWeekDay(date));
  return availability?.[weekDay] || [];
}

function buildLongDurationCandidates(availability, date, duration) {
  return getIntervalsForDate(availability, date).map((interval) =>
    buildScheduleWindow(date, interval.start, duration)
  );
}

function fitsInsideAvailability(availability, date, startTime, duration) {
  const { endTime } = buildScheduleWindow(date, startTime, duration);
  const intervals = getIntervalsForDate(availability, date);

  return intervals.some((interval) => {
    return (
      timeToMinutes(startTime) >= timeToMinutes(interval.start) &&
      timeToMinutes(endTime) <= timeToMinutes(interval.end)
    );
  });
}

function isStartTimeWithinAvailability(availability, date, startTime) {
  const intervals = getIntervalsForDate(availability, date);

  return intervals.some((interval) => {
    return (
      timeToMinutes(startTime) >= timeToMinutes(interval.start) &&
      timeToMinutes(startTime) < timeToMinutes(interval.end)
    );
  });
}

function hasConflict(
  appointments,
  startDateTime,
  endDateTime,
  ignoreAppointmentId = null
) {
  return appointments.some((appointment) => {
    if (ignoreAppointmentId && Number(appointment.id) === Number(ignoreAppointmentId)) {
      return false;
    }

    return appointment.inicio_em < endDateTime && startDateTime < appointment.fim_em;
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

  if (isLongDuration(duration)) {
    return slots;
  }

  for (const interval of intervals) {
    const intervalStart = timeToMinutes(interval.start);
    const intervalEnd = timeToMinutes(interval.end);

    for (
      let current = intervalStart;
      current + duration <= intervalEnd;
      current += step
    ) {
      const startTime = `${String(Math.floor(current / 60)).padStart(2, "0")}:${String(
        current % 60
      ).padStart(2, "0")}`;
      const scheduleWindow = buildScheduleWindow(date, startTime, duration);

      if (
        !hasConflict(
          appointments,
          scheduleWindow.startDateTime,
          scheduleWindow.endDateTime
        )
      ) {
        slots.push({
          startTime: scheduleWindow.startTime,
          endTime: scheduleWindow.endTime,
          endDate: scheduleWindow.endDate,
        });
      }
    }
  }

  return slots;
}

function buildLongDurationSlot({
  availability,
  date,
  duration,
  appointments,
  ignoreAppointmentId = null,
}) {
  const candidates = buildLongDurationCandidates(availability, date, duration);
  const scheduleWindow = candidates.find((candidate) => {
    return !hasConflict(
      appointments,
      candidate.startDateTime,
      candidate.endDateTime,
      ignoreAppointmentId
    );
  });

  return scheduleWindow
    ? [
        {
          startTime: scheduleWindow.startTime,
          endTime: scheduleWindow.endTime,
          endDate: scheduleWindow.endDate,
          autoSelected: true,
        },
      ]
    : [];
}

function resolveLongDurationQueryWindow(availability, date, duration) {
  const candidates = buildLongDurationCandidates(availability, date, duration);

  if (candidates.length === 0) {
    return null;
  }

  return {
    startDateTime: candidates[0].startDateTime,
    endDateTime: candidates[candidates.length - 1].endDateTime,
  };
}

function assertScheduleAvailable({
  availability,
  date,
  startTime,
  duration,
  appointments,
  ignoreAppointmentId = null,
}) {
  let resolvedStartTime = startTime;

  if (isLongDuration(duration)) {
    if (!resolvedStartTime) {
      const firstAvailableSlot = buildLongDurationSlot({
        availability,
        date,
        duration,
        appointments,
        ignoreAppointmentId,
      })[0];

      if (!firstAvailableSlot) {
        throw new AppError(
          "O profissional nao possui atendimento disponivel nessa data de inicio.",
          409
        );
      }

      resolvedStartTime = firstAvailableSlot.startTime;
    }

    if (!resolvedStartTime) {
      throw new AppError(
        "O profissional nao possui atendimento disponivel nessa data de inicio.",
        409
      );
    }

    if (!isStartTimeWithinAvailability(availability, date, resolvedStartTime)) {
      throw new AppError(
        "O profissional nao possui atendimento disponivel nesse horario de inicio.",
        409
      );
    }
  } else if (!fitsInsideAvailability(availability, date, resolvedStartTime, duration)) {
    throw new AppError(
      "O profissional nao possui atendimento disponivel nesse horario.",
      409
    );
  }

  const scheduleWindow = buildScheduleWindow(date, resolvedStartTime, duration);

  if (
    hasConflict(
      appointments,
      scheduleWindow.startDateTime,
      scheduleWindow.endDateTime,
      ignoreAppointmentId
    )
  ) {
    throw new AppError(
      "Ja existe um agendamento ativo que conflita com esse periodo.",
      409
    );
  }

  return {
    ...scheduleWindow,
    startTime: resolvedStartTime,
    ...buildSchedulingMeta(duration),
  };
}

module.exports = {
  getIntervalsForDate,
  buildAvailableSlots,
  buildLongDurationSlot,
  resolveLongDurationQueryWindow,
  assertScheduleAvailable,
};
