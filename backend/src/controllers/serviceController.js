const db = require("../config/database");
const { AppError } = require("../utils/errors");
const { buildSchedulingMeta } = require("../utils/scheduling");
const {
  assertRequiredFields,
  isNonEmptyString,
  isNonNegativeNumber,
  isPositiveInteger,
} = require("../utils/validation");
const { toBoolean } = require("../utils/formatters");

function mapService(row) {
  return {
    id: row.id,
    name: row.name,
    durationMinutes: row.durationMinutes,
    price: Number(row.price),
    description: row.description,
    active: toBoolean(row.active),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...buildSchedulingMeta(row.durationMinutes),
  };
}

async function loadServiceById(serviceId, companyId) {
  const result = await db.query(
    `
      SELECT
        id,
        nome AS name,
        duracao_minutos AS durationMinutes,
        preco AS price,
        descricao AS description,
        ativo AS active,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM servicos
      WHERE id = ? AND empresa_id = ?
    `,
    [serviceId, companyId]
  );

  return result.rows[0] || null;
}

async function listServices(req, res, next) {
  try {
    const result = await db.query(
      `
        SELECT
          id,
          nome AS name,
          duracao_minutos AS durationMinutes,
          preco AS price,
          descricao AS description,
          ativo AS active,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM servicos
        WHERE empresa_id = ?
        ORDER BY nome
      `,
      [req.user.empresaId]
    );

    return res.json({ services: result.rows.map(mapService) });
  } catch (error) {
    next(error);
  }
}

async function createService(req, res, next) {
  const { name, durationMinutes, price, description } = req.body;

  try {
    assertRequiredFields(req.body, ["name", "durationMinutes", "price"]);

    if (!isPositiveInteger(durationMinutes)) {
      throw new AppError("A duração do serviço deve ser um número inteiro positivo.", 422);
    }

    if (!isNonNegativeNumber(price)) {
      throw new AppError("O preço do serviço deve ser zero ou maior.", 422);
    }

    if (!isNonEmptyString(name)) {
      throw new AppError("O nome do serviço é obrigatório.", 422);
    }

    const result = await db.query(
      `
        INSERT INTO servicos (empresa_id, nome, duracao_minutos, preco, descricao)
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        req.user.empresaId,
        name.trim(),
        Number(durationMinutes),
        Number(price),
        description?.trim() || null,
      ]
    );

    const service = await loadServiceById(result.insertId, req.user.empresaId);

    return res.status(201).json({
      message: "Serviço cadastrado com sucesso.",
      service: mapService(service),
    });
  } catch (error) {
    next(error);
  }
}

async function updateService(req, res, next) {
  const { id } = req.params;
  const { name, durationMinutes, price, description, active } = req.body;

  try {
    assertRequiredFields(req.body, ["name", "durationMinutes", "price"]);

    if (!isPositiveInteger(durationMinutes)) {
      throw new AppError("A duração do serviço deve ser um número inteiro positivo.", 422);
    }

    if (!isNonNegativeNumber(price)) {
      throw new AppError("O preço do serviço deve ser zero ou maior.", 422);
    }

    const result = await db.query(
      `
        UPDATE servicos
        SET
          nome = ?,
          duracao_minutos = ?,
          preco = ?,
          descricao = ?,
          ativo = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND empresa_id = ?
      `,
      [
        name.trim(),
        Number(durationMinutes),
        Number(price),
        description?.trim() || null,
        active !== false ? 1 : 0,
        Number(id),
        req.user.empresaId,
      ]
    );

    if (result.rowCount === 0) {
      throw new AppError("Serviço não encontrado para esta empresa.", 404);
    }

    const service = await loadServiceById(Number(id), req.user.empresaId);

    return res.json({
      message: "Serviço atualizado com sucesso.",
      service: mapService(service),
    });
  } catch (error) {
    next(error);
  }
}

async function deactivateService(req, res, next) {
  try {
    const result = await db.query(
      `
        UPDATE servicos
        SET ativo = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND empresa_id = ?
      `,
      [Number(req.params.id), req.user.empresaId]
    );

    if (result.rowCount === 0) {
      throw new AppError("Serviço não encontrado para esta empresa.", 404);
    }

    return res.json({ message: "Serviço desativado com sucesso." });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listServices,
  createService,
  updateService,
  deactivateService,
};
