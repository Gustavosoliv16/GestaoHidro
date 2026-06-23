import { useEffect, useRef, useState } from "react";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Tag } from "primereact/tag";
import Database from "@tauri-apps/plugin-sql";
import {
  buscarTodosProfessores,
  criarProfessor,
  atualizarProfessor,
  excluirProfessor,
  Professor,
} from "../services/ProfessorService";

interface Modalidade {
  id_modalidade: number;
  modalidade: string;
}

export default function Professores() {
  const toast = useRef<Toast>(null);

  const [professores, setProfessores] = useState<Professor[]>([]);
  const [modalidades, setModalidades] = useState<Modalidade[]>([]);

  // Formulário de novo professor
  const [nome, setNome] = useState("");
  const [idModalidade, setIdModalidade] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Edição inline
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editModalidade, setEditModalidade] = useState<number | null>(null);

  const carregar = async () => {
    const [profs, mods] = await Promise.all([
      buscarTodosProfessores(),
      (async () => {
        const db = await Database.load("sqlite:gestao_hidro.db");
        return await db.select<Modalidade[]>(
          "SELECT id_modalidade, modalidade FROM MODALIDADE ORDER BY modalidade ASC",
        );
      })(),
    ]);
    setProfessores(profs);
    setModalidades(mods);
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleCriar = async () => {
    if (!nome.trim()) {
      toast.current?.show({
        severity: "warn",
        summary: "Aviso",
        detail: "Digite o nome do professor.",
      });
      return;
    }
    setSalvando(true);
    try {
      const res = await criarProfessor(nome.trim(), idModalidade);
      if (res.sucesso) {
        toast.current?.show({
          severity: "success",
          summary: "Cadastrado",
          detail: res.mensagem,
        });
        setNome("");
        setIdModalidade(null);
        carregar();
      }
    } finally {
      setSalvando(false);
    }
  };

  const iniciarEdicao = (p: Professor) => {
    setEditandoId(p.id_professor);
    setEditNome(p.nome);
    setEditModalidade(p.id_modalidade);
  };

  const handleSalvarEdicao = async (id: number) => {
    const res = await atualizarProfessor(id, editNome, editModalidade);
    if (res.sucesso) {
      toast.current?.show({
        severity: "success",
        summary: "Atualizado",
        detail: res.mensagem,
      });
      setEditandoId(null);
      carregar();
    } else {
      toast.current?.show({
        severity: "error",
        summary: "Erro",
        detail: res.mensagem,
      });
    }
  };

  const handleExcluir = (p: Professor) => {
    confirmDialog({
      message: `Excluir o professor "${p.nome}"?`,
      header: "Confirmar exclusão",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      acceptLabel: "Excluir",
      rejectLabel: "Cancelar",
      accept: async () => {
        const res = await excluirProfessor(p.id_professor);
        toast.current?.show({
          severity: "info",
          summary: "Removido",
          detail: res.mensagem,
        });
        carregar();
      },
    });
  };

  const opcoesModalidades = [
    { label: "Sem modalidade", value: null },
    ...modalidades.map((m) => ({
      label: m.modalidade,
      value: m.id_modalidade,
    })),
  ];

  return (
    <div className="w-full">
      <Toast ref={toast} />
      <ConfirmDialog />

      {/* Cabeçalho */}
      <div className="flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="text-2xl font-bold m-0 text-900">Professores</h2>
          <p className="text-sm text-500 mt-1 m-0">
            Cadastre os professores e vincule às modalidades
          </p>
        </div>
        <Tag
          value={`${professores.length} professor${professores.length !== 1 ? "es" : ""}`}
          severity="info"
          icon="pi pi-user"
        />
      </div>

      <div className="flex gap-4 align-items-start">
        {/* ── Formulário de cadastro ── */}
        <div
          className="surface-card border-1 surface-border border-round shadow-1 p-4 flex-shrink-0"
          style={{ width: 300 }}
        >
          <div className="flex align-items-center gap-2 mb-3">
            <i className="pi pi-user-plus text-primary text-lg" />
            <span className="font-bold text-900">Novo Professor</span>
          </div>

          <div className="flex flex-column gap-3">
            <div>
              <label className="text-xs font-bold text-600 uppercase block mb-1">
                Nome
              </label>
              <InputText
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do professor"
                className="w-full"
                onKeyDown={(e) => e.key === "Enter" && handleCriar()}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-600 uppercase block mb-1">
                Modalidade
              </label>
              <Dropdown
                appendTo="self"
                value={idModalidade}
                options={opcoesModalidades}
                onChange={(e) => setIdModalidade(e.value)}
                placeholder="Selecione..."
                className="w-full"
              />
            </div>
            <Button
              label="Cadastrar"
              icon={salvando ? "pi pi-spin pi-spinner" : "pi pi-check"}
              className="w-full p-button-success font-bold"
              disabled={salvando || !nome.trim()}
              onClick={handleCriar}
            />
          </div>
        </div>

        {/* ── Lista de professores ── */}
        <div className="flex-1 surface-card border-1 surface-border border-round shadow-1 p-4">
          <div className="flex align-items-center gap-2 mb-3 pb-2 border-bottom-1 surface-border">
            <i className="pi pi-users text-primary text-lg" />
            <span className="font-bold text-900">Professores Cadastrados</span>
          </div>

          {professores.length === 0 ? (
            <div className="flex flex-column align-items-center justify-content-center py-6 text-400">
              <i className="pi pi-inbox text-4xl mb-2" />
              <p className="text-sm m-0">Nenhum professor cadastrado.</p>
            </div>
          ) : (
            <div className="flex flex-column gap-2">
              {professores.map((p) => (
                <div
                  key={p.id_professor}
                  className="professor-card p-3 border-round border-1 surface-border"
                >
                  {editandoId === p.id_professor ? (
                    /* Modo edição inline */
                    <div className="flex flex-column gap-2">
                      <InputText
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        className="w-full p-inputtext-sm"
                        autoFocus
                      />
                      <Dropdown
                        appendTo="self"
                        value={editModalidade}
                        options={opcoesModalidades}
                        onChange={(e) => setEditModalidade(e.value)}
                        className="w-full p-inputtext-sm"
                      />
                      <div className="flex gap-2 justify-content-end">
                        <Button
                          label="Cancelar"
                          icon="pi pi-times"
                          className="p-button-text p-button-secondary p-button-sm"
                          onClick={() => setEditandoId(null)}
                        />
                        <Button
                          label="Salvar"
                          icon="pi pi-check"
                          className="p-button-success p-button-sm"
                          onClick={() => handleSalvarEdicao(p.id_professor)}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Modo visualização */
                    <div className="flex align-items-center justify-content-between">
                      <div className="flex align-items-center gap-3">
                        <div
                          className="professor-avatar flex align-items-center justify-content-center border-circle text-white font-bold text-sm"
                          style={{ width: 36, height: 36, flexShrink: 0 }}
                        >
                          {p.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-800">{p.nome}</div>
                          {p.modalidade ? (
                            <span className="text-xs text-500">
                              {p.modalidade}
                            </span>
                          ) : (
                            <span className="text-xs text-300">
                              Sem modalidade
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          icon="pi pi-pencil"
                          className="p-button-rounded p-button-text p-button-warning p-button-sm"
                          tooltip="Editar"
                          tooltipOptions={{ position: "top" }}
                          onClick={() => iniciarEdicao(p)}
                        />
                        <Button
                          icon="pi pi-trash"
                          className="p-button-rounded p-button-text p-button-danger p-button-sm"
                          tooltip="Excluir"
                          tooltipOptions={{ position: "top" }}
                          onClick={() => handleExcluir(p)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
