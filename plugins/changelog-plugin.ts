/**
 * changelog-plugin.ts
 *
 * Plugin Vite que lê CHANGELOG.md na raiz do projeto durante o build,
 * parseia as últimas N versões e injeta o resultado como:
 *   import.meta.env.VITE_CHANGELOG  →  string JSON de EntradaChangelog[]
 *
 * Formato esperado no CHANGELOG.md:
 *
 *   ## [1.2.3] - DD/MM/YYYY
 *   > Resumo de uma linha
 *
 *   ### Novo
 *   - item
 *
 *   ### Melhoria
 *   - item
 *
 *   ### Correção
 *   - item
 *
 * Seções reconhecidas (case-insensitive): Novo, Melhoria, Correção/Correcao
 */
//@ts-expect-error node modules
import { readFileSync } from "fs";
//@ts-expect-error node modules
import { resolve } from "path";
import type { Plugin } from "vite";

export type TipoItem = "novo" | "melhoria" | "correcao";

export interface ItemChangelog {
  tipo: TipoItem;
  texto: string;
}

export interface EntradaChangelog {
  versao: string;
  data: string;
  resumo: string;
  itens: ItemChangelog[];
}

const SECAO_TIPO: Record<string, TipoItem> = {
  novo:     "novo",
  melhoria: "melhoria",
  correção: "correcao",
  correcao: "correcao",
};

function parsearChangelog(conteudo: string, limite: number): EntradaChangelog[] {
  const linhas = conteudo.split(/\r?\n/);
  const entradas: EntradaChangelog[] = [];
  let entrada: EntradaChangelog | null = null;
  let tipoAtual: TipoItem | null = null;

  for (const linha of linhas) {
    // Cabeçalho de versão: ## [1.2.3] - DD/MM/YYYY
    const matchVersao = linha.match(/^##\s+\[([^\]]+)\]\s*-\s*(.+)/);
    if (matchVersao) {
      if (entrada) entradas.push(entrada);
      if (entradas.length >= limite) break;
      entrada = {
        versao: matchVersao[1].trim(),
        data:   matchVersao[2].trim(),
        resumo: "",
        itens:  [],
      };
      tipoAtual = null;
      continue;
    }

    if (!entrada) continue;

    // Linha de resumo: > texto
    const matchResumo = linha.match(/^>\s+(.+)/);
    if (matchResumo) {
      entrada.resumo = matchResumo[1].trim();
      continue;
    }

    // Cabeçalho de seção: ### Novo / Melhoria / Correção
    const matchSecao = linha.match(/^###\s+(.+)/);
    if (matchSecao) {
      const chave = matchSecao[1].trim().toLowerCase();
      tipoAtual = SECAO_TIPO[chave] ?? null;
      continue;
    }

    // Item de lista: - texto
    if (tipoAtual && linha.match(/^-\s+.+/)) {
      entrada.itens.push({
        tipo:  tipoAtual,
        texto: linha.replace(/^-\s+/, "").trim(),
      });
    }
  }

  // Adiciona última entrada se ainda não foi adicionada
  if (entrada && entradas.length < limite) {
    entradas.push(entrada);
  }

  return entradas;
}

export default function changelogPlugin(opcoes: { limite?: number } = {}): Plugin {
  const limite = opcoes.limite ?? 2;

  return {
    name: "vite-plugin-changelog",
    // config() roda antes do build e define variáveis de ambiente
    config() {
      //@ts-expect-error process is a nodejs
      const caminhoMd = resolve(process.cwd(), "CHANGELOG.md");
      let entradas: EntradaChangelog[] = [];

      try {
        const conteudo = readFileSync(caminhoMd, "utf-8");
        entradas = parsearChangelog(conteudo, limite);
      } catch (e) {
        console.warn(`[changelog-plugin] Não foi possível ler CHANGELOG.md: ${e}`);
      }

      return {
        define: {
          // JSON.stringify duplo: o Vite substitui literalmente a string na bundle,
          // então precisa ser uma string JSON válida entre aspas.
          "import.meta.env.VITE_CHANGELOG": JSON.stringify(JSON.stringify(entradas)),
        },
      };
    },
  };
}
