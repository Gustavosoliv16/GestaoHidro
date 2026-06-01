import Database from "@tauri-apps/plugin-sql";

export async function salvarAlunoCompleto(dadosForm: any) {
  const db = await Database.load("sqlite:gestao_hidro.db");

  try {
    await db.execute("BEGIN TRANSACTION;");

    let idModalidade: number;
    const buscarModalidade: any[] = await db.select(
      "SELECT id_modalidade FROM MODALIDADE WHERE modalidade = $1",
      [dadosForm.modalidade]
    );

    if (buscarModalidade.length > 0) {
      idModalidade = buscarModalidade[0].id_modalidade;
    } else {
      const novaMod: any = await db.execute(
        " (modalidade) VALUES ($1)",
        [dadosForm.modalidade]
      );
      idModalidade = novaMod.lastInsertId;
    }

    const resultadoEndereco: any = await db.execute(
      `INSERT INTO ENDERECO (logradouro, bairro, cidade, numero) 
       VALUES ($1, $2, $3, $4)`,
      [dadosForm.endereco, dadosForm.bairro, dadosForm.cidade, dadosForm.numero]
    );
    const idEnderecoGerado = resultadoEndereco.lastInsertId;

    const resultadoAluno: any = await db.execute(
      `INSERT INTO ALUNOS (nome, tel, documento, data_nascimento, dia_vencimento, valor_mensalidade, id_modalidade, id_endereco) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        dadosForm.nome,
        dadosForm.telefone,
        dadosForm.documento,
        dadosForm.nascimento,
        dadosForm.diaVencimento,
        dadosForm.valorMensalidade,
        idModalidade,
        idEnderecoGerado
      ]
    );
    const idAlunoGerado = resultadoAluno.lastInsertId;

    if (dadosForm.horariosFixos && dadosForm.horariosFixos.length > 0) {
      for (const h of dadosForm.horariosFixos) {
        await db.execute(
          `INSERT INTO ALUNO_HORARIO_PADRAO (id_aluno, dia_semana, horario) 
           VALUES ($1, $2, $3)`,
          [idAlunoGerado, h.diaSemana, h.hora]
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