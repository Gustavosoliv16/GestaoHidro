import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { getVersion } from "@tauri-apps/api/app";

const STORAGE_KEY_VERSAO_VISTA = "changelog_versao_vista";

export type UpdateFase =
  | "idle"
  | "verificando"
  | "disponivel"
  | "baixando"
  | "instalando"
  | "erro";

export interface UpdaterContextValue {
  fase: UpdateFase;
  update: Update | null;
  progresso: number | null;
  erro: string | null;
  verificar: () => Promise<void>;
  instalar: () => Promise<void>;
  dispensar: () => void;
  /** true quando o changelog deve ser exibido (primeira abertura pós-update) */
  changelogAberto: boolean;
  abrirChangelog: () => void;
  fecharChangelog: () => void;
}

const UpdaterContext = createContext<UpdaterContextValue>({
  fase: "idle",
  update: null,
  progresso: null,
  erro: null,
  verificar: async () => {},
  instalar: async () => {},
  dispensar: () => {},
  changelogAberto: false,
  abrirChangelog: () => {},
  fecharChangelog: () => {},
});

export function UpdaterProvider({ children }: { children: ReactNode }) {
  const verificouNoBootRef = useRef(false);

  const [fase, setFase] = useState<UpdateFase>("idle");
  const [update, setUpdate] = useState<Update | null>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [changelogAberto, setChangelogAberto] = useState(false);

  // ── Verifica se há versão nova que o usuário ainda não viu ───────────────
  useEffect(() => {
    if (import.meta.env.DEV) return;

    getVersion().then((versaoAtual) => {
      const versaoVista = localStorage.getItem(STORAGE_KEY_VERSAO_VISTA);
      if (versaoVista !== versaoAtual) {
        // Primeira abertura nessa versão → mostra changelog
        setChangelogAberto(true);
        localStorage.setItem(STORAGE_KEY_VERSAO_VISTA, versaoAtual);
      }
    }).catch(() => {});
  }, []);

  // ── verificação silenciosa no boot ──────────────────────────────────────
  useEffect(() => {
    if (verificouNoBootRef.current) return;
    verificouNoBootRef.current = true;

    // Em dev não há endpoint de release — não poluir o console
    if (import.meta.env.DEV) return;

    check()
      .then((u) => {
        if (u) {
          setUpdate(u);
          setFase("disponivel");
          // Dispara o evento para o Menubar atualizar o badge
          window.dispatchEvent(new CustomEvent("notif-update"));
        }
      })
      .catch((e) => {
        // Falha silenciosa no boot — não precisa alertar o usuário
        console.warn("UpdaterContext: verificação no boot falhou:", e);
      });
  }, []);

  // ── verificação manual (botão em Configurações) ──────────────────────────
  const verificar = async () => {
    if (fase === "verificando" || fase === "baixando" || fase === "instalando") return;

    setFase("verificando");
    setErro(null);
    try {
      const u = await check();
      if (u) {
        setUpdate(u);
        setFase("disponivel");
        window.dispatchEvent(new CustomEvent("notif-update"));
      } else {
        setFase("idle"); // já está na versão mais recente
      }
    } catch (e: any) {
      console.error("UpdaterContext: verificação manual falhou:", e);
      setFase("erro");
      setErro(String(e?.message ?? e));
    }
  };

  // ── instalação ───────────────────────────────────────────────────────────
  const instalar = async () => {
    if (!update) return;

    try {
      let totalBaixado = 0;
      let tamanhoTotal = 0;

      setFase("baixando");
      setProgresso(0);
      setErro(null);

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

      // Com perMachine + NSIS, downloadAndInstall() resolve só após o
      // instalador terminar — relaunch() aqui é seguro.
      await relaunch();
    } catch (e: any) {
      console.error("UpdaterContext: instalação falhou:", e);
      setFase("erro");
      setErro(String(e?.message ?? e));
      setProgresso(null);
    }
  };

  const dispensar = () => {
    setFase("idle");
    setUpdate(null);
    setErro(null);
    setProgresso(null);
  };

  const abrirChangelog = () => setChangelogAberto(true);
  const fecharChangelog = () => setChangelogAberto(false);

  return (
    <UpdaterContext.Provider
      value={{ fase, update, progresso, erro, verificar, instalar, dispensar, changelogAberto, abrirChangelog, fecharChangelog }}
    >
      {children}
    </UpdaterContext.Provider>
  );
}

export function useUpdater(): UpdaterContextValue {
  return useContext(UpdaterContext);
}
