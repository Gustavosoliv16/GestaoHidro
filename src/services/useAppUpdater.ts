import { useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { confirmDialog } from "primereact/confirmdialog";

export function useAppUpdater() {
  useEffect(() => {
    async function verificarAtualizacao() {
      try {
        const update = await check();
        if (!update) return;

        confirmDialog({
          header: "Nova atualização disponível",
          message: `A versão ${update.version} está disponível. Deseja atualizar agora?`,
          icon: "pi pi-refresh",
          acceptLabel: "Atualizar agora",
          rejectLabel: "Depois",
          accept: async () => {
            await update.downloadAndInstall();
            await relaunch();
          },
        });
      } catch (erro) {
        // Em desenvolvimento não há endpoint de release — suprimir o ruído
        if (import.meta.env.DEV) return;
        console.error("Erro ao verificar atualização:", erro);
      }
    }

    verificarAtualizacao();
  }, []);
}