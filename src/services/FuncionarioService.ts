import Database from "@tauri-apps/plugin-sql";

const DB_NAME = "sqlite:gestao_hidro.db";

export interface Funcionario {
  id_funcionario: number;
  nome: string;
  ativo: number;
  criado_em: string;
}

export interface LogAcesso {
  id_log: number;
  id_funcionario: number;
  nome_funcionario: string;
  tipo: "LOGIN" | "LOGOUT";
  ocorrido_em: string;
}

// ── Utilitário: SHA-256 via Web Crypto API ─────────────────────────────────
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── Funcionários ───────────────────────────────────────────────────────────

export async function listarFuncionarios(): Promise<Funcionario[]> {
  const db = await Database.load(DB_NAME);
  return await db.select<Funcionario[]>(
    `SELECT id_funcionario, nome, ativo, criado_em
     FROM FUNCIONARIOS
     ORDER BY nome ASC`
  );
}

export async function listarFuncionariosAtivos(): Promise<Funcionario[]> {
  const db = await Database.load(DB_NAME);
  return await db.select<Funcionario[]>(
    `SELECT id_funcionario, nome, ativo, criado_em
     FROM FUNCIONARIOS
     WHERE ativo = 1
     ORDER BY nome ASC`
  );
}

export async function criarFuncionario(nome: string, pin: string): Promise<void> {
  const hash = await sha256(pin);
  const db = await Database.load(DB_NAME);
  await db.execute(
    `INSERT INTO FUNCIONARIOS (nome, pin_hash, ativo, criado_em)
     VALUES ($1, $2, 1, datetime('now'))`,
    [nome.trim(), hash]
  );
}

export async function atualizarNomeFuncionario(
  id: number,
  novoNome: string
): Promise<void> {
  const db = await Database.load(DB_NAME);
  await db.execute(
    `UPDATE FUNCIONARIOS SET nome = $1 WHERE id_funcionario = $2`,
    [novoNome.trim(), id]
  );
}

export async function alterarPinFuncionario(
  id: number,
  pinAtual: string,
  novoPin: string
): Promise<{ sucesso: boolean; mensagem: string }> {
  const hashAtual = await sha256(pinAtual);
  const db = await Database.load(DB_NAME);

  const rows: any[] = await db.select(
    `SELECT pin_hash FROM FUNCIONARIOS WHERE id_funcionario = $1`,
    [id]
  );

  if (!rows.length || rows[0].pin_hash !== hashAtual) {
    return { sucesso: false, mensagem: "PIN atual incorreto." };
  }

  if (novoPin.length !== 4 || !/^\d{4}$/.test(novoPin)) {
    return { sucesso: false, mensagem: "O novo PIN deve ter exatamente 4 dígitos." };
  }

  const hashNovo = await sha256(novoPin);
  await db.execute(
    `UPDATE FUNCIONARIOS SET pin_hash = $1 WHERE id_funcionario = $2`,
    [hashNovo, id]
  );

  return { sucesso: true, mensagem: "PIN alterado com sucesso." };
}

export async function alterarAtivoFuncionario(
  id: number,
  ativo: boolean
): Promise<void> {
  const db = await Database.load(DB_NAME);
  await db.execute(
    `UPDATE FUNCIONARIOS SET ativo = $1 WHERE id_funcionario = $2`,
    [ativo ? 1 : 0, id]
  );
}

export async function removerFuncionario(id: number): Promise<void> {
  const db = await Database.load(DB_NAME);
  // Mantém o log histórico — apenas desativa em vez de deletar fisicamente
  await db.execute(
    `UPDATE FUNCIONARIOS SET ativo = 0 WHERE id_funcionario = $1`,
    [id]
  );
}

// ── Validação de PIN (login) ───────────────────────────────────────────────

export async function validarPin(
  idFuncionario: number,
  pin: string
): Promise<boolean> {
  const hash = await sha256(pin);
  const db = await Database.load(DB_NAME);
  const rows: any[] = await db.select(
    `SELECT id_funcionario FROM FUNCIONARIOS
     WHERE id_funcionario = $1 AND pin_hash = $2 AND ativo = 1`,
    [idFuncionario, hash]
  );
  return rows.length > 0;
}

// ── Log de acesso ──────────────────────────────────────────────────────────

export async function registrarLogin(
  idFuncionario: number,
  nomeFuncionario: string
): Promise<void> {
  const db = await Database.load(DB_NAME);
  await db.execute(
    `INSERT INTO LOG_ACESSO (id_funcionario, nome_funcionario, tipo, ocorrido_em)
     VALUES ($1, $2, 'LOGIN', datetime('now'))`,
    [idFuncionario, nomeFuncionario]
  );
}

export async function registrarLogout(
  idFuncionario: number,
  nomeFuncionario: string
): Promise<void> {
  const db = await Database.load(DB_NAME);
  await db.execute(
    `INSERT INTO LOG_ACESSO (id_funcionario, nome_funcionario, tipo, ocorrido_em)
     VALUES ($1, $2, 'LOGOUT', datetime('now'))`,
    [idFuncionario, nomeFuncionario]
  );
}

export async function buscarLogAcesso(
  idFuncionario?: number,
  limite = 50
): Promise<LogAcesso[]> {
  const db = await Database.load(DB_NAME);
  if (idFuncionario) {
    return await db.select<LogAcesso[]>(
      `SELECT id_log, id_funcionario, nome_funcionario, tipo, ocorrido_em
       FROM LOG_ACESSO
       WHERE id_funcionario = $1
       ORDER BY ocorrido_em DESC
       LIMIT $2`,
      [idFuncionario, limite]
    );
  }
  return await db.select<LogAcesso[]>(
    `SELECT id_log, id_funcionario, nome_funcionario, tipo, ocorrido_em
     FROM LOG_ACESSO
     ORDER BY ocorrido_em DESC
     LIMIT $1`,
    [limite]
  );
}
