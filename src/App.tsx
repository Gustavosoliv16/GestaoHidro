import { useEffect } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";

import Menutopbar from "../src/components/layout/Menubar";
import Homepage from "../src/pages/Homepage";
import Alunos from "../src/pages/Cadastros";
import Footer from "../src/components/layout/Footer";
import Horarios from "./pages/Horarios";
import Prensenca from "./pages/Presenca";
import Relatorios from "./pages/Relatorios";
import "./App.css";

export default function App() {
  useEffect(() => {
    const isDark = localStorage.getItem("darkMode") === "true";
    if (isDark) {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
  }, []);

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
            <Route path="/Presenca" element={<Prensenca />} />
            <Route path="/Relatorios" element={<Relatorios />} />
          </Routes>
        </main>

        <Footer />
      </HashRouter>
    </div>
  );
}
