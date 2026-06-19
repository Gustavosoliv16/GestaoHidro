import Database from "@tauri-apps/plugin-sql";

async function getDb() {
  return await Database.load("sqlite:gestao_hidro.db");
}

export type StatusReposicao = "AGENDADA" | "REALIZADA" | "CANCELADA";

export interface Reposicao {
  id_reposicao: number;
  id_aluno: number;
  nomeAluno: string;
  id_turma_reposicao: number;
  modalidade: string;
  dia_semana: number;
  horario_inicio: number;
  data_reposicao: string;
  status: StatusReposicao;
  observacao: string | null;
}

export interface ReposicaoChamada {
  id_reposicao: number;
  id_aluno: number;
  nome: string;
  telefone: string | null;
  status: StatusReposicao;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function hojeStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Funções públicas ──────────────────────────────────────────────────────────

/**
 * Agenda uma reposição para um aluno em uma turma numa data futura.
 * Executa todas as validações antes de persistir.
 */
export async function agendarReposicao(
  idAluno: number,
  idTurmaReposicao: number,
  dataReposicao: string,
  observacao?: string
): Promise<{ sucesso: boolean; idReposicao?: number; mensagem: string }> {
  const db = await getDb();

  // Valida aluno ativo
  const aluno: any[] = await db.select(
    `SELECT ativo FROM ALUNOS WHERE id_aluno = $1`,
    [idAluno]
  );
  if (aluno.length === 0) return { sucesso: false, mensagem: "Aluno não encontrado." };
  if (Number(aluno[0].ativo) === 0) return { sucesso: false, mensagem: "Alunos inativos não podem agendar reposição." };

  // Valida data futura (deve ser maior que hoje)
  if (dataReposicao <= hojeStr()) {
    return { sucesso: false, mensagem: "A data da reposição deve ser uma data futura." };
  }

  // Valida capacidade da turma na data
  const capacidade: any[] = await db.select(
    `SELECT t.capacidade_maxima,
       (SELECT COUNT(*) FROM ALUNO_HORARIO_PADRAO hp WHERE hp.id_turma = t.id_turma) as matriculados,
       (SELECT COUNT(*) FROM REPOSICAO_AULA r
        WHERE r.id_turma_reposicao = t.id_turma
          AND r.data_reposicao = $2
          AND r.status = 'AGENDADA') as reposicoes
     FROM TURMAS t WHERE t.id_turma = $1`,
    [idTurmaReposicao, dataReposicao]
  );
  if (capacidade.length === 0) return { sucesso: false, mensagem: "Turma não encontrada." };
  const { capacidade_maxima, matriculados, reposicoes } = capacidade[0];
  if (Number(matriculados) + Number(reposicoes) >= Number(capacidade_maxima)) {
    return { sucesso: false, mensagem: `A turma não tem vagas para reposição nesta data (máx. ${capacidade_maxima}).` };
  }

  // Tenta inserir (UNIQUE constraint captura duplicatas)
  try {
    const res: any = await db.execute(
      `INSERT INTO REPOSICAO_AULA (id_aluno, id_turma_reposicao, data_reposicao, status, observacao)
       VALUES ($1, $2, $3, 'AGENDADA', $4)`,
      [idAluno, idTurmaReposicao, dataReposicao, observacao ?? null]
    );
    return { sucesso: true, idReposicao: res.lastInsertId, mensagem: "Reposição agendada com sucesso!" };
  } catch (e: any) {
    if (e?.toString().includes("UNIQUE")) {
      return { sucesso: false, mensagem: "Já existe uma reposição para este aluno nesta turma e data." };
    }
    throw e;
  }
}

/**
 * Cancela uma reposição — só funciona se o status atual for AGENDADA.
 */
export async function cancelarReposicao(
  idReposicao: number
): Promise<{ sucesso: boolean; mensagem: string }> {
  const db = await getDb();
  const rows: any[] = await db.select(
    `SELECT status FROM REPOSICAO_AULA WHERE id_reposicao = $1`,
    [idReposicao]
  );
  if (rows.length === 0) return { sucesso: false, mensagem: "Reposição não encontrada." };
  if (rows[0].status !== "AGENDADA") {
    return { sucesso: false, mensagem: `Não é possível cancelar uma reposição com status "${rows[0].status}".` };
  }
  await db.execute(
    `UPDATE REPOSICAO_AULA SET status = 'CANCELADA' WHERE id_reposicao = $1`,
    [idReposicao]
  );
  return { sucesso: true, mensagem: "Reposição cancelada." };
}

/**
 * Marca uma reposição como REALIZADA e registra presença em AGENDA_CALENDARIO.
 * Usa transação para garantir consistência.
 */
export async function marcarReposicaoRealizada(
  idReposicao: number
): Promise<{ sucesso: boolean; mensagem: string }> {
  const db = await getDb();

  const rows: any[] = await db.select(
    `SELECT status, id_aluno, id_turma_reposicao, data_reposicao FROM REPOSICAO_AULA WHERE id_reposicao = $1`,
    [idReposicao]
  );
  if (rows.length === 0) return { sucesso: false, mensagem: "Reposição não encontrada." };
  if (rows[0].status !== "AGENDADA") {
    return { sucesso: false, mensagem: `Não é possível marcar como realizada uma reposição com status "${rows[0].status}".` };
  }

  const { id_aluno, id_turma_reposicao, data_reposicao } = rows[0];

  try {
    await db.execute("BEGIN TRANSACTION;");

    await db.execute(
      `UPDATE REPOSICAO_AULA SET status = 'REALIZADA' WHERE id_reposicao = $1`,
      [idReposicao]
    );

    // Upsert atômico via INSERT OR REPLACE (AGENDA_CALENDARIO tem UNIQUE(id_aluno, data_aula, id_turma))
    await db.execute(
      `INSERT OR REPLACE INTO AGENDA_CALENDARIO (id_turma, id_aluno, data_aula, status)
       VALUES ($1, $2, $3, 'PRESENTE')`,
      [id_turma_reposicao, id_aluno, data_reposicao]
    );

    await db.execute("COMMIT;");
    return { sucesso: true, mensagem: "Reposição marcada como realizada." };
  } catch (e) {
    await db.execute("ROLLBACK;");
    throw e;
  }
}

/**
 * Retorna todas as reposições de um aluno, ordenadas por data descendente.
 */
export async function buscarReposicoesPorAluno(idAluno: number): Promise<Reposicao[]> {
  const db = await getDb();
  return await db.select(
    `SELECT
       r.id_reposicao,
       r.id_aluno,
       a.nome as nomeAluno,
       r.id_turma_reposicao,
       m.modalidade,
       t.dia_semana,
       CAST(t.horario_inicio AS INTEGER) as horario_inicio,
       r.data_reposicao,
       r.status,
       r.observacao
     FROM REPOSICAO_AULA r
     JOIN ALUNOS a  ON r.id_aluno           = a.id_aluno
     JOIN TURMAS t  ON r.id_turma_reposicao = t.id_turma
     LEFT JOIN MODALIDADE m ON t.id_modalidade = m.id_modalidade
     WHERE r.id_aluno = $1
     ORDER BY r.data_reposicao DESC`,
    [idAluno]
  );
}

/**
 * Retorna todas as reposições com filtros opcionais de status e período.
 */
export async function buscarTodasReposicoes(filtros?: {
  status?: StatusReposicao;
  dataInicio?: string;
  dataFim?: string;
}): Promise<Reposicao[]> {
  const db = await getDb();
  let query = `
    SELECT
      r.id_reposicao,
      r.id_aluno,
      a.nome as nomeAluno,
      r.id_turma_reposicao,
      m.modalidade,
      t.dia_semana,
      CAST(t.horario_inicio AS INTEGER) as horario_inicio,
      r.data_reposicao,
      r.status,
      r.observacao
    FROM REPOSICAO_AULA r
    JOIN ALUNOS a  ON r.id_aluno           = a.id_aluno
    JOIN TURMAS t  ON r.id_turma_reposicao = t.id_turma
    LEFT JOIN MODALIDADE m ON t.id_modalidade = m.id_modalidade
    WHERE 1=1
  `;
  const params: any[] = [];
  let idx = 1;
  if (filtros?.status)     { query += ` AND r.status = $${idx++}`;           params.push(filtros.status); }
  if (filtros?.dataInicio) { query += ` AND r.data_reposicao >= $${idx++}`;  params.push(filtros.dataInicio); }
  if (filtros?.dataFim)    { query += ` AND r.data_reposicao <= $${idx++}`;  params.push(filtros.dataFim); }
  query += ` ORDER BY r.data_reposicao DESC`;
  return await db.select(query, params);
}

/**
 * Retorna os alunos em reposição para uma turma numa data específica.
 * Usado pela tela de chamada.
 */
export async function buscarReposicoesParaChamada(
  idTurma: number,
  data: string
): Promise<ReposicaoChamada[]> {
  const db = await getDb();
  return await db.select(
    `SELECT
       r.id_reposicao,
       r.id_aluno,
       a.nome,
       a.tel as telefone,
       r.status
     FROM REPOSICAO_AULA r
     JOIN ALUNOS a ON r.id_aluno = a.id_aluno
     WHERE r.id_turma_reposicao = $1
       AND r.data_reposicao = $2
       AND r.status = 'AGENDADA'
     ORDER BY a.nome ASC`,
    [idTurma, data]
  );
}

/**
 * Cancela todas as reposições AGENDADAS de um aluno (chamado ao inativar aluno).
 */
export async function cancelarReposicoesDoAluno(idAluno: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE REPOSICAO_AULA SET status = 'CANCELADA'
     WHERE id_aluno = $1 AND status = 'AGENDADA'`,
    [idAluno]
  );
}
