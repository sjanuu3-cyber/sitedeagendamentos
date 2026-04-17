const db = require("../config/database");
const {
  buildAvailableSlots,
  assertScheduleAvailable,
} = require("../services/availabilityService");
const {
  getAppointmentsByProfessional,
  getCompanyBySlug,
  getProfessionalByCompany,
  getServiceByCompany,
} = require("../services/schedulingService");
const { AppError } = require("../utils/errors");
const {
  assertRequiredFields,
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
    startTime: formatTimeValue(row.startTime),
    endTime: formatTimeValue(row.endTime),
    durationMinutes: row.durationMinutes,
    price: Number(row.price),
    status: row.status,
    notes: row.notes,
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

    const appointments = await getAppointmentsByProfessional(
      company.id,
      professional.id,
      date
    );

    const slots = buildAvailableSlots({
      availability: professional.disponibilidade || {},
      date,
      duration: service.duracao_minutos,
      appointments,
    });

    return res.json({
      company: mapCompany(company),
      service: {
        id: service.id,
        name: service.nome,
        durationMinutes: service.duracao_minutos,
        price: Number(service.preco),
      },
      professional: {
        id: professional.id,
        name: professional.nome,
      },
      date,
      slots,
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
      "startTime",
      "clientName",
      "clientPhone",
    ]);

    if (!isValidDate(appointmentDate) || !isValidTime(startTime)) {
      throw new AppError("Data ou horário inválidos.", 422);
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

    const appointments = await getAppointmentsByProfessional(
      company.id,
      professional.id,
      appointmentDate
    );

    const { endTime } = assertScheduleAvailable({
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
          duracao_minutos,
          preco,
          status,
          observacoes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'agendado', ?)
      `,
      [
        company.id,
        service.id,
        professional.id,
        clientName.trim(),
        clientPhone.trim(),
        clientEmail?.trim() || null,
        appointmentDate,
        startTime,
        endTime,
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
        startTime,
        endTime,
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
