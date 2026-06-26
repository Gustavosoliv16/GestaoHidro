import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";

interface AtalhoModalProps {
  visible: boolean;
  onHide: () => void;
}

export default function AtalhoModal({ visible, onHide }: AtalhoModalProps) {
  const atalhos = [
    { tecla: "Ctrl + H", acao: "Ir para Home (Dashboard)" },
    { tecla: "Ctrl + N", acao: "Ir para Cadastros (Novo Aluno)" },
    { tecla: "Ctrl + L", acao: "Ir para Relatórios" },
    { tecla: "Ctrl + G", acao: "Ir para Grade Horária" },
    { tecla: "Ctrl + ?", acao: "Abrir este modal de atalhos" },
    { tecla: "Esc", acao: "Fechar modais e dropdowns" },
  ];

  return (
    <Dialog
      header="Atalhos de Teclado"
      visible={visible}
      onHide={onHide}
      style={{ width: "500px", maxWidth: "95vw" }}
      footer={
        <Button
          label="Fechar"
          icon="pi pi-check"
          onClick={onHide}
          autoFocus
        />
      }
    >
      <div className="flex flex-column gap-3 pt-2">
        {atalhos.map((atalho, index) => (
          <div
            key={index}
            className="flex justify-content-between align-items-center p-3 border-round"
            style={{
              background: "var(--surface-ground)",
              borderBottom: index < atalhos.length - 1 ? "1px solid var(--surface-border)" : "none",
            }}
          >
            <span className="font-semibold text-900">{atalho.acao}</span>
            <kbd
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--surface-border)",
                borderRadius: "4px",
                padding: "0.25rem 0.5rem",
                fontFamily: "monospace",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--text-color)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
              }}
            >
              {atalho.tecla}
            </kbd>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
