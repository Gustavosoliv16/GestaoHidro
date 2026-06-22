import React, { useRef, useState } from "react";
import { Toolbar } from "primereact/toolbar";
import { Tooltip } from "primereact/tooltip";
import { Menu } from "primereact/menu";
import { useNavigate } from "react-router-dom";
import {
  logoBranco,
  gotaBranca,
} from "../../assets/brand";

function NavBtn({
  id,
  tooltip,
  onClick,
  children,
}: {
  id: string;
  tooltip: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <Tooltip target={`.${id}`} content={tooltip} position="bottom" />
      <button
        onClick={onClick}
        className={`${id} p-link inline-flex justify-content-center align-items-center text-white h-3rem w-3rem border-circle transition-all transition-duration-200`}
        style={{ borderRadius: "50%", background: "transparent", border: "none", cursor: "pointer" }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        {children}
      </button>
    </>
  );
}

export default function Menutopbar() {
  const menuConfig = useRef<Menu>(null);
  const [itemGirando, setItemGirando] = useState(false);
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");

  const toggleDarkMode = () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    const theme = newVal ? "dark" : "light";
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  };

  const itensDoMenu = [
    {
      label: "Gerenciamento",
      items: [
        { label: "Configurações",   icon: "pi pi-sliders-h", command: () => navigate("/configuracoes") },
        { label: "Minha Conta",     icon: "pi pi-user",      command: () => navigate("/perfil") },
        {
          label: darkMode ? "Modo Claro" : "Modo Escuro",
          icon:  darkMode ? "pi pi-sun"  : "pi pi-moon",
          command: toggleDarkMode,
        },
        {
          label: "Sair do Sistema",
          icon: "pi pi-power-off",
          className: "text-red-500",
          command: () => alert("Saindo..."),
        },
      ],
    },
  ];

  // ── Conteúdo da barra ─────────────────────────────────────────────────────

  // Logo completo branco (texto + gota) para o fundo teal
  const startContent = (
    <div className="flex align-items-center px-2">
      <img
        src={logoBranco}
        alt="HydroFit"
        style={{ height: 38, objectFit: "contain" }}
      />
    </div>
  );

  const centerContent = (
    <div className="flex align-items-center gap-1">
      <NavBtn id="btn-home"       tooltip="Início"        onClick={() => navigate("/")}>
        <i className="pi pi-home text-2xl" />
      </NavBtn>

      <NavBtn id="btn-alunos"     tooltip="Cadastros"     onClick={() => navigate("/alunos")}>
        <i className="pi pi-users text-2xl" />
      </NavBtn>

      <NavBtn id="btn-horarios"   tooltip="Grade Horária" onClick={() => navigate("/horarios")}>
        <i className="pi pi-calendar text-2xl" />
      </NavBtn>

      <NavBtn id="btn-chamada"    tooltip="Chamada"       onClick={() => navigate("/Presenca")}>
        <i className="pi pi-check-square text-2xl" />
      </NavBtn>

      {/* Ícone de gota da marca para relatórios — identidade visual */}
      <NavBtn id="btn-relatorios" tooltip="Relatórios"    onClick={() => navigate("/Relatorios")}>
        <img
          src={gotaBranca}
          alt="Relatórios"
          style={{ width: 22, height: 26, objectFit: "contain" }}
        />
      </NavBtn>
    </div>
  );

  const endContent = (
    <div className="flex align-items-center gap-2 px-2">
      <Menu model={itensDoMenu} popup ref={menuConfig} id="popup_menu_config" />
      <Tooltip target=".btn-config" content="Configurações" position="bottom" />
      <button
        onClick={e => {
          menuConfig.current?.toggle(e);
          setItemGirando(true);
          setTimeout(() => setItemGirando(false), 400);
        }}
        className="btn-config p-link inline-flex justify-content-center align-items-center text-white h-3rem w-3rem border-circle transition-all"
        style={{ background: "transparent", border: "none", cursor: "pointer", borderRadius: "50%" }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <i className={`pi pi-cog text-2xl ${itemGirando ? "pi-spin" : ""}`} />
      </button>
    </div>
  );

  return (
    <Toolbar
      start={startContent}
      center={centerContent}
      end={endContent}
      style={{ padding: "0.4rem 1rem" }}
    />
  );
}
