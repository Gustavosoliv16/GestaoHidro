import { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { InputMask, InputMaskChangeEvent } from 'primereact/inputmask';
import { salvarAlunoCompleto } from '../services/AlunoService';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Modalidade, Aluno } from './layout/types';

interface NovoAlunoModalProps {
    visivel: boolean;
    aoFechar: () => void;
    aoSalvar: (novoAluno: Aluno) => void;
}

export default function NovoAlunoModal({ aoFechar, aoSalvar }: NovoAlunoModalProps) {

    const [nome, setNome] = useState('');
    const [telefone, setTelefone] = useState('');
    const [nascimento, setNascimento] = useState('');
    const [documento, setDocumento] = useState('');
    const [modalidade, setModalidade] = useState<Modalidade | null>(null);
    const [diaVencimento, setDiaVencimento] = useState<number | null>(5);
    const [valorMensalidade, setValorMensalidade] = useState<number | null>(null);
    const [horariosFixos, setHorariosFixos] = useState<{ diaSemana: number; hora: string }[]>([]);
    const [endereco, setEndereco] = useState('');
    const [numero, setNumero] = useState(''); 
    const [bairro, setBairro] = useState(''); 
    const [cidade, setCidade] = useState(''); 

    const opcoesModalidades = [
        { label: 'Natação Infantil', value: 'Natação Infantil' },
        { label: 'Natação Adulto', value: 'Natação Adulto' },
        { label: 'Fisioterapia', value: 'Fisioterapia' },
        { label: 'Hidroginástica', value: 'Hidroginástica' }
    ];

    const lidarComSalvar = async () => {
        if (!nome || !modalidade || !diaVencimento) {
            alert("Por favor, preencha o Nome, Modalidade e o Dia de Vencimento.");
            return;
        }

        const dadosParaSalvar = {
            nome,
            telefone,
            documento,
            nascimento,
            endereco,
            numero,
            bairro,
            cidade,
            modalidade,
            diaVencimento,
            valorMensalidade: valorMensalidade || 0,
            horariosFixos: horariosFixos
        };

        try {
            await salvarAlunoCompleto(dadosParaSalvar);

            alert("Aluno salvo com sucesso!");

            const novoAluno: Aluno = {
                id: Date.now(), 
                nome,
                telefone,
                modalidade,
                diaVencimento,
                nascimento,
                documento,
                endereco,
                valorMensalidade: valorMensalidade || 0,
                horariosFixos: horariosFixos
            };

            aoSalvar(novoAluno);
            aoFechar();

        } catch (erro) {
            console.error("Erro detalhado ao salvar:", erro);
            alert("Erro ao salvar o aluno no banco de dados.");
        }
    };

    return (
        <div className="flex flex-column gap-3 w-full">
            
            <h1 className="text-2xl text-center font-bold mt-0 text-900">Cadastrar Novo Aluno</h1>
            
            <div className="card shadow-2 p-4 bg-white border-round border-1 surface-border w-full">
                
                <div className="grid formgrid p-fluid">
                    
                    <div className="field col-12 mb-3">
                        <label htmlFor="nome" className="font-bold text-sm text-600 block mb-2">Nome Completo</label>
                        <InputText  id="nome" value={nome} placeholder="Nome completo" onChange={(e) => setNome(e.target.value)} />
                    </div>

                    <div className="field col-12 md:col-6 mb-3">
                        <label htmlFor="tel" className="font-bold text-sm text-600 block mb-2">Telefone de Contato</label>
                        <InputText id="tel" value={telefone} placeholder="(00) 00000-0000" onChange={(e) => setTelefone(e.target.value)} />
                    </div>

                    <div className="field col-12 md:col-6 mb-3">
                        <label htmlFor="documento" className="font-bold text-sm text-600 block mb-2">Documento</label>
                        <InputText id="documento" value={documento} placeholder="000.000.000-00" onChange={(e) => setDocumento(e.target.value)} />
                    </div>

                    <div className="field col-12 md:col-6 mb-3">
                        <label htmlFor="endereco" className="font-bold text-sm text-600 block mb-2">Endereço</label>
                        <InputText id="endereco" value={endereco} placeholder="Endereço completo" onChange={(e) => setEndereco(e.target.value)} />
                    </div>

                    <div className="field col-12 md:col-6 mb-3">
                        <label htmlFor="numero" className="font-bold text-sm text-600 block mb-2">Número</label>
                        <InputText id="numero" value={numero} placeholder="Número" onChange={(e) => setNumero(e.target.value)} />
                    </div>

                    <div className="field col-12 md:col-6 mb-3">
                        <label htmlFor="DataNascimento" className="font-bold text-sm text-600 block mb-2">Data de Nascimento</label>
                        <InputMask value={nascimento} onChange={(e: InputMaskChangeEvent) => setNascimento(e.target.value ?? '')} mask="99/99/9999" placeholder="dd/mm/yyyy" slotChar="dd/mm/yyyy" className="w-full" />
                    </div>

                    <div className="field col-12 md:col-6 mb-3">
                        <label htmlFor="bairro" className="font-bold text-sm text-600 block mb-2">Bairro</label>
                        <InputText id="bairro" value={bairro} placeholder="Bairro" onChange={(e) => setBairro(e.target.value)} />
                    </div>

                    <div className="field col-12 md:col-6 mb-3">
                        <label htmlFor="cidade" className="font-bold text-sm text-600 block mb-2">Cidade</label>
                        <InputText id="cidade" value={cidade} placeholder="Cidade" onChange={(e) => setCidade(e.target.value)} />
                    </div>

                    <div className="field col-12 mb-3">
                        <label className="font-bold text-sm text-600 block mb-2">Modalidade Contratada</label>
                        <Dropdown value={modalidade} options={opcoesModalidades} onChange={(e) => setModalidade(e.value)} placeholder="Selecione a modalidade" />
                    </div>

                    <div className="field col-12 md:col-6 mb-4">
                        <label className="font-bold text-sm text-600 block mb-2">Dia do Vencimento</label>
                        <InputNumber value={diaVencimento} onValueChange={(e) => setDiaVencimento(e.value ?? null)} min={1} max={28} className="w-full" suffix=" (Todo mês)" />
                    </div>
                    
                    <div className="field col-12 md:col-6 mb-4">
                        <label className="font-bold text-sm text-600 block mb-2">Valor da Mensalidade</label>
                        <InputNumber value={valorMensalidade} onValueChange={(e) => setValorMensalidade(e.value ?? null)} mode="currency" currency="BRL" locale="pt-BR" className="w-full" placeholder="R$ 0,00" />
                    </div>
                </div>

                <div className="flex justify-content-end gap-2 border-top-1 surface-border pt-3">
                    <Button label="Cancelar" icon="pi pi-times" className="p-button-text p-button-secondary px-4" onClick={aoFechar} />
                    <Button label="Salvar Matrícula" icon="pi pi-check" className="p-button-success px-4" onClick={lidarComSalvar} />
                </div>
            </div>
        </div>
    );
}