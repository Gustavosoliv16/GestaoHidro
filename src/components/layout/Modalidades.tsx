import { useEffect, useRef, useState } from "react";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Tag } from "primereact/tag";
import Database from "@tauri-apps/plugin-sql";

// Mapeamento de cor por modalidade (mesmo padrão do Horarios.tsx)
const COR_BADGE: Record<string, { bg: string; bgDark: string; border: string; text: string; textDark: string; icon: string }> = {
  hidroginastica:   { bg: "#fdf2f8", bgDark: "#3a2535", border: "#ec4899", text: "#9d174d", textDark: "#f9a8d4", icon: "pi pi-heart" },
  "natacao bebe":   { bg: "#eff6ff", bgDark: "#1e3a5f", border: "#3b82f6", text: "#1e40af", textDark: "#93c5fd", icon: "pi pi-star" },
  "natacao infantil":{ bg: "#f0fdf4", bgDark: "#14362b", border: "#22c55e", text: "#15803d", textDark: "#86efac", icon: "pi pi-users" },
  "natacao adulto": { bg: "#fff7ed", bgDark: "#3a2010", border: "#f97316", text: "#c2410c", textDark: "#fdba74", icon: "pi pi-user" },
  fisioterapia:     { bg: "#fef2f2", bgDark: "#3a1515", border: "#ef4444", text: "#b91c1c", textDark: "#fca5a5", icon: "pi pi-plus" },
};
const COR_PADRAO = { bg: "#f8fafc", bgDark: "#2d3748", border: "#94a3b8", text: "#475569", textDark: "#cbd5e1", icon: "pi pi-tag" };

function normalizarChave(s: string): string {
  return s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function obterCor(nome: string, isDark: boolean) {
  const cor = COR_BADGE[normalizarChave(nome)] ?? COR_PADRAO;
  return {
    bg:     isDark ? cor.bgDark : cor.bg,
    border: cor.border,
    text:   isDark ? cor.textDark : cor.text,
    icon:   cor.icon,
  };
}

interface Modalidade {
  id_modalidade: number;
  modalidade: string;
}

export default function Modalidades() {
  const toast = useRef<Toast>(null);
  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [nomeModalidade, setNomeModalidade] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.getAttribute("data-theme") === "dark");

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const carregarModalidades = async () => {
    try {
      const db = await Database.load("sqlite:gestao_hidro.db");
      const resultado = await db.select<Modalidade[]>(
        "SELECT id_modalidade, modalidade FROM MODALIDADE ORDER BY modalidade ASC"
      );
      setModalidades(resultado);
    } catch (error) {
      console.error("Erro ao carregar modalidades:", error);
    }
  };

  useEffect(() => {
    carregarModalidades();
  }, []);

  const handleCriarModalidade = async () => {
    if (!nomeModalidade.trim()) {
      toast.current?.show({ severity: "warn", summary: "Aviso", detail: "Digite o nome da modalidade." });
      return;
    }
    setSalvando(true);
    try {
      const db = await Database.load("sqlite:gestao_hidro.db");
      await db.execute("INSERT INTO MODALIDADE (modalidade) VALUES ($1)", [nomeModalidade.trim()]);
      setNomeModalidade("");
      carregarModalidades();
      toast.current?.show({ severity: "success", summary: "Cadastrada", detail: "Modalidade adicionada com sucesso!" });
    } catch (error) {
      console.error("Erro ao criar modalidade:", error);
      toast.current?.show({ severity: "error", summary: "Erro", detail: "Não foi possível salvar a modalidade." });
    } finally {
      setSalvando(false);
    }
  };

  const confirmarExclusao = (mod: Modalidade) => {
    confirmDialog({
      message: `Excluir a modalidade "${mod.modalidade}"? Turmas vinculadas perderão a referência.`,
      header: "Confirmar exclusão",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      acceptLabel: "Excluir",
      rejectLabel: "Cancelar",
      accept: async () => {
        try {
          const db = await Database.load("sqlite:gestao_hidro.db");
          await db.execute("DELETE FROM MODALIDADE WHERE id_modalidade = $1", [mod.id_modalidade]);
          carregarModalidades();
          toast.current?.show({ severity: "info", summary: "Excluída", detail: `"${mod.modalidade}" foi removida.` });
        } catch (error) {
          console.error("Erro ao excluir:", error);
          toast.current?.show({
            severity: "error", summary: "Erro",
            detail: "Não foi possível excluir. Verifique se há turmas usando esta modalidade.",
            life: 5000,
          });
        }
      },
    });
  };

  return (
    <div className="w-full">
      <Toast ref={toast} />
      <ConfirmDialog />

      {/* Cabeçalho */}
      <div className="flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="text-2xl font-bold m-0 text-900">Gerenciar Modalidades</h2>
          <p className="text-sm text-500 mt-1 m-0">
            Cadastre as atividades oferecidas pela academia
          </p>
        </div>
        <Tag
          value={`${modalidades.length} modalidade${modalidades.length !== 1 ? "s" : ""}`}
          severity="info"
          icon="pi pi-list"
        />
      </div>

      <div className="flex gap-4 align-items-start">

        {/* ── Formulário de cadastro ── */}
        <div className="surface-card border-1 surface-border border-round shadow-1 p-4 flex-shrink-0"
          style={{ width: 280 }}>
          <div className="flex align-items-center gap-2 mb-3">
            <i className="pi pi-plus-circle text-primary text-lg" />
            <span className="font-bold text-900">Nova Modalidade</span>
          </div>

          <div className="flex flex-column gap-3">
            <div>
              <label className="block text-xs font-bold text-600 uppercase mb-1">
                Nome da atividade
              </label>
              <InputText
                value={nomeModalidade}
                onChange={(e) => setNomeModalidade(e.target.value)}
                placeholder="Ex: Hidroginástica..."
                className="w-full"
                onKeyDown={(e) => e.key === "Enter" && handleCriarModalidade()}
              />
            </div>
            <Button
              label="Cadastrar"
              icon={salvando ? "pi pi-spin pi-spinner" : "pi pi-check"}
              className="w-full p-button-success font-bold"
              disabled={salvando || !nomeModalidade.trim()}
              onClick={handleCriarModalidade}
            />
          </div>
        </div>

        {/* ── Lista de modalidades ── */}
        <div className="flex-1 surface-card border-1 surface-border border-round shadow-1 p-4">
          <div className="flex align-items-center gap-2 mb-3 pb-2 border-bottom-1 surface-border">
            <i className="pi pi-th-large text-primary text-lg" />
            <span className="font-bold text-900">Modalidades Cadastradas</span>
          </div>

          {modalidades.length === 0 ? (
            <div className="flex flex-column align-items-center justify-content-center py-6 text-400">
              <i className="pi pi-inbox text-4xl mb-2" />
              <p className="text-sm m-0">Nenhuma modalidade cadastrada ainda.</p>
              <p className="text-xs m-0 mt-1">Use o formulário ao lado para adicionar.</p>
            </div>
          ) : (
            <div className="flex flex-column gap-2">
              {modalidades.map((mod) => {
                const cor = obterCor(mod.modalidade, isDark);
                return (
                  <div
                    key={mod.id_modalidade}
                    className="flex align-items-center justify-content-between p-3 border-round border-left-3 transition-colors"
                    style={{
                      background: cor.bg,
                      borderLeftColor: cor.border,
                      border: `1px solid ${cor.border}`,
                      borderLeft: `4px solid ${cor.border}`,
                    }}
                  >
                    <div className="flex align-items-center gap-2">
                      <i className={`${cor.icon} text-sm`} style={{ color: cor.text }} />
                      <span className="font-semibold text-sm" style={{ color: cor.text }}>
                        {mod.modalidade}
                      </span>
                    </div>

                    <Button
                      icon="pi pi-trash"
                      className="p-button-rounded p-button-danger p-button-text p-button-sm"
                      tooltip="Excluir modalidade"
                      tooltipOptions={{ position: "left" }}
                      onClick={() => confirmarExclusao(mod)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
