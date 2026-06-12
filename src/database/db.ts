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

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "PAGAMENTO" (
      "id_pagamento" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "id_aluno" INTEGER NOT NULL,
      "valor_pago" REAL NOT NULL,
      "data_pagamento" TEXT NOT NULL,
      FOREIGN KEY("id_aluno") REFERENCES "ALUNOS"("id_aluno")
    );
  `);

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

  await db.execute("COMMIT;");
  try {
    await db.execute(
      `UPDATE ALUNOS SET dia_vencimento = CAST(dia_vencimento AS INTEGER) WHERE dia_vencimento IS NOT NULL;`,
    );
  } catch (e) {
    console.warn("Could not migrate ALUNOS.dia_vencimento:", e);
  }
}
