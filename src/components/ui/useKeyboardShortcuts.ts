import { useEffect, useCallback } from "react";

interface ShortcutMap {
  [key: string]: (e: KeyboardEvent) => void;
}

/**
 * Hook para atalhos de teclado globais.
 * Suporta combinações com Ctrl, Shift, Alt.
 * Teclas sem modificador (ex: "esc") funcionam mesmo dentro de inputs.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push("ctrl");
      if (e.shiftKey) parts.push("shift");
      if (e.altKey) parts.push("alt");

      const key = e.key.toLowerCase();
      const keyMap: Record<string, string> = {
        escape: "esc",
        enter: "enter",
        " ": "space",
      };
      const normalizedKey = keyMap[key] || key;

      // Teclas sem modificador dentro de inputs: só permite esc e enter
      const semModificador = parts.length === 0;
      if (isInput && semModificador) {
        if (normalizedKey !== "esc" && normalizedKey !== "enter") return;
      }

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
