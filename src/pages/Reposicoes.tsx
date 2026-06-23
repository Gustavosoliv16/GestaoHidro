import { useEffect, useRef, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Divider } from "primereact/divider";
import { Dropdown } from "primereact/dropdown";
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";

import {
  agendarReposicao,
  buscarTodasReposicoes,
  cancelarReposicao,
  marcarReposicaoRealizada,
  Reposicao,
  StatusReposicao,
} from "../services/ReposicaoService";
import { buscarTodosAlunos } from "../services/AlunoService";
import { buscarTodasTurmas } from "../services/TurmaService";

// ── Constantes ─────────────────────────────────────────────────────────────────
const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const STATUS_OPTIONS = [
  { label: "Todas", value: undefined },
  { label: "Agendada",  value: "AGENDADA"  },
  { label: "Realizada", value: "REALIZADA" },
  { label: "Cancelada", value: "CANCELADA" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatarData(dataSql: string): string {
  const [ano, mes, dia] = dataSql.split("-");
  return `${dia}/${mes}/${ano}`;
}

function primeiroDiaMes(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function hoje(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function amanha(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function statusSeverity(s: string): "info" | "success" | "secondary" | "warning" {
  if (s === "AGENDADA")  return "info";
  if (s === "REALIZADA") return "success";
  if (s === "CANCELADA") return "secondary";
  return "warning";
}

// ── Componente ─────────────────────────────────────────────────────────────────
export default function Reposicoes() {
  const toast = useRef<Toast>(null);

  // ── Estado da listagem ──────────────────────────────────────────────────────
  const [reposicoes,   setReposicoes]   = useState<Reposicao[]>([]);
  const [carregando,   setCarregando]   = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<StatusReposicao | undefined>(undefined);
  const [dataInicio,   setDataInicio]   = useState(primeiroDiaMes());
  const [dataFim,      setDataFim]      = useState(hoje());

  // ── Estado do modal de detalhe ──────────────────────────────────────────────
  const [detalheVisible,   setDetalheVisible]   = useState(false);
  const [itemSelecionado,  setItemSelecionado]  = useState<Reposicao | null>(null);

  // ── Estado do modal de agendamento ─────────────────────────────────────────
  const [agendaVisible,    setAgendaVisible]    = useState(false);
  const [salvandoAgenda,   setSalvandoAgenda]   = useState(false);
  const [alunos,           setAlunos]           = useState<{ label: string; value: number }[]>([]);
  const [turmas,           setTurmas]           = useState<{ label: string; value: number }[]>([]);
  const [novoIdAluno,      setNovoIdAluno]      = useState<number | null>(null);
  const [novoIdTurma,      setNovoIdTurma]      = useState<number | null>(null);
  const [novaData,         setNovaData]         = useState(amanha());
  const [novaObs,          setNovaObs]          = useState("");

  // ── Busca da listagem ───────────────────────────────────────────────────────
  const buscar = async () => {
    setCarregando(true);
    try {
      const lista = await buscarTodasReposicoes({
        status:     filtroStatus,
        dataInicio: dataInicio || undefined,
        dataFim:    dataFim    || undefined,
      });
      setReposicoes(lista);
    } catch (err) {
      console.error(err);
      toast.current?.show({ severity: "error", summary: "Erro", detail: "Não foi possível carregar as reposições." });
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { buscar(); }, [filtroStatus, dataInicio, dataFim]);

  // ── Carregar alunos e turmas para o modal de agendamento ────────────────────
  const abrirDialogAgendamento = async () => {
    try {
      const [listaAlunos, listaTurmas] = await Promise.all([
        buscarTodosAlunos(),
        buscarTodasTurmas(),
      ]);

      setAlunos(
        listaAlunos
          .filter((a: any) => Number(a.ativo) === 1)
          .map((a: any) => ({ label: a.nome, value: a.id_aluno }))
      );

      setTurmas(
        listaTurmas.map((t: any) => ({
          label: `${DIAS[Number(t.diaSemana)]} ${String(t.horarioInicio).padStart(2, "0")}h — ${t.modalidade ?? "Sem modalidade"}`,
          value: t.id_turma,
        }))
      );

      // Reset do formulário
      setNovoIdAluno(null);
      setNovoIdTurma(null);
      setNovaData(amanha());
      setNovaObs("");
      setAgendaVisible(true);
    } catch (err) {
      console.error(err);
      toast.current?.show({ severity: "error", summary: "Erro", detail: "Não foi possível carregar os dados." });
    }
  };

  // ── Confirmar agendamento ───────────────────────────────────────────────────
  const handleAgendar = async () => {
    if (!novoIdAluno) {
      toast.current?.show({ severity: "warn", summary: "Atenção", detail: "Selecione um aluno." });
      return;
    }
    if (!novoIdTurma) {
      toast.current?.show({ severity: "warn", summary: "Atenção", detail: "Selecione uma turma." });
      return;
    }
    if (!novaData) {
      toast.current?.show({ severity: "warn", summary: "Atenção", detail: "Informe a data da reposição." });
      return;
    }

    setSalvandoAgenda(true);
    try {
      const res = await agendarReposicao(novoIdAluno, novoIdTurma, novaData, novaObs || undefined);
      if (res.sucesso) {
        toast.current?.show({ severity: "success", summary: "Agendado!", detail: res.mensagem });
        setAgendaVisible(false);
        buscar();
      } else {
        toast.current?.show({ severity: "error", summary: "Não foi possível agendar", detail: res.mensagem });
      }
    } catch (err) {
      console.error(err);
      toast.current?.show({ severity: "error", summary: "Erro", detail: "Ocorreu um erro inesperado." });
    } finally {
      setSalvandoAgenda(false);
    }
  };

  // ── Cancelar reposição ──────────────────────────────────────────────────────
  const handleCancelar = async (r: Reposicao) => {
    confirmDialog({
      message:      `Cancelar a reposição de "${r.nomeAluno}"?`,
      header:       "Confirmar cancelamento",
      icon:         "pi pi-exclamation-triangle",
      acceptLabel:  "Cancelar reposição",
      rejectLabel:  "Voltar",
      acceptClassName: "p-button-danger p-button-sm",
      rejectClassName: "p-button-secondary p-button-outlined p-button-sm",
      accept: async () => {
        const res = await cancelarReposicao(r.id_reposicao);
        toast.current?.show({
          severity: res.sucesso ? "info" : "error",
          summary:  res.sucesso ? "Cancelada" : "Erro",
          detail:   res.mensagem,
        });
        if (res.sucesso) {
          setDetalheVisible(false);
          buscar();
        }
      },
    });
  };

  // ── Marcar como realizada ───────────────────────────────────────────────────
  const handleMarcarRealizada = async (r: Reposicao) => {
    confirmDialog({
      message:      `Marcar a reposição de "${r.nomeAluno}" como realizada?`,
      header:       "Confirmar realização",
      icon:         "pi pi-check-circle",
      acceptLabel:  "Marcar realizada",
      rejectLabel:  "Voltar",
      acceptClassName: "p-button-success p-button-sm",
      rejectClassName: "p-button-secondary p-button-outlined p-button-sm",
      accept: async () => {
        const res = await marcarReposicaoRealizada(r.id_reposicao);
        toast.current?.show({
          severity: res.sucesso ? "success" : "error",
          summary:  res.sucesso ? "Realizada!" : "Erro",
          detail:   res.mensagem,
        });
        if (res.sucesso) {
          setDetalheVisible(false);
          buscar();
        }
      },
    });
  };

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const totalAgendadas  = reposicoes.filter(r => r.status === "AGENDADA").length;
  const totalRealizadas = reposicoes.filter(r => r.status === "REALIZADA").length;
  const totalCanceladas = reposicoes.filter(r => r.status === "CANCELADA").length;

  // ── Templates de coluna ─────────────────────────────────────────────────────
  const tplAluno  = (r: Reposicao) => <span className="font-semibold text-800">{r.nomeAluno}</span>;

  const tplTurma  = (r: Reposicao) => (
    <span className="text-sm">
      {DIAS[Number(r.dia_semana)]} {String(r.horario_inicio).padStart(2, "0")}h — {r.modalidade}
    </span>
  );

  const tplData   = (r: Reposicao) => <span className="font-bold">{formatarData(r.data_reposicao)}</span>;

  const tplStatus = (r: Reposicao) => (
    <Tag value={r.status} severity={statusSeverity(r.status)} />
  );

  const tplObs    = (r: Reposicao) => <span className="text-xs text-500">{r.observacao || "—"}</span>;

  const tplAcoes  = (r: Reposicao) => (
    <div className="flex gap-1">
      {/* Ver detalhes */}
      <Button
        icon="pi pi-eye"
        className="p-button-sm p-button-text p-button-info"
        tooltip="Ver detalhes"
        tooltipOptions={{ position: "top" }}
        onClick={() => { setItemSelecionado(r); setDetalheVisible(true); }}
      />

      {/* Marcar como realizada (só AGENDADA) */}
      {r.status === "AGENDADA" && (
        <Button
          icon="pi pi-check-circle"
          className="p-button-sm p-button-text p-button-success"
          tooltip="Marcar como realizada"
          tooltipOptions={{ position: "top" }}
          onClick={() => handleMarcarRealizada(r)}
        />
      )}

      {/* Cancelar (só AGENDADA) */}
      {r.status === "AGENDADA" && (
        <Button
          icon="pi pi-times"
          className="p-button-sm p-button-text p-button-danger"
          tooltip="Cancelar reposição"
          tooltipOptions={{ position: "top" }}
          onClick={() => handleCancelar(r)}
        />
      )}
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      <Toast ref={toast} />
      <ConfirmDialog />

      {/* Cabeçalho */}
      <div className="flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="text-2xl font-bold m-0 text-900">Reposições de Aula</h2>
          <p className="text-sm text-500 mt-1 m-0">Gerencie as reposições agendadas pelos alunos</p>
        </div>
        <div className="flex align-items-center gap-2">
          <Tag
            value={`${reposicoes.length} registro${reposicoes.length !== 1 ? "s" : ""}`}
            severity="info"
            icon="pi pi-list"
          />
          <Button
            label="Nova Reposição"
            icon="pi pi-plus"
            className="p-button-sm p-button-primary"
            onClick={abrirDialogAgendamento}
          />
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div
          className="surface-card border-round shadow-1 p-3 text-center border-top-3 flex-1 kpi-border-info"
          style={{ minWidth: 120 }}
        >
          <div className="text-2xl font-bold kpi-val-info">{totalAgendadas}</div>
          <div className="text-xs text-500 mt-1 uppercase font-semibold">Agendadas</div>
        </div>
        <div
          className="surface-card border-round shadow-1 p-3 text-center border-top-3 flex-1 kpi-border-success"
          style={{ minWidth: 120 }}
        >
          <div className="text-2xl font-bold kpi-val-success">{totalRealizadas}</div>
          <div className="text-xs text-500 mt-1 uppercase font-semibold">Realizadas</div>
        </div>
        <div
          className="surface-card border-round shadow-1 p-3 text-center border-top-3 flex-1 kpi-border-neutral"
          style={{ minWidth: 120 }}
        >
          <div className="text-2xl font-bold kpi-val-neutral">{totalCanceladas}</div>
          <div className="text-xs text-500 mt-1 uppercase font-semibold">Canceladas</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="surface-card border-1 surface-border border-round shadow-1 p-3 mb-4">
        <div className="flex flex-wrap gap-3 align-items-end">
          <div className="flex flex-column gap-1">
            <label className="text-xs font-bold text-600 uppercase">Status</label>
            <Dropdown
              appendTo="self"
              value={filtroStatus}
              options={STATUS_OPTIONS}
              onChange={(e) => setFiltroStatus(e.value)}
              placeholder="Todos"
              style={{ minWidth: 160 }}
            />
          </div>
          <div className="flex flex-column gap-1">
            <label className="text-xs font-bold text-600 uppercase">Data inicial</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="p-inputtext p-component"
              style={{ padding: "0.5rem", minWidth: 150 }}
            />
          </div>
          <div className="flex flex-column gap-1">
            <label className="text-xs font-bold text-600 uppercase">Data final</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="p-inputtext p-component"
              style={{ padding: "0.5rem", minWidth: 150 }}
            />
          </div>
          <Button
            icon="pi pi-refresh"
            label="Atualizar"
            className="p-button-outlined p-button-sm"
            onClick={buscar}
            loading={carregando}
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="surface-card border-1 surface-border border-round shadow-1">
        <DataTable
          value={reposicoes}
          loading={carregando}
          paginator={reposicoes.length > 15}
          rows={15}
          sortField="data_reposicao"
          sortOrder={1}
          className="p-datatable-sm"
          emptyMessage="Nenhuma reposição encontrada para os filtros selecionados."
        >
          <Column header="Aluno"  body={tplAluno}  field="nomeAluno"       sortable style={{ minWidth: 180 }} />
          <Column header="Turma"  body={tplTurma}                          style={{ minWidth: 200 }} />
          <Column header="Data"   body={tplData}   field="data_reposicao"  sortable style={{ minWidth: 110 }} />
          <Column header="Status" body={tplStatus}                         style={{ minWidth: 110, textAlign: "center" }} />
          <Column header="Obs."   body={tplObs}                            style={{ minWidth: 150 }} />
          <Column header="Ações"  body={tplAcoes}                          style={{ minWidth: 120, textAlign: "center" }} />
        </DataTable>
      </div>

      {/* ── Dialog: Agendar Reposição ── */}
      <Dialog
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-calendar-plus text-primary text-xl" />
            <span>Nova Reposição</span>
          </div>
        }
        visible={agendaVisible}
        style={{ width: 500 }}
        onHide={() => !salvandoAgenda && setAgendaVisible(false)}
        footer={
          <div className="flex justify-content-end gap-2">
            <Button
              label="Cancelar"
              icon="pi pi-times"
              className="p-button-secondary p-button-outlined p-button-sm"
              onClick={() => setAgendaVisible(false)}
              disabled={salvandoAgenda}
            />
            <Button
              label={salvandoAgenda ? "Agendando..." : "Confirmar Agendamento"}
              icon={salvandoAgenda ? "pi pi-spin pi-spinner" : "pi pi-check"}
              className="p-button-primary p-button-sm"
              onClick={handleAgendar}
              disabled={salvandoAgenda}
            />
          </div>
        }
      >
        <div className="flex flex-column gap-4 pt-1">

          {/* Aluno */}
          <div className="flex flex-column gap-1">
            <label className="text-xs font-bold text-600 uppercase">
              Aluno <span className="text-red-500">*</span>
            </label>
            <Dropdown
              appendTo="self"
              value={novoIdAluno}
              options={alunos}
              onChange={(e) => setNovoIdAluno(e.value)}
              placeholder="Selecione o aluno"
              filter
              filterPlaceholder="Buscar aluno..."
              emptyFilterMessage="Nenhum aluno encontrado"
              emptyMessage="Nenhum aluno ativo cadastrado"
              className="w-full"
            />
          </div>

          {/* Turma de destino */}
          <div className="flex flex-column gap-1">
            <label className="text-xs font-bold text-600 uppercase">
              Turma para reposição <span className="text-red-500">*</span>
            </label>
            <Dropdown
              appendTo="self"
              value={novoIdTurma}
              options={turmas}
              onChange={(e) => setNovoIdTurma(e.value)}
              placeholder="Selecione a turma"
              filter
              filterPlaceholder="Buscar turma..."
              emptyFilterMessage="Nenhuma turma encontrada"
              emptyMessage="Nenhuma turma cadastrada"
              className="w-full"
            />
          </div>

          {/* Data */}
          <div className="flex flex-column gap-1">
            <label className="text-xs font-bold text-600 uppercase">
              Data da reposição <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={novaData}
              min={amanha()}
              onChange={(e) => setNovaData(e.target.value)}
              className="p-inputtext p-component w-full"
              style={{ padding: "0.5rem" }}
            />
            <span className="text-xs text-500">A data deve ser posterior a hoje.</span>
          </div>

          {/* Observação */}
          <div className="flex flex-column gap-1">
            <label className="text-xs font-bold text-600 uppercase">Observação (opcional)</label>
            <InputTextarea
              value={novaObs}
              onChange={(e) => setNovaObs(e.target.value)}
              rows={3}
              placeholder="Ex: aluno faltou devido a viagem..."
              className="w-full"
              autoResize
            />
          </div>

        </div>
      </Dialog>

      {/* ── Dialog: Detalhe da Reposição ── */}
      <Dialog
        header="Detalhes da Reposição"
        visible={detalheVisible}
        style={{ width: 460 }}
        onHide={() => setDetalheVisible(false)}
      >
        {itemSelecionado && (
          <div className="flex flex-column gap-3">
            <div className="grid">
              <div className="col-6">
                <span className="text-xs text-500 block mb-1">Aluno</span>
                <span className="font-bold text-900">{itemSelecionado.nomeAluno}</span>
              </div>
              <div className="col-6">
                <span className="text-xs text-500 block mb-1">Status</span>
                <Tag value={itemSelecionado.status} severity={statusSeverity(itemSelecionado.status)} />
              </div>
              <div className="col-6">
                <span className="text-xs text-500 block mb-1">Data</span>
                <span className="font-bold">{formatarData(itemSelecionado.data_reposicao)}</span>
              </div>
              <div className="col-6">
                <span className="text-xs text-500 block mb-1">Turma</span>
                <span className="text-sm">
                  {DIAS[Number(itemSelecionado.dia_semana)]}{" "}
                  {String(itemSelecionado.horario_inicio).padStart(2, "0")}h
                </span>
              </div>
              <div className="col-12">
                <span className="text-xs text-500 block mb-1">Modalidade</span>
                <span>{itemSelecionado.modalidade}</span>
              </div>
              {itemSelecionado.observacao && (
                <div className="col-12">
                  <span className="text-xs text-500 block mb-1">Observação</span>
                  <span className="text-sm">{itemSelecionado.observacao}</span>
                </div>
              )}
            </div>

            <Divider className="my-1" />

            <div className="flex justify-content-end gap-2 flex-wrap">
              {itemSelecionado.status === "AGENDADA" && (
                <>
                  <Button
                    label="Marcar Realizada"
                    icon="pi pi-check-circle"
                    className="p-button-success p-button-outlined p-button-sm"
                    onClick={() => handleMarcarRealizada(itemSelecionado)}
                  />
                  <Button
                    label="Cancelar Reposição"
                    icon="pi pi-times"
                    className="p-button-danger p-button-outlined p-button-sm"
                    onClick={() => handleCancelar(itemSelecionado)}
                  />
                </>
              )}
              <Button
                label="Fechar"
                icon="pi pi-times"
                className="p-button-secondary p-button-sm"
                onClick={() => setDetalheVisible(false)}
              />
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
