import React, { useRef, useState, useEffect } from "react";
import { Toolbar } from "primereact/toolbar";
import { Tooltip } from "primereact/tooltip";
import { confirmDialog } from "primereact/confirmdialog";
import { Toast } from "primereact/toast";
import { useNavigate } from "react-router-dom";
import Database from "@tauri-apps/plugin-sql";
import {
  logoBranco,
  gotaBranca,
} from "../../assets/brand";

interface Vencimento {
  id_aluno: number;
  nome: string;
  mes_referencia: string;
  data_vencimento: string;
  valor: number;
}

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
        className={`${id} p-link inline-flex justify-content-center align-items-center h-3rem w-3rem border-circle transition-all transition-duration-200`}
        style={{ 
          borderRadius: "50%", 
          background: "transparent", 
          border: "none", 
          cursor: "pointer",
          color: "#ffffff",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "rgba(255,255,255,0.2)";
          e.currentTarget.style.color = "#ffffff";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#ffffff";
        }}
      >
        {children}
      </button>
    </>
  );
}

export default function Menutopbar() {
  const [menuAberto, setMenuAberto] = useState(false);
  const [notifAberto, setNotifAberto] = useState(false);
  const [vencimentos, setVencimentos] = useState<Vencimento[]>([]);
  const [naoLidos, setNaoLidos] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const toast = useRef<Toast>(null);
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");

  const toggleDarkMode = () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    const theme = newVal ? "dark" : "light";
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    setMenuAberto(false);
  };

  // Busca mensalidades vencendo nos próximos 5 dias
  const buscarVencimentos = async () => {
    try {
      const db = await Database.load("sqlite:gestao_hidro.db");
      const hoje = new Date();
      const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
      const daqui5dias = new Date(hoje.getTime() + 5 * 24 * 60 * 60 * 1000);
      const limiteStr = `${daqui5dias.getFullYear()}-${String(daqui5dias.getMonth() + 1).padStart(2, '0')}-${String(daqui5dias.getDate()).padStart(2, '0')}`;

      const resultados: any[] = await db.select(`
        SELECT 
          a.id_aluno,
          a.nome,
          m.mes_referencia,
          m.data_vencimento,
          m.valor
        FROM MENSALIDADE m
        JOIN ALUNOS a ON m.id_aluno = a.id_aluno
        WHERE m.status IN ('EM_ABERTO', 'PENDENTE', 'ATRASADO')
          AND m.data_vencimento >= $1
          AND m.data_vencimento <= $2
        ORDER BY m.data_vencimento ASC
      `, [hojeStr, limiteStr]);

      setVencimentos(resultados);

      // Carrega não lidos do localStorage
      const salvos = localStorage.getItem("notif_nao_lidas");
      const setNaoLidosAtual = new Set<string>(salvos ? JSON.parse(salvos) : []);
      
      // Adiciona novos vencimentos como não lidos
      resultados.forEach(v => {
        const key = `${v.id_aluno}_${v.mes_referencia}`;
        setNaoLidosAtual.add(key);
      });
      
      setNaoLidos(setNaoLidosAtual);
      localStorage.setItem("notif_nao_lidas", JSON.stringify([...setNaoLidosAtual]));
    } catch (erro) {
      console.error("Erro ao buscar vencimentos:", erro);
    }
  };

  // Busca vencimentos ao carregar a página
  useEffect(() => {
    buscarVencimentos();

    // Escuta evento de atualização de notificações
    const handleNotifUpdate = () => {
      buscarVencimentos();
    };

    window.addEventListener("notif-update", handleNotifUpdate);
    return () => {
      window.removeEventListener("notif-update", handleNotifUpdate);
    };
  }, []);

  // Marca como lido
  const marcarComoLido = (idAluno: number, mesReferencia: string) => {
    const key = `${idAluno}_${mesReferencia}`;
    const novoSet = new Set(naoLidos);
    novoSet.delete(key);
    setNaoLidos(novoSet);
    localStorage.setItem("notif_nao_lidas", JSON.stringify([...novoSet]));
  };

  // Marca todos como lidos
  const marcarTodosComoLidos = () => {
    setNaoLidos(new Set());
    localStorage.setItem("notif_nao_lidas", JSON.stringify([]));
  };

  // Fecha menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuAberto(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifAberto(false);
      }
    };

    if (menuAberto || notifAberto) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuAberto, notifAberto]);

  const formatarData = (dataSql: string) => {
    const [ano, mes, dia] = dataSql.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const formatarValor = (valor: number) => {
    return `R$ ${valor.toFixed(2).replace(".", ",")}`;
  };

  // Calcula cor por urgência
  const getCorUrgencia = (dataVencimento: string) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const venc = new Date(dataVencimento);
    venc.setHours(0, 0, 0, 0);
    const diffDias = Math.floor((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) return "var(--color-danger)"; // vencido
    if (diffDias === 0) return "var(--color-danger)"; // vence hoje
    if (diffDias === 1) return "var(--color-warning)"; // vence amanhã
    return "var(--color-success)"; // vence em 2+ dias
  };

  const getLabelUrgencia = (dataVencimento: string) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const venc = new Date(dataVencimento);
    venc.setHours(0, 0, 0, 0);
    const diffDias = Math.floor((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) return "Vencido";
    if (diffDias === 0) return "Vence hoje";
    if (diffDias === 1) return "Vence amanhã";
    return `Vence em ${diffDias} dias`;
  };

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

      <NavBtn id="btn-novo-aluno" tooltip="Novo Aluno"    onClick={() => {
        localStorage.setItem('viewAtiva', 'cadastro');
        navigate("/alunos");
      }}>
        <i className="pi pi-user-plus text-2xl" />
      </NavBtn>

      <NavBtn id="btn-pagamentos" tooltip="Pagamentos"    onClick={() => {
        localStorage.setItem('viewAtiva', 'pagamentos');
        navigate("/alunos");
      }}>
        <i className="pi pi-money-bill text-2xl" />
      </NavBtn>

      <NavBtn id="btn-horarios"   tooltip="Grade Horária" onClick={() => navigate("/horarios")}>
        <i className="pi pi-calendar text-2xl" />
      </NavBtn>

      <NavBtn id="btn-chamada"    tooltip="Chamada"       onClick={() => navigate("/Presenca")}>
        <i className="pi pi-check-square text-2xl" />
      </NavBtn>

      <NavBtn id="btn-reposicoes" tooltip="Reposições" onClick={() => navigate("/Reposicoes")}>
        <i className="pi pi-history text-2xl" />
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
      {/* Sino de Notificações */}
      <div style={{ position: "relative" }} ref={notifRef}>
        <Tooltip target=".btn-notif" content="Notificações" position="bottom" />
        <button
          onClick={() => setNotifAberto(!notifAberto)}
          className="btn-notif p-link inline-flex justify-content-center align-items-center h-3rem w-3rem border-circle transition-all"
          style={{ 
            background: notifAberto ? "rgba(255,255,255,0.2)" : "transparent", 
            border: "none", 
            cursor: "pointer", 
            borderRadius: "50%",
            color: "#ffffff",
            position: "relative",
          }}
          onMouseEnter={e => {
            if (!notifAberto) e.currentTarget.style.background = "rgba(255,255,255,0.2)";
          }}
          onMouseLeave={e => {
            if (!notifAberto) e.currentTarget.style.background = "transparent";
          }}
        >
          <i className="pi pi-bell text-2xl" />
          {vencimentos.length > 0 && (
            <span
              style={{
                position: "absolute",
                top: "6px",
                right: "6px",
                background: "var(--color-danger)",
                color: "#fff",
                fontSize: "0.65rem",
                fontWeight: 700,
                minWidth: "18px",
                height: "18px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 4px",
              }}
            >
              {vencimentos.length}
            </span>
          )}
        </button>

        {/* Dropdown de Notificações */}
        {notifAberto && (
          <div
            className="notif-dropdown-custom"
            style={{
              position: "absolute",
              top: "calc(100% + 0.5rem)",
              right: 0,
              width: "320px",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-lg)",
              zIndex: 1000,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "0.75rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--color-text)",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <i className="pi pi-calendar-times" style={{ color: "var(--color-warning)" }} />
                <span>Vencimentos Próximos (5 dias)</span>
              </div>
              {naoLidos.size > 0 && (
                <button
                  onClick={marcarTodosComoLidos}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-cyan-600)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "0.25rem 0.5rem",
                  }}
                  title="Marcar todos como lidos"
                >
                  <i className="pi pi-check" />
                </button>
              )}
            </div>

            {vencimentos.length === 0 ? (
              <div
                style={{
                  padding: "2rem 1rem",
                  textAlign: "center",
                  color: "var(--color-text-secondary)",
                }}
              >
                <i className="pi pi-check-circle" style={{ fontSize: "2rem", color: "var(--color-success)", display: "block", marginBottom: "0.5rem" }} />
                <p style={{ margin: 0, fontSize: "0.875rem" }}>
                  Nenhuma mensalidade vencendo nos próximos 5 dias
                </p>
              </div>
            ) : (
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {vencimentos.map((v, idx) => {
                  const key = `${v.id_aluno}_${v.mes_referencia}`;
                  const isNaoLido = naoLidos.has(key);
                  const corUrgencia = getCorUrgencia(v.data_vencimento);
                  const labelUrgencia = getLabelUrgencia(v.data_vencimento);

                  return (
                    <div
                      key={idx}
                      className="notif-item-custom"
                      style={{
                        padding: "0.75rem 1rem",
                        borderBottom: idx < vencimentos.length - 1 ? "1px solid var(--color-border)" : "none",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                        background: isNaoLido ? "rgba(14, 124, 140, 0.04)" : "transparent",
                      }}
                      onClick={() => {
                        marcarComoLido(v.id_aluno, v.mes_referencia);
                        localStorage.setItem('viewAtiva', 'pagamentos');
                        navigate('/alunos');
                        setNotifAberto(false);
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = "rgba(14, 124, 140, 0.08)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = isNaoLido ? "rgba(14, 124, 140, 0.04)" : "transparent";
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {isNaoLido && (
                            <span
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                background: "var(--color-cyan-600)",
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-text)" }}>
                            {v.nome}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            color: corUrgencia,
                            padding: "0.15rem 0.5rem",
                            borderRadius: "var(--radius-sm)",
                            background: `${corUrgencia}15`,
                          }}
                        >
                          {labelUrgencia}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginLeft: isNaoLido ? "1.25rem" : "0" }}>
                        {formatarData(v.data_vencimento)} • {v.mes_referencia} • {formatarValor(v.valor)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div
              style={{
                padding: "0.5rem 1rem",
                borderTop: "1px solid var(--color-border)",
                textAlign: "center",
              }}
            >
              <button
                onClick={() => {
                  localStorage.setItem('viewAtiva', 'pagamentos');
                  navigate("/alunos");
                  setNotifAberto(false);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-cyan-600)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "0.25rem 0.5rem",
                }}
              >
                Ver todos os alunos →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Engrenagem de Configurações */}
      <div style={{ position: "relative" }} ref={menuRef}>
      <Tooltip target=".btn-config" content="Configurações" position="bottom" />
      <button
        onClick={() => setMenuAberto(!menuAberto)}
        className="btn-config p-link inline-flex justify-content-center align-items-center h-3rem w-3rem border-circle transition-all"
        style={{ 
          background: menuAberto ? "rgba(255,255,255,0.2)" : "transparent", 
          border: "none", 
          cursor: "pointer", 
          borderRadius: "50%",
          color: "#ffffff",
        }}
        onMouseEnter={e => {
          if (!menuAberto) e.currentTarget.style.background = "rgba(255,255,255,0.2)";
        }}
        onMouseLeave={e => {
          if (!menuAberto) e.currentTarget.style.background = "transparent";
        }}
      >
        <i className="pi pi-cog text-2xl" />
      </button>

      {/* Menu Dropdown Custom */}
      {menuAberto && (
        <div
          className="menu-dropdown-custom"
          style={{
            position: "absolute",
            top: "calc(100% + 0.5rem)",
            right: 0,
            minWidth: "220px",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "0.5rem 0.75rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--color-text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            Gerenciamento
          </div>

          <button
            onClick={() => { navigate("/configuracoes"); setMenuAberto(false); }}
            className="menu-item-custom"
          >
            <i className="pi pi-sliders-h" style={{ fontSize: "1rem" }} />
            <span>Configurações</span>
          </button>

          <button
            onClick={() => { navigate("/perfil"); setMenuAberto(false); }}
            className="menu-item-custom"
          >
            <i className="pi pi-user" style={{ fontSize: "1rem" }} />
            <span>Minha Conta</span>
          </button>

          <button
            onClick={toggleDarkMode}
            className="menu-item-custom"
          >
            <i className={`pi ${darkMode ? "pi-sun" : "pi-moon"}`} style={{ fontSize: "1rem" }} />
            <span>{darkMode ? "Modo Claro" : "Modo Escuro"}</span>
          </button>

          <div style={{ borderTop: "1px solid var(--color-border)", margin: "0.25rem 0" }} />

          <button
            onClick={() => {
              confirmDialog({
                message: "Tem certeza que deseja sair do sistema?",
                header: "Confirmar Saída",
                icon: "pi pi-exclamation-triangle",
                acceptLabel: "Sim, sair",
                rejectLabel: "Cancelar",
                acceptClassName: "p-button-danger",
                accept: () => {
                  window.close();
                },
              });
              setMenuAberto(false);
            }}
            className="menu-item-custom"
            style={{ color: "var(--color-danger)" }}
          >
            <i className="pi pi-power-off" style={{ fontSize: "1rem" }} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      )}
      </div>
    </div>
  );

  return (
    <>
      <Toast ref={toast} />
      <Toolbar
        start={startContent}
        center={centerContent}
        end={endContent}
        style={{ padding: "0.4rem 1rem" }}
      />
    </>
  );
}