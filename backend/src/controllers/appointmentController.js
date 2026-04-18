const db = require("../config/database");
const {
  assertScheduleAvailable,
  getIntervalsForDate,
  resolveLongDurationQueryWindow,
} = require("../services/appointmentSchedulingService");
const { getOverlappingAppointmentsByProfessional } = require("../services/appointmentQueryService");
const {
  getProfessionalByCompany,
  getServiceByCompany,
} = require("../services/schedulingService");
const { AppError } = require("../utils/errors");
const {
  VALID_APPOINTMENT_STATUSES,
  hasRequiredValue,
  isNonEmptyString,
  isValidDate,
  isValidEmail,
  isValidTime,
} = require("../utils/validation");
const { isDateInPast } = require("../utils/time");
const {
  formatDateValue,
  formatTimeValue,
} = require("../utils/formatters");
const { buildScheduleWindow, buildSchedulingMeta } = require("../utils/scheduling");

function mapAppointment(row) {
  return {
    id: row.id,
    companyId: row.companyId,
    serviceId: row.serviceId,
    serviceName: row.serviceName,
    professionalId: row.professionalId,
    professionalName: row.professionalName,
    clientName: row.clientName,
    clientPhone: row.clientPhone,
    clientEmail: row.clientEmail,
    appointmentDate: formatDateValue(row.appointmentDate),
    endDate: formatDateValue(row.endDate || row.appointmentDate),
    startTime: formatTimeValue(row.startTime),
    endTime: formatTimeValue(row.endTime),
    durationMinutes: row.durationMinutes,
    price: Number(row.price),
    status: row.status,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...buildSchedulingMeta(row.durationMinutes),
  };
}

async function loadHydratedAppointment(appointmentId) {
  const result = await db.query(
    `
      SELECT
        a.id,
        a.empresa_id AS companyId,
        a.servico_id AS serviceId,
        s.nome AS serviceName,
        a.profissional_id AS professionalId,
        p.nome AS professionalName,
        a.cliente_nome AS clientName,
        a.cliente_telefone AS clientPhone,
        a.cliente_email AS clientEmail,
        a.data_agendamento AS appointmentDate,
        a.horario_inicio AS startTime,
        a.horario_fim AS endTime,
        DATE(a.fim_em) AS endDate,
        a.duracao_minutos AS durationMinutes,
        a.preco AS price,
        a.status,
        a.observacoes AS notes,
        a.created_at AS createdAt,
        a.updated_at AS updatedAt
      FROM agendamentos a
      INNER JOIN servicos s ON s.id = a.servico_id
      INNER JOIN profissionais p ON p.id = a.profissional_id
      WHERE a.id = ?
    `,
    [appointmentId]
  );

  return result.rows[0];
}

async function listAppointments(req, res, next) {
  try {
    const filters = ["a.empresa_id = ?"];
    const values = [req.user.empresaId];

    if (req.query.date) {
      values.push(req.query.date, req.query.date);
      filters.push("a.data_agendamento <= ?");
      filters.push("DATE(a.fim_em) >= ?");
    }

    if (req.query.status) {
      values.push(req.query.status);
      filters.push("a.status = ?");
    }

    const result = await db.query(
      `
        SELECT
          a.id,
          a.empresa_id AS companyId,
          a.servico_id AS serviceId,
          s.nome AS serviceName,
          a.profissional_id AS professionalId,
          p.nome AS professionalName,
          a.cliente_nome AS clientName,
          a.cliente_telefone AS clientPhone,
        a.cliente_email AS clientEmail,
        a.data_agendamento AS appointmentDate,
        a.horario_inicio AS startTime,
        a.horario_fim AS endTime,
        DATE(a.fim_em) AS endDate,
        a.duracao_minutos AS durationMinutes,
          a.preco AS price,
          a.status,
          a.observacoes AS notes,
          a.created_at AS createdAt,
          a.updated_at AS updatedAt
        FROM agendamentos a
        INNER JOIN servicos s ON s.id = a.servico_id
        INNER JOIN profissionais p ON p.id = a.profissional_id
        WHERE ${filters.join(" AND ")}
        ORDER BY a.data_agendamento DESC, a.horario_inicio DESC
      `,
      values
    );

    return res.json({ appointments: result.rows.map(mapAppointment) });
  } catch (error) {
    next(error);
  }
}

async function updateAppointment(req, res, next) {
  const appointmentId = Number(req.params.id);

  try {
    const appointmentResult = await db.query(
      `
        SELECT
          id,
          empresa_id,
          servico_id,
          profissional_id,
          cliente_nome,
          cliente_telefone,
          cliente_email,
          data_agendamento,
          horario_inicio,
          horario_fim,
          DATE(fim_em) AS data_fim_agendamento,
          inicio_em,
          fim_em,
          status,
          observacoes
        FROM agendamentos
        WHERE id = ? AND empresa_id = ?
      `,
      [appointmentId, req.user.empresaId]
    );

    if (appointmentResult.rowCount === 0) {
      throw new AppError("Agendamento não encontrado para esta empresa.", 404);
    }

    const current = appointmentResult.rows[0];

    const nextServiceId = Number(req.body.serviceId || current.servico_id);
    const nextProfessionalId = Number(req.body.professionalId || current.profissional_id);
    const nextDate = req.body.appointmentDate || current.data_agendamento;
    const requestedStartTime = req.body.startTime !== undefined ? req.body.startTime : null;
    const nextStartTime = requestedStartTime || current.horario_inicio;
    const nextStatus = req.body.status || current.status;
    const nextClientName = req.body.clientName || current.cliente_nome;
    const nextClientPhone = req.body.clientPhone || current.cliente_telefone;
    const nextClientEmail =
      req.body.clientEmail !== undefined ? req.body.clientEmail : current.cliente_email;
    const nextNotes = req.body.notes !== undefined ? req.body.notes : current.observacoes;

    if (!VALID_APPOINTMENT_STATUSES.includes(nextStatus)) {
      throw new AppError("Status de agendamento inválido.", 422);
    }

    if (!isNonEmptyString(nextClientName) || !isNonEmptyString(nextClientPhone)) {
      throw new AppError("Nome e telefone do cliente são obrigatórios.", 422);
    }

    if (!isValidDate(nextDate)) {
      throw new AppError("Data invalida.", 422);
    }

    if (nextClientEmail && !isValidEmail(nextClientEmail)) {
      throw new AppError("Informe um e-mail válido para o cliente.", 422);
    }

    const service = await getServiceByCompany(req.user.empresaId, nextServiceId);
    const professional = await getProfessionalByCompany(req.user.empresaId, nextProfessionalId);

    const schedulingMeta = buildSchedulingMeta(service.duracao_minutos);
    let schedule = {
      startTime: nextStartTime,
      endTime: current.horario_fim,
      endDate: current.data_fim_agendamento || current.data_agendamento,
      startDateTime: current.inicio_em,
      endDateTime: current.fim_em,
    };

    if (schedulingMeta.requiresTimeSelection && !hasRequiredValue(nextStartTime)) {
      throw new AppError("Escolha um horario para concluir o agendamento.", 422);
    }

    if (hasRequiredValue(nextStartTime) && !isValidTime(nextStartTime)) {
      throw new AppError("Horario invalido.", 422);
    }

    if (nextStatus !== "cancelado") {
      if (nextStatus === "agendado" && isDateInPast(nextDate)) {
        throw new AppError("Não é permitido reagendar para uma data passada.", 422);
      }

      let appointments = [];
      if (!schedulingMeta.requiresTimeSelection && !hasRequiredValue(requestedStartTime)) {
        const queryWindow = resolveLongDurationQueryWindow(
          professional.disponibilidade || {},
          nextDate,
          service.duracao_minutos
        );

        if (queryWindow) {
          appointments = await getOverlappingAppointmentsByProfessional(
            req.user.empresaId,
            professional.id,
            queryWindow.startDateTime,
            queryWindow.endDateTime,
            appointmentId
          );
        }
      } else {
        const provisionalStartTime =
          requestedStartTime ||
          getIntervalsForDate(professional.disponibilidade || {}, nextDate)[0]?.start ||
          current.horario_inicio;

        if (provisionalStartTime) {
          const candidateWindow = buildScheduleWindow(
            nextDate,
            provisionalStartTime,
            service.duracao_minutos
          );

          appointments = await getOverlappingAppointmentsByProfessional(
            req.user.empresaId,
            professional.id,
            candidateWindow.startDateTime,
            candidateWindow.endDateTime,
            appointmentId
          );
        }
      }

      schedule = assertScheduleAvailable({
        availability: professional.disponibilidade || {},
        date: nextDate,
        startTime:
          requestedStartTime ||
          (schedulingMeta.requiresTimeSelection ? current.horario_inicio : undefined),
        duration: service.duracao_minutos,
        appointments,
        ignoreAppointmentId: appointmentId,
      });
    }

    const result = await db.query(
      `
        UPDATE agendamentos
        SET
          servico_id = ?,
          profissional_id = ?,
          cliente_nome = ?,
          cliente_telefone = ?,
          cliente_email = ?,
          data_agendamento = ?,
          horario_inicio = ?,
          horario_fim = ?,
          inicio_em = ?,
          fim_em = ?,
          duracao_minutos = ?,
          preco = ?,
          status = ?,
          observacoes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND empresa_id = ?
      `,
      [
        service.id,
        professional.id,
        nextClientName.trim(),
        nextClientPhone.trim(),
        nextClientEmail?.trim() || null,
        nextDate,
        schedule.startTime,
        schedule.endTime,
        schedule.startDateTime,
        schedule.endDateTime,
        service.duracao_minutos,
        service.preco,
        nextStatus,
        nextNotes?.trim() || null,
        appointmentId,
        req.user.empresaId,
      ]
    );

    if (result.rowCount === 0) {
      throw new AppError("Agendamento não encontrado para esta empresa.", 404);
    }

    return res.json({
      message: "Agendamento atualizado com sucesso.",
      appointment: mapAppointment(await loadHydratedAppointment(appointmentId)),
    });
  } catch (error) {
    next(error);
  }
}

async function cancelAppointment(req, res, next) {
  try {
    const result = await db.query(
      `
        UPDATE agendamentos
        SET status = 'cancelado', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND empresa_id = ?
      `,
      [Number(req.params.id), req.user.empresaId]
    );

    if (result.rowCount === 0) {
      throw new AppError("Agendamento não encontrado para esta empresa.", 404);
    }

    return res.json({ message: "Agendamento cancelado com sucesso." });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listAppointments,
  updateAppointment,
  cancelAppointment,
};
