import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Button } from "primereact/button";
import { SelectButton } from "primereact/selectbutton";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";

import { buscarTodasTurmas, buscarAlunosDaTurma } from "../services/TurmaService";
import { buscarProfessorPorModalidade } from "../services/ProfessorService";
import { buscarReposicoesParaChamada } from "../services/ReposicaoService";
import logoPretoPng from "../assets/HIDROFIT GOTA PRETA.png";

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function diaSemanaIdx(d: Date): number {

  return d.getDay() === 0 ? 6 : d.getDay() - 1;
}

function formatarDataExtenso(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

 function calcularDatas() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);
  return { hoje, ontem };
}

const { hoje: HOJE, ontem: ONTEM } = calcularDatas();

const DIAS        = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
const DIAS_CURTOS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const DIAS_PT     = DIAS;

function formatarHora(hora: string | number): string {
  return `${String(Math.round(Number(hora))).padStart(2, "0")}:00`;
}

interface AlunoImpressao {
  id_aluno:      number;
  nome:          string;
  reposicao:     boolean;
  id_turma:      number;
  horarioInicio: number;
  modalidade:    string;
}

interface DadosImpressao {
  tipo:          "turma" | "dia";
  turma:         any | null;
  diaSemana:     number;
  data:          Date;
  alunos:        AlunoImpressao[];
  nomeProfessor: string | null;
}

export default function Impressao() {
  const toast = useRef<Toast>(null);

  const opcoesDia = [
    { label: "Hoje",  value: "hoje"  },
    { label: "Ontem", value: "ontem" },
  ];

  const [diaAtivo, setDiaAtivo]                 = useState<"hoje" | "ontem">("hoje");
  const [turmas, setTurmas]                     = useState<any[]>([]);
  const [diaSelecionado, setDiaSelecionado]     = useState<number>(diaSemanaIdx(HOJE));
  const [turmaSelecionada, setTurmaSelecionada] = useState<any | null>(null);
  const [carregando, setCarregando]             = useState(false);
  const [dadosImpressao, setDadosImpressao]     = useState<DadosImpressao | null>(null);

  const dataEfetiva = diaAtivo === "hoje" ? HOJE : ONTEM;
  const dateStr     = toDateStr(dataEfetiva);
  const diaIdx      = diaSemanaIdx(dataEfetiva);

  useEffect(() => {
    buscarTodasTurmas().then(lista => {
      setTurmas(lista);
      setDiaSelecionado(diaSemanaIdx(HOJE));
    });
  }, []);

  useEffect(() => {
    setDiaSelecionado(diaIdx);
    setTurmaSelecionada(null);
  }, [diaAtivo]);

  const diasComTurmas = Array.from(new Set(turmas.map(t => Number(t.diaSemana)))).sort();
  const turmasDoDia   = turmas
    .filter(t => Number(t.diaSemana) === diaSelecionado)
    .sort((a, b) => Number(a.horarioInicio) - Number(b.horarioInicio));

  const montarListaAlunosTurma = async (turma: any): Promise<AlunoImpressao[]> => {
    const [alunos, reposicoes] = await Promise.all([
      buscarAlunosDaTurma(turma.id_turma),
      buscarReposicoesParaChamada(turma.id_turma, dateStr),
    ]);

    const idsMatriculados = new Set((alunos as any[]).map(a => a.id_aluno));
    const horarioInicio   = Number(turma.horarioInicio);
    const modalidade      = turma.modalidade ?? "";

    const alunosMatriculados = (alunos as any[]).map(a => ({
      id_aluno:      a.id_aluno,
      nome:          a.nome,
      reposicao:     false,
      id_turma:      turma.id_turma,
      horarioInicio,
      modalidade,
    }));

    const alunosReposicao = (reposicoes as any[])
      .filter(r => !idsMatriculados.has(r.id_aluno))
      .map(r => ({
        id_aluno:      r.id_aluno,
        nome:          r.nome,
        reposicao:     true,
        id_turma:      turma.id_turma,
        horarioInicio,
        modalidade,
      }));

    return [
      ...alunosMatriculados,
      ...alunosReposicao,
    ].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  };

  const handleImprimirTurma = async () => {
    if (!turmaSelecionada) return;
    setCarregando(true);
    try {
      const [listaFinal, professor] = await Promise.all([
        montarListaAlunosTurma(turmaSelecionada),
        buscarProfessorPorModalidade(turmaSelecionada.id_modalidade),
      ]);

      setDadosImpressao({
        tipo:          "turma",
        turma:         turmaSelecionada,
        diaSemana:     Number(turmaSelecionada.diaSemana),
        data:          dataEfetiva,
        alunos:        listaFinal,
        nomeProfessor: professor?.nome ?? null,
      });
    } catch (err) {
      console.error("Erro ao preparar impressão:", err);
      toast.current?.show({
        severity: "error",
        summary:  "Erro",
        detail:   "Não foi possível carregar os dados para impressão.",
      });
    } finally {
      setCarregando(false);
    }
  };

  const handleImprimirDia = async () => {
    if (turmasDoDia.length === 0) return;
    setCarregando(true);
    try {
      const listasPorTurma = await Promise.all(turmasDoDia.map(turma => montarListaAlunosTurma(turma)));
      const listaFinal = listasPorTurma
        .flat()
        .sort((a, b) => {
          const porHorario = Number(a.horarioInicio) - Number(b.horarioInicio);
          if (porHorario !== 0) return porHorario;
          const porModalidade = a.modalidade.localeCompare(b.modalidade, "pt-BR");
          if (porModalidade !== 0) return porModalidade;
          return a.nome.localeCompare(b.nome, "pt-BR");
        });

      setDadosImpressao({
        tipo:          "dia",
        turma:         null,
        diaSemana:     diaSelecionado,
        data:          dataEfetiva,
        alunos:        listaFinal,
        nomeProfessor: null,
      });
    } catch (err) {
      console.error("Erro ao preparar impressão do dia:", err);
      toast.current?.show({
        severity: "error",
        summary:  "Erro",
        detail:   "Não foi possível carregar a lista completa do dia.",
      });
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (!dadosImpressao) return;
    const timer = setTimeout(() => {
      window.print();
      const limpar = () => {
        setDadosImpressao(null);
        window.removeEventListener("afterprint", limpar);
      };
      window.addEventListener("afterprint", limpar);
    }, 200);
    return () => clearTimeout(timer);
  }, [dadosImpressao]);

  return (
    <div className="w-full">
      <Toast ref={toast} />

   {dadosImpressao && ReactDOM.createPortal(
        <FolhaImpressao dados={dadosImpressao} />,
        document.body
      )}

      <div className="flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="text-2xl font-bold m-0 text-900">Impressão</h2>
          <p className="text-sm text-500 mt-1 m-0">Lista de presença para assinatura</p>
        </div>
        <SelectButton
          value={diaAtivo}
          options={opcoesDia}
          onChange={e => e.value && setDiaAtivo(e.value as "hoje" | "ontem")}
          className="p-button-sm"
        />
      </div>

      <div className="surface-card border-1 surface-border border-round shadow-1 p-4 mb-3">
        <div className="mb-2 flex align-items-center justify-content-between">
          <span className="text-xs font-bold text-600 uppercase">Dia da semana</span>
          <span className="text-xs text-500 capitalize">{formatarDataExtenso(dataEfetiva)}</span>
        </div>
        {diasComTurmas.length === 0 ? (
          <span className="text-sm text-400">Nenhuma turma cadastrada.</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {diasComTurmas.map(diaId => {
              const ativo      = diaSelecionado === diaId;
              const ehDiaAtual = diaId === diaIdx;
              return (
                <button
                  key={diaId}
                  onClick={() => { setDiaSelecionado(diaId); setTurmaSelecionada(null); }}
                  className={`btn-selector${ativo ? " btn-selector--active" : ""}`}
                  style={{ position: "relative" }}
                >
                  {DIAS_CURTOS[diaId]}
                  {ehDiaAtual && (
                    <span className={`btn-day-dot btn-day-dot--${diaAtivo === "hoje" ? "today" : "yesterday"}`} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {diaSelecionado !== null && (
        <div className="surface-card border-1 surface-border border-round shadow-1 p-4 mb-4">
          <div className="mb-2 flex align-items-center justify-content-between gap-3">
            <span className="text-xs font-bold text-600 uppercase">
              Horários — {DIAS[diaSelecionado]}
            </span>
            {turmasDoDia.length > 0 && (
              <Button
                label="Imprimir Dia Inteiro"
                icon={carregando ? "pi pi-spin pi-spinner" : "pi pi-print"}
                className="p-button-sm p-button-outlined font-bold"
                disabled={carregando}
                onClick={handleImprimirDia}
              />
            )}
          </div>
          {turmasDoDia.length === 0 ? (
            <span className="text-sm text-400">Nenhuma turma neste dia.</span>
          ) : (
            <div className="flex flex-wrap gap-2">
              {turmasDoDia.map(turma => {
                const ativo = turmaSelecionada?.id_turma === turma.id_turma;
                const total = Math.round(Number(turma.totalAlunos || 0));
                const max   = Math.round(Number(turma.capacidadeMaxima || 6));
                return (
                  <button
                    key={turma.id_turma}
                    onClick={() => setTurmaSelecionada(ativo ? null : turma)}
                    className={`btn-selector btn-selector--turma${ativo ? " btn-selector--active" : ""}`}
                  >
                    <span className="btn-selector__hora">
                      {String(Math.round(Number(turma.horarioInicio))).padStart(2, "0")}h
                    </span>
                    <span className="btn-selector__modalidade">
                      {turma.modalidade}
                    </span>
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
        </div>
      )}

      {turmaSelecionada && (
        <div className="selected-turma-panel surface-card border-1 surface-border border-round shadow-1 p-4 flex align-items-center justify-content-between">
          <div>
            <div className="font-bold text-900 text-lg">
              {turmaSelecionada.modalidade} —{" "}
              {String(Math.round(Number(turmaSelecionada.horarioInicio))).padStart(2, "0")}h
            </div>
            <div className="text-sm text-500 capitalize mt-1">
              {formatarDataExtenso(dataEfetiva)}
            </div>
          </div>
          <Button
            label="Imprimir Lista"
            icon={carregando ? "pi pi-spin pi-spinner" : "pi pi-print"}
            className="p-button-lg font-bold btn-primary-brand"
            disabled={carregando}
            onClick={handleImprimirTurma}
          />
        </div>
      )}
    </div>
  );
}
function FolhaImpressao({ dados }: { dados: DadosImpressao }) {
  const { turma, data, alunos, nomeProfessor, tipo } = dados;

  const dataFormatada = data.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
  const diaNome    = DIAS_PT[Number(dados.diaSemana)] ?? "";
  const horario    = turma ? formatarHora(turma.horarioInicio) : "Dia inteiro";
  const modalidade = turma?.modalidade ?? "Todas as modalidades";
  const ehListaDia = tipo === "dia";

  return (
    <>
      <style>{`
        #print-root {
          display: none;
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: #fff;
          padding: 18mm 16mm 14mm 16mm;
        }

        #print-root * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: Arial, Helvetica, sans-serif;
          color: #000;
        }

        .pr-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          padding-bottom: 10px;
          margin-bottom: 14px;
          border-bottom: 3px solid #000;
        }
        .pr-logo { height: 60px; width: auto; object-fit: contain; }

        .pr-header-right { text-align: right; }
        .pr-titulo   { font-size: 18pt; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; line-height: 1; }
        .pr-subtitulo { font-size: 10pt; color: #555; margin-top: 4px; }

        .pr-info-block {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 24px;
          margin-bottom: 18px;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: #fafafa;
          font-size: 10pt;
        }
        .pr-info-item strong { font-weight: 700; margin-right: 4px; }

        .pr-table { width: 100%; border-collapse: collapse; }
        .pr-table thead tr { background: #ffffffff; }
        .pr-table thead th {
          color: #000000ff;
          font-size: 9pt;
          font-weight: 700;
          padding: 7px 10px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        .pr-table thead th:last-child { width: 200px; text-align: center; }
        .pr-table thead th:first-child { width: 36px; text-align: center; }
        .pr-table--dia thead th:nth-child(2) { width: 72px; text-align: center; }

        .pr-table tbody tr { border-bottom: 1px solid #e0e0e0; height: 32px; }
        .pr-table tbody tr:nth-child(even) { background: #f7f7f7; }
        .pr-table tbody tr:last-child { border-bottom: 2px solid #000; }

        .pr-td-num  { width: 36px; text-align: center; font-size: 9pt; color: #666; padding: 0 6px; font-weight: 700; }
        .pr-td-hora { width: 72px; text-align: center; font-size: 9pt; color: #111; padding: 0 8px; font-weight: 700; white-space: nowrap; }
        .pr-td-nome { padding: 0 10px; font-size: 10.5pt; }
        .pr-modalidade { font-size: 8pt; color: #666; margin-left: 6px; }
        .pr-rep     { font-size: 8pt; color: #777; font-style: italic; margin-left: 4px; }
        .pr-td-ass  { width: 200px; padding: 0 10px; border-left: 1px solid #ddd; }
        .pr-ass-linha { border-bottom: 1px solid #aaa; height: 20px; margin: 0 8px; }

        .pr-footer {
          margin-top: 24px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .pr-ass-prof { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
        .pr-ass-prof-linha { width: 260px; border-bottom: 1.5px solid #000; }
        .pr-ass-prof-label { font-size: 9pt; color: #444; }

        .pr-printed-at { font-size: 7.5pt; color: #aaa; text-align: right; }

        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          body > *:not(#print-root) { display: none !important; }
          #print-root { display: block !important; }
          /* Force no browser-added headers/footers */
          html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div id="print-root">

        <div className="pr-header">
          <img src={logoPretoPng} alt="HydroFit" className="pr-logo" />
          <h1> HydroFIT</h1>
          <div className="pr-header-right">
            <div className="pr-titulo">{ehListaDia ? "Lista de Presença do Dia" : "Lista de Presença"}</div>
            <div className="pr-subtitulo">{modalidade} · {diaNome} · {horario}</div>
          </div>
        </div>

        <div className="pr-info-block">
          <div className="pr-info-item"><strong>Data:</strong> {dataFormatada}</div>
          <div className="pr-info-item"><strong>Horário:</strong> {horario}</div>
          <div className="pr-info-item"><strong>Modalidade:</strong> {modalidade}</div>
          <div className="pr-info-item"><strong>Total de alunos:</strong> {alunos.length}</div>
          {nomeProfessor && (
            <div className="pr-info-item" style={{ gridColumn: "1 / -1" }}>
              <strong>Professor(a):</strong> {nomeProfessor}
            </div>
          )}
        </div>

        <table className={`pr-table${ehListaDia ? " pr-table--dia" : ""}`}>
          <thead>
            <tr>
              <th>#</th>
              {ehListaDia && <th>Horário</th>}
              <th>Nome do Aluno</th>
              <th>Assinatura</th>
            </tr>
          </thead>
          <tbody>
            {alunos.map((aluno, i) => (
              <tr key={`${aluno.id_turma}-${aluno.id_aluno}-${aluno.reposicao ? "rep" : "fixo"}-${i}`}>
                <td className="pr-td-num">{i + 1}</td>
                {ehListaDia && (
                  <td className="pr-td-hora">{formatarHora(aluno.horarioInicio)}</td>
                )}
                <td className="pr-td-nome">
                  {aluno.nome}
                  {ehListaDia && <span className="pr-modalidade">— {aluno.modalidade}</span>}
                  {aluno.reposicao && <span className="pr-rep">(Reposição)</span>}
                </td>
                <td className="pr-td-ass">
                  <div className="pr-ass-linha" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pr-footer">
          <div className="pr-ass-prof">
            <div className="pr-ass-prof-linha" />
            <div className="pr-ass-prof-label">
              {ehListaDia
                ? "Assinatura do(a) responsável pela conferência"
                : `Assinatura do(a) Professor(a)${nomeProfessor ? ` — ${nomeProfessor}` : ""}`}
            </div>
          </div>
          <div className="pr-printed-at">
            Impresso em<br />
            {new Date().toLocaleString("pt-BR")}
          </div>
        </div>

      </div>
    </>
  );
}
