import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Tag } from "primereact/tag";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Toast } from "primereact/toast";
import Database from "@tauri-apps/plugin-sql";

import {
  buscarTodasTurmas,
  criarTurma,
  buscarAlunosDaTurma,
  vincularAlunoTurma,
  desvincularAlunoTurma,
} from "../services/TurmaService";

async function buscarTodosAlunosDoSistema() {
  const db = await Database.load("sqlite:gestao_hidro.db");
  return await db.select<any[]>(
    "SELECT id_aluno, nome FROM ALUNOS ORDER BY nome ASC",
  );
}

async function buscarTodasModalidades() {
  const db = await Database.load("sqlite:gestao_hidro.db");
  return await db.select<any[]>(
    "SELECT id_modalidade, modalidade FROM MODALIDADE ORDER BY id_modalidade",
  );
}

const formatarHora = (hora: any): string => {
  if (hora === undefined || hora === null) return "";
  const h = Math.round(Number(hora));
  return String(h).padStart(2, "0");
};

// Mapeamento fixo de cores por modalidade (chaves sem acento, lowercase)
const COR_POR_MODALIDADE: Record<
  string,
  { bg: string; bgDark: string; border: string; text: string; textDark: string }
> = {
  hidroginastica: {
    bg: "#fdf2f8",
    bgDark: "#3a2535",
    border: "#ec4899",
    text: "#9d174d",
    textDark: "#f9a8d4",
  },
  "natacao bebe": {
    bg: "#eff6ff",
    bgDark: "#1e3a5f",
    border: "#3b82f6",
    text: "#1e40af",
    textDark: "#93c5fd",
  },
  "natacao infantil": {
    bg: "#f0fdf4",
    bgDark: "#14362b",
    border: "#22c55e",
    text: "#15803d",
    textDark: "#86efac",
  },
  "natacao adulto": {
    bg: "#fff7ed",
    bgDark: "#3a2010",
    border: "#f97316",
    text: "#c2410c",
    textDark: "#fdba74",
  },
  fisioterapia: {
    bg: "#fef2f2",
    bgDark: "#3a1515",
    border: "#ef4444",
    text: "#b91c1c",
    textDark: "#fca5a5",
  },
};

const COR_FALLBACK = {
  bg: "#f8fafc",
  bgDark: "#2d3748",
  border: "#94a3b8",
  text: "#475569",
  textDark: "#cbd5e1",
};

// Remove acentos e normaliza para busca sem depender de grafia exata
function normalizarChave(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const obterEstiloTurma = (nomeModalidade: string, isDark: boolean) => {
  const chave = normalizarChave(nomeModalidade ?? "");
  const cor = COR_POR_MODALIDADE[chave] ?? COR_FALLBACK;
  return {
    bg: isDark ? cor.bgDark : cor.bg,
    border: cor.border,
    text: isDark ? cor.textDark : cor.text,
    badge: "success",
  };
};

export default function GradeHoraria() {
  const toast = useRef<Toast>(null);
  const navigate = useNavigate();

  const [turmas, setTurmas] = useState<any[]>([]);
  const [modalidades, setModalidades] = useState<any[]>([]);
  const [listaCompletaAlunos, setListaCompletaAlunos] = useState<any[]>([]);

  const [dataReferencia, setDataReferencia] = useState<Date>(new Date());
  const [agora, setAgora] = useState<Date>(new Date());

  const [modalCriarVisible, setModalCriarVisible] = useState(false);
  const [modalDetalhesVisible, setModalDetalhesVisible] = useState(false);
  const [turmaSelecionada, setTurmaSelecionada] = useState<any>(null);
  const [alunosDaTurma, setAlunosDaTurma] = useState<any[]>([]);

  const [mostrarSeletorAluno, setMostrarSeletorAluno] = useState(false);
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState<number | null>(
    null,
  );

  const [novaTurma, setNovaTurma] = useState({
    diaSemana: 0,
    horarioInicio: 8,
    horarioFim: 9,
    idModalidade: null as number | null,
    capacidadeMaxima: 6,
  });

  const [isDark, setIsDark] = useState(
    () => document.documentElement.getAttribute("data-theme") === "dark",
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  const linhasHorarios = Array.from({ length: 14 }, (_, i) => i + 7);

  const carregarDadosDoCalendario = async () => {
    try {
      const listaTurmas = await buscarTodasTurmas();
      setTurmas(listaTurmas);

      const todosAlunos = await buscarTodosAlunosDoSistema();
      setListaCompletaAlunos(todosAlunos);

      const listaModalidade = await buscarTodasModalidades();
      setModalidades(listaModalidade);
    } catch (error) {
      console.error("Erro ao sincronizar dados com o SQLite:", error);
    }
  };

  useEffect(() => {
    carregarDadosDoCalendario();
    const intervalo = setInterval(() => setAgora(new Date()), 60000);
    return () => clearInterval(intervalo);
  }, []);

  const atualizarAlunosDaTurmaAberta = async (idTurma: number) => {
    try {
      const alunos = await buscarAlunosDaTurma(idTurma);
      setAlunosDaTurma(alunos);
    } catch (error) {
      console.error("Erro ao buscar alunos vinculados:", error);
    }
  };

  const obterDiasDaSemana = (dataBase: Date) => {
    const atual = new Date(dataBase);
    const diaDaSemana = atual.getDay();
    const distanciaParaSegunda = diaDaSemana === 0 ? -6 : 1 - diaDaSemana;
    const segundaFeira = new Date(atual);
    segundaFeira.setDate(atual.getDate() + distanciaParaSegunda);

    const nomesDias = [
      "Segunda-feira",
      "Terça-feira",
      "Quarta-feira",
      "Quinta-feira",
      "Sexta-feira",
      "Sábado",
      "Domingo",
    ];
    const cores = [
      "border-blue-500",
      "border-purple-500",
      "border-indigo-500",
      "border-teal-500",
      "border-pink-500",
      "border-orange-500",
      "border-gray-400",
    ];
    const estilosVisuais = [
      "col-working-day",
      "col-working-day",
      "col-working-day",
      "col-working-day",
      "col-working-day",
      "col-working-day",
      "col-weekend",
    ];

    return Array.from({ length: 7 }).map((_, idx) => {
      const diaCorrente = new Date(segundaFeira);
      diaCorrente.setDate(segundaFeira.getDate() + idx);
      return {
        id: idx,
        nome: nomesDias[idx],
        dataGrid: `${String(diaCorrente.getDate()).padStart(2, "0")}/${String(diaCorrente.getMonth() + 1).padStart(2, "0")}`,
        cor: cores[idx],
        classeVisual: estilosVisuais[idx],
      };
    });
  };

  const diasDaSemanaComDatas = obterDiasDaSemana(dataReferencia);
  const diaAtualId = agora.getDay() === 0 ? 6 : agora.getDay() - 1;
  const horaAtualFoco = agora.getHours();

  const voltarSemana = () => {
    const d = new Date(dataReferencia);
    d.setDate(d.getDate() - 7);
    setDataReferencia(d);
  };
  const avancarSemana = () => {
    const d = new Date(dataReferencia);
    d.setDate(d.getDate() + 7);
    setDataReferencia(d);
  };
  const irParaHoje = () => setDataReferencia(new Date());

  const handleCelulaClick = (diaId: number, hora: number) => {
    setNovaTurma({
      diaSemana: diaId,
      horarioInicio: hora,
      horarioFim: hora + 1,
      idModalidade: null,
      capacidadeMaxima: 6,
    });
    setModalCriarVisible(true);
  };

  const salvarNovaTurma = async () => {
    if (!novaTurma.idModalidade) {
      toast.current?.show({
        severity: "warn",
        summary: "Aviso",
        detail: "Selecione uma modalidade antes de salvar.",
      });
      return;
    }
    try {
      await criarTurma(novaTurma as any);
      toast.current?.show({
        severity: "success",
        summary: "Sucesso",
        detail: "Nova turma criada na grade!",
      });
      setModalCriarVisible(false);
      carregarDadosDoCalendario();
    } catch (error) {
      toast.current?.show({
        severity: "error",
        summary: "Erro",
        detail: "Falha ao registrar turma.",
      });
    }
  };

  const handleCardClick = async (e: React.MouseEvent, turma: any) => {
    e.stopPropagation();
    setTurmaSelecionada(turma);
    setMostrarSeletorAluno(false);
    setAlunoSelecionadoId(null);
    setModalDetalhesVisible(true);
    await atualizarAlunosDaTurmaAberta(turma.id_turma);
  };

  const gerenciarVinculoAluno = async () => {
    if (!alunoSelecionadoId || !turmaSelecionada) return;

    try {
      const resposta = await vincularAlunoTurma(
        alunoSelecionadoId,
        turmaSelecionada.id_turma,
      );

      if (resposta.sucesso) {
        toast.current?.show({
          severity: "success",
          summary: "Matriculado",
          detail: resposta.mensagem,
        });
        setMostrarSeletorAluno(false);
        setAlunoSelecionadoId(null);
        await atualizarAlunosDaTurmaAberta(turmaSelecionada.id_turma);
        await carregarDadosDoCalendario();
      } else {
        toast.current?.show({
          severity: "warn",
          summary: "Aviso",
          detail: resposta.mensagem,
        });
      }
    } catch (error) {
      toast.current?.show({
        severity: "error",
        summary: "Erro",
        detail: "Erro ao processar matrícula.",
      });
    }
  };

  const gerenciarDesvinculoAluno = async (idAluno: number) => {
    if (!turmaSelecionada) return;

    try {
      const resposta = await desvincularAlunoTurma(
        idAluno,
        turmaSelecionada.id_turma,
      );
      toast.current?.show({
        severity: "info",
        summary: "Removido",
        detail: resposta.mensagem,
      });
      await atualizarAlunosDaTurmaAberta(turmaSelecionada.id_turma);
      await carregarDadosDoCalendario();
    } catch (error) {
      toast.current?.show({
        severity: "error",
        summary: "Erro",
        detail: "Falha ao remover aluno.",
      });
    }
  };

  return (
    <div className="w-full h-full p-2 relative">
      <Toast ref={toast} />

      <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center mb-4 gap-3">
        <div>
          <h2 className="text-2xl font-bold m-0 text-900">
            Grade Horária Semanal
          </h2>
        </div>
        <div className="flex align-items-center gap-2">
          <Button
            label="Anterior "
            icon="pi pi-chevron-left"
            onClick={voltarSemana}
            className="p-button-outlined p-button-sm text-primary"
          />
          <Button
            label="Semana atual"
            onClick={irParaHoje}
            className="p-button-outlined p-button-sm text-primary font-bold"
          />
          <Button
            label="Próxima"
            icon="pi pi-chevron-right"
            onClick={avancarSemana}
            className="p-button-outlined p-button-sm text-primary"
          />
        </div>
      </div>

      <div
        className="surface-card p-2 border-round shadow-1 overflow-x-auto"
        style={{ maxHeight: "calc(100vh - 180px)" }}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th
                className="p-2 border-bottom-1 surface-border text-center font-bold text-xs text-500"
                style={{ width: "70px" }}
              >
                Horário
              </th>
              {diasDaSemanaComDatas.map((dia) => (
                <th
                  key={dia.id}
                  className={`p-2 border-bottom-1 surface-border text-center border-top-3 ${dia.cor} ${dia.classeVisual}`}
                  style={{ minWidth: "160px", width: "14%" }}
                >
                  <div className="font-bold text-sm text-800">{dia.nome}</div>
                  <div className="text-xs font-bold mt-1 badge-date-container inline-block px-2 py-0 border-round">
                    {dia.dataGrid}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {linhasHorarios.map((hora) => (
              <tr key={hora} style={{ height: "85px" }}>
                <td
                  className="p-2 border-bottom-1 surface-border border-right-1 text-center font-bold text-xs text-600"
                  style={{ verticalAlign: "top", paddingTop: "10px" }}
                >
                  {String(hora).padStart(2, "0")}:00
                </td>

                {diasDaSemanaComDatas.map((dia) => {
                  const turmasNesseBloco = turmas.filter(
                    (t) =>
                      Number(t.diaSemana) === dia.id &&
                      Number(t.horarioInicio) === hora,
                  );
                  const ehO_MomentoAtual =
                    dia.id === diaAtualId && hora === horaAtualFoco;

                  return (
                    <td
                      key={dia.id}
                      className={`p-1 border-bottom-1 border-right-1 surface-border relative transition-colors duration-150 ${dia.classeVisual} ${ehO_MomentoAtual ? "current-time-cell" : "cell-hover"}`}
                      style={{ verticalAlign: "top", cursor: "pointer" }}
                      onClick={() => handleCelulaClick(dia.id, hora)}
                    >
                      {turmasNesseBloco.map((turma) => {
                        const total = Math.round(
                          Number(turma.totalAlunos || 0),
                        );
                        const max = Math.round(
                          Number(turma.capacidadeMaxima || 6),
                        );
                        const estaCheia = total >= max;
                        const estilo = obterEstiloTurma(
                          turma.modalidade,
                          isDark,
                        );

                        return (
                          <div
                            key={turma.id_turma}
                            onClick={(e) => handleCardClick(e, turma)}
                            className="border-round shadow-1 p-2 flex flex-column gap-1 border-left-3 hover:shadow-3 transition-all"
                            style={{
                              backgroundColor: estilo.bg,
                              borderLeftColor: estilo.border,
                              color: estilo.text,
                            }}
                          >
                            <div
                              className="font-bold text-xs uppercase white-space-nowrap overflow-hidden text-overflow-ellipsis"
                              style={{ color: estilo.text }}
                              title={turma.modalidade}
                            >
                              {turma.modalidade}
                            </div>
                            <div
                              className="font-medium"
                              style={{
                                fontSize: "10px",
                                color: estilo.text,
                                opacity: 0.85,
                              }}
                            >
                              {formatarHora(turma.horarioInicio)}h às{" "}
                              {formatarHora(turma.horarioFim)}h
                            </div>
                            <div
                              className="flex align-items-center justify-content-between mt-1 pt-1 border-top-1"
                              style={{ borderColor: "rgba(0,0,0,0.05)" }}
                            >
                              <span
                                style={{
                                  fontSize: "9px",
                                  color: estilo.text,
                                  opacity: 0.8,
                                }}
                              >
                                Alunos:
                              </span>
                              <Tag
                                severity={
                                  estaCheia ? "danger" : (estilo.badge as any)
                                }
                                value={`${total}/${max}`}
                                style={{
                                  fontSize: "9px",
                                  padding: "1px 4px",
                                  height: "16px",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        header="Agendar Nova Turma"
        visible={modalCriarVisible}
        style={{ width: "400px" }}
        onHide={() => setModalCriarVisible(false)}
        footer={
          <div>
            <Button
              label="Cancelar"
              icon="pi pi-times"
              onClick={() => setModalCriarVisible(false)}
              className="p-button-text text-sm"
            />
            <Button
              label="Agendar"
              icon="pi pi-check"
              onClick={salvarNovaTurma}
              className="p-button-sm font-bold"
            />
          </div>
        }
      >
        <div className="flex flex-column gap-3 pt-2">
          <div>
            <label className="block fo-nt-bold text-sm text-700 mb-1">
              Modalidade
            </label>
            <Dropdown
              appendTo="self"
              value={novaTurma.idModalidade}
              options={modalidades}
              optionLabel="modalidade"
              optionValue="id_modalidade"
              onChange={(e) =>
                setNovaTurma({ ...novaTurma, idModalidade: e.value })
              }
              placeholder="Selecione a atividade"
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block font-bold text-sm text-700 mb-1">
                Início
              </label>
              <InputNumber
                value={novaTurma.horarioInicio}
                min={7}
                max={20}
                disabled
                className="w-full text-500"
              />
            </div>
            <div className="flex-1">
              <label className="block font-bold text-sm text-700 mb-1">
                Término
              </label>
              <InputNumber
                value={novaTurma.horarioFim}
                min={novaTurma.horarioInicio + 1}
                max={21}
                onChange={(e) =>
                  setNovaTurma({
                    ...novaTurma,
                    horarioFim: e.value || novaTurma.horarioInicio + 1,
                  })
                }
                className="w-full"
              />
            </div>
          </div>
          <div>
            <label className="block font-bold text-sm text-700 mb-1">
              Capacidade Máxima
            </label>
            <InputNumber
              value={novaTurma.capacidadeMaxima}
              min={1}
              max={30}
              onChange={(e) =>
                setNovaTurma({ ...novaTurma, capacidadeMaxima: e.value || 6 })
              }
              className="w-full"
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        header={
          turmaSelecionada
            ? `Gerenciar Turma: ${turmaSelecionada.modalidade}`
            : "Detalhes"
        }
        visible={modalDetalhesVisible}
        style={{ width: "450px" }}
        onHide={() => setModalDetalhesVisible(false)}
      >
        {turmaSelecionada && (
          <div className="flex flex-column gap-3">
            <div className="info-highlight-box border-round p-3 flex justify-content-between align-items-center">
              <div>
                <span className="block text-xs font-semibold text-600 uppercase">
                  Horário
                </span>
                <span className="font-bold text-primary">
                  {formatarHora(turmaSelecionada.horarioInicio)}:00 às{" "}
                  {formatarHora(turmaSelecionada.horarioFim)}:00
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-600 uppercase text-right">
                  Lotação Atual
                </span>
                <span className="font-bold text-900 block text-right">
                  {alunosDaTurma.length} de{" "}
                  {Math.round(Number(turmaSelecionada.capacidadeMaxima))}
                </span>
              </div>
            </div>

            <div>
              <div className="flex justify-content-between align-items-center mb-2 border-bottom-1 surface-border pb-2">
                <span className="font-bold text-sm text-800">
                  Alunos Matriculados
                </span>
                {!mostrarSeletorAluno && (
                  <Button
                    icon="pi pi-user-plus"
                    label="Vincular Aluno"
                    onClick={() => setMostrarSeletorAluno(true)}
                    className="p-button-text p-button-sm font-bold text-xs"
                  />
                )}
              </div>

              {mostrarSeletorAluno && (
                <div className="flex gap-2 align-items-center mb-3 p-2 selector-wrapper border-round border-1 surface-border">
                  <Dropdown
                    appendTo="self"
                    value={alunoSelecionadoId}
                    options={listaCompletaAlunos}
                    optionLabel="nome"
                    optionValue="id_aluno"
                    filter
                    onChange={(e) => setAlunoSelecionadoId(e.value)}
                    placeholder="Selecione o aluno..."
                    className="flex-1 p-inputtext-sm"
                  />
                  <Button
                    icon="pi pi-check"
                    severity="success"
                    onClick={gerenciarVinculoAluno}
                    className="p-button-sm"
                    tooltip="Confirmar Vínculo"
                  />
                  <Button
                    icon="pi pi-times"
                    severity="secondary"
                    onClick={() => setMostrarSeletorAluno(false)}
                    className="p-button-sm p-button-text"
                  />
                </div>
              )}

              <div className="flex flex-column gap-2 max-h-12rem overflow-y-auto pr-1">
                {alunosDaTurma.length > 0 ? (
                  alunosDaTurma.map((aluno) => (
                    <div
                      key={aluno.id_aluno}
                      className="flex align-items-center justify-content-between p-2 student-list-item border-round transition-colors"
                    >
                      <div className="flex flex-column">
                        <span className="text-sm font-semibold text-800">
                          {aluno.nome}
                        </span>
                        {aluno.telefone && (
                          <span className="text-xs text-500">
                            {aluno.telefone}
                          </span>
                        )}
                      </div>
                      <Button
                        icon="pi pi-trash"
                        onClick={() => gerenciarDesvinculoAluno(aluno.id_aluno)}
                        className="p-button-rounded p-button-danger p-button-text p-button-sm"
                        tooltip="Remover Aluno"
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-center text-400 py-4 text-xs border-2 border-dashed border-round">
                    Nenhum aluno cadastrado nesta turma.
                  </div>
                )}
              </div>
            </div>

            <div className="border-top-1 surface-border pt-3 mt-2 flex justify-content-end">
              <div className="flex gap-2">
                {(() => {
                  const eHojeADiaDaTurma =
                    turmaSelecionada &&
                    diaAtualId === Number(turmaSelecionada.diaSemana);
                  return (
                    <Button
                      label="Ir para Chamada"
                      icon="pi pi-check-square"
                      className="p-button-sm p-button-success"
                      disabled={!eHojeADiaDaTurma}
                      tooltip={
                        !eHojeADiaDaTurma
                          ? "Chamada disponível somente no dia da aula"
                          : "Abrir registro de chamada"
                      }
                      tooltipOptions={{ position: "top" }}
                      onClick={() => {
                        setModalDetalhesVisible(false);
                        navigate(
                          `/Presenca?turma=${turmaSelecionada.id_turma}`,
                        );
                      }}
                    />
                  );
                })()}
                <Button
                  label="Fechar Janela"
                  onClick={() => setModalDetalhesVisible(false)}
                  className="p-button-secondary p-button-sm"
                />
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
