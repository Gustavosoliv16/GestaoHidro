import { useState, useEffect } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { buscarHorariosPorDiaSemana } from "../../services/AlunoService";

interface TabelaHorariosProps {
  dataSelecionada: Date | null;
}

export default function TabelaHorarios({
  dataSelecionada,
}: TabelaHorariosProps) {
  const [horarios, setHorarios] = useState<any[]>([]);
  const [carregando, setCarregando] = useState<boolean>(false);

  const gradeHorariosPadrao = [
    "07:00",
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
    "21:00",
  ];

  useEffect(() => {
    async function carregarAgendaDoBanco() {
      if (!dataSelecionada) return;

      setCarregando(true);
      try {
        let diaSemanaNum = dataSelecionada.getDay();
        if (diaSemanaNum === 0) diaSemanaNum = 7;

        const ocupadosNoBanco = await buscarHorariosPorDiaSemana(diaSemanaNum);

        const gradeFinal = gradeHorariosPadrao.map((horaPadrao, index) => {
          const agendamento = ocupadosNoBanco.find(
            (item) => item.horario === horaPadrao,
          );

          if (agendamento) {
            return {
              id: index + 1,
              hora: horaPadrao,
              aluno: agendamento.aluno,
              status: "Ocupado",
            };
          }

          return {
            id: index + 1,
            hora: horaPadrao,
            aluno: "--",
            status: "Disponível",
          };
        });

        setHorarios(gradeFinal);
      } catch (erro) {
        console.error("Erro ao carregar os horários do banco:", erro);
      } finally {
        setCarregando(false);
      }
    }

    carregarAgendaDoBanco();
  }, [dataSelecionada]);

  const statusBodyTemplate = (rowData: any) => {
    const severidade = rowData.status === "Disponível" ? "success" : "danger";
    return <Tag value={rowData.status} severity={severidade} />;
  };

  const acoesBodyTemplate = (rowData: any) => {
    if (rowData.status === "Disponível") {
      return (
        <Button
          type="button"
          icon="pi pi-plus"
          className="p-button-rounded p-button-text p-button-success"
          onClick={() =>
            alert(`Abrir cadastro/vincular para às ${rowData.hora}`)
          }
        />
      );
    }
    return (
      <Button
        type="button"
        icon="pi pi-trash"
        className="p-button-rounded p-button-text p-button-danger"
        onClick={() => alert(`Ação para desvincular ou remover`)}
      />
    );
  };

  return (
    <Card className="surface-card border-1 surface-border p-0">
      <div className="p-4">
        <h3 className="m-0 mb-3 text-900 flex align-items-center gap-2">
          <i className="pi pi-calendar-clock text-primary text-lg"></i>
          Horários para {dataSelecionada?.toLocaleDateString("pt-BR")}
        </h3>

        <DataTable
          value={horarios}
          stripedRows
          loading={carregando}
          emptyMessage="Nenhum horário configurado para este dia."
          className="p-datatable-sm"
        >
          <Column
            field="hora"
            header="Horário"
            style={{ fontWeight: "bold" }}
          />
          <Column field="aluno" header="Aluno" />
          <Column field="status" header="Status" body={statusBodyTemplate} />
          <Column
            body={acoesBodyTemplate}
            exportable={false}
            style={{ textAlign: "center" }}
          />
        </DataTable>
      </div>
    </Card>
  );
}
