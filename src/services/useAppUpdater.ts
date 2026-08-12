import { useEffect, useRef, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

/**
 * Estado exposto para que o componente possa renderizar o progresso.
 */
export interface UpdaterState {
  /** Atualização disponível detectada (null enquanto não verificou ou não há update) */
  update: Update | null;
  /** Fase atual do processo */
  fase: "idle" | "disponivel" | "baixando" | "instalando" | "erro";
  /** Progresso do download de 0 a 100 (null quando não aplicável) */
  progresso: number | null;
  /** Mensagem de erro, se houver */
  erro: string | null;
  /** Inicia o download e instalação */
  instalar: () => Promise<void>;
  /** Descarta o aviso desta sessão */
  dispensar: () => void;
}

export function useAppUpdater(): UpdaterState {
  const jaVerificou = useRef(false);

  const [update, setUpdate] = useState<Update | null>(null);
  const [fase, setFase] = useState<UpdaterState["fase"]>("idle");
  const [progresso, setProgresso] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (jaVerificou.current) return;
    jaVerificou.current = true;

    if (import.meta.env.DEV) return;

    check()
      .then((u) => {
        if (u) {
          setUpdate(u);
          setFase("disponivel");
        }
      })
      .catch((e) => {
        console.error("useAppUpdater: falha ao verificar update:", e);
      });
  }, []);

  const instalar = async () => {
    if (!update) return;

    try {
      let totalBaixado = 0;
      let tamanhoTotal = 0;

      setFase("baixando");
      setProgresso(0);

      await update.downloadAndInstall((evento) => {
        if (evento.event === "Started") {
          tamanhoTotal = evento.data.contentLength ?? 0;
        } else if (evento.event === "Progress") {
          totalBaixado += evento.data.chunkLength;
          if (tamanhoTotal > 0) {
            setProgresso(Math.round((totalBaixado / tamanhoTotal) * 100));
          }
        } else if (evento.event === "Finished") {
          setProgresso(100);
          setFase("instalando");
        }
      });

      // Com perMachine + NSIS, downloadAndInstall() só resolve depois que
      // o instalador termina completamente — relaunch() aqui é seguro.
      await relaunch();
    } catch (e: any) {
      console.error("useAppUpdater: falha durante instalação:", e);
      setFase("erro");
      setErro(String(e?.message ?? e));
      setProgresso(null);
    }
  };

  const dispensar = () => {
    setFase("idle");
    setUpdate(null);
  };

  return { update, fase, progresso, erro, instalar, dispensar };
}
