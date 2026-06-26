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
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import Database from "@tauri-apps/plugin-sql";

import {
  buscarTodasTurmas,
  criarTurma,
  editarTurma,
  excluirTurma,
  buscarAlunosDaTurma,
  vincularAlunoTurma,
  desvincularAlunoTurma,
  verificarConflitoDeTurma,
} from "../../services/TurmaService";
import { buscarTodosAlunos } from "../../services/AlunoService";

const FORM_VAZIO = {
  diaSemana: 0,
  horarioInicio: 8,
  horarioFim: 9,
  idModalidade: null as number | null,
  capacidadeMaxima: 6,
  alunosIds: [] as number[],
};

const diasSemanaOptions = [
  { label: "Segunda-feira", value: 0 },
  { label: "Terça-feira", value: 1 },
  { label: "Quarta-feira", value: 2 },
  { label: "Quinta-feira", value: 3 },
  { label: "Sexta-feira", value: 4 },
  { label: "Sábado", value: 5 },
];

export default function Turmas() {
  const toast = useRef<Toast>(null);

  const [turmas, setTurmas] = useState<any[]>([]);
  const [modalidades, setModalidades] = useState<any[]>([]);
  const [todosAlunos, setTodosAlunos] = useState<any[]>([]);
  const [alunosDaTurma, setAlunosDaTurma] = useState<any[]>([]);

  const [modalFormVisible, setModalFormVisible] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [turmaEmEdicao, setTurmaEmEdicao] = useState<any | null>(null);
  const [form, setForm] = useState({ ...FORM_VAZIO });

  const [modalAlunosVisible, setModalAlunosVisible] = useState(false);
  const [turmaSelecionada, setTurmaSelecionada] = useState<any | null>(null);
  const [alunoParaAdicionar, setAlunoParaAdicionar] = useState<number | null>(
    null,
  );
  const carregar = async () => {
    try {
      const [listaTurmas, listaAlunos] = await Promise.all([
        buscarTodasTurmas(),
        buscarTodosAlunos(),
      ]);
      setTurmas(listaTurmas);
      setTodosAlunos(listaAlunos);

      const db = await Database.load("sqlite:gestao_hidro.db");
      const mods: any[] = await db.select(
        "SELECT id_modalidade, modalidade FROM MODALIDADE ORDER BY modalidade ASC",
      );
      setModalidades(mods);
    } catch (err) {
      console.error("Erro ao carregar turmas:", err);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const abrirCriar = () => {
    setModoEdicao(false);
    setTurmaEmEdicao(null);
    setForm({ ...FORM_VAZIO });
    setModalFormVisible(true);
  };

  const abrirEditar = (turma: any) => {
    setModoEdicao(true);
    setTurmaEmEdicao(turma);
    setForm({
      diaSemana: Number(turma.diaSemana),
      horarioInicio: Number(turma.horarioInicio),
      horarioFim: Number(turma.horarioFim),
      idModalidade: turma.id_modalidade ?? null,
      capacidadeMaxima: Number(turma.capacidadeMaxima),
      alunosIds: [],
    });
    setModalFormVisible(true);
  };

  const abrirGerenciarAlunos = async (turma: any) => {
    setTurmaSelecionada(turma);
    setAlunoParaAdicionar(null);
    const alunos = await buscarAlunosDaTurma(turma.id_turma);
    setAlunosDaTurma(alunos);
    setModalAlunosVisible(true);
  };

  const handleSalvar = async () => {
    if (!form.idModalidade) {
      toast.current?.show({
        severity: "warn",
        summary: "Aviso",
        detail: "Selecione a Modalidade!",
      });
      return;
    }
    if (form.horarioFim <= form.horarioInicio) {
      toast.current?.show({
        severity: "error",
        summary: "Erro",
        detail: "O horário de fim deve ser maior que o início.",
      });
      return;
    }

    const conflito = await verificarConflitoDeTurma(
      form.diaSemana,
      form.horarioInicio,
      modoEdicao ? turmaEmEdicao?.id_turma : undefined,
    );
    if (conflito) {
      toast.current?.show({
        severity: "error",
        summary: "Conflito de horário",
        detail: `Já existe uma turma às ${String(form.horarioInicio).padStart(2, "0")}h neste dia da semana.`,
        life: 5000,
      });
      return;
    }

    try {
      if (modoEdicao && turmaEmEdicao) {
        await editarTurma(turmaEmEdicao.id_turma, {
          diaSemana: form.diaSemana,
          horarioInicio: form.horarioInicio,
          horarioFim: form.horarioFim,
          idModalidade: form.idModalidade,
          capacidadeMaxima: form.capacidadeMaxima,
        });
        toast.current?.show({
          severity: "success",
          summary: "Atualizado",
          detail: "Turma atualizada com sucesso!",
        });
      } else {
        const resultado = await criarTurma({
          diaSemana: form.diaSemana,
          horarioInicio: form.horarioInicio,
          horarioFim: form.horarioFim,
          idModalidade: form.idModalidade,
          capacidadeMaxima: form.capacidadeMaxima,
        });
        if (form.alunosIds.length > 0 && resultado?.idTurma) {
          for (const idAluno of form.alunosIds) {
            await vincularAlunoTurma(idAluno, resultado.idTurma);
          }
        }
        toast.current?.show({
          severity: "success",
          summary: "Criado",
          detail: "Turma criada com sucesso!",
        });
      }
      setModalFormVisible(false);
      carregar();
    } catch {
      toast.current?.show({
        severity: "error",
        summary: "Erro",
        detail: "Falha ao salvar a turma.",
      });
    }
  };

  const confirmarExclusao = (turma: any) => {
    confirmDialog({
      message: `Excluir a turma de ${turma.modalidade} (${String(turma.horarioInicio).padStart(2, "0")}h)?
Todos os vínculos com alunos serão removidos.`,
      header: "Confirmar exclusão",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      acceptLabel: "Excluir",
      rejectLabel: "Cancelar",
      accept: async () => {
        await excluirTurma(turma.id_turma);
        toast.current?.show({
          severity: "info",
          summary: "Excluída",
          detail: "Turma removida.",
        });
        carregar();
      },
    });
  };

  const handleAdicionarAluno = async () => {
    if (!alunoParaAdicionar || !turmaSelecionada) return;
    const resp = await vincularAlunoTurma(
      alunoParaAdicionar,
      turmaSelecionada.id_turma,
    );
    if (resp.sucesso) {
      toast.current?.show({
        severity: "success",
        summary: "Matriculado",
        detail: resp.mensagem,
      });
      setAlunosDaTurma(await buscarAlunosDaTurma(turmaSelecionada.id_turma));
      setAlunoParaAdicionar(null);
      carregar();
    } else {
      toast.current?.show({
        severity: "warn",
        summary: "Atenção",
        detail: resp.mensagem,
      });
    }
  };

  const handleRemoverAluno = async (idAluno: number) => {
    if (!turmaSelecionada) return;
    await desvincularAlunoTurma(idAluno, turmaSelecionada.id_turma);
    toast.current?.show({
      severity: "info",
      summary: "Removido",
      detail: "Aluno removido da turma.",
    });
    setAlunosDaTurma(await buscarAlunosDaTurma(turmaSelecionada.id_turma));
    carregar();
  };

  const formatarDia = (row: any) =>
    diasSemanaOptions.find((d) => d.value === Number(row.diaSemana))?.label ??
    "—";

  const formatarHorario = (row: any) =>
    `${String(Math.round(Number(row.horarioInicio))).padStart(2, "0")}h às ${String(Math.round(Number(row.horarioFim))).padStart(2, "0")}h`;

  const templateLotacao = (row: any) => {
    const total = Math.round(Number(row.totalAlunos || 0));
    const max = Math.round(Number(row.capacidadeMaxima || 6));
    return (
      <Tag
        severity={total >= max ? "danger" : "success"}
        value={`${total} / ${max}`}
      />
    );
  };

  const templateAcoes = (row: any) => (
    <div className="flex gap-2">
      <Button
        icon="pi pi-users"
        label="Alunos"
        className="p-button-sm p-button-outlined"
        onClick={() => abrirGerenciarAlunos(row)}
      />
      <Button
        icon="pi pi-pencil"
        className="p-button-sm p-button-warning p-button-outlined"
        tooltip="Editar turma"
        tooltipOptions={{ position: "top" }}
        onClick={() => abrirEditar(row)}
      />
      <Button
        icon="pi pi-trash"
        className="p-button-sm p-button-danger p-button-outlined"
        tooltip="Excluir turma"
        tooltipOptions={{ position: "top" }}
        onClick={() => confirmarExclusao(row)}
      />
    </div>
  );

  return (
    <div className="w-full">
      <Toast ref={toast} />

      <div className="flex align-items-center justify-content-between mb-4">
        <h2 className="text-2xl font-bold m-0 text-900">
          Gerenciamento de Turmas
        </h2>
        <Button
          label="Nova Turma"
          icon="pi pi-plus"
          className="p-button-success"
          onClick={abrirCriar}
        />
      </div>

      <DataTable
        value={turmas}
        rows={10}
        paginator
        emptyMessage="Nenhuma turma cadastrada."
        sortField="diaSemana"
        sortOrder={1}
      >
        <Column
          field="modalidade"
          header="Modalidade"
          sortable
          style={{ fontWeight: "bold" }}
        />
        <Column header="Dia" body={formatarDia} sortable field="diaSemana" />
        <Column
          header="Horário"
          body={formatarHorario}
          sortable
          field="horarioInicio"
        />
        <Column header="Lotação" body={templateLotacao} />
        <Column
          header="Ações"
          body={templateAcoes}
          style={{ width: "16rem" }}
        />
      </DataTable>

      <Dialog
        header={modoEdicao ? "Editar Turma" : "Cadastrar Nova Turma"}
        visible={modalFormVisible}
        style={{ width: "480px" }}
        onHide={() => setModalFormVisible(false)}
        footer={
          <div>
            <Button
              label="Cancelar"
              icon="pi pi-times"
              className="p-button-text"
              onClick={() => setModalFormVisible(false)}
            />
            <Button
              label="Salvar"
              icon="pi pi-check"
              className="p-button-primary"
              onClick={handleSalvar}
            />
          </div>
        }
      >
        <div className="p-fluid grid formgrid pt-2 row-gap-3">
          <div className="field col-12">
            <label className="font-semibold text-sm mb-1 block">
              Dia da Semana
            </label>
            <Dropdown
              appendTo={"self"}
              value={form.diaSemana}
              options={diasSemanaOptions}
              onChange={(e) => setForm({ ...form, diaSemana: e.value })}
            />
          </div>

          <div className="field col-6">
            <label className="font-semibold text-sm mb-1 block">
              Início (Hora)
            </label>
            <InputNumber
              value={form.horarioInicio}
              onValueChange={(e) =>
                setForm({ ...form, horarioInicio: e.value ?? 8 })
              }
              min={7}
              max={20}
              suffix="h"
              showButtons
            />
          </div>

          <div className="field col-6">
            <label className="font-semibold text-sm mb-1 block">
              Fim (Hora)
            </label>
            <InputNumber
              value={form.horarioFim}
              onValueChange={(e) =>
                setForm({ ...form, horarioFim: e.value ?? 9 })
              }
              min={8}
              max={21}
              suffix="h"
              showButtons
            />
          </div>

          <div className="field col-12">
            <label className="font-semibold text-sm mb-1 block">
              Modalidade
            </label>
            <Dropdown
              appendTo={"self"}
              value={form.idModalidade}
              options={modalidades}
              optionLabel="modalidade"
              optionValue="id_modalidade"
              placeholder="Selecione a Modalidade"
              onChange={(e) => setForm({ ...form, idModalidade: e.value })}
            />
          </div>

          <div className="field col-12">
            <label className="font-semibold text-sm mb-1 block">
              Capacidade Máxima
            </label>
            <InputNumber
              value={form.capacidadeMaxima}
              onValueChange={(e) =>
                setForm({ ...form, capacidadeMaxima: e.value || 6 })
              }
              min={1}
              max={50}
              showButtons
            />
          </div>

          {!modoEdicao && (
            <div className="field col-12">
              <label className="font-semibold text-sm mb-1 block">
                Atribuir Alunos Iniciais (Máx. {form.capacidadeMaxima})
              </label>
              <MultiSelect
                appendTo={"self"} 
                value={form.alunosIds}
                options={todosAlunos}
                optionLabel="nome"
                optionValue="id_aluno"
                placeholder="Selecione os alunos"
                filter
                selectionLimit={form.capacidadeMaxima}
                display="chip"
                onChange={(e) => setForm({ ...form, alunosIds: e.value })}
              />
            </div>
          )}
        </div>
      </Dialog>

      <Dialog
        header={
          turmaSelecionada
            ? `Alunos — ${turmaSelecionada.modalidade} (${String(Math.round(Number(turmaSelecionada.horarioInicio))).padStart(2, "0")}h)`
            : "Gerenciar Alunos"
        }
        visible={modalAlunosVisible}
        style={{ width: "550px" }}
        onHide={() => setModalAlunosVisible(false)}
      >
        <div className="flex flex-column gap-4 pt-2">
          <div className="surface-100 p-3 border-round">
            <h4 className="m-0 mb-2 text-sm font-bold text-700">
              Matricular Aluno
            </h4>
            <div className="flex gap-2">
              <Dropdown
                appendTo={document.body}
                value={alunoParaAdicionar}
                options={todosAlunos}
                optionLabel="nome"
                optionValue="id_aluno"
                filter
                placeholder="Selecione um aluno"
                className="flex-grow-1"
                onChange={(e) => setAlunoParaAdicionar(e.value)}
              />
              <Button
                label="Adicionar"
                icon="pi pi-plus"
                className="p-button-success p-button-sm"
                onClick={handleAdicionarAluno}
                disabled={!alunoParaAdicionar}
              />
            </div>
          </div>

          <div>
            <h4 className="m-0 mb-2 text-sm font-bold text-700">
              Alunos Matriculados
            </h4>
            <DataTable
              value={alunosDaTurma}
              emptyMessage="Nenhum aluno matriculado."
              size="small"
            >
              <Column field="nome" header="Nome" />
              <Column
                header=""
                style={{ width: "4rem", textAlign: "center" }}
                body={(row) => (
                  <Button
                    icon="pi pi-trash"
                    className="p-button-danger p-button-text p-button-sm"
                    tooltip="Remover da turma"
                    onClick={() => handleRemoverAluno(row.id_aluno)}
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
