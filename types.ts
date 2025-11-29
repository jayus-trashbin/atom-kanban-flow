export type PriorityLevel = 1 | 2 | 3 | 4 | 5;

export interface Priority {
  urgency: PriorityLevel;
  impact: PriorityLevel;
}

export interface User {
  id: string;
  name: string;
  avatar: string; // URL or Initials
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  timestamp: number;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Card {
  id: string;
  columnId: string;
  title: string;
  description: string;
  priority: Priority;
  tags: string[];
  subtasks: Subtask[];
  assigneeId?: string;
  dueDate?: number; // Timestamp
  comments: Comment[];
  createdAt: number;
}

export interface Column {
  id: string;
  title: string;
  order: number;
}

export interface BoardState {
  columns: Column[];
  cards: Card[];
  users: User[];
  currentUser: User;
}

export interface DragItem {
  type: 'CARD';
  id: string;
  columnId: string;
}