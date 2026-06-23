import { useEffect } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";

import Menutopbar from "../src/components/layout/Menubar";
import Homepage    from "../src/pages/Homepage";
import Alunos      from "../src/pages/Cadastros";
import Footer      from "../src/components/layout/Footer";
import Horarios    from "./pages/Horarios";
import Prensenca   from "./pages/Presenca";
import Relatorios  from "./pages/Relatorios";
import Reposicoes  from "./pages/Reposicoes";
import "primereact/resources/themes/saga-blue/theme.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";
import "./App.css";

export default function App() {
  // Sincroniza o atributo data-theme no elemento raiz
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const theme = saved === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  return (
    <div
      className="app-shell"
      style={{ scrollbarGutter: "stable" }}
    >
      <HashRouter>
        <Menutopbar />

        <main className="app-main">
          <Routes>
            <Route path="/"          element={<Homepage />} />
            <Route path="/alunos"    element={<Alunos />} />
            <Route path="/Horarios"  element={<Horarios />} />
            <Route path="/Presenca"  element={<Prensenca />} />
            <Route path="/Relatorios"  element={<Relatorios />} />
            <Route path="/Reposicoes" element={<Reposicoes />} />
          </Routes>
        </main>

        <Footer />
      </HashRouter>
    </div>
  );
}
