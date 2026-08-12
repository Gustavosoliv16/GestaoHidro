import { useState } from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { CHANGELOG, type EntradaChangelog, type TipoItem } from "../../changelog";

interface Props {
  visible: boolean;
  onHide: () => void;
}

const LABEL_TIPO: Record<TipoItem, { label: string; cor: string; bg: string }> = {
  novo:      { label: "Novo",      cor: "#0891b2", bg: "rgba(8,145,178,0.10)"  },
  melhoria:  { label: "Melhoria",  cor: "#7c3aed", bg: "rgba(124,58,237,0.10)" },
  correcao:  { label: "Correção",  cor: "#d97706", bg: "rgba(217,119,6,0.10)"  },
};

function EntradaCard({ entrada, destaque }: { entrada: EntradaChangelog; destaque: boolean }) {
  const [aberto, setAberto] = useState(destaque);

  return (
    <div
      style={{
        border: `1px solid ${destaque ? "rgba(8,145,178,0.35)" : "var(--color-border, #e5e7eb)"}`,
        borderRadius: "8px",
        overflow: "hidden",
        background: destaque ? "rgba(8,145,178,0.04)" : "var(--color-surface, #fff)",
      }}
    >
      {/* Cabeçalho clicável */}
      <button
        onClick={() => !destaque && setAberto((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.85rem 1rem",
          background: "transparent",
          border: "none",
          cursor: destaque ? "default" : "pointer",
          textAlign: "left",
        }}
      >
        {/* Badge de versão */}
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            padding: "0.15rem 0.6rem",
            borderRadius: "999px",
            background: destaque ? "var(--color-cyan-600, #0891b2)" : "var(--surface-300, #d1d5db)",
            color: destaque ? "#fff" : "var(--color-text-secondary, #6b7280)",
            flexShrink: 0,
            letterSpacing: "0.03em",
          }}
        >
          v{entrada.versao}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: destaque ? "0.95rem" : "0.875rem",
              fontWeight: destaque ? 700 : 600,
              color: "var(--color-text, #111827)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {entrada.resumo}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--color-text-secondary, #6b7280)", marginTop: "0.1rem" }}>
            {entrada.data}
          </div>
        </div>

        {/* Seta de colapso (só em versões anteriores) */}
        {!destaque && (
          <i
            className={`pi ${aberto ? "pi-chevron-up" : "pi-chevron-down"}`}
            style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", flexShrink: 0 }}
          />
        )}
      </button>

      {/* Lista de itens */}
      {aberto && (
        <div style={{ padding: "0 1rem 0.85rem 1rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          {entrada.itens.map((item, i) => {
            const cfg = LABEL_TIPO[item.tipo];
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    padding: "0.1rem 0.45rem",
                    borderRadius: "4px",
                    color: cfg.cor,
                    background: cfg.bg,
                    flexShrink: 0,
                    marginTop: "0.15rem",
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                  }}
                >
                  {cfg.label}
                </span>
                <span style={{ fontSize: "0.85rem", color: "var(--color-text, #1f2937)", lineHeight: 1.5 }}>
                  {item.texto}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ChangelogModal({ visible, onHide }: Props) {
  // Mostra só as 2 últimas entradas (o array já limita, mas garantimos aqui)
  const entradas = CHANGELOG.slice(0, 2);

  return (
    <Dialog
      header={
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <i className="pi pi-sparkles" style={{ color: "var(--color-cyan-600, #0891b2)", fontSize: "1.1rem" }} />
          <span>Novidades do Sistema</span>
        </div>
      }
      visible={visible}
      style={{ width: "520px", maxWidth: "95vw" }}
      modal
      onHide={onHide}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            label="Entendido"
            icon="pi pi-check"
            className="p-button-sm p-button-outlined"
            onClick={onHide}
            autoFocus
          />
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", paddingTop: "0.5rem" }}>
        {entradas.map((entrada, idx) => (
          <EntradaCard key={entrada.versao} entrada={entrada} destaque={idx === 0} />
        ))}
        {entradas.length === 0 && (
          <p style={{ textAlign: "center", color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            Nenhuma nota de versão disponível.
          </p>
        )}
      </div>
    </Dialog>
  );
}
