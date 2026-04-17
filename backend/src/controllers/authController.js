const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/database");
const { AppError } = require("../utils/errors");
const {
  assertRequiredFields,
  isValidEmail,
  normalizeSlug,
  validatePassword,
  validateSegment,
} = require("../utils/validation");

function buildAuthPayload(row) {
  const token = jwt.sign(
    {
      userId: row.user_id,
      empresaId: row.empresa_id,
      role: row.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    }
  );

  return {
    token,
    user: {
      id: row.user_id,
      name: row.user_name,
      email: row.user_email,
      role: row.role,
    },
    company: {
      id: row.empresa_id,
      name: row.company_name,
      slug: row.slug,
      segment: row.segmento,
      email: row.email_contato,
      phone: row.telefone,
    },
  };
}

async function register(req, res, next) {
  const {
    companyName,
    companySlug,
    segment,
    companyEmail,
    phone,
    adminName,
    adminEmail,
    password,
  } = req.body;

  try {
    assertRequiredFields(req.body, [
      "companyName",
      "segment",
      "companyEmail",
      "adminName",
      "adminEmail",
      "password",
    ]);

    validateSegment(segment);
    validatePassword(password);

    if (!isValidEmail(companyEmail) || !isValidEmail(adminEmail)) {
      throw new AppError("Informe e-mails válidos para a empresa e o administrador.", 422);
    }

    const slug = normalizeSlug(companySlug || companyName);

    if (!slug) {
      throw new AppError("Não foi possível gerar um slug válido para a empresa.", 422);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const client = await db.getClient();

    try {
      await client.beginTransaction();

      const companyResult = await client.query(
        `
          INSERT INTO empresas (nome_fantasia, slug, segmento, email_contato, telefone)
          VALUES (?, ?, ?, ?, ?)
        `,
        [companyName.trim(), slug, segment, companyEmail.trim(), phone?.trim() || null]
      );

      const companyId = companyResult.insertId;

      const userResult = await client.query(
        `
          INSERT INTO usuarios (empresa_id, nome, email, senha_hash, role)
          VALUES (?, ?, ?, ?, 'admin')
        `,
        [companyId, adminName.trim(), adminEmail.trim(), passwordHash]
      );

      await client.commit();

      return res.status(201).json(
        buildAuthPayload({
          user_id: userResult.insertId,
          empresa_id: companyId,
          user_name: adminName.trim(),
          user_email: adminEmail.trim(),
          role: "admin",
          company_name: companyName.trim(),
          slug,
          segmento: segment,
          email_contato: companyEmail.trim(),
          telefone: phone?.trim() || null,
        })
      );
    } catch (error) {
      await client.rollback();
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  const { email, password } = req.body;

  try {
    assertRequiredFields(req.body, ["email", "password"]);

    const result = await db.query(
      `
        SELECT
          u.id AS user_id,
          u.nome AS user_name,
          u.email AS user_email,
          u.senha_hash,
          u.role,
          e.id AS empresa_id,
          e.nome_fantasia AS company_name,
          e.slug,
          e.segmento,
          e.email_contato,
          e.telefone
        FROM usuarios u
        INNER JOIN empresas e ON e.id = u.empresa_id
        WHERE u.email = ?
      `,
      [email.trim()]
    );

    if (result.rowCount === 0) {
      throw new AppError("E-mail ou senha inválidos.", 401);
    }

    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(password, user.senha_hash);

    if (!passwordMatches) {
      throw new AppError("E-mail ou senha inválidos.", 401);
    }

    return res.json(buildAuthPayload(user));
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    const result = await db.query(
      `
        SELECT
          u.id AS user_id,
          u.nome AS user_name,
          u.email AS user_email,
          u.role,
          e.id AS empresa_id,
          e.nome_fantasia AS company_name,
          e.slug,
          e.segmento,
          e.email_contato,
          e.telefone
        FROM usuarios u
        INNER JOIN empresas e ON e.id = u.empresa_id
        WHERE u.id = ? AND u.empresa_id = ?
      `,
      [req.user.userId, req.user.empresaId]
    );

    if (result.rowCount === 0) {
      throw new AppError("Usuário autenticado não encontrado.", 404);
    }

    return res.json({
      user: {
        id: result.rows[0].user_id,
        name: result.rows[0].user_name,
        email: result.rows[0].user_email,
        role: result.rows[0].role,
      },
      company: {
        id: result.rows[0].empresa_id,
        name: result.rows[0].company_name,
        slug: result.rows[0].slug,
        segment: result.rows[0].segmento,
        email: result.rows[0].email_contato,
        phone: result.rows[0].telefone,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  me,
};
