const db = require("../config/database");
const { AppError } = require("../utils/errors");
const {
  assertRequiredFields,
  isValidEmail,
  sanitizeAvailability,
} = require("../utils/validation");
const { parseJsonObject, toBoolean } = require("../utils/formatters");

function mapProfessional(row) {
  return {
    id: row.id,
    name: row.name,
    specialty: row.specialty,
    email: row.email,
    phone: row.phone,
    availability: parseJsonObject(row.availability),
    active: toBoolean(row.active),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function loadProfessionalById(professionalId, companyId) {
  const result = await db.query(
    `
      SELECT
        id,
        nome AS name,
        especialidade AS specialty,
        email,
        telefone AS phone,
        disponibilidade AS availability,
        ativo AS active,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM profissionais
      WHERE id = ? AND empresa_id = ?
    `,
    [professionalId, companyId]
  );

  return result.rows[0] || null;
}

async function listProfessionals(req, res, next) {
  try {
    const result = await db.query(
      `
        SELECT
          id,
          nome AS name,
          especialidade AS specialty,
          email,
          telefone AS phone,
          disponibilidade AS availability,
          ativo AS active,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM profissionais
        WHERE empresa_id = ?
        ORDER BY nome
      `,
      [req.user.empresaId]
    );

    return res.json({ professionals: result.rows.map(mapProfessional) });
  } catch (error) {
    next(error);
  }
}

async function createProfessional(req, res, next) {
  const { name, specialty, email, phone, availability } = req.body;

  try {
    assertRequiredFields(req.body, ["name"]);

    if (email && !isValidEmail(email)) {
      throw new AppError("Informe um e-mail válido para o profissional.", 422);
    }

    const sanitizedAvailability = sanitizeAvailability(availability);

    const result = await db.query(
      `
        INSERT INTO profissionais (
          empresa_id,
          nome,
          especialidade,
          email,
          telefone,
          disponibilidade
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        req.user.empresaId,
        name.trim(),
        specialty?.trim() || null,
        email?.trim() || null,
        phone?.trim() || null,
        JSON.stringify(sanitizedAvailability),
      ]
    );

    const professional = await loadProfessionalById(result.insertId, req.user.empresaId);

    return res.status(201).json({
      message: "Profissional cadastrado com sucesso.",
      professional: mapProfessional(professional),
    });
  } catch (error) {
    next(error);
  }
}

async function updateProfessional(req, res, next) {
  const { id } = req.params;
  const { name, specialty, email, phone, availability, active } = req.body;

  try {
    assertRequiredFields(req.body, ["name"]);

    if (email && !isValidEmail(email)) {
      throw new AppError("Informe um e-mail válido para o profissional.", 422);
    }

    const sanitizedAvailability = sanitizeAvailability(availability);

    const result = await db.query(
      `
        UPDATE profissionais
        SET
          nome = ?,
          especialidade = ?,
          email = ?,
          telefone = ?,
          disponibilidade = ?,
          ativo = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND empresa_id = ?
      `,
      [
        name.trim(),
        specialty?.trim() || null,
        email?.trim() || null,
        phone?.trim() || null,
        JSON.stringify(sanitizedAvailability),
        active !== false ? 1 : 0,
        Number(id),
        req.user.empresaId,
      ]
    );

    if (result.rowCount === 0) {
      throw new AppError("Profissional não encontrado para esta empresa.", 404);
    }

    const professional = await loadProfessionalById(Number(id), req.user.empresaId);

    return res.json({
      message: "Profissional atualizado com sucesso.",
      professional: mapProfessional(professional),
    });
  } catch (error) {
    next(error);
  }
}

async function updateAvailability(req, res, next) {
  const { id } = req.params;
  const { availability } = req.body;

  try {
    const sanitizedAvailability = sanitizeAvailability(availability);

    const result = await db.query(
      `
        UPDATE profissionais
        SET disponibilidade = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND empresa_id = ?
      `,
      [JSON.stringify(sanitizedAvailability), Number(id), req.user.empresaId]
    );

    if (result.rowCount === 0) {
      throw new AppError("Profissional não encontrado para esta empresa.", 404);
    }

    const professional = await loadProfessionalById(Number(id), req.user.empresaId);

    return res.json({
      message: "Disponibilidade atualizada com sucesso.",
      professional: mapProfessional(professional),
    });
  } catch (error) {
    next(error);
  }
}

async function deactivateProfessional(req, res, next) {
  try {
    const result = await db.query(
      `
        UPDATE profissionais
        SET ativo = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND empresa_id = ?
      `,
      [Number(req.params.id), req.user.empresaId]
    );

    if (result.rowCount === 0) {
      throw new AppError("Profissional não encontrado para esta empresa.", 404);
    }

    return res.json({ message: "Profissional desativado com sucesso." });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listProfessionals,
  createProfessional,
  updateProfessional,
  updateAvailability,
  deactivateProfessional,
};
