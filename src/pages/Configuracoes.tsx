import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { getVersion } from "@tauri-apps/api/app";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { Divider } from "primereact/divider";
import { Tag } from "primereact/tag";
import { InputText } from "primereact/inputtext";
import { Dialog } from "primereact/dialog";
import {
  executarBackupAutomatico,
  buscarHistoricoBackups,
  listarBackupsDisponiveis,
  restaurarBackup,
  type BackupDisponivel,
} from "../services/BackupService";
import { useSession } from "../contexts/SessionContext";
import {
  listarFuncionarios,
  criarFuncionario,
  atualizarNomeFuncionario,
  alterarAtivoFuncionario,
  alterarPinFuncionario,
  buscarLogAcesso,
  type Funcionario,
  type LogAcesso,
} from "../services/FuncionarioService";

type Aba = "configuracoes" | "minha-conta";

export default function Configuracoes() {
  const toast = useRef<Toast>(null);
  const { sessao } = useSession();
  const location = useLocation();

  // ── Aba ativa ─────────────────────────────────────────────────────────────
  const [abaAtiva, setAbaAtiva] = useState<Aba>(() => {
    const hash = location.hash.replace("#", "") as Aba;
    return hash === "minha-conta" ? "minha-conta" : "configuracoes";
  });

  // ── Versão do app (lida do executável, nunca do banco) ────────────────────
  const [versaoApp, setVersaoApp] = useState("...");
  useEffect(() => {
    getVersion().then(setVersaoApp).catch(() => setVersaoApp("—"));
  }, []);

  useEffect(() => {
    const hash = location.hash.replace("#", "") as Aba;
    if (hash === "minha-conta" || hash === "configuracoes") {
      setAbaAtiva(hash);
    }
  }, [location.hash]);

  // ── Funcionários ───────────────────────────────────────────────────────────
  const [funcionarios,     setFuncionarios]     = useState<Funcionario[]>([]);
  const [carregandoFunc,   setCarregandoFunc]   = useState(false);
  const [novoNomeFunc,     setNovoNomeFunc]      = useState("");
  const [novoPinFunc,      setNovoPinFunc]       = useState("");
  const [criandoFunc,      setCriandoFunc]       = useState(false);
  const [dialogEditFunc,   setDialogEditFunc]    = useState(false);
  const [funcEditando,     setFuncEditando]      = useState<Funcionario | null>(null);
  const [nomeEditando,     setNomeEditando]      = useState("");
  const [salvandoEditFunc, setSalvandoEditFunc]  = useState(false);

  const carregarFuncionarios = useCallback(async () => {
    setCarregandoFunc(true);
    try {
      setFuncionarios(await listarFuncionarios());
    } catch {
      toast.current?.show({ severity: "error", summary: "Erro", detail: "Não foi possível carregar funcionários.", life: 3000 });
    } finally {
      setCarregandoFunc(false);
    }
  }, []);

  const handleCriarFuncionario = async () => {
    if (!novoNomeFunc.trim()) return;
    if (!/^\d{4}$/.test(novoPinFunc)) {
      toast.current?.show({ severity: "warn", summary: "PIN inválido", detail: "O PIN deve ter exatamente 4 dígitos.", life: 3000 });
      return;
    }
    setCriandoFunc(true);
    try {
      await criarFuncionario(novoNomeFunc.trim(), novoPinFunc);
      setNovoNomeFunc("");
      setNovoPinFunc("");
      await carregarFuncionarios();
      toast.current?.show({ severity: "success", summary: "Funcionário criado", detail: `${novoNomeFunc.trim()} adicionado.`, life: 3000 });
    } catch {
      toast.current?.show({ severity: "error", summary: "Erro", detail: "Não foi possível criar o funcionário.", life: 3000 });
    } finally {
      setCriandoFunc(false);
    }
  };

  const abrirEditarFunc = (f: Funcionario) => {
    setFuncEditando(f);
    setNomeEditando(f.nome);
    setDialogEditFunc(true);
  };

  const handleSalvarEditFunc = async () => {
    if (!funcEditando || !nomeEditando.trim()) return;
    setSalvandoEditFunc(true);
    try {
      await atualizarNomeFuncionario(funcEditando.id_funcionario, nomeEditando.trim());
      await carregarFuncionarios();
      setDialogEditFunc(false);
      toast.current?.show({ severity: "success", summary: "Nome atualizado", detail: "Nome do funcionário alterado.", life: 3000 });
    } catch {
      toast.current?.show({ severity: "error", summary: "Erro", detail: "Não foi possível salvar.", life: 3000 });
    } finally {
      setSalvandoEditFunc(false);
    }
  };

  const handleToggleAtivo = async (f: Funcionario) => {
    await alterarAtivoFuncionario(f.id_funcionario, !f.ativo);
    await carregarFuncionarios();
    toast.current?.show({
      severity: f.ativo ? "warn" : "success",
      summary: f.ativo ? "Desativado" : "Reativado",
      detail: `${f.nome} foi ${f.ativo ? "desativado" : "reativado"}.`,
      life: 3000,
    });
  };

  // ── Backup ─────────────────────────────────────────────────────────────────
  const [backupEmAndamento,      setBackupEmAndamento]      = useState(false);
  const [historico,              setHistorico]              = useState<any[]>([]);
  const [carregandoHistorico,    setCarregandoHistorico]    = useState(false);
  const [backupsDisponiveis,     setBackupsDisponiveis]     = useState<BackupDisponivel[]>([]);
  const [carregandoBackups,      setCarregandoBackups]      = useState(false);
  const [restaurando,            setRestaurando]            = useState(false);
  const [dialogRestaurarVisible, setDialogRestaurarVisible] = useState(false);
  const [backupSelecionado,      setBackupSelecionado]      = useState<BackupDisponivel | null>(null);

  const carregarHistorico = async () => {
    setCarregandoHistorico(true);
    try {
      setHistorico(await buscarHistoricoBackups());
    } catch (e) {
      console.error("Erro ao carregar histórico:", e);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  const carregarBackupsDisponiveis = async () => {
    setCarregandoBackups(true);
    try {
      setBackupsDisponiveis(await listarBackupsDisponiveis());
    } catch (e) {
      console.error("Erro ao carregar backups:", e);
    } finally {
      setCarregandoBackups(false);
    }
  };

  const executarBackup = async () => {
    setBackupEmAndamento(true);
    try {
      const resultado = await executarBackupAutomatico();
      if (!resultado.sucesso) throw new Error(resultado.mensagem);
      toast.current?.show({ severity: "success", summary: "Backup concluído", detail: "Backup salvo com sucesso!", life: 3000 });
      await carregarHistorico();
    } catch (erro) {
      const msg = erro instanceof Error ? erro.message : String(erro);
      toast.current?.show({ severity: "error", summary: "Erro ao criar backup", detail: msg, life: 4000, sticky: false });
    } finally {
      setBackupEmAndamento(false);
    }
  };

  const confirmarRestauracao = (backup: BackupDisponivel) => {
    setBackupSelecionado(backup);
    setDialogRestaurarVisible(true);
  };

  const executarRestauracao = async () => {
    if (!backupSelecionado) return;
    setRestaurando(true);
    try {
      const resultado = await restaurarBackup(backupSelecionado.caminho);
      if (resultado.sucesso) {
        toast.current?.show({ severity: "success", summary: "Backup restaurado", detail: "Reinicie o aplicativo para aplicar as mudanças.", life: 4000 });
        setDialogRestaurarVisible(false);
      } else {
        throw new Error(resultado.mensagem);
      }
    } catch (erro) {
      const msg = erro instanceof Error ? erro.message : String(erro);
      toast.current?.show({ severity: "error", summary: "Erro ao restaurar", detail: msg, life: 5000 });
    } finally {
      setRestaurando(false);
    }
  };

  const formatarData = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return isoStr; }
  };

  const formatarDataBackup = (timestamp: string) => {
    try {
      const ts = parseInt(timestamp);
      if (isNaN(ts)) return timestamp;
      return new Date(ts * 1000).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return timestamp; }
  };

  // ── Minha Conta (PIN) ──────────────────────────────────────────────────────
  const [pinAtual,     setPinAtual]     = useState("");
  const [novoPin,      setNovoPin]      = useState("");
  const [confirmarPin, setConfirmarPin] = useState("");
  const [salvandoPin,  setSalvandoPin]  = useState(false);
  const [logAcesso,    setLogAcesso]    = useState<LogAcesso[]>([]);
  const [carregandoLog, setCarregandoLog] = useState(false);

  const carregarLogAcesso = useCallback(async () => {
    if (!sessao) return;
    setCarregandoLog(true);
    try {
      setLogAcesso(await buscarLogAcesso(sessao.id_funcionario, 30));
    } catch {
      // silencioso
    } finally {
      setCarregandoLog(false);
    }
  }, [sessao]);

  const handleAlterarPin = async () => {
    if (!sessao) return;
    if (novoPin !== confirmarPin) {
      toast.current?.show({ severity: "error", summary: "Erro", detail: "Os PINs não coincidem.", life: 3000 });
      return;
    }
    setSalvandoPin(true);
    try {
      const res = await alterarPinFuncionario(sessao.id_funcionario, pinAtual, novoPin);
      if (res.sucesso) {
        toast.current?.show({ severity: "success", summary: "PIN alterado", detail: res.mensagem, life: 3000 });
        setPinAtual("");
        setNovoPin("");
        setConfirmarPin("");
      } else {
        toast.current?.show({ severity: "error", summary: "Erro", detail: res.mensagem, life: 3000 });
      }
    } catch {
      toast.current?.show({ severity: "error", summary: "Erro", detail: "Não foi possível alterar o PIN.", life: 3000 });
    } finally {
      setSalvandoPin(false);
    }
  };

  // ── Carregamento inicial ───────────────────────────────────────────────────
  useEffect(() => {
    carregarHistorico();
    carregarBackupsDisponiveis();
    carregarFuncionarios();
    carregarLogAcesso();
  }, [carregarFuncionarios, carregarLogAcesso]);

  // ── Estilo dos botões de aba ───────────────────────────────────────────────
  const tabStyle = (aba: Aba): React.CSSProperties => ({
    padding: "0.5rem 1.25rem",
    border: "none",
    borderBottom: abaAtiva === aba ? "2px solid var(--color-cyan-600, #0891b2)" : "2px solid transparent",
    background: "transparent",
    cursor: "pointer",
    fontWeight: abaAtiva === aba ? 700 : 500,
    fontSize: "0.9rem",
    color: abaAtiva === aba ? "var(--color-cyan-600, #0891b2)" : "var(--color-text-secondary, #6b7280)",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  });

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <Toast ref={toast} />

      <div className="mb-4">
        <h2 className="text-2xl font-bold m-0 text-900">Configurações</h2>
        <p className="text-sm text-500 mt-1 m-0">
          Gerencie funcionários, dados da escola, backup e configurações do sistema
        </p>
      </div>

      {/* ── Abas ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--color-border, #e5e7eb)",
          marginBottom: "1.5rem",
          gap: "0.25rem",
        }}
      >
        <button style={tabStyle("configuracoes")} onClick={() => setAbaAtiva("configuracoes")}>
          <i className="pi pi-sliders-h mr-2" style={{ fontSize: "0.875rem" }} />
          Configurações
        </button>
        <button style={tabStyle("minha-conta")} onClick={() => setAbaAtiva("minha-conta")}>
          <i className="pi pi-user mr-2" style={{ fontSize: "0.875rem" }} />
          Minha Conta
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          ABA: CONFIGURAÇÕES
      ════════════════════════════════════════════════════════════════════ */}
      {abaAtiva === "configuracoes" && (
        <>
          {/* ── Funcionários ──────────────────────────────────────────────── */}
          <Card className="mb-4 shadow-1">
            <div className="flex align-items-center justify-content-between mb-3">
              <div className="flex align-items-center gap-2">
                <i className="pi pi-users text-primary text-xl" />
                <h3 className="m-0 text-lg font-bold text-900">Funcionários</h3>
              </div>
              <Button label="Atualizar" icon="pi pi-refresh" className="p-button-text p-button-sm" onClick={carregarFuncionarios} loading={carregandoFunc} />
            </div>
            <p className="text-sm text-600 mb-4">
              Gerencie quem pode acessar o sistema. O log de auditoria registra quem realizou cada sessão.
            </p>

            <div className="flex gap-2 mb-4 flex-wrap">
              <InputText
                value={novoNomeFunc}
                onChange={e => setNovoNomeFunc(e.target.value)}
                placeholder="Nome do funcionário"
                style={{ flex: 1, minWidth: 160 }}
                maxLength={60}
              />
              <InputText
                value={novoPinFunc}
                onChange={e => setNovoPinFunc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="PIN (4 dígitos)"
                style={{ width: 140 }}
                maxLength={4}
              />
              <Button
                label={criandoFunc ? "Criando..." : "Adicionar"}
                icon="pi pi-plus"
                className="p-button-success p-button-sm"
                onClick={handleCriarFuncionario}
                loading={criandoFunc}
                disabled={!novoNomeFunc.trim() || novoPinFunc.length !== 4}
              />
            </div>

            {funcionarios.length === 0 ? (
              <div className="text-center py-4 text-500">
                <i className="pi pi-users text-3xl mb-2" style={{ display: "block" }} />
                <p className="m-0 text-sm">Nenhum funcionário cadastrado.</p>
              </div>
            ) : (
              <div className="flex flex-column gap-2">
                {funcionarios.map(f => (
                  <div
                    key={f.id_funcionario}
                    className="flex align-items-center justify-content-between p-3 border-round border-1 surface-border"
                    style={{ background: "var(--color-bg)", opacity: f.ativo ? 1 : 0.55 }}
                  >
                    <div className="flex align-items-center gap-3">
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, var(--color-cyan-600), var(--color-cyan-400))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                        {f.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-900">{f.nome}</div>
                        <div className="text-xs text-500">
                          {f.ativo ? "Ativo" : "Inativo"} · criado em {f.criado_em ? new Date(f.criado_em).toLocaleDateString("pt-BR") : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button icon="pi pi-pencil" className="p-button-text p-button-sm p-button-rounded" tooltip="Editar nome" onClick={() => abrirEditarFunc(f)} />
                      <Button
                        icon={f.ativo ? "pi pi-ban" : "pi pi-check-circle"}
                        className={`p-button-text p-button-sm p-button-rounded ${f.ativo ? "p-button-warning" : "p-button-success"}`}
                        tooltip={f.ativo ? "Desativar" : "Reativar"}
                        onClick={() => handleToggleAtivo(f)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ── Backup do Banco de Dados ─────────────────────────────────── */}
          <Card className="mb-4 shadow-1">
            <div className="flex align-items-center gap-2 mb-3">
              <i className="pi pi-database text-primary text-xl" />
              <h3 className="m-0 text-lg font-bold text-900">Backup do Banco de Dados</h3>
            </div>
            <p className="text-sm text-600 mb-4">
              Crie uma cópia de segurança do banco de dados. Recomendamos fazer backup regularmente.
            </p>
            <div className="flex justify-content-end mb-4">
              <Button
                label={backupEmAndamento ? "Criando backup..." : "Fazer Backup Agora"}
                icon={backupEmAndamento ? "pi pi-spin pi-spinner" : "pi pi-save"}
                className="p-button-success"
                onClick={executarBackup}
                loading={backupEmAndamento}
              />
            </div>

            <Divider className="my-4" />

            <div className="flex align-items-center justify-content-between mb-3">
              <h4 className="m-0 text-md font-bold text-900">Histórico de Backups</h4>
              <Button label="Atualizar" icon="pi pi-refresh" className="p-button-text p-button-sm" onClick={carregarHistorico} loading={carregandoHistorico} />
            </div>

            {historico.length === 0 ? (
              <div className="text-center py-4 text-500">
                <i className="pi pi-inbox text-3xl mb-2" style={{ display: "block" }} />
                <p className="m-0 text-sm">Nenhum backup registrado ainda.</p>
              </div>
            ) : (
              <div className="flex flex-column gap-2">
                {historico.map((backup) => (
                  <div key={backup.id_backup} className="flex align-items-center justify-content-between p-3 border-round border-1 surface-border" style={{ background: "var(--color-bg)" }}>
                    <div className="flex align-items-center gap-3">
                      <i className="pi pi-file text-primary" />
                      <div>
                        <div className="text-sm font-semibold text-900">{backup.nome_arquivo}</div>
                        <div className="text-xs text-500">{formatarData(backup.criado_em)}{backup.tamanho_kb && ` • ${backup.tamanho_kb} KB`}</div>
                      </div>
                    </div>
                    <Tag value={backup.sucesso ? "Sucesso" : "Falha"} severity={backup.sucesso ? "success" : "danger"} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ── Restaurar Backup ───────────────────────────────────────── */}
          <Card className="mb-4 shadow-1">
            <div className="flex align-items-center gap-2 mb-3">
              <i className="pi pi-refresh text-primary text-xl" />
              <h3 className="m-0 text-lg font-bold text-900">Restaurar Backup</h3>
            </div>
            <p className="text-sm text-600 mb-4">
              Selecione um backup para restaurar. Um backup de segurança será criado automaticamente antes.
            </p>
            <div className="flex align-items-center justify-content-between mb-3">
              <h4 className="m-0 text-md font-bold text-900">Backups Disponíveis</h4>
              <Button label="Atualizar" icon="pi pi-refresh" className="p-button-text p-button-sm" onClick={carregarBackupsDisponiveis} loading={carregandoBackups} />
            </div>
            {backupsDisponiveis.length === 0 ? (
              <div className="text-center py-4 text-500">
                <i className="pi pi-inbox text-3xl mb-2" style={{ display: "block" }} />
                <p className="m-0 text-sm">Nenhum backup encontrado.</p>
              </div>
            ) : (
              <div className="flex flex-column gap-2">
                {backupsDisponiveis.map((backup, idx) => (
                  <div key={idx} className="flex align-items-center justify-content-between p-3 border-round border-1 surface-border" style={{ background: "var(--color-bg)" }}>
                    <div className="flex align-items-center gap-3">
                      <i className="pi pi-database text-primary" />
                      <div>
                        <div className="text-sm font-semibold text-900">{backup.nome}</div>
                        <div className="text-xs text-500">{formatarDataBackup(backup.data_modificacao)}{backup.tamanho_kb > 0 && ` • ${backup.tamanho_kb} KB`}</div>
                      </div>
                    </div>
                    <Button label="Restaurar" icon="pi pi-refresh" className="p-button-sm p-button-warning" onClick={() => confirmarRestauracao(backup)} loading={restaurando} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ── Informações do Sistema ─────────────────────────────────── */}
          <Card className="shadow-1">
            <div className="flex align-items-center gap-2 mb-3">
              <i className="pi pi-info-circle text-primary text-xl" />
              <h3 className="m-0 text-lg font-bold text-900">Informações do Sistema</h3>
            </div>
            <div className="grid">
              <div className="col-12 md:col-6">
                <div className="text-xs font-semibold text-600 uppercase mb-1">Versão</div>
                <div className="text-sm font-bold text-900">{versaoApp}</div>
              </div>
              <div className="col-12 md:col-6">
                <div className="text-xs font-semibold text-600 uppercase mb-1">Banco de Dados</div>
                <div className="text-sm font-bold text-900">SQLite</div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          ABA: MINHA CONTA
      ════════════════════════════════════════════════════════════════════ */}
      {abaAtiva === "minha-conta" && sessao && (
        <>
          <Card className="mb-4 shadow-1">
            {/* Avatar + nome */}
            <div className="flex align-items-center gap-3 mb-4">
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--color-cyan-600), var(--color-cyan-400))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.4rem", fontWeight: 700, color: "#fff", flexShrink: 0,
              }}>
                {sessao.nome.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-lg font-bold text-900">{sessao.nome}</div>
                <div className="text-xs text-500">Sessão ativa</div>
              </div>
            </div>

            <Divider className="my-3" />

            {/* Alterar PIN */}
            <h4 className="text-sm font-bold text-900 mb-3 mt-0">Alterar PIN</h4>
            <div className="grid mb-4">
              <div className="col-12 md:col-4">
                <label className="block text-xs font-semibold text-600 mb-2 uppercase">PIN Atual</label>
                <InputText
                  type="password"
                  value={pinAtual}
                  onChange={e => setPinAtual(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  maxLength={4}
                  className="w-full"
                />
              </div>
              <div className="col-12 md:col-4">
                <label className="block text-xs font-semibold text-600 mb-2 uppercase">Novo PIN</label>
                <InputText
                  type="password"
                  value={novoPin}
                  onChange={e => setNovoPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  maxLength={4}
                  className="w-full"
                />
              </div>
              <div className="col-12 md:col-4">
                <label className="block text-xs font-semibold text-600 mb-2 uppercase">Confirmar PIN</label>
                <InputText
                  type="password"
                  value={confirmarPin}
                  onChange={e => setConfirmarPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  maxLength={4}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex justify-content-end">
              <Button
                label={salvandoPin ? "Salvando..." : "Alterar PIN"}
                icon="pi pi-key"
                className="p-button-outlined p-button-sm"
                onClick={handleAlterarPin}
                loading={salvandoPin}
                disabled={!pinAtual || novoPin.length !== 4 || novoPin !== confirmarPin}
              />
            </div>
          </Card>

          {/* Histórico de acessos */}
          <Card className="shadow-1">
            <div className="flex align-items-center justify-content-between mb-3">
              <div className="flex align-items-center gap-2">
                <i className="pi pi-history text-primary text-xl" />
                <h3 className="m-0 text-lg font-bold text-900">Últimos Acessos</h3>
              </div>
              <Button label="Atualizar" icon="pi pi-refresh" className="p-button-text p-button-sm" onClick={carregarLogAcesso} loading={carregandoLog} />
            </div>

            {logAcesso.length === 0 ? (
              <div className="text-center py-4 text-500">
                <i className="pi pi-clock text-3xl mb-2" style={{ display: "block" }} />
                <p className="m-0 text-sm">Nenhum acesso registrado ainda.</p>
              </div>
            ) : (
              <div className="flex flex-column gap-1">
                {logAcesso.map(log => (
                  <div
                    key={log.id_log}
                    className="flex align-items-center justify-content-between p-3 border-round border-1 surface-border"
                    style={{ background: "var(--color-bg)" }}
                  >
                    <div className="flex align-items-center gap-2">
                      <i
                        className={`pi ${log.tipo === "LOGIN" ? "pi-sign-in" : "pi-sign-out"}`}
                        style={{ color: log.tipo === "LOGIN" ? "var(--color-success)" : "var(--color-text-secondary)", fontSize: "1rem" }}
                      />
                      <span className="text-sm font-semibold text-900">
                        {log.tipo === "LOGIN" ? "Entrada" : "Saída"}
                      </span>
                    </div>
                    <span className="text-xs text-500">
                      {new Date(log.ocorrido_em).toLocaleString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {/* ── Dialog: confirmar restauração ───────────────────────────────── */}
      <Dialog
        header="Confirmar Restauração de Backup"
        visible={dialogRestaurarVisible}
        style={{ width: "450px" }}
        modal
        onHide={() => { setDialogRestaurarVisible(false); setBackupSelecionado(null); }}
      >
        <div className="flex flex-column gap-3 pt-3">
          <div className="flex align-items-center gap-3 p-3 border-round" style={{ background: "var(--color-warning, #f59e0b)", borderRadius: 6 }}>
            <i className="pi pi-exclamation-triangle text-2xl" style={{ color: "#000", flexShrink: 0 }} />
            <div>
              <div className="font-semibold text-sm" style={{ color: "#000" }}>Atenção!</div>
              <div className="text-xs" style={{ color: "#000" }}>Esta ação substituirá o banco de dados atual.</div>
            </div>
          </div>
          {backupSelecionado && (
            <div className="p-3 border-round border-1 surface-border">
              <div className="text-xs text-500 mb-1">Backup selecionado:</div>
              <div className="text-sm font-semibold text-900">{backupSelecionado.nome}</div>
              <div className="text-xs text-500 mt-1">{formatarDataBackup(backupSelecionado.data_modificacao)}{backupSelecionado.tamanho_kb > 0 && ` • ${backupSelecionado.tamanho_kb} KB`}</div>
            </div>
          )}
          <p className="text-sm text-600 m-0">
            Um backup de segurança será criado antes da restauração. Após confirmar, reinicie o aplicativo.
          </p>
          <div className="flex justify-content-end gap-2 mt-3">
            <Button label="Cancelar" icon="pi pi-times" className="p-button-text" onClick={() => { setDialogRestaurarVisible(false); setBackupSelecionado(null); }} />
            <Button label="Confirmar Restauração" icon="pi pi-check" className="p-button-warning" onClick={executarRestauracao} loading={restaurando} />
          </div>
        </div>
      </Dialog>

      {/* ── Dialog: editar nome de funcionário ──────────────────────────── */}
      <Dialog
        header="Editar Funcionário"
        visible={dialogEditFunc}
        style={{ width: "400px" }}
        modal
        onHide={() => setDialogEditFunc(false)}
      >
        <div className="flex flex-column gap-3 pt-3">
          <div>
            <label className="block text-sm font-semibold text-900 mb-2">Nome</label>
            <InputText value={nomeEditando} onChange={e => setNomeEditando(e.target.value)} className="w-full" maxLength={60} autoFocus />
          </div>
          <div className="flex justify-content-end gap-2 mt-2">
            <Button label="Cancelar" icon="pi pi-times" className="p-button-text" onClick={() => setDialogEditFunc(false)} />
            <Button label="Salvar" icon="pi pi-check" className="p-button-success" onClick={handleSalvarEditFunc} loading={salvandoEditFunc} disabled={!nomeEditando.trim()} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
