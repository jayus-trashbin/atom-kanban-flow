import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Card, PriorityLevel, User, Subtask, Comment, Column } from '../types';
import { enhanceCardDescription, suggestSubtasks } from '../services/geminiService';
import { X, Trash2, CheckCircle2, Hash, Calendar, Check, AlignLeft, Wand2, ListTodo, CheckSquare, Plus, Clock, ChevronLeft, ChevronRight, User as UserIcon, Tag, AlertCircle, MessageSquare, Send, Sparkles, Loader2, Layout, ArrowRightCircle, ArrowRight } from 'lucide-react';
import PriorityBadge from './PriorityBadge';

interface CardDetailProps {
  card: Card;
  users: User[];
  columns?: Column[];
  currentUser: User;
  availableTags?: string[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (card: Card) => void;
  onDelete: (cardId: string) => void;
}

const COLORS = [
    'bg-red-50 text-red-700 border-red-200',
    'bg-orange-50 text-orange-700 border-orange-200',
    'bg-amber-50 text-amber-700 border-amber-200',
    'bg-emerald-50 text-emerald-700 border-emerald-200',
    'bg-teal-50 text-teal-700 border-teal-200',
    'bg-cyan-50 text-cyan-700 border-cyan-200',
    'bg-blue-50 text-blue-700 border-blue-200',
    'bg-indigo-50 text-indigo-700 border-indigo-200',
    'bg-violet-50 text-violet-700 border-violet-200',
    'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    'bg-pink-50 text-pink-700 border-pink-200',
    'bg-rose-50 text-rose-700 border-rose-200',
];

const getTagColor = (tag: string) => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
        hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLORS[Math.abs(hash) % COLORS.length];
};

const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'agora';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'ontem';
    return `há ${days} dias`;
};

const CardDetail: React.FC<CardDetailProps> = ({ card, users, columns = [], currentUser, availableTags = [], isOpen, onClose, onUpdate, onDelete }) => {
  const [localCard, setLocalCard] = useState<Card>(card);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiActionType, setAiActionType] = useState<'improve' | 'subtasks' | null>(null);
  
  // Interactive Menu States
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // Subtask & Tag Inputs
  const [newTag, setNewTag] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  
  // Subtask Editing State
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');

  // Comment State
  const [newComment, setNewComment] = useState('');
  
  // Calendar State
  const [viewDate, setViewDate] = useState(new Date());

  // Refs for autosize textareas and clicking outside
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalCard(card);
    if(card.dueDate) setViewDate(new Date(card.dueDate));
  }, [card]);

  // Handle clicking outside sidebar menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
            setShowDateMenu(false);
            setShowTagMenu(false);
            setShowAssigneeMenu(false);
        }
        if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
            setShowColumnMenu(false);
        }
    };
    if (showDateMenu || showTagMenu || showAssigneeMenu || showColumnMenu) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDateMenu, showTagMenu, showAssigneeMenu, showColumnMenu]);

  const resizeTextarea = (ref: React.RefObject<HTMLTextAreaElement>) => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight + 2}px`;
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
        resizeTextarea(titleRef);
        resizeTextarea(descRef);
    }
  }, [localCard.title, localCard.description, isOpen]);

  const handleUpdate = (updates: Partial<Card>) => {
    const updated = { ...localCard, ...updates };
    setLocalCard(updated);
    onUpdate(updated);
  };

  // --- Date Picker Logic (Copied from Column for consistency) ---
  const getDaysArray = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const handleDateSelect = (day: number) => {
      const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
      newDate.setHours(12, 0, 0, 0); 
      handleUpdate({ dueDate: newDate.getTime() });
      setShowDateMenu(false);
  };

  const setDatePreset = (daysFromNow: number) => {
      const d = new Date();
      d.setDate(d.getDate() + daysFromNow);
      d.setHours(12, 0, 0, 0);
      handleUpdate({ dueDate: d.getTime() });
      setShowDateMenu(false);
  };

  // --- Tag Logic ---
  const handleAddTag = (tagToAdd: string) => {
      const normalized = tagToAdd.trim();
      if (normalized && !localCard.tags.includes(normalized)) {
          handleUpdate({ tags: [...localCard.tags, normalized] });
      }
      setNewTag('');
  };

  const removeTag = (tagToRemove: string) => {
      handleUpdate({ tags: localCard.tags.filter(t => t !== tagToRemove) });
  };

  // --- Subtasks Logic ---
  const handleAddSubtask = () => {
      if (newSubtaskTitle.trim()) {
          const newSubtask: Subtask = {
              id: Math.random().toString(36).substr(2, 9),
              title: newSubtaskTitle.trim(),
              completed: false
          };
          handleUpdate({ subtasks: [...localCard.subtasks, newSubtask] });
          setNewSubtaskTitle('');
      }
  };

  const toggleSubtask = (subtaskId: string) => {
      const updatedSubtasks = localCard.subtasks.map(t => 
          t.id === subtaskId ? { ...t, completed: !t.completed } : t
      );
      handleUpdate({ subtasks: updatedSubtasks });
  };

  const deleteSubtask = (subtaskId: string) => {
      const updatedSubtasks = localCard.subtasks.filter(t => t.id !== subtaskId);
      handleUpdate({ subtasks: updatedSubtasks });
  };

  const startEditingSubtask = (task: Subtask) => {
    setEditingSubtaskId(task.id);
    setEditingSubtaskTitle(task.title);
  };

  const saveSubtaskEdit = () => {
      if (editingSubtaskId && editingSubtaskTitle.trim()) {
          const updatedSubtasks = localCard.subtasks.map(t => 
              t.id === editingSubtaskId ? { ...t, title: editingSubtaskTitle.trim() } : t
          );
          handleUpdate({ subtasks: updatedSubtasks });
      }
      setEditingSubtaskId(null);
  };

  // --- Comment Logic ---
  const handleAddComment = () => {
      if (!newComment.trim()) return;
      const comment: Comment = {
          id: Math.random().toString(36).substr(2, 9),
          userId: currentUser.id,
          text: newComment.trim(),
          timestamp: Date.now()
      };
      // Initialize comments array if it doesn't exist (older cards)
      const currentComments = localCard.comments || [];
      handleUpdate({ comments: [...currentComments, comment] });
      setNewComment('');
  };

  const handleDeleteComment = (commentId: string) => {
      handleUpdate({ comments: localCard.comments.filter(c => c.id !== commentId) });
  };

  // --- AI Logic ---
  const handleAiEnhance = async () => {
    setIsAiLoading(true);
    setAiActionType('improve');
    try {
      const improved = await enhanceCardDescription(localCard.title, localCard.description);
      handleUpdate({ description: improved });
    } finally {
      setIsAiLoading(false);
      setAiActionType(null);
    }
  };

  const handleAiSubtasks = async () => {
    setIsAiLoading(true);
    setAiActionType('subtasks');
    try {
      const suggestions = await suggestSubtasks(localCard.title, localCard.description);
      const newDesc = localCard.description + (localCard.description ? "\n\n" : "") + "Sugestões de IA:\n" + suggestions;
      handleUpdate({ description: newDesc });
    } finally {
      setIsAiLoading(false);
      setAiActionType(null);
    }
  };

  // --- Derived State for UI ---
  const completedCount = localCard.subtasks.filter(t => t.completed).length;
  const totalCount = localCard.subtasks.length;
  const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const getDueDateStatus = () => {
      if (!localCard.dueDate) return null;
      const now = new Date(); now.setHours(0,0,0,0);
      const due = new Date(localCard.dueDate); due.setHours(0,0,0,0);
      const diff = (due.getTime() - now.getTime()) / (1000 * 3600 * 24);
      
      if (diff < 0) return { label: 'Atrasado', color: 'text-rose-600 bg-rose-50 border-rose-200' };
      if (diff === 0) return { label: 'Hoje', color: 'text-amber-600 bg-amber-50 border-amber-200' };
      if (diff === 1) return { label: 'Amanhã', color: 'text-blue-600 bg-blue-50 border-blue-200' };
      return { label: due.toLocaleDateString('pt-BR', {month: 'short', day: 'numeric'}), color: 'text-zinc-700 bg-white border-zinc-200' };
  };
  const dateStatus = getDueDateStatus();

  // Find current column name
  const currentColumn = columns.find(c => c.id === localCard.columnId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end font-sans">
      <div 
        className="absolute inset-0 bg-zinc-900/20 backdrop-blur-sm transition-all duration-500" 
        onClick={onClose}
      />

      <div className="relative w-full max-w-5xl bg-white h-full shadow-2xl flex flex-col transform transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] animate-in slide-in-from-right-16">
        
        {/* Header - Tactical HUD Style */}
        <div ref={headerRef} className="flex-none flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-white/80 backdrop-blur-md z-20">
            <div className="flex items-center gap-3">
                 <PriorityBadge priority={localCard.priority} size="md" />
                 <span className="text-zinc-300">|</span>
                 
                 {/* Column Switcher (Quick Move) */}
                 <div className="relative">
                    <button 
                        onClick={() => setShowColumnMenu(!showColumnMenu)}
                        className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded transition-colors active:scale-95 uppercase tracking-wide"
                    >
                        {currentColumn ? currentColumn.title : '...'}
                        <ArrowRight size={12} />
                    </button>

                    {showColumnMenu && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-zinc-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                             {columns.map(col => (
                                 <button
                                    key={col.id}
                                    onClick={() => { handleUpdate({ columnId: col.id }); setShowColumnMenu(false); }}
                                    className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 active:bg-zinc-100
                                        ${col.id === localCard.columnId ? 'bg-blue-50 text-blue-700' : 'text-zinc-600 hover:bg-zinc-50'}
                                    `}
                                 >
                                     <div className={`w-2 h-2 rounded-full ${col.id === localCard.columnId ? 'bg-blue-500' : 'bg-zinc-300'}`} />
                                     {col.title}
                                     {col.id === localCard.columnId && <Check size={12} className="ml-auto" />}
                                 </button>
                             ))}
                        </div>
                    )}
                 </div>

                 <span className="text-zinc-300">|</span>
                 <span className="text-zinc-400 text-xs font-mono">#{localCard.id.toUpperCase()}</span>
            </div>
            
            <div className="flex items-center gap-2">
                 <button 
                    onClick={() => onDelete(card.id)}
                    className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all active:scale-90"
                    title="Excluir Tarefa"
                 >
                    <Trash2 size={18} />
                </button>
                <div className="h-4 w-px bg-zinc-200 mx-1"></div>
                <button 
                    onClick={onClose} 
                    className="p-2 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-all active:scale-90"
                    title="Fechar"
                >
                    <X size={20} />
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-white">
            
            {/* LEFT: Content Editor */}
            <div className="flex-1 overflow-y-auto custom-scrollbar lg:order-1 order-1">
                <div className="max-w-3xl mx-auto p-8 space-y-10 pb-32">
                    {/* Title */}
                    <textarea
                        ref={titleRef}
                        className="w-full text-3xl sm:text-4xl font-bold text-zinc-900 placeholder-zinc-300 border-none p-0 focus:ring-0 resize-none bg-transparent leading-tight min-h-[50px] transition-colors selection:bg-blue-100 selection:text-blue-900"
                        rows={1}
                        value={localCard.title}
                        onChange={(e) => handleUpdate({ title: e.target.value })}
                        placeholder="Título da Tarefa"
                    />

                    {/* Description Section */}
                    <div className="group relative">
                        <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-2">
                             <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                <AlignLeft size={14} /> Descrição
                            </h3>
                            
                            {/* Intelligent AI Toolbar */}
                            <div className="flex items-center gap-1.5">
                                <button 
                                    onClick={handleAiEnhance} 
                                    disabled={isAiLoading} 
                                    className={`
                                        flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 border
                                        ${aiActionType === 'improve' 
                                            ? 'bg-violet-50 text-violet-700 border-violet-200' 
                                            : 'bg-white border-zinc-200 text-zinc-600 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50'
                                        }
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                    `}
                                    title="IA: Melhorar Gramática e Tom"
                                >
                                    {aiActionType === 'improve' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                    <span>Melhorar</span>
                                </button>
                                
                                <button 
                                    onClick={handleAiSubtasks} 
                                    disabled={isAiLoading} 
                                    className={`
                                        flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 border
                                        ${aiActionType === 'subtasks'
                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                            : 'bg-white border-zinc-200 text-zinc-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50'
                                        }
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                    `}
                                    title="IA: Sugerir Subtarefas"
                                >
                                    {aiActionType === 'subtasks' ? <Loader2 size={12} className="animate-spin" /> : <ListTodo size={12} />}
                                    <span>Checklist</span>
                                </button>
                            </div>
                        </div>

                        <div className="min-h-[100px] relative">
                            {/* Visual highlight when AI is working */}
                            {isAiLoading && (
                                <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center transition-all duration-300">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="p-2 bg-white rounded-full shadow-lg border border-zinc-100">
                                            <Wand2 className="text-violet-500 animate-pulse" size={20} />
                                        </div>
                                        <span className="text-xs font-medium text-zinc-500 animate-pulse">Aprimorando...</span>
                                    </div>
                                </div>
                            )}
                            <textarea
                                ref={descRef}
                                className="w-full text-base text-zinc-700 placeholder-zinc-300 focus:ring-0 border-none p-0 resize-none leading-relaxed bg-transparent min-h-[120px]"
                                value={localCard.description}
                                onChange={(e) => handleUpdate({ description: e.target.value })}
                                placeholder="Adicione detalhes sobre esta tarefa..."
                            />
                        </div>
                    </div>

                    {/* Subtasks Section */}
                    <div>
                         <div className="flex items-center justify-between mb-4">
                             <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                <CheckSquare size={14} /> Subtarefas
                            </h3>
                            {totalCount > 0 && (
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${progress === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                                    {completedCount}/{totalCount}
                                </span>
                            )}
                         </div>

                         {/* Progress Bar */}
                         {totalCount > 0 && (
                             <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden mb-5">
                                 <div 
                                    className={`h-full transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                    style={{ width: `${progress}%` }}
                                 />
                             </div>
                         )}

                        <div className="space-y-2">
                             {localCard.subtasks.map((task) => (
                                 <div key={task.id} className="group flex items-start gap-3 p-2 hover:bg-zinc-50 rounded-xl transition-all duration-200 border border-transparent hover:border-zinc-100">
                                     <button 
                                        onClick={() => toggleSubtask(task.id)}
                                        className={`
                                            mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 active:scale-90
                                            ${task.completed 
                                                ? 'bg-blue-500 border-blue-500 shadow-sm' 
                                                : 'bg-white border-zinc-300 hover:border-blue-400'
                                            }
                                        `}
                                     >
                                         <Check size={12} className={`text-white transition-transform duration-200 ${task.completed ? 'scale-100' : 'scale-0'}`} strokeWidth={3} />
                                     </button>
                                     
                                     {/* Inline Editing for Subtasks */}
                                     {editingSubtaskId === task.id ? (
                                         <input 
                                            autoFocus
                                            className="flex-1 text-sm text-zinc-800 bg-white border border-blue-400 rounded px-2 py-0.5 outline-none shadow-sm"
                                            value={editingSubtaskTitle}
                                            onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                                            onBlur={saveSubtaskEdit}
                                            onKeyDown={(e) => {
                                                if(e.key === 'Enter') saveSubtaskEdit();
                                            }}
                                         />
                                     ) : (
                                         <div 
                                            onClick={() => startEditingSubtask(task)}
                                            className={`flex-1 text-sm leading-snug break-words cursor-text transition-all duration-200 ${task.completed ? 'text-zinc-400 line-through decoration-zinc-300' : 'text-zinc-700'}`}
                                         >
                                            {task.title}
                                         </div>
                                     )}

                                     <button 
                                        onClick={() => deleteSubtask(task.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all active:scale-90"
                                     >
                                         <X size={14} />
                                     </button>
                                 </div>
                             ))}
                        </div>
                        
                        <div className="mt-3 flex items-center gap-3 p-2">
                            <Plus size={20} className="text-zinc-300" />
                            <input 
                                className="flex-1 bg-transparent text-sm placeholder-zinc-400 text-zinc-800 outline-none"
                                placeholder="Adicionar subtarefa..."
                                value={newSubtaskTitle}
                                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if(e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddSubtask();
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Comments Section */}
                    <div className="pt-6 border-t border-zinc-100">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2 mb-6">
                            <MessageSquare size={14} /> Comentários
                        </h3>

                        {/* Comment Input */}
                        <div className="flex gap-4 mb-8">
                            <img src={currentUser.avatar} alt="You" className="w-9 h-9 rounded-full ring-2 ring-white shadow-sm" />
                            <div className="flex-1 relative group">
                                <textarea
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-800 placeholder-zinc-400 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all resize-none shadow-sm min-h-[80px]"
                                    placeholder="Escreva um comentário..."
                                    rows={2}
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAddComment();
                                        }
                                    }}
                                />
                                <button 
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim()}
                                    className="absolute bottom-3 right-3 p-2 rounded-lg text-white bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all active:scale-90 shadow-sm"
                                >
                                    <Send size={14} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>

                        {/* Comments List */}
                        <div className="space-y-6">
                            {(localCard.comments || []).length === 0 && (
                                <div className="text-center text-zinc-400 text-xs italic py-4">
                                    Nenhum comentário ainda. Inicie a conversa!
                                </div>
                            )}
                            
                            {[...(localCard.comments || [])].reverse().map((comment) => {
                                const author = users.find(u => u.id === comment.userId) || { name: 'Desconhecido', avatar: '' };
                                const isAuthor = comment.userId === currentUser.id;

                                return (
                                    <div key={comment.id} className="flex gap-4 group animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <img src={author.avatar} alt={author.name} className="w-8 h-8 rounded-full mt-1 border border-zinc-100" />
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-zinc-800">{author.name}</span>
                                                    <span className="text-xs text-zinc-400">{formatTimeAgo(comment.timestamp)}</span>
                                                </div>
                                                {isAuthor && (
                                                    <button 
                                                        onClick={() => handleDeleteComment(comment.id)}
                                                        className="text-zinc-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1 active:scale-90"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="text-sm text-zinc-600 leading-relaxed bg-zinc-50/50 p-3 rounded-lg rounded-tl-none border border-zinc-50/50">
                                                {comment.text}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>

            {/* RIGHT: Sidebar - PROPERTIES */}
            <div ref={sidebarRef} className="w-full lg:w-80 bg-zinc-50/80 border-l border-zinc-100 p-6 overflow-y-auto custom-scrollbar space-y-8 lg:order-2 order-2 backdrop-blur-xl">
                
                {/* Priority Selection */}
                <section className="space-y-3">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        Prioridade
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { label: 'Baixa', level: 'low' }, 
                            { label: 'Média', level: 'medium' }, 
                            { label: 'Alta', level: 'high' }, 
                            { label: 'Crítico', level: 'critical' }
                        ].map(({ label, level }) => {
                            let p = { urgency: 1, impact: 1 };
                            if (level === 'medium') p = { urgency: 2, impact: 2 };
                            if (level === 'high') p = { urgency: 3, impact: 3 };
                            if (level === 'critical') p = { urgency: 4, impact: 4 };
                            
                            const isSelected = localCard.priority.urgency === p.urgency && localCard.priority.impact === p.impact;

                            return (
                                <button
                                    key={level}
                                    onClick={() => handleUpdate({ priority: p as any })}
                                    className={`
                                        px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all border active:scale-95 duration-200
                                        ${isSelected
                                            ? 'bg-white border-zinc-300 shadow-sm ring-1 ring-zinc-200 text-zinc-900' 
                                            : 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600'
                                        }
                                    `}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Assignee - Visual Dropdown */}
                <section className="space-y-3 relative">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        Responsável
                    </label>
                    <button 
                        onClick={() => { setShowAssigneeMenu(!showAssigneeMenu); setShowDateMenu(false); setShowTagMenu(false); }}
                        className="w-full flex items-center gap-3 p-2 bg-white border border-zinc-200 rounded-xl hover:border-zinc-300 hover:shadow-sm transition-all active:scale-[0.98] text-left group"
                    >
                        {localCard.assigneeId ? (
                            <>
                                <img 
                                    src={users.find(u => u.id === localCard.assigneeId)?.avatar} 
                                    className="w-8 h-8 rounded-full bg-zinc-100" 
                                    alt="Responsável" 
                                />
                                <span className="text-sm font-semibold text-zinc-700">
                                    {users.find(u => u.id === localCard.assigneeId)?.name}
                                </span>
                            </>
                        ) : (
                            <>
                                <div className="w-8 h-8 rounded-full bg-zinc-50 border border-dashed border-zinc-300 flex items-center justify-center text-zinc-400 group-hover:text-zinc-600 group-hover:border-zinc-400 transition-colors">
                                    <UserIcon size={16} />
                                </div>
                                <span className="text-sm font-medium text-zinc-500 group-hover:text-zinc-700">Não atribuído</span>
                            </>
                        )}
                        <div className="ml-auto text-zinc-300 group-hover:text-zinc-500 transition-colors">
                             <ChevronRight size={16} className="rotate-90" />
                        </div>
                    </button>

                    {showAssigneeMenu && (
                         <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl border border-zinc-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                            {users.map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => { handleUpdate({ assigneeId: localCard.assigneeId === u.id ? undefined : u.id }); setShowAssigneeMenu(false); }}
                                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 flex items-center gap-3 border-b border-zinc-50 last:border-0 active:bg-zinc-100 transition-colors"
                                >
                                    <img src={u.avatar} className="w-6 h-6 rounded-full" />
                                    {u.name}
                                    {localCard.assigneeId === u.id && <Check size={14} className="ml-auto text-blue-500" />}
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                {/* Due Date - Smart Calendar Popover */}
                <section className="space-y-3 relative">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        Prazo
                    </label>
                    <button 
                        onClick={() => { setShowDateMenu(!showDateMenu); setShowAssigneeMenu(false); setShowTagMenu(false); }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all active:scale-[0.98] hover:shadow-sm ${dateStatus ? dateStatus.color : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-500'}`}
                    >
                        <div className="flex items-center gap-2.5">
                            <Calendar size={16} />
                            <span className="text-sm font-medium">
                                {dateStatus ? dateStatus.label : 'Definir prazo...'}
                            </span>
                        </div>
                        {dateStatus && (
                            <div 
                                onClick={(e) => { e.stopPropagation(); handleUpdate({ dueDate: undefined }); }}
                                className="p-1 hover:bg-black/5 rounded-full transition-colors"
                            >
                                <X size={14} />
                            </div>
                        )}
                    </button>

                    {/* Mini Calendar Popover */}
                    {showDateMenu && (
                        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-zinc-100 overflow-hidden z-50 p-4 animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                            {/* Presets */}
                            <div className="flex gap-2 mb-4">
                                <button onClick={() => setDatePreset(0)} className="flex-1 bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 text-zinc-600 text-xs font-bold py-2 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5">
                                    <Clock size={12} className="text-amber-500" /> Hoje
                                </button>
                                <button onClick={() => setDatePreset(1)} className="flex-1 bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 text-zinc-600 text-xs font-bold py-2 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5">
                                    <Calendar size={12} className="text-blue-500" /> Amanhã
                                </button>
                                <button onClick={() => setDatePreset(7)} className="flex-1 bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 text-zinc-600 text-xs font-bold py-2 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5">
                                    Próx. Semana
                                </button>
                            </div>

                            {/* Navigation */}
                            <div className="flex items-center justify-between mb-3 px-1">
                                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-1 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded transition-colors active:scale-90">
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="text-sm font-bold text-zinc-800 capitalize">
                                    {viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                </span>
                                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-1 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded transition-colors active:scale-90">
                                    <ChevronRight size={16} />
                                </button>
                            </div>

                            {/* Grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(d => (
                                    <div key={d} className="text-[10px] font-bold text-zinc-400 uppercase text-center py-1">
                                        {d}
                                    </div>
                                ))}
                                {getDaysArray().map((day, i) => {
                                    if (!day) return <div key={`empty-${i}`} />;
                                    
                                    const currentD = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                                    const isSelected = localCard.dueDate && new Date(localCard.dueDate).toDateString() === currentD.toDateString();
                                    const isToday = new Date().toDateString() === currentD.toDateString();

                                    return (
                                        <button
                                            key={day}
                                            onClick={() => handleDateSelect(day)}
                                            className={`
                                                text-xs font-medium py-2 rounded-lg transition-all relative active:scale-90
                                                ${isSelected 
                                                    ? 'bg-zinc-900 text-white shadow-md' 
                                                    : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                                                }
                                                ${isToday && !isSelected ? 'text-blue-600 font-bold bg-blue-50' : ''}
                                            `}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </section>

                {/* Tags - Smart Tag Manager */}
                <section className="space-y-3 relative">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        Etiquetas
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {localCard.tags.map(tag => (
                            <span 
                                key={tag} 
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-semibold shadow-sm ${getTagColor(tag)}`}
                            >
                                #{tag}
                                <button onClick={() => removeTag(tag)} className="opacity-50 hover:opacity-100 ml-1 transition-opacity"><X size={10}/></button>
                            </span>
                        ))}
                        
                        <button 
                            onClick={() => { setShowTagMenu(!showTagMenu); setShowDateMenu(false); setShowAssigneeMenu(false); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-dashed border-zinc-300 text-zinc-500 hover:text-zinc-800 hover:border-zinc-400 hover:bg-white text-xs font-medium transition-all active:scale-95"
                        >
                            <Plus size={12} /> Adicionar
                        </button>
                    </div>
                    
                    {/* Tag Menu Popover */}
                    {showTagMenu && (
                        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-zinc-100 overflow-hidden z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                             <div className="relative mb-2">
                                <Hash size={14} className="absolute left-2.5 top-2.5 text-zinc-400" />
                                <input 
                                    autoFocus
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none focus:border-blue-400 transition-colors"
                                    placeholder="Buscar ou criar..."
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddTag(newTag);
                                        }
                                    }}
                                />
                             </div>
                             
                             <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                                {newTag && !localCard.tags.includes(newTag) && (
                                    <button 
                                        onClick={() => handleAddTag(newTag)}
                                        className="w-full text-left px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 rounded flex items-center gap-2"
                                    >
                                        <Plus size={12} /> Criar "{newTag}"
                                    </button>
                                )}
                                
                                {availableTags.filter(t => t.toLowerCase().includes(newTag.toLowerCase()) && !localCard.tags.includes(t)).map(tag => (
                                     <button 
                                        key={tag}
                                        onClick={() => handleAddTag(tag)}
                                        className="w-full text-left px-2 py-1.5 rounded hover:bg-zinc-50 flex items-center gap-2"
                                     >
                                         <span className={`w-2 h-2 rounded-full ${getTagColor(tag).split(' ')[0].replace('bg-', 'bg-')}`}></span>
                                         <span className="text-sm text-zinc-600">{tag}</span>
                                     </button>
                                ))}
                                
                                {availableTags.length === 0 && !newTag && (
                                    <div className="text-center py-4 text-xs text-zinc-400 italic">
                                        Digite para criar uma nova tag
                                    </div>
                                )}
                             </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CardDetail;