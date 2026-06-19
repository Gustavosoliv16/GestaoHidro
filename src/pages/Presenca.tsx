import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Toast } from "primereact/toast";
import { Tag } from "primereact/tag";
import { Divider } from "primereact/divider";
import { ProgressBar } from "primereact/progressbar";
import { SelectButton } from "primereact/selectbutton";
import Database from "@tauri-apps/plugin-sql";

import { buscarTodasTurmas, buscarAlunosDaTurma } from "../services/TurmaService";
import { salvarChamada, verificarChamadaSalva } from "../services/AttendanceService";
import {
  buscarReposicoesParaChamada,
  marcarReposicaoRealizada,
  ReposicaoChamada,
} from "../services/ReposicaoService";

async function getDb() {
  return await Database.load("sqlite:gestao_hidro.db");
}

async function salvarPresenca(idTurma: number, idAluno: number, date: string, status: "PRESENTE" | "FALTOU" | "AGENDADO") {
  const db = await getDb();
  try {
    await db.execute(
      `INSERT INTO AGENDA_CALENDARIO (id_turma, id_aluno, data_aula, status)
       VALUES ($1, $2, $3, $4)`,
      [idTurma, idAluno, date, status]
    );
  } catch {
    await db.execute(
      `UPDATE AGENDA_CALENDARIO SET status = $1
       WHERE id_turma = $2 AND id_aluno = $3 AND data_aula = $4`,
      [status, idTurma, idAluno, date]
    );
  }
}

async function buscarTotalFaltasPorTurma(idTurma: number, mesReferencia: string): Promise<number> {
  const db = await getDb();
  // mesReferencia no formato "YYYY-MM" — filtra só o mês atual
  const res: any[] = await db.select(
    `SELECT COUNT(*) as total FROM AGENDA_CALENDARIO 
     WHERE id_turma = $1 AND status = 'FALTOU' AND data_aula LIKE $2`,
    [idTurma, `${mesReferencia}-%`]
  );
  return res[0]?.total ?? 0;
}

async function buscarPresencasComAlunos(idTurma: number, date: string): Promise<Array<{ id_aluno: number; nome: string; telefone?: string; present: boolean | null }>> {
  const db = await getDb();
  const rows: any[] = await db.select(
    `SELECT a.id_aluno, a.nome, a.tel as telefone, ac.status
     FROM ALUNO_HORARIO_PADRAO hp
     JOIN ALUNOS a ON hp.id_aluno = a.id_aluno
     LEFT JOIN AGENDA_CALENDARIO ac ON ac.id_aluno = a.id_aluno AND ac.id_turma = hp.id_turma AND ac.data_aula = $2
     WHERE hp.id_turma = $1`,
    [idTurma, date]
  );
  return rows.map(r => ({
    id_aluno: r.id_aluno,
    nome: r.nome,
    telefone: r.telefone,
    present: r.status === "PRESENTE" ? true : (r.status === "FALTOU" ? false : null),
  }));
}



const DIAS = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
const DIAS_CURTOS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function diaSemanaIdx(d: Date): number {
  // 0=Dom → 6, 1=Seg → 0 ... 6=Sab → 5
  return d.getDay() === 0 ? 6 : d.getDay() - 1;
}

export default function Presenca() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useRef<Toast>(null);

  // Hoje e ontem como objetos fixos para o ciclo de render
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);

  const opcoesDia = [
    { label: "Hoje",  value: "hoje"  },
    { label: "Ontem", value: "ontem" },
  ];

  const [diaAtivo, setDiaAtivo] = useState<"hoje" | "ontem">("hoje");

  // Data efetiva conforme seleção
  const dataEfetiva     = diaAtivo === "hoje" ? hoje : ontem;
  const dateStr         = toDateStr(dataEfetiva);
  const diaIdx          = diaSemanaIdx(dataEfetiva);
  const dataFormatada   = dataEfetiva.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  const [turmas, setTurmas] = useState<any[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState<any>(null);
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [presencas, setPresencas] = useState<Record<number, boolean>>({});
  const [totalFaltas, setTotalFaltas] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [chamadaSalva, setChamadaSalva] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [reposicoes, setReposicoes] = useState<ReposicaoChamada[]>([]);
  const [presencasReposicao, setPresencasReposicao] = useState<Record<number, boolean>>({});

  useEffect(() => {
    buscarTodasTurmas().then(lista => {
      setTurmas(lista);
      // Pré-seleciona o dia da semana atual
      setDiaSelecionado(diaSemanaIdx(dataEfetiva));

      const paramId = searchParams.get("turma");
      if (paramId) {
        const found = lista.find((t: any) => String(t.id_turma) === paramId);
        if (found) {
          setDiaSelecionado(Number(found.diaSemana));
          setTurmaSelecionada(found);
        }
      }
    });
  }, []);

  // Ao trocar de dia (hoje/ontem), reseta tudo e pré-seleciona o dia correto
  useEffect(() => {
    setDiaSelecionado(diaSemanaIdx(dataEfetiva));
    setTurmaSelecionada(null);
    setAlunos([]);
    setPresencas({});
    setTotalFaltas(0);
    setChamadaSalva(false);
    setReposicoes([]);
    setPresencasReposicao({});
  }, [diaAtivo]);

  useEffect(() => {
    if (!turmaSelecionada) return;
    setLoading(true);
    Promise.all([
      buscarAlunosDaTurma(turmaSelecionada.id_turma),
      buscarPresencasComAlunos(turmaSelecionada.id_turma, dateStr),
      buscarTotalFaltasPorTurma(turmaSelecionada.id_turma, dateStr.slice(0, 7)),
      verificarChamadaSalva(turmaSelecionada.id_turma, dateStr),
      buscarReposicoesParaChamada(turmaSelecionada.id_turma, dateStr),
    ]).then(([listaAlunos, presencasDetalhadas, faltas, jaFoiSalva, listaReposicoes]) => {
      setAlunos(listaAlunos);
      const map: Record<number, boolean> = {};
      presencasDetalhadas.forEach(p => {
        if (p.present !== null) map[p.id_aluno] = p.present;
      });
      setPresencas(map);
      setTotalFaltas(faltas);
      setChamadaSalva(jaFoiSalva);
      setReposicoes(listaReposicoes as ReposicaoChamada[]);
      // Presença de reposição já registrada no AGENDA_CALENDARIO
      const mapRep: Record<number, boolean> = {};
      presencasDetalhadas.forEach(p => {
        const eReposicao = (listaReposicoes as ReposicaoChamada[]).some(r => r.id_aluno === p.id_aluno);
        if (eReposicao && p.present !== null) mapRep[p.id_aluno] = p.present;
      });
      setPresencasReposicao(mapRep);
      setLoading(false);
    });
  }, [turmaSelecionada, dateStr]);

  const alterarPresenca = async (alunoId: number, tipo: "PRESENTE" | "FALTOU") => {
    if (somenteLeitura) return; // chamada travada, não permite edição
    const estadoAtual = presencas[alunoId];
    
    let novoStatus: "PRESENTE" | "FALTOU" | "AGENDADO";
    let novoValorEstado: boolean | undefined;

    if (tipo === "PRESENTE") {
      if (estadoAtual === true) {
        novoStatus = "AGENDADO";
        novoValorEstado = undefined;
      } else {
        novoStatus = "PRESENTE";
        novoValorEstado = true;
      }
    } else { 
      if (estadoAtual === false) {
        novoStatus = "AGENDADO";
        novoValorEstado = undefined;
      } else {
        novoStatus = "FALTOU";
        novoValorEstado = false;
      }
    }

    setPresencas(prev => {
      const copia = { ...prev };
      if (novoValorEstado === undefined) {
        delete copia[alunoId];
      } else {
        copia[alunoId] = novoValorEstado;
      }
      return copia;
    });

    await salvarPresenca(turmaSelecionada.id_turma, alunoId, dateStr, novoStatus);
    const faltas = await buscarTotalFaltasPorTurma(turmaSelecionada.id_turma, mesReferencia);
    setTotalFaltas(faltas);

    let msg = "";
    let severity: "success" | "warn" | "info" = "info";
    const nomeAluno = alunos.find(a => a.id_aluno === alunoId)?.nome ?? "";

    if (novoStatus === "PRESENTE") {
      msg = `Presença registrada para ${nomeAluno}`;
      severity = "success";
    } else if (novoStatus === "FALTOU") {
      msg = `Falta registrada para ${nomeAluno}`;
      severity = "warn";
    } else {
      msg = `Marcação removida para ${nomeAluno}`;
      severity = "info";
    }

    toast.current?.show({
      severity,
      summary: "Chamada atualizada",
      detail: msg,
      life: 2000,
    });
  };

  // Dias que têm ao menos uma turma cadastrada (para montar os botões de dia)
  const diasComTurmas = Array.from(new Set(turmas.map(t => Number(t.diaSemana)))).sort();

  // Turmas do dia selecionado, ordenadas por horário
  const turmasDoDia = turmas
    .filter(t => Number(t.diaSemana) === diaSelecionado)
    .sort((a, b) => Number(a.horarioInicio) - Number(b.horarioInicio));

  const presentes   = alunos.filter(a => presencas[a.id_aluno] === true).length;
  const faltantes   = alunos.filter(a => presencas[a.id_aluno] === false).length;
  const naoMarcados = alunos.length - presentes - faltantes;
  const percentPresente = alunos.length ? Math.round((presentes / alunos.length) * 100) : 0;

  // Mês de referência derivado da data efetiva (ex: "2025-06")
  const mesReferencia = dateStr.slice(0, 7);
  // ou quando a data é anterior a ontem (>= 2 dias atrás).
  // Como a tela só oferece "hoje" e "ontem", o único caso de bloqueio é:
  // diaAtivo === "ontem" && chamadaSalva === true
  const somenteLeitura = diaAtivo === "ontem" && chamadaSalva;

  const alterarPresencaReposicao = async (rep: ReposicaoChamada, tipo: "PRESENTE" | "FALTOU") => {
    if (somenteLeitura) return;
    const atual = presencasReposicao[rep.id_aluno];
    let novoStatus: "PRESENTE" | "FALTOU" | "AGENDADO";
    let novoValor: boolean | undefined;

    if (tipo === "PRESENTE") {
      novoStatus = atual === true ? "AGENDADO" : "PRESENTE";
      novoValor  = atual === true ? undefined  : true;
    } else {
      novoStatus = atual === false ? "AGENDADO" : "FALTOU";
      novoValor  = atual === false ? undefined  : false;
    }

    setPresencasReposicao(prev => {
      const copia = { ...prev };
      if (novoValor === undefined) delete copia[rep.id_aluno];
      else copia[rep.id_aluno] = novoValor;
      return copia;
    });

    await salvarPresenca(turmaSelecionada.id_turma, rep.id_aluno, dateStr, novoStatus);

    // Se marcou PRESENTE, atualiza status da reposição para REALIZADA
    if (novoStatus === "PRESENTE") {
      await marcarReposicaoRealizada(rep.id_reposicao);
    }

    toast.current?.show({
      severity: novoStatus === "PRESENTE" ? "success" : novoStatus === "FALTOU" ? "warn" : "info",
      summary: "Reposição",
      detail: novoStatus === "PRESENTE"
        ? `Presença de reposição registrada para ${rep.nome}`
        : novoStatus === "FALTOU"
        ? `Falta registrada para ${rep.nome}`
        : `Marcação removida para ${rep.nome}`,
      life: 2000,
    });
  };

  const handleSalvarChamada = async () => {
    if (!turmaSelecionada) return;
    setSalvando(true);
    try {
      const resultado = await salvarChamada(turmaSelecionada.id_turma, dateStr);
      setChamadaSalva(true);
      toast.current?.show({
        severity: "success",
        summary: resultado.jaExistia ? "Chamada Atualizada" : "Chamada Salva",
        detail: resultado.mensagem,
        life: 3000,
      });
    } catch (err) {
      toast.current?.show({
        severity: "error",
        summary: "Erro",
        detail: "Não foi possível salvar a chamada.",
        life: 3000,
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="p-4" style={{ maxWidth: 860, margin: "0 auto" }}>
      <Toast ref={toast} />

      <div className="flex align-items-center gap-3 mb-4">
        <Button
          icon="pi pi-arrow-left"
          className="p-button-text p-button-rounded"
          onClick={() => navigate("/Horarios")}
          tooltip="Voltar ao início"
        />
        <div className="flex-1">
          <h2 className="text-2xl font-bold m-0 text-900">Registro de Chamada</h2>
          <p className="text-sm text-500 m-0 capitalize">{dataFormatada}</p>
        </div>
        {/* Seletor Hoje / Ontem */}
        <SelectButton
          value={diaAtivo}
          options={opcoesDia}
          onChange={e => e.value && setDiaAtivo(e.value)}
          className="p-button-sm"
        />
      </div>

      {/* ── Painel 1: Seleção de Dia da Semana ── */}
      <Card className="mb-3 shadow-1">
        <div className="mb-2">
          <span className="text-xs font-bold text-600 uppercase">Dia da semana</span>
        </div>
        {diasComTurmas.length === 0 ? (
          <div className="text-sm text-500 p-2">
            <i className="pi pi-calendar-times mr-2" />
            Nenhuma turma cadastrada.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {diasComTurmas.map(diaId => {
              const ehHoje = diaId === diaSemanaIdx(hoje);
              const ehOntem = diaId === diaSemanaIdx(ontem);
              const ativo = diaSelecionado === diaId;

              return (
                <button
                  key={diaId}
                  onClick={() => {
                    setDiaSelecionado(diaId);
                    setTurmaSelecionada(null);
                    setAlunos([]);
                    setPresencas({});
                    setTotalFaltas(0);
                    setChamadaSalva(false);
                  }}
                  className="border-round font-semibold text-sm px-3 py-2 cursor-pointer transition-all"
                  style={{
                    border: ativo ? "2px solid #3b82f6" : "2px solid #e5e7eb",
                    background: ativo ? "#eff6ff" : "#fafafa",
                    color: ativo ? "#1d4ed8" : "#374151",
                    outline: "none",
                    position: "relative",
                  }}
                >
                  {DIAS_CURTOS[diaId]}
                  {/* Indicador visual de "hoje" ou "ontem" */}
                  {(ehHoje || ehOntem) && (
                    <span
                      className="absolute"
                      style={{
                        top: -6, right: -6,
                        width: 10, height: 10,
                        borderRadius: "50%",
                        background: ehHoje ? "#22c55e" : "#f59e0b",
                        border: "2px solid #fff",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
        {/* Legenda */}
        <div className="flex gap-3 mt-3">
          <div className="flex align-items-center gap-1 text-xs text-500">
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            Hoje
          </div>
          <div className="flex align-items-center gap-1 text-xs text-500">
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
            Ontem
          </div>
        </div>
      </Card>

      {/* ── Painel 2: Seleção de Horário ── */}
      {diaSelecionado !== null && (
        <Card className="mb-4 shadow-1">
          <div className="mb-2 flex align-items-center justify-content-between">
            <span className="text-xs font-bold text-600 uppercase">
              Horários — {DIAS[diaSelecionado]}
            </span>
            {turmaSelecionada && (
              <div className="flex gap-2">
                <div className="text-center px-3 py-1 border-round" style={{ background: "#f0fdf4", border: "1px solid #22c55e" }}>
                  <span className="text-sm font-bold text-green-700">{presentes}</span>
                  <span className="text-xs text-green-600 ml-1">Pres.</span>
                </div>
                <div className="text-center px-3 py-1 border-round" style={{ background: "#fef2f2", border: "1px solid #ef4444" }}>
                  <span className="text-sm font-bold text-red-700">{faltantes}</span>
                  <span className="text-xs text-red-600 ml-1">Falt.</span>
                </div>
                <div className="text-center px-3 py-1 border-round" style={{ background: "#fafafa", border: "1px solid #d1d5db" }}>
                  <span className="text-sm font-bold text-gray-700">{naoMarcados}</span>
                  <span className="text-xs text-gray-500 ml-1">N/M</span>
                </div>
              </div>
            )}
          </div>

          {turmasDoDia.length === 0 ? (
            <div className="text-sm text-500 p-2">
              <i className="pi pi-clock mr-2" />
              Nenhuma turma neste dia.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {turmasDoDia.map(turma => {
                const ativo = turmaSelecionada?.id_turma === turma.id_turma;
                const total = Math.round(Number(turma.totalAlunos || 0));
                const max   = Math.round(Number(turma.capacidadeMaxima || 6));
                const cheia = total >= max;

                return (
                  <button
                    key={turma.id_turma}
                    onClick={() => setTurmaSelecionada(ativo ? null : turma)}
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
                      severity={cheia ? "danger" : "success"}
                      style={{ fontSize: "9px", padding: "1px 5px", marginTop: 4 }}
                    />
                  </button>
                );
              })}
            </div>
          )}

          {turmaSelecionada && (
            <div className="mt-3">
              <div className="flex justify-content-between text-xs text-500 mb-1">
                <span>Presença {diaAtivo === "hoje" ? "hoje" : "ontem"}</span>
                <span>{percentPresente}%</span>
              </div>
              <ProgressBar value={percentPresente} showValue={false} style={{ height: "6px" }} />
            </div>
          )}
        </Card>
      )}

      {turmaSelecionada && (
        <Card className="shadow-2">
          <div className="flex justify-content-between align-items-center mb-3 px-2">
            <span className="font-bold text-800">
              <i className="pi pi-users mr-2 text-primary" />
            Alunos Matriculados
            </span>
            <Tag
              value={`Faltas no mês: ${totalFaltas}`}
              severity={totalFaltas > 0 ? "danger" : "success"}
              icon={totalFaltas > 0 ? "pi pi-exclamation-triangle" : "pi pi-check"}
            />
          </div>

          <Divider className="my-2" />

          {loading ? (
            <div className="text-center py-5 text-400">
              <i className="pi pi-spin pi-spinner text-3xl" />
              <p className="mt-2">Carregando alunos...</p>
            </div>
          ) : alunos.length === 0 ? (
            <div className="text-center py-5 text-400 border-2 border-dashed border-round">
              <i className="pi pi-user-minus text-3xl mb-2" />
              <p>Nenhum aluno matriculado nesta turma.</p>
            </div>
          ) : (
            <div className="flex flex-column gap-2">
              {alunos.map(aluno => {
                const isPresente = presencas[aluno.id_aluno] === true;
                const isFaltante = presencas[aluno.id_aluno] === false;

                return (
                  <div
                    key={aluno.id_aluno}
                    className="flex align-items-center justify-content-between p-3 border-round border-1 transition-colors transition-duration-200"
                    style={{
                      background: isPresente ? "#f0fdf4" : isFaltante ? "#fef2f2" : "#fafafa",
                      borderColor: isPresente ? "#22c55e" : isFaltante ? "#ef4444" : "#e5e7eb",
                    }}
                  >
                    <div className="flex align-items-center gap-3">
                      <div
                        className="flex align-items-center justify-content-center border-circle font-bold text-white text-sm"
                        style={{
                          width: 36,
                          height: 36,
                          background: isPresente ? "#22c55e" : isFaltante ? "#ef4444" : "#9ca3af",
                          flexShrink: 0,
                        }}
                      >
                        {aluno.nome?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-800 text-sm">{aluno.nome}</div>
                        {aluno.telefone && <div className="text-xs text-500">{aluno.telefone}</div>}
                      </div>
                    </div>

                    <div className="flex align-items-center gap-3">
                    
                      {isPresente && <Tag value="Presente" severity="success" icon="pi pi-check" className="text-xs" />}
                      {isFaltante && <Tag value="Faltou" severity="danger" icon="pi pi-times" className="text-xs" />}
                      {!isPresente && !isFaltante && somenteLeitura && (
                        <Tag value="Não marcado" severity="secondary" className="text-xs" />
                      )}
                     
                      {!somenteLeitura && (
                        <>
                          <div className="flex align-items-center gap-1">
                            <Checkbox
                              inputId={`present-${aluno.id_aluno}`}
                              checked={isPresente}
                              onChange={() => alterarPresenca(aluno.id_aluno, "PRESENTE")}
                            />
                            <label htmlFor={`present-${aluno.id_aluno}`} className="text-xs text-green-700 font-semibold cursor-pointer">
                              Presente
                            </label>
                          </div>
                          <div className="flex align-items-center gap-1">
                            <Checkbox
                              inputId={`absent-${aluno.id_aluno}`}
                              checked={isFaltante}
                              onChange={() => alterarPresenca(aluno.id_aluno, "FALTOU")}
                            />
                            <label htmlFor={`absent-${aluno.id_aluno}`} className="text-xs text-red-700 font-semibold cursor-pointer">
                              Faltou
                            </label>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Seção Reposições ── */}
          {!loading && reposicoes.length > 0 && (
            <>
              <Divider className="my-3">
                <span className="text-xs font-bold text-600 uppercase px-2">
                  <i className="pi pi-calendar-plus mr-1" />
                  Reposições ({reposicoes.length})
                </span>
              </Divider>
              <div className="flex flex-column gap-2">
                {reposicoes.map(rep => {
                  const isPresente = presencasReposicao[rep.id_aluno] === true;
                  const isFaltante = presencasReposicao[rep.id_aluno] === false;
                  return (
                    <div
                      key={rep.id_reposicao}
                      className="flex align-items-center justify-content-between p-3 border-round border-1"
                      style={{
                        background:   isPresente ? "#f0fdf4" : isFaltante ? "#fef2f2" : "#eff6ff",
                        borderColor:  isPresente ? "#22c55e" : isFaltante ? "#ef4444" : "#93c5fd",
                        borderLeft: `4px solid ${isPresente ? "#22c55e" : isFaltante ? "#ef4444" : "#3b82f6"}`,
                      }}
                    >
                      <div className="flex align-items-center gap-3">
                        <div className="flex align-items-center justify-content-center border-circle font-bold text-white text-sm"
                          style={{ width: 36, height: 36, background: isPresente ? "#22c55e" : isFaltante ? "#ef4444" : "#3b82f6", flexShrink: 0 }}>
                          {rep.nome?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-800 text-sm">{rep.nome}</div>
                          <Tag value="Reposição" severity="info" className="text-xs mt-1" style={{ fontSize: "10px" }} />
                        </div>
                      </div>
                      <div className="flex align-items-center gap-3">
                        {isPresente && <Tag value="Presente" severity="success" icon="pi pi-check" className="text-xs" />}
                        {isFaltante && <Tag value="Faltou"   severity="danger"  icon="pi pi-times" className="text-xs" />}
                        {!somenteLeitura && (
                          <>
                            <div className="flex align-items-center gap-1">
                              <Checkbox inputId={`rep-pres-${rep.id_aluno}`} checked={isPresente}
                                onChange={() => alterarPresencaReposicao(rep, "PRESENTE")} />
                              <label htmlFor={`rep-pres-${rep.id_aluno}`} className="text-xs text-green-700 font-semibold cursor-pointer">Presente</label>
                            </div>
                            <div className="flex align-items-center gap-1">
                              <Checkbox inputId={`rep-falt-${rep.id_aluno}`} checked={isFaltante}
                                onChange={() => alterarPresencaReposicao(rep, "FALTOU")} />
                              <label htmlFor={`rep-falt-${rep.id_aluno}`} className="text-xs text-red-700 font-semibold cursor-pointer">Faltou</label>
                            </div>
                          </>
                        )}
                        {somenteLeitura && !isPresente && !isFaltante && (
                          <Tag value="Não marcado" severity="secondary" className="text-xs" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Rodapé — botão salvar chamada */}
          {!loading && alunos.length > 0 && (
            <>
              <Divider className="mb-2 mt-3" />
              <div className="flex align-items-center justify-content-between gap-3 pt-1">
                {somenteLeitura ? (
                  <div
                    className="flex align-items-center gap-2 w-full p-3 border-round"
                    style={{ background: "#fef9ec", border: "1px solid #f59e0b" }}
                  >
                    <i className="pi pi-lock text-orange-500 text-lg" />
                    <div>
                      <span className="text-sm font-bold text-orange-700">Chamada encerrada — somente leitura</span>
                      <p className="text-xs text-orange-600 m-0 mt-1">
                        Esta chamada foi salva e não pode mais ser editada. Chamadas só podem ser alteradas no mesmo dia ou no dia seguinte.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {chamadaSalva ? (
                      <div className="flex align-items-center gap-2">
                        <i className="pi pi-check-circle text-green-500 text-lg" />
                        <span className="text-sm font-semibold text-green-600">
                          Chamada salva
                        </span>
                        <span className="text-xs text-500">(clique em salvar novamente para atualizar)</span>
                      </div>
                    ) : (
                      <div className="flex align-items-center gap-2 text-400">
                        <i className="pi pi-info-circle" />
                        <span className="text-xs">Chamada ainda não foi salva {diaAtivo === "hoje" ? "hoje" : "para ontem"}.</span>
                      </div>
                    )}
                    <Button
                      label={chamadaSalva ? "Atualizar Chamada" : "Salvar Chamada"}
                      icon={salvando ? "pi pi-spin pi-spinner" : chamadaSalva ? "pi pi-refresh" : "pi pi-save"}
                      className={chamadaSalva ? "p-button-outlined p-button-success p-button-sm font-bold" : "p-button-success p-button-sm font-bold"}
                      disabled={salvando || naoMarcados === alunos.length}
                      tooltip={naoMarcados === alunos.length ? "Registre a presença de ao menos um aluno antes de salvar" : undefined}
                      tooltipOptions={{ position: "top" }}
                      onClick={handleSalvarChamada}
                    />
                  </>
                )}
              </div>
            </>
          )}
        </Card>
      )}

      {diaSelecionado !== null && !turmaSelecionada && turmasDoDia.length > 0 && (
        <div className="flex flex-column align-items-center justify-content-center text-center py-6 text-400">
          <i className="pi pi-check-square text-5xl mb-3" style={{ color: "#93c5fd" }} />
          <h3 className="text-700 font-semibold">Selecione um horário acima</h3>
          <p className="text-sm">para registrar a chamada de {diaAtivo === "hoje" ? "hoje" : "ontem"} ({DIAS[diaSelecionado]}).</p>
        </div>
      )}
    </div>
  );
}
