import { useState, useRef } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { InputSwitch } from "primereact/inputswitch";
import { Divider } from "primereact/divider";
import { Tag } from "primereact/tag";
import {
  criarBackup,
  registrarBackup,
  buscarHistoricoBackups,
} from "../services/BackupService";

export default function Configuracoes() {
  const toast = useRef<Toast>(null);
  const [caminhoBackup, setCaminhoBackup] = useState("");
  const [backupEmAndamento, setBackupEmAndamento] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  
  // Opções de proteção
  const [protegerBackup, setProtegerBackup] = useState(false);
  const [senhaBackup, setSenhaBackup] = useState("");

  const carregarHistorico = async () => {
    setCarregandoHistorico(true);
    try {
      const dados = await buscarHistoricoBackups();
      setHistorico(dados);
    } catch (erro) {
      console.error("Erro ao carregar histórico:", erro);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  const executarBackup = async () => {
    if (!caminhoBackup) {
      toast.current?.show({
        severity: "warn",
        summary: "Aviso",
        detail: "Digite um caminho para salvar o backup.",
      });
      return;
    }

    if (protegerBackup && !senhaBackup) {
      toast.current?.show({
        severity: "warn",
        summary: "Aviso",
        detail: "Digite uma senha para proteger o backup.",
      });
      return;
    }

    setBackupEmAndamento(true);
    try {
      // Cria backup diretamente no caminho especificado
      const resultado = await criarBackup(caminhoBackup, protegerBackup ? senhaBackup : undefined);

      if (!resultado.sucesso) {
        throw new Error(resultado.mensagem);
      }

      // Registra no histórico
      await registrarBackup(caminhoBackup);

      toast.current?.show({
        severity: "success",
        summary: "Backup concluído",
        detail: protegerBackup 
          ? `Backup protegido por senha salvo em: ${caminhoBackup}`
          : `Backup salvo em: ${caminhoBackup}`,
        life: 5000,
      });

      // Recarrega histórico
      await carregarHistorico();
    } catch (erro) {
      console.error("Erro ao fazer backup:", erro);
      toast.current?.show({
        severity: "error",
        summary: "Erro",
        detail: `Falha ao criar backup: ${erro instanceof Error ? erro.message : String(erro)}`,
        life: 5000,
      });
    } finally {
      setBackupEmAndamento(false);
    }
  };

  const formatarData = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <Toast ref={toast} />

      <div className="mb-4">
        <h2 className="text-2xl font-bold m-0 text-900">Configurações</h2>
        <p className="text-sm text-500 mt-1 m-0">
          Gerencie backup e configurações do sistema
        </p>
      </div>

      {/* Backup do Banco de Dados */}
      <Card className="mb-4 shadow-1">
        <div className="flex align-items-center gap-2 mb-3">
          <i className="pi pi-database text-primary text-xl" />
          <h3 className="m-0 text-lg font-bold text-900">
            Backup do Banco de Dados
          </h3>
        </div>

        <p className="text-sm text-600 mb-4">
          Crie uma cópia de segurança do banco de dados. Recomendamos fazer
          backup regularmente para evitar perda de dados.
        </p>

        <div className="flex flex-column gap-3">
          <div>
            <label className="block font-semibold text-sm text-700 mb-2">
              Caminho para salvar o backup
            </label>
            <InputText
              value={caminhoBackup}
              onChange={(e) => setCaminhoBackup(e.target.value)}
              placeholder="Ex: C:\Backups\gestao_hidro_backup.db"
              className="w-full"
            />
            <small className="text-500 mt-1 block">
              Digite o caminho completo onde o backup será salvo
            </small>
          </div>

          <Divider className="my-2" />

          <div className="flex flex-column gap-3">
            <div className="flex align-items-center justify-content-between">
              <div>
                <label className="font-semibold text-sm text-700 block mb-1">
                  Proteger com senha
                </label>
                <small className="text-500 text-xs">
                  Criptografa o backup com AES-256
                </small>
              </div>
              <InputSwitch
                checked={protegerBackup}
                onChange={(e) => setProtegerBackup(e.value)}
              />
            </div>

            {protegerBackup && (
              <div>
                <label className="block font-semibold text-sm text-700 mb-2">
                  Senha do backup
                </label>
                <Password
                  value={senhaBackup}
                  onChange={(e) => setSenhaBackup(e.target.value)}
                  placeholder="Digite uma senha forte"
                  className="w-full"
                  toggleMask
                  feedback
                />
                <small className="text-500 mt-1 block">
                  Guarde esta senha em local seguro. Sem ela, não será possível restaurar o backup.
                </small>
              </div>
            )}
          </div>

          <div className="flex justify-content-end">
            <Button
              label={backupEmAndamento ? "Criando backup..." : "Fazer Backup Agora"}
              icon={backupEmAndamento ? "pi pi-spin pi-spinner" : "pi pi-save"}
              className="p-button-success"
              onClick={executarBackup}
              loading={backupEmAndamento}
              disabled={!caminhoBackup || (protegerBackup && !senhaBackup)}
            />
          </div>
        </div>

        <Divider className="my-4" />

        {/* Histórico de Backups */}
        <div className="flex align-items-center justify-content-between mb-3">
          <h4 className="m-0 text-md font-bold text-900">
            Histórico de Backups
          </h4>
          <Button
            label="Atualizar"
            icon="pi pi-refresh"
            className="p-button-text p-button-sm"
            onClick={carregarHistorico}
            loading={carregandoHistorico}
          />
        </div>

        {historico.length === 0 ? (
          <div className="text-center py-4 text-500">
            <i className="pi pi-inbox text-3xl mb-2" style={{ display: "block" }} />
            <p className="m-0 text-sm">Nenhum backup registrado ainda.</p>
          </div>
        ) : (
          <div className="flex flex-column gap-2">
            {historico.map((backup) => (
              <div
                key={backup.id_backup}
                className="flex align-items-center justify-content-between p-3 border-round border-1 surface-border"
                style={{ background: "var(--color-bg)" }}
              >
                <div className="flex align-items-center gap-3">
                  <i className="pi pi-file text-primary" />
                  <div>
                    <div className="text-sm font-semibold text-900">
                      {backup.nome_arquivo}
                    </div>
                    <div className="text-xs text-500">
                      {formatarData(backup.criado_em)}
                      {backup.tamanho_kb && ` • ${backup.tamanho_kb} KB`}
                    </div>
                  </div>
                </div>
                <Tag
                  value={backup.sucesso ? "Sucesso" : "Falha"}
                  severity={backup.sucesso ? "success" : "danger"}
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Informações do Sistema */}
      <Card className="shadow-1">
        <div className="flex align-items-center gap-2 mb-3">
          <i className="pi pi-info-circle text-primary text-xl" />
          <h3 className="m-0 text-lg font-bold text-900">
            Informações do Sistema
          </h3>
        </div>

        <div className="grid">
          <div className="col-12 md:col-6">
            <div className="text-xs font-semibold text-600 uppercase mb-1">
              Versão
            </div>
            <div className="text-sm font-bold text-900">0.1.0</div>
          </div>
          <div className="col-12 md:col-6">
            <div className="text-xs font-semibold text-600 uppercase mb-1">
              Banco de Dados
            </div>
            <div className="text-sm font-bold text-900">SQLite</div>
          </div>
        </div>
      </Card>
    </div>
  );
}