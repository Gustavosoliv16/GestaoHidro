import { useEffect, useState } from "react";
import { HashRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { ConfirmDialog } from "primereact/confirmdialog";
import { useAppUpdater } from "./services/useAppUpdater";

import Menutopbar from "../src/components/layout/Menubar";
import Homepage    from "../src/pages/Homepage";
import Alunos      from "../src/pages/Cadastros";
import Footer      from "../src/components/layout/Footer";
import Horarios    from "./pages/Horarios";
import Prensenca   from "./pages/Presenca";
import Relatorios  from "./pages/Relatorios";
import Reposicoes  from "./pages/Reposicoes";
import Configuracoes from "./pages/Configuracoes";
import ErrorBanner from "./components/ui/ErrorBanner";
import AtalhoModal from "./components/ui/AtalhoModal";
import RouteLoading from "./components/ui/RouteLoading";
import { useKeyboardShortcuts } from "./components/ui/useKeyboardShortcuts";
import { useRouteLoading } from "./components/ui/useRouteLoading";
import "primereact/resources/themes/saga-blue/theme.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";
import "./App.css";

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [atalhoModalVisible, setAtalhoModalVisible] = useState(false);
  const routeLoading = useRouteLoading();

  // Verifica atualizações do aplicativo
  useAppUpdater();
  
  // Atalhos de teclado globais
  useKeyboardShortcuts({
    "ctrl+h": () => navigate("/"),
    "ctrl+n": () => navigate("/alunos"),
    "ctrl+l": () => navigate("/Relatorios"),
    "ctrl+g": () => navigate("/Horarios"),
    "ctrl+?": () => setAtalhoModalVisible(true),
  });

  return (
    <>
      <ConfirmDialog />
      <RouteLoading loading={routeLoading} />
      <ErrorBanner />
      <Menutopbar />
      <AtalhoModal 
        visible={atalhoModalVisible} 
        onHide={() => setAtalhoModalVisible(false)} 
      />

      <main className="app-main page-transition" key={location.pathname}>
        <Routes>
          <Route path="/"          element={<Homepage />} />
          <Route path="/alunos"    element={<Alunos />} />
          <Route path="/Horarios"  element={<Horarios />} />
          <Route path="/Presenca"  element={<Prensenca />} />
          <Route path="/Relatorios"  element={<Relatorios />} />
          <Route path="/Reposicoes" element={<Reposicoes />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Routes>
      </main>

      <Footer />
    </>
  );
}

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
        <AppContent />
      </HashRouter>
    </div>
  );
}
