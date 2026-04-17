CREATE TABLE IF NOT EXISTS empresas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome_fantasia VARCHAR(150) NOT NULL,
  slug VARCHAR(150) NOT NULL,
  segmento ENUM('barbearia', 'manicure', 'salao', 'odontologia', 'outro') NOT NULL,
  email_contato VARCHAR(150) NOT NULL,
  telefone VARCHAR(30) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_empresas_slug (slug),
  UNIQUE KEY uq_empresas_email_contato (email_contato)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id INT UNSIGNED NOT NULL,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'admin',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email),
  KEY idx_usuarios_empresa_id (empresa_id),
  CONSTRAINT fk_usuarios_empresa
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profissionais (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id INT UNSIGNED NOT NULL,
  nome VARCHAR(120) NOT NULL,
  especialidade VARCHAR(120) NULL,
  email VARCHAR(150) NULL,
  telefone VARCHAR(30) NULL,
  disponibilidade LONGTEXT NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_profissionais_empresa_id (empresa_id),
  CONSTRAINT fk_profissionais_empresa
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS servicos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id INT UNSIGNED NOT NULL,
  nome VARCHAR(150) NOT NULL,
  duracao_minutos INT NOT NULL,
  preco DECIMAL(10, 2) NOT NULL,
  descricao TEXT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_servico_nome_por_empresa (empresa_id, nome),
  KEY idx_servicos_empresa_id (empresa_id),
  CONSTRAINT fk_servicos_empresa
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agendamentos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id INT UNSIGNED NOT NULL,
  servico_id INT UNSIGNED NOT NULL,
  profissional_id INT UNSIGNED NOT NULL,
  cliente_nome VARCHAR(120) NOT NULL,
  cliente_telefone VARCHAR(30) NOT NULL,
  cliente_email VARCHAR(150) NULL,
  data_agendamento DATE NOT NULL,
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  duracao_minutos INT NOT NULL,
  preco DECIMAL(10, 2) NOT NULL,
  status ENUM('agendado', 'cancelado', 'concluido') NOT NULL DEFAULT 'agendado',
  observacoes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_agendamentos_empresa_id (empresa_id),
  KEY idx_agendamentos_data_profissional (empresa_id, profissional_id, data_agendamento),
  CONSTRAINT fk_agendamentos_empresa
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  CONSTRAINT fk_agendamentos_servico
    FOREIGN KEY (servico_id) REFERENCES servicos(id),
  CONSTRAINT fk_agendamentos_profissional
    FOREIGN KEY (profissional_id) REFERENCES profissionais(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
