/**
 * changelog.ts
 *
 * Lê o changelog injetado pelo Vite no build a partir do CHANGELOG.md.
 * Para adicionar uma nova versão, edite apenas CHANGELOG.md na raiz do projeto.
 */

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

/**
 * Retorna as últimas 2 versões do CHANGELOG.md, injetadas no build pelo
 * changelog-plugin (plugins/changelog-plugin.ts).
 * Em dev, retorna array vazio se a variável não estiver disponível.
 */
export function obterChangelog(): EntradaChangelog[] {
  try {
    const raw = import.meta.env.VITE_CHANGELOG;
    if (!raw) return [];
    return JSON.parse(raw) as EntradaChangelog[];
  } catch {
    return [];
  }
}

/** Atalho — mesmo resultado de obterChangelog(), para uso direto nos componentes. */
export const CHANGELOG: EntradaChangelog[] = obterChangelog();
