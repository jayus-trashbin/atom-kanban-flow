import React from 'react';
import { Priority } from '../types';

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'sm', showLabel = true }) => {
  const score = priority.urgency * priority.impact;
  
  let config = {
    label: 'Baixa',
    classes: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    dot: 'bg-zinc-400'
  };
  
  if (score >= 16) {
    config = {
      label: 'Crítico',
      classes: 'bg-rose-50 text-rose-700 border-rose-200',
      dot: 'bg-rose-500'
    };
  } else if (score >= 9) {
    config = {
      label: 'Alta',
      classes: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500'
    };
  } else if (score >= 4) {
    config = {
      label: 'Média',
      classes: 'bg-blue-50 text-blue-700 border-blue-200',
      dot: 'bg-blue-500'
    };
  }

  const sizeClasses = size === 'lg' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[10px]';

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-wide ${config.classes} ${sizeClasses}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {showLabel && <span>{config.label}</span>}
    </div>
  );
};

export default PriorityBadge;