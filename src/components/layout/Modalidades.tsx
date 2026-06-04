import { useEffect, useState } from "react";
import Database from "@tauri-apps/plugin-sql";

interface Modalidade {
  id_modalidade: number;
  modalidade: string;
}

export default function Modalidades() {
  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [nomeModalidade, setNomeModalidade] = useState("");

  const carregarModalidades = async () => {
    try {
      const db = await Database.load("sqlite:gestao_hidro.db");
      const resultado = await db.select<Modalidade[]>(
        "SELECT id_modalidade, modalidade FROM MODALIDADE ORDER BY modalidade ASC"
      );
      setModalidades(resultado);
    } catch (error) {
      console.error("Erro ao carregar modalidades:", error);
    }
  };

  useEffect(() => {
    carregarModalidades();
  }, []);

  const handleCriarModalidade = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!nomeModalidade.trim()) {
      alert("Por favor, digite o nome da modalidade.");
      return;
    }

    try {
      const db = await Database.load("sqlite:gestao_hidro.db");
      
      await db.execute(
        "INSERT INTO MODALIDADE (modalidade) VALUES ($1)",
        [nomeModalidade.trim()]
      );

      setNomeModalidade("");
      carregarModalidades(); 
    } catch (error) {
      console.error("Erro ao criar modalidade:", error);
      alert("Erro ao salvar no banco de dados.");
    }
  };

  // Função para deletar uma modalidade
  const handleExcluirModalidade = async (id: number) => {
    if (!confirm("Deseja realmente excluir esta modalidade?")) return;

    try {
      const db = await Database.load("sqlite:gestao_hidro.db");
      
      await db.execute(
        "DELETE FROM MODALIDADE WHERE id_modalidade = $1",
        [id]
      );

      carregarModalidades(); // Atualiza a lista
    } catch (error) {
      console.error("Erro ao excluir modalidade:", error);
      // Caso o SQLite bloqueie a exclusão por ter turmas usando essa modalidade:
      alert("Não foi possível excluir. Certifique-se de que nenhuma turma está usando esta modalidade atualmente.");
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Gerenciar Modalidades</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COLUNA 1: FORMULÁRIO DE CADASTRO */}
        <div className="bg-white p-5 rounded-lg shadow-md border border-slate-200 h-fit">
          <h2 className="text-lg font-semibold text-slate-700 mb-4 pb-2 border-b">Nova Modalidade</h2>
          
          <form onSubmit={handleCriarModalidade} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Nome da Atividade
              </label>
              <input
                type="text"
                placeholder="Ex: Hidroginástica, Pilates..."
                className="w-full p-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={nomeModalidade}
                onChange={(e) => setNomeModalidade(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium p-2 rounded transition shadow text-sm"
            >
              Salvar Modalidade
            </button>
          </form>
        </div>

        {/* COLUNA 2 e 3: LISTAGEM */}
        <div className="md:col-span-2 bg-white p-5 rounded-lg shadow-md border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-700 mb-4 pb-2 border-b">
            Modalidades Cadastradas ({modalidades.length})
          </h2>

          {modalidades.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-4 text-center">
              Nenhuma modalidade cadastrada ainda.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto pr-2">
              {modalidades.map((mod) => (
                <div
                  key={mod.id_modalidade}
                  className="flex justify-between items-center py-3 hover:bg-slate-50 px-2 rounded transition"
                >
                  <span className="font-medium text-slate-700 text-sm">
                    {mod.modalidade}
                  </span>
                  
                  <button
                    onClick={() => handleExcluirModalidade(mod.id_modalidade)}
                    className="text-xs bg-red-50 hover:bg-red-100 text-red-600 p-1.5 px-3 rounded font-medium transition"
                    title="Excluir modalidade"
                  >
                    Excluir
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}