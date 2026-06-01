export type Modalidade = 'Natação Infantil' | 'Natação Adulto' | 'Fisioterapia' | 'Hidroginástica';

export interface Aluno {
    id: number;
    nome: string;
    telefone: string;
    documento: string;
    nascimento: string;
    modalidade: Modalidade;
    endereco: string;
    diaVencimento: number; 
    valorMensalidade: number; 
    horariosFixos: { diaSemana: number; hora: string }[]; 
}