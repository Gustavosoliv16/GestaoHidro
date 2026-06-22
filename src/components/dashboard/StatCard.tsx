import React from 'react';

interface StatCardProps {
  label: string;
  value?: string | number;
  delta?: number;
  deltaType?: 'positive' | 'negative';
  icon?: string;
  color?: 'info' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, delta, deltaType, icon, color = 'info', onClick }) => {
  const deltaClass = deltaType === 'positive' ? 'stat-delta-positive' : deltaType === 'negative' ? 'stat-delta-negative' : 'kpi-val-neutral';
  
  const bgColors = {
    info: 'rgba(14, 124, 140, 0.12)',
    success: 'rgba(27, 158, 107, 0.12)',
    warning: 'rgba(217, 164, 65, 0.14)',
    danger: 'rgba(209, 75, 75, 0.12)'
  };
  
  return (
    <div 
      className={`card stat-card kpi-border-${color}`} 
      onClick={onClick}
      style={{ 
        borderTopWidth: '4px', 
        borderTopStyle: 'solid', 
        display: 'flex', 
        flexDirection: 'column', 
        padding: '1.5rem', 
        position: 'relative', 
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        }
      }}
    >
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', position: 'relative', zIndex: 2 }}>
        <div className="stat-label" style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
          {label}
        </div>
        
        {icon && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '3rem', height: '3rem', borderRadius: '50%', background: bgColors[color] }}>
            <i className={`pi ${icon} kpi-val-${color}`} style={{ fontSize: '1.4rem' }}></i>
          </div>
        )}
      </div>

      {value !== undefined && (
        <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem', lineHeight: 1, letterSpacing: '-0.02em', position: 'relative', zIndex: 2 }}>
          {value}
        </div>
      )}

      {delta !== undefined && (
        <div className={`stat-delta ${deltaClass}`} style={{ fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', marginTop: 'auto', position: 'relative', zIndex: 2 }}>
           <i className={`pi ${delta >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'}`} style={{ fontSize: '0.75rem', marginRight: '0.3rem' }}></i>
           {Math.abs(delta)}% 
           <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400, marginLeft: '0.4rem' }}>vs último mês</span>
        </div>
      )}
      
      {/* Background decoration */}
      {icon && (
        <i className={`pi ${icon} kpi-val-${color}`} style={{ position: 'absolute', right: '-1rem', bottom: '-1rem', fontSize: '8rem', opacity: 0.04, zIndex: 1, transform: 'rotate(-15deg)' }}></i>
      )}
    </div>
  );
};

export default StatCard;
