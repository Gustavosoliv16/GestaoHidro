import { HashRouter, Routes, Route } from "react-router-dom";

import Menutopbar from "../src/components/layout/Menubar";
import Homepage from "../src/pages/Homepage";
import Alunos from "../src/pages/Cadastros";
import Footer from "../src/components/layout/Footer";
import Horarios from "./pages/Horarios";

export default function App() {
  return (
    <div
      className="flex flex-column min-h-screen w-full surface-ground"
      style={{ scrollbarGutter: "stable" }}
    >
      <HashRouter>
        <Menutopbar />

        <main className="flex-grow-1 p-4 surface-ground">
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/alunos" element={<Alunos />} />
            <Route path="/Horarios" element={<Horarios />} />
          </Routes>
        </main>

        <Footer />
      </HashRouter>
    </div>
  );
}
