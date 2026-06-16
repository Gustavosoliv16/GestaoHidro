import Database from "@tauri-apps/plugin-sql";

async function obterBancoPreparado() {
  const db = await Database.load("sqlite:gestao_hidro.db");
  return db;
}

export async function criarTurma(dadosTurma: {
  diaSemana: number;  
  horarioInicio: number;  
  horarioFim: number;     
  idModalidade: number;
  capacidadeMaxima?: number;
}) {
  const db = await obterBancoPreparado();
  const capMax = dadosTurma.capacidadeMaxima ?? 6;

  const resultado: any = await db.execute(
    `INSERT INTO TURMAS (dia_semana, horario_inicio, horario_fim, id_modalidade, capacidade_maxima) 
     VALUES ($1, $2, $3, $4, $5)`,
    [
      dadosTurma.diaSemana,
      dadosTurma.horarioInicio,
      dadosTurma.horarioFim,
      dadosTurma.idModalidade,
      capMax,
    ]
  );
  return { sucesso: true, idTurma: resultado.lastInsertId  };
}

export function parseDiaSemana(valor: string | number): number {
  const n = Number(valor);
  if (n === 7) return 6;
  return n;
}

export function parseHora(valor: string | number): number {
  if (typeof valor === "number") return Math.round(valor);
  const s = String(valor).trim();
  if (s.includes(":")) {
    return parseInt(s.split(":")[0], 10);
  }
  return parseInt(s, 10);
}

export async function buscarTodasTurmas() {
  const db = await obterBancoPreparado();
  
  const turmas: any[] = await db.select(`
    SELECT 
      t.id_turma,
      t.dia_semana as diaSemana,
      t.horario_inicio as horarioInicio,
      t.horario_fim as horarioFim,
      t.capacidade_maxima as capacidadeMaxima,
      t.id_modalidade,
      m.modalidade,
      (SELECT COUNT(*) FROM ALUNO_HORARIO_PADRAO hp WHERE hp.id_turma = t.id_turma) as totalAlunos
    FROM TURMAS t
    LEFT JOIN MODALIDADE m ON t.id_modalidade = m.id_modalidade
    ORDER BY t.dia_semana ASC, t.horario_inicio ASC
  `);
  
  return turmas.map((t) => ({
    ...t,
    diaSemana:     parseDiaSemana(t.diaSemana),
    horarioInicio: parseHora(t.horarioInicio),
    horarioFim:    parseHora(t.horarioFim),
  }));
}

export async function buscarAlunosDaTurma(idTurma: number) {
  const db = await obterBancoPreparado();
  
  const alunos: any[] = await db.select(`
    SELECT a.id_aluno, a.nome, a.tel as telefone, a.ativo
    FROM ALUNO_HORARIO_PADRAO hp
    JOIN ALUNOS a ON hp.id_aluno = a.id_aluno
    WHERE hp.id_turma = $1
    ORDER BY a.nome ASC
  `, [idTurma]);
  
  return alunos;
}

export async function vincularAlunoTurma(idAluno: number, idTurma: number) {
  const db = await obterBancoPreparado();

  const infoTurma: any[] = await db.select(`
    SELECT 
      t.capacidade_maxima as capacidadeMaxima,
      (SELECT COUNT(*) FROM ALUNO_HORARIO_PADRAO hp WHERE hp.id_turma = t.id_turma) as totalAlunos
    FROM TURMAS t
    WHERE t.id_turma = $1
  `, [idTurma]);

  if (infoTurma.length === 0) {
    return { sucesso: false, mensagem: "Turma não encontrada no sistema." };
  }

  const { capacidadeMaxima, totalAlunos } = infoTurma[0];


  if (totalAlunos >= capacidadeMaxima) {
    return { sucesso: false, mensagem: `A turma já atingiu o limite máximo de ${capacidadeMaxima} alunos.` };
  }

  try {
    await db.execute(
      `INSERT INTO ALUNO_HORARIO_PADRAO (id_aluno, id_turma) VALUES ($1, $2)`,
      [idAluno, idTurma]
    );
    return { sucesso: true, mensagem: "Aluno vinculado à turma com sucesso!" };
  } catch (error: any) {

    if (error.toString().includes("UNIQUE constraint failed")) {
      return { sucesso: false, mensagem: "Este aluno já está matriculado nesta turma." };
    }
    throw error;
  }
}

export async function desvincularAlunoTurma(idAluno: number, idTurma: number) {
  const db = await obterBancoPreparado();
  
  await db.execute(
    `DELETE FROM ALUNO_HORARIO_PADRAO WHERE id_aluno = $1 AND id_turma = $2`,
    [idAluno, idTurma]
  );
  return { sucesso: true, mensagem: "Aluno removido da turma." };
}

export async function verificarConflitoDeTurma(
  diaSemana: number,
  horarioInicio: number,
  idTurmaExcluir?: number 
): Promise<boolean> {
  const db = await obterBancoPreparado();
  const rows: any[] = await db.select(
    `SELECT id_turma FROM TURMAS
     WHERE dia_semana = $1
       AND CAST(horario_inicio AS INTEGER) = $2
       AND ($3 IS NULL OR id_turma != $3)`,
    [diaSemana, horarioInicio, idTurmaExcluir ?? null]
  );
  return rows.length > 0;
}

export async function editarTurma(idTurma: number, dados: {
  diaSemana: number;
  horarioInicio: number;
  horarioFim: number;
  idModalidade: number;
  capacidadeMaxima: number;
}) {
  const db = await obterBancoPreparado();
  await db.execute(
    `UPDATE TURMAS
     SET dia_semana = $1, horario_inicio = $2, horario_fim = $3,
         id_modalidade = $4, capacidade_maxima = $5
     WHERE id_turma = $6`,
    [dados.diaSemana, dados.horarioInicio, dados.horarioFim,
     dados.idModalidade, dados.capacidadeMaxima, idTurma]
  );
  return { sucesso: true, mensagem: "Turma atualizada com sucesso!" };
}

export async function excluirTurma(idTurma: number){
  const db = await obterBancoPreparado();
  await db.execute(`DELETE FROM ALUNO_HORARIO_PADRAO WHERE id_turma = $1`, [idTurma]);
  await db.execute(`DELETE FROM TURMAS WHERE id_turma = $1`, [idTurma]);
  return { sucesso: true, mensagem: "Turma excluída com sucesso!" };
}