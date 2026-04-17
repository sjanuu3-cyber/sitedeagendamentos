const db = require("../config/database");
const { AppError } = require("../utils/errors");
const { parseJsonObject } = require("../utils/formatters");

async function getCompanyBySlug(slug) {
  const result = await db.query(
    `
      SELECT id, nome_fantasia, slug, segmento, email_contato, telefone
      FROM empresas
      WHERE slug = ?
    `,
    [slug]
  );

  if (result.rowCount === 0) {
    throw new AppError("Empresa não encontrada.", 404);
  }

  return result.rows[0];
}

async function getServiceByCompany(empresaId, serviceId, options = {}) {
  const { activeOnly = false } = options;
  const clauses = ["empresa_id = ?", "id = ?"];

  if (activeOnly) {
    clauses.push("ativo = 1");
  }

  const result = await db.query(
    `
      SELECT id, empresa_id, nome, duracao_minutos, preco, descricao, ativo
      FROM servicos
      WHERE ${clauses.join(" AND ")}
    `,
    [empresaId, serviceId]
  );

  if (result.rowCount === 0) {
    throw new AppError("Serviço não encontrado para esta empresa.", 404);
  }

  return result.rows[0];
}

async function getProfessionalByCompany(empresaId, professionalId, options = {}) {
  const { activeOnly = false } = options;
  const clauses = ["empresa_id = ?", "id = ?"];

  if (activeOnly) {
    clauses.push("ativo = 1");
  }

  const result = await db.query(
    `
      SELECT id, empresa_id, nome, especialidade, email, telefone, disponibilidade, ativo
      FROM profissionais
      WHERE ${clauses.join(" AND ")}
    `,
    [empresaId, professionalId]
  );

  if (result.rowCount === 0) {
    throw new AppError("Profissional não encontrado para esta empresa.", 404);
  }

  return {
    ...result.rows[0],
    disponibilidade: parseJsonObject(result.rows[0].disponibilidade),
  };
}

async function getAppointmentsByProfessional(
  empresaId,
  professionalId,
  appointmentDate,
  excludeAppointmentId = null
) {
  const values = [empresaId, professionalId, appointmentDate];
  let whereClause = `
    empresa_id = ?
    AND profissional_id = ?
    AND data_agendamento = ?
    AND status <> 'cancelado'
  `;

  if (excludeAppointmentId) {
    values.push(excludeAppointmentId);
    whereClause += " AND id <> ?";
  }

  const result = await db.query(
    `
      SELECT id, horario_inicio, horario_fim, status
      FROM agendamentos
      WHERE ${whereClause}
      ORDER BY horario_inicio
    `,
    values
  );

  return result.rows;
}

module.exports = {
  getCompanyBySlug,
  getServiceByCompany,
  getProfessionalByCompany,
  getAppointmentsByProfessional,
};
