import { useEffect, useCallback } from "react";

interface ShortcutMap {
  [key: string]: (e: KeyboardEvent) => void;
}

/**
 * Hook para atalhos de teclado globais.
 * Suporta combinações com Ctrl, Shift, Alt.
 *
 * Exemplo de uso:
 *   useKeyboardShortcuts({
 *     'ctrl+n': () => navigate('/alunos'),
 *     'ctrl+f': () => focusSearch(),
 *     'ctrl+p': () => openPayment(),
 *   });
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignora se estiver em um input/textarea/select
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      // Constrói a combinação de teclas
      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push("ctrl");
      if (e.shiftKey) parts.push("shift");
      if (e.altKey) parts.push("alt");

      const key = e.key.toLowerCase();
      // Mapeia teclas especiais
      const keyMap: Record<string, string> = {
        escape: "esc",
        enter: "enter",
        " ": "space",
      };
      const normalizedKey = keyMap[key] || key;

      // Se é uma tecla de letra/numero e não tem modificador, ignora em inputs
      if (isInput && parts.length === 0) return;

      parts.push(normalizedKey);
      const combo = parts.join("+");

      const handler = shortcuts[combo];
      if (handler) {
        e.preventDefault();
        e.stopPropagation();
        handler(e);
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook para fechar modais/dropdowns com Escape.
 */
export function useEscapeToClose(onClose: () => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose, enabled]);
}
