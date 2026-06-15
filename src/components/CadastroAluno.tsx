import { useState, useEffect, useRef } from "react";
import { InputText } from "primereact/inputtext";
import { InputMask, InputMaskChangeEvent } from "primereact/inputmask";
import {
  salvarAlunoCompleto,
  atualizarAlunoCompleto,
} from "../services/AlunoService";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Divider } from "primereact/divider";
import { Modalidade, Aluno } from "./layout/types";
import Database from "@tauri-apps/plugin-sql";

interface NovoAlunoModalProps {
  visivel: boolean;
  aoFechar: () => void;
  aoSalvar: (novoAluno?: any) => void;
  alunoParaEditar?: any;
}

export default function NovoAlunoModal({
  aoFechar,
  aoSalvar,
  alunoParaEditar,
}: NovoAlunoModalProps) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [documento, setDocumento] = useState("");
  const [modalidade, setModalidade] = useState<Modalidade | []>([]);
  const [diaVencimento, setDiaVencimento] = useState<number | null>(() => {
    return new Date().getDate();
  });
  const [valorMensalidade, setValorMensalidade] = useState<number | null>(null);
  const [horariosFixos, setHorariosFixos] = useState<
    { diaSemana: number; hora: string }[]
  >([]);
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [opcoesModalidades, setOpcoesModalidades] = useState<Modalidade[]>([]);

  const toast = useRef<Toast>(null);

  useEffect(() => {
    async function carregarModalidades() {
      const db = await Database.load("sqlite:gestao_hidro.db");
      const resultado = await db.select<Modalidade[]>(
        "SELECT id_modalidade, modalidade FROM modalidade",
      );
      setOpcoesModalidades(resultado);
    }
    carregarModalidades();
  }, []);

  useEffect(() => {
    if (!alunoParaEditar) return;
    const a = alunoParaEditar;
    const onlyDigits = (s: any) => (s ? String(s).replace(/\D/g, "") : "");
    const formatPhone = (s: string) => {
      const d = onlyDigits(s);
      if (d.length === 11)
        return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
      if (d.length === 10)
        return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
      return s || "";
    };
    const formatCPF = (s: string) => {
      const d = onlyDigits(s);
      if (d.length === 11)
        return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
      return s || "";
    };

    setNome(a.nome || "");
    setTelefone(formatPhone(a.telefone || a.tel));
    setDocumento(formatCPF(a.documento));
    setNascimento(a.nascimento || a.data_nascimento || "");
    setEndereco(a.endereco || "");
    setNumero(a.numero || "");
    setBairro(a.bairro || "");
    setCidade(a.cidade || "");
    setModalidade(a.id_modalidade || null);
    setDiaVencimento(a.diaVencimento || a.dia_vencimento || null);
    setValorMensalidade(a.valorMensalidade || a.valor_mensalidade || null);
    setHorariosFixos(a.horariosFixos || []);
  }, [alunoParaEditar]);

  const executarSalvar = async () => {
    const strip = (s: string | null | undefined) =>
      s ? s.replace(/\D/g, "") : "";

    const dadosParaSalvar = {
      nome,
      telefone: strip(telefone),
      documento: strip(documento),
      nascimento,
      endereco,
      numero,
      bairro,
      cidade,
      modalidade,
      diaVencimento: diaVencimento === null ? null : Math.trunc(diaVencimento),
      valorMensalidade: valorMensalidade || 0,
      horariosFixos: horariosFixos,
    };

    try {
      if (alunoParaEditar && (alunoParaEditar.id_aluno || alunoParaEditar.id)) {
        const idAluno = alunoParaEditar.id_aluno || alunoParaEditar.id;
        await atualizarAlunoCompleto(Number(idAluno), dadosParaSalvar);
        toast.current?.show({
          severity: "success",
          summary: "Sucesso",
          detail: "Aluno atualizado com sucesso!",
          life: 3000,
        });
        setTimeout(() => {
          aoSalvar({ ...alunoParaEditar, ...dadosParaSalvar });
          aoFechar();
        }, 500);
      } else {
        await salvarAlunoCompleto(dadosParaSalvar);
        toast.current?.show({
          severity: "success",
          summary: "Sucesso",
          detail: "Aluno salvo com sucesso!",
          life: 3000,
        });
        const novoAluno: Aluno = {
          id: Date.now(),
          nome,
          telefone,
          modalidade: modalidade as any,
          diaVencimento: diaVencimento === null ? 0 : Math.trunc(diaVencimento),
          nascimento,
          documento,
          endereco,
          valorMensalidade: valorMensalidade || 0,
          horariosFixos: horariosFixos,
        };
        setTimeout(() => {
          aoSalvar(novoAluno);
          aoFechar();
        }, 500);
      }
    } catch (erro) {
      console.error("Erro detalhado ao salvar:", erro);
      toast.current?.show({
        severity: "error",
        summary: "Erro",
        detail: "Erro ao salvar o aluno no banco de dados.",
        life: 4000,
      });
    }
  };

  const lidarComSalvar = () => {
    const erros: string[] = [];
if (!nome) erros.push("Nome");
if (!documento || documento.replace(/\D/g, "").length < 11) erros.push("CPF");
if (!modalidade) erros.push("Modalidade");
if (!diaVencimento) erros.push("Dia de vencimento");
if (erros.length > 0) {
  toast.current?.show({
    severity: "error",
    summary: "Campos obrigatórios",
    detail: `Preencha os campos: ${erros.join(", ")}`,
  });
  return;
}

    confirmDialog({
      message: "Confirmar salvar as alterações deste aluno?",
      header: "Confirmação",
      icon: "pi pi-question-circle",
      acceptLabel: "Sim",
      rejectLabel: "Não",
      accept: executarSalvar,
    });
  };

  return (
    <div className="flex flex-column gap-4 w-full">
      {/* Toast e ConfirmDialog precisam estar na raiz do componente */}
      <Toast ref={toast} />
      <ConfirmDialog />

      <div>
        <h2 className="text-2xl font-bold m-0 text-900">
          {alunoParaEditar ? "Editar Aluno" : "Novo Aluno"}
        </h2>
        <p className="text-600 text-sm mt-1 mb-0">
          Preencha os dados do aluno abaixo
        </p>
      </div>

      <Card className="surface-card border-1 surface-border p-0">
        <div className="p-4">
          <div className="grid">
            <div className="col-12">
              <label
                htmlFor="nome"
                className="font-semibold block mb-2 text-900"
              >
                Nome Completo
              </label>
              <InputText
                id="nome"
                value={nome}
                placeholder="Digite o nome completo"
                onChange={(e) => setNome(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="col-12 md:col-6">
              <label
                htmlFor="tel"
                className="font-semibold block mb-2 text-900"
              >
                Telefone
              </label>
              <InputMask
                id="tel"
                value={telefone}
                mask="(99) 99999-9999"
                placeholder="(00) 00000-0000"
                onChange={(e: InputMaskChangeEvent) =>
                  setTelefone(e.target.value ?? "")
                }
                className="w-full"
              />
            </div>

            <div className="col-12 md:col-6">
              <label
                htmlFor="documento"
                className="font-semibold block mb-2 text-900"
              >
                Documento (CPF)
              </label>
              <InputMask
                id="documento"
                value={documento}
                mask="999.999.999-99"
                placeholder="000.000.000-00"
                onChange={(e: InputMaskChangeEvent) =>
                  setDocumento(e.target.value ?? "")
                }
                className="w-full"
              />
            </div>

            <div className="col-12">
              <label
                htmlFor="endereco"
                className="font-semibold block mb-2 text-900"
              >
                Endereço
              </label>
              <InputText
                id="endereco"
                value={endereco}
                placeholder="Rua, avenida..."
                onChange={(e) => setEndereco(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="col-12 md:col-6">
              <label
                htmlFor="numero"
                className="font-semibold block mb-2 text-900"
              >
                Número
              </label>
              <InputText
                id="numero"
                value={numero}
                placeholder="Número"
                onChange={(e) => setNumero(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="col-12 md:col-6">
              <label
                htmlFor="bairro"
                className="font-semibold block mb-2 text-900"
              >
                Bairro
              </label>
              <InputText
                id="bairro"
                value={bairro}
                placeholder="Bairro"
                onChange={(e) => setBairro(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="col-12 md:col-6">
              <label
                htmlFor="cidade"
                className="font-semibold block mb-2 text-900"
              >
                Cidade
              </label>
              <InputText
                id="cidade"
                value={cidade}
                placeholder="Cidade"
                onChange={(e) => setCidade(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="col-12 md:col-6">
              <label
                htmlFor="nascimento"
                className="font-semibold block mb-2 text-900"
              >
                Data de Nascimento
              </label>
              <InputMask
                id="nascimento"
                value={nascimento}
                onChange={(e: InputMaskChangeEvent) =>
                  setNascimento(e.target.value ?? "")
                }
                mask="99/99/9999"
                placeholder="dd/mm/yyyy"
                className="w-full"
              />
            </div>

            <div className="col-12 md:col-6">
              <label className="font-semibold block mb-2 text-900">
                Modalidade
              </label>
              <Dropdown
                value={modalidade}
                options={opcoesModalidades}
                onChange={(e) => setModalidade(e.value)}
                optionLabel="modalidade"
                optionValue="id_modalidade"
                placeholder="Selecione..."
                className="w-full"
              />
            </div>

            <div className="col-12 md:col-6">
              <label className="font-semibold block mb-2 text-900">
                Dia Vencimento
              </label>
              <InputNumber
                value={diaVencimento}
                onValueChange={(e) => {
                  const v = e.value ?? null;
                  setDiaVencimento(v === null ? null : Math.trunc(v));
                }}
                min={1}
                max={31}
                className="w-full"
                maxFractionDigits={0}
                placeholder="5"
              />
            </div>

            <div className="col-12 md:col-6">
              <label className="font-semibold block mb-2 text-900">
                Mensalidade
              </label>
              <InputNumber
                value={valorMensalidade}
                onValueChange={(e) => setValorMensalidade(e.value ?? null)}
                mode="currency"
                currency="BRL"
                locale="pt-BR"
                className="w-full"
                placeholder="R$ 0,00"
              />
            </div>
          </div>
        </div>

        <Divider className="m-0" />

        <div className="flex justify-content-end gap-2 p-4">
          <Button
            label="Cancelar"
            icon="pi pi-times"
            severity="secondary"
            onClick={aoFechar}
          />
          <Button label="Salvar" icon="pi pi-check" onClick={lidarComSalvar} />
        </div>
      </Card>
    </div>
  );
}
