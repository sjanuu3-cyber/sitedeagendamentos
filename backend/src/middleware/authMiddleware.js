const jwt = require("jsonwebtoken");
const { AppError } = require("../utils/errors");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [, token] = authHeader.split(" ");

  if (!token) {
    return next(new AppError("Token de autenticação não enviado.", 401));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: payload.userId,
      empresaId: payload.empresaId,
      role: payload.role,
    };

    return next();
  } catch (error) {
    return next(new AppError("Token inválido ou expirado.", 401));
  }
}

module.exports = {
  authenticate,
};
