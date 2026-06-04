import { useState, useMemo } from "react";
import { Button } from "primereact/button";
import { PanelMenu } from "primereact/panelmenu";
import { Sidebar } from "primereact/sidebar";
import ListaAlunos from "../components/ListaAluno";
import Modalidades from "../components/layout/Modalidades";
import CadastroAluno from "../components/CadastroAluno";
import { Divider } from "primereact/divider";

export default function Alunos() {

  const [viewAtiva, setViewAtiva] = useState<
    "consultar" | "cadastro" | "editar" | "status" | "modalidades" | "turmas"
  >("consultar");
  
  const [alunoSelecionado, setAlunoSelecionado] = useState<any | null>(null);
  const [showAside, setShowAside] = useState(false);
  const [atualizarTabelaGatilho, setAtualizarTabelaGatilho] = useState(0);
  const [expandedKeys, setExpandedKeys] = useState<any>({});

  const itensMenu = useMemo(
    () => [
      {
        key: "0",
        label: "Cadastros",
        icon: "pi pi-users",
        expanded: true,
        items: [
          {
            key: "0_1",
            label: "Consultar",
            icon: "pi pi-search",
            command: () => {
              setAlunoSelecionado(null);
              setViewAtiva("consultar");
            },
            items: [
              {
                label: "Alunos",
                icon: "pi pi-user",
                command: () => {
                  setViewAtiva("consultar");
                },
              },
              {
                label: "Turmas",
                icon: "pi pi-users",
                command: () => {
                  alert("Funcionalidade de Turmas em desenvolvimento.");
                },
              },
              {
                label: "Modalidades",
                icon: "pi pi-th-large",
                command: () => {
                  setViewAtiva("modalidades");
                },
              },
            ],
          },
          {
            key: "0_2",
            label: "Novo",
            icon: "pi pi-plus",
            items: [
              {
                key: "0_2_1",
                label: "Aluno",
                icon: "pi pi-user",
                command: () => {
                  setAlunoSelecionado(null);
                  setViewAtiva("cadastro");
                },
              },
              {
                key: "0_2_2",
                label: "Turmas",
                icon: "pi pi-users",
                command: () =>
                  alert("Funcionalidade de Turmas em desenvolvimento."),
              },
              {
                key: "0_2_3",
                label: "Modalidades",
                icon: "pi pi-th-large",
                command: () => {
                  setViewAtiva("modalidades");
                },
              },
            ],
          },
          {
            key: "0_3",
            label: "Editar",
            icon: "pi pi-pencil",
            command: () => setViewAtiva("editar"),
          },
          {
            key: "0_4",
            label: "Status",
            icon: "pi pi-info-circle",
            command: () => setViewAtiva("status"),
          },
        ],
      },
      {
        key: "1",
        label: "Utilidades",
        icon: "pi pi-server",
        expanded: true,
        items: [
          { key: "1_1", icon: "pi pi-book", label: "Relatorios" },
          { key: "1_2", icon: "pi pi-print", label: "Imprimir" },
          { key: "1_3", icon: "pi pi-money-bill", label: "Pagamento" },
        ],
      },
    ],
    [setAlunoSelecionado, setViewAtiva]
  );

  const lidarComEditar = (aluno: any) => {
    setAlunoSelecionado(aluno);
    setShowAside(true);
  };

  const toggleAll = () => {
    if (Object.keys(expandedKeys).length) {
      setExpandedKeys({});
    } else {
      const novasChaves: any = {};
      const expandNode = (node: any) => {
        if (node.items && node.items.length) {
          if (node.key) novasChaves[node.key] = true;
          node.items.forEach(expandNode);
        }
      };
      itensMenu.forEach(expandNode);
      setExpandedKeys(novasChaves);
    }
  };

  return (
    <div className="flex gap-4 surface-ground">
      <div className="flex-shrink-0" style={{ width: "240px" }}>
        <div className="card flex flex-column align-items-center gap-3 surface-card p-4 border-round shadow-1">
          <Button
            type="button"
            label="Mostrar Todos"
            text
            onClick={() => {
              setAlunoSelecionado(null);
              setViewAtiva("consultar");
              toggleAll();
            }}
            className="p-button-sm w-full"
          />

          <PanelMenu
            model={itensMenu}
            expandedKeys={expandedKeys}
            onExpandedKeysChange={setExpandedKeys}
            className="w-full"
            multiple
          />
        </div>
      </div>

      <div className="flex-grow-1 min-w-0">
        <div className="card surface-card p-4 border-round shadow-1 w-full">
          
          {/* 2. RENDERIZAÇÃO CONDICIONAL CORRIGIDA */}
          
          {/* TELA: CADASTRO DE ALUNO */}
          {viewAtiva === "cadastro" && (
            <CadastroAluno
              visivel={true}
              alunoParaEditar={alunoSelecionado}
              aoFechar={() => setViewAtiva("consultar")}
              aoSalvar={() => {
                setViewAtiva("consultar");
                setAtualizarTabelaGatilho((prev) => prev + 1);
              }}
            />
          )}

          {/* TELA: GERENCIAR MODALIDADES */}
          {viewAtiva === "modalidades" && (
            <Modalidades />
          )}

          {/* TELA: CONSULTA GERAL DE ALUNOS (Consultar, Editar, Status) */}
          {(viewAtiva === "consultar" || viewAtiva === "editar" || viewAtiva === "status") && (
            <div className="w-full">
              <h2 className="text-2xl font-bold mb-4 mt-0 text-900">
                Consulta Geral de Alunos
              </h2>
              <ListaAlunos
                onEditarAluno={lidarComEditar}
                refreshTrigger={atualizarTabelaGatilho}
                mode={viewAtiva}
              />
              <Sidebar
                visible={showAside}
                position="right"
                onHide={() => setShowAside(false)}
                fullScreen={false}
                style={{ width: "420px" }}
              >
                <div className="flex align-items-center justify-content-between mb-3">
                  <h3 className="m-0 text-xl">Editar Aluno</h3>
                  <Button
                    icon="pi pi-times"
                    className="p-button-text"
                    onClick={() => setShowAside(false)}
                  />
                </div>
                <Divider />
                <CadastroAluno
                  visivel={true}
                  alunoParaEditar={alunoSelecionado}
                  aoFechar={() => setShowAside(false)}
                  aoSalvar={() => {
                    setShowAside(false);
                    setAtualizarTabelaGatilho((prev) => prev + 1);
                  }}
                />
              </Sidebar>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}