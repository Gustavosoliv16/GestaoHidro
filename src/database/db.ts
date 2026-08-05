import Database from "@tauri-apps/plugin-sql";

export default async function initDatabase(): Promise<void> {
  const db: any = await (Database as any).load("sqlite:gestao_hidro.db");

  console.log("Inicializando banco de dados...");

  await db.execute("PRAGMA foreign_keys = ON;");
  await db.execute("BEGIN TRANSACTION;");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "RESPONSAVEL" (
      "id_responsavel" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "nome" TEXT NOT NULL,
      "documento" TEXT NOT NULL UNIQUE,
      "telefone" TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "MODALIDADE" (
      "id_modalidade" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "modalidade" TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "ENDERECO" (
      "id_endereco" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "logradouro" TEXT,
      "numero" TEXT,
      "bairro" TEXT,
      "cidade" TEXT,
      "complemento" TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "ALUNOS" (
      "id_aluno" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "nome" TEXT NOT NULL,
      "email" TEXT,
      "tel" TEXT,
      "documento" TEXT,
      "data_nascimento" TEXT,
      "dia_vencimento" INTEGER,
      "ativo" INTEGER DEFAULT 1,
      "valor_mensalidade" REAL,
      "id_responsavel" INTEGER,
      "id_modalidade" INTEGER,
      "id_endereco" INTEGER,
      FOREIGN KEY("id_responsavel") REFERENCES "RESPONSAVEL"("id_responsavel"),
      FOREIGN KEY("id_modalidade") REFERENCES "MODALIDADE"("id_modalidade"),
      FOREIGN KEY("id_endereco") REFERENCES "ENDERECO"("id_endereco")
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "TURMAS" (
    "id_turma" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "dia_semana" INTEGER NOT NULL,         
    "horario_inicio" TEXT NOT NULL,     
    "horario_fim" TEXT NOT NULL,       
    "id_modalidade" INTEGER,            
    "capacidade_maxima" INTEGER DEFAULT 6,
    FOREIGN KEY("id_modalidade") REFERENCES "MODALIDADE"("id_modalidade")
);`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "ALUNO_HORARIO_PADRAO" (
    "id_aluno" INTEGER NOT NULL,
    "id_turma" INTEGER NOT NULL,
    PRIMARY KEY ("id_aluno", "id_turma"),
    FOREIGN KEY("id_aluno") REFERENCES "ALUNOS"("id_aluno"),
    FOREIGN KEY("id_turma") REFERENCES "TURMAS"("id_turma")
);
  `);

  // Tabela PAGAMENTO removida - sistema usa apenas MENSALIDADE
  // await db.execute(`
  //   CREATE TABLE IF NOT EXISTS "PAGAMENTO" (
  //     "id_pagamento" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  //     "id_aluno" INTEGER NOT NULL,
  //     "valor_pago" REAL NOT NULL,
  //     "data_pagamento" TEXT NOT NULL,
  //     FOREIGN KEY("id_aluno") REFERENCES "ALUNOS"("id_aluno")
  //   );
  // `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "AGENDA_CALENDARIO" (
    "id_agenda" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "id_turma" INTEGER NOT NULL,
    "id_aluno" INTEGER NOT NULL,
    "data_aula" TEXT NOT NULL,          
    "status" TEXT DEFAULT 'AGENDADO',
    FOREIGN KEY("id_turma") REFERENCES "TURMAS"("id_turma"),
    FOREIGN KEY("id_aluno") REFERENCES "ALUNOS"("id_aluno"),
    UNIQUE("id_aluno", "data_aula", "id_turma")
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "MENSALIDADE" (
      "id_mensalidade" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "id_aluno" INTEGER NOT NULL,
      "mes_referencia" TEXT NOT NULL,
      "data_vencimento" TEXT NOT NULL,
      "valor" REAL NOT NULL,
      "status" TEXT DEFAULT 'EM_ABERTO',
      "data_pagamento" TEXT,
      "valor_pago" REAL,
      "criado_em" TEXT NOT NULL,
      FOREIGN KEY("id_aluno") REFERENCES "ALUNOS"("id_aluno"),
      UNIQUE("id_aluno", "mes_referencia")
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "FLUXO_CAIXA" (
    "id_caixa" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "tipo" TEXT NOT NULL, -- 'RECEITA' ou 'DESPESA'
    "valor" REAL NOT NULL,
    "data_pagamento" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "criado_em" TEXT NOT NULL
    );
  `);

  try {
    const checkCaixa: any = await db.select("SELECT COUNT(*) as count FROM FLUXO_CAIXA");
    if (checkCaixa[0].count === 0) {
      console.log("Migrando historico de financeiro para o Caixa...");
      await db.execute(`
        INSERT INTO FLUXO_CAIXA (tipo, valor, data_pagamento, descricao, criado_em)
        SELECT
          'RECEITA',
          m.valor_pago,
          m.data_pagamento,
          'Mensalidade ref. ' || m.mes_referencia || ' - Aluno: ' || a.nome,
          m.criado_em
        FROM MENSALIDADE m
        INNER JOIN ALUNOS a ON m.id_aluno = a.id_aluno
        WHERE m.status = 'PAGO' AND m.valor_pago IS NOT NULL;
        `);
    }
  } catch (e){
    console.error("Erro ao migrar historico de financeiro para o Caixa:", e);
  }



  await db.execute("COMMIT;");

  try {
    await db.execute(`ALTER TABLE ALUNOS ADD COLUMN data_cadastro TEXT;`);
  } catch (e) {

  }
  try {
    await db.execute(`ALTER TABLE ALUNOS ADD COLUMN id_responsavel INTEGER REFERENCES RESPONSAVEL(id_responsavel);`);
  } catch (e) {
    // coluna já existe — ignorar
  }
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "REPOSICAO_AULA" (
        "id_reposicao"       INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "id_aluno"           INTEGER NOT NULL,
        "id_turma_reposicao" INTEGER NOT NULL,
        "data_reposicao"     TEXT NOT NULL,
        "status"             TEXT NOT NULL DEFAULT 'AGENDADA',
        "observacao"         TEXT,
        FOREIGN KEY("id_aluno")           REFERENCES "ALUNOS"("id_aluno"),
        FOREIGN KEY("id_turma_reposicao") REFERENCES "TURMAS"("id_turma"),
        UNIQUE("id_aluno", "id_turma_reposicao", "data_reposicao")
      );
    `);
  } catch (e) {
    // tabela já existe — ignorar
  }
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "PROFESSOR" (
        "id_professor"  INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "nome"          TEXT NOT NULL,
        "id_modalidade" INTEGER,
        FOREIGN KEY("id_modalidade") REFERENCES "MODALIDADE"("id_modalidade")
      );
    `);
  } catch (e) {
    // tabela já existe — ignorar
  }
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "PAGAMENTO_MENSALIDADE_DETALHE" (
        "id_detalhe"      INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "id_mensalidade"  INTEGER NOT NULL,
        "forma_pagamento" TEXT NOT NULL,
        "valor"           REAL NOT NULL,
        "recebedor_pix"   TEXT,
        "tipo_cartao"     TEXT,
        "observacao"      TEXT,
        "criado_em"       TEXT NOT NULL,
        FOREIGN KEY("id_mensalidade") REFERENCES "MENSALIDADE"("id_mensalidade")
      );
    `);
  } catch (e) {
    // tabela já existe — ignorar
  }
  try {
    await db.execute(
      `UPDATE ALUNOS SET dia_vencimento = CAST(dia_vencimento AS INTEGER) WHERE dia_vencimento IS NOT NULL;`,
    );
  } catch (e) {
    console.warn("Could not migrate ALUNOS.dia_vencimento:", e);
  }

  // Funcionários e log de acesso — sistema de sessão auditável
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "FUNCIONARIOS" (
        "id_funcionario" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "nome"           TEXT NOT NULL,
        "pin_hash"       TEXT NOT NULL,
        "ativo"          INTEGER NOT NULL DEFAULT 1,
        "criado_em"      TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    // Seed: funcionário Admin padrão com PIN 1234
    // SHA-256("1234") = 03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4
    await db.execute(`
      INSERT OR IGNORE INTO FUNCIONARIOS (id_funcionario, nome, pin_hash, ativo)
      VALUES (1, 'Admin', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 1);
    `);
  } catch (e) {
    console.warn("Could not create FUNCIONARIOS table:", e);
  }
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "LOG_ACESSO" (
        "id_log"           INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "id_funcionario"   INTEGER NOT NULL,
        "nome_funcionario" TEXT NOT NULL,
        "tipo"             TEXT NOT NULL,
        "ocorrido_em"      TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY("id_funcionario") REFERENCES "FUNCIONARIOS"("id_funcionario")
      );
    `);
  } catch (e) {
    console.warn("Could not create LOG_ACESSO table:", e);
  }

}
