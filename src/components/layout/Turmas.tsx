import { useState, useEffect, useRef } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { MultiSelect } from "primereact/multiselect"; 
import { Toast } from "primereact/toast";
import { Tag } from "primereact/tag";
import Database from "@tauri-apps/plugin-sql";

import { 
  buscarTodasTurmas, 
  criarTurma, 
  buscarAlunosDaTurma, 
  vincularAlunoTurma, 
  desvincularAlunoTurma 
} from "../../services/TurmaService";
import { buscarTodosAlunos } from "../../services/AlunoService";

export default function Turmas() {
  const toast = useRef<Toast>(null);

  const [turmas, setTurmas] = useState<any[]>([]);
  const [modalidades, setModalidades] = useState<any[]>([]);
  const [todosAlunos, setTodosAlunos] = useState<any[]>([]);
  const [alunosDaTurma, setAlunosDaTurma] = useState<any[]>([]);

  const [modalNovaTurma, setModalNovaTurma] = useState(false);
  const [modalGerenciarAlunos, setModalGerenciarAlunos] = useState(false);
  const [turmaSelecionada, setTurmaSelecionada] = useState<any | null>(null);

  // Estado do formulário incluindo a lista de IDs dos alunos selecionados
  const [novaTurma, setNovaTurma] = useState({
    diaSemana: 0,
    horarioInicio: 8,
    horarioFim: 9,
    idModalidade: null as number | null,
    capacidadeMaxima: 6,
    alunosIds: [] as number[] 
  });
  const [alunoParaAdicionar, setAlunoParaAdicionar] = useState<number | null>(null);

  const diasSemanaOptions = [
    { label: "Segunda-feira", value: 0 },
    { label: "Terça-feira", value: 1 },
    { label: "Quarta-feira", value: 2 },
    { label: "Quinta-feira", value: 3 },
    { label: "Sexta-feira", value: 4 },
    { label: "Sábado", value: 5 },
  ];

  const carregarDadosDoSistema = async () => {
    try {
      const listaTurmas = await buscarTodasTurmas();
      setTurmas(listaTurmas);

      const listaAlunos = await buscarTodosAlunos();
      setTodosAlunos(listaAlunos);

      const db = await Database.load("sqlite:gestao_hidro.db");
      const listaModalidades: any[] = await db.select("SELECT id_modalidade, modalidade FROM MODALIDADE ORDER BY modalidade ASC");
      setModalidades(listaModalidades);
    } catch (error) {
      console.error("Erro ao carregar dados de turmas:", error);
    }
  };

  useEffect(() => {
    carregarDadosDoSistema();
  }, []);

  const abrirGerenciadorAlunos = async (turma: any) => {
    setTurmaSelecionada(turma);
    try {
      const alunos = await buscarAlunosDaTurma(turma.id_turma);
      setAlunosDaTurma(alunos);
      setAlunoParaAdicionar(null);
      setModalGerenciarAlunos(true);
    } catch (error) {
      toast.current?.show({ severity: "error", summary: "Erro", detail: "Não foi possível carregar os alunos da turma." });
    }
  };

  const handleCriarTurma = async () => {
    if (!novaTurma.idModalidade) {
      toast.current?.show({ severity: "warn", summary: "Aviso", detail: "Selecione a Modalidade!" });
      return;
    }

    if (novaTurma.horarioFim <= novaTurma.horarioInicio) {
      toast.current?.show({ severity: "error", summary: "Erro de Horário", detail: "O horário de fim deve ser maior que o início!" });
      return;
    }

    try {
      const resultadoTurma = await criarTurma({
        diaSemana: novaTurma.diaSemana,
        horarioInicio: novaTurma.horarioInicio,
        horarioFim: novaTurma.horarioFim,
        idModalidade: novaTurma.idModalidade,
        capacidadeMaxima: novaTurma.capacidadeMaxima
      });

      if (novaTurma.alunosIds.length > 0 && resultadoTurma?.idTurma) {
        for (const idAluno of novaTurma.alunosIds) {
          await vincularAlunoTurma(idAluno, resultadoTurma.idTurma);
        }
      }

      toast.current?.show({ severity: "success", summary: "Sucesso", detail: "Turma criada e alunos vinculados!" });
      setModalNovaTurma(false);
      setNovaTurma({ diaSemana: 0, horarioInicio: 8, horarioFim: 9, idModalidade: null, capacidadeMaxima: 6, alunosIds: [] });
      carregarDadosDoSistema();
    } catch (error) {
      toast.current?.show({ severity: "error", summary: "Erro", detail: "Erro ao salvar a turma e seus alunos." });
    }
  };

  const handleAdicionarAluno = async () => {
    if (!alunoParaAdicionar || !turmaSelecionada) return;

    const resposta = await vincularAlunoTurma(alunoParaAdicionar, turmaSelecionada.id_turma);

    if (resposta.sucesso) {
      toast.current?.show({ severity: "success", summary: "Sucesso", detail: resposta.mensagem });
      const alunosAtualizados = await buscarAlunosDaTurma(turmaSelecionada.id_turma);
      setAlunosDaTurma(alunosAtualizados);
      setAlunoParaAdicionar(null);
      carregarDadosDoSistema();
    } else {
      toast.current?.show({ severity: "error", summary: "Restrição", detail: resposta.mensagem });
    }
  };

  const handleRemoverAluno = async (idAluno: number) => {
    if (!turmaSelecionada) return;

    await desvincularAlunoTurma(idAluno, turmaSelecionada.id_turma);
    toast.current?.show({ severity: "info", summary: "Atualizado", detail: "Aluno removido da turma." });
    
    const alunosAtualizados = await buscarAlunosDaTurma(turmaSelecionada.id_turma);
    setAlunosDaTurma(alunosAtualizados);
    carregarDadosDoSistema();
  };

  const formatarDiaSemana = (rowData: any) => {
    const dia = diasSemanaOptions.find(d => d.value === Number(rowData.diaSemana));
    return dia ? dia.label : "Não definido";
  };

  const formatarHorario = (rowData: any) => {
    const inicio = String(Math.round(Number(rowData.horarioInicio))).padStart(2, '0');
    const fim = String(Math.round(Number(rowData.horarioFim))).padStart(2, '0');
    return `${inicio}h às ${fim}h`;
  };

  const templateLotacao = (rowData: any) => {
    const total = Math.round(Number(rowData.totalAlunos || 0));
    const max = Math.round(Number(rowData.capacidadeMaxima || 6));
    const cheia = total >= max;
    return (
      <Tag severity={cheia ? "danger" : "success"} value={`${total} / ${max} Alunos`} />
    );
  };

  const templateAcoes = (rowData: any) => {
    return (
      <Button 
        icon="pi pi-users" 
        label="Gerenciar Alunos" 
        className="p-button-sm p-button-outlined" 
        onClick={() => abrirGerenciadorAlunos(rowData)} 
      />
    );
  };

  return (
    <div className="w-full">
      <Toast ref={toast} />
      
      <div className="flex align-items-center justify-content-between mb-4">
        <h2 className="text-2xl font-bold m-0 text-900">Gerenciamento de Turmas</h2>
        <Button 
          label="Nova Turma" 
          icon="pi pi-plus" 
          className="p-button-success" 
          onClick={() => setModalNovaTurma(true)} 
        />
      </div>

      <DataTable value={turmas} rows={10} paginator responsiveLayout="scroll" emptyMessage="Nenhuma turma cadastrada.">
        <Column field="modalidade" header="Modalidade" sortable style={{ fontWeight: 'bold' }} />
        <Column header="Dia da Semana" body={formatarDiaSemana} sortable />
        <Column header="Horário" body={formatarHorario} sortable field="horarioInicio" />
        <Column header="Ocupação / Limite" body={templateLotacao} sortable />
        <Column header="Ações" body={templateAcoes} style={{ width: '12rem' }} />
      </DataTable>

      {/* MODAL 1: CRIAR NOVA TURMA (LARGURA FIXADA EM 480PX E GRID CORRIGIDO) */}
      <Dialog 
        header="Cadastrar Nova Turma" 
        visible={modalNovaTurma} 
        style={{ width: '480px' }} 
        onHide={() => setModalNovaTurma(false)}
        footer={
          <div>
            <Button label="Cancelar" icon="pi pi-times" className="p-button-text" onClick={() => setModalNovaTurma(false)} />
            <Button label="Salvar" icon="pi pi-check" className="p-button-primary" onClick={handleCriarTurma} />
          </div>
        }
      >
        {/* p-fluid e formgrid grid garantem comportamento fluido perfeito */}
        <div className="p-fluid grid formgrid pt-2 row-gap-3">
          
          <div className="field col-12">
            <label htmlFor="dia" className="font-semibold text-sm mb-1 block">Dia da Semana</label>
            <Dropdown id="dia" value={novaTurma.diaSemana} options={diasSemanaOptions} onChange={(e) => setNovaTurma({...novaTurma, diaSemana: e.value})} />
          </div>

          {/* Divisão exata de 50% (col-6) para cada input de hora */}
          <div className="field col-6">
            <label htmlFor="inicio" className="font-semibold text-sm mb-1 block">Início (Hora)</label>
            <InputNumber 
              id="inicio" 
              value={novaTurma.horarioInicio} 
              onValueChange={(e) => setNovaTurma({...novaTurma, horarioInicio: e.value ?? 8})} 
              min={0} 
              max={23} 
              suffix="h"
              showButtons 
            />
          </div>
          
          <div className="field col-6">
            <label htmlFor="fim" className="font-semibold text-sm mb-1 block">Fim (Hora)</label>
            <InputNumber 
              id="fim" 
              value={novaTurma.horarioFim} 
              onValueChange={(e) => setNovaTurma({...novaTurma, horarioFim: e.value ?? 9})} 
              min={0} 
              max={23} 
              suffix="h"
              showButtons 
            />
          </div>

          <div className="field col-12">
            <label htmlFor="mod" className="font-semibold text-sm mb-1 block">Modalidade</label>
            <Dropdown 
              id="mod" 
              value={novaTurma.idModalidade} 
              options={modalidades} 
              optionLabel="modalidade" 
              optionValue="id_modalidade" 
              placeholder="Selecione a Modalidade"
              onChange={(e) => setNovaTurma({...novaTurma, idModalidade: e.value})} 
            />
          </div>

          <div className="field col-12">
            <label htmlFor="cap" className="font-semibold text-sm mb-1 block">Capacidade Máxima de Alunos</label>
            <InputNumber id="cap" value={novaTurma.capacidadeMaxima} onValueChange={(e) => setNovaTurma({...novaTurma, capacidadeMaxima: e.value || 6})} min={1} max={50} showButtons />
          </div>

          {/* Campo solicitado para atribuir os alunos diretamente no cadastro */}
          <div className="field col-12">
            <label htmlFor="alunosCriacao" className="font-semibold text-sm mb-1 block">Atribuir Alunos Iniciais (Máx. {novaTurma.capacidadeMaxima})</label>
            <MultiSelect
              id="alunosCriacao"
              value={novaTurma.alunosIds}
              options={todosAlunos}
              optionLabel="nome"
              optionValue="id_aluno"
              placeholder="Selecione os alunos para esta turma"
              filter
              selectionLimit={novaTurma.capacidadeMaxima}
              display="chip"
              onChange={(e) => setNovaTurma({...novaTurma, alunosIds: e.value})}
            />
          </div>

        </div>
      </Dialog>

      {/* MODAL 2: GERENCIAR ALUNOS DA TURMA */}
      <Dialog 
        header={turmaSelecionada ? `Alunos da Turma: ${turmaSelecionada.modalidade} (${String(Math.round(Number(turmaSelecionada.horarioInicio))).padStart(2, '0')}h)` : "Gerenciar Alunos"} 
        visible={modalGerenciarAlunos} 
        style={{ width: '550px' }} 
        onHide={() => setModalGerenciarAlunos(false)}
      >
        <div className="flex flex-column gap-4 pt-2">
          <div className="surface-100 p-3 border-round">
            <h4 className="m-0 mb-2 text-sm font-bold text-700">Matricular Aluno nesta Turma</h4>
            <div className="flex gap-2">
              <Dropdown 
                value={alunoParaAdicionar} 
                options={todosAlunos} 
                optionLabel="nome" 
                optionValue="id_aluno" 
                filter 
                placeholder="Selecione um Aluno para Adicionar" 
                className="flex-grow-1"
                onChange={(e) => setAlunoParaAdicionar(e.value)}
              />
              <Button label="Adicionar" icon="pi pi-plus" className="p-button-success p-button-sm" onClick={handleAdicionarAluno} disabled={!alunoParaAdicionar} />
            </div>
          </div>

          <div>
            <h4 className="m-0 mb-2 text-sm font-bold text-700">Alunos Matriculados</h4>
            <DataTable value={alunosDaTurma} emptyMessage="Esta turma não possui alunos matriculados." size="small">
              <Column field="nome" header="Nome do Aluno" />
              <Column 
                header="Ações" 
                style={{ width: '4rem', textAlign: 'center' }} 
                body={(rowData) => (
                  <Button 
                    icon="pi pi-trash" 
                    className="p-button-danger p-button-text p-button-sm" 
                    title="Remover da Turma"
                    onClick={() => handleRemoverAluno(rowData.id_aluno)} 
                  />
                )} 
              />
            </DataTable>
          </div>
        </div>
      </Dialog>
    </div>
  );
}