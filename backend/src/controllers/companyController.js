const db = require("../config/database");
const {
  buildAvailableSlots,
  buildLongDurationSlot,
  assertScheduleAvailable,
  getIntervalsForDate,
  resolveLongDurationQueryWindow,
} = require("../services/appointmentSchedulingService");
const { getOverlappingAppointmentsByProfessional } = require("../services/appointmentQueryService");
const {
  getCompanyBySlug,
  getProfessionalByCompany,
  getServiceByCompany,
} = require("../services/schedulingService");
const { AppError } = require("../utils/errors");
const {
  assertRequiredFields,
  hasRequiredValue,
  isValidDate,
  isValidEmail,
  isValidTime,
} = require("../utils/validation");
const {
  formatDateValue,
  formatTimeValue,
  parseJsonObject,
} = require("../utils/formatters");
const { isDateInPast } = require("../utils/time");
const { buildDayWindow, buildScheduleWindow, buildSchedulingMeta } = require("../utils/scheduling");

function mapCompany(row) {
  return {
    id: row.id,
    name: row.nome_fantasia,
    slug: row.slug,
    segment: row.segmento,
    email: row.email_contato,
    phone: row.telefone,
  };
}

function mapService(row) {
  return {
    id: row.id,
    name: row.name,
    durationMinutes: row.durationMinutes,
    price: Number(row.price),
    description: row.description,
    ...buildSchedulingMeta(row.durationMinutes),
  };
}

function mapProfessional(row) {
  return {
    id: row.id,
    name: row.name,
    specialty: row.specialty,
    email: row.email,
    phone: row.phone,
    availability: parseJsonObject(row.availability),
  };
}

function mapAppointment(row) {
  return {
    id: row.id,
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
    ...buildSchedulingMeta(row.durationMinutes),
  };
}

async function listCompanies(req, res, next) {
  try {
    const result = await db.query(
      `
        SELECT id, nome_fantasia, slug, segmento, email_contato, telefone
        FROM empresas
        ORDER BY nome_fantasia
      `
    );

    return res.json({
      companies: result.rows.map(mapCompany),
    });
  } catch (error) {
    next(error);
  }
}

async function getCompanyCatalog(req, res, next) {
  try {
    const company = await getCompanyBySlug(req.params.slug);

    const [servicesResult, professionalsResult] = await Promise.all([
      db.query(
        `
          SELECT
            id,
            nome AS name,
            duracao_minutos AS durationMinutes,
            preco AS price,
            descricao AS description
          FROM servicos
          WHERE empresa_id = ? AND ativo = 1
          ORDER BY nome
        `,
        [company.id]
      ),
      db.query(
        `
          SELECT
            id,
            nome AS name,
            especialidade AS specialty,
            email,
            telefone AS phone,
            disponibilidade AS availability
          FROM profissionais
          WHERE empresa_id = ? AND ativo = 1
          ORDER BY nome
        `,
        [company.id]
      ),
    ]);

    return res.json({
      company: mapCompany(company),
      services: servicesResult.rows.map(mapService),
      professionals: professionalsResult.rows.map(mapProfessional),
    });
  } catch (error) {
    next(error);
  }
}

async function getAvailability(req, res, next) {
  const { serviceId, professionalId, date } = req.query;

  try {
    if (!serviceId || !professionalId || !date) {
      throw new AppError(
        "Informe serviceId, professionalId e date para consultar os horários disponíveis.",
        422
      );
    }

    if (!isValidDate(date)) {
      throw new AppError("A data informada é inválida.", 422);
    }

    if (isDateInPast(date)) {
      throw new AppError("Não é possível agendar em datas passadas.", 422);
    }

    const company = await getCompanyBySlug(req.params.slug);
    const service = await getServiceByCompany(company.id, Number(serviceId), {
      activeOnly: true,
    });
    const professional = await getProfessionalByCompany(company.id, Number(professionalId), {
      activeOnly: true,
    });

    const schedulingMeta = buildSchedulingMeta(service.duracao_minutos);
    let slots = [];

    if (schedulingMeta.requiresTimeSelection) {
      const dayWindow = buildDayWindow(date);
      const appointments = await getOverlappingAppointmentsByProfessional(
        company.id,
        professional.id,
        dayWindow.startDateTime,
        dayWindow.endDateTime
      );

      slots = buildAvailableSlots({
        availability: professional.disponibilidade || {},
        date,
        duration: service.duracao_minutos,
        appointments,
      });
    } else {
      const queryWindow = resolveLongDurationQueryWindow(
        professional.disponibilidade || {},
        date,
        service.duracao_minutos
      );

      if (queryWindow) {
        const appointments = await getOverlappingAppointmentsByProfessional(
          company.id,
          professional.id,
          queryWindow.startDateTime,
          queryWindow.endDateTime
        );

        slots = buildLongDurationSlot({
          availability: professional.disponibilidade || {},
          date,
          duration: service.duracao_minutos,
          appointments,
        });
      }
    }

    return res.json({
      company: mapCompany(company),
      service: {
        id: service.id,
        name: service.nome,
        durationMinutes: service.duracao_minutos,
        price: Number(service.preco),
        ...schedulingMeta,
      },
      professional: {
        id: professional.id,
        name: professional.nome,
      },
      date,
      slots,
      ...schedulingMeta,
    });
  } catch (error) {
    next(error);
  }
}

async function createAppointment(req, res, next) {
  const {
    serviceId,
    professionalId,
    appointmentDate,
    startTime,
    clientName,
    clientPhone,
    clientEmail,
    notes,
  } = req.body;

  try {
    assertRequiredFields(req.body, [
      "serviceId",
      "professionalId",
      "appointmentDate",
      "clientName",
      "clientPhone",
    ]);

    if (!isValidDate(appointmentDate)) {
      throw new AppError("Data invalida.", 422);
    }

    if (clientEmail && !isValidEmail(clientEmail)) {
      throw new AppError("Informe um e-mail válido para o cliente.", 422);
    }

    if (isDateInPast(appointmentDate)) {
      throw new AppError("Não é possível agendar em datas passadas.", 422);
    }

    const company = await getCompanyBySlug(req.params.slug);
    const service = await getServiceByCompany(company.id, Number(serviceId), {
      activeOnly: true,
    });
    const professional = await getProfessionalByCompany(company.id, Number(professionalId), {
      activeOnly: true,
    });

    const schedulingMeta = buildSchedulingMeta(service.duracao_minutos);

    if (schedulingMeta.requiresTimeSelection && !hasRequiredValue(startTime)) {
      throw new AppError("Escolha um horario para concluir o agendamento.", 422);
    }

    if (hasRequiredValue(startTime) && !isValidTime(startTime)) {
      throw new AppError("Horario invalido.", 422);
    }

    let appointments = [];

    if (!schedulingMeta.requiresTimeSelection && !hasRequiredValue(startTime)) {
      const queryWindow = resolveLongDurationQueryWindow(
        professional.disponibilidade || {},
        appointmentDate,
        service.duracao_minutos
      );

      if (queryWindow) {
        appointments = await getOverlappingAppointmentsByProfessional(
          company.id,
          professional.id,
          queryWindow.startDateTime,
          queryWindow.endDateTime
        );
      }
    } else {
      const provisionalStartTime =
        startTime ||
        getIntervalsForDate(professional.disponibilidade || {}, appointmentDate)[0]?.start;

      if (provisionalStartTime) {
        const candidateWindow = buildScheduleWindow(
          appointmentDate,
          provisionalStartTime,
          service.duracao_minutos
        );

        appointments = await getOverlappingAppointmentsByProfessional(
          company.id,
          professional.id,
          candidateWindow.startDateTime,
          candidateWindow.endDateTime
        );
      }
    }

    const schedule = assertScheduleAvailable({
      availability: professional.disponibilidade || {},
      date: appointmentDate,
      startTime,
      duration: service.duracao_minutos,
      appointments,
    });

    const result = await db.query(
      `
        INSERT INTO agendamentos (
          empresa_id,
          servico_id,
          profissional_id,
          cliente_nome,
          cliente_telefone,
          cliente_email,
          data_agendamento,
          horario_inicio,
          horario_fim,
          inicio_em,
          fim_em,
          duracao_minutos,
          preco,
          status,
          observacoes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'agendado', ?)
      `,
      [
        company.id,
        service.id,
        professional.id,
        clientName.trim(),
        clientPhone.trim(),
        clientEmail?.trim() || null,
        appointmentDate,
        schedule.startTime,
        schedule.endTime,
        schedule.startDateTime,
        schedule.endDateTime,
        service.duracao_minutos,
        service.preco,
        notes?.trim() || null,
      ]
    );

    return res.status(201).json({
      message: "Agendamento realizado com sucesso.",
      appointment: mapAppointment({
        id: result.insertId,
        serviceId: service.id,
        serviceName: service.nome,
        professionalId: professional.id,
        professionalName: professional.nome,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail?.trim() || null,
        appointmentDate,
        endDate: schedule.endDate,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        durationMinutes: service.duracao_minutos,
        price: service.preco,
        status: "agendado",
        notes: notes?.trim() || null,
      }),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listCompanies,
  getCompanyCatalog,
  getAvailability,
  createAppointment,
};
