import { useEffect, useRef, useState } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Tag } from "primereact/tag";
import { Divider } from "primereact/divider";
import { Toast } from "primereact/toast";

import {
  buscarChamadasSalvas,
  buscarDetalhesChamada,
  RegistroChamada,
  DetalhePresencaChamada,
} from "../services/AttendanceService";
import { buscarTodasTurmas } from "../services/TurmaService";

const NOMES_DIAS = [
  "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado", "Domingo",
];
const DIAS_CURTOS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function formatarData(dataSql: string): string {
  const [ano, mes, dia] = dataSql.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoStr;
  }
}

// Primeiro dia do mês atual em formato YYYY-MM-DD
function primeiroDiaMesAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// Hoje em formato YYYY-MM-DD
function hoje(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Relatorios({ aoVoltar }: { aoVoltar?: () => void } = {}) {
  const toast = useRef<Toast>(null);

  const [turmas, setTurmas] = useState<any[]>([]);
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
  const [horarioSelecionado, setHorarioSelecionado] = useState<number | null>(null); // id_turma
  const [dataInicio, setDataInicio] = useState<string>(primeiroDiaMesAtual());
  const [dataFim, setDataFim] = useState<string>(hoje());

  const [chamadas, setChamadas] = useState<RegistroChamada[]>([]);
  const [carregando, setCarregando] = useState(false);

  const [modalDetalheVisible, setModalDetalheVisible] = useState(false);
  const [chamadaSelecionada, setChamadaSelecionada] = useState<RegistroChamada | null>(null);
  const [detalhes, setDetalhes] = useState<DetalhePresencaChamada[]>([]);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

  // Carrega lista de turmas para o filtro
  useEffect(() => {
    buscarTodasTurmas().then(setTurmas).catch(console.error);
  }, []);

  // Busca chamadas sempre que os filtros mudarem
  useEffect(() => {
    buscar();
  }, [horarioSelecionado, dataInicio, dataFim]);

  const buscar = async () => {
    setCarregando(true);
    try {
      const resultado = await buscarChamadasSalvas({
        idTurma: horarioSelecionado ?? undefined,
        dataInicio: dataInicio || undefined,
        dataFim: dataFim || undefined,
      });
      setChamadas(resultado);
    } catch (err) {
      console.error("Erro ao buscar chamadas:", err);
      toast.current?.show({
        severity: "error",
        summary: "Erro",
        detail: "Não foi possível carregar os relatórios.",
      });
    } finally {
      setCarregando(false);
    }
  };

  const abrirDetalhes = async (chamada: RegistroChamada) => {
    setChamadaSelecionada(chamada);
    setModalDetalheVisible(true);
    setCarregandoDetalhes(true);
    try {
      const rows = await buscarDetalhesChamada(chamada.id_turma, chamada.data_aula);
      setDetalhes(rows);
    } catch (err) {
      console.error("Erro ao buscar detalhes:", err);
      toast.current?.show({
        severity: "error",
        summary: "Erro",
        detail: "Não foi possível carregar os detalhes desta chamada.",
      });
    } finally {
      setCarregandoDetalhes(false);
    }
  };

  // ── Templates de coluna ─────────────────────────────────────────────────────

  const templateData = (row: RegistroChamada) => (
    <span className="font-bold text-900">{formatarData(row.data_aula)}</span>
  );

  const templateDia = (row: RegistroChamada) => (
    <span className="text-sm text-600">
      {NOMES_DIAS[Number(row.dia_semana)] ?? "—"}
    </span>
  );

  const templateHorario = (row: RegistroChamada) => (
    <span className="text-sm font-semibold">
      {String(Math.round(Number(row.horario_inicio))).padStart(2, "0")}h
    </span>
  );

  const templatePresenca = (row: RegistroChamada) => {
    const pct = row.total_alunos > 0
      ? Math.round((row.total_presentes / row.total_alunos) * 100)
      : 0;
    return (
      <div className="flex align-items-center gap-2">
        <Tag
          value={`${row.total_presentes} presentes`}
          severity="success"
          className="text-xs"
        />
        {row.total_faltas > 0 && (
          <Tag
            value={`${row.total_faltas} faltas`}
            severity="danger"
            className="text-xs"
          />
        )}
        <span className="text-xs text-400">({pct}%)</span>
      </div>
    );
  };

  const templateSalvoEm = (row: RegistroChamada) => (
    <span className="text-xs text-500">{formatarDataHora(row.salvo_em)}</span>
  );

  const templateAcoes = (row: RegistroChamada) => (
    <Button
      icon="pi pi-eye"
      label="Ver Detalhes"
      className="p-button-sm p-button-outlined"
      onClick={() => abrirDetalhes(row)}
    />
  );

  const templateStatusDetalhe = (row: DetalhePresencaChamada) => {
    if (row.status === "PRESENTE") return <Tag value="Presente" severity="success" icon="pi pi-check" />;
    if (row.status === "FALTOU")   return <Tag value="Faltou"   severity="danger"  icon="pi pi-times" />;
    return <Tag value="Não marcado" severity="secondary" />;
  };

  // ── Sumário de cards no topo ─────────────────────────────────────────────────

  const totalChamadas = chamadas.length;
  const totalPresentes = chamadas.reduce((acc, c) => acc + Number(c.total_presentes), 0);
  const totalFaltas    = chamadas.reduce((acc, c) => acc + Number(c.total_faltas), 0);
  const mediaPresenca  = totalChamadas > 0
    ? Math.round(
        chamadas.reduce((acc, c) => {
          const pct = c.total_alunos > 0 ? (c.total_presentes / c.total_alunos) * 100 : 0;
          return acc + pct;
        }, 0) / totalChamadas
      )
    : 0;

  // Dias que têm turmas cadastradas
  const diasComTurmas = Array.from(new Set(turmas.map(t => Number(t.diaSemana)))).sort();

  // Turmas do dia selecionado, ordenadas por horário
  const turmasDoDia = turmas
    .filter(t => Number(t.diaSemana) === diaSelecionado)
    .sort((a, b) => Number(a.horarioInicio) - Number(b.horarioInicio));

  return (
    <div className={aoVoltar ? "p-4" : ""} style={aoVoltar ? { maxWidth: 960, margin: "0 auto" } : {}}>
      <Toast ref={toast} />

      {/* Cabeçalho */}
      <div className="flex align-items-center gap-3 mb-4">
        {aoVoltar ? (
          <Button
            icon="pi pi-arrow-left"
            className="p-button-text p-button-rounded"
            onClick={aoVoltar}
            tooltip="Voltar"
          />
        ) : null}
        <div>
          <h2 className="text-2xl font-bold m-0 text-900">Relatório de Chamadas</h2>
          <p className="text-sm text-500 m-0">Histórico de chamadas salvas por turma e período</p>
        </div>
      </div>

      {/* ── Painel 1: Dia da semana ── */}
      <Card className="mb-3 shadow-1">
        <div className="mb-2 flex align-items-center justify-content-between">
          <span className="text-xs font-bold text-600 uppercase">Dia da semana</span>
          {diaSelecionado !== null && (
            <button
              onClick={() => { setDiaSelecionado(null); setHorarioSelecionado(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#6b7280" }}
            >
              <i className="pi pi-times mr-1" />limpar filtro
            </button>
          )}
        </div>
        {diasComTurmas.length === 0 ? (
          <span className="text-sm text-400">Nenhuma turma cadastrada.</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {diasComTurmas.map(diaId => {
              const ativo = diaSelecionado === diaId;
              return (
                <button
                  key={diaId}
                  onClick={() => {
                    setDiaSelecionado(ativo ? null : diaId);
                    setHorarioSelecionado(null);
                  }}
                  className="border-round font-semibold text-sm px-3 py-2 cursor-pointer transition-all"
                  style={{
                    border: ativo ? "2px solid #3b82f6" : "2px solid #e5e7eb",
                    background: ativo ? "#eff6ff" : "#fafafa",
                    color: ativo ? "#1d4ed8" : "#374151",
                    outline: "none",
                  }}
                >
                  {DIAS_CURTOS[diaId]}
                  <span className="ml-2 text-xs" style={{ opacity: 0.6 }}>
                    ({turmas.filter(t => Number(t.diaSemana) === diaId).length})
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Painel 2: Horário (visível após selecionar dia) ── */}
      {diaSelecionado !== null && (
        <Card className="mb-3 shadow-1">
          <div className="mb-2 flex align-items-center justify-content-between">
            <span className="text-xs font-bold text-600 uppercase">
              Horários — {NOMES_DIAS[diaSelecionado]}
            </span>
            {horarioSelecionado !== null && (
              <button
                onClick={() => setHorarioSelecionado(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#6b7280" }}
              >
                <i className="pi pi-times mr-1" />todas as turmas do dia
              </button>
            )}
          </div>
          {turmasDoDia.length === 0 ? (
            <span className="text-sm text-400">Nenhuma turma neste dia.</span>
          ) : (
            <div className="flex flex-wrap gap-2">
              {turmasDoDia.map(turma => {
                const ativo = horarioSelecionado === turma.id_turma;
                const total = Math.round(Number(turma.totalAlunos || 0));
                const max   = Math.round(Number(turma.capacidadeMaxima || 6));
                return (
                  <button
                    key={turma.id_turma}
                    onClick={() => setHorarioSelecionado(ativo ? null : turma.id_turma)}
                    className="border-round text-sm cursor-pointer transition-all flex flex-column align-items-center"
                    style={{
                      border: ativo ? "2px solid #3b82f6" : "2px solid #e5e7eb",
                      background: ativo ? "#eff6ff" : "#fafafa",
                      color: ativo ? "#1d4ed8" : "#374151",
                      outline: "none",
                      padding: "0.5rem 1rem",
                      minWidth: 90,
                    }}
                  >
                    <span className="font-bold">
                      {String(Math.round(Number(turma.horarioInicio))).padStart(2, "0")}h
                    </span>
                    <span className="text-xs" style={{ opacity: 0.75 }}>{turma.modalidade}</span>
                    <Tag
                      value={`${total}/${max}`}
                      severity={total >= max ? "danger" : "success"}
                      style={{ fontSize: "9px", padding: "1px 5px", marginTop: 4 }}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── Filtro de período ── */}
      <Card className="mb-4 shadow-1">
        <div className="flex flex-wrap gap-3 align-items-end">
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
      </Card>

      {/* Cards de resumo */}
      <div className="grid mb-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
        <div className="surface-card border-round shadow-1 p-3 text-center border-top-3 border-blue-500">
          <div className="text-3xl font-bold text-blue-600">{totalChamadas}</div>
          <div className="text-xs text-500 mt-1 uppercase font-semibold">Chamadas salvas</div>
        </div>
        <div className="surface-card border-round shadow-1 p-3 text-center border-top-3 border-green-500">
          <div className="text-3xl font-bold text-green-600">{totalPresentes}</div>
          <div className="text-xs text-500 mt-1 uppercase font-semibold">Total de presenças</div>
        </div>
        <div className="surface-card border-round shadow-1 p-3 text-center border-top-3 border-red-500">
          <div className="text-3xl font-bold text-red-500">{totalFaltas}</div>
          <div className="text-xs text-500 mt-1 uppercase font-semibold">Total de faltas</div>
        </div>
        <div className="surface-card border-round shadow-1 p-3 text-center border-top-3 border-orange-400">
          <div className="text-3xl font-bold text-orange-500">{mediaPresenca}%</div>
          <div className="text-xs text-500 mt-1 uppercase font-semibold">Média de presença</div>
        </div>
      </div>

      {/* Tabela de chamadas */}
      <Card className="shadow-1">
        <DataTable
          value={chamadas}
          loading={carregando}
          rows={10}
          paginator={chamadas.length > 10}
          responsiveLayout="scroll"
          emptyMessage="Nenhuma chamada salva encontrada para os filtros selecionados."
          className="p-datatable-sm"
          sortField="data_aula"
          sortOrder={-1}
        >
          <Column header="Data"      body={templateData}     field="data_aula"     sortable />
          <Column header="Dia"       body={templateDia}      field="dia_semana"    sortable />
          <Column header="Horário"   body={templateHorario}  field="horario_inicio" sortable />
          <Column header="Modalidade" field="modalidade"     sortable style={{ fontWeight: "bold" }} />
          <Column header="Presença"  body={templatePresenca} />
          <Column header="Salvo em"  body={templateSalvoEm}  />
          <Column header="Ações"     body={templateAcoes}    style={{ width: "10rem" }} />
        </DataTable>
      </Card>

      {/* Modal de detalhes */}
      <Dialog
        header={
          chamadaSelecionada
            ? `Chamada — ${chamadaSelecionada.modalidade} · ${formatarData(chamadaSelecionada.data_aula)}`
            : "Detalhes da Chamada"
        }
        visible={modalDetalheVisible}
        style={{ width: "520px" }}
        onHide={() => setModalDetalheVisible(false)}
      >
        {chamadaSelecionada && (
          <div className="flex flex-column gap-3">
            {/* Resumo da chamada */}
            <div className="flex gap-3">
              <div className="flex-1 bg-green-50 border-round p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{chamadaSelecionada.total_presentes}</div>
                <div className="text-xs text-green-500 font-semibold uppercase">Presentes</div>
              </div>
              <div className="flex-1 bg-red-50 border-round p-3 text-center">
                <div className="text-2xl font-bold text-red-500">{chamadaSelecionada.total_faltas}</div>
                <div className="text-xs text-red-400 font-semibold uppercase">Faltas</div>
              </div>
              <div className="flex-1 bg-blue-50 border-round p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{chamadaSelecionada.total_alunos}</div>
                <div className="text-xs text-blue-400 font-semibold uppercase">Total</div>
              </div>
            </div>

            <div className="text-xs text-400 text-right">
              Salvo em: {formatarDataHora(chamadaSelecionada.salvo_em)}
            </div>

            <Divider className="my-1" />

            {/* Lista individual */}
            {carregandoDetalhes ? (
              <div className="text-center py-4 text-400">
                <i className="pi pi-spin pi-spinner text-2xl" />
                <p className="mt-2 text-sm">Carregando detalhes...</p>
              </div>
            ) : (
              <DataTable
                value={detalhes}
                size="small"
                emptyMessage="Sem registros individuais."
              >
                <Column
                  field="nome"
                  header="Aluno"
                  style={{ fontWeight: "600" }}
                />
                <Column
                  header="Status"
                  body={templateStatusDetalhe}
                  style={{ textAlign: "center", width: "9rem" }}
                />
              </DataTable>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
