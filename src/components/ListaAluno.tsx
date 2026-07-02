import { useState, useEffect } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputSwitch } from "primereact/inputswitch";
import { Tag } from "primereact/tag";
import { confirmDialog } from "primereact/confirmdialog";
import {
  buscarTodosAlunos,
  alternarStatusAluno,
  excluirAlunoCompleto,
} from "../services/AlunoService";

interface ListaAlunosProps {
  onEditarAluno: (aluno: any) => void;
  refreshTrigger: number;
}

export default function ListaAlunos({
  onEditarAluno,
  refreshTrigger,
}: ListaAlunosProps) {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState("");

  // Filtra por nome ou CPF (ignora formatação)
  const alunosFiltrados = busca.trim() === ""
  ? alunos
  : alunos.filter((a) => {
      const termo = busca.toLowerCase();
      const termoCpf = busca.replace(/\D/g, "");
      const nomeBate = a.nome?.toLowerCase().includes(termo);
      const cpfLimpo = String(a.documento ?? "").replace(/\D/g, "");
      const cpfBate = termoCpf.length > 0 && cpfLimpo.includes(termoCpf);
      return nomeBate || cpfBate;
    });

  const carregarDadosDoBanco = async () => {
    setCarregando(true);
    try {
      const dados = await buscarTodosAlunos();
      setAlunos(dados);
    } catch (erro) {
      console.error("Erro ao listar alunos:", erro);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDadosDoBanco();
  }, [refreshTrigger]);

  const matriculaTemplate = (rowData: any) => {
    return <span className="font-mono text-gray-600">#{rowData.id_aluno}</span>;
  };

  const formatPhone = (s: any) => {
    const d = s ? String(s).replace(/\D/g, "") : "";
    if (d.length === 11)
      return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    if (d.length === 10)
      return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    return s || "";
  };

  const formatCPF = (s: any) => {
    const d = s ? String(s).replace(/\D/g, "") : "";
    if (d.length === 11)
      return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    return s || "";
  };

  const telefoneTemplate = (rowData: any) => (
    <span>{formatPhone(rowData.telefone)}</span>
  );
  const documentoTemplate = (rowData: any) => (
    <span>{formatCPF(rowData.documento)}</span>
  );

  const vencimentoTemplate = (rowData: any) => {
    const dia = rowData.diaVencimento ? Math.round(Number(rowData.diaVencimento)) : "";
    return <span>Dia {dia}</span>;
  };

  const statusTemplate = (rowData: any) => {
    const isAtivo = rowData.ativo !== 0;
    return (
      <div className="flex align-items-center gap-2">
        <Tag
          value={isAtivo ? "Ativo" : "Inativo"}
          severity={isAtivo ? "success" : "danger"}
        />
        <InputSwitch
          className=""
          checked={isAtivo}
          onChange={async (e) => {
            if (e.originalEvent) {
              e.originalEvent.stopPropagation();
            }

            const novoStatus = isAtivo ? 0 : 1;

            setAlunos((prevAlunos: any[]) =>
              prevAlunos.map((aluno) =>
                aluno.id_aluno === rowData.id_aluno
                  ? { ...aluno, ativo: novoStatus }
                  : aluno,
              ),
            );

            try {
              await alternarStatusAluno(rowData.id_aluno, rowData.ativo ?? 1);
            } catch (err) {
              console.error("Erro ao alternar status no banco:", err);

              setAlunos((prevAlunos: any[]) =>
                prevAlunos.map((aluno) =>
                  aluno.id_aluno === rowData.id_aluno
                    ? { ...aluno, ativo: rowData.ativo }
                    : aluno,
                ),
              );
            }
          }}
        />
      </div>
    );
  };

  const responsavelTemplate = (rowData: any) => {
    if (!rowData.nomeResponsavel) {
      return <span className="text-400 text-xs">—</span>;
    }
    return (
      <div className="flex flex-column">
        <span className="text-sm font-semibold text-800">{rowData.nomeResponsavel}</span>
        {rowData.telefoneResponsavel && (
          <span className="text-xs text-500">{formatPhone(rowData.telefoneResponsavel)}</span>
        )}
      </div>
    );
  };

  const acoesTemplate = (rowData: any) => {
    const confirmarExclusao = (event: React.MouseEvent) => {
      event.stopPropagation();
      confirmDialog({
        message: `Tem certeza que deseja excluir o aluno "${rowData.nome}"? Os históricos de pagamento serão mantidos.`,
        header: "Confirmar exclusão",
        icon: "pi pi-exclamation-triangle",
        acceptLabel: "Sim, excluir",
        rejectLabel: "Cancelar",
        acceptClassName: "p-button-danger",
        accept: async () => {
          try {
            await excluirAlunoCompleto(rowData.id_aluno);
            setAlunos((prev) => prev.filter((a) => a.id_aluno !== rowData.id_aluno));
          } catch (erro) {
            console.error("Erro ao excluir aluno:", erro);
          }
        },
      });
    };

    return (
      <div className="flex gap-1 justify-content-center">
        <Button
          icon="pi pi-pencil"
          className="p-button-sm p-button-warning p-button-outlined"
          tooltip="Editar aluno"
          tooltipOptions={{ position: "top" }}
          onClick={() => onEditarAluno(rowData)}
        />
        <Button
          icon="pi pi-trash"
          className="p-button-sm p-button-danger p-button-outlined"
          tooltip="Excluir aluno"
          tooltipOptions={{ position: "top" }}
          onClick={confirmarExclusao}
        />
      </div>
    );
  };
  return (
    <div className="card surface-card border-1 surface-border p-0 w-full">
      {/* Barra de busca */}
      <div className="flex align-items-center gap-2 p-3 border-bottom-1 surface-border">
        <IconField iconPosition="left" className="flex-1">
          </IconField>
          <InputIcon className="pi pi-search" />
          <div className="p-input-icon-left w-full md:w-auto">
          <InputText
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou CPF..."
            className="w-full md:w-20rem p-inputtext-sm"
          />
        </div>

        {busca && (
          <Button
            icon="pi pi-times"
            className="p-button-text p-button-secondary p-button-sm"
            tooltip="Limpar busca"
            onClick={() => setBusca("")}
          />
        )}
        {busca && (
          <span className="text-xs text-500 white-space-nowrap">
            {alunosFiltrados.length} resultado{alunosFiltrados.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <DataTable
        key={busca}
        tableStyle={{ tableLayout: "auto", width: "100%" }}
        value={alunosFiltrados}
        loading={carregando}
        stripedRows
        paginator
        rows={5}
        emptyMessage={busca ? `Nenhum aluno encontrado para "${busca}".` : "Nenhum aluno encontrado."}
        className="p-datatable-sm"
        scrollable
      >
        <Column
          field="nome"
          header="Nome"
          sortable
          style={{ minWidth: "180px", whiteSpace: "normal" }}
        />
        <Column
          field="telefone"
          header="Telefone"
          body={telefoneTemplate}
          style={{ minWidth: "140px", whiteSpace: "normal" }}
        />
        <Column
          field="documento"
          header="Documento"
          body={documentoTemplate}
          style={{ minWidth: "150px", whiteSpace: "normal" }}
        />
        <Column
          field="id_aluno"
          header="Matrícula"
          sortable
          body={matriculaTemplate}
          style={{ minWidth: "100px" }}
        />
        <Column
          field="modalidade"
          header="Modalidade"
          sortable
          style={{ minWidth: "140px", whiteSpace: "normal" }}
        />
        <Column
          header="Responsável"
          body={responsavelTemplate}
          style={{ minWidth: "160px", whiteSpace: "normal" }}
        />
        <Column
          field="diaVencimento"
          header="Vencimento"
          sortable
          body={vencimentoTemplate}
          style={{ minWidth: "110px" }}
        />
        <Column
          header="Status"
          body={statusTemplate}
          style={{ textAlign: "center", minWidth: "120px" }}
        />
        <Column
          body={acoesTemplate}
          exportable={false}
          style={{ textAlign: "center", minWidth: "80px" }}
        />
      </DataTable>
    </div>
  );
}