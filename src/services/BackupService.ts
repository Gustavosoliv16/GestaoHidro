import Database from "@tauri-apps/plugin-sql";
import { invoke } from "@tauri-apps/api/core";
import { remove, exists } from "@tauri-apps/plugin-fs";

/**
 * Serviço de backup automático do banco SQLite.
 * Usa VACUUM INTO para criar cópia consistente diretamente na pasta de backups.
 */

const DB_NAME = "sqlite:gestao_hidro.db";
const BACKUP_PREFIX = "gestao_hidro_backup";
const MAX_BACKUPS = 5;

/**
 * Obtém a pasta de backups do sistema (Documents/GestaoHidro_Backups)
 */
export async function getBackupFolder(): Promise<string> {
  try {
    const folder = await invoke<string>("get_backup_folder");
    return folder;
  } catch (error) {
    console.error("Erro ao obter pasta de backups:", error);
    throw new Error("Não foi possível obter a pasta de backups");
  }
}

function gerarNomeBackup(): string {
  const d = new Date();
  const ts = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
    "_",
    String(d.getHours()).padStart(2, "0"),
    String(d.getMinutes()).padStart(2, "0"),
    String(d.getSeconds()).padStart(2, "0"),
  ].join("");
  return `${BACKUP_PREFIX}_${ts}.db`;
}

/**
 * Escapa aspas simples em caminhos para uso seguro em SQL.
 */
function escapeSqlPath(path: string): string {
  return path.replace(/'/g, "''");
}

/**
 * Cria um backup completo do banco usando VACUUM INTO diretamente
 * na pasta de backups (caminho absoluto), sem arquivo temporário.
 */
export async function criarBackup(): Promise<{
  sucesso: boolean;
  mensagem: string;
  caminho?: string;
}> {
  try {
    console.log("Iniciando processo de backup...");

    // Obter pasta de destino (caminho absoluto)
    const backupFolder = await getBackupFolder();
    const nomeArquivo = gerarNomeBackup();
    const caminhoDestino = `${backupFolder}/${nomeArquivo}`;

    // Se por acaso o arquivo já existir (mesmo nome, mesmo segundo), remover antes
    try {
      const existe = await exists(caminhoDestino);
      if (existe) {
        await remove(caminhoDestino);
      }
    } catch {
      // ignora — segue em frente
    }

    console.log("Criando backup com VACUUM INTO em:", caminhoDestino);

    // VACUUM INTO direto no destino final (caminho absoluto)
    const db = await Database.load(DB_NAME);
    const caminhoEscaped = escapeSqlPath(caminhoDestino);
    await db.execute(`VACUUM INTO '${caminhoEscaped}'`);

    console.log("Backup concluído com sucesso:", nomeArquivo);

    return {
      sucesso: true,
      mensagem: `Backup criado com sucesso: ${nomeArquivo}`,
      caminho: caminhoDestino,
    };
  } catch (erro) {
    console.error("Erro detalhado ao criar backup:", erro);

    const mensagemErro =
      erro instanceof Error
        ? erro.message
        : typeof erro === "string"
        ? erro
        : JSON.stringify(erro);

    return { sucesso: false, mensagem: mensagemErro };
  }
}

/**
 * Limpa backups antigos do disco e do log, mantendo apenas os MAX_BACKUPS mais recentes.
 */
export async function limparBackupsAntigos(): Promise<{
  sucesso: boolean;
  mensagem: string;
}> {
  try {
    const db = await Database.load(DB_NAME);

    // Garante que a tabela existe
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "BACKUP_LOG" (
        "id_backup"   INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "nome_arquivo" TEXT NOT NULL,
        "criado_em"   TEXT NOT NULL,
        "tamanho_kb"  INTEGER,
        "sucesso"     INTEGER DEFAULT 1
      )
    `);

    // Busca todos os backups ordenados do mais recente para o mais antigo
    const todosBackups: any[] = await db.select(
      `SELECT id_backup, nome_arquivo FROM BACKUP_LOG
       WHERE sucesso = 1
       ORDER BY criado_em DESC`
    );

    if (todosBackups.length <= MAX_BACKUPS) {
      return {
        sucesso: true,
        mensagem: `${todosBackups.length} backup(s). Nenhum precisa ser removido.`,
      };
    }

    // Backups a remover: todos além dos MAX_BACKUPS mais recentes
    const backupsParaRemover = todosBackups.slice(MAX_BACKUPS);
    let removidos = 0;

    for (const backup of backupsParaRemover) {
      // Tenta remover o arquivo do disco
      try {
        const existe = await exists(backup.nome_arquivo);
        if (existe) {
          await remove(backup.nome_arquivo);
        }
      } catch (e) {
        console.warn("Não foi possível remover arquivo de backup:", backup.nome_arquivo, e);
      }

      // Remove o registro do log
      try {
        await db.execute(`DELETE FROM BACKUP_LOG WHERE id_backup = $1`, [backup.id_backup]);
        removidos++;
      } catch (e) {
        console.warn("Não foi possível remover registro do log:", backup.id_backup, e);
      }
    }

    return {
      sucesso: true,
      mensagem: `${removidos} backup(s) antigo(s) removido(s). Mantendo os ${MAX_BACKUPS} mais recentes.`,
    };
  } catch (erro) {
    console.error("Erro ao limpar backups:", erro);
    return {
      sucesso: false,
      mensagem: `Falha ao limpar backups: ${erro instanceof Error ? erro.message : String(erro)}`,
    };
  }
}

/**
 * Registra no log que um backup foi criado com sucesso.
 */
export async function registrarBackup(
  nomeArquivo: string,
  tamanhoKb?: number
): Promise<void> {
  try {
    const db = await Database.load(DB_NAME);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS "BACKUP_LOG" (
        "id_backup"   INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "nome_arquivo" TEXT NOT NULL,
        "criado_em"   TEXT NOT NULL,
        "tamanho_kb"  INTEGER,
        "sucesso"     INTEGER DEFAULT 1
      )
    `);

    await db.execute(
      `INSERT INTO BACKUP_LOG (nome_arquivo, criado_em, tamanho_kb, sucesso)
       VALUES ($1, $2, $3, 1)`,
      [nomeArquivo, new Date().toISOString(), tamanhoKb ?? null]
    );
  } catch (erro) {
    console.error("Erro ao registrar backup no log:", erro);
  }
}

/**
 * Busca o histórico de backups registrados.
 */
export async function buscarHistoricoBackups(): Promise<any[]> {
  try {
    const db = await Database.load(DB_NAME);

    // Garante que a tabela existe
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "BACKUP_LOG" (
        "id_backup"   INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "nome_arquivo" TEXT NOT NULL,
        "criado_em"   TEXT NOT NULL,
        "tamanho_kb"  INTEGER,
        "sucesso"     INTEGER DEFAULT 1
      )
    `);

    return await db.select(
      `SELECT id_backup, nome_arquivo, criado_em, tamanho_kb, sucesso
       FROM BACKUP_LOG
       ORDER BY criado_em DESC
       LIMIT 5`
    );
  } catch (erro) {
    console.error("Erro ao buscar histórico de backups:", erro);
    return [];
  }
}

/**
 * Executa backup automático com registro no log.
 * Função principal para ser chamada pelo UI.
 */
export async function executarBackupAutomatico(): Promise<{
  sucesso: boolean;
  mensagem: string;
}> {
  const resultado = await criarBackup();

  if (resultado.sucesso && resultado.caminho) {
    await registrarBackup(resultado.caminho);
    await limparBackupsAntigos();
  }

  return {
    sucesso: resultado.sucesso,
    mensagem: resultado.mensagem,
  };
}

/**
 * Verifica se já foi feito um backup hoje.
 * Usado para evitar backups automáticos repetidos no mesmo dia.
 */
export async function jaFeitoBackupHoje(): Promise<boolean> {
  try {
    const db = await Database.load(DB_NAME);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS "BACKUP_LOG" (
        "id_backup"   INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "nome_arquivo" TEXT NOT NULL,
        "criado_em"   TEXT NOT NULL,
        "tamanho_kb"  INTEGER,
        "sucesso"     INTEGER DEFAULT 1
      )
    `);

    const hoje = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const backupsHoje: any[] = await db.select(
      `SELECT COUNT(*) as total FROM BACKUP_LOG
       WHERE sucesso = 1 AND criado_em LIKE $1`,
      [`${hoje}%`]
    );

    return (backupsHoje[0]?.total ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Executa backup automático silencioso (para startup do app).
 * Só faz backup se ainda não foi feito um hoje.
 */
export async function backupStartup(): Promise<void> {
  try {
    const jaFeito = await jaFeitoBackupHoje();
    if (jaFeito) {
      console.log("Backup automático: já existe backup de hoje. Pulando.");
      return;
    }

    console.log("Backup automático: executando backup de startup...");
    const resultado = await executarBackupAutomatico();
    console.log("Backup automático:", resultado.sucesso ? "OK" : "FALHA", resultado.mensagem);
  } catch (erro) {
    console.error("Erro no backup automático de startup:", erro);
  }
}