const db = require("../config/database");
const { AppError } = require("../utils/errors");
const {
  assertRequiredFields,
  isNonEmptyString,
  isNonNegativeNumber,
  isPositiveInteger,
} = require("../utils/validation");

function mapService(row) {
  return {
    id: row.id,
    name: row.name,
    durationMinutes: row.durationMinutes,
    price: Number(row.price),
    description: row.description,
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function listServices(req, res, next) {
  try {
    const result = await db.query(
      `
        SELECT
          id,
          nome AS "name",
          duracao_minutos AS "durationMinutes",
          preco AS "price",
          descricao AS "description",
          ativo AS "active",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM servicos
        WHERE empresa_id = $1
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
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          nome AS "name",
          duracao_minutos AS "durationMinutes",
          preco AS "price",
          descricao AS "description",
          ativo AS "active",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        req.user.empresaId,
        name.trim(),
        Number(durationMinutes),
        Number(price),
        description?.trim() || null,
      ]
    );

    return res.status(201).json({
      message: "Serviço cadastrado com sucesso.",
      service: mapService(result.rows[0]),
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
          nome = $1,
          duracao_minutos = $2,
          preco = $3,
          descricao = $4,
          ativo = $5,
          updated_at = NOW()
        WHERE id = $6 AND empresa_id = $7
        RETURNING
          id,
          nome AS "name",
          duracao_minutos AS "durationMinutes",
          preco AS "price",
          descricao AS "description",
          ativo AS "active",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        name.trim(),
        Number(durationMinutes),
        Number(price),
        description?.trim() || null,
        active !== false,
        Number(id),
        req.user.empresaId,
      ]
    );

    if (result.rowCount === 0) {
      throw new AppError("Serviço não encontrado para esta empresa.", 404);
    }

    return res.json({
      message: "Serviço atualizado com sucesso.",
      service: mapService(result.rows[0]),
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
        SET ativo = FALSE, updated_at = NOW()
        WHERE id = $1 AND empresa_id = $2
        RETURNING id
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
