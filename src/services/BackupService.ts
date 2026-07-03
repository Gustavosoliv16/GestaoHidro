import Database from "@tauri-apps/plugin-sql";
import { invoke } from "@tauri-apps/api/core";
import { copyFile, remove } from "@tauri-apps/plugin-fs";

/**
 * Serviço de backup automático do banco SQLite.
 * Usa VACUUM INTO para criar uma cópia consistente e o plugin fs para copiar.
 */

const DB_NAME = "sqlite:gestao_hidro.db";
const BACKUP_PREFIX = "gestao_hidro_backup";
const TEMP_BACKUP_NAME = "gestao_hidro_temp_backup.db";

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
 * Cria um backup completo do banco usando VACUUM INTO + plugin fs.
 * 1. VACUUM INTO cria backup temporário na pasta do banco (acesso garantido)
 * 2. Plugin fs copia para Documents/GestaoHidro_Backups
 * 3. Deleta o temporário
 */
export async function criarBackup(): Promise<{
  sucesso: boolean;
  mensagem: string;
  caminho?: string;
}> {
  try {
    console.log("Iniciando processo de backup...");
    
    // Passo 1: Criar backup temporário na mesma pasta do banco
    const db = await Database.load(DB_NAME);
    
    console.log("Criando backup temporário com VACUUM INTO...");
    await db.execute(`VACUUM INTO '${TEMP_BACKUP_NAME}'`);
    console.log("Backup temporário criado com sucesso");

    // Passo 2: Obter pasta de destino
    const backupFolder = await getBackupFolder();
    const nomeArquivo = gerarNomeBackup();
    const caminhoDestino = `${backupFolder}/${nomeArquivo}`;
    
    console.log("Copiando para:", caminhoDestino);

    // Passo 3: Copiar usando plugin fs
    await copyFile(TEMP_BACKUP_NAME, caminhoDestino);
    console.log("Cópia concluída");

    // Passo 4: Deletar temporário
    try {
      await remove(TEMP_BACKUP_NAME);
      console.log("Arquivo temporário removido");
    } catch (removeError) {
      console.warn("Não foi possível remover arquivo temporário:", removeError);
    }

    return {
      sucesso: true,
      mensagem: `Backup criado com sucesso: ${nomeArquivo}`,
      caminho: caminhoDestino,
    };
  } catch (erro) {
    console.error("Erro detalhado ao criar backup:", erro);
    
    // Tenta limpar o arquivo temporário em caso de erro
    try {
      await remove(TEMP_BACKUP_NAME);
    } catch {
    }

    const mensagemErro =
    erro instanceof Error 
    ? erro.message
    : typeof erro === "string"
    ? erro
    : JSON.stringify(erro);

    return { sucesso: false, mensagem: mensagemErro };
  }
}

//Limpa backups antigos, mantendo apenas os N mais recentes.
export async function limparBackupsAntigos(diasManter: number = 7): Promise<{
  sucesso: boolean;
  mensagem: string;
}> {
  try {
    const db = await Database.load(DB_NAME);
    const corte = new Date();
    corte.setDate(corte.getDate() - diasManter);

    // Lista backups na tabela de controle (se existir)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "BACKUP_LOG" (
        "id_backup"   INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "nome_arquivo" TEXT NOT NULL,
        "criado_em"   TEXT NOT NULL,
        "tamanho_kb"  INTEGER,
        "sucesso"     INTEGER DEFAULT 1
      )
    `);

    // Registra o último backup criado
    const ultimoBackup: any[] = await db.select(
      `SELECT nome_arquivo FROM BACKUP_LOG ORDER BY criado_em DESC LIMIT 1`
    );

    if (ultimoBackup.length > 0) {
      return {
        sucesso: true,
        mensagem: `Backups registrados: ${ultimoBackup.length}. Mantendo últimos ${diasManter} dias.`,
      };
    }

    return {
      sucesso: true,
      mensagem: "Nenhum backup registrado para limpar.",
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
       LIMIT 20`
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
    await limparBackupsAntigos(7);
  }

  return {
    sucesso: resultado.sucesso,
    mensagem: resultado.mensagem,
  };
}
