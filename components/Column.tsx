import React, { useState, useRef, useEffect, memo } from 'react';
import { Column as ColumnType, Card as CardType, User, Priority } from '../types';
import Card from './Card';
import { Plus, GripVertical, Calendar, User as UserIcon, Flag, X, Check, ListTodo, ChevronLeft, ChevronRight, Clock, BoxSelect, MoreHorizontal, Trash2, BarChart3, Users, Database, FileText, Layout, ChevronDown, AlignLeft, SendHorizontal } from 'lucide-react';

interface ColumnProps {
  column: ColumnType;
  cards: CardType[];
  users: User[];
  isFirstColumn?: boolean;
  onCardClick: (card: CardType) => void;
  onCardReorder: (cardId: string, targetColumnId: string, targetIndex?: number) => void;
  onCardCreate: (columnId: string, title: string, options?: { priority?: Priority, assigneeId?: string, dueDate?: number, description?: string, subtasks?: string[], tags?: string[] }) => void;
  onCardDelete: (cardId: string) => void;
  onColumnMove: (draggedColId: string, targetColId: string) => void;
  onTitleUpdate: (columnId: string, newTitle: string) => void;
  onColumnDelete: (columnId: string) => void;
}

// --- CATEGORY CONFIGURATION ---
// Defines the available "Smart Types" available during creation
const CATEGORY_PRESETS = [
    { id: 'default', label: 'Tarefa', icon: Layout, color: 'bg-zinc-100 text-zinc-600 border-zinc-200', tag: null },
    { id: 'report', label: 'Relatório', icon: BarChart3, color: 'bg-amber-50 text-amber-700 border-amber-200', tag: 'Relatório' },
    { id: 'meeting', label: 'Reunião', icon: Users, color: 'bg-violet-50 text-violet-700 border-violet-200', tag: 'Reunião' },
    { id: 'data', label: 'Dados', icon: Database, color: 'bg-cyan-50 text-cyan-700 border-cyan-200', tag: 'Dados' },
    { id: 'doc', label: 'Doc', icon: FileText, color: 'bg-slate-50 text-slate-700 border-slate-200', tag: 'Doc' },
];

const Column: React.FC<ColumnProps> = ({ 
  column, 
  cards, 
  users,
  isFirstColumn, 
  onCardClick, 
  onCardReorder, 
  onCardCreate, 
  onCardDelete,
  onColumnMove,
  onTitleUpdate,
  onColumnDelete
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  // Creation Menus State
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  
  // Creation Data State
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDescription, setNewCardDescription] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string | undefined>(undefined);
  const [selectedPriority, setSelectedPriority] = useState<Priority>({ urgency: 1, impact: 1 });
  const [selectedDate, setSelectedDate] = useState<number | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<string>('default');

  // Subtasks Creation State
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [newSubtasks, setNewSubtasks] = useState<string[]>([]);
  
  // Calendar View State
  const [viewDate, setViewDate] = useState(new Date());

  // Title Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(column.title);
  
  const creationRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = (el: HTMLTextAreaElement | null) => {
    if (el) {
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight(titleInputRef.current);
  }, [newCardTitle, isFocused]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (creationRef.current && !creationRef.current.contains(event.target as Node)) {
        if (!newCardTitle) {
            setIsFocused(false);
            resetCreationState();
        }
        setShowDateMenu(false);
        setShowPriorityMenu(false);
        setShowAssigneeMenu(false);
        setShowCategoryMenu(false);
      }
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
          setShowColumnMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [newCardTitle]);

  useEffect(() => {
      if (showDateMenu) {
          setViewDate(selectedDate ? new Date(selectedDate) : new Date());
      }
  }, [showDateMenu, selectedDate]);

  const resetCreationState = () => {
      setSelectedAssignee(undefined);
      setSelectedPriority({ urgency: 1, impact: 1 });
      setSelectedDate(undefined);
      setNewCardDescription('');
      setNewSubtasks([]);
      setSelectedCategory('default');
      setShowSubtasks(false);
      setShowDateMenu(false);
      setShowPriorityMenu(false);
      setShowAssigneeMenu(false);
      setShowCategoryMenu(false);
  };

  const handleCreateSubmit = () => {
    if (newCardTitle.trim()) {
      const categoryConfig = CATEGORY_PRESETS.find(c => c.id === selectedCategory);
      const tags = categoryConfig?.tag ? [categoryConfig.tag] : [];

      onCardCreate(column.id, newCardTitle.trim(), {
          priority: selectedPriority,
          assigneeId: selectedAssignee,
          dueDate: selectedDate,
          description: newCardDescription.trim(),
          subtasks: newSubtasks.filter(t => t.trim() !== ''),
          tags: tags
      });
      setNewCardTitle('');
      setNewCardDescription('');
      setNewSubtasks([]);
      resetCreationState();
      // Keep focus for rapid entry
      if (titleInputRef.current) titleInputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleCreateSubmit();
    }
    if (e.key === 'Escape') {
      setNewCardTitle('');
      setIsFocused(false);
      resetCreationState();
      (e.target as HTMLTextAreaElement).blur();
    }
  };

  const handleAddSubtaskInput = () => setNewSubtasks([...newSubtasks, '']);
  const handleSubtaskChange = (index: number, value: string) => {
      const updated = [...newSubtasks];
      updated[index] = value;
      setNewSubtasks(updated);
  };
  const removeSubtask = (index: number) => setNewSubtasks(newSubtasks.filter((_, i) => i !== index));

  // --- Calendar Logic ---
  const getDaysArray = () => {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay();
      const days = [];
      for (let i = 0; i < firstDay; i++) days.push(null);
      for (let i = 1; i <= daysInMonth; i++) days.push(i);
      return days;
  };

  const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  
  const handleDateSelect = (day: number) => {
      const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
      newDate.setHours(12, 0, 0, 0); 
      setSelectedDate(newDate.getTime());
      setShowDateMenu(false);
  };

  const setDatePreset = (daysFromNow: number) => {
      const d = new Date();
      d.setDate(d.getDate() + daysFromNow);
      d.setHours(12, 0, 0, 0);
      setSelectedDate(d.getTime());
      setShowDateMenu(false);
  };

  // --- Drag & Drop Handlers ---
  const handleCardDragStart = (e: React.DragEvent<HTMLDivElement>, card: CardType) => {
    e.dataTransfer.setData('type', 'CARD');
    e.dataTransfer.setData('cardId', card.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCardDropOnCard = (e: React.DragEvent<HTMLDivElement>, targetCardId: string, position: 'top' | 'bottom') => {
      e.stopPropagation();
      const cardId = e.dataTransfer.getData('cardId');
      if (!cardId) return;
      const targetIndex = cards.findIndex(c => c.id === targetCardId);
      if (targetIndex === -1) return;
      
      const finalIndex = position === 'top' ? targetIndex : targetIndex + 1;
      onCardReorder(cardId, column.id, finalIndex);
      setIsDragOver(false);
  };

  const handleColumnDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('type', 'COLUMN');
    e.dataTransfer.setData('colId', column.id);
    e.dataTransfer.effectAllowed = 'move';
    const target = e.currentTarget;
    requestAnimationFrame(() => {
        setTimeout(() => target.style.opacity = '0.4', 0);
    });
  };

  const handleColumnDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1';
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // Performance: Only update if value changed
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const type = e.dataTransfer.getData('type');
    if (type === 'CARD') {
      const cardId = e.dataTransfer.getData('cardId');
      if (cardId) onCardReorder(cardId, column.id);
    } else if (type === 'COLUMN') {
      const draggedColId = e.dataTransfer.getData('colId');
      if (draggedColId && draggedColId !== column.id) onColumnMove(draggedColId, column.id);
    }
  };

  const handleTitleSubmit = () => {
      if (tempTitle.trim() && tempTitle !== column.title) onTitleUpdate(column.id, tempTitle.trim());
      else setTempTitle(column.title);
      setIsEditingTitle(false);
  };

  const getPriorityColor = () => {
      const score = selectedPriority.urgency * selectedPriority.impact;
      if (score >= 16) return 'text-rose-600 bg-rose-50 border-rose-100';
      if (score >= 9) return 'text-amber-600 bg-amber-50 border-amber-100';
      if (score >= 4) return 'text-blue-600 bg-blue-50 border-blue-100';
      return 'text-zinc-500 hover:text-zinc-700 bg-white border-zinc-200 hover:bg-zinc-50';
  };

  const getAccentColor = () => {
    if (column.id.includes('todo') || column.id.includes('fazer')) return 'bg-zinc-400';
    if (column.id.includes('progress') || column.id.includes('andamento')) return 'bg-blue-500';
    if (column.id.includes('review') || column.id.includes('revisao')) return 'bg-amber-400';
    if (column.id.includes('done') || column.id.includes('concluido')) return 'bg-emerald-500';
    return 'bg-indigo-400';
  };

  // Helper to get current category config
  const currentCategory = CATEGORY_PRESETS.find(c => c.id === selectedCategory) || CATEGORY_PRESETS[0];
  const CategoryIcon = currentCategory.icon;

  return (
    <div
      draggable={!isEditingTitle} 
      onDragStart={handleColumnDragStart}
      onDragEnd={handleColumnDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`
        flex-shrink-0 w-[340px] flex flex-col h-full rounded-2xl transition-all duration-300 relative border shadow-sm transform-gpu
        ${isDragOver 
            ? 'bg-blue-50/50 border-blue-400 shadow-[0_0_0_2px_rgba(59,130,246,0.3)] ring-2 ring-blue-100 scale-[1.01]' 
            : 'bg-[#f3f4f6] border-zinc-200/60 hover:border-zinc-300'
        }
      `}
    >
      <div className={`h-1.5 w-full rounded-t-2xl ${getAccentColor()} opacity-80`} />

      <div className="flex-none px-4 py-3 flex items-center justify-between group cursor-grab active:cursor-grabbing sticky top-0 z-10 bg-[#f3f4f6]">
        <div className="flex items-center gap-3 flex-1 min-w-0">
            {isEditingTitle ? (
                <input 
                    autoFocus
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onBlur={handleTitleSubmit}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleTitleSubmit();
                        if (e.key === 'Escape') { setIsEditingTitle(false); setTempTitle(column.title); }
                    }}
                    className="w-full text-[15px] font-bold text-zinc-900 bg-white px-2 py-0.5 rounded border border-blue-500 outline-none shadow-sm"
                />
            ) : (
                <h2 
                    onClick={() => { setIsEditingTitle(true); setTempTitle(column.title); }}
                    className="text-[15px] font-bold text-zinc-700 truncate cursor-pointer hover:text-zinc-900 transition-colors"
                >
                    {column.title}
                </h2>
            )}
            
            <span className="bg-zinc-200 text-zinc-600 text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                {cards.length}
            </span>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative" ref={columnMenuRef}>
             <button 
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className={`p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 transition-all active:scale-95 ${showColumnMenu ? 'bg-zinc-200 text-zinc-700 opacity-100' : ''}`}
             >
                <MoreHorizontal size={16} />
             </button>
             <div className="text-zinc-300 cursor-grab active:cursor-grabbing">
                <GripVertical size={16} />
             </div>

             {showColumnMenu && (
                 <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-zinc-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 p-1">
                     <button 
                        onClick={() => { onColumnDelete(column.id); setShowColumnMenu(false); }}
                        className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 transition-all active:scale-95
                            ${cards.length > 0 ? 'text-rose-600 hover:bg-rose-50' : 'text-zinc-600 hover:bg-zinc-50'}
                        `}
                     >
                         <Trash2 size={14} />
                         {cards.length > 0 ? `Excluir e limpar ${cards.length} cartões` : 'Excluir Seção'}
                     </button>
                 </div>
             )}
        </div>
      </div>

      {/* TACTICAL CREATION AREA */}
      <div className="px-3 pb-2 flex-none relative z-30" ref={creationRef}>
        {!isFocused ? (
           <button 
             onClick={() => { setIsFocused(true); setTimeout(() => titleInputRef.current?.focus(), 10); }}
             className="w-full flex items-center gap-2 p-2.5 rounded-xl text-zinc-500 hover:text-zinc-800 hover:bg-white hover:shadow-sm transition-all duration-200 active:scale-[0.98] group border border-transparent hover:border-zinc-200"
           >
               <div className="w-6 h-6 rounded-lg bg-zinc-200/50 group-hover:bg-blue-50 group-hover:text-blue-600 flex items-center justify-center transition-colors">
                  <Plus size={14} />
               </div>
               <span className="text-sm font-medium">Adicionar cartão</span>
           </button>
        ) : (
           <div className="bg-white rounded-xl p-3 shadow-xl shadow-zinc-300/40 ring-1 ring-zinc-900/5 animate-in fade-in slide-in-from-top-2 duration-200 border border-zinc-200">
               
               {/* PRIMARY INPUT AREA */}
               <div className="flex flex-col gap-2 mb-3">
                   <textarea
                       ref={titleInputRef}
                       id={isFirstColumn ? "first-column-input" : undefined}
                       className="w-full text-sm font-bold text-zinc-900 placeholder-zinc-400 outline-none bg-transparent resize-none overflow-hidden leading-snug"
                       placeholder="O que precisa ser feito?"
                       value={newCardTitle}
                       onChange={(e) => setNewCardTitle(e.target.value)}
                       onKeyDown={handleKeyDown}
                       rows={1}
                       style={{ minHeight: '24px' }}
                   />
                   
                   <div className="relative group">
                       <textarea
                           className="w-full text-xs text-zinc-600 placeholder-zinc-400 resize-none outline-none bg-transparent min-h-[20px] leading-relaxed transition-all"
                           placeholder="Descrição opcional..."
                           value={newCardDescription}
                           onChange={(e) => { setNewCardDescription(e.target.value); adjustTextareaHeight(e.target); }}
                           onKeyDown={(e) => {
                               if(e.key === 'Enter' && e.shiftKey) return; 
                               if(e.key === 'Enter') { e.preventDefault(); handleCreateSubmit(); }
                           }}
                           rows={1}
                           style={{ minHeight: '20px' }}
                       />
                   </div>

                   {/* Subtasks Creation UI */}
                   {showSubtasks && (
                       <div className="mt-1 space-y-2 border-t border-dashed border-zinc-100 pt-3 animate-in slide-in-from-top-1">
                           {newSubtasks.map((task, idx) => (
                               <div key={idx} className="flex items-center gap-2">
                                   <div className="w-3.5 h-3.5 border-2 rounded-md border-zinc-200 flex-shrink-0"></div>
                                   <input 
                                       className="flex-1 text-xs text-zinc-700 placeholder-zinc-400 outline-none bg-transparent border-b border-transparent focus:border-blue-200 transition-colors pb-0.5"
                                       placeholder="Digite a subtarefa..."
                                       autoFocus={idx === newSubtasks.length - 1}
                                       value={task}
                                       onChange={(e) => handleSubtaskChange(idx, e.target.value)}
                                       onKeyDown={(e) => {
                                           if (e.key === 'Enter' && task.trim()) {
                                               e.preventDefault();
                                               handleAddSubtaskInput();
                                           } else if (e.key === 'Backspace' && !task && newSubtasks.length > 0) {
                                               e.preventDefault();
                                               removeSubtask(idx);
                                           }
                                       }}
                                   />
                                   <button onClick={() => removeSubtask(idx)} className="text-zinc-300 hover:text-rose-500 p-1 transition-colors active:scale-90">
                                       <X size={12} />
                                   </button>
                               </div>
                           ))}
                           <button onClick={handleAddSubtaskInput} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-blue-500 transition-colors mt-1 pl-0.5 font-medium active:scale-95 origin-left">
                               <Plus size={12} /> Adicionar Item
                           </button>
                       </div>
                   )}
               </div>

               {/* TACTICAL TOOLBAR - "PRECISION BAR" */}
               <div className="flex items-center justify-between pt-2 border-t border-zinc-50">
                   <div className="flex items-center gap-1">
                       
                       {/* 1. Category */}
                       <div className="relative">
                          <button 
                             onClick={() => { setShowCategoryMenu(!showCategoryMenu); setShowPriorityMenu(false); setShowDateMenu(false); setShowAssigneeMenu(false); }}
                             className={`p-1.5 rounded-lg border transition-all active:scale-95 ${currentCategory.color} hover:shadow-sm`}
                             title="Categoria"
                          >
                              <CategoryIcon size={14} />
                          </button>
                          {showCategoryMenu && (
                              <div className="absolute bottom-full left-0 mb-2 w-40 bg-white rounded-xl shadow-xl border border-zinc-100 overflow-hidden z-50 p-1 animate-in fade-in zoom-in-95 duration-200">
                                  {CATEGORY_PRESETS.map((cat) => {
                                      const Icon = cat.icon;
                                      return (
                                          <button
                                              key={cat.id}
                                              onClick={() => { setSelectedCategory(cat.id); setShowCategoryMenu(false); }}
                                              className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-colors ${cat.id === selectedCategory ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700'}`}
                                          >
                                              <Icon size={12} /> {cat.label}
                                          </button>
                                      );
                                  })}
                              </div>
                          )}
                       </div>

                       {/* 2. Priority */}
                       <div className="relative">
                          <button 
                             onClick={() => { setShowPriorityMenu(!showPriorityMenu); setShowCategoryMenu(false); setShowDateMenu(false); setShowAssigneeMenu(false); }}
                             className={`p-1.5 rounded-lg border transition-all active:scale-95 ${getPriorityColor()}`}
                             title="Prioridade"
                          >
                              <Flag size={14} className={selectedPriority.urgency > 1 ? "fill-current" : ""} />
                          </button>
                          {showPriorityMenu && (
                            <div className="absolute bottom-full left-0 mb-2 w-36 bg-white rounded-xl shadow-xl border border-zinc-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-1 space-y-0.5">
                                    {[
                                        { l: 'Crítico', u: 4, i: 4, c: 'text-rose-600' },
                                        { l: 'Alta', u: 3, i: 3, c: 'text-amber-600' },
                                        { l: 'Média', u: 2, i: 2, c: 'text-blue-600' },
                                        { l: 'Baixa', u: 1, i: 1, c: 'text-zinc-500' }
                                    ].map((p) => (
                                        <button 
                                            key={p.l}
                                            onClick={() => { setSelectedPriority({urgency: p.u as any, impact: p.i as any}); setShowPriorityMenu(false); }}
                                            className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-zinc-50 flex items-center gap-2 font-medium active:scale-95 ${p.c}`}
                                        >
                                            <Flag size={12} className="fill-current" /> {p.l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                           )}
                       </div>

                       <div className="w-px h-4 bg-zinc-200 mx-0.5"></div>

                       {/* 3. Assignee */}
                       <div className="relative">
                            <button 
                                onClick={() => { setShowAssigneeMenu(!showAssigneeMenu); setShowDateMenu(false); setShowPriorityMenu(false); setShowCategoryMenu(false); }}
                                className={`p-1.5 rounded-lg border transition-all active:scale-95 ${selectedAssignee ? 'bg-blue-50 border-blue-100' : 'bg-white border-transparent hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600'}`}
                                title="Atribuir Responsável"
                            >
                                {selectedAssignee ? (
                                    <img src={users.find(u => u.id === selectedAssignee)?.avatar} className="w-4 h-4 rounded-full object-cover" />
                                ) : (
                                    <UserIcon size={14} />
                                )}
                            </button>
                            {/* Assignee Dropdown */}
                            {showAssigneeMenu && (
                                <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-xl shadow-xl border border-zinc-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                    {users.map(u => (
                                        <button
                                            key={u.id}
                                            onClick={() => { setSelectedAssignee(selectedAssignee === u.id ? undefined : u.id); setShowAssigneeMenu(false); }}
                                            className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 flex items-center gap-2 active:bg-zinc-100"
                                        >
                                            <img src={u.avatar} className="w-5 h-5 rounded-full object-cover" />
                                            {u.name}
                                            {selectedAssignee === u.id && <Check size={12} className="ml-auto text-blue-500" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                       </div>

                       {/* 4. Date Picker */}
                       <div className="relative">
                            <button 
                                onClick={() => { setShowDateMenu(!showDateMenu); setShowPriorityMenu(false); setShowAssigneeMenu(false); setShowCategoryMenu(false); }}
                                className={`
                                    flex items-center gap-1.5 p-1.5 rounded-lg border transition-all active:scale-95
                                    ${selectedDate 
                                        ? 'bg-blue-50 border-blue-200 text-blue-700 pr-1 pl-2' 
                                        : 'bg-white border-transparent hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600'
                                    }
                                `}
                                title="Definir Prazo"
                            >
                                <Calendar size={14} className={selectedDate ? "text-blue-600" : ""} />
                                {selectedDate && (
                                    <span className="text-[9px] font-bold uppercase tracking-tight">
                                        {new Date(selectedDate).toLocaleDateString('pt-BR', {month: 'numeric', day: 'numeric'})}
                                    </span>
                                )}
                            </button>

                            {/* Date Menu */}
                            {showDateMenu && (
                                <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-xl shadow-xl border border-zinc-100 overflow-hidden z-50 p-3 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex gap-2 mb-3">
                                        <button onClick={() => setDatePreset(0)} className="flex-1 bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 text-zinc-600 text-xs font-medium py-1.5 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5">
                                            <Clock size={12} className="text-amber-500" /> Hoje
                                        </button>
                                        <button onClick={() => setDatePreset(1)} className="flex-1 bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 text-zinc-600 text-xs font-medium py-1.5 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5">
                                            <Calendar size={12} className="text-blue-500" /> Amanhã
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between mb-2 px-1">
                                        <button onClick={handlePrevMonth} className="p-1 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded transition-colors active:scale-90">
                                            <ChevronLeft size={16} />
                                        </button>
                                        <span className="text-sm font-bold text-zinc-800 capitalize">
                                            {viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                        </span>
                                        <button onClick={handleNextMonth} className="p-1 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded transition-colors active:scale-90">
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-7 gap-1 mb-1">
                                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(d => (
                                            <div key={d} className="text-[10px] font-bold text-zinc-400 uppercase text-center py-1">
                                                {d}
                                            </div>
                                        ))}
                                        {getDaysArray().map((day, i) => {
                                            if (!day) return <div key={`empty-${i}`} />;
                                            const currentD = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                                            const isSelected = selectedDate && new Date(selectedDate).toDateString() === currentD.toDateString();
                                            const isToday = new Date().toDateString() === currentD.toDateString();
                                            return (
                                                <button
                                                    key={day}
                                                    onClick={() => handleDateSelect(day)}
                                                    className={`
                                                        text-xs font-medium py-1.5 rounded-lg transition-all relative active:scale-90
                                                        ${isSelected 
                                                            ? 'bg-blue-600 text-white shadow-sm' 
                                                            : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                                                        }
                                                        ${isToday && !isSelected ? 'text-blue-600 font-bold bg-blue-50' : ''}
                                                    `}
                                                >
                                                    {day}
                                                    {isToday && !isSelected && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"></div>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                       </div>

                       {/* 5. Subtasks */}
                       <button 
                           onClick={() => { 
                               setShowSubtasks(!showSubtasks); 
                               if (!showSubtasks && newSubtasks.length === 0) setNewSubtasks(['']);
                           }}
                           className={`p-1.5 rounded-lg border transition-all active:scale-95 ${showSubtasks ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-white border-transparent hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600'}`}
                           title="Adicionar Subtarefas"
                       >
                           <ListTodo size={14} />
                       </button>
                   </div>

                    {/* ACTIONS: Cancel / Submit */}
                   <div className="flex items-center gap-1">
                        <button 
                            onClick={() => { setIsFocused(false); resetCreationState(); }}
                            className="p-1.5 text-zinc-300 hover:text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors active:scale-90"
                        >
                            <X size={16} />
                        </button>
                        <button 
                            onClick={handleCreateSubmit}
                            disabled={!newCardTitle.trim()}
                            className={`
                                p-1.5 rounded-lg transition-all shadow-sm active:scale-95 duration-200
                                ${newCardTitle.trim() 
                                    ? 'bg-zinc-900 text-white hover:bg-zinc-800' 
                                    : 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
                                }
                            `}
                        >
                            <SendHorizontal size={14} fill="currentColor" />
                        </button>
                   </div>
               </div>
           </div>
        )}
      </div>

      <div className={`flex-1 overflow-y-auto px-3 pb-4 pt-1 custom-scrollbar`}>
        {cards.length === 0 && !isFocused ? (
             <div className="h-32 flex flex-col items-center justify-center text-zinc-300 select-none">
                 <div className="w-12 h-12 rounded-2xl bg-zinc-100/50 flex items-center justify-center mb-2 animate-pulse">
                    <BoxSelect size={20} className="opacity-40" />
                 </div>
                 <span className="text-xs font-semibold opacity-60">Nenhuma tarefa aqui</span>
                 <span className="text-xs opacity-40 mt-1">Clique em adicionar</span>
             </div>
        ) : (
            cards.map((card, index) => (
            <Card 
                key={card.id} 
                card={card} 
                index={index}
                assignee={users.find(u => u.id === card.assigneeId)}
                onClick={onCardClick}
                onDelete={onCardDelete} 
                onDragStart={handleCardDragStart}
                onDrop={handleCardDropOnCard}
            />
            ))
        )}
      </div>
    </div>
  );
};

export default memo(Column);