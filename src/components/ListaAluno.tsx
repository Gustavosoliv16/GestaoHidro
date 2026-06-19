import { useState, useEffect } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputSwitch } from "primereact/inputswitch";
import { Tag } from "primereact/tag";
import {
  buscarTodosAlunos,
  alternarStatusAluno,
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
    : alunos.filter(a => {
        const nomeBate = a.nome?.toLowerCase().includes(busca.toLowerCase());
        const cpfLimpo = String(a.documento ?? "").replace(/\D/g, "");
        const cpfBate  = cpfLimpo.includes(busca.replace(/\D/g, ""));
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

  const acoesTemplate = (rowData: any) => (
    <div className="flex gap-1 justify-content-center">
      <Button
        icon="pi pi-pencil"
        className="p-button-sm p-button-warning p-button-outlined"
        tooltip="Editar aluno"
        tooltipOptions={{ position: "top" }}
        onClick={() => onEditarAluno(rowData)}
      />
    </div>
  );
  return (
    <div className="card surface-card border-1 surface-border p-0 w-full">
      {/* Barra de busca */}
      <div className="flex align-items-center gap-2 p-3 border-bottom-1 surface-border">
        <IconField iconPosition="left" className="flex-1">
          <InputIcon className="pi pi-search" />
          <InputText
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou CPF..."
            className="w-full"
          />
        </IconField>
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
