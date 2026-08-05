import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { Divider } from "primereact/divider";
import { InputText } from "primereact/inputtext";
import { useSession } from "../contexts/SessionContext";
import {
  alterarPinFuncionario,
  buscarLogAcesso,
  type LogAcesso,
} from "../services/FuncionarioService";

export default function Perfil() {
  const toast = useRef<Toast>(null);
  const { sessao } = useSession();

  const [pinAtual,     setPinAtual]     = useState("");
  const [novoPin,      setNovoPin]      = useState("");
  const [confirmarPin, setConfirmarPin] = useState("");
  const [salvando,     setSalvando]     = useState(false);
  const [logAcesso,    setLogAcesso]    = useState<LogAcesso[]>([]);
  const [carregando,   setCarregando]   = useState(false);

  const carregarLog = useCallback(async () => {
    if (!sessao) return;
    setCarregando(true);
    try {
      setLogAcesso(await buscarLogAcesso(sessao.id_funcionario, 30));
    } catch {
      // silencioso
    } finally {
      setCarregando(false);
    }
  }, [sessao]);

  useEffect(() => {
    carregarLog();
  }, [carregarLog]);

  const handleAlterarPin = async () => {
    if (!sessao) return;
    if (novoPin !== confirmarPin) {
      toast.current?.show({ severity: "error", summary: "Erro", detail: "Os PINs não coincidem.", life: 3000 });
      return;
    }
    setSalvando(true);
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
      setSalvando(false);
    }
  };

  if (!sessao) return null;

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto" }}>
      <Toast ref={toast} />

      <div className="mb-4">
        <h2 className="text-2xl font-bold m-0 text-900">Minha Conta</h2>
        <p className="text-sm text-500 mt-1 m-0">Gerencie seu PIN de acesso e veja seus acessos recentes</p>
      </div>

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
            label={salvando ? "Salvando..." : "Alterar PIN"}
            icon="pi pi-key"
            className="p-button-outlined p-button-sm"
            onClick={handleAlterarPin}
            loading={salvando}
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
          <Button label="Atualizar" icon="pi pi-refresh" className="p-button-text p-button-sm" onClick={carregarLog} loading={carregando} />
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
    </div>
  );
}
