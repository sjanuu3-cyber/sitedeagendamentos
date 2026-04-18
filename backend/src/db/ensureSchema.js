const db = require("../config/database");

async function hasColumn(tableName, columnName) {
  const result = await db.query(
    `
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1
    `,
    [tableName, columnName]
  );

  return result.rowCount > 0;
}

async function hasIndex(tableName, indexName) {
  const result = await db.query(
    `
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
      LIMIT 1
    `,
    [tableName, indexName]
  );

  return result.rowCount > 0;
}

async function ensureAppointmentPeriodColumns() {
  const alterations = [];

  if (!(await hasColumn("agendamentos", "inicio_em"))) {
    alterations.push("ADD COLUMN inicio_em DATETIME NULL AFTER horario_fim");
  }

  if (!(await hasColumn("agendamentos", "fim_em"))) {
    alterations.push("ADD COLUMN fim_em DATETIME NULL AFTER inicio_em");
  }

  if (alterations.length > 0) {
    await db.query(`ALTER TABLE agendamentos ${alterations.join(", ")}`);
  }

  if (!(await hasIndex("agendamentos", "idx_agendamentos_profissional_periodo"))) {
    await db.query(
      `
        ALTER TABLE agendamentos
        ADD INDEX idx_agendamentos_profissional_periodo (
          empresa_id,
          profissional_id,
          inicio_em,
          fim_em
        )
      `
    );
  }

  await db.query(
    `
      UPDATE agendamentos
      SET
        inicio_em = COALESCE(
          inicio_em,
          STR_TO_DATE(
            CONCAT(data_agendamento, ' ', TIME_FORMAT(horario_inicio, '%H:%i:%s')),
            '%Y-%m-%d %H:%i:%s'
          )
        ),
        fim_em = COALESCE(
          fim_em,
          CASE
            WHEN TIME_TO_SEC(horario_fim) <= TIME_TO_SEC(horario_inicio)
              THEN DATE_ADD(
                STR_TO_DATE(
                  CONCAT(data_agendamento, ' ', TIME_FORMAT(horario_fim, '%H:%i:%s')),
                  '%Y-%m-%d %H:%i:%s'
                ),
                INTERVAL 1 DAY
              )
            ELSE STR_TO_DATE(
              CONCAT(data_agendamento, ' ', TIME_FORMAT(horario_fim, '%H:%i:%s')),
              '%Y-%m-%d %H:%i:%s'
            )
          END
        )
      WHERE inicio_em IS NULL OR fim_em IS NULL
    `
  );
}

async function ensureSchema() {
  await ensureAppointmentPeriodColumns();
}

module.exports = {
  ensureSchema,
};
