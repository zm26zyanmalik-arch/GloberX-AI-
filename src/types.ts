export type Subject = 'Maths' | 'Science' | 'English' | 'Hindi' | 'Social Science';
export type Level = 'Beginner' | 'Intermediate' | 'Advanced';
export type TeacherId = 'rohan' | 'priya';
export type Language = 'Hindi' | 'English' | 'Hinglish' | 'Urdu' | 'Marathi';

export interface Analytics {
  quizzesCompleted: number;
  chatHours: number;
  studySessions: number;
  subjectMastery: Record<string, number>; // Subject name to mastery percentage
  lastActive: Date;
}

export interface User {
  name: string;
  class: string; // '1' to '12'
  level: Level;
  weakSubjects: Subject[];
  preferredLanguage: Language;
  onboarded: boolean;
  mistakes: string[]; // Topic names or question snippets
  stats: Analytics;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface StudyTask {
  id: string;
  title: string;
  subject: Subject;
  completed: boolean;
  dueDate: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  subject: Subject;
  lastEdited: Date;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  teacherId: TeacherId;
  subject?: Subject;
  lastMessageAt: Date;
}
