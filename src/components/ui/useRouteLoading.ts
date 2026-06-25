import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Hook que detecta mudanças de rota e mostra loading.
 * Retorna o estado de loading para ser usado no App.
 */
export function useRouteLoading() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Mostra loading ao mudar de rota
    setLoading(true);
    
    // Esconde após um delay mínimo (para dar tempo de carregar)
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return loading;
}
