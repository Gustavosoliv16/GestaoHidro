import { useState } from 'react';
import CalendarioLateral from '../components/layout/Calendarmenu';
import TabelaHorarios from '../components/layout/Setdates';

export default function Horarios() {
    const [dataSelecionada, setDataSelecionada] = useState<Date | null>(new Date());

    return (
        <div className="grid p-3 mt-4">

            <div className="col-12 md:col-5 lg:col-5 p-2">
                <CalendarioLateral 
                    dataSelecionada={dataSelecionada} 
                    aoMudarData={setDataSelecionada} 
                />
            </div>

            <div className="col-12 md:col-7 lg:col-7 p-2">
                <TabelaHorarios dataSelecionada={dataSelecionada} />
            </div>
        </div>
    );
}