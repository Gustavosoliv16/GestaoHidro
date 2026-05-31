import { HashRouter, Routes, Route } from 'react-router-dom';


import Menutopbar from '../src/components/layout/Menubar';

// Suas telas
import Homepage from '../src/pages/Homepage';
import Alunos from '../src/pages/Alunos';
import Footer from '../src/components/layout/Footer';
import Horarios from './pages/Horarios';

export default function App() {
    return (
        <div className="bg-bluegray-50 min-h-screen w-full m-0 p-0">
            <HashRouter>
                <Menutopbar />
                <main className="p-4 mx-auto" style={{ maxWidth: '1200px' }}>
                    <Routes>
                        <Route path="/" element={<Homepage />} />
                        <Route path="/alunos" element={<Alunos />} />
                        <Route path="/Horarios" element={<Horarios />} />
                    </Routes>
                </main>
                <Footer/>
            </HashRouter>
        </div>
    );
}