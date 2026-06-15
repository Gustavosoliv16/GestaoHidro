import Database from "@tauri-apps/plugin-sql";

async function obterBancoPreparado() {
  const db = await Database.load("sqlite:gestao_hidro.db");
  return db;
}

export async function salvarAlunoCompleto(dadosForm: any) {
  const db = await obterBancoPreparado();

  try {
    await db.execute("BEGIN TRANSACTION;");

    const idModalidade = dadosForm.modalidade;

    const resultadoEndereco: any = await db.execute(
      `INSERT INTO ENDERECO (logradouro, bairro, cidade, numero) 
       VALUES ($1, $2, $3, $4)`,
      [
        dadosForm.endereco,
        dadosForm.bairro,
        dadosForm.cidade,
        dadosForm.numero,
      ],
    );
    const idEnderecoGerado = resultadoEndereco.lastInsertId;

    // Data de cadastro = hoje (YYYY-MM-DD)
    const hoje = new Date();
    const dataCadastro = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    const diaVenc = Number.isFinite(dadosForm.diaVencimento) && dadosForm.diaVencimento !== null
      ? Math.trunc(dadosForm.diaVencimento)
      : hoje.getDate();

    const resultadoAluno: any = await db.execute(
      `INSERT INTO ALUNOS (nome, tel, documento, data_nascimento, dia_vencimento, valor_mensalidade, id_modalidade, id_endereco, data_cadastro) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        dadosForm.nome,
        dadosForm.telefone,
        dadosForm.documento,
        dadosForm.nascimento,
        diaVenc,
        dadosForm.valorMensalidade,
        idModalidade,
        idEnderecoGerado,
        dataCadastro,
      ],
    );
    const idAlunoGerado = resultadoAluno.lastInsertId;

    if (dadosForm.horariosFixos && dadosForm.horariosFixos.length > 0) {
      for (const h of dadosForm.horariosFixos) {
        const diaSem = Number.isFinite(h.diaSemana)
          ? Math.trunc(h.diaSemana)
          : h.diaSemana;

        const buscarTurma: any[] = await db.select(
          "SELECT id_turma FROM TURMAS WHERE dia_semana = $1 AND horario_inicio = $2",
          [diaSem, h.hora]
        );

        let idTurma: number;

        if (buscarTurma.length > 0) {
          idTurma = buscarTurma[0].id_turma;
        } else {

          const novaTurma: any = await db.execute(
            `INSERT INTO TURMAS (dia_semana, horario_inicio, horario_fim, id_modalidade) 
             VALUES ($1, $2, $3, $4)`,
            [diaSem, h.hora, h.hora, idModalidade]
          );
          idTurma = novaTurma.lastInsertId;
        }

        await db.execute(
          `INSERT INTO ALUNO_HORARIO_PADRAO (id_aluno, id_turma) VALUES ($1, $2)`,
          [idAlunoGerado, idTurma],
        );
      }
    }
    await db.execute("COMMIT;");
    return { sucesso: true, idAluno: idAlunoGerado };
  } catch (erro) {
    await db.execute("ROLLBACK;");
    console.error("Erro ao salvar aluno:", erro);
    throw erro;
  }
}

export async function buscarHorariosPorDiaSemana(diaSemana: number) {
  const db = await obterBancoPreparado();

  const resultado: any[] = await db.select(
    `
    SELECT t.horario_inicio as horario, a.nome as aluno
    FROM ALUNO_HORARIO_PADRAO hp
    JOIN ALUNOS a ON hp.id_aluno = a.id_aluno
    JOIN TURMAS t ON hp.id_turma = t.id_turma
    WHERE CAST(t.dia_semana AS INTEGER) = $1
  `,
    [diaSemana],
  );

  return resultado;
}

export async function buscarTodosAlunos() {

  const db = await obterBancoPreparado();

  const alunos: any[] = await db.select(`
    SELECT 
      a.id_aluno, 
      a.nome, 
      a.tel as telefone, 
      a.documento, 
      a.data_nascimento as nascimento, 
      a.dia_vencimento as diaVencimento, 
      a.valor_mensalidade as valorMensalidade, 
      a.ativo,
      a.id_modalidade,
      m.modalidade,
      e.logradouro as endereco,
      e.bairro,
      e.cidade,
      e.numero
    FROM ALUNOS a
    LEFT JOIN MODALIDADE m ON a.id_modalidade = m.id_modalidade
    LEFT JOIN ENDERECO e ON a.id_endereco = e.id_endereco
    ORDER BY a.nome ASC
  `);

  return alunos;
}

export async function atualizarAlunoCompleto(idAluno: number, dadosForm: any) {
  const db = await obterBancoPreparado();

  try {
    await db.execute("BEGIN TRANSACTION;");

    const infoAluno: any[] = await db.select(
      "SELECT id_endereco FROM ALUNOS WHERE id_aluno = $1",
      [idAluno],
    );

    if (infoAluno.length > 0) {
      const idEndereco = infoAluno[0].id_endereco;

      await db.execute(
        `UPDATE ENDERECO SET logradouro = $1, bairro = $2, cidade = $3, numero = $4 WHERE id_endereco = $5`,
        [
          dadosForm.endereco,
          dadosForm.bairro,
          dadosForm.cidade,
          dadosForm.numero,
          idEndereco,
        ],
      );

      await db.execute(
        `UPDATE ALUNOS 
         SET nome = $1, tel = $2, documento = $3, data_nascimento = $4, dia_vencimento = $5, valor_mensalidade = $6, id_modalidade = $7 
         WHERE id_aluno = $8`,
         [
          dadosForm.nome,
          dadosForm.telefone,
          dadosForm.documento,
          dadosForm.nascimento,
          Number.isFinite(dadosForm.diaVencimento)
            ? Math.trunc(dadosForm.diaVencimento)
            : dadosForm.diaVencimento,
          dadosForm.valorMensalidade,
          dadosForm.modalidade,
          idAluno,
        ],
      );
    }

    await db.execute("COMMIT;");
    return { sucesso: true };
  } catch (erro) {
    await db.execute("ROLLBACK;");
    console.error("Erro ao atualizar aluno:", erro);
    throw erro;
  }
}

export async function alternarStatusAluno(
  idAluno: number,
  statusAtual: number,
) {
  const db = await obterBancoPreparado();
  const novoStatus = statusAtual === 1 ? 0 : 1;

  await db.execute("UPDATE ALUNOS SET ativo = $1 WHERE id_aluno = $2", [
    novoStatus,
    idAluno,
  ]);
  return novoStatus;
}