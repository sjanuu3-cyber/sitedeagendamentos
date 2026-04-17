const db = require("../config/database");
const { AppError } = require("../utils/errors");
const {
  assertRequiredFields,
  isValidEmail,
  sanitizeAvailability,
} = require("../utils/validation");

function mapProfessional(row) {
  return {
    id: row.id,
    name: row.name,
    specialty: row.specialty,
    email: row.email,
    phone: row.phone,
    availability: row.availability || {},
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function listProfessionals(req, res, next) {
  try {
    const result = await db.query(
      `
        SELECT
          id,
          nome AS "name",
          especialidade AS "specialty",
          email,
          telefone AS "phone",
          disponibilidade AS "availability",
          ativo AS "active",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM profissionais
        WHERE empresa_id = $1
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
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        RETURNING
          id,
          nome AS "name",
          especialidade AS "specialty",
          email,
          telefone AS "phone",
          disponibilidade AS "availability",
          ativo AS "active",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
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

    return res.status(201).json({
      message: "Profissional cadastrado com sucesso.",
      professional: mapProfessional(result.rows[0]),
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
          nome = $1,
          especialidade = $2,
          email = $3,
          telefone = $4,
          disponibilidade = $5::jsonb,
          ativo = $6,
          updated_at = NOW()
        WHERE id = $7 AND empresa_id = $8
        RETURNING
          id,
          nome AS "name",
          especialidade AS "specialty",
          email,
          telefone AS "phone",
          disponibilidade AS "availability",
          ativo AS "active",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        name.trim(),
        specialty?.trim() || null,
        email?.trim() || null,
        phone?.trim() || null,
        JSON.stringify(sanitizedAvailability),
        active !== false,
        Number(id),
        req.user.empresaId,
      ]
    );

    if (result.rowCount === 0) {
      throw new AppError("Profissional não encontrado para esta empresa.", 404);
    }

    return res.json({
      message: "Profissional atualizado com sucesso.",
      professional: mapProfessional(result.rows[0]),
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
        SET disponibilidade = $1::jsonb, updated_at = NOW()
        WHERE id = $2 AND empresa_id = $3
        RETURNING
          id,
          nome AS "name",
          especialidade AS "specialty",
          email,
          telefone AS "phone",
          disponibilidade AS "availability",
          ativo AS "active",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [JSON.stringify(sanitizedAvailability), Number(id), req.user.empresaId]
    );

    if (result.rowCount === 0) {
      throw new AppError("Profissional não encontrado para esta empresa.", 404);
    }

    return res.json({
      message: "Disponibilidade atualizada com sucesso.",
      professional: mapProfessional(result.rows[0]),
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
        SET ativo = FALSE, updated_at = NOW()
        WHERE id = $1 AND empresa_id = $2
        RETURNING id
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
