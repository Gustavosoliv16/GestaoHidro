import React, { useState, useEffect } from "react";

interface ErrorBannerProps {
  message?: string;
  visible?: boolean;
  onDismiss?: () => void;
}

/**
 * Banner de erro/estado que aparece no topo da aplicação.
 * Detecta automaticamente se o banco de dados está inacessível.
 */
const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  visible: controlledVisible,
  onDismiss,
}) => {
  const [dbError, setDbError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Verifica se o banco está acessível
    const checkDb = async () => {
      try {
        const { default: Database } = await import("@tauri-apps/plugin-sql");
        const db = await Database.load("sqlite:gestao_hidro.db");
        await db.select("SELECT 1 as test");
        setDbError(null);
      } catch (erro) {
        setDbError(
          "Banco de dados inacessível. Algumas funções podem não estar disponíveis."
        );
      }
    };

    checkDb();

    // Verifica periodicamente a cada 30s
    const interval = setInterval(checkDb, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (controlledVisible !== undefined) {
      setIsVisible(controlledVisible);
    } else {
      setIsVisible(!!dbError);
    }
  }, [controlledVisible, dbError]);

  const displayMessage = message || dbError;

  if (!isVisible || !displayMessage) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <div
      className="error-banner flex align-items-center justify-content-between px-4 py-2"
      style={{
        background: "rgba(170, 36, 50, 0.1)",
        borderBottom: "2px solid var(--color-danger)",
        color: "var(--color-danger)",
        fontSize: "0.875rem",
        fontWeight: 500,
        fontFamily: "var(--font-body)",
        position: "sticky",
        top: 0,
        zIndex: 9999,
        animation: "slideDown 0.3s ease",
      }}
    >
      <div className="flex align-items-center gap-2">
        <i
          className="pi pi-exclamation-triangle"
          style={{ fontSize: "1rem" }}
        />
        <span>{displayMessage}</span>
      </div>
      <button
        onClick={handleDismiss}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--color-danger)",
          padding: "0.25rem",
          borderRadius: "var(--radius-sm)",
          display: "flex",
          alignItems: "center",
        }}
        aria-label="Fechar"
      >
        <i className="pi pi-times" style={{ fontSize: "0.875rem" }} />
      </button>
    </div>
  );
};

export default ErrorBanner;
