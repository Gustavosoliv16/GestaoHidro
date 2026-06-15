import Database from "@tauri-apps/plugin-sql";

async function obterBanco() {
  return await Database.load("sqlite:gestao_hidro.db");
}

// ─── Tipos ───────────────────────────────────────────────────────────

export interface Mensalidade {
  id_mensalidade: number;
  id_aluno: number;
  mes_referencia: string;       // "YYYY-MM"
  data_vencimento: string;      // "YYYY-MM-DD"
  valor: number;
  status: "EM_ABERTO" | "PENDENTE" | "ATRASADO" | "PAGO";
  data_pagamento: string | null;
  valor_pago: number | null;
  criado_em: string;
}

export interface ResumoFinanceiroAluno {
  id_aluno: number;
  nome: string;
  valorMensalidade: number;
  diaVencimento: number;
  modalidade: string | null;
  totalEmAberto: number;
  totalPendente: number;
  totalAtrasado: number;
  totalPago: number;
}

// ─── Utilitários de Data ─────────────────────────────────────────────

function obterHojeStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function obterMesReferenciaAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Retorna "YYYY-MM-DD" para o vencimento de um dado mês (vence no diaVencimento do mês seguinte) */
function calcularDataVencimento(mesReferencia: string, diaVencimento: number): string {
  const [ano, mes] = mesReferencia.split("-").map(Number);
  let anoVenc = ano;
  let mesVenc = mes + 1;
  if (mesVenc > 12) {
    mesVenc = 1;
    anoVenc++;
  }
  // Limitar o dia ao último dia do mês de vencimento (ex: dia 31 em fevereiro → 28/29)
  const ultimoDia = new Date(anoVenc, mesVenc, 0).getDate();
  const diaReal = Math.min(diaVencimento, ultimoDia);
  return `${anoVenc}-${String(mesVenc).padStart(2, "0")}-${String(diaReal).padStart(2, "0")}`;
}

function gerarMesesEntre(mesInicio: string, mesFim: string): string[] {
  const meses: string[] = [];
  let [ano, mes] = mesInicio.split("-").map(Number);
  const [anoF, mesF] = mesFim.split("-").map(Number);

  while (ano < anoF || (ano === anoF && mes <= mesF)) {
    meses.push(`${ano}-${String(mes).padStart(2, "0")}`);
    mes++;
    if (mes > 12) {
      mes = 1;
      ano++;
    }
  }

  return meses;
}

/** Calcula os meses necessários desde o mês de cadastro até 2 meses no futuro em relação ao mês atual */
function calcularMesesNecessarios(mesCadastro: string, mesAtual: string): string[] {
  const [anoAtual, mesAtualNum] = mesAtual.split("-").map(Number);
  let anoLimite = anoAtual;
  let mesLimite = mesAtualNum + 2;
  if (mesLimite > 12) {
    mesLimite -= 12;
    anoLimite += 1;
  }
  const mesLimiteStr = `${anoLimite}-${String(mesLimite).padStart(2, "0")}`;
  const mesFim = mesCadastro > mesLimiteStr ? mesCadastro : mesLimiteStr;
  return gerarMesesEntre(mesCadastro, mesFim);
}

/** Calcula a diferença em dias entre duas datas "YYYY-MM-DD" */
function diasEntre(data1: string, data2: string): number {
  const d1 = new Date(data1 + "T00:00:00");
  const d2 = new Date(data2 + "T00:00:00");
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

/** Determina o status correto baseado na data de vencimento e na data de hoje */
function calcularStatusPorData(dataVencimento: string): "EM_ABERTO" | "PENDENTE" | "ATRASADO" {
  const hoje = obterHojeStr();
  const diff = diasEntre(dataVencimento, hoje);

  if (diff > 10) {
    return "ATRASADO";
  } else if (diff > 0) {
    return "PENDENTE";
  } else {
    return "EM_ABERTO";
  }
}

// ─── Sincronização ──────────────────────────────────────────────────

/**
 * Sincroniza as mensalidades de um aluno:
 * 1. Calcula todos os meses desde a data de cadastro até hoje, respeitando o vencimento
 * 2. Cria mensalidades que não existem
 * 3. Atualiza o status das não-pagas conforme a data
 */
export async function sincronizarMensalidades(idAluno: number): Promise<void> {
  const db = await obterBanco();

  // Buscar dados do aluno
  const alunos: any[] = await db.select(
    `SELECT dia_vencimento, valor_mensalidade, data_cadastro FROM ALUNOS WHERE id_aluno = $1`,
    [idAluno]
  );

  if (alunos.length === 0) return;

  const aluno = alunos[0];
  const diaVencimento = Math.trunc(Number(aluno.dia_vencimento || 10));
  const valorMensalidade = Number(aluno.valor_mensalidade || 0);

  // Determinar o mês de início
  let mesCadastro: string;
  if (aluno.data_cadastro) {
    const partes = aluno.data_cadastro.split("-");
    mesCadastro = `${partes[0]}-${partes[1]}`;
  } else {
    // Fallback: mês atual
    mesCadastro = obterMesReferenciaAtual();
  }

  const hoje = obterHojeStr();
  const mesAtual = obterMesReferenciaAtual();
  const mesesNecessarios = calcularMesesNecessarios(mesCadastro, mesAtual);

  // Buscar mensalidades existentes desse aluno
  const existentes: any[] = await db.select(
    `SELECT id_mensalidade, mes_referencia, status, data_vencimento FROM MENSALIDADE WHERE id_aluno = $1`,
    [idAluno]
  );
  const mesesExistentes = new Map(existentes.map((m) => [m.mes_referencia, m]));

  for (const mes of mesesNecessarios) {
    const dataVencimento = calcularDataVencimento(mes, diaVencimento);

    if (!mesesExistentes.has(mes)) {
      // Criar a mensalidade
      const statusInicial = calcularStatusPorData(dataVencimento);
      await db.execute(
        `INSERT INTO MENSALIDADE (id_aluno, mes_referencia, data_vencimento, valor, status, criado_em)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [idAluno, mes, dataVencimento, valorMensalidade, statusInicial, hoje]
      );
    } else {
      // Atualizar status se não está pago
      const existente = mesesExistentes.get(mes)!;
      if (existente.status !== "PAGO") {
        const novoStatus = calcularStatusPorData(dataVencimento);
        if (novoStatus !== existente.status) {
          await db.execute(
            `UPDATE MENSALIDADE SET status = $1 WHERE id_mensalidade = $2`,
            [novoStatus, existente.id_mensalidade]
          );
        }
      }
    }
  }
}

// ─── Consultas ──────────────────────────────────────────────────────

/** Busca todas as mensalidades de um aluno (mais recentes primeiro) */
export async function buscarMensalidadesDoAluno(idAluno: number): Promise<Mensalidade[]> {
  // Sincronizar antes de retornar
  await sincronizarMensalidades(idAluno);

  const db = await obterBanco();
  const resultado: Mensalidade[] = await db.select(
    `SELECT * FROM MENSALIDADE WHERE id_aluno = $1 ORDER BY mes_referencia DESC`,
    [idAluno]
  );
  return resultado;
}

/** Busca resumo financeiro de todos os alunos ativos */
export async function buscarResumoFinanceiroAlunos(): Promise<ResumoFinanceiroAluno[]> {
  const db = await obterBanco();

  // Primeiro, buscar todos os alunos ativos
  const alunos: any[] = await db.select(`
    SELECT 
      a.id_aluno,
      a.nome,
      a.valor_mensalidade as valorMensalidade,
      a.dia_vencimento as diaVencimento,
      a.data_cadastro,
      m.modalidade
    FROM ALUNOS a
    LEFT JOIN MODALIDADE m ON a.id_modalidade = m.id_modalidade
    WHERE a.ativo = 1
    ORDER BY a.nome ASC
  `);

  // Sincronizar mensalidades de cada aluno
  for (const aluno of alunos) {
    await sincronizarMensalidades(aluno.id_aluno);
  }

  const mesAtual = obterMesReferenciaAtual();

  // Buscar contagens agrupadas (apenas considerando meses <= mesAtual para o status em aberto/não vencido)
  const contagens: any[] = await db.select(`
    SELECT 
      id_aluno,
      SUM(CASE WHEN status = 'EM_ABERTO' AND mes_referencia <= $1 THEN 1 ELSE 0 END) as totalEmAberto,
      SUM(CASE WHEN status = 'PENDENTE' THEN 1 ELSE 0 END) as totalPendente,
      SUM(CASE WHEN status = 'ATRASADO' THEN 1 ELSE 0 END) as totalAtrasado,
      SUM(CASE WHEN status = 'PAGO' THEN 1 ELSE 0 END) as totalPago
    FROM MENSALIDADE
    GROUP BY id_aluno
  `, [mesAtual]);
  const contagemMap = new Map(contagens.map((c) => [c.id_aluno, c]));

  return alunos.map((a) => {
    const c = contagemMap.get(a.id_aluno);
    return {
      id_aluno: a.id_aluno,
      nome: a.nome,
      valorMensalidade: Number(a.valorMensalidade || 0),
      diaVencimento: Math.trunc(Number(a.diaVencimento || 10)),
      modalidade: a.modalidade || null,
      totalEmAberto: Math.trunc(Number(c?.totalEmAberto || 0)),
      totalPendente: Math.trunc(Number(c?.totalPendente || 0)),
      totalAtrasado: Math.trunc(Number(c?.totalAtrasado || 0)),
      totalPago: Math.trunc(Number(c?.totalPago || 0)),
    };
  });
}

// ─── Ações ──────────────────────────────────────────────────────────

/** Registra o pagamento de uma mensalidade */
export async function registrarPagamentoMensalidade(
  idMensalidade: number,
  valorPago: number,
  dataPagamento: string
): Promise<{ sucesso: boolean; mensagem: string }> {
  const db = await obterBanco();

  await db.execute(
    `UPDATE MENSALIDADE 
     SET status = 'PAGO', valor_pago = $1, data_pagamento = $2 
     WHERE id_mensalidade = $3`,
    [valorPago, dataPagamento, idMensalidade]
  );

  return { sucesso: true, mensagem: "Pagamento registrado com sucesso!" };
}

/** Estorna um pagamento (volta para o status calculado) */
export async function estornarPagamentoMensalidade(
  idMensalidade: number
): Promise<{ sucesso: boolean; mensagem: string }> {
  const db = await obterBanco();

  // Buscar a mensalidade para recalcular o status
  const mensalidades: any[] = await db.select(
    `SELECT data_vencimento FROM MENSALIDADE WHERE id_mensalidade = $1`,
    [idMensalidade]
  );

  if (mensalidades.length === 0) {
    return { sucesso: false, mensagem: "Mensalidade não encontrada." };
  }

  const novoStatus = calcularStatusPorData(mensalidades[0].data_vencimento);

  await db.execute(
    `UPDATE MENSALIDADE 
     SET status = $1, valor_pago = NULL, data_pagamento = NULL 
     WHERE id_mensalidade = $2`,
    [novoStatus, idMensalidade]
  );

  return { sucesso: true, mensagem: "Pagamento estornado com sucesso!" };
}
