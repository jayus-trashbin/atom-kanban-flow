import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, Column as ColumnType, User, Subtask } from './types';
import Column from './components/Column';
import CardDetail from './components/CardDetail';
import { Search, Plus, Hexagon, HelpCircle, Keyboard, LayoutGrid, X } from 'lucide-react';

// --- CONFIGURAÇÃO DA EQUIPE ---
// As imagens agora apontam para arquivos locais em assets/avatars/
// Para substituir por PNGs reais, basta sobrescrever os arquivos na pasta e manter os nomes (ou atualizar aqui).
const INITIAL_USERS: User[] = [
  { 
    id: 'arta', 
    name: 'Arta', 
    avatar: 'assets/avatars/arta.svg' 
  },
  { 
    id: 'tomaz', 
    name: 'Tomaz', 
    avatar: 'assets/avatars/tomaz.svg' 
  },
  { 
    id: 'kawe', 
    name: 'Kawê', 
    avatar: 'assets/avatars/kawe.svg' 
  }
];

const INITIAL_COLUMNS: ColumnType[] = [
  { id: 'todo', title: 'A Fazer', order: 0 },
  { id: 'progress', title: 'Em Progresso', order: 1 },
  { id: 'review', title: 'Em Revisão', order: 2 },
  { id: 'done', title: 'Concluído', order: 3 },
];

// Start Clean - No hardcoded cards for production-like feel
const INITIAL_CARDS: Card[] = [];

// Broadcast Channel for Real-time Tab Sync
const broadcast = new BroadcastChannel('atomflow_sync');

// Optimization: Stable empty array reference to prevent unnecessary re-renders
const EMPTY_ARRAY: Card[] = [];

const App: React.FC = () => {
  // --- PERSISTENCE LAYER ---
  const [columns, setColumns] = useState<ColumnType[]>(() => {
    try {
      const saved = localStorage.getItem('atomflow_columns');
      return saved ? JSON.parse(saved) : INITIAL_COLUMNS;
    } catch {
      return INITIAL_COLUMNS;
    }
  });

  const [cards, setCards] = useState<Card[]>(() => {
    try {
      const saved = localStorage.getItem('atomflow_cards');
      return saved ? JSON.parse(saved) : INITIAL_CARDS;
    } catch {
      return INITIAL_CARDS;
    }
  });

  // --- REAL-TIME SYNC (BroadcastChannel & Storage Event) ---
  useEffect(() => {
    // Handler for updates from other tabs via BroadcastChannel (Faster)
    const handleBroadcast = (event: MessageEvent) => {
        const { type, payload } = event.data;
        if (type === 'UPDATE_CARDS') {
            setCards(payload);
        } else if (type === 'UPDATE_COLUMNS') {
            setColumns(payload);
        }
    };

    // Handler for updates via localStorage event (Backup/Robustness)
    const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'atomflow_cards' && e.newValue) {
            setCards(JSON.parse(e.newValue));
        }
        if (e.key === 'atomflow_columns' && e.newValue) {
            setColumns(JSON.parse(e.newValue));
        }
    };

    broadcast.onmessage = handleBroadcast;
    window.addEventListener('storage', handleStorageChange);

    return () => {
        broadcast.onmessage = null;
        window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Persist and Broadcast Changes
  const persistCards = (newCards: Card[]) => {
      setCards(newCards);
      localStorage.setItem('atomflow_cards', JSON.stringify(newCards));
      broadcast.postMessage({ type: 'UPDATE_CARDS', payload: newCards });
  };

  const persistColumns = (newColumns: ColumnType[]) => {
      setColumns(newColumns);
      localStorage.setItem('atomflow_columns', JSON.stringify(newColumns));
      broadcast.postMessage({ type: 'UPDATE_COLUMNS', payload: newColumns });
  };

  const currentUser = INITIAL_USERS[0]; 

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  
  // Manager / Team Filter State
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Derive visible cards based on filters - MEMOIZED for performance
  const filteredCards = useMemo(() => {
      let result = cards;
      if (searchQuery) {
          const lowerQ = searchQuery.toLowerCase();
          result = result.filter(c => c.title.toLowerCase().includes(lowerQ) || c.tags.some(t => t.toLowerCase().includes(lowerQ)));
      }
      if (selectedAssigneeFilter) {
          result = result.filter(c => c.assigneeId === selectedAssigneeFilter);
      }
      return result;
  }, [cards, searchQuery, selectedAssigneeFilter]);

  // CRITICAL OPTIMIZATION: Group cards by column ID using useMemo.
  const cardsByColumn = useMemo(() => {
    const group: Record<string, Card[]> = {};
    for (const card of filteredCards) {
      if (!group[card.columnId]) group[card.columnId] = [];
      group[card.columnId].push(card);
    }
    return group;
  }, [filteredCards]);

  const selectedCard = useMemo(() => cards.find(c => c.id === selectedCardId), [cards, selectedCardId]);
  const allTags = useMemo(() => Array.from(new Set(cards.flatMap(c => c.tags))), [cards]);

  // Stats for Managers
  const overdueCount = useMemo(() => 
    cards.filter(c => c.dueDate && c.dueDate < Date.now() && c.columnId !== 'done').length,
  [cards]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(target.tagName) && target.id !== 'first-column-input') {
          if (e.key === 'Escape') {
            target.blur();
            setIsAddingColumn(false);
          }
          return;
      }
      if (e.key === '/') { e.preventDefault(); searchInputRef.current?.focus(); }
      if (e.key === 'n') { e.preventDefault(); document.getElementById('first-column-input')?.focus(); }
      if (e.key === 'Escape') { setSelectedCardId(null); setIsAddingColumn(false); setShowHelp(false); setSelectedAssigneeFilter(null); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [columns]);

  const handleReorderCard = useCallback((cardId: string, targetColumnId: string, targetIndex?: number) => {
    const prevCards = [...cards];
    const cardIndex = prevCards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;
    
    const card = { ...prevCards[cardIndex] };
    const newCards = [...prevCards];
    newCards.splice(cardIndex, 1);
    
    card.columnId = targetColumnId;

    if (typeof targetIndex === 'number') {
        const targetColumnCards = newCards.filter(c => c.columnId === targetColumnId);
        if (targetIndex >= targetColumnCards.length) {
                newCards.push(card);
        } else {
            const referenceCard = targetColumnCards[targetIndex];
            const insertIndex = newCards.indexOf(referenceCard);
            if (insertIndex !== -1) {
                newCards.splice(insertIndex, 0, card);
            } else {
                newCards.push(card);
            }
        }
    } else {
        newCards.push(card);
    }
    
    persistCards(newCards);
  }, [cards]);

  const handleMoveColumn = useCallback((draggedColId: string, targetColId: string) => {
    const prev = [...columns];
    const draggedIndex = prev.findIndex(c => c.id === draggedColId);
    const targetIndex = prev.findIndex(c => c.id === targetColId);
    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;
    
    const newColumns = [...prev];
    const [removed] = newColumns.splice(draggedIndex, 1);
    newColumns.splice(targetIndex, 0, removed);
    
    const finalized = newColumns.map((col, idx) => col.order === idx ? col : { ...col, order: idx });
    persistColumns(finalized);
  }, [columns]);

  const handleDeleteColumn = useCallback((columnId: string) => {
    const newCols = columns.filter(c => c.id !== columnId);
    const newCards = cards.filter(c => c.columnId !== columnId);
    persistColumns(newCols);
    persistCards(newCards);
  }, [columns, cards]);

  const handleCreateCard = useCallback((columnId: string, rawTitle: string, options?: { priority?: Card['priority'], assigneeId?: string, dueDate?: number, description?: string, subtasks?: string[], tags?: string[] }) => {
    const hashtagRegex = /#(\w+)/g;
    const extractedTags = (rawTitle.match(hashtagRegex) || []).map(t => t.replace('#', ''));
    const cleanTitle = rawTitle.replace(hashtagRegex, '').trim();

    const subtaskObjects: Subtask[] = (options?.subtasks || []).map(t => ({
        id: Math.random().toString(36).substr(2, 9),
        title: t,
        completed: false
    }));

    const finalTags = new Set([...extractedTags, ...(options?.tags || [])]);

    const newCard: Card = {
      id: Math.random().toString(36).substr(2, 9),
      columnId,
      title: cleanTitle || rawTitle,
      description: options?.description || '',
      priority: options?.priority || { urgency: 1, impact: 1 }, 
      tags: Array.from(finalTags),
      subtasks: subtaskObjects,
      assigneeId: options?.assigneeId,
      dueDate: options?.dueDate,
      comments: [],
      createdAt: Date.now()
    };
    persistCards([...cards, newCard]);
  }, [cards]);

  const handleUpdateCard = useCallback((updatedCard: Card) => {
    const newCards = cards.map(c => c.id === updatedCard.id ? updatedCard : c);
    persistCards(newCards);
  }, [cards]);

  const handleDeleteCard = useCallback((cardId: string) => {
    const newCards = cards.filter(c => c.id !== cardId);
    persistCards(newCards);
    if (selectedCardId === cardId) setSelectedCardId(null);
  }, [cards, selectedCardId]);

  const handleAddColumn = () => {
    if (newColumnTitle.trim()) {
      const newCol = { id: newColumnTitle.toLowerCase().replace(/\s+/g, '-'), title: newColumnTitle, order: columns.length };
      persistColumns([...columns, newCol]);
      setNewColumnTitle('');
      setIsAddingColumn(false);
    }
  };

  const handleUpdateColumnTitle = useCallback((columnId: string, newTitle: string) => {
    const newCols = columns.map(c => c.id === columnId ? { ...c, title: newTitle } : c);
    persistColumns(newCols);
  }, [columns]);

  // Memoize handlers for child components
  const handleCardClick = useCallback((c: Card) => setSelectedCardId(c.id), []);

  return (
    <div className="flex flex-col h-screen overflow-hidden text-zinc-900 font-sans relative">
      
      {/* BACKGROUND - Fixed position to prevent scroll repaint lag */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#f3f4f6] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px]"></div>

      {/* Header */}
      <header className="flex-none bg-white/80 backdrop-blur-md border-b border-zinc-200 z-30 relative shadow-[0_2px_12px_-4px_rgba(0,0,0,0.02)]">
        <div className="h-16 px-6 flex items-center justify-between">
            <div className="flex items-center gap-5">
                <div className="flex items-center gap-2.5">
                    <div className="bg-zinc-900 p-1.5 rounded-lg text-white shadow-md">
                        <Hexagon size={18} strokeWidth={3} fill="currentColor" className="text-white" />
                    </div>
                    <h1 className="font-bold text-lg tracking-tight text-zinc-900">AtomFlow</h1>
                </div>
                
                <div className="h-6 w-px bg-zinc-200 hidden sm:block"></div>

                <div className="hidden md:flex items-center gap-4 text-xs font-medium">
                    <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-full border border-zinc-200/60">
                        <LayoutGrid size={14} className="text-zinc-400"/>
                        <span className="text-zinc-600">{cards.length} Tarefas</span>
                    </div>
                    {overdueCount > 0 && (
                        <span className="px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100 flex items-center gap-1.5 animate-pulse">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                            </span>
                            {overdueCount} Atrasadas
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-zinc-50 p-1 rounded-full border border-zinc-100 shadow-inner">
                    <button 
                        onClick={() => setSelectedAssigneeFilter(null)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all duration-200 ${!selectedAssigneeFilter ? 'bg-white shadow-sm text-zinc-900 ring-1 ring-zinc-200/50' : 'text-zinc-400 hover:text-zinc-600'}`}
                    >
                        Todos
                    </button>
                    {INITIAL_USERS.map(u => (
                        <button 
                            key={u.id}
                            onClick={() => setSelectedAssigneeFilter(selectedAssigneeFilter === u.id ? null : u.id)}
                            className={`relative rounded-full transition-all duration-200 border-2 ${selectedAssigneeFilter === u.id ? 'border-blue-500 scale-105 opacity-100' : 'border-transparent opacity-40 hover:opacity-100 grayscale hover:grayscale-0'}`}
                            title={`Filtrar por ${u.name}`}
                        >
                            <img src={u.avatar} className="w-6 h-6 rounded-full bg-white object-cover" alt={u.name} />
                        </button>
                    ))}
                </div>

                <div className="h-6 w-px bg-zinc-200 hidden sm:block mx-1"></div>

                <div className="relative group">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" size={14} />
                    <input 
                    ref={searchInputRef}
                    type="text" 
                    placeholder="Buscar..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-4 py-1.5 bg-zinc-50 border border-zinc-200/50 hover:bg-white hover:border-zinc-300 rounded-lg text-sm w-36 transition-all focus:w-56 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder-zinc-400"
                    />
                </div>

                <button onClick={() => setShowHelp(true)} className="p-2 text-zinc-400 hover:text-zinc-800 transition-colors hover:bg-zinc-100 rounded-lg" title="Atalhos & Ajuda">
                    <HelpCircle size={20} />
                </button>
            </div>
        </div>
      </header>

      {/* Board */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden bg-transparent">
        <div className="h-full flex gap-6 px-8 py-8 min-w-max items-start">
          {columns.map((col, index) => (
            <Column
              key={col.id}
              column={col}
              users={INITIAL_USERS}
              isFirstColumn={index === 0}
              // PERFORMANCE FIX: Use stable pre-calculated group
              cards={cardsByColumn[col.id] || EMPTY_ARRAY}
              onCardClick={handleCardClick}
              onCardReorder={handleReorderCard}
              onCardCreate={handleCreateCard}
              onCardDelete={handleDeleteCard}
              onColumnMove={handleMoveColumn}
              onTitleUpdate={handleUpdateColumnTitle}
              onColumnDelete={handleDeleteColumn}
            />
          ))}
          
          <div className="w-[340px] flex-shrink-0">
            {!isAddingColumn ? (
               <button 
                onClick={() => setIsAddingColumn(true)}
                className="group w-full h-[60px] flex items-center gap-3 px-4 rounded-2xl border-2 border-dashed border-zinc-200 text-zinc-400 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-600 transition-all duration-200"
               >
                   <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                        <Plus size={16} />
                   </div>
                   <span className="font-bold text-sm">Nova Seção</span>
               </button>
            ) : (
                <div className="w-full bg-white rounded-2xl p-4 shadow-xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-widest">Adicionar Coluna</span>
                        <button 
                            onClick={() => setIsAddingColumn(false)}
                            className="p-1 text-zinc-300 hover:text-zinc-500 hover:bg-zinc-50 rounded-md transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                    
                    <input 
                        autoFocus 
                        className="w-full text-base font-bold text-zinc-800 placeholder-zinc-300 outline-none mb-6 bg-transparent" 
                        placeholder="Nome da seção..."
                        value={newColumnTitle}
                        onChange={e => setNewColumnTitle(e.target.value)}
                        onKeyDown={e => { if(e.key === 'Enter') handleAddColumn(); if(e.key==='Escape') setIsAddingColumn(false); }}
                    />
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleAddColumn} 
                            disabled={!newColumnTitle.trim()}
                            className="flex-1 h-9 bg-zinc-900 text-white text-xs font-bold rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            Criar
                        </button>
                    </div>
                </div>
            )}
          </div>
        </div>
      </main>

      {selectedCard && (
        <CardDetail 
          card={selectedCard}
          columns={columns}
          users={INITIAL_USERS}
          currentUser={currentUser}
          availableTags={allTags}
          isOpen={!!selectedCard}
          onClose={() => setSelectedCardId(null)}
          onUpdate={handleUpdateCard}
          onDelete={handleDeleteCard}
        />
      )}

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/10 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowHelp(false)}>
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all border border-zinc-100" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 rounded-xl"><Keyboard size={24}/></div>
                    <div>
                        <h2 className="font-bold text-zinc-900 text-lg">Atalhos</h2>
                        <p className="text-zinc-400 text-xs font-medium">Agilize seu fluxo de trabalho</p>
                    </div>
                </div>
                <div className="space-y-2 text-sm text-zinc-600">
                    <div className="flex items-center justify-between p-2 hover:bg-zinc-50 rounded-lg group transition-colors cursor-default">
                        <span className="font-medium group-hover:text-zinc-900">Nova Tarefa</span> 
                        <kbd className="font-mono bg-white border border-zinc-200 px-2 py-0.5 rounded text-xs shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-zinc-500">N</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 hover:bg-zinc-50 rounded-lg group transition-colors cursor-default">
                        <span className="font-medium group-hover:text-zinc-900">Buscar</span> 
                        <kbd className="font-mono bg-white border border-zinc-200 px-2 py-0.5 rounded text-xs shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-zinc-500">/</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 hover:bg-zinc-50 rounded-lg group transition-colors cursor-default">
                        <span className="font-medium group-hover:text-zinc-900">Fechar</span> 
                        <kbd className="font-mono bg-white border border-zinc-200 px-2 py-0.5 rounded text-xs shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-zinc-500">Esc</kbd>
                    </div>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default App;