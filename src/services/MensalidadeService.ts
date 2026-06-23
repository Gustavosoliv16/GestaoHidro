import Database from "@tauri-apps/plugin-sql";
import { cancelarReposicoesDoAluno } from "./ReposicaoService";

async function obterBanco() {
  return await Database.load("sqlite:gestao_hidro.db");
}

export interface Mensalidade {
  id_mensalidade: number;
  id_aluno: number;
  mes_referencia: string;  
  data_vencimento: string;     
  valor: number;
  status: "EM_ABERTO" | "PENDENTE" | "ATRASADO" | "PAGO";
  data_pagamento: string | null;
  valor_pago: number | null;
  criado_em: string;
  detalhes_pagamento?: string | null;
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

export type FormaPagamento = "DINHEIRO" | "PIX" | "CARTAO";
export type RecebedorPix = "ANA" | "SAVIA" | "ALISSON" | "ZACARIAS";
export type TipoCartao = "CREDITO" | "DEBITO";

export interface DetalhePagamentoMensalidade {
  forma_pagamento: FormaPagamento;
  valor: number;
  recebedor_pix?: RecebedorPix | null;
  tipo_cartao?: TipoCartao | null;
}

export interface DadosPagamentoMensalidade {
  detalhes?: DetalhePagamentoMensalidade[];
  observacao?: string;
}


function obterHojeStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function garantirTabelaDetalhesPagamento(db: any): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS "PAGAMENTO_MENSALIDADE_DETALHE" (
      "id_detalhe"      INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "id_mensalidade"  INTEGER NOT NULL,
      "forma_pagamento" TEXT NOT NULL,
      "valor"           REAL NOT NULL,
      "recebedor_pix"   TEXT,
      "tipo_cartao"     TEXT,
      "observacao"      TEXT,
      "criado_em"       TEXT NOT NULL,
      FOREIGN KEY("id_mensalidade") REFERENCES "MENSALIDADE"("id_mensalidade")
    );
  `);
}

function obterMesReferenciaAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function calcularDataVencimento(mesReferencia: string, diaVencimento: number): string {
  const [ano, mes] = mesReferencia.split("-").map(Number);
  let anoVenc = ano;
  let mesVenc = mes + 1;
  if (mesVenc > 12) {
    mesVenc = 1;
    anoVenc++;
  }
  

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

function diasEntre(data1: string, data2: string): number {
  const d1 = new Date(data1 + "T00:00:00");
  const d2 = new Date(data2 + "T00:00:00");
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}


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

export async function sincronizarMensalidades(idAluno: number): Promise<void> {
  const db = await obterBanco();

  const alunos: any[] = await db.select(
    `SELECT dia_vencimento, valor_mensalidade, data_cadastro FROM ALUNOS WHERE id_aluno = $1`,
    [idAluno]
  );

  if (alunos.length === 0) return;

  const aluno = alunos[0];
  const diaVencimento = Math.trunc(Number(aluno.dia_vencimento || 10));
  const valorMensalidade = Number(aluno.valor_mensalidade || 0);

  let mesCadastro: string;
  if (aluno.data_cadastro) {
    const partes = aluno.data_cadastro.split("-");
    mesCadastro = `${partes[0]}-${partes[1]}`;
  } else {
    mesCadastro = obterMesReferenciaAtual();
  }

  const hoje = obterHojeStr();
  const mesAtual = obterMesReferenciaAtual();
  const mesesNecessarios = calcularMesesNecessarios(mesCadastro, mesAtual);

  const existentes: any[] = await db.select(
    `SELECT id_mensalidade, mes_referencia, status, data_vencimento FROM MENSALIDADE WHERE id_aluno = $1`,
    [idAluno]
  );
  const mesesExistentes = new Map(existentes.map((m) => [m.mes_referencia, m]));

  for (const mes of mesesNecessarios) {
    const dataVencimento = calcularDataVencimento(mes, diaVencimento);

    if (!mesesExistentes.has(mes)) {
      const statusInicial = calcularStatusPorData(dataVencimento);
      await db.execute(
        `INSERT INTO MENSALIDADE (id_aluno, mes_referencia, data_vencimento, valor, status, criado_em)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [idAluno, mes, dataVencimento, valorMensalidade, statusInicial, hoje]
      );
    } else {
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

  // Auto-inativar aluno se tiver mensalidade ATRASADA e ainda estiver ativo
  const atrasadas: any[] = await db.select(
    `SELECT COUNT(*) as total FROM MENSALIDADE WHERE id_aluno = $1 AND status = 'ATRASADO'`,
    [idAluno]
  );
  const temAtrasada = Number(atrasadas[0]?.total ?? 0) > 0;

  if (temAtrasada) {
    // Inativa o aluno
    await db.execute(
      `UPDATE ALUNOS SET ativo = 0 WHERE id_aluno = $1 AND ativo = 1`,
      [idAluno]
    );
    // Remove de todas as turmas
    await db.execute(
      `DELETE FROM ALUNO_HORARIO_PADRAO WHERE id_aluno = $1`,
      [idAluno]
    );
    // Cancela todas as reposições agendadas do aluno
    await cancelarReposicoesDoAluno(idAluno);
  }
}

export async function buscarMensalidadesDoAluno(idAluno: number): Promise<Mensalidade[]> {

  await sincronizarMensalidades(idAluno);

  const db = await obterBanco();
  await garantirTabelaDetalhesPagamento(db);

  const resultado: Mensalidade[] = await db.select(
    `SELECT
       m.*,
       (
         SELECT GROUP_CONCAT(
           CASE
             WHEN d.forma_pagamento = 'PIX' THEN 'Pix ' ||
               CASE d.recebedor_pix
                 WHEN 'ANA' THEN 'Ana'
                 WHEN 'SAVIA' THEN 'Sávia'
                 WHEN 'ALISSON' THEN 'Alisson'
                 WHEN 'ZACARIAS' THEN 'Zacarias'
                 ELSE COALESCE(d.recebedor_pix, '')
               END || ' (' || printf('%.2f', d.valor) || ')'
             WHEN d.forma_pagamento = 'CARTAO' THEN 'Cartão ' ||
               CASE d.tipo_cartao
                 WHEN 'CREDITO' THEN 'crédito'
                 WHEN 'DEBITO' THEN 'débito'
                 ELSE COALESCE(d.tipo_cartao, '')
               END || ' (' || printf('%.2f', d.valor) || ')'
             WHEN d.forma_pagamento = 'DINHEIRO' THEN 'Dinheiro (' || printf('%.2f', d.valor) || ')'
             ELSE d.forma_pagamento || ' (' || printf('%.2f', d.valor) || ')'
           END,
           ' + '
         )
         FROM PAGAMENTO_MENSALIDADE_DETALHE d
         WHERE d.id_mensalidade = m.id_mensalidade
       ) as detalhes_pagamento
     FROM MENSALIDADE m
     WHERE m.id_aluno = $1
     ORDER BY m.mes_referencia DESC`,
    [idAluno]
  );
  return resultado;
}

export async function buscarResumoFinanceiroAlunos(): Promise<ResumoFinanceiroAluno[]> {
  const db = await obterBanco();

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

  for (const aluno of alunos) {
    await sincronizarMensalidades(aluno.id_aluno);
  }

  const mesAtual = obterMesReferenciaAtual();

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

export async function registrarPagamentoMensalidade(
  idMensalidade: number,
  valorPago: number,
  dataPagamento: string,
  dadosPagamento?: DadosPagamentoMensalidade
): Promise<{ sucesso: boolean; mensagem: string }> {
  const db = await obterBanco();
  await garantirTabelaDetalhesPagamento(db);

  try {
    await db.execute("BEGIN TRANSACTION;");

    await db.execute(
      `UPDATE MENSALIDADE 
       SET status = 'PAGO', valor_pago = $1, data_pagamento = $2 
       WHERE id_mensalidade = $3`,
      [valorPago, dataPagamento, idMensalidade]
    );

    if (dadosPagamento?.detalhes) {
      await db.execute(
        `DELETE FROM PAGAMENTO_MENSALIDADE_DETALHE WHERE id_mensalidade = $1`,
        [idMensalidade]
      );

      const observacao = dadosPagamento.observacao?.trim() || null;
      const criadoEm = new Date().toISOString();

      for (const detalhe of dadosPagamento.detalhes) {
        await db.execute(
          `INSERT INTO PAGAMENTO_MENSALIDADE_DETALHE
             (id_mensalidade, forma_pagamento, valor, recebedor_pix, tipo_cartao, observacao, criado_em)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            idMensalidade,
            detalhe.forma_pagamento,
            detalhe.valor,
            detalhe.recebedor_pix ?? null,
            detalhe.tipo_cartao ?? null,
            observacao,
            criadoEm,
          ]
        );
      }
    }

    await db.execute("COMMIT;");
  } catch (error) {
    await db.execute("ROLLBACK;");
    throw error;
  }

  return { sucesso: true, mensagem: "Pagamento registrado com sucesso!" };
}

export async function estornarPagamentoMensalidade(
  idMensalidade: number
): Promise<{ sucesso: boolean; mensagem: string }> {
  const db = await obterBanco();

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

  await garantirTabelaDetalhesPagamento(db);
  await db.execute(
    `DELETE FROM PAGAMENTO_MENSALIDADE_DETALHE WHERE id_mensalidade = $1`,
    [idMensalidade]
  );

  return { sucesso: true, mensagem: "Pagamento estornado com sucesso!" };
}
