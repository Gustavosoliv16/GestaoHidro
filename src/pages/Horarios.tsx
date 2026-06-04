import { useEffect, useState } from "react";
import Database from "@tauri-apps/plugin-sql"; 

interface Modalidade {
  id_modalidade: number;
  modalidade: string;
}

interface Turma {
  id_turma: number;
  dia_semana: string;
  horario_inicio: string;
  horario_fim: string;
  id_modalidade: number;
  modalidade?: string;
  capacidade_maxima: number;
}

const DIAS_SEMANA = [
  { id: "segunda", label: "Segunda-feira" },
  { id: "terca", label: "Terça-feira" },
  { id: "quarta", label: "Quarta-feira" },
  { id: "quinta", label: "Quinta-feira" },
  { id: "sexta", label: "Sexta-feira" },
  { id: "sabado", label: "Sábado" },
  { id: "domingo", label: "Domingo" },
];

export default function Horarios() {

  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  

  const [diaSemana, setDiaSemana] = useState("segunda");
  const [horarioInicio, setHorarioInicio] = useState("");
  const [horarioFim, setHorarioFim] = useState("");
  const [idModalidade, setIdModalidade] = useState("");
  const [capacidade, setCapacidade] = useState(6);

  const carregarDados = async () => {
    try {
      const db = await Database.load("sqlite:gestao_hidro.db");
      
      const listaModalidades = await db.select<Modalidade[]>(
        "SELECT id_modalidade, modalidade FROM MODALIDADE ORDER BY modalidade"
      );
      setModalidades(listaModalidades);

      const listaTurmas = await db.select<Turma[]>(
        `SELECT T.*, M.modalidade 
         FROM TURMAS T
         LEFT JOIN MODALIDADE M ON T.id_modalidade = M.id_modalidade
         ORDER BY T.horario_inicio ASC`
      );
      setTurmas(listaTurmas);
    } catch (error) {
      console.error("Erro ao carregar dados do banco:", error);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);


  const handleSalvarTurma = async (e: React.SubmitEvent) => {
    e.preventDefault();

    if (!horarioInicio || !horarioFim || !idModalidade) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    try {
      const db = await Database.load("sqlite:gestao_hidro.db");
      
      await db.execute(
        `INSERT INTO TURMAS (dia_semana, horario_inicio, horario_fim, id_modalidade, capacidade_maxima) 
         VALUES ($1, $2, $3, $4, $5)`,
        [diaSemana, horarioInicio, horarioFim, parseInt(idModalidade), capacidade]
      );

      setHorarioInicio("");
      setHorarioFim("");
      carregarDados();
      alert("Turma / Horário criado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar turma:", error);
      alert("Erro ao salvar no banco de dados.");
    }
  };

  const handleExcluirTurma = async (id_turma: number) => {
    if (!confirm("Deseja realmente excluir esta turma? Isso não apagará agendas passadas.")) return;

    try {
      const db = await Database.load("sqlite:gestao_hidro.db");
      await db.execute("DELETE FROM TURMAS WHERE id_turma = $1", [id_turma]);
      carregarDados();
    } catch (error) {
      console.error("Erro ao excluir turma:", error);
      alert("Não foi possível excluir. Verifique se existem dependências.");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Configuração da Grade Horária Semanal</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  
        <div className="bg-white p-5 rounded-lg shadow-md border border-slate-200 h-fit">
          <h2 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">Nova Turma (Horário Fixo)</h2>
          
          <form onSubmit={handleSalvarTurma} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Dia da Semana</label>
              <select 
                className="w-full p-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={diaSemana}
                onChange={(e) => setDiaSemana(e.target.value)}
              >
                {DIAS_SEMANA.map(dia => (
                  <option key={dia.id} value={dia.id}>{dia.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Início</label>
                <input 
                  type="time" 
                  className="w-full p-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={horarioInicio}
                  onChange={(e) => setHorarioInicio(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Término</label>
                <input 
                  type="time" 
                  className="w-full p-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={horarioFim}
                  onChange={(e) => setHorarioFim(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Modalidade</label>
              <select 
                className="w-full p-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={idModalidade}
                onChange={(e) => setIdModalidade(e.target.value)}
              >
                <option value="">-- Selecione --</option>
                {modalidades.map(mod => (
                  <option key={mod.id_modalidade} value={mod.id_modalidade}>{mod.modalidade}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Capacidade Máxima (Alunos)</label>
              <input 
                type="number" 
                min="1"
                className="w-full p-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={capacidade}
                onChange={(e) => setCapacidade(parseInt(e.target.value) || 6)}
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium p-2.5 rounded transition mt-2 shadow"
            >
              Adicionar à Grade
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-slate-700 pb-2 border-b">Quadro de Horários Ativos</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DIAS_SEMANA.map((dia) => {
          
              const turmasDoDia = turmas.filter(t => t.dia_semana === dia.id);

              return (
                <div key={dia.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                  <h3 className="font-bold text-blue-900 mb-3 bg-blue-50 p-1.5 px-3 rounded border-l-4 border-blue-600">
                    {dia.label}
                  </h3>
                  
                  {turmasDoDia.length === 0 ? (
                    <p className="text-xs text-slate-400 italic p-2">Nenhum horário cadastrado</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {turmasDoDia.map((turma) => (
                        <div 
                          key={turma.id_turma} 
                          className="flex justify-between items-center bg-slate-50 hover:bg-slate-100 p-2.5 rounded border border-slate-200 text-sm transition"
                        >
                          <div>
                            <span className="font-semibold text-slate-700">
                              {turma.horario_inicio} - {turma.horario_fim}
                            </span>
                            <div className="text-xs text-slate-500">
                              {turma.modalidade} <span className="text-slate-400">({turma.capacidade_maxima} vagas)</span>
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => handleExcluirTurma(turma.id_turma)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition"
                            title="Remover horário"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}