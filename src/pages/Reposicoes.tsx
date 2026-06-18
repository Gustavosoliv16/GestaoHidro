import { useEffect, useRef, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Divider } from "primereact/divider";
import { Dropdown } from "primereact/dropdown";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";

import {
  buscarTodasReposicoes,
  cancelarReposicao,
  Reposicao,
  StatusReposicao,
} from "../services/ReposicaoService";

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

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

const STATUS_OPTIONS = [
  { label: "Todas",     value: undefined },
  { label: "Agendada",  value: "AGENDADA"  },
  { label: "Realizada", value: "REALIZADA" },
  { label: "Cancelada", value: "CANCELADA" },
];

function statusSeverity(s: string): "info" | "success" | "secondary" {
  if (s === "AGENDADA")  return "info";
  if (s === "REALIZADA") return "success";
  return "secondary";
}

export default function Reposicoes() {
  const toast = useRef<Toast>(null);

  const [reposicoes, setReposicoes]           = useState<Reposicao[]>([]);
  const [carregando, setCarregando]           = useState(false);
  const [filtroStatus, setFiltroStatus]       = useState<StatusReposicao | undefined>(undefined);
  const [dataInicio, setDataInicio]           = useState(primeiroDiaMes());
  const [dataFim, setDataFim]                 = useState(hoje());

  const [detalheVisible, setDetalheVisible]   = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<Reposicao | null>(null);

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

  const handleCancelar = async (r: Reposicao) => {
    const res = await cancelarReposicao(r.id_reposicao);
    if (res.sucesso) {
      toast.current?.show({ severity: "info", summary: "Cancelada", detail: res.mensagem });
      buscar();
    } else {
      toast.current?.show({ severity: "error", summary: "Erro", detail: res.mensagem });
    }
  };

  // ── Cards de resumo ────────────────────────────────────────────────────────
  const totalAgendadas  = reposicoes.filter(r => r.status === "AGENDADA").length;
  const totalRealizadas = reposicoes.filter(r => r.status === "REALIZADA").length;
  const totalCanceladas = reposicoes.filter(r => r.status === "CANCELADA").length;

  // ── Templates de coluna ────────────────────────────────────────────────────
  const tplAluno = (r: Reposicao) => (
    <span className="font-semibold text-800">{r.nomeAluno}</span>
  );

  const tplTurma = (r: Reposicao) => (
    <span className="text-sm">
      {DIAS[Number(r.dia_semana)]} {String(r.horario_inicio).padStart(2,"0")}h — {r.modalidade}
    </span>
  );

  const tplData = (r: Reposicao) => (
    <span className="font-bold">{formatarData(r.data_reposicao)}</span>
  );

  const tplStatus = (r: Reposicao) => (
    <Tag value={r.status} severity={statusSeverity(r.status)} />
  );

  const tplObs = (r: Reposicao) => (
    <span className="text-xs text-500">{r.observacao || "—"}</span>
  );

  const tplAcoes = (r: Reposicao) => (
    <div className="flex gap-1">
      <Button
        icon="pi pi-eye"
        className="p-button-sm p-button-text p-button-info"
        tooltip="Ver detalhes"
        tooltipOptions={{ position: "top" }}
        onClick={() => { setItemSelecionado(r); setDetalheVisible(true); }}
      />
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

  return (
    <div className="w-full">
      <Toast ref={toast} />

      {/* Cabeçalho */}
      <div className="flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="text-2xl font-bold m-0 text-900">Reposições de Aula</h2>
          <p className="text-sm text-500 mt-1 m-0">Gerencie as reposições agendadas pelos alunos</p>
        </div>
        <Tag
          value={`${reposicoes.length} registro${reposicoes.length !== 1 ? "s" : ""}`}
          severity="info"
          icon="pi pi-list"
        />
      </div>

      {/* Cards de resumo */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="surface-card border-round shadow-1 p-3 text-center border-top-3 flex-1"
          style={{ borderColor: "#3b82f6", minWidth: 120 }}>
          <div className="text-2xl font-bold text-blue-600">{totalAgendadas}</div>
          <div className="text-xs text-500 mt-1 uppercase font-semibold">Agendadas</div>
        </div>
        <div className="surface-card border-round shadow-1 p-3 text-center border-top-3 flex-1"
          style={{ borderColor: "#22c55e", minWidth: 120 }}>
          <div className="text-2xl font-bold text-green-600">{totalRealizadas}</div>
          <div className="text-xs text-500 mt-1 uppercase font-semibold">Realizadas</div>
        </div>
        <div className="surface-card border-round shadow-1 p-3 text-center border-top-3 flex-1"
          style={{ borderColor: "#94a3b8", minWidth: 120 }}>
          <div className="text-2xl font-bold text-500">{totalCanceladas}</div>
          <div className="text-xs text-500 mt-1 uppercase font-semibold">Canceladas</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="surface-card border-1 surface-border border-round shadow-1 p-3 mb-4">
        <div className="flex flex-wrap gap-3 align-items-end">
          <div className="flex flex-column gap-1">
            <label className="text-xs font-bold text-600 uppercase">Status</label>
            <Dropdown
              value={filtroStatus}
              options={STATUS_OPTIONS}
              onChange={e => setFiltroStatus(e.value)}
              placeholder="Todos"
              style={{ minWidth: 160 }}
            />
          </div>
          <div className="flex flex-column gap-1">
            <label className="text-xs font-bold text-600 uppercase">Data inicial</label>
            <input type="date" value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              className="p-inputtext p-component"
              style={{ padding: "0.5rem", minWidth: 150 }} />
          </div>
          <div className="flex flex-column gap-1">
            <label className="text-xs font-bold text-600 uppercase">Data final</label>
            <input type="date" value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              className="p-inputtext p-component"
              style={{ padding: "0.5rem", minWidth: 150 }} />
          </div>
          <Button icon="pi pi-refresh" label="Atualizar"
            className="p-button-outlined p-button-sm"
            onClick={buscar} loading={carregando} />
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
          responsiveLayout="scroll"
        >
          <Column header="Aluno"    body={tplAluno}  field="nomeAluno"      sortable style={{ minWidth: 180 }} />
          <Column header="Turma"    body={tplTurma}                         style={{ minWidth: 200 }} />
          <Column header="Data"     body={tplData}   field="data_reposicao" sortable style={{ minWidth: 110 }} />
          <Column header="Status"   body={tplStatus}                        style={{ minWidth: 110, textAlign: "center" }} />
          <Column header="Obs."     body={tplObs}                           style={{ minWidth: 150 }} />
          <Column header="Ações"    body={tplAcoes}                         style={{ minWidth: 100, textAlign: "center" }} />
        </DataTable>
      </div>

      {/* Modal de detalhe */}
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
                  {DIAS[Number(itemSelecionado.dia_semana)]} {String(itemSelecionado.horario_inicio).padStart(2,"0")}h
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

            <div className="flex justify-content-end gap-2">
              {itemSelecionado.status === "AGENDADA" && (
                <Button
                  label="Cancelar Reposição"
                  icon="pi pi-times"
                  className="p-button-danger p-button-outlined p-button-sm"
                  onClick={() => {
                    handleCancelar(itemSelecionado);
                    setDetalheVisible(false);
                  }}
                />
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
