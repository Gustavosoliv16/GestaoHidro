import Database from "@tauri-apps/plugin-sql";
import { cancelarReposicoesDoAluno } from "./ReposicaoService";

async function obterBancoPreparado() {
  const db = await Database.load("sqlite:gestao_hidro.db");
  return db;
}

// ── Helpers de responsável ────────────────────────────────────────────────────

/**
 * Salva ou atualiza um responsável.
 * - Se já existir um com o mesmo documento, atualiza nome e telefone e retorna o id.
 * - Se não existir, insere e retorna o novo id.
 * - Se dados vazios, retorna null.
 */
async function salvarOuAtualizarResponsavel(
  db: any,
  dados: { nome: string; telefone: string; documento: string }
): Promise<number | null> {
  const doc = dados.documento.replace(/\D/g, "");
  if (!dados.nome.trim() && !doc) return null;

  const existente: any[] = await db.select(
    `SELECT id_responsavel FROM RESPONSAVEL WHERE documento = $1`,
    [doc]
  );

  if (existente.length > 0) {
    const id = existente[0].id_responsavel;
    await db.execute(
      `UPDATE RESPONSAVEL SET nome = $1, telefone = $2 WHERE id_responsavel = $3`,
      [dados.nome.trim(), dados.telefone.replace(/\D/g, ""), id]
    );
    return id;
  }

  const res: any = await db.execute(
    `INSERT INTO RESPONSAVEL (nome, documento, telefone) VALUES ($1, $2, $3)`,
    [dados.nome.trim(), doc, dados.telefone.replace(/\D/g, "")]
  );
  return res.lastInsertId;
}

// ── Serviços públicos ────────────────────────────────────────────────────────

export async function salvarAlunoCompleto(dadosForm: any) {
  const db = await obterBancoPreparado();

  try {
    await db.execute("BEGIN TRANSACTION;");

    const idModalidade = dadosForm.modalidade;

    const resultadoEndereco: any = await db.execute(
      `INSERT INTO ENDERECO (logradouro, bairro, cidade, numero) 
       VALUES ($1, $2, $3, $4)`,
      [dadosForm.endereco, dadosForm.bairro, dadosForm.cidade, dadosForm.numero]
    );
    const idEnderecoGerado = resultadoEndereco.lastInsertId;

    // Responsável (opcional, obrigatório para infantil/bebê — validado no front)
    let idResponsavel: number | null = null;
    if (dadosForm.responsavel?.nome?.trim()) {
      idResponsavel = await salvarOuAtualizarResponsavel(db, dadosForm.responsavel);
    }

    const hoje = new Date();
    const dataCadastro = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

    const diaVenc =
      Number.isFinite(dadosForm.diaVencimento) && dadosForm.diaVencimento !== null
        ? Math.trunc(dadosForm.diaVencimento)
        : hoje.getDate();

    const resultadoAluno: any = await db.execute(
      `INSERT INTO ALUNOS (nome, tel, email, documento, data_nascimento, dia_vencimento, valor_mensalidade, id_modalidade, id_endereco, id_responsavel, data_cadastro) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        dadosForm.nome,
        dadosForm.telefone,
        dadosForm.email || null,
        dadosForm.documento,
        dadosForm.nascimento,
        diaVenc,
        dadosForm.valorMensalidade,
        idModalidade,
        idEnderecoGerado,
        idResponsavel,
        dataCadastro,
      ]
    );
    const idAlunoGerado = resultadoAluno.lastInsertId;

    // Turmas criadas aqui fazem parte da mesma transação — se houver falha,
    // o ROLLBACK desfaz tanto o aluno quanto as turmas criadas neste bloco.
    if (dadosForm.horariosFixos && dadosForm.horariosFixos.length > 0) {
      for (const h of dadosForm.horariosFixos) {
        const diaSem = Number.isFinite(h.diaSemana) ? Math.trunc(h.diaSemana) : h.diaSemana;
        const buscarTurma: any[] = await db.select(
          "SELECT id_turma FROM TURMAS WHERE dia_semana = $1 AND horario_inicio = $2",
          [diaSem, h.hora]
        );
        let idTurma: number;
        if (buscarTurma.length > 0) {
          idTurma = buscarTurma[0].id_turma;
        } else {
          const novaTurma: any = await db.execute(
            `INSERT INTO TURMAS (dia_semana, horario_inicio, horario_fim, id_modalidade) VALUES ($1, $2, $3, $4)`,
            [diaSem, h.hora, h.hora, idModalidade]
          );
          idTurma = novaTurma.lastInsertId;
        }
        await db.execute(
          `INSERT INTO ALUNO_HORARIO_PADRAO (id_aluno, id_turma) VALUES ($1, $2)`,
          [idAlunoGerado, idTurma]
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
    `SELECT t.horario_inicio as horario, a.nome as aluno
     FROM ALUNO_HORARIO_PADRAO hp
     JOIN ALUNOS a ON hp.id_aluno = a.id_aluno
     JOIN TURMAS t ON hp.id_turma = t.id_turma
     WHERE CAST(t.dia_semana AS INTEGER) = $1`,
    [diaSemana]
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
      a.email,
      a.documento,
      a.data_nascimento as nascimento,
      a.dia_vencimento as diaVencimento,
      a.valor_mensalidade as valorMensalidade,
      a.ativo,
      a.id_modalidade,
      a.id_responsavel,
      m.modalidade,
      e.logradouro as endereco,
      e.bairro,
      e.cidade,
      e.numero,
      r.nome       as nomeResponsavel,
      r.telefone   as telefoneResponsavel,
      r.documento  as documentoResponsavel
    FROM ALUNOS a
    LEFT JOIN MODALIDADE m  ON a.id_modalidade  = m.id_modalidade
    LEFT JOIN ENDERECO e    ON a.id_endereco    = e.id_endereco
    LEFT JOIN RESPONSAVEL r ON a.id_responsavel = r.id_responsavel
    ORDER BY a.nome ASC
  `);
  return alunos;
}

export async function atualizarAlunoCompleto(idAluno: number, dadosForm: any) {
  const db = await obterBancoPreparado();

  try {
    await db.execute("BEGIN TRANSACTION;");

    const infoAluno: any[] = await db.select(
      "SELECT id_endereco, id_responsavel FROM ALUNOS WHERE id_aluno = $1",
      [idAluno]
    );

    if (infoAluno.length > 0) {
      const { id_endereco: idEndereco } = infoAluno[0];

      await db.execute(
        `UPDATE ENDERECO SET logradouro = $1, bairro = $2, cidade = $3, numero = $4 WHERE id_endereco = $5`,
        [dadosForm.endereco, dadosForm.bairro, dadosForm.cidade, dadosForm.numero, idEndereco]
      );

      // Responsável
      let idResponsavel: number | null = infoAluno[0].id_responsavel ?? null;
      if (dadosForm.responsavel?.nome?.trim()) {
        idResponsavel = await salvarOuAtualizarResponsavel(db, dadosForm.responsavel);
      } else if (dadosForm.responsavel !== undefined && !dadosForm.responsavel?.nome?.trim()) {
        // Campo enviado mas vazio — desvincula responsável
        idResponsavel = null;
      }

      await db.execute(
        `UPDATE ALUNOS 
         SET nome = $1, tel = $2, email = $3, documento = $4, data_nascimento = $5,
             dia_vencimento = $6, valor_mensalidade = $7, id_modalidade = $8,
             id_responsavel = $9
         WHERE id_aluno = $10`,
        [
          dadosForm.nome,
          dadosForm.telefone,
          dadosForm.email || null,
          dadosForm.documento,
          dadosForm.nascimento,
          Number.isFinite(dadosForm.diaVencimento)
            ? Math.trunc(dadosForm.diaVencimento)
            : dadosForm.diaVencimento,
          dadosForm.valorMensalidade,
          dadosForm.modalidade,
          idResponsavel,
          idAluno,
        ]
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

export async function alternarStatusAluno(idAluno: number, statusAtual: number) {
  const db = await obterBancoPreparado();
  const novoStatus = statusAtual === 1 ? 0 : 1;

  await db.execute("UPDATE ALUNOS SET ativo = $1 WHERE id_aluno = $2", [novoStatus, idAluno]);

  // Se foi inativado, remove de todas as turmas e cancela reposições agendadas
  if (novoStatus === 0) {
    await db.execute(
      "DELETE FROM ALUNO_HORARIO_PADRAO WHERE id_aluno = $1",
      [idAluno]
    );
    await cancelarReposicoesDoAluno(idAluno);
  }

  return novoStatus;
}

export async function excluirAlunoCompleto(idAluno: number) {
  const db = await obterBancoPreparado();

  try {
    await db.execute("BEGIN TRANSACTION;");

    // 1. Verificar se o endereço é compartilhado
    const infoAluno: any[] = await db.select(
      "SELECT id_endereco, id_responsavel FROM ALUNOS WHERE id_aluno = $1",
      [idAluno]
    );

    if (infoAluno.length === 0) {
      throw new Error("Aluno não encontrado.");
    }

    const { id_endereco, id_responsavel } = infoAluno[0];

    // 2. Verificar se outro aluno usa o mesmo endereço
    let enderecoCompartilhado = false;
    if (id_endereco) {
      const outrosComEndereco: any[] = await db.select(
        "SELECT COUNT(*) as total FROM ALUNOS WHERE id_endereco = $1 AND id_aluno != $2",
        [id_endereco, idAluno]
      );
      enderecoCompartilhado = Number(outrosComEndereco[0]?.total ?? 0) > 0;
    }

    // 3. Verificar se outro aluno tem o mesmo responsável
    let responsavelCompartilhado = false;
    if (id_responsavel) {
      const outrosComResponsavel: any[] = await db.select(
        "SELECT COUNT(*) as total FROM ALUNOS WHERE id_responsavel = $1 AND id_aluno != $2",
        [id_responsavel, idAluno]
      );
      responsavelCompartilhado = Number(outrosComResponsavel[0]?.total ?? 0) > 0;
    }

    // 4. Cancelar reposições agendadas (não pagas)
    await cancelarReposicoesDoAluno(idAluno);

    // 5. Remover vínculos com turmas
    await db.execute(
      "DELETE FROM ALUNO_HORARIO_PADRAO WHERE id_aluno = $1",
      [idAluno]
    );

    // 6. Remover mensalidades NÃO PAGAS (manter histórico financeiro)
    await db.execute(
      "DELETE FROM MENSALIDADE WHERE id_aluno = $1 AND status != 'PAGO'",
      [idAluno]
    );

    // 7. Remover endereço se não for compartilhado
    if (id_endereco && !enderecoCompartilhado) {
      await db.execute(
        "DELETE FROM ENDERECO WHERE id_endereco = $1",
        [id_endereco]
      );
    }

    // 8. Remover responsável se não for compartilhado
    if (id_responsavel && !responsavelCompartilhado) {
      await db.execute(
        "DELETE FROM RESPONSAVEL WHERE id_responsavel = $1",
        [id_responsavel]
      );
    }

    // 9. Remover o aluno
    await db.execute(
      "DELETE FROM ALUNOS WHERE id_aluno = $1",
      [idAluno]
    );

    await db.execute("COMMIT;");
    return { sucesso: true };
  } catch (erro) {
    await db.execute("ROLLBACK;");
    console.error("Erro ao excluir aluno:", erro);
    throw erro;
  }
}