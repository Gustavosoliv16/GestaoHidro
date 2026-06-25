import React from "react";

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Componente de skeleton loading com animação shimmer.
 * Substitui o spinner durante carregamento de dados.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = "1rem",
  borderRadius = "var(--radius-sm)",
  className = "",
  style = {},
}) => (
  <div
    className={`skeleton-shimmer ${className}`}
    style={{
      width,
      height,
      borderRadius,
      background: "var(--color-border)",
      ...style,
    }}
  />
);

/**
 * Skeleton para cards de estatísticas (KPIs).
 */
export const SkeletonStatCard: React.FC = () => (
  <div
    className="card"
    style={{
      padding: "1.5rem",
      borderTopWidth: "4px",
      borderTopStyle: "solid",
      borderColor: "var(--color-border)",
    }}
  >
    <div className="flex justify-content-between align-items-flex-start mb-3">
      <Skeleton width="60%" height="0.875rem" />
      <Skeleton width="3rem" height="3rem" borderRadius="50%" />
    </div>
    <Skeleton width="40%" height="2rem" />
    <Skeleton width="70%" height="0.875rem" style={{ marginTop: "0.5rem" }} />
  </div>
);

/**
 * Skeleton para tabela de dados.
 */
export const SkeletonDataTable: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 4,
}) => (
  <div className="flex flex-column gap-0">
    {/* Header */}
    <div
      className="flex gap-4 pb-3 mb-2"
      style={{ borderBottom: "1px solid var(--color-border)" }}
    >
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={`h-${i}`} width={`${100 / cols}%`} height="0.75rem" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div
        key={`r-${rowIdx}`}
        className="flex gap-4 py-3"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        {Array.from({ length: cols }).map((_, colIdx) => (
          <Skeleton
            key={`c-${rowIdx}-${colIdx}`}
            width={`${60 + Math.random() * 40}%`}
            height="0.875rem"
          />
        ))}
      </div>
    ))}
  </div>
);

/**
 * Skeleton para o conteúdo do Dashboard.
 */
export const SkeletonDashboard: React.FC = () => (
  <div className="dashboard-container">
    <div className="mb-6">
      <Skeleton width="200px" height="1.75rem" style={{ marginBottom: "0.5rem" }} />
      <Skeleton width="180px" height="0.75rem" />
    </div>

    {/* KPI cards */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "var(--space-4)",
        marginBottom: "var(--space-6)",
      }}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>

    {/* Content area */}
    <div className="card" style={{ padding: "var(--space-5)" }}>
      <Skeleton width="250px" height="1.25rem" style={{ marginBottom: "var(--space-4)" }} />
      <SkeletonDataTable rows={6} cols={3} />
    </div>
  </div>
);
