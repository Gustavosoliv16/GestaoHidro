import React from "react";

interface RouteLoadingProps {
  loading: boolean;
}

/**
 * Componente de loading que aparece durante navegação entre páginas.
 * Mostra uma barra de progresso no topo da tela.
 */
const RouteLoading: React.FC<RouteLoadingProps> = ({ loading }) => {
  if (!loading) return null;

  return (
    <div
      className="route-loading"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "3px",
        background: "var(--color-cyan-600)",
        zIndex: 9999,
        animation: "routeLoadingProgress 0.3s ease-out",
        boxShadow: "0 0 10px rgba(14, 124, 140, 0.5)",
      }}
    />
  );
};

export default RouteLoading;
