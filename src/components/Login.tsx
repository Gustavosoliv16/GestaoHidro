import { useState, useRef, useEffect } from "react";
import { Toast } from "primereact/toast";
import { useSession } from "../contexts/SessionContext";
import { listarFuncionariosAtivos, validarPin, type Funcionario } from "../services/FuncionarioService";
import logoNome from "../assets/Hidroescola_nomelogo.png";

export default function Login() {
  const toast = useRef<Toast>(null);
  const { login } = useSession();

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [carregando, setCarregando]     = useState(true);

  // Etapa: "selecao" → escolhe o nome | "pin" → digita o PIN
  const [etapa, setEtapa]                       = useState<"selecao" | "pin">("selecao");
  const [selecionado, setSelecionado]           = useState<Funcionario | null>(null);
  const [pin, setPin]                           = useState("");
  const [tentativas, setTentativas]             = useState(0);
  const [bloqueado, setBloqueado]               = useState(false);
  const [tempoBloqueio, setTempoBloqueio]       = useState(0);
  const [autenticando, setAutenticando]         = useState(false);

  const MAX_TENTATIVAS = 5;
  const TEMPO_BLOQUEIO = 30;

  // Carrega funcionários ativos
  useEffect(() => {
    listarFuncionariosAtivos()
      .then(setFuncionarios)
      .catch(() =>
        toast.current?.show({
          severity: "error",
          summary: "Erro",
          detail: "Não foi possível carregar os funcionários.",
          life: 4000,
        })
      )
      .finally(() => setCarregando(false));
  }, []);

  // Contador regressivo de bloqueio
  useEffect(() => {
    if (!bloqueado || tempoBloqueio <= 0) return;
    const t = setInterval(() => {
      setTempoBloqueio(prev => {
        if (prev <= 1) { setBloqueado(false); setTentativas(0); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [bloqueado, tempoBloqueio]);

  // Teclado físico (numérico e backspace) na etapa de PIN
  useEffect(() => {
    if (etapa !== "pin") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (bloqueado || autenticando) return;

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        // Usa callback funcional para sempre ler o pin atual, evitando closure stale
        setPin(prev => {
          if (prev.length >= 4) return prev;
          const novo = prev + e.key;
          if (novo.length === 4) {
            // Agenda a confirmação para depois do re-render com o pin completo
            setTimeout(() => confirmar(novo), 0);
          }
          return novo;
        });
      } else if (e.key === "Backspace") {
        e.preventDefault();
        setPin(prev => prev.slice(0, -1));
      } else if (e.key === "Escape") {
        voltar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [etapa, bloqueado, autenticando]);

  const selecionarFuncionario = (f: Funcionario) => {
    setSelecionado(f);
    setPin("");
    setTentativas(0);
    setBloqueado(false);
    setEtapa("pin");
  };

  const voltar = () => {
    setEtapa("selecao");
    setSelecionado(null);
    setPin("");
    setTentativas(0);
    setBloqueado(false);
  };

  // Adiciona dígito ao PIN (máx 4)
  const adicionarDigito = (d: string) => {
    if (bloqueado || pin.length >= 4) return;
    const novo = pin + d;
    setPin(novo);
    if (novo.length === 4) confirmar(novo);
  };

  const apagarDigito = () => {
    if (bloqueado) return;
    setPin(prev => prev.slice(0, -1));
  };

  const confirmar = async (pinFinal: string) => {
    if (!selecionado || autenticando) return;
    setAutenticando(true);
    try {
      const ok = await validarPin(selecionado.id_funcionario, pinFinal);
      if (ok) {
        toast.current?.show({
          severity: "success",
          summary: `Bem-vindo, ${selecionado.nome}!`,
          detail: "Acesso autorizado.",
          life: 1500,
        });
        await login({ id_funcionario: selecionado.id_funcionario, nome: selecionado.nome });
      } else {
        const novas = tentativas + 1;
        setTentativas(novas);
        setPin("");
        if (novas >= MAX_TENTATIVAS) {
          setBloqueado(true);
          setTempoBloqueio(TEMPO_BLOQUEIO);
          toast.current?.show({
            severity: "error",
            summary: "Bloqueado",
            detail: `Muitas tentativas. Aguarde ${TEMPO_BLOQUEIO}s.`,
            life: 4000,
          });
        } else {
          toast.current?.show({
            severity: "error",
            summary: "PIN incorreto",
            detail: `Tentativa ${novas} de ${MAX_TENTATIVAS}.`,
            life: 2500,
          });
        }
      }
    } catch {
      toast.current?.show({
        severity: "error",
        summary: "Erro",
        detail: "Falha ao verificar PIN.",
        life: 3000,
      });
      setPin("");
    } finally {
      setAutenticando(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, var(--color-navy-900) 0%, var(--color-navy-700) 100%)",
        padding: "1.5rem",
      }}
    >
      <Toast ref={toast} />

      <div
        style={{
          width: "100%",
          maxWidth: etapa === "selecao" ? 640 : 360,
          transition: "max-width 0.3s ease",
        }}
      >
        {/* Cabeçalho com logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            display: "inline-block",
            background: "#ffffff",
            borderRadius: 16,
            padding: "0.75rem 1.5rem",
            marginBottom: "1rem",
            boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
          }}>
            <img
              src={logoNome}
              alt="Hidroescola"
              style={{ height: 72, objectFit: "contain", display: "block" }}
            />
          </div>
          <p style={{
            color: "rgba(255,255,255,0.85)",
            fontSize: "0.95rem",
            margin: "0 0 0.25rem 0",
            fontWeight: 500,
            letterSpacing: "0.01em",
          }}>
            Bem-vindo de volta! 👋
          </p>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.82rem", margin: 0 }}>
            {etapa === "selecao" ? "Selecione seu perfil para continuar" : `Digite seu PIN — ${selecionado?.nome}`}
          </p>
        </div>

        {/* ── Etapa 1: Seleção de funcionário ── */}
        {etapa === "selecao" && (
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 16,
              padding: "1.5rem",
            }}
          >
            {carregando ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.6)" }}>
                <i className="pi pi-spin pi-spinner" style={{ fontSize: "2rem" }} />
                <p style={{ marginTop: "0.75rem" }}>Carregando...</p>
              </div>
            ) : funcionarios.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.6)" }}>
                <i className="pi pi-users" style={{ fontSize: "2.5rem", display: "block", marginBottom: "0.75rem" }} />
                <p>Nenhum funcionário cadastrado.</p>
                <p style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                  Cadastre funcionários em Configurações → Funcionários.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                {funcionarios.map(f => (
                  <button
                    key={f.id_funcionario}
                    onClick={() => selecionarFuncionario(f)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "1.25rem 0.75rem",
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 12,
                      cursor: "pointer",
                      color: "#ffffff",
                      fontFamily: "inherit",
                      transition: "background 0.15s ease, border-color 0.15s ease, transform 0.1s ease",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "rgba(91,200,212,0.2)";
                      e.currentTarget.style.borderColor = "var(--color-cyan-400)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {/* Avatar com inicial */}
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, var(--color-cyan-600), var(--color-cyan-400))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      {f.nome.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: "0.9rem", fontWeight: 600, textAlign: "center" }}>
                      {f.nome}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Etapa 2: PIN numérico ── */}
        {etapa === "pin" && (
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 16,
              padding: "1.75rem 1.5rem",
            }}
          >
            {/* Pontos do PIN */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "1rem",
                marginBottom: "1.75rem",
              }}
            >
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: i < pin.length ? "var(--color-cyan-400)" : "rgba(255,255,255,0.2)",
                    border: "2px solid rgba(255,255,255,0.3)",
                    transition: "background 0.15s ease",
                  }}
                />
              ))}
            </div>

            {bloqueado && (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--color-warning)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  marginBottom: "1rem",
                }}
              >
                <i className="pi pi-lock mr-2" />
                Bloqueado por {tempoBloqueio}s
              </div>
            )}

            {/* Teclado numérico */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "0.6rem",
              }}
            >
              {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((d, i) => {
                const vazio = d === "";
                const apagar = d === "⌫";
                return (
                  <button
                    key={i}
                    onClick={() => apagar ? apagarDigito() : (!vazio && adicionarDigito(d))}
                    disabled={bloqueado || autenticando || vazio}
                    style={{
                      padding: "1rem",
                      fontSize: apagar ? "1.1rem" : "1.35rem",
                      fontWeight: 700,
                      background: vazio ? "transparent" : apagar ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.1)",
                      border: vazio ? "none" : "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 10,
                      color: apagar ? "rgba(255,255,255,0.6)" : "#ffffff",
                      cursor: vazio || bloqueado || autenticando ? "default" : "pointer",
                      fontFamily: "inherit",
                      transition: "background 0.1s ease",
                      opacity: bloqueado || autenticando ? 0.5 : 1,
                    }}
                    onMouseEnter={e => {
                      if (!vazio && !bloqueado && !autenticando)
                        e.currentTarget.style.background = apagar
                          ? "rgba(255,255,255,0.12)"
                          : "rgba(91,200,212,0.25)";
                    }}
                    onMouseLeave={e => {
                      if (!vazio)
                        e.currentTarget.style.background = apagar
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(255,255,255,0.1)";
                    }}
                  >
                    {autenticando && d !== "⌫" && d !== "" ? (
                      pin.length === 4 && d === pin[3] ? (
                        <i className="pi pi-spin pi-spinner" style={{ fontSize: "1rem" }} />
                      ) : d
                    ) : d}
                  </button>
                );
              })}
            </div>

            {/* Botão voltar */}
            <button
              onClick={voltar}
              style={{
                marginTop: "1.25rem",
                width: "100%",
                padding: "0.6rem",
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.45)",
                fontSize: "0.85rem",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
            >
              <i className="pi pi-arrow-left mr-1" />
              Trocar funcionário
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
