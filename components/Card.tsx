import React, { useState, memo, useMemo, useRef } from 'react';
import { Card as CardType, User } from '../types';
import { AlignLeft, CheckSquare, CalendarDays, Trash2, BarChart3, FileText, Database, Users } from 'lucide-react';
import PriorityBadge from './PriorityBadge';

interface CardProps {
  card: CardType;
  assignee?: User;
  index: number;
  onClick: (card: CardType) => void;
  onDelete?: (cardId: string) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, card: CardType) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, targetCardId: string, position: 'top' | 'bottom') => void;
}

const Card: React.FC<CardProps> = ({ card, assignee, index, onClick, onDelete, onDragStart, onDrop }) => {
  const [dropPosition, setDropPosition] = useState<'top' | 'bottom' | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  // --- SMART TYPE DETECTION ---
  const cardType = useMemo(() => {
      const text = (card.title + ' ' + card.tags.join(' ')).toLowerCase();
      
      if (text.includes('power bi') || text.includes('dashboard') || text.includes('relatório') || text.includes('grafico')) {
          return {
              type: 'report',
              label: 'Relatório BI',
              icon: <BarChart3 size={11} />, 
              style: 'border-l-[3px] border-l-amber-400/70', 
              badge: 'bg-amber-50 text-amber-700 border-amber-200/50'
          };
      }
      if (text.includes('reunião') || text.includes('call') || text.includes('alinhamento') || text.includes('meeting')) {
          return {
              type: 'meeting',
              label: 'Reunião',
              icon: <Users size={11} />,
              style: 'border-l-[3px] border-l-violet-400/70',
              badge: 'bg-violet-50 text-violet-700 border-violet-200/50'
          };
      }
      if (text.includes('query') || text.includes('sql') || text.includes('dados') || text.includes('extração') || text.includes('base')) {
          return {
              type: 'data',
              label: 'Dados & SQL',
              icon: <Database size={11} />,
              style: 'border-l-[3px] border-l-cyan-400/70',
              badge: 'bg-cyan-50 text-cyan-700 border-cyan-200/50'
          };
      }
      if (text.includes('doc') || text.includes('processo') || text.includes('manual') || text.includes('instrução')) {
          return {
              type: 'doc',
              label: 'Documentação',
              icon: <FileText size={11} />,
              style: 'border-l-[3px] border-l-slate-400/70',
              badge: 'bg-slate-50 text-slate-700 border-slate-200/50'
          };
      }
      // Default
      return { type: 'default', label: null, icon: null, style: 'border-l-[3px] border-l-transparent', badge: '' };
  }, [card.title, card.tags]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onDragStart(e, card);
    
    // Performance: Use setTimeout to allow the browser to generate the drag ghost image 
    // BEFORE we reduce the opacity of the source element.
    const target = e.currentTarget;
    requestAnimationFrame(() => {
        setTimeout(() => {
            target.style.opacity = '0.4';
            target.style.transform = 'scale(0.95)';
            target.style.filter = 'grayscale(100%)';
        }, 10);
    });
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1';
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.filter = 'none';
    setDropPosition(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // PERFORMANCE FIX: 
    // Calculating getBoundingClientRect is expensive. We only do it if necessary.
    // We strictly check if state needs update to prevent React re-renders loops.
    if (!elementRef.current) return;

    const rect = elementRef.current.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const newPosition = e.clientY < midY ? 'top' : 'bottom';
    
    // Only call setDropPosition if the value is DIFFERENT.
    // This prevents thousands of re-renders during a drag operation.
    if (dropPosition !== newPosition) {
        setDropPosition(newPosition);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      // Prevent flickering when dragging over child elements
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setDropPosition(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.opacity = '1';
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.filter = 'none';
    
    if (dropPosition) {
        onDrop(e, card.id, dropPosition);
    }
    setDropPosition(null);
  };

  const totalSubtasks = card.subtasks.length;
  const completedSubtasks = card.subtasks.filter(t => t.completed).length;

  let dateStatus = { text: '', color: 'text-zinc-500', bg: 'bg-zinc-50 border-zinc-200' };
  if (card.dueDate) {
      const now = new Date(); now.setHours(0,0,0,0);
      const due = new Date(card.dueDate); due.setHours(0,0,0,0);
      const diff = (due.getTime() - now.getTime()) / (1000 * 3600 * 24);
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
      dateStatus.text = due.toLocaleDateString('pt-BR', options);
      if (diff < 0) dateStatus = { text: 'Atrasado', color: 'text-rose-700 font-bold', bg: 'bg-rose-50 border-rose-200' };
      else if (diff === 0) dateStatus = { text: 'Hoje', color: 'text-amber-700 font-bold', bg: 'bg-amber-50 border-amber-200' };
      else if (diff === 1) dateStatus = { text: 'Amanhã', color: 'text-blue-700 font-bold', bg: 'bg-blue-50 border-blue-200' };
  }

  return (
    <div 
        ref={elementRef}
        className="relative isolate transition-all duration-300 ease-out" 
        onDragOver={handleDragOver} 
        onDragLeave={handleDragLeave} 
        onDrop={handleDrop}
    >
        {/* Drop Indicators - Animated scale for smoothness */}
        <div 
            className={`absolute -top-2 left-0 right-0 h-1.5 bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)] z-50 rounded-full pointer-events-none transition-all duration-200 ease-out ${dropPosition === 'top' ? 'opacity-100 scale-x-100 translate-y-0' : 'opacity-0 scale-x-50 translate-y-2'}`} 
        />
        <div 
            className={`absolute -bottom-2 left-0 right-0 h-1.5 bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)] z-50 rounded-full pointer-events-none transition-all duration-200 ease-out ${dropPosition === 'bottom' ? 'opacity-100 scale-x-100 translate-y-0' : 'opacity-0 scale-x-50 -translate-y-2'}`} 
        />

        <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={() => onClick(card)}
            className={`
                group bg-white p-3.5 rounded-2xl border border-zinc-200/80 mb-3 relative
                hover:border-zinc-300 hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06)] hover:-translate-y-0.5
                active:scale-[0.98] active:shadow-inner
                cursor-grab active:cursor-grabbing transform-gpu will-change-transform
                transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]
                ${cardType.style}
            `}
        >
            {/* Quick Actions - Smooth fade in */}
            {onDelete && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
                    className="absolute top-2.5 right-2.5 p-1.5 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 z-10 active:scale-90"
                    title="Excluir Cartão"
                >
                    <Trash2 size={13} />
                </button>
            )}

            <div className="flex justify-between items-center mb-2.5 pr-6">
                <div className="flex items-center gap-2">
                    <PriorityBadge priority={card.priority} />
                    {/* Smart Type Badge */}
                    {cardType.label && (
                        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide border shadow-sm ${cardType.badge}`}>
                            {cardType.icon}
                            <span>{cardType.label}</span>
                        </div>
                    )}
                </div>
            </div>

            <h3 className="text-[13px] font-semibold text-zinc-700 leading-snug mb-2.5">
                {card.title}
            </h3>

            {/* Tags - Pill style with hover effect */}
            {card.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                    {card.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 bg-zinc-50 text-zinc-500 rounded-full border border-zinc-100 font-medium tracking-wide hover:bg-zinc-100 transition-colors">
                        #{tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Progress Bar - Sleeker */}
            {totalSubtasks > 0 && (
                <div className="mb-3">
                    <div className="h-1 w-full bg-zinc-100 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-500 ease-out ${completedSubtasks === totalSubtasks ? 'bg-emerald-500' : 'bg-blue-400'}`}
                            style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Footer */}
            {(card.dueDate || totalSubtasks > 0 || card.description || assignee) && (
                <div className="flex items-center justify-between pt-2.5 border-t border-dashed border-zinc-100">
                    <div className="flex items-center gap-2">
                        {card.dueDate && (
                            <div className={`flex items-center gap-1.5 text-[10px] px-1.5 h-5 rounded-md border ${dateStatus.bg} ${dateStatus.color} transition-colors`}>
                                <CalendarDays size={11} />
                                <span className="font-semibold">{dateStatus.text}</span>
                            </div>
                        )}
                        
                        {totalSubtasks > 0 && (
                            <div className={`
                                flex items-center gap-1.5 text-[10px] font-medium px-1.5 h-5 rounded-md border transition-colors
                                ${completedSubtasks === totalSubtasks 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                    : 'bg-zinc-50 text-zinc-500 border-zinc-100'
                                }
                            `}>
                                <CheckSquare size={11} className={completedSubtasks === totalSubtasks ? "text-emerald-500" : ""} />
                                <span>{completedSubtasks}/{totalSubtasks}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                         {card.description && !totalSubtasks && (
                            <div className="text-zinc-300" title="Possui descrição">
                                <AlignLeft size={13} />
                            </div>
                        )}
                        {assignee && (
                            <img 
                                src={assignee.avatar} 
                                alt={assignee.name} 
                                className="w-5 h-5 rounded-full border border-white shadow-sm ring-1 ring-zinc-100 object-cover transition-transform hover:scale-110"
                                title={`Atribuído a ${assignee.name}`}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default memo(Card);