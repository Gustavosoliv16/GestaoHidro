import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import NovoAlunoModal from '../components/CadastroAluno';
import EditorMenu from '../components/MenuEditor';
import { useState } from 'react';

export default function TableAlunos() {
    const [visao, setVisao] = useState<'tabela' | 'cadastro'>('tabela');
    const [alunos, setAlunos] = useState<any[]>([]);

    return (
        <div className="card shadow-2 p-3 bg-white flex gap-3 align-items-start">
            <div className="card">

                <EditorMenu aoMudarVisao={setVisao} />
            </div>

            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                
                {visao === 'tabela' ? (
                    <DataTable 
                        className="w-full" 
                        tableStyle={{ width: '100%' }} 
                        sortField="Nome" 
                        sortOrder={-1} 
                        showGridlines 
                        paginator 
                        rows={5} 
                        rowsPerPageOptions={[5, 10, 25, 50]}
                    >
                        <Column field="Nome" sortable header="Nome"></Column>
                        <Column field="Matricula" sortable header="Matrícula"></Column>
                        <Column field="Modalidade" sortable header="Modalidade"></Column>
                        <Column field="Vencimento" sortable header="Vencimento"></Column>
                    </DataTable>
                ) : (

                    <NovoAlunoModal 
                        visivel={true}    
                        aoFechar={() => setVisao('tabela')} 
                        aoSalvar={(novoAluno) => {
                            setAlunos([...alunos, novoAluno]);
                            setVisao('tabela');
                        }}
                    />
                )}
            </div>
        </div>
    );
}