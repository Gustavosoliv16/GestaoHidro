import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { addLocale, locale } from 'primereact/api';


addLocale('pt-BR', {
    firstDayOfWeek: 1,
    dayNames: ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'],
    dayNamesShort: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
    dayNamesMin: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
    monthNamesShort: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
    today: 'Hoje',
    clear: 'Limpar'
});
locale('pt-BR');

interface CalendarioLateralProps {
    dataSelecionada: Date | null;
    aoMudarData: (data: Date) => void;
}

export default function CalendarioLateral({ dataSelecionada, aoMudarData }: CalendarioLateralProps) {

const opcoesHoras = Array.from({ length: 18 }, (_, i) => {
    const hora = i + 6; // Começa em 6
    const horaFormatada = hora.toString().padStart(2, '0');
    return { label: `${horaFormatada} h`, value: hora };
});
    const opcoesMinutos = Array.from({ length: 60 }, (_, i) => {
        const minutoCalculado = i * 1;
        const minutoFormatado = minutoCalculado.toString();
        return { label: `${minutoFormatado} min`, value: minutoCalculado };
    });

 
    const horaDoEstado = dataSelecionada ? dataSelecionada.getHours() : 6;
const horaAtual = horaDoEstado < 6 ? 6 : horaDoEstado;

const minutoAtual = dataSelecionada ? dataSelecionada.getMinutes() : 0;

   
    const aoMudarHora = (novaHora: number) => {
        if (dataSelecionada) {
            const novaData = new Date(dataSelecionada);
            novaData.setHours(novaHora);
            aoMudarData(novaData);
        }
    };

    const aoMudarMinuto = (novoMinuto: number) => {
        if (dataSelecionada) {
            const novaData = new Date(dataSelecionada);
            novaData.setMinutes(novoMinuto);
            aoMudarData(novaData);
        }
    };

    const aoMudarDiaCalendario = (e: any) => {
        if (e.value) {
            const novaData = new Date(e.value);
            novaData.setHours(horaAtual);
            novaData.setMinutes(minutoAtual);
            aoMudarData(novaData);
        }
    };

    return (
        <div className="card shadow-2 p-3 bg-white" style={{ borderRadius: '1rem' }}>
           
            <Calendar 
                value={dataSelecionada} 
                onChange={aoMudarDiaCalendario} 
                inline
                locale="pt-BR" 
                dateFormat="dd/mm/yy"
                className="w-full custom-calendar" 
                style={{ width: '100%' }}
            />
            
            <hr className="border-top-1 border-200 my-3" />

     
            <div className="flex flex-column gap-2 px-1">
                <label className="font-bold text-sm text-bluegray-600 flex align-items-center gap-1">
                    <i className="pi pi-clock text-primary"></i> Selecione o Horário
                </label>
                
                <div className="flex align-items-center gap-2">
                  
                    <div className="flex-1">
                        <Dropdown 
                            value={horaAtual} 
                            options={opcoesHoras} 
                            onChange={(e) => aoMudarHora(e.value)} 
                            placeholder="Hora"
                            className="w-full text-center"
                            scrollHeight="200px"
                        />
                    </div>
                    
                    <span className="font-bold text-xl text-400">:</span>

                    <div className="flex-1">
                        <Dropdown 
                            value={minutoAtual} 
                            options={opcoesMinutos} 
                            onChange={(e) => aoMudarMinuto(e.value)} 
                            placeholder="Minuto"
                            className="w-full text-center"
                            scrollHeight="200px"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}