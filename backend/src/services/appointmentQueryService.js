const db = require("../config/database");

async function getOverlappingAppointmentsByProfessional(
  empresaId,
  professionalId,
  rangeStart,
  rangeEnd,
  excludeAppointmentId = null
) {
  const values = [empresaId, professionalId, rangeEnd, rangeStart];
  const filters = [
    "empresa_id = ?",
    "profissional_id = ?",
    "inicio_em < ?",
    "fim_em > ?",
    "status <> 'cancelado'",
  ];

  if (excludeAppointmentId) {
    filters.push("id <> ?");
    values.push(excludeAppointmentId);
  }

  const result = await db.query(
    `
      SELECT id, horario_inicio, horario_fim, inicio_em, fim_em, status
      FROM agendamentos
      WHERE ${filters.join(" AND ")}
      ORDER BY inicio_em
    `,
    values
  );

  return result.rows;
}

module.exports = {
  getOverlappingAppointmentsByProfessional,
};
