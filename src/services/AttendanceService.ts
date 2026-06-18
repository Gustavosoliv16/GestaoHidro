import Database from "@tauri-apps/plugin-sql";

async function getDb() {
  return await Database.load("sqlite:gestao_hidro.db");
}

const STATUS_PRESENTE = "PRESENTE";
const STATUS_FALTOU = "FALTOU";

// Garante que a tabela CHAMADA_REGISTRO existe (migration inline)
async function garantirTabelaChamadaRegistro(db: any) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS CHAMADA_REGISTRO (
      id_registro   INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      id_turma      INTEGER NOT NULL,
      data_aula     TEXT NOT NULL,
      salvo_em      TEXT NOT NULL,
      total_alunos  INTEGER DEFAULT 0,
      total_presentes INTEGER DEFAULT 0,
      total_faltas  INTEGER DEFAULT 0,
      UNIQUE(id_turma, data_aula),
      FOREIGN KEY(id_turma) REFERENCES TURMAS(id_turma)
    )
  `);
}

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

/** Salva/consolida a chamada de uma turma em uma data. Retorna se já existia. */
export async function salvarChamada(
  turmaId: number,
  date: string
): Promise<{ sucesso: boolean; jaExistia: boolean; mensagem: string }> {
  const db = await getDb();
  await garantirTabelaChamadaRegistro(db);

  // Conta presentes, faltas e total de alunos com registro no dia
  const contagem: any[] = await db.select(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'PRESENTE' THEN 1 ELSE 0 END) as presentes,
       SUM(CASE WHEN status = 'FALTOU'   THEN 1 ELSE 0 END) as faltas
     FROM AGENDA_CALENDARIO
     WHERE id_turma = $1 AND data_aula = $2`,
    [turmaId, date]
  );

  const { total, presentes, faltas } = contagem[0];
  const agora = new Date().toISOString();

  // Verifica se já existe registro para este dia/turma
  const existente: any[] = await db.select(
    `SELECT id_registro FROM CHAMADA_REGISTRO WHERE id_turma = $1 AND data_aula = $2`,
    [turmaId, date]
  );

  const jaExistia = existente.length > 0;

  if (jaExistia) {
    await db.execute(
      `UPDATE CHAMADA_REGISTRO
       SET salvo_em = $1, total_alunos = $2, total_presentes = $3, total_faltas = $4
       WHERE id_turma = $5 AND data_aula = $6`,
      [agora, total ?? 0, presentes ?? 0, faltas ?? 0, turmaId, date]
    );
  } else {
    await db.execute(
      `INSERT INTO CHAMADA_REGISTRO (id_turma, data_aula, salvo_em, total_alunos, total_presentes, total_faltas)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [turmaId, date, agora, total ?? 0, presentes ?? 0, faltas ?? 0]
    );
  }

  return {
    sucesso: true,
    jaExistia,
    mensagem: jaExistia
      ? "Chamada atualizada com sucesso!"
      : "Chamada salva com sucesso!",
  };
}

/** Verifica se já existe chamada salva para uma turma em uma data. */
export async function verificarChamadaSalva(
  turmaId: number,
  date: string
): Promise<boolean> {
  const db = await getDb();
  await garantirTabelaChamadaRegistro(db);
  const rows: any[] = await db.select(
    `SELECT id_registro FROM CHAMADA_REGISTRO WHERE id_turma = $1 AND data_aula = $2`,
    [turmaId, date]
  );
  return rows.length > 0;
}

export interface RegistroChamada {
  id_registro: number;
  id_turma: number;
  modalidade: string;
  dia_semana: number;
  horario_inicio: number;
  data_aula: string;
  salvo_em: string;
  total_alunos: number;
  total_presentes: number;
  total_faltas: number;
}

export interface DetalhePresencaChamada {
  id_aluno: number;
  nome: string;
  telefone: string | null;
  status: "PRESENTE" | "FALTOU" | "AGENDADO";
}

/** Lista todas as chamadas salvas, com filtros opcionais de turma e período. */
export async function buscarChamadasSalvas(filtros?: {
  idTurma?: number;
  dataInicio?: string;
  dataFim?: string;
}): Promise<RegistroChamada[]> {
  const db = await getDb();
  await garantirTabelaChamadaRegistro(db);

  let query = `
    SELECT
      cr.id_registro,
      cr.id_turma,
      m.modalidade,
      t.dia_semana,
      CAST(t.horario_inicio AS INTEGER) as horario_inicio,
      cr.data_aula,
      cr.salvo_em,
      cr.total_alunos,
      cr.total_presentes,
      cr.total_faltas
    FROM CHAMADA_REGISTRO cr
    JOIN TURMAS t ON cr.id_turma = t.id_turma
    LEFT JOIN MODALIDADE m ON t.id_modalidade = m.id_modalidade
    WHERE 1=1
  `;
  const params: any[] = [];
  let idx = 1;

  if (filtros?.idTurma) {
    query += ` AND cr.id_turma = $${idx++}`;
    params.push(filtros.idTurma);
  }
  if (filtros?.dataInicio) {
    query += ` AND cr.data_aula >= $${idx++}`;
    params.push(filtros.dataInicio);
  }
  if (filtros?.dataFim) {
    query += ` AND cr.data_aula <= $${idx++}`;
    params.push(filtros.dataFim);
  }

  query += ` ORDER BY cr.data_aula DESC, t.horario_inicio ASC`;

  return await db.select(query, params);
}

/** Busca o detalhe individual de presença de cada aluno em uma chamada salva. */
export async function buscarDetalhesChamada(
  idTurma: number,
  dataAula: string
): Promise<DetalhePresencaChamada[]> {
  const db = await getDb();

  const rows: any[] = await db.select(
    `SELECT
       a.id_aluno,
       a.nome,
       a.tel as telefone,
       COALESCE(ac.status, 'AGENDADO') as status
     FROM ALUNO_HORARIO_PADRAO hp
     JOIN ALUNOS a ON hp.id_aluno = a.id_aluno
     LEFT JOIN AGENDA_CALENDARIO ac
       ON ac.id_aluno = a.id_aluno
      AND ac.id_turma = hp.id_turma
      AND ac.data_aula = $2
     WHERE hp.id_turma = $1
     ORDER BY a.nome ASC`,
    [idTurma, dataAula]
  );

  return rows;
}
