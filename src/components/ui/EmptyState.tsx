import React from "react";
import { Button } from "primereact/button";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  severity?: "info" | "success" | "warning";
}

/**
 * Componente de empty state com ilustração e ação.
 * Usado quando listas/tabelas não têm dados para exibir.
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "pi-inbox",
  title,
  description,
  actionLabel,
  onAction,
  severity = "info",
}) => {
  const bgColors = {
    info: "rgba(14, 124, 140, 0.08)",
    success: "rgba(27, 158, 107, 0.08)",
    warning: "rgba(217, 164, 65, 0.08)",
  };

  const iconColors = {
    info: "var(--color-cyan-600)",
    success: "var(--color-success)",
    warning: "var(--color-warning)",
  };

  return (
    <div
      className="flex flex-column align-items-center justify-content-center py-6 px-4"
      style={{ minHeight: "200px" }}
    >
      <div
        className="flex align-items-center justify-content-center mb-4"
        style={{
          width: "4.5rem",
          height: "4.5rem",
          borderRadius: "50%",
          background: bgColors[severity],
        }}
      >
        <i
          className={`pi ${icon}`}
          style={{ fontSize: "2rem", color: iconColors[severity] }}
        />
      </div>

      <h4
        className="text-center mb-2"
        style={{ color: "var(--color-text)", margin: 0 }}
      >
        {title}
      </h4>

      {description && (
        <p
          className="text-center text-sm mb-4"
          style={{
            color: "var(--color-text-secondary)",
            maxWidth: "360px",
            lineHeight: 1.5,
            margin: 0,
            marginBottom: "1rem",
          }}
        >
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          icon="pi pi-plus"
          className="p-button-sm p-button-outlined"
          onClick={onAction}
        />
      )}
    </div>
  );
};

export default EmptyState;
