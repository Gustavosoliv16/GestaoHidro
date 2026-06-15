import Database from "@tauri-apps/plugin-sql";

async function obterBancoPreparado() {
  const db = await Database.load("sqlite:gestao_hidro.db");
  return db;
}

export interface StatusPagamentoAluno {
  id_aluno: number;
  nome: string;
  valorMensalidade: number;
  diaVencimento: number;
  ultimoPagamentoData: string | null;
  ultimoPagamentoValor: number | null;
}

export async function buscarStatusPagamentoAlunos(): Promise<StatusPagamentoAluno[]> {
  const db = await obterBancoPreparado();
  
  // Seleciona os alunos ativos e busca o último pagamento registrado de cada um
  const resultado: StatusPagamentoAluno[] = await db.select(`
    SELECT 
      a.id_aluno,
      a.nome,
      a.valor_mensalidade as valorMensalidade,
      a.dia_vencimento as diaVencimento,
      (SELECT p.data_pagamento FROM PAGAMENTO p WHERE p.id_aluno = a.id_aluno ORDER BY p.data_pagamento DESC, p.id_pagamento DESC LIMIT 1) as ultimoPagamentoData,
      (SELECT p.valor_pago FROM PAGAMENTO p WHERE p.id_aluno = a.id_aluno ORDER BY p.data_pagamento DESC, p.id_pagamento DESC LIMIT 1) as ultimoPagamentoValor
    FROM ALUNOS a
    WHERE a.ativo = 1
    ORDER BY a.nome ASC
  `);

  return resultado;
}

export async function registrarNovoPagamento(idAluno: number, valorPago: number, dataPagamento: string) {
  const db = await obterBancoPreparado();
  const res: any = await db.execute(
    "INSERT INTO PAGAMENTO (id_aluno, valor_pago, data_pagamento) VALUES ($1, $2, $3)",
    [idAluno, valorPago, dataPagamento]
  );
  return { sucesso: true, idPagamento: res.lastInsertId };
}

export async function buscarHistoricoPagamentos(idAluno: number) {
  const db = await obterBancoPreparado();
  const resultado: any[] = await db.select(
    `SELECT id_pagamento, valor_pago as valorPago, data_pagamento as dataPagamento 
     FROM PAGAMENTO 
     WHERE id_aluno = $1 
     ORDER BY data_pagamento DESC, id_pagamento DESC`,
    [idAluno]
  );
  return resultado;
}

export async function excluirPagamento(idPagamento: number) {
  const db = await obterBancoPreparado();
  await db.execute("DELETE FROM PAGAMENTO WHERE id_pagamento = $1", [idPagamento]);
  return { sucesso: true, mensagem: "Pagamento estornado com sucesso!" };
}
