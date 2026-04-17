CREATE TABLE IF NOT EXISTS empresas (
  id SERIAL PRIMARY KEY,
  nome_fantasia VARCHAR(150) NOT NULL,
  slug VARCHAR(150) NOT NULL UNIQUE,
  segmento VARCHAR(30) NOT NULL CHECK (segmento IN ('barbearia', 'manicure', 'salao', 'odontologia', 'outro')),
  email_contato VARCHAR(150) NOT NULL UNIQUE,
  telefone VARCHAR(30),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profissionais (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(120) NOT NULL,
  especialidade VARCHAR(120),
  email VARCHAR(150),
  telefone VARCHAR(30),
  disponibilidade JSONB NOT NULL DEFAULT '{}'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS servicos (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(150) NOT NULL,
  duracao_minutos INTEGER NOT NULL CHECK (duracao_minutos > 0 AND duracao_minutos <= 480),
  preco NUMERIC(10, 2) NOT NULL CHECK (preco >= 0),
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_servico_nome_por_empresa UNIQUE (empresa_id, nome)
);

CREATE TABLE IF NOT EXISTS agendamentos (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  servico_id INTEGER NOT NULL REFERENCES servicos(id),
  profissional_id INTEGER NOT NULL REFERENCES profissionais(id),
  cliente_nome VARCHAR(120) NOT NULL,
  cliente_telefone VARCHAR(30) NOT NULL,
  cliente_email VARCHAR(150),
  data_agendamento DATE NOT NULL,
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  duracao_minutos INTEGER NOT NULL CHECK (duracao_minutos > 0),
  preco NUMERIC(10, 2) NOT NULL CHECK (preco >= 0),
  status VARCHAR(30) NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado', 'cancelado', 'concluido')),
  observacoes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_id ON usuarios (empresa_id);
CREATE INDEX IF NOT EXISTS idx_profissionais_empresa_id ON profissionais (empresa_id);
CREATE INDEX IF NOT EXISTS idx_servicos_empresa_id ON servicos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_empresa_id ON agendamentos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_profissional
  ON agendamentos (empresa_id, profissional_id, data_agendamento);

CREATE UNIQUE INDEX IF NOT EXISTS ux_agendamento_horario_ativo
  ON agendamentos (empresa_id, profissional_id, data_agendamento, horario_inicio)
  WHERE status <> 'cancelado';
