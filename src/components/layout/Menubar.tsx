import "primereact/resources/themes/saga-blue/theme.css";
import { Toolbar } from "primereact/toolbar";
import { Tooltip } from "primereact/tooltip";
import React, { useRef, useState } from "react";
import { Menu } from "primereact/menu";
import { useNavigate } from "react-router-dom";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";

export default function Menutopbar() {
  const menuConfig = useRef<Menu>(null);
  const [itemGirando, setItemGirando] = useState(false);
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });

  const toggleDarkMode = () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    localStorage.setItem("darkMode", String(newVal));
    if (newVal) {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
  };

  const itensDoMenu = [
    {
      label: "Gerenciamento",
      items: [
        {
          label: "Configurações",
          icon: "pi pi-sliders-h",
          command: () => navigate("/configuracoes"),
        },
        {
          label: "Minha Conta",
          icon: "pi pi-user",
          command: () => navigate("/perfil"),
        },
        {
          label: darkMode ? "Modo Claro" : "Modo Acessibilidade",
          icon: darkMode ? "pi pi-sun" : "pi pi-moon",
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

  const abrirMenuConfig = (evento: React.MouseEvent<HTMLButtonElement>) => {
    menuConfig.current?.toggle(evento);
    setItemGirando(true);

    setTimeout(() => {
      setItemGirando(false);
    }, 400);
  };

  const startContent = (
    <div className="flex align-items-center gap-2">
      <img
        src="../src/assets/icon.png"
        alt="Image"
        height="40"
        className="mr-2"
      />
    </div>
  );

  const centerContent = (
    <div className="flex flex-wrap align-items-center gap-3">
      <Tooltip target=".button-home" content="Inicio" position="bottom" />
      <Tooltip target=".button-users" content="Cadastros" position="bottom" />
      <Tooltip target=".button-schedules" content="Horarios" position="bottom" />
      <Tooltip target=".button-attendance" content="Chamada" position="bottom" />

      <button
        onClick={() => navigate("/")}
        className="button-home p-link inline-flex justify-content-center align-items-center text-white h-3rem w-3rem border-circle hover:bg-white-alpha-10 transition-all transition-duration-200"
      >
        <i className="pi pi-home text-2xl"></i>
      </button>

      <button
        onClick={() => navigate("/alunos")}
        className="button-users p-link inline-flex justify-content-center align-items-center text-white h-3rem w-3rem border-circle hover:bg-white-alpha-10 transition-all transition-duration-200"
      >
        <i className="pi pi-users text-2xl"></i>
      </button>

      <button
        onClick={() => navigate("/horarios")}
        className="button-schedules p-link inline-flex justify-content-center align-items-center text-white h-3rem w-3rem border-circle hover:bg-white-alpha-10 transition-all transition-duration-200"
      >
        <i className="pi pi-calendar text-2xl"></i>
      </button>
      <button
        onClick={() => navigate("/Presenca")}
        className="button-attendance p-link inline-flex justify-content-center align-items-center text-white h-3rem w-3rem border-circle hover:bg-white-alpha-10 transition-all transition-duration-200"
      >
        <i className="pi pi-check-square text-2xl"></i>
      </button>
    </div>
  );

  const endContent = (
    <div className="flex align-items-center gap-2">
      <Menu model={itensDoMenu} popup ref={menuConfig} id="popup_menu_config" />

      <button
        onClick={abrirMenuConfig}
        className="button-config p-link inline-flex justify-content-center align-items-center text-white h-3rem w-3rem border-circle hover:bg-white-alpha-10 transition-all transition-duration-200"
        aria-controls="popup_menu_config"
        aria-haspopup
      >
        <i className={`pi pi-cog text-2xl ${itemGirando ? "pi-spin" : ""}`}></i>
      </button>
    </div>
  );

  return (
    <Toolbar
      start={startContent}
      center={centerContent}
      end={endContent}
      className="bg-blue-900 shadow-2"
      style={{
        borderRadius: "2rem",
        backgroundImage:
          "linear-gradient(to right, var(--blue-500), var(--blue-800))",
      }}
    />
  );
}
