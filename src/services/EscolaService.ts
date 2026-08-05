import Database from "@tauri-apps/plugin-sql";

export interface ConfiguracaoEscola {
  nome: string;
  documento: string;
  logo_b64: string | null;
}

const DB_NAME = "sqlite:gestao_hidro.db";

export async function buscarConfiguracaoEscola(): Promise<ConfiguracaoEscola> {
  try {
    const db = await Database.load(DB_NAME);
    const rows: any[] = await db.select(
      `SELECT nome, documento, logo_b64 FROM CONFIGURACAO_ESCOLA WHERE id = 1`
    );
    if (rows.length > 0) {
      return {
        nome:      rows[0].nome      ?? "Minha Escola",
        documento: rows[0].documento ?? "",
        logo_b64:  rows[0].logo_b64  ?? null,
      };
    }
  } catch (e) {
    console.error("EscolaService.buscarConfiguracaoEscola:", e);
  }
  return { nome: "Minha Escola", documento: "", logo_b64: null };
}

export async function salvarConfiguracaoEscola(config: ConfiguracaoEscola): Promise<void> {
  const db = await Database.load(DB_NAME);
  await db.execute(
    `INSERT INTO CONFIGURACAO_ESCOLA (id, nome, documento, logo_b64, atualizado_em)
     VALUES (1, $1, $2, $3, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       nome          = excluded.nome,
       documento     = excluded.documento,
       logo_b64      = excluded.logo_b64,
       atualizado_em = excluded.atualizado_em`,
    [config.nome, config.documento ?? "", config.logo_b64 ?? null]
  );
}
