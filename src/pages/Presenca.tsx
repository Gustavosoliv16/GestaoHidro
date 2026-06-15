import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Toast } from "primereact/toast";
import { Tag } from "primereact/tag";
import { Divider } from "primereact/divider";
import { ProgressBar } from "primereact/progressbar";
import { Dropdown } from "primereact/dropdown";
import Database from "@tauri-apps/plugin-sql";

import { buscarTodasTurmas, buscarAlunosDaTurma } from "../services/TurmaService";

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

async function buscarTotalFaltasPorTurma(idTurma: number): Promise<number> {
  const db = await getDb();
  const res: any[] = await db.select(
    `SELECT COUNT(*) as total FROM AGENDA_CALENDARIO WHERE id_turma = $1 AND status = 'FALTOU'`,
    [idTurma]
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


export default function Presenca() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useRef<Toast>(null);

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const todayFormatted = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  const [turmas, setTurmas] = useState<any[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState<any>(null);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [presencas, setPresencas] = useState<Record<number, boolean>>({});
  const [totalFaltas, setTotalFaltas] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    buscarTodasTurmas().then(lista => {
      setTurmas(lista);

      const paramId = searchParams.get("turma");
      if (paramId) {
        const found = lista.find((t: any) => String(t.id_turma) === paramId);
        if (found) setTurmaSelecionada(found);
      }
    });
  }, []);

  useEffect(() => {
    if (!turmaSelecionada) return;
    setLoading(true);
    Promise.all([
      buscarAlunosDaTurma(turmaSelecionada.id_turma),
      buscarPresencasComAlunos(turmaSelecionada.id_turma, today),
      buscarTotalFaltasPorTurma(turmaSelecionada.id_turma),
    ]).then(([listaAlunos, presencasDetalhadas, faltas]) => {
      setAlunos(listaAlunos);
      const map: Record<number, boolean> = {};
      presencasDetalhadas.forEach(p => {
        if (p.present !== null) {
          map[p.id_aluno] = p.present;
        }
      });
      setPresencas(map);
      setTotalFaltas(faltas);
      setLoading(false);
    });
  }, [turmaSelecionada]);

  const alterarPresenca = async (alunoId: number, tipo: "PRESENTE" | "FALTOU") => {
    const estadoAtual = presencas[alunoId]; // true = PRESENTE, false = FALTOU, undefined = PENDENTE
    
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
    } else { // "FALTOU"
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

    await salvarPresenca(turmaSelecionada.id_turma, alunoId, today, novoStatus);
    const faltas = await buscarTotalFaltasPorTurma(turmaSelecionada.id_turma);
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

  const presentes = alunos.filter(a => presencas[a.id_aluno] === true).length;
  const faltantes = alunos.filter(a => presencas[a.id_aluno] === false).length;
  const naoMarcados = alunos.length - presentes - faltantes;
  const percentPresente = alunos.length ? Math.round((presentes / alunos.length) * 100) : 0;

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
        <div>
          <h2 className="text-2xl font-bold m-0 text-900">Registro de Chamada</h2>
          <p className="text-sm text-500 m-0 capitalize">{todayFormatted}</p>
        </div>
      </div>

      <Card className="mb-4 shadow-2">
        <div className="flex flex-column md:flex-row align-items-start md:align-items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs font-bold text-600 uppercase mb-1">Selecionar Turma</label>
            <Dropdown
              value={turmaSelecionada}
              options={turmas}
              onChange={e => setTurmaSelecionada(e.value)}
              optionLabel="modalidade"
              placeholder="Escolha uma turma..."
              className="w-full"
              itemTemplate={opt => (
                <div className="flex align-items-center gap-2">
                  <i className="pi pi-users text-primary" />
                  <span>{opt.modalidade}</span>
                  <Tag value={DIAS[opt.diaSemana] ?? `Dia ${opt.diaSemana}`} severity="info" className="ml-2 text-xs" />
                </div>
              )}
            />
          </div>
          {turmaSelecionada && (
            <div className="flex gap-3">
              <div className="text-center px-3 py-2 border-round" style={{ background: "#f0fdf4", border: "1px solid #22c55e" }}>
                <div className="text-lg font-bold text-green-700">{presentes}</div>
                <div className="text-xs text-green-600">Presentes</div>
              </div>
              <div className="text-center px-3 py-2 border-round" style={{ background: "#fef2f2", border: "1px solid #ef4444" }}>
                <div className="text-lg font-bold text-red-700">{faltantes}</div>
                <div className="text-xs text-red-600">Faltantes</div>
              </div>
              <div className="text-center px-3 py-2 border-round" style={{ background: "#fafafa", border: "1px solid #d1d5db" }}>
                <div className="text-lg font-bold text-gray-700">{naoMarcados}</div>
                <div className="text-xs text-gray-500">Não marcados</div>
              </div>
            </div>
          )}
        </div>

        {turmaSelecionada && (
          <div className="mt-3">
            <div className="flex justify-content-between text-xs text-500 mb-1">
              <span>Presença hoje</span>
              <span>{percentPresente}%</span>
            </div>
            <ProgressBar value={percentPresente} showValue={false} style={{ height: "6px" }} />
          </div>
        )}
      </Card>

      {turmaSelecionada && (
        <Card className="shadow-2">
          <div className="flex justify-content-between align-items-center mb-3 px-2">
            <span className="font-bold text-800">
              <i className="pi pi-users mr-2 text-primary" />
            Alunos Matriculados
            </span>
            <Tag
              value={`Total de faltas acumuladas: ${totalFaltas}`}
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
                      {/* status badge */}
                      {isPresente && <Tag value="Presente" severity="success" icon="pi pi-check" className="text-xs" />}
                      {isFaltante && <Tag value="Faltou" severity="danger" icon="pi pi-times" className="text-xs" />}
                     
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

                      {/* absent checkbox */}
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {!turmaSelecionada && (
        <div className="flex flex-column align-items-center justify-content-center text-center py-6 text-400">
          <i className="pi pi-check-square text-5xl mb-3" style={{ color: "#93c5fd" }} />
          <h3 className="text-700 font-semibold">Selecione uma turma acima</h3>
          <p className="text-sm">para registrar a chamada do dia de hoje.</p>
        </div>
      )}
    </div>
  );
}
