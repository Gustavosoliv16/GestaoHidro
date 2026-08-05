import { useState, useEffect, useRef } from "react";
import { InputText } from "primereact/inputtext";
import { InputMask, InputMaskChangeEvent } from "primereact/inputmask";
import {
  salvarAlunoCompleto,
  atualizarAlunoCompleto,
} from "../services/AlunoService";
import {
  agendarReposicao,
  cancelarReposicao,
  buscarReposicoesPorAluno,
  Reposicao,
} from "../services/ReposicaoService";
import { buscarTodasTurmas } from "../services/TurmaService";
import { Toast } from "primereact/toast";
import { confirmDialog } from "primereact/confirmdialog";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Divider } from "primereact/divider";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { Modalidade, Aluno } from "./layout/types";
import Database from "@tauri-apps/plugin-sql";

interface NovoAlunoModalProps {
  visivel: boolean;
  aoFechar: () => void;
  aoSalvar: (novoAluno?: any) => void;
  alunoParaEditar?: any;
}

// Modalidades que exigem responsável
function exigeResponsavel(nomeModalidade: string): boolean {
  const norm = (nomeModalidade ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return (
    norm.includes("infantil") || norm.includes("bebe") || norm.includes("bebê")
  );
}

export default function NovoAlunoModal({
  aoFechar,
  aoSalvar,
  alunoParaEditar,
}: NovoAlunoModalProps) {
  const toast = useRef<Toast>(null);

  // ── Rascunho — estado reativo para controlar visibilidade do botão ─────────
  const CHAVE_RASCUNHO = "rascunho_aluno";
  const [temRascunho, setTemRascunho] = useState(
    () => !alunoParaEditar && !!localStorage.getItem("rascunho_aluno")
  );
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [documento, setDocumento] = useState("");
  const [modalidade, setModalidade] = useState<number | null>(null);
  const [nomeModalidadeSelecionada, setNomeModalidadeSelecionada] =
    useState("");
  const [diaVencimento, setDiaVencimento] = useState<number | null>(() =>
    new Date().getDate(),
  );
  const [valorMensalidade, setValorMensalidade] = useState<number | null>(null);
  const [horariosFixos, setHorariosFixos] = useState<
    { diaSemana: number; hora: string }[]
  >([]);
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [opcoesModalidades, setOpcoesModalidades] = useState<Modalidade[]>([]);

  // ── Dados do responsável ────────────────────────────────────────────────────
  const [nomeResp, setNomeResp] = useState("");
  const [telefoneResp, setTelefoneResp] = useState("");
  const [documentoResp, setDocumentoResp] = useState("");

  const precisaResponsavel = exigeResponsavel(nomeModalidadeSelecionada);

  // ── Reposição de aula ───────────────────────────────────────────────────────
  const [todasTurmas, setTodasTurmas] = useState<any[]>([]);
  const [turmaSelecionadaReposicao, setTurmaSelecionadaReposicao] = useState<
    number | null
  >(null);
  const [dataReposicao, setDataReposicao] = useState("");
  const [observacaoReposicao, setObservacaoReposicao] = useState("");
  const [reposicoes, setReposicoes] = useState<Reposicao[]>([]);
  const [salvandoReposicao, setSalvandoReposicao] = useState(false);

  const alunoAtivo = alunoParaEditar?.ativo !== 0;
  const idAlunoEditando =
    alunoParaEditar?.id_aluno ?? alunoParaEditar?.id ?? null;

  const carregarReposicoes = async () => {
    if (!idAlunoEditando) return;
    const lista = await buscarReposicoesPorAluno(Number(idAlunoEditando));
    setReposicoes(lista);
  };

  // Carrega turmas e reposições ao abrir edição
  useEffect(() => {
    if (!alunoParaEditar) return;
    buscarTodasTurmas().then(setTodasTurmas);
    carregarReposicoes();
  }, [alunoParaEditar]);

  const handleAgendarReposicao = async () => {
    if (!turmaSelecionadaReposicao || !dataReposicao) {
      toast.current?.show({
        severity: "warn",
        summary: "Aviso",
        detail: "Selecione a turma e a data da reposição.",
      });
      return;
    }
    setSalvandoReposicao(true);
    try {
      const res = await agendarReposicao(
        Number(idAlunoEditando),
        turmaSelecionadaReposicao,
        dataReposicao,
        observacaoReposicao || undefined,
      );
      if (res.sucesso) {
        toast.current?.show({
          severity: "success",
          summary: "Agendado",
          detail: res.mensagem,
        });
        setTurmaSelecionadaReposicao(null);
        setDataReposicao("");
        setObservacaoReposicao("");
        carregarReposicoes();
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Erro",
          detail: res.mensagem,
        });
      }
    } finally {
      setSalvandoReposicao(false);
    }
  };

  const handleCancelarReposicao = async (idReposicao: number) => {
    const res = await cancelarReposicao(idReposicao);
    if (res.sucesso) {
      toast.current?.show({
        severity: "info",
        summary: "Cancelada",
        detail: res.mensagem,
      });
      carregarReposicoes();
    } else {
      toast.current?.show({
        severity: "error",
        summary: "Erro",
        detail: res.mensagem,
      });
    }
  };

  const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const statusSeverity = (s: string) =>
    s === "AGENDADA" ? "info" : s === "REALIZADA" ? "success" : "secondary";

  const opcoesTurmasReposicao = todasTurmas.map((t) => ({
    label: `${DIAS[Number(t.diaSemana)]} ${String(Math.round(Number(t.horarioInicio))).padStart(2, "0")}h — ${t.modalidade}`,
    value: t.id_turma,
  }));

  // ── Carrega modalidades ────────────────────────────────────────────────────
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

  // Atualiza nome da modalidade quando o id muda (para calcular exigeResponsavel)
  useEffect(() => {
    const found = opcoesModalidades.find(
      (m: any) => m.id_modalidade === modalidade,
    );
    setNomeModalidadeSelecionada((found as any)?.modalidade ?? "");
  }, [modalidade, opcoesModalidades]);

  // ── Preenche formulário ao editar ──────────────────────────────────────────
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
    setEmail(a.email || "");
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

    // Responsável
    setNomeResp(a.nomeResponsavel || "");
    setTelefoneResp(formatPhone(a.telefoneResponsavel || ""));
    setDocumentoResp(formatCPF(a.documentoResponsavel || ""));
  }, [alunoParaEditar]);

  // ── Rascunho (localStorage) ────────────────────────────────────────────────

  // Carrega rascunho ao abrir (apenas para novo aluno)
  useEffect(() => {
    if (alunoParaEditar) return; // não carrega rascunho ao editar
    
    try {
      const rascunhoSalvo = localStorage.getItem(CHAVE_RASCUNHO);
      if (!rascunhoSalvo) return;

      const rascunho = JSON.parse(rascunhoSalvo);
      
      // Preenche os campos com o rascunho
      if (rascunho.nome) setNome(rascunho.nome);
      if (rascunho.telefone) setTelefone(rascunho.telefone);
      if (rascunho.email) setEmail(rascunho.email);
      if (rascunho.documento) setDocumento(rascunho.documento);
      if (rascunho.nascimento) setNascimento(rascunho.nascimento);
      if (rascunho.endereco) setEndereco(rascunho.endereco);
      if (rascunho.numero) setNumero(rascunho.numero);
      if (rascunho.bairro) setBairro(rascunho.bairro);
      if (rascunho.cidade) setCidade(rascunho.cidade);
      if (rascunho.modalidade) setModalidade(rascunho.modalidade);
      if (rascunho.diaVencimento !== null && rascunho.diaVencimento !== undefined) {
        setDiaVencimento(rascunho.diaVencimento);
      }
      if (rascunho.valorMensalidade) setValorMensalidade(rascunho.valorMensalidade);
      if (rascunho.nomeResp) setNomeResp(rascunho.nomeResp);
      if (rascunho.telefoneResp) setTelefoneResp(rascunho.telefoneResp);
      if (rascunho.documentoResp) setDocumentoResp(rascunho.documentoResp);

      toast.current?.show({
        severity: "info",
        summary: "Rascunho carregado",
        detail: "Dados do rascunho anterior foram restaurados.",
        life: 3000,
      });
    } catch (e) {
      console.error("Erro ao carregar rascunho:", e);
    }
  }, [alunoParaEditar]);

  // Salva rascunho automaticamente (debounce de 1s)
  useEffect(() => {
    if (alunoParaEditar) return; // não salva rascunho ao editar

    const timeoutId = setTimeout(() => {
      const dadosRascunho = {
        nome,
        telefone,
        email,
        documento,
        nascimento,
        endereco,
        numero,
        bairro,
        cidade,
        modalidade,
        diaVencimento,
        valorMensalidade,
        nomeResp,
        telefoneResp,
        documentoResp,
        salvoEm: new Date().toISOString(),
      };

      // Só salva se tiver pelo menos o nome preenchido
      if (nome.trim()) {
        localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(dadosRascunho));
        setTemRascunho(true);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [
    alunoParaEditar,
    nome,
    telefone,
    email,
    documento,
    nascimento,
    endereco,
    numero,
    bairro,
    cidade,
    modalidade,
    diaVencimento,
    valorMensalidade,
    nomeResp,
    telefoneResp,
    documentoResp,
  ]);

  const limparRascunho = () => {
    localStorage.removeItem(CHAVE_RASCUNHO);
    setTemRascunho(false);
    toast.current?.show({
      severity: "info",
      summary: "Rascunho limpo",
      detail: "O rascunho foi removido.",
      life: 2000,
    });
  };

  // ── Salvar ────────────────────────────────────────────────────────────────
  const executarSalvar = async () => {
    const strip = (s: string | null | undefined) =>
      s ? s.replace(/\D/g, "") : "";

    const dadosParaSalvar = {
      nome,
      telefone: strip(telefone),
      email,
      documento: strip(documento),
      nascimento,
      endereco,
      numero,
      bairro,
      cidade,
      modalidade,
      diaVencimento: diaVencimento === null ? null : Math.trunc(diaVencimento),
      valorMensalidade: valorMensalidade || 0,
      horariosFixos,
      responsavel: nomeResp.trim()
        ? {
            nome: nomeResp.trim(),
            telefone: strip(telefoneResp),
            documento: strip(documentoResp),
          }
        : undefined,
    };

    try {
      if (alunoParaEditar && (alunoParaEditar.id_aluno || alunoParaEditar.id)) {
        const idAluno = alunoParaEditar.id_aluno || alunoParaEditar.id;
        await atualizarAlunoCompleto(Number(idAluno), dadosParaSalvar);
        toast.current?.show({
          severity: "success",
          summary: "Sucesso",
          detail: "Aluno atualizado!",
          life: 3000,
        });
        setTimeout(() => {
          aoSalvar({ ...alunoParaEditar, ...dadosParaSalvar });
          aoFechar();
        }, 500);
      } else {
        await salvarAlunoCompleto(dadosParaSalvar);
        
        // Limpa o rascunho após salvar com sucesso
        localStorage.removeItem(CHAVE_RASCUNHO);
        setTemRascunho(false);
        
        toast.current?.show({
          severity: "success",
          summary: "Sucesso",
          detail: "Aluno salvo!",
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
          horariosFixos,
        };
        setTimeout(() => {
          aoSalvar(novoAluno);
          aoFechar();
        }, 500);
      }
    } catch (erro) {
      console.error("Erro ao salvar:", erro);
      toast.current?.show({
        severity: "error",
        summary: "Erro",
        detail: "Erro ao salvar o aluno.",
        life: 4000,
      });
    }
  };

  // ── Validações ──────────────────────────────────────────────────────────────
  const validarTelefone = (tel: string): boolean => {
    const digitos = tel.replace(/\D/g, "");
    return digitos.length === 0 || (digitos.length >= 10 && digitos.length <= 11);
  };

  const validarDataNascimento = (data: string): boolean => {
    if (!data) return true; // opcional
    const partes = data.split("/");
    if (partes.length !== 3) return false;
    const [dia, mes, ano] = partes.map(Number);
    if (!dia || !mes || !ano || ano < 1900 || ano > new Date().getFullYear()) return false;
    const dataObj = new Date(ano, mes - 1, dia);
    if (dataObj > new Date()) return false; // não pode ser futura
    return true;
  };

  const validarCPF = (cpf: string): boolean => {
    const digitos = cpf.replace(/\D/g, "");
    if (digitos.length !== 11) return false;
    // Verifica se todos os dígitos são iguais (CPF inválido)
    if (/^(\d)\1{10}$/.test(digitos)) return false;
    return true;
  };

  const validarMensalidade = (valor: number | null): boolean => {
    return valor === null || valor >= 0;
  };

  const lidarComSalvar = () => {
    const erros: string[] = [];
    const avisos: string[] = [];

    // Nome: obrigatório e mínimo 3 caracteres
    if (!nome || nome.trim().length < 3) {
      erros.push("Nome (mínimo 3 caracteres)");
    }

    // CPF: obrigatório e deve ter 11 dígitos
    if (!documento || documento.replace(/\D/g, "").length < 11) {
      erros.push("CPF (11 dígitos)");
    } else if (!validarCPF(documento)) {
      erros.push("CPF inválido");
    }

    // Telefone: se preenchido, deve ter 10 ou 11 dígitos
    if (telefone && !validarTelefone(telefone)) {
      avisos.push("Telefone incompleto (10 ou 11 dígitos)");
    }

    // Data de nascimento: se preenchida, deve ser válida e não futura
    if (nascimento && !validarDataNascimento(nascimento)) {
      erros.push("Data de nascimento inválida");
    }

    // Modalidade: obrigatória
    if (!modalidade) erros.push("Modalidade");

    // Dia de vencimento: obrigatório e entre 1-31
    if (!diaVencimento || diaVencimento < 1 || diaVencimento > 31) {
      erros.push("Dia de vencimento (1 a 31)");
    }

    // Mensalidade: não pode ser negativa
    if (!validarMensalidade(valorMensalidade)) {
      erros.push("Mensalidade não pode ser negativa");
    }

    // Responsável obrigatório para infantil/bebê
    if (precisaResponsavel) {
      if (!nomeResp.trim() || nomeResp.trim().length < 3) {
        erros.push("Nome do responsável (mínimo 3 caracteres)");
      }
      if (!documentoResp || documentoResp.replace(/\D/g, "").length < 11) {
        erros.push("CPF do responsável");
      } else if (!validarCPF(documentoResp)) {
        erros.push("CPF do responsável inválido");
      }
      if (telefoneResp && !validarTelefone(telefoneResp)) {
        avisos.push("Telefone do responsável incompleto");
      }
    }

    // Exibe erros bloqueantes
    if (erros.length > 0) {
      toast.current?.show({
        severity: "error",
        summary: "Campos obrigatórios",
        detail: `Corrija: ${erros.join(", ")}`,
        life: 4000,
      });
      return;
    }

    // Exibe avisos (não bloqueiam o salvamento)
    if (avisos.length > 0) {
      toast.current?.show({
        severity: "warn",
        summary: "Atenção",
        detail: avisos.join(", "),
        life: 4000,
      });
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

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-column gap-4 w-full">
      <Toast ref={toast} />

      <div className="flex justify-content-between align-items-center">
        <div>
          <h2 className="text-2xl font-bold m-0 text-900">
            {alunoParaEditar ? "Editar Aluno" : "Novo Aluno"}
          </h2>
          <p className="text-600 text-sm mt-1 mb-0">
            Preencha os dados do aluno abaixo
          </p>
        </div>
        {!alunoParaEditar && temRascunho && (
          <Button
            label="Limpar Rascunho"
            icon="pi pi-trash"
            className="p-button-text p-button-danger p-button-sm"
            onClick={limparRascunho}
          />
        )}
      </div>

      {/* ── Dados do Aluno ── */}
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
                htmlFor="email"
                className="font-semibold block mb-2 text-900"
              >
                E-mail
              </label>
              <InputText
                id="email"
                value={email}
                placeholder="exemplo@email.com"
                onChange={(e) => setEmail(e.target.value)}
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
                mask="99/99/9999"
                placeholder="dd/mm/yyyy"
                onChange={(e: InputMaskChangeEvent) =>
                  setNascimento(e.target.value ?? "")
                }
                className="w-full"
              />
            </div>

            <div className="col-12 md:col-6">
              <label className="font-semibold block mb-2 text-900">
                Modalidade
              </label>
              <Dropdown
                appendTo={document.body}
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

        {/* ── Seção Responsável ── */}
        <Divider className="m-0" />
        <div className="p-4">
          <div className="flex align-items-center gap-2 mb-3">
            <i className="pi pi-user-edit text-primary text-lg" />
            <span className="font-bold text-900">Responsável</span>
            {precisaResponsavel ? (
              <span
                className="text-xs font-semibold px-2 py-1 border-round"
                style={{
                  background: "#fef2f2",
                  color: "#b91c1c",
                  border: "1px solid #fca5a5",
                }}
              >
                Obrigatório para esta modalidade
              </span>
            ) : (
              <span className="text-xs text-400">(opcional)</span>
            )}
          </div>

          {precisaResponsavel && (
            <Message
              severity="info"
              className="w-full mb-3"
              text="Modalidades Natação Bebê e Natação Infantil exigem o cadastro de um responsável."
            />
          )}

          <div className="grid">
            <div className="col-12">
              <label className="font-semibold block mb-2 text-900">
                Nome do Responsável{" "}
                {precisaResponsavel && <span className="text-red-500">*</span>}
              </label>
              <InputText
                value={nomeResp}
                placeholder="Nome completo do responsável"
                onChange={(e) => setNomeResp(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="col-12 md:col-6">
              <label className="font-semibold block mb-2 text-900">
                CPF do Responsável{" "}
                {precisaResponsavel && <span className="text-red-500">*</span>}
              </label>
              <InputMask
                value={documentoResp}
                mask="999.999.999-99"
                placeholder="000.000.000-00"
                onChange={(e: InputMaskChangeEvent) =>
                  setDocumentoResp(e.target.value ?? "")
                }
                className="w-full"
              />
            </div>

            <div className="col-12 md:col-6">
              <label className="font-semibold block mb-2 text-900">
                Telefone do Responsável
              </label>
              <InputMask
                value={telefoneResp}
                mask="(99) 99999-9999"
                placeholder="(00) 00000-0000"
                onChange={(e: InputMaskChangeEvent) =>
                  setTelefoneResp(e.target.value ?? "")
                }
                className="w-full"
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

      {/* ── Seção Reposição (só no modo edição) ── */}
      {alunoParaEditar && (
        <Card className="surface-card border-1 surface-border p-0">
          <div className="p-4">
            <div className="flex align-items-center gap-2 mb-3">
              <i className="pi pi-calendar-plus text-primary text-lg" />
              <span className="font-bold text-900">Reposição de Aula</span>
            </div>

            {!alunoAtivo ? (
              <Message
                severity="warn"
                className="w-full"
                text="Alunos inativos não podem agendar reposições."
              />
            ) : (
              <div className="grid">
                <div className="col-12 md:col-5">
                  <label className="font-semibold block mb-2 text-900 text-sm">
                    Turma
                  </label>
                  <Dropdown
                    appendTo={document.body}
                    value={turmaSelecionadaReposicao}
                    options={opcoesTurmasReposicao}
                    onChange={(e) => setTurmaSelecionadaReposicao(e.value)}
                    placeholder="Selecione a turma..."
                    className="w-full"
                    filter
                  />
                </div>
                <div className="col-12 md:col-3">
                  <label className="font-semibold block mb-2 text-900 text-sm">
                    Data
                  </label>
                  <input
                    type="date"
                    value={dataReposicao}
                    onChange={(e) => setDataReposicao(e.target.value)}
                    className="p-inputtext p-component w-full"
                    style={{ padding: "0.5rem" }}
                    min={
                      new Date(Date.now() + 86400000)
                        .toISOString()
                        .split("T")[0]
                    }
                  />
                </div>
                <div className="col-12 md:col-4">
                  <label className="font-semibold block mb-2 text-900 text-sm">
                    Observação (opcional)
                  </label>
                  <InputText
                    value={observacaoReposicao}
                    onChange={(e) => setObservacaoReposicao(e.target.value)}
                    placeholder="Ex: aula perdida em 10/06"
                    className="w-full"
                  />
                </div>
                <div className="col-12 flex justify-content-end">
                  <Button
                    label="Agendar Reposição"
                    icon={
                      salvandoReposicao ? "pi pi-spin pi-spinner" : "pi pi-plus"
                    }
                    className="p-button-sm p-button-outlined"
                    disabled={
                      salvandoReposicao ||
                      !turmaSelecionadaReposicao ||
                      !dataReposicao
                    }
                    onClick={handleAgendarReposicao}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Lista de reposições do aluno */}
          {reposicoes.length > 0 && (
            <>
              <Divider className="m-0" />
              <div className="p-4">
                <span className="text-xs font-bold text-600 uppercase block mb-2">
                  Reposições cadastradas
                </span>
                <div className="flex flex-column gap-2">
                  {reposicoes.map((r) => {
                    const [ano, mes, dia] = r.data_reposicao.split("-");
                    return (
                      <div
                        key={r.id_reposicao}
                        className="flex align-items-center justify-content-between p-2 border-round border-1 surface-border"
                      >
                        <div className="flex align-items-center gap-2">
                          <Tag
                            value={r.status}
                            severity={statusSeverity(r.status)}
                            className="text-xs"
                          />
                          <span className="text-sm font-semibold">{`${dia}/${mes}/${ano}`}</span>
                          <span className="text-sm text-600">
                            {DIAS[Number(r.dia_semana)]}{" "}
                            {String(r.horario_inicio).padStart(2, "0")}h —{" "}
                            {r.modalidade}
                          </span>
                          {r.observacao && (
                            <span className="text-xs text-400">
                              ({r.observacao})
                            </span>
                          )}
                        </div>
                        {r.status === "AGENDADA" && (
                          <Button
                            icon="pi pi-times"
                            className="p-button-text p-button-danger p-button-sm"
                            tooltip="Cancelar reposição"
                            tooltipOptions={{ position: "left" }}
                            onClick={() =>
                              handleCancelarReposicao(r.id_reposicao)
                            }
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
