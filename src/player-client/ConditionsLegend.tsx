import { useState } from 'react';
import type { ConditionLegendEntry } from './types';

interface ConditionsLegendProps {
  conditions: ConditionLegendEntry[];
}

export function ConditionsLegend({ conditions }: ConditionsLegendProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      left: 16,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      borderRadius: 8,
      padding: collapsed ? '8px 12px' : '12px 16px',
      color: '#E8E6E3',
      fontFamily: 'system-ui, sans-serif',
      fontSize: 13,
      zIndex: 100,
      maxWidth: 220,
      cursor: 'pointer',
      userSelect: 'none',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    }} onClick={() => setCollapsed(!collapsed)}>
      <div style={{ fontWeight: 600, marginBottom: collapsed ? 0 : 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8 }}>
        Effects {collapsed ? '▸' : '▾'}
      </div>
      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {conditions.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: c.color,
                flexShrink: 0,
              }} />
              <span>{c.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
