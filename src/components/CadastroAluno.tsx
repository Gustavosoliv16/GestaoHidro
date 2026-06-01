import { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Modalidade, Aluno } from './layout/types';

interface NovoAlunoModalProps {
    visivel: boolean;
    aoFechar: () => void;
    aoSalvar: (novoAluno: Aluno) => void;
}

export default function NovoAlunoModal({ visivel, aoFechar, aoSalvar }: NovoAlunoModalProps) {
    const [nome, setNome] = useState('');
    const [telefone, setTelefone] = useState('');
    const [modalidade, setModalidade] = useState<Modalidade | null>(null);
    const [diaVencimento, setDiaVencimento] = useState<number | null>(5);
    const [valorMensalidade, setValorMensalidade] = useState<number | null>(200);

    const opcoesModalidades = [
        { label: 'Natação Infantil', value: 'Natação Infantil' },
        { label: 'Natação Adulto', value: 'Natação Adulto' },
        { label: 'Fisioterapia', value: 'Fisioterapia' },
        { label: 'Hidroginástica', value: 'Hidroginástica' }
    ];

    const lidarComSalvar = () => {
        if (!nome || !modalidade || !diaVencimento) {
            alert("Por favor, preencha o Nome, Modalidade e o Dia de Vencimento.");
            return;
        }

        const novoAluno: Aluno = {
            id: Date.now(),
            nome,
            telefone,
            modalidade,
            diaVencimento,
            valorMensalidade: valorMensalidade || 0,
            horariosFixos: [
                { diaSemana: 2, hora: '08:00' },
                { diaSemana: 4, hora: '08:00' } 
            ]
        };

        aoSalvar(novoAluno);
        aoFechar();
    };

    return (
        <Dialog header="Cadastrar Novo Aluno" visible={visivel} style={{ width: '450px' }} modal onHide={aoFechar}>
            <div className="flex flex-column gap-3 mt-2">
                
                <div className="flex flex-column gap-1">
                    <label htmlFor="nome" className="font-bold text-sm text-600">Nome Completo</label>
                    <InputText id="nome" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full" />
                </div>

                <div className="flex flex-column gap-1">
                    <label htmlFor="tel" className="font-bold text-sm text-600">Telefone de Contato</label>
                    <InputText id="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} className="w-full" />
                </div>

                <div className="flex flex-column gap-1">
                    <label className="font-bold text-sm text-600">Modalidade Contratada</label>
                    <Dropdown 
                        value={modalidade} 
                        options={opcoesModalidades} 
                        onChange={(e) => setModalidade(e.value)} 
                        placeholder="Selecione a modalidade"
                        className="w-full"
                    />
                </div>

                <div className="grid">
                    <div className="col-6 flex flex-column gap-1">
                        <label className="font-bold text-sm text-600">Dia do Vencimento</label>
                        <InputNumber 
                            value={diaVencimento} 
                            onValueChange={(e) => setDiaVencimento(e.value ?? null)} 
                            min={1} max={28} 
                            suffix=" (Todo mês)"
                            className="w-full"
                        />
                    </div>
                    
                    <div className="col-6 flex flex-column gap-1">
                        <label className="font-bold text-sm text-600">Valor da Mensalidade</label>
                        <InputNumber 
                            value={valorMensalidade} 
                            onValueChange={(e) => setValorMensalidade(e.value ?? null)}
                            mode="currency" 
                            currency="BRL" 
                            locale="pt-BR"
                            className="w-full"
                        />
                    </div>
                </div>

                <div className="flex justify-content-end gap-2 mt-3">
                    <Button label="Cancelar" icon="pi pi-times" className="p-button-text p-button-secondary" onClick={aoFechar} />
                    <Button label="Salvar Matrícula" icon="pi pi-check" className="p-button-success" onClick={lidarComSalvar} />
                </div>
            </div>
        </Dialog>
    );
}