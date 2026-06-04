import { useState, useEffect } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputSwitch } from "primereact/inputswitch";
import { Tag } from "primereact/tag";
import {
  buscarTodosAlunos,
  alternarStatusAluno,
} from "../services/AlunoService";

interface ListaAlunosProps {
  onEditarAluno: (aluno: any) => void;
  refreshTrigger: number;
  mode?: "consultar" | "editar" | "status";
}

export default function ListaAlunos({
  onEditarAluno,
  refreshTrigger,
  mode = "consultar",
}: ListaAlunosProps) {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

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

  const lidarComMudancaStatus = async (aluno: any) => {
    try {
      await alternarStatusAluno(aluno.id_aluno, aluno.ativo ?? 1);
      carregarDadosDoBanco();
    } catch (erro) {
      console.error("Erro ao mudar status:", erro);
    }
  };

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
    <span>{formatPhone(rowData.tel)}</span>
  );
  const documentoTemplate = (rowData: any) => (
    <span>{formatCPF(rowData.documento)}</span>
  );

  const vencimentoTemplate = (rowData: any) => {
    return <span>Dia {rowData.dia_vencimento}</span>;
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

  const acoesTemplate = (rowData: any) => {
    if (mode === "editar") {
      return (
        <Button
          type="button"
          icon="pi pi-pencil"
          className="p-button-rounded p-button-text p-button-info"
          onClick={() => onEditarAluno(rowData)}
        />
      );
    }

    if (mode === "status") {
      const ativo = rowData.ativo !== 0;
      return (
        <Button
          type="button"
          icon={ativo ? "pi pi-toggle-on" : "pi pi-toggle-off"}
          className={`p-button-rounded p-button-text ${ativo ? "p-button-success" : "p-button-secondary"}`}
          onClick={() => lidarComMudancaStatus(rowData)}
        />
      );
    }

    return null;
  };
  return (
    <div className="card surface-card border-1 surface-border p-0 w-full">
      <DataTable
        tableStyle={{ tableLayout: "auto", width: "100%" }}
        value={alunos}
        loading={carregando}
        stripedRows
        paginator
        rows={5}
        emptyMessage="Nenhum aluno encontrado."
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
