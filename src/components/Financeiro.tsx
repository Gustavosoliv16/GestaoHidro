import { useState, useEffect, useRef } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Toast } from "primereact/toast";
import { Tag } from "primereact/tag";
import {
  buscarResumoFinanceiroAlunos,
  buscarMensalidadesDoAluno,
  registrarPagamentoMensalidade,
  estornarPagamentoMensalidade,
  ResumoFinanceiroAluno,
  Mensalidade,
} from "../services/MensalidadeService";

const formatarMoeda = (valor: number): string => {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const formatarData = (dataSql: string | null): string => {
  if (!dataSql) return "—";
  const parts = dataSql.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dataSql;
};

const NOMES_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const formatarMesReferencia = (mesRef: string): string => {
  const [ano, mes] = mesRef.split("-").map(Number);
  return `${NOMES_MESES[mes - 1]}/${ano}`;
};

const obterDataHojeLocal = (): string => {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
};

export default function Financeiro() {
  const toast = useRef<Toast>(null);

  const [alunos, setAlunos] = useState<ResumoFinanceiroAluno[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(false);

  const [modalMensalidadesVisible, setModalMensalidadesVisible] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState<ResumoFinanceiroAluno | null>(null);
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [carregandoMensalidades, setCarregandoMensalidades] = useState(false);

  const [modalPagamentoVisible, setModalPagamentoVisible] = useState(false);
  const [mensalidadeSelecionada, setMensalidadeSelecionada] = useState<Mensalidade | null>(null);
  const [valorPago, setValorPago] = useState<number | null>(null);
  const [dataPagamento, setDataPagamento] = useState("");

  const carregarAlunos = async () => {
    setCarregando(true);
    try {
      const dados = await buscarResumoFinanceiroAlunos();
      setAlunos(dados);
    } catch (error) {
      console.error("Erro ao carregar dados financeiros:", error);
      toast.current?.show({
        severity: "error",
        summary: "Erro",
        detail: "Não foi possível carregar as informações financeiras.",
      });
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarAlunos();
  }, []);

  const abrirMensalidades = async (aluno: ResumoFinanceiroAluno) => {
    setAlunoSelecionado(aluno);
    setModalMensalidadesVisible(true);
    setCarregandoMensalidades(true);
    try {
      const dados = await buscarMensalidadesDoAluno(aluno.id_aluno);
      setMensalidades(dados);
    } catch (error) {
      console.error("Erro ao buscar mensalidades:", error);
      toast.current?.show({
        severity: "error",
        summary: "Erro",
        detail: "Falha ao carregar mensalidades.",
      });
    } finally {
      setCarregandoMensalidades(false);
    }
  };

  const abrirFormularioPagamento = (mensalidade: Mensalidade) => {
    setMensalidadeSelecionada(mensalidade);
    setValorPago(mensalidade.valor);
    setDataPagamento(obterDataHojeLocal());
    setModalPagamentoVisible(true);
  };

  const confirmarPagamento = async () => {
    if (!mensalidadeSelecionada) return;
    if (valorPago === null || valorPago <= 0) {
      toast.current?.show({
        severity: "warn",
        summary: "Aviso",
        detail: "Informe um valor válido.",
      });
      return;
    }
    if (!dataPagamento) {
      toast.current?.show({
        severity: "warn",
        summary: "Aviso",
        detail: "Informe a data do pagamento.",
      });
      return;
    }

    try {
      await registrarPagamentoMensalidade(
        mensalidadeSelecionada.id_mensalidade,
        valorPago,
        dataPagamento
      );
      toast.current?.show({
        severity: "success",
        summary: "Sucesso",
        detail: `Pagamento de ${formatarMoeda(valorPago)} registrado!`,
      });
      setModalPagamentoVisible(false);

      if (alunoSelecionado) {
        const dados = await buscarMensalidadesDoAluno(alunoSelecionado.id_aluno);
        setMensalidades(dados);
      }
      carregarAlunos();
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
      toast.current?.show({
        severity: "error",
        summary: "Erro",
        detail: "Falha ao registrar o pagamento.",
      });
    }
  };

  const estornarPagamento = async (mensalidade: Mensalidade) => {
    if (!confirm("Tem certeza que deseja estornar este pagamento?")) return;

    try {
      await estornarPagamentoMensalidade(mensalidade.id_mensalidade);
      toast.current?.show({
        severity: "info",
        summary: "Estornado",
        detail: "Pagamento estornado com sucesso.",
      });

      if (alunoSelecionado) {
        const dados = await buscarMensalidadesDoAluno(alunoSelecionado.id_aluno);
        setMensalidades(dados);
      }
      carregarAlunos();
    } catch (error) {
      console.error("Erro ao estornar:", error);
      toast.current?.show({
        severity: "error",
        summary: "Erro",
        detail: "Falha ao estornar pagamento.",
      });
    }
  };

  const alunosFiltrados = alunos.filter((a) =>
    a.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const valorTemplate = (rowData: ResumoFinanceiroAluno) => (
    <span className="font-semibold">{formatarMoeda(rowData.valorMensalidade)}</span>
  );

  const statusGeralTemplate = (rowData: ResumoFinanceiroAluno) => {
    if (rowData.totalAtrasado > 0) {
      return <Tag value={`${rowData.totalAtrasado} Atrasado(s)`} severity="danger" className="text-xs px-2 py-1" />;
    }
    if (rowData.totalPendente > 0) {
      return <Tag value={`${rowData.totalPendente} Pendente(s)`} severity="warning" className="text-xs px-2 py-1" />;
    }
    if (rowData.totalEmAberto > 0) {
      return <Tag value="Em dia" severity="info" className="text-xs px-2 py-1" />;
    }
    return <Tag value="Tudo pago" severity="success" className="text-xs px-2 py-1" />;
  };

  const pendenciasTemplate = (rowData: ResumoFinanceiroAluno) => {
    const total = rowData.totalEmAberto + rowData.totalPendente + rowData.totalAtrasado;
    return (
      <div className="flex align-items-center gap-2">
        <span className="text-sm font-bold text-900">{total}</span>
        <span className="text-xs text-500">em aberto</span>
      </div>
    );
  };

  const acoesTemplate = (rowData: ResumoFinanceiroAluno) => (
    <Button
      icon="pi pi-list"
      label="Ver Mensalidades"
      className="p-button-sm p-button-outlined font-bold"
      onClick={() => abrirMensalidades(rowData)}
    />
  );

  const mesReferenciaTemplate = (rowData: Mensalidade) => (
    <span className="font-bold text-900">{formatarMesReferencia(rowData.mes_referencia)}</span>
  );

  const vencimentoMensalidadeTemplate = (rowData: Mensalidade) => (
    <span className="text-sm">{formatarData(rowData.data_vencimento)}</span>
  );

  const valorMensalidadeTemplate = (rowData: Mensalidade) => (
    <span>{formatarMoeda(rowData.valor)}</span>
  );

  const statusMensalidadeTemplate = (rowData: Mensalidade) => {
    const configs: Record<string, { label: string; severity: "success" | "warning" | "danger" | "info" }> = {
      PAGO: { label: "Pago", severity: "success" },
      EM_ABERTO: { label: "Em Aberto", severity: "info" },
      PENDENTE: { label: "Pendente", severity: "warning" },
      ATRASADO: { label: "Atrasado", severity: "danger" },
    };
    const cfg = configs[rowData.status] || { label: rowData.status, severity: "info" as const };
    return <Tag value={cfg.label} severity={cfg.severity} className="text-xs px-2 py-1" />;
  };

  const dataPagamentoTemplate = (rowData: Mensalidade) => {
    if (rowData.status !== "PAGO") return <span className="text-400 italic text-xs">—</span>;
    return (
      <div className="flex flex-column">
        <span className="text-sm font-semibold">{formatarData(rowData.data_pagamento)}</span>
        <span className="text-xs text-500">{formatarMoeda(rowData.valor_pago ?? 0)}</span>
      </div>
    );
  };

  const acoesMensalidadeTemplate = (rowData: Mensalidade) => {
    if (rowData.status === "PAGO") {
      return (
        <Button
          icon="pi pi-replay"
          className="p-button-danger p-button-text p-button-sm p-button-rounded"
          tooltip="Estornar pagamento"
          tooltipOptions={{ position: "left" }}
          onClick={() => estornarPagamento(rowData)}
        />
      );
    }
    return (
      <Button
        icon="pi pi-money-bill"
        label="Pagar"
        severity={rowData.status === "ATRASADO" ? "danger" : "success"}
        className="p-button-sm font-bold"
        onClick={() => abrirFormularioPagamento(rowData)}
      />
    );
  };

  return (
    <div className="w-full">
      <Toast ref={toast} />

      <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center mb-4 gap-3">
        <div>
          <h2 className="text-2xl font-bold m-0 text-900">Controle de Mensalidades</h2>
          <p className="text-sm text-500 mt-1 m-0">
            Gerencie cobranças mensais recorrentes dos alunos ativos.
          </p>
        </div>
        <div className="p-input-icon-left w-full md:w-auto">
          <InputText
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar aluno por nome..."
            className="w-full md:w-20rem p-inputtext-sm"
          />
        </div>
      </div>

      <DataTable
        value={alunosFiltrados}
        loading={carregando}
        rows={10}
        paginator
        emptyMessage="Nenhum aluno ativo encontrado."
        className="p-datatable-sm shadow-1 border-round overflow-hidden"
      >
        <Column field="nome" header="Aluno" sortable style={{ fontWeight: "bold" }} />
        <Column header="Modalidade" field="modalidade" sortable />
        <Column header="Mensalidade" body={valorTemplate} sortable field="valorMensalidade" />
        <Column header="Pendências" body={pendenciasTemplate} sortable />
        <Column
          header="Situação"
          body={statusGeralTemplate}
          style={{ textAlign: "center", width: "12rem" }}
        />
        <Column
          header="Ações"
          body={acoesTemplate}
          style={{ textAlign: "center", width: "14rem" }}
        />
      </DataTable>

      <Dialog
        header={
          alunoSelecionado
            ? `Mensalidades: ${alunoSelecionado.nome}`
            : "Mensalidades"
        }
        visible={modalMensalidadesVisible}
        style={{ width: "700px" }}
        onHide={() => setModalMensalidadesVisible(false)}
        maximizable
      >
        {alunoSelecionado && (
          <div className="flex flex-column gap-3">
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 bg-blue-50 border-round p-3 text-center">
                <span className="block text-xs font-semibold text-600 uppercase mb-1">
                  Mensalidade
                </span>
                <span className="text-xl font-bold text-primary">
                  {formatarMoeda(alunoSelecionado.valorMensalidade)}
                </span>
              </div>
              <div className="flex-1 bg-green-50 border-round p-3 text-center">
                <span className="block text-xs font-semibold text-600 uppercase mb-1">
                  Pagos
                </span>
                <span className="text-xl font-bold text-green-600">
                  {alunoSelecionado.totalPago}
                </span>
              </div>
              <div className="flex-1 bg-yellow-50 border-round p-3 text-center">
                <span className="block text-xs font-semibold text-600 uppercase mb-1">
                  Pendentes
                </span>
                <span className="text-xl font-bold text-yellow-600">
                  {alunoSelecionado.totalPendente}
                </span>
              </div>
              <div className="flex-1 bg-red-50 border-round p-3 text-center">
                <span className="block text-xs font-semibold text-600 uppercase mb-1">
                  Atrasados
                </span>
                <span className="text-xl font-bold text-red-600">
                  {alunoSelecionado.totalAtrasado}
                </span>
              </div>
            </div>

            <DataTable
              value={mensalidades}
              loading={carregandoMensalidades}
              emptyMessage="Nenhuma mensalidade gerada ainda."
              size="small"
              rows={6}
              paginator={mensalidades.length > 6}
              className="border-round"
            >
              <Column header="Mês" body={mesReferenciaTemplate} style={{ width: "10rem" }} />
              <Column header="Vencimento" body={vencimentoMensalidadeTemplate} />
              <Column header="Valor" body={valorMensalidadeTemplate} />
              <Column
                header="Status"
                body={statusMensalidadeTemplate}
                style={{ textAlign: "center", width: "8rem" }}
              />
              <Column header="Pagamento" body={dataPagamentoTemplate} />
              <Column
                header="Ações"
                body={acoesMensalidadeTemplate}
                style={{ textAlign: "center", width: "10rem" }}
              />
            </DataTable>
          </div>
        )}
      </Dialog>

      <Dialog
        header={
          mensalidadeSelecionada
            ? `Registrar Pagamento — ${formatarMesReferencia(mensalidadeSelecionada.mes_referencia)}`
            : "Registrar Pagamento"
        }
        visible={modalPagamentoVisible}
        style={{ width: "400px" }}
        onHide={() => setModalPagamentoVisible(false)}
        footer={
          <div>
            <Button
              label="Cancelar"
              icon="pi pi-times"
              className="p-button-text text-sm"
              onClick={() => setModalPagamentoVisible(false)}
            />
            <Button
              label="Confirmar Pagamento"
              icon="pi pi-check"
              className="p-button-sm font-bold p-button-success"
              onClick={confirmarPagamento}
            />
          </div>
        }
      >
        <div className="flex flex-column gap-3 pt-2">
          {mensalidadeSelecionada && (
            <div className="bg-blue-50 border-round p-3">
              <div className="flex justify-content-between">
                <span className="text-sm text-600">Referência:</span>
                <span className="font-bold">
                  {formatarMesReferencia(mensalidadeSelecionada.mes_referencia)}
                </span>
              </div>
              <div className="flex justify-content-between mt-1">
                <span className="text-sm text-600">Vencimento:</span>
                <span className="font-bold">
                  {formatarData(mensalidadeSelecionada.data_vencimento)}
                </span>
              </div>
              <div className="flex justify-content-between mt-1">
                <span className="text-sm text-600">Valor esperado:</span>
                <span className="font-bold text-primary">
                  {formatarMoeda(mensalidadeSelecionada.valor)}
                </span>
              </div>
            </div>
          )}
          <div>
            <label className="block font-bold text-sm text-700 mb-1">
              Valor Pago (R$)
            </label>
            <InputNumber
              value={valorPago}
              onValueChange={(e) => setValorPago(e.value ?? null)}
              mode="currency"
              currency="BRL"
              locale="pt-BR"
              className="w-full"
              placeholder="R$ 0,00"
            />
          </div>
          <div>
            <label className="block font-bold text-sm text-700 mb-1">
              Data do Pagamento
            </label>
            <input
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              className="p-inputtext p-component w-full"
              style={{ padding: "0.5rem" }}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
