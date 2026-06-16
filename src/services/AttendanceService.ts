import Database from "@tauri-apps/plugin-sql";

async function getDb() {
  return await Database.load("sqlite:gestao_hidro.db");
}

const STATUS_PRESENTE = "PRESENTE";
const STATUS_FALTOU = "FALTOU";


export async function registrarPresenca(
  turmaId: number,
  alunoId: number,
  date: string,
  present: boolean
) {
  const db = await getDb();
  const status = present ? STATUS_PRESENTE : STATUS_FALTOU;

  try {
    await db.execute(
      `INSERT INTO AGENDA_CALENDARIO (id_turma, id_aluno, data_aula, status)
       VALUES ($1, $2, $3, $4)`,
      [turmaId, alunoId, date, status]
    );
  } catch {
    await db.execute(
      `UPDATE AGENDA_CALENDARIO SET status = $1
       WHERE id_turma = $2 AND id_aluno = $3 AND data_aula = $4`,
      [status, turmaId, alunoId, date]
    );
  }
  return { sucesso: true };
}

export async function buscarPresencasDoDia(
  turmaId: number,
  date: string
): Promise<Record<number, boolean>> {
  const db = await getDb();
  const rows: any[] = await db.select(
    `SELECT id_aluno, status FROM AGENDA_CALENDARIO
     WHERE id_turma = $1 AND data_aula = $2`,
    [turmaId, date]
  );

  const map: Record<number, boolean> = {};
  for (const r of rows) {
    map[r.id_aluno] = r.status === STATUS_PRESENTE;
  }
  return map;
}

export async function buscarTotalFaltasPorTurma(turmaId: number): Promise<number> {
  const db = await getDb();
  const res: any[] = await db.select(
    `SELECT COUNT(*) as total FROM AGENDA_CALENDARIO
     WHERE id_turma = $1 AND status = $2`,
    [turmaId, STATUS_FALTOU]
  );
  return res[0]?.total ?? 0;
}
