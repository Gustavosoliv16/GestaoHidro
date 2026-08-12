import { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";

import Menutopbar    from "../src/components/layout/Menubar";
import Homepage      from "../src/pages/Homepage";
import Alunos        from "../src/pages/Cadastros";
import Footer        from "../src/components/layout/Footer";
import Horarios      from "./pages/Horarios";
import Prensenca     from "./pages/Presenca";
import Relatorios    from "./pages/Relatorios";
import Reposicoes    from "./pages/Reposicoes";
import Configuracoes from "./pages/Configuracoes";
import Login         from "./components/Login";
import ErrorBanner   from "./components/ui/ErrorBanner";
import AtalhoModal   from "./components/ui/AtalhoModal";
import RouteLoading  from "./components/ui/RouteLoading";
import { useKeyboardShortcuts } from "./components/ui/useKeyboardShortcuts";
import { useRouteLoading }      from "./components/ui/useRouteLoading";
import { backupStartup }        from "./services/BackupService";
import { SessionProvider, useSession } from "./contexts/SessionContext";
import { UpdaterProvider } from "./contexts/UpdaterContext";
import { useUpdater } from "./contexts/UpdaterContext";
import ChangelogModal from "./components/ui/ChangelogModal";
import "primereact/resources/themes/saga-blue/theme.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";
import "./App.css";

// ── Guard: só renderiza filhos se há sessão ativa ──────────────────────────
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { logado } = useSession();
  if (!logado) return <Login />;
  return <>{children}</>;
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useSession();
  const { changelogAberto, fecharChangelog } = useUpdater();
  const [atalhoModalVisible, setAtalhoModalVisible] = useState(false);
  const routeLoading = useRouteLoading();

  useEffect(() => {
    const timer = setTimeout(() => {
      backupStartup();
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  useKeyboardShortcuts({
    "ctrl+h": () => navigate("/"),
    "ctrl+n": () => navigate("/alunos"),
    "ctrl+l": () => navigate("/Relatorios"),
    "ctrl+g": () => navigate("/Horarios"),
    "ctrl+?": () => setAtalhoModalVisible(true),
    "ctrl+q": () => {
      confirmDialog({
        message: "Tem certeza que deseja sair do sistema?",
        header: "Confirmar Saída",
        icon: "pi pi-exclamation-triangle",
        acceptLabel: "Sim, sair",
        rejectLabel: "Cancelar",
        acceptClassName: "p-button-danger",
        accept: async () => { await logout(); },
      });
    },
    "esc": () => {
      if (atalhoModalVisible) setAtalhoModalVisible(false);
    },
  });

  return (
    <AuthGuard>
      <ConfirmDialog />
      <RouteLoading loading={routeLoading} />
      <ErrorBanner />
      <Menutopbar />
      <ChangelogModal visible={changelogAberto} onHide={fecharChangelog} />
      <AtalhoModal
        visible={atalhoModalVisible}
        onHide={() => setAtalhoModalVisible(false)}
      />

      <main className="app-main page-transition" key={location.pathname + location.hash}>
        <Routes>
          <Route path="/"              element={<Homepage />} />
          <Route path="/alunos"        element={<Alunos />} />
          <Route path="/Horarios"      element={<Horarios />} />
          <Route path="/Presenca"      element={<Prensenca />} />
          <Route path="/Relatorios"    element={<Relatorios />} />
          <Route path="/Reposicoes"    element={<Reposicoes />} />
          <Route path="/Configuracoes" element={<Configuracoes />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/perfil"        element={<Navigate to="/configuracoes#minha-conta" replace />} />
        </Routes>
      </main>

      <Footer />
    </AuthGuard>
  );
}

export default function App() {
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const theme = saved === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  return (
    <div className="app-shell" style={{ scrollbarGutter: "stable" }}>
        <SessionProvider>
          <UpdaterProvider>
            <HashRouter>
              <AppContent />
            </HashRouter>
          </UpdaterProvider>
        </SessionProvider>
    </div>
  );
}
