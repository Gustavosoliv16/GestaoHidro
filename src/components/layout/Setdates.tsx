import { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';

interface TabelaHorariosProps {
    dataSelecionada: Date | null;
}

export default function TabelaHorarios({ dataSelecionada }: TabelaHorariosProps) {
    const [horarios, setHorarios] = useState<any[]>([]);

    useEffect(() => {
        // Mock de dados simulando a consulta baseada na data recebida
        const dadosSimulados = [
            { id: 1, hora: '08:00', aluno: 'Carlos Henrique', status: 'Ocupado' },
            { id: 2, hora: '09:00', aluno: 'Ana Maria', status: 'Ocupado' },
            { id: 3, hora: '10:00', aluno: '--', status: 'Disponível' },
            { id: 4, hora: '11:00', aluno: 'Pedro Silva', status: 'Ocupado' },
            { id: 5, hora: '14:00', aluno: '--', status: 'Disponível' },
        ];

        setHorarios(dadosSimulados);
    }, [dataSelecionada]);

    const statusBodyTemplate = (rowData: any) => {
        const severidade = rowData.status === 'Disponível' ? 'success' : 'danger';
        return <Tag value={rowData.status} severity={severidade} />;
    };

    const acoesBodyTemplate = (rowData: any) => {
        if (rowData.status === 'Disponível') {
            return (
                <Button 
                    type="button"
                    icon="pi pi-plus" 
                    className="p-button-rounded p-button-text p-button-success" 
                    onClick={() => alert(`Agendar às ${rowData.hora}`)}
                />
            );
        }
        return (
            <Button 
                type="button"
                icon="pi pi-trash" 
                className="p-button-rounded p-button-text p-button-danger" 
                onClick={() => alert(`Cancelar agendamento`)}
            />
        );
    };

    return (
        <div className="card shadow-2 p-4 bg-white min-h-full" style={{ borderRadius: '1rem' }}>
            <h3 className="m-0 mb-3 text-bluegray-800 flex align-items-center gap-2">
                <i className="pi pi-calendar-clock text-blue-500 text-xl"></i>
                Horários para o dia: {dataSelecionada?.toLocaleDateString('pt-BR')}
            </h3>
            
            <DataTable value={horarios} stripedRows emptyMessage="Nenhum horário para este dia." responsiveLayout="scroll" className="p-datatable-sm">
                <Column field="hora" header="Horário" style={{ width: '15%', fontWeight: 'bold' }} />
                <Column field="aluno" header="Aluno" style={{ width: '50%' }} />
                <Column field="status" header="Status" body={statusBodyTemplate} style={{ width: '20%' }} />
                <Column body={acoesBodyTemplate} exportable={false} style={{ width: '15%', textAlign: 'center' }} />
            </DataTable>
        </div>
    );
}