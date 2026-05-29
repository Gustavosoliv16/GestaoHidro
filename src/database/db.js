import Database from "@tauri-apps/plugin-sql-api";

export async function initDatabase() {
  const db = await Database.load("sqlite:gestao_hidro.db");
  
  await db.execute(`
    PRAGMA foreign_keys = ON;
    BEGIN TRANSACTION;

    CREATE TABLE IF NOT EXISTS "RESPONSAVEL" (
        "id_responsavel" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "nome" TEXT NOT NULL,
        "documento" TEXT NOT NULL UNIQUE,
        "telefone" TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "MODALIDADE" (
        "id_modalidade" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "modalidade" TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "ENDEREÇO" (
        "id_endereco" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "logradouro" TEXT,
        "numero" INTEGER,
        "bairro" TEXT,
        "cidade" TEXT,
        "complemento" TEXT
    );

    CREATE TABLE IF NOT EXISTS "ALUNOS" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "nome" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "tel" TEXT NOT NULL,
        "documento" TEXT NOT NULL UNIQUE,
        "data de nascimento" DATE NOT NULL,
        "id_responsavel" INTEGER NOT NULL,
        "id_modalidade" INTEGER NOT NULL,
        "id_endereço" INTEGER NOT NULL,
        
        FOREIGN KEY("id_responsavel") REFERENCES "RESPONSAVEL"("id_responsavel"),
        FOREIGN KEY("id_modalidade") REFERENCES "MODALIDADE"("id_modalidade"),
        FOREIGN KEY("id_endereço") REFERENCES "ENDEREÇO"("id_endereco")
    );

    CREATE TABLE IF NOT EXISTS "ALUNO_HORARIO_PADRAO" (
        "id_padrao" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "id_aluno" INTEGER NOT NULL,
        "dia_semana" TEXT NOT NULL,
        "horario" TEXT NOT NULL,
        FOREIGN KEY("id_aluno") REFERENCES "ALUNOS"("id"),
        UNIQUE("id_aluno", "dia_semana", "horario")
    );

    CREATE TABLE IF NOT EXISTS "PAGAMENTO" (
        "id_pagamento" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "id_aluno" INTEGER NOT NULL,
        "valor" FLOAT NOT NULL,
        
        FOREIGN KEY("id_aluno") REFERENCES "ALUNOS"("id")
    );

    CREATE TABLE IF NOT EXISTS "AGENDA_CALENDARIO" (
        "id_agenda" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "id_aluno" INTEGER NOT NULL,
        "data_aula" DATE NOT NULL,
        "horario" TEXT NOT NULL,
        "status" TEXT DEFAULT 'AGENDADO',
        FOREIGN KEY("id_aluno") REFERENCES "ALUNOS"("id"),
        UNIQUE("id_aluno", "data_aula", "horario")
    );

    COMMIT;
  `);
}