function errorHandler(error, req, res, next) {
  if (error.code === "23505") {
    return res.status(409).json({
      message: "Já existe um registro com os mesmos dados únicos.",
      details: error.detail || null,
    });
  }

  if (error.code === "23503") {
    return res.status(409).json({
      message: "Não foi possível concluir a operação por causa de relacionamentos existentes.",
      details: error.detail || null,
    });
  }

  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      message: "Ja existe um registro com os mesmos dados unicos.",
      details: error.sqlMessage || null,
    });
  }

  if (error.code === "ER_NO_REFERENCED_ROW_2" || error.code === "ER_ROW_IS_REFERENCED_2") {
    return res.status(409).json({
      message: "Nao foi possivel concluir a operacao por causa de relacionamentos existentes.",
      details: error.sqlMessage || null,
    });
  }

  if (error.name === "AppError") {
    return res.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
  }

  console.error(error);

  return res.status(500).json({
    message: "Erro interno do servidor.",
  });
}

module.exports = {
  errorHandler,
};
