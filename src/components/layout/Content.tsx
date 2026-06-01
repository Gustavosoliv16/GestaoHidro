import 'primereact/resources/themes/saga-blue/theme.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';

export default function Content(){

    return(
        <div className="container" style={{backgroundColor: 'bluegray-50', minHeight: '100vh', minWidth: '100vh' }}>
            <div className="card bg-white shadow-1 border-1 p-4 m-4" style={{ borderRadius: '2rem' }}>
                <h1 className="text-3xl font-bold mb-4">Bem-vindo ao Sistema de Gestão</h1>
                <p className="text-gray-700 mb-4">Este é o conteúdo principal da página. Aqui você pode adicionar gráficos, tabelas, ou qualquer outra informação relevante para o usuário.</p>
                <button className="p-button p-component p-button-outlined">
                    <span className="p-button-label">Saiba Mais</span>
                </button>
            </div>
        </div>
    );
}
