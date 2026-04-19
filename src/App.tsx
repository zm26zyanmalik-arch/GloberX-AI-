/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home as HomeIcon, 
  BookOpen, 
  Layout, 
  Camera, 
  Menu as MenuIcon,
  MessageCircle,
  BarChart2,
  Settings,
  X,
  Send,
  CheckCircle2,
  Play,
  ArrowRight,
  LogOut,
  User as UserIcon,
  Plus,
  Loader2,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  Mic,
  Calendar,
  Layers,
  History,
  FileText,
  Search,
  Trash2,
  Edit2,
  Mail,
  Lock,
  ArrowLeft,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import Markdown from 'react-markdown';
import { User, Subject, TeacherId, ChatMessage, StudyTask, Level, QuizQuestion, Note, ChatThread, Language } from './types.ts';
import { TEACHERS, SUBJECTS, DEFAULT_QUIZ, LANGUAGES } from './constants.ts';
import { Button, Card, Avatar, cn, ErrorBoundary } from './components/UI.tsx';
import { getTeacherResponse, solveHomework, generateStudyPlan, analyzeMistakes } from './services/geminiService.ts';

type Screen = 'onboarding' | 'test' | 'login' | 'home' | 'chat' | 'planner' | 'quiz' | 'scanner' | 'analytics' | 'history' | 'notes';

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [user, setUser] = useState<User | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<TeacherId>('rohan');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isTalking, setIsTalking] = useState(false);
  const [plannerTasks, setPlannerTasks] = useState<StudyTask[]>([]);
  const [quizProgress, setQuizProgress] = useState({ score: 0, current: 0, finished: false });
  const [testProgress, setTestProgress] = useState({ score: 0, current: 0, finished: false });
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [audioBlocked, setAudioBlocked] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const heartbeatRef = useRef<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    // Preload voices
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
        console.log("Speech system preloaded and voices ready.");
      };
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const speakQueue = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);

  const speak = (text: string) => {
    if (!window.speechSynthesis) {
      console.error("Voice Generation Failed: Synthesis not supported");
      return;
    }
    
    // CRITICAL: Instant Interrupt
    window.speechSynthesis.cancel();
    setIsTalking(false);
    isSpeakingRef.current = false;
    
    console.log(`Voice interrupt & restart for ${selectedTeacherId}. Text length: ${text.length}`);
    
    // Clear previous queue for new message
    speakQueue.current = text.split(/[.!?]\s+/).filter(s => s.trim().length > 0);
    
    // Failsafe: if text is somehow empty but we called speak
    if (speakQueue.current.length === 0) return;
    
    processQueue();
  };

  const processQueue = () => {
    if (speakQueue.current.length === 0) {
      console.log("Voice playback finished.");
      setIsTalking(false);
      isSpeakingRef.current = false;
      return;
    }

    if (isSpeakingRef.current) return;

    const segment = speakQueue.current.shift()!;
    const utter = new SpeechSynthesisUtterance(segment);
    const voices = window.speechSynthesis.getVoices();
    const teacher = TEACHERS.find(t => t.id === selectedTeacherId);

    // Multi-language detection
    const hasHindi = /[\u0900-\u097F]/.test(segment);
    const isUrdu = /[\u0600-\u06FF]/.test(segment);
    utter.lang = hasHindi ? 'hi-IN' : (isUrdu ? 'ur-PK' : 'en-IN');

    const preferredVoice = voices.find(v => 
      v.lang.startsWith(utter.lang.split('-')[0]) &&
      ((teacher?.gender === 'female' ? v.name.includes('Female') : v.name.includes('Male')) ||
      v.name.includes('Google') || v.name.includes('Natural'))
    ) || voices.find(v => v.lang.startsWith(utter.lang.split('-')[0])) || voices[0];
    
    if (preferredVoice) utter.voice = preferredVoice;
    
    utter.rate = 0.95;
    utter.pitch = teacher?.gender === 'female' ? 1.05 : 0.95;
    
    utter.onstart = () => {
      console.log("Starting audio playback...");
      setIsTalking(true);
      setAudioBlocked(false);
      isSpeakingRef.current = true;
    };

    utter.onend = () => {
      console.log("Audio segment end.");
      isSpeakingRef.current = false;
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      // Slight delay for natural flow but fast enough to feel continuous
      setTimeout(processQueue, 50); 
    };

    utter.onerror = (e) => {
      console.error("Speech Playback Error:", e);
      isSpeakingRef.current = false;
      setIsTalking(false);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      
      // If autoplay is blocked by browser policies
      if (e.error === 'not-allowed') {
         setAudioBlocked(true);
         speakQueue.current.unshift(segment);
      } else if (e.error === 'interrupted') {
         // This is expected during Voice Interrupt System operation
         console.log("Speech interrupted by user/system interaction");
      } else {
         // Failsafe Retry once
         console.log("Retrying speech segment once...");
         speakQueue.current.unshift(segment);
         setTimeout(processQueue, 300); 
      }
    };

    // Bug fix: keep the engine from timing out on long segments
    // by calling resume every few seconds if it's still "speaking"
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.resume();
      } else {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      }
    }, 5000) as unknown as number;

    window.speechSynthesis.speak(utter);
  };

  const currentTeacher = TEACHERS.find(t => t.id === selectedTeacherId) || TEACHERS[0];

  // Persistence Layer
  useEffect(() => {
    const savedUser = localStorage.getItem('globerx_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        if (parsed.onboarded) setScreen('home');
        else setScreen('onboarding');
      } catch (e) {
        console.error("Failed to load user state", e);
      }
    }

    const savedTeacherId = localStorage.getItem('globerx_teacher_id');
    if (savedTeacherId && (savedTeacherId === 'rohan' || savedTeacherId === 'priya')) {
      setSelectedTeacherId(savedTeacherId as TeacherId);
    }
    
    const savedHistory = localStorage.getItem('globerx_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setChatHistory(parsed.map((msg: any) => ({ ...msg, timestamp: new Date(msg.timestamp) })));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }

    const savedNotes = localStorage.getItem('globerx_notes');
    if (savedNotes) {
      try {
        const parsed = JSON.parse(savedNotes);
        setNotes(parsed.map((n: any) => ({ ...n, lastEdited: new Date(n.lastEdited) })));
      } catch (e) {
        console.error("Failed to load notes", e);
      }
    }
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem('globerx_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    if (chatHistory.length > 0) localStorage.setItem('globerx_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    if (notes.length > 0) localStorage.setItem('globerx_notes', JSON.stringify(notes));
  }, [notes]);

  const handleSendMessage = async (overrideText?: string) => {
    const messageText = overrideText || input.trim();
    if (!messageText || !user) return;
    
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: messageText,
      timestamp: new Date()
    };
    
    // Clear input immediately for UX snappy feel
    if (!overrideText) setInput('');
    setChatHistory(prev => [...prev, userMsg]);
    setLoading(true);

    const teacher = TEACHERS.find(t => t.id === selectedTeacherId)!;
    let response = null;

    // Use latest state to avoid stale closure issues
    const currentChatHistory = [...chatHistory, userMsg];

    try {
      response = await getTeacherResponse(
        messageText,
        currentChatHistory,
        user.name,
        user.class,
        user.level,
        teacher.name,
        teacher.personality
      );
    } catch (error) {
      console.error("Chat API Error:", error);
      setLoading(false);
      setChatHistory(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "I'm having a bit of trouble connecting right now. Can you try again?",
        timestamp: new Date()
      }]);
      return;
    }

    try {
      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response || 'I am sorry, something went wrong.',
        timestamp: new Date()
      };
      
      const newHistory = [...currentChatHistory, modelMsg];
      setChatHistory(newHistory);
      setLoading(false);
      
      setThreads(prev => {
        const threadId = activeThreadId || Date.now().toString();
        const existingThread = prev.find(t => t.id === threadId);
        
        if (existingThread) {
          return prev.map(t => t.id === threadId ? {
            ...t,
            messages: newHistory,
            lastMessageAt: new Date()
          } : t);
        } else {
          setActiveThreadId(threadId);
          return [{
            id: threadId,
            title: messageText.slice(0, 30) + (messageText.length > 30 ? '...' : ''),
            messages: newHistory,
            teacherId: selectedTeacherId,
            lastMessageAt: new Date()
          }, ...prev];
        }
      });

      speak(response || ''); 
      
      // Smart Adaptation: Analyze for mistakes every few messages
      if (newHistory.length % 4 === 0) {
        analyzeMistakes(newHistory).then(topics => {
          if (topics && topics.length > 0) {
            setUser(prev => {
              if (!prev) return null;
              const updated = { ...prev, mistakes: Array.from(new Set([...prev.mistakes, ...topics])) };
              localStorage.setItem('globerx_user', JSON.stringify(updated));
              return updated;
            });
          }
        });
      }
      
      localStorage.setItem('globerx_history', JSON.stringify(newHistory));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboarding = (data: Partial<User>) => {
    const newUser: User = {
      name: data.name || 'Student',
      class: data.class || '8',
      level: 'Beginner', 
      weakSubjects: data.weakSubjects || [],
      preferredLanguage: data.preferredLanguage || 'English',
      onboarded: true,
      mistakes: []
    };
    setUser(newUser);
    localStorage.setItem('globerx_user', JSON.stringify(newUser));
    localStorage.setItem('globerx_teacher_id', selectedTeacherId);
    setScreen('test');
  };

  const finalizeTest = (score: number) => {
    let finalLevel: Level = 'Beginner';
    if (score >= 8) finalLevel = 'Advanced';
    else if (score >= 5) finalLevel = 'Intermediate';

    const updatedUser = { ...user!, level: finalLevel };
    setUser(updatedUser);
    localStorage.setItem('globerx_user', JSON.stringify(updatedUser));
    setScreen('home');

    // Generate initial study plan
    generateStudyPlan(updatedUser.name, updatedUser.class, updatedUser.weakSubjects)
      .then(setPlannerTasks)
      .catch(console.error);
  };

  const renderTest = () => {
    const questions: QuizQuestion[] = [
      { id: 't1', question: "If 2x + 5 = 15, what is x?", options: ["5", "10", "2", "7"], correctAnswer: 0 },
      { id: 't2', question: "Which organ pumps blood throughout the body?", options: ["Lungs", "Brain", "Heart", "Liver"], correctAnswer: 2 },
      { id: 't3', question: "Identify the adjective: 'The smart student passed the test.'", options: ["Passed", "Smart", "Student", "Test"], correctAnswer: 1 },
      { id: 't4', question: "What is the chemical symbol for Water?", options: ["O2", "CO2", "H2O", "HO"], correctAnswer: 2 },
      { id: 't5', question: "Which is the largest planet in our solar system?", options: ["Earth", "Mars", "Saturn", "Jupiter"], correctAnswer: 3 },
      { id: 't6', question: "Solve: 12 * 8", options: ["84", "96", "102", "88"], correctAnswer: 1 },
      { id: 't7', question: "Who is known as the 'Teacher of the Nation' in India?", options: ["Radhakrishnan", "Gandhi", "Nehru", "Ambedkar"], correctAnswer: 0 },
      { id: 't8', question: "Which animal is known as the 'Ship of the Desert'?", options: ["Horse", "Camel", "Elephant", "Lion"], correctAnswer: 1 },
      { id: 't9', question: "Synonym of 'Fragile'?", options: ["Strong", "Weak", "Tough", "Hard"], correctAnswer: 1 },
      { id: 't10', question: "Square root of 144?", options: ["10", "14", "12", "16"], correctAnswer: 2 },
    ];

    if (testProgress.finished) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
          <Avatar teacherId={selectedTeacherId} isTalking={true} size="lg" />
          <div className="space-y-2">
            <h2 className="text-3xl font-display font-extrabold tracking-tight">Test Completed! 🎯</h2>
            <p className="text-brand-text-muted">You scored {testProgress.score}/{questions.length}</p>
          </div>
          <Card className="p-6 bg-accent-gradient border-none text-brand-text w-full max-w-sm">
            <p className="font-bold text-lg">Your Level: {
              testProgress.score >= 8 ? 'Advanced' : testProgress.score >= 5 ? 'Intermediate' : 'Beginner'
            }</p>
            <p className="text-xs opacity-80 mt-1 font-medium italic">We've personalized your study engine!</p>
          </Card>
          <Button variant="primary" size="lg" className="w-full max-w-sm shadow-xl" onClick={() => finalizeTest(testProgress.score)}>
            Go to Dashboard <ArrowRight size={18} />
          </Button>
        </div>
      );
    }

    const q = questions[testProgress.current];
    return (
      <div className="h-full flex flex-col bg-brand-secondary">
        <header className="p-6 pt-12 flex justify-between items-center bg-white border-b border-gray-100">
           <div>
             <h2 className="text-xs font-bold uppercase tracking-widest text-brand-text-muted">Placement Test</h2>
             <div className="text-lg font-bold">Level Assessment</div>
           </div>
           <div className="px-4 py-2 bg-gray-50 rounded-full font-bold text-xs">
             Q {testProgress.current + 1}/{questions.length}
           </div>
        </header>

        <main className="flex-1 p-8 space-y-10 overflow-y-auto">
           <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
             <motion.div 
               animate={{ width: `${((testProgress.current) / questions.length) * 100}%` }} 
               className="h-full bg-accent-gradient transition-all" 
             />
           </div>
           
           <div className="space-y-8">
             <h3 className="text-2xl font-display font-extrabold leading-tight">{q.question}</h3>
             <div className="grid gap-4">
               {q.options.map((opt, i) => (
                 <motion.button
                   key={i}
                   whileTap={{ scale: 0.98 }}
                   onClick={() => {
                     const isCorrect = i === q.correctAnswer;
                     const nextFinished = testProgress.current + 1 === questions.length;
                     setTestProgress(prev => ({
                       ...prev,
                       score: isCorrect ? prev.score + 1 : prev.score,
                       current: prev.current + 1,
                       finished: nextFinished
                     }));
                     if (!nextFinished) speak(Math.random() > 0.5 ? "Good choice!" : "Interesting...");
                   }}
                   className="w-full p-5 text-left bg-white rounded-2xl border border-transparent shadow-sm hover:border-brand-accent-start transition-all flex justify-between items-center group font-medium"
                 >
                   <span>{opt}</span>
                   <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <ArrowRight size={18} className="text-brand-accent-start" />
                   </div>
                 </motion.button>
               ))}
             </div>
           </div>
        </main>
      </div>
    );
  };

  const renderHistory = () => (
    <div className="p-6 pb-32 space-y-6">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => setScreen('home')} className="p-2 bg-white rounded-xl shadow-sm lg:hidden hover:bg-gray-50 transition-all border border-gray-100">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-display font-bold">Chat History</h1>
        </div>
        <History className="text-brand-accent-start" />
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
        <input 
          type="text" 
          placeholder="Search past chats..." 
          className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border border-gray-100 outline-none focus:ring-2 ring-brand-accent-start transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {threads.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase())).map(thread => (
          <Card 
            key={thread.id} 
            className="flex items-center gap-4 cursor-pointer hover:border-brand-accent-start transition-all"
            onClick={() => {
              setChatHistory(thread.messages);
              setActiveThreadId(thread.id);
              setSelectedTeacherId(thread.teacherId);
              setScreen('chat');
            }}
          >
            <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
               <Avatar teacherId={thread.teacherId} size="sm" />
            </div>
            <div className="flex-1 min-w-0">
               <h4 className="text-sm font-bold truncate">{thread.title}</h4>
               <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest">
                 {thread.lastMessageAt.toLocaleDateString()}
               </p>
            </div>
            <ChevronRight className="text-gray-300" size={18} />
          </Card>
        ))}
        {threads.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <div className="opacity-20 text-brand-text">
              <History size={64} className="mx-auto" />
            </div>
            <div>
              <p className="font-bold text-lg">No past chats yet</p>
              <p className="text-sm text-brand-text-muted">Start asking questions to build your history!</p>
            </div>
            <Button variant="accent" onClick={() => setScreen('chat')}>Start Learning</Button>
          </div>
        )}
      </div>
    </div>
  );

  const renderNotes = () => (
    <div className="p-6 pb-32 space-y-6">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => setScreen('home')} className="p-2 bg-white rounded-xl shadow-sm lg:hidden hover:bg-gray-50 transition-all border border-gray-100">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-display font-bold">My Study Notes</h1>
        </div>
        <Button size="sm" variant="accent" onClick={() => {
          const newNote: Note = {
            id: Date.now().toString(),
            title: 'New Note',
            content: '',
            subject: 'Science',
            lastEdited: new Date()
          };
          setNotes([newNote, ...notes]);
        }}>
          <Plus size={18} /> New Note
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {notes.map(note => (
          <Card key={note.id} className="p-5 flex flex-col gap-3 group relative">
            <div className="flex justify-between items-start">
              <div className="pill">{note.subject}</div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                 <button className="p-1 hover:text-brand-accent-start"><Edit2 size={14} /></button>
                 <button 
                  className="p-1 hover:text-red-500"
                  onClick={() => setNotes(notes.filter(n => n.id !== note.id))}
                 >
                   <Trash2 size={14} />
                 </button>
              </div>
            </div>
            <input 
              className="font-bold text-lg bg-transparent border-none outline-none"
              value={note.title}
              onChange={(e) => setNotes(notes.map(n => n.id === note.id ? { ...n, title: e.target.value } : n))}
            />
            <textarea 
              className="text-sm text-brand-text-muted bg-transparent border-none outline-none resize-none h-24"
              value={note.content}
              placeholder="Start writing..."
              onChange={(e) => setNotes(notes.map(n => n.id === note.id ? { ...n, content: e.target.value } : n))}
            />
            <div className="text-[10px] font-bold text-gray-300 uppercase tracking-widest italic">
              Edited {note.lastEdited.toLocaleDateString()}
            </div>
          </Card>
        ))}
        {notes.length === 0 && (
          <div className="col-span-full text-center py-20 space-y-4">
            <div className="opacity-20 text-brand-text">
              <FileText size={64} className="mx-auto" />
            </div>
            <div>
              <p className="font-bold text-lg">Your workspace is empty</p>
              <p className="text-sm text-brand-text-muted">Save important notes and snippets here.</p>
            </div>
            <Button variant="secondary" onClick={() => {
              const newNote: Note = {
                id: Date.now().toString(),
                title: 'New Note',
                content: '',
                subject: 'Maths',
                lastEdited: new Date()
              };
              setNotes([newNote, ...notes]);
            }}>Create First Note</Button>
          </div>
        )}
      </div>
    </div>
  );
  const renderOnboarding = () => (
    <div className="h-full bg-brand-secondary p-6 flex flex-col items-center justify-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-accent-gradient rounded-2xl mx-auto flex items-center justify-center shadow-lg transform -rotate-6">
            <span className="text-2xl">🎓</span>
          </div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight">Set up your Profile</h1>
          <p className="text-brand-text-muted text-sm">Personalizing GloberX just for you</p>
        </div>
        
        <Card className="space-y-6 p-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-brand-text-muted mb-4 block font-mono">Choose your Personal AI Teacher</label>
              <div className="grid grid-cols-2 gap-4">
                {TEACHERS.map(teacher => (
                  <motion.div
                    key={teacher.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedTeacherId(teacher.id)}
                    className={cn(
                      "relative p-4 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden group",
                      selectedTeacherId === teacher.id 
                        ? "border-brand-accent-start bg-brand-accent-start/5 shadow-md" 
                        : "border-gray-100 bg-white hover:border-gray-200"
                    )}
                  >
                    <div className="relative z-10 flex flex-col items-center text-center gap-2">
                       <div className={cn(
                         "w-16 h-16 rounded-2xl overflow-hidden border-2 transition-transform duration-300",
                         selectedTeacherId === teacher.id ? "border-brand-accent-start scale-110" : "border-white"
                       )}>
                         <img src={teacher.avatar} alt={teacher.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                       </div>
                       <div>
                         <div className="font-bold text-sm tracking-tight">{teacher.name}</div>
                         <div className="text-[9px] font-bold text-brand-text-muted uppercase tracking-widest">{teacher.gender === 'male' ? 'Lead Educator' : 'Expert Mentor'}</div>
                       </div>
                    </div>
                    {selectedTeacherId === teacher.id && (
                      <motion.div 
                        layoutId="active-teacher" 
                        className="absolute inset-0 bg-brand-accent-start/5 z-0" 
                      />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-brand-text-muted mb-2 block font-mono">Full Name</label>
              <input 
                type="text" 
                className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 ring-brand-accent-start transition-all"
                placeholder="Enter your name"
                onChange={(e) => setUser(prev => ({ ...prev!, name: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-brand-text-muted mb-2 block font-mono">Class</label>
                <select 
                  className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 ring-brand-accent-start transition-all"
                  value={user?.class || '8'}
                  onChange={(e) => setUser(prev => ({ ...prev!, class: e.target.value }))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                    <option key={num} value={String(num)}>Class {num}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-brand-text-muted mb-2 block font-mono">Language</label>
                <select 
                  className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 ring-brand-accent-start transition-all"
                  value={user?.preferredLanguage || 'English'}
                  onChange={(e) => setUser(prev => ({ ...prev!, preferredLanguage: e.target.value as Language }))}
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-brand-text-muted mb-2 block font-mono">Weak Subjects</label>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map(sub => (
                  <button
                    key={sub}
                    onClick={() => {
                      const current = user?.weakSubjects || [];
                      const updated = current.includes(sub) ? current.filter(s => s !== sub) : [...current, sub];
                      setUser(prev => ({ ...prev!, weakSubjects: updated }));
                    }}
                    className={cn(
                      "px-4 py-2 rounded-full text-[10px] font-bold transition-all border uppercase tracking-wider",
                      user?.weakSubjects?.includes(sub) 
                        ? "bg-brand-accent-start border-transparent text-white shadow-md" 
                        : "bg-white border-gray-100 text-brand-text-muted"
                    )}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button variant="accent" className="w-full py-4 shadow-xl" onClick={() => handleOnboarding(user || {})} loading={loading}>
            Create Profile <ArrowRight size={18} />
          </Button>
        </Card>
      </motion.div>
    </div>
  );

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    if (!email.includes('@')) {
      setAuthError('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    console.log(`${authMode === 'login' ? 'Login' : 'Signup'} attempt for ${email}`);

    try {
      // Simulate API call
      await new Promise(r => setTimeout(r, 1500));
      
      console.log(`${authMode === 'login' ? 'Login' : 'Signup'} success!`);
      // Initialize guest user state to prevent crashes in onboarding
      setUser({
        name: '',
        class: '8',
        level: 'Beginner',
        weakSubjects: [],
        preferredLanguage: 'English',
        onboarded: false,
        mistakes: []
      });
      setShowAuthModal(false);
      setScreen('onboarding');
      // Save initial state to avoid lost sessions if page reloads during onboarding
      localStorage.setItem('globerx_user', JSON.stringify({
        name: '',
        class: '8',
        level: 'Beginner',
        weakSubjects: [],
        preferredLanguage: 'English',
        onboarded: false,
        mistakes: []
      }));
    } catch (err) {
      console.error("Auth error:", err);
      setAuthError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderAuthModal = () => (
    <AnimatePresence>
      {showAuthModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAuthModal(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                   <h2 className="text-2xl font-display font-bold">{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
                   <p className="text-brand-text-muted text-sm mt-1">Start your AI journey with GloberX</p>
                </div>
                <button onClick={() => setShowAuthModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-1">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="email" 
                      placeholder="Email Address" 
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 ring-brand-accent-start transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="password" 
                      placeholder="Password" 
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 ring-brand-accent-start transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {authError && (
                  <motion.p 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    className="text-xs font-bold text-red-500 bg-red-50 p-2 rounded-lg"
                  >
                    {authError}
                  </motion.p>
                )}

                <Button type="submit" variant="accent" className="w-full py-4 text-base shadow-xl" loading={loading}>
                  {authMode === 'login' ? 'Sign In' : 'Sign Up'}
                </Button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-brand-text-muted font-bold tracking-widest">Social Auth</span></div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                 {[
                   { id: 'google', icon: 'https://www.google.com/favicon.ico' },
                   { id: 'apple', icon: 'https://appleid.cdn-apple.com/appleid/static/bin/cb1ab2/dist/resources/auth/images/favicon.ico' },
                   { id: 'ms', icon: 'https://www.microsoft.com/favicon.ico' }
                 ].map(provider => (
                   <button 
                    key={provider.id}
                    type="button"
                    onClick={() => {
                      setUser({
                        name: '',
                        class: '10',
                        level: 'Beginner',
                        weakSubjects: [],
                        preferredLanguage: 'English',
                        onboarded: false,
                        mistakes: []
                      });
                      setScreen('onboarding');
                      setShowAuthModal(false);
                    }}
                    className="flex items-center justify-center p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all active:scale-95"
                   >
                     <img src={provider.icon} className="w-5 h-5 grayscale hover:grayscale-0 transition-all" alt={provider.id} />
                   </button>
                 ))}
              </div>

              <p className="mt-8 text-center text-sm font-medium text-brand-text-muted">
                {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
                <button 
                  type="button"
                  onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                  className="ml-2 text-brand-accent-start font-bold underline"
                >
                  {authMode === 'login' ? 'Sign Up' : 'Log In'}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderLogin = () => (
    <div className="h-full bg-white p-8 flex flex-col items-center justify-center">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        className="text-center space-y-2 mb-16"
      >
        <div className="w-20 h-20 bg-accent-gradient rounded-3xl mx-auto flex items-center justify-center shadow-[0_12px_30px_rgba(255,193,7,0.3)] transform rotate-12 mb-8">
          <BookOpen className="text-brand-text" size={40} />
        </div>
        <h1 className="text-3xl font-display font-extrabold tracking-tighter">GloberX AI</h1>
        <p className="text-brand-text-muted font-semibold tracking-tight uppercase tracking-[0.2em] text-[10px]">Your Personal AI Teacher</p>
      </motion.div>

      <div className="w-full space-y-4 max-w-sm">
        <Button variant="accent" className="w-full py-5 text-base shadow-xl" onClick={() => {
          console.log("Login click event: Get Started clicked");
          setAuthMode('signup');
          setShowAuthModal(true);
        }}>
          Explore GloberX AI <ArrowRight size={20} />
        </Button>
        <Button variant="secondary" className="w-full py-5 text-base" onClick={() => {
          console.log("Login click event: Login clicked");
          setAuthMode('login');
          setShowAuthModal(true);
        }}>
          Log In
        </Button>
      </div>

      <div className="mt-12 text-center text-[10px] text-brand-text-muted/60 font-medium max-w-[200px] mx-auto uppercase tracking-widest">
         By continuing, you agree to our <span className="underline">Terms of Service</span>.
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="px-6 py-10 space-y-10 pb-32">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight">GloberX AI</h1>
          <p className="text-[10px] font-bold text-brand-accent-start uppercase tracking-widest mt-1">Class {user?.class} • {user?.level} Level</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-brand-accent-start/10 border-2 border-brand-accent-start/20 flex items-center justify-center">
          <span className="text-xl">👩‍🎓</span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4">
        <Card className="p-0 border-none bg-accent-gradient overflow-hidden relative group cursor-pointer" onClick={() => setScreen('chat')}>
          <div className="p-6 space-y-4 relative z-10 text-brand-text">
            <div className="flex justify-between items-start">
              <div className="pill bg-white/40 text-brand-text">LIVE SESSION</div>
              <div className="flex -space-x-2">
                {TEACHERS.map(t => (
                  <div key={t.id} className="w-8 h-8 rounded-full border-2 border-white overflow-hidden shadow-sm">
                    <img src={t.avatar} className="w-full h-full object-cover" alt={t.name} />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">Private Classroom</h2>
              <p className="text-sm opacity-80 font-medium">Clear your doubts with {currentTeacher.name}</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
              Start Learning <ArrowRight size={14} />
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform" />
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="flex flex-col items-center justify-center p-6 text-center space-y-3 hover:border-brand-accent-start transition-all cursor-pointer" onClick={() => setScreen('planner')}>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
              <Calendar size={24} />
            </div>
            <div className="space-y-0.5">
              <div className="font-bold text-sm">Study Plan</div>
              <div className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest">Grade {user?.class} Roadmap</div>
            </div>
          </Card>
          
          <Card className="flex flex-col items-center justify-center p-6 text-center space-y-3 hover:border-brand-accent-start transition-all cursor-pointer" onClick={() => setScreen('test')}>
            <div className="w-12 h-12 rounded-2xl bg-yellow-50 text-yellow-600 flex items-center justify-center">
              <BookOpen size={24} />
            </div>
            <div className="space-y-0.5">
              <div className="font-bold text-sm">Practice Test</div>
              <div className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest">Mock Quiz</div>
            </div>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <div className="text-xs font-bold uppercase tracking-widest text-brand-text-muted">Today's Focus</div>
          <button className="text-[10px] font-bold text-brand-accent-start uppercase tracking-widest hover:underline">Customize</button>
        </div>
        <div className="space-y-3">
          {plannerTasks.slice(0, 3).map(task => (
            <div key={task.id} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                task.completed ? "bg-green-100 text-green-500" : "bg-gray-50 text-brand-text-muted"
              )}>
                {task.completed ? <CheckCircle2 size={18} /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
              </div>
              <div className="flex-1">
                <div className={cn("text-sm font-bold", task.completed && "line-through opacity-50")}>{task.title}</div>
                <div className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest">{task.subject}</div>
              </div>
            </div>
          ))}
          {plannerTasks.length === 0 && (
            <div className="text-center py-8 opacity-40 italic text-sm">Generating your personalized class roadmap...</div>
          )}
        </div>
      </div>

      <div className="p-6 bg-brand-text text-white rounded-3xl relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="space-y-1">
            <h3 className="text-xl font-bold tracking-tight">Analytics Lab</h3>
            <p className="text-sm opacity-60">Track your class performance</p>
          </div>
          <Button variant="accent" className="w-full text-white" onClick={() => setScreen('analytics')}>View Report</Button>
        </div>
        <div className="absolute bottom-0 right-0 w-32 h-32 opacity-10 translate-y-8 translate-x-8">
          <BarChart2 size={120} />
        </div>
      </div>
    </div>
  );

  const renderChat = () => (
    <div className="flex flex-col h-screen bg-brand-secondary">
      <header className="fixed top-0 left-0 right-0 p-4 pt-12 flex items-center justify-between z-20 bg-white/80 backdrop-blur-md lg:left-64">
        <button onClick={() => setScreen('home')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors lg:hidden">
          <ArrowLeft size={24} />
        </button>
        <div className="hidden lg:block w-10" />
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-lg tracking-tight">{currentTeacher.name}</h2>
            <button 
              onClick={() => setSelectedTeacherId(prev => prev === 'rohan' ? 'priya' : 'rohan')}
              className="p-1.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all active:scale-90"
              title="Switch Teacher"
            >
              <RefreshCw size={12} className="text-brand-text-muted" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[9px] font-bold text-brand-text-muted uppercase tracking-widest text-center">Teacher Online</span>
          </div>
        </div>
        <div className="flex gap-1">
          <button 
            onClick={() => {
              setChatHistory([]);
              setActiveThreadId(null);
            }} 
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Plus size={22} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <Settings size={22} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-32 pb-44 scroll-smooth">
        <div className="flex flex-col items-center mb-8">
           <Avatar 
            teacherId={selectedTeacherId} 
            isTalking={isTalking} 
            size="lg"
           />
           {audioBlocked && !isTalking && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => {
                  setAudioBlocked(false);
                  processQueue();
                }}
                className="mt-4 flex items-center gap-2 px-6 py-3 bg-brand-accent-start text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                <Play size={18} fill="currentColor" />
                Play Explanation
              </motion.button>
           )}
        </div>

        <div className="space-y-6 max-w-2xl mx-auto">
          {chatHistory.length === 0 && (
            <div className="text-center space-y-4 px-4">
              <div className="bg-white p-6 rounded-3xl space-y-3 shadow-sm border border-gray-100">
                <h3 className="text-xl font-display font-bold">Hello {user?.name}!</h3>
                <p className="text-sm text-brand-text-muted">I am ready to help you with your Class {user?.class} studies. What should we learn today?</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                 {['Solve a Maths problem', 'Explain Physics concept', 'Hindi Grammar test'].map(q => (
                   <button 
                    key={q} 
                    onClick={() => {
                      // Pass direct text to avoid state race condition
                      handleSendMessage(q);
                    }}
                    className="px-5 py-2.5 bg-white rounded-full text-xs font-bold border border-gray-100 shadow-sm hover:border-brand-accent-start transition-all"
                   >
                     {q}
                   </button>
                 ))}
              </div>
            </div>
          )}
          
          {chatHistory.map((msg) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex flex-col max-w-[90%] md:max-w-[80%]",
                msg.role === 'user' ? "ml-auto items-end" : "items-start"
              )}
            >
              <div className={cn(
                "p-4 md:p-5 rounded-[2rem] text-sm md:text-base leading-relaxed",
                msg.role === 'user' 
                  ? "bg-brand-text text-white rounded-tr-none" 
                  : "bg-white shadow-sm border border-gray-100 rounded-tl-none prose prose-slate prose-sm"
              )}>
                {msg.role === 'model' ? <Markdown>{msg.text}</Markdown> : msg.text}
              </div>
              <span className="text-[9px] font-bold text-brand-text-muted mt-2 px-2 uppercase tracking-widest">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </motion.div>
          ))}
          {loading && (
            <div className="flex gap-2 items-center text-brand-text-muted animate-pulse font-bold text-[10px] uppercase tracking-widest">
               <div className="flex gap-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-brand-accent-start" />
                 <div className="w-1.5 h-1.5 rounded-full bg-brand-accent-start" />
                 <div className="w-1.5 h-1.5 rounded-full bg-brand-accent-start" />
               </div>
               <span>{currentTeacher.name} is thinking...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-brand-secondary via-brand-secondary to-transparent z-20 lg:left-64">
        <div className="max-w-xl mx-auto space-y-3">
          {chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'model' && !loading && (
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
               {[
                 { label: "Explain Again Better", prompt: "I didn't quite get that. Can you explain it again but even better and simpler?" },
                 { label: "I Still Don't Understand", prompt: "I'm still stuck. Please change your explanation style and use a real-life example." },
                 { label: "Practice Question", prompt: "Give me a practice question on this topic appropriate for Class " + user?.class },
                 { label: "Exam Revision", prompt: "Can we do a quick 2-minute revision of this topic for my exams?" }
               ].map(action => (
                 <button 
                  key={action.label}
                  onClick={() => handleSendMessage(action.prompt)}
                  className="whitespace-nowrap px-4 py-2 bg-white/60 backdrop-blur-sm border border-brand-accent-start/20 rounded-full text-[10px] font-bold uppercase tracking-wider text-brand-accent-start hover:bg-brand-accent-start hover:text-white transition-all shadow-sm"
                 >
                   {action.label}
                 </button>
               ))}
            </div>
          )}
          
          <div className="flex items-center gap-3 bg-white p-1.5 rounded-[2rem] shadow-2xl border border-white">
            <button className="p-3.5 text-brand-text-muted hover:text-brand-accent-start transition-colors">
              <Camera size={22} onClick={() => setScreen('scanner')} />
            </button>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask a question..."
              className="flex-1 px-2 py-3 outline-none text-sm md:text-base font-medium bg-transparent"
            />
            <button 
              disabled={!input.trim() || loading}
              onClick={() => handleSendMessage()}
              className="p-3.5 bg-accent-gradient text-brand-text rounded-full shadow-lg disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );

  const renderPlanner = () => (
    <div className="p-6 pb-32 space-y-6">
      <header className="flex items-center gap-4">
        <button onClick={() => setScreen('home')} className="p-2 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition-all border border-gray-100">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-display font-bold">Study Planner</h1>
      </header>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6">
         {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
           <div key={day} className={cn(
             "min-w-14 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all",
             i === 1 ? "bg-accent-gradient border-transparent" : "bg-white border-gray-100"
           )}>
             <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{day}</span>
             <span className="text-lg font-bold">{17 + i}</span>
           </div>
         ))}
      </div>

      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold">Today's Tasks</h3>
          <Button variant="ghost" size="sm" className="text-xs">Add Task <Plus size={14} /></Button>
        </div>
        
        {plannerTasks.length === 0 ? (
          <div className="p-12 text-center space-y-2 opacity-50">
            <Calendar className="mx-auto" size={40} />
            <p className="text-sm font-medium">No tasks for today. Relax! ✨</p>
          </div>
        ) : (
          <div className="space-y-3">
            {plannerTasks.map(task => (
              <Card key={task.id} className="flex items-center gap-4 p-4">
                <div className={cn(
                  "p-3 rounded-2xl",
                  task.subject === 'Maths' ? "bg-red-50 text-red-500" :
                  task.subject === 'Science' ? "bg-green-50 text-green-500" : "bg-blue-50 text-blue-500"
                )}>
                  <BookOpen size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold">{task.title}</h4>
                  <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest italic">{task.subject}</p>
                </div>
                <button 
                  onClick={() => setPlannerTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                    task.completed ? "bg-green-500 border-green-500 text-white" : "border-gray-200"
                  )}
                >
                  {task.completed && <CheckCircle2 size={16} />}
                </button>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  const renderQuiz = () => {
    if (quizProgress.finished) {
      return (
        <div className="min-h-screen p-6 flex flex-col items-center justify-center text-center space-y-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-32 h-32 bg-accent-gradient rounded-full flex items-center justify-center mx-auto shadow-2xl">
             <span className="text-4xl font-bold">🎉</span>
          </motion.div>
          <div>
            <h1 className="text-3xl font-display font-bold">Great Job!</h1>
            <p className="text-brand-text-muted">You scored {quizProgress.score}/{DEFAULT_QUIZ.length}</p>
          </div>
          <Card className="w-full max-w-sm space-y-4">
             <div className="flex justify-between text-sm">
               <span>Accuracy</span>
               <span className="font-bold">85%</span>
             </div>
             <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: '85%' }} className="h-full bg-accent-gradient" />
             </div>
          </Card>
          <Button variant="accent" className="w-full" onClick={() => {
            setQuizProgress({ score: 0, current: 0, finished: false });
            setScreen('home');
          }}>Back to Home</Button>
        </div>
      );
    }

    const q = DEFAULT_QUIZ[quizProgress.current];
    return (
      <div className="p-6 flex flex-col h-screen">
        <header className="flex justify-between items-center mb-12">
           <button onClick={() => setScreen('home')} className="p-2 bg-white rounded-xl shadow-sm"><X size={20} /></button>
           <div className="px-4 py-2 bg-white rounded-full font-bold text-xs shadow-sm">
             Question {quizProgress.current + 1}/{DEFAULT_QUIZ.length}
           </div>
           <div className="w-10" />
        </header>

        <div className="flex-1 space-y-8">
           <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
             <motion.div 
              animate={{ width: `${((quizProgress.current + 1) / DEFAULT_QUIZ.length) * 100}%` }} 
              className="h-full bg-accent-gradient" 
             />
           </div>
           
           <h2 className="text-2xl font-display font-bold">{q.question}</h2>

           <div className="space-y-4">
             {q.options.map((opt, i) => (
               <motion.button
                key={i}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const isCorrect = i === q.correctAnswer;
                  setQuizProgress(prev => ({
                    ...prev,
                    score: isCorrect ? prev.score + 1 : prev.score,
                    current: prev.current + 1,
                    finished: prev.current + 1 === DEFAULT_QUIZ.length
                  }));
                }}
                className="w-full p-4 text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-brand-accent-start transition-all flex justify-between items-center group"
               >
                 <span className="font-medium">{opt}</span>
                 <ChevronRight size={18} className="text-gray-300 group-hover:text-brand-accent-start transition-colors" />
               </motion.button>
             ))}
           </div>
        </div>
      </div>
    );
  };

  const renderScanner = () => (
    <div className="min-h-screen bg-black relative flex flex-col items-center justify-center p-6 text-white">
      <button onClick={() => setScreen('home')} className="absolute top-12 left-6 p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
        <ArrowLeft size={24} />
      </button>
      
      <div className="w-full aspect-square max-w-sm border-2 border-white/50 border-dashed rounded-3xl relative overflow-hidden group">
         <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
         <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-brand-accent-start shadow-[0_0_15px_#FFC107] animate-[scan_2s_infinite]" />
         <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <Camera size={80} />
         </div>
         <label className="absolute inset-0 cursor-pointer flex flex-col items-center justify-center gap-2">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setLoading(true);
                  // Simulate solver
                  const reader = new FileReader();
                  reader.onload = async () => {
                    try {
                      const result = await solveHomework(reader.result as string, user?.class || '10');
                      const solverMsg: ChatMessage = {
                        id: 'scanner-' + Date.now(),
                        role: 'model',
                        text: `### Found Solution!\n\n${result}`,
                        timestamp: new Date()
                      };
                      setChatHistory(prev => [...prev, solverMsg]);
                      setScreen('chat');
                      speak("I've solved the problem for you. Let's go through it!");
                      
                      // Save history after scan
                      localStorage.setItem('globerx_history', JSON.stringify([...chatHistory, solverMsg]));
                    } catch (error) {
                      console.error("Scanner Error:", error);
                      // Fallback: stay on scanner but show error
                      alert("I couldn't read the image clearly. Please try again with a better photo.");
                    } finally {
                      setLoading(false);
                    }
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            <Plus className="group-hover:scale-125 transition-transform" size={40} />
            <span className="text-sm font-bold uppercase tracking-widest">Upload Photo</span>
         </label>
      </div>

      <div className="mt-12 text-center space-y-4">
         <h2 className="text-xl font-display font-bold">Homework Scanner</h2>
         <p className="text-sm text-gray-400 max-w-xs mx-auto">Click a clear photo of your question to get instant step-by-step solutions.</p>
         {loading && <Loader2 className="animate-spin mx-auto text-brand-accent-start" size={32} />}
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );

  const renderAnalytics = () => (
    <div className="p-6 pb-32 space-y-8">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => setScreen('home')} className="p-2 bg-white rounded-xl shadow-sm lg:hidden hover:bg-gray-50 transition-all border border-gray-100">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-display font-bold">Your Progress</h1>
        </div>
        <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100"><BarChart2 size={24} className="text-brand-accent-start" /></div>
      </header>

      <section className="grid grid-cols-2 gap-4">
         <Card className="bg-white p-6 space-y-2">
           <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Quizzes</span>
           <div className="flex items-baseline gap-1">
             <span className="text-3xl font-bold">12</span>
             <span className="text-green-500 text-xs font-bold">+2</span>
           </div>
         </Card>
         <Card className="bg-white p-6 space-y-2">
           <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Chat Hr</span>
           <div className="flex items-baseline gap-1">
             <span className="text-3xl font-bold">4.5</span>
             <span className="text-blue-500 text-xs font-bold">hrs</span>
           </div>
         </Card>
      </section>

      <section className="space-y-4">
        <h3 className="font-bold">Subject Mastery</h3>
        <div className="space-y-4">
           {SUBJECTS.map((sub, i) => (
             <div key={sub} className="space-y-2">
               <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-brand-text-muted">
                 <span>{sub}</span>
                 <span>{[80, 65, 90, 70, 75][i]}%</span>
               </div>
               <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                 <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: `${[80, 65, 90, 70, 75][i]}%` }}
                  className={cn(
                    "h-full",
                    [80, 65, 90, 70, 75][i] > 80 ? "bg-green-500" :
                    [80, 65, 90, 70, 75][i] > 60 ? "bg-brand-accent-start" : "bg-red-400"
                  )}
                 />
               </div>
             </div>
           ))}
        </div>
      </section>

      <Card className="bg-indigo-600 text-white border-none p-6 space-y-4 overflow-hidden relative">
         <div className="relative z-10 space-y-2">
           <h4 className="font-bold">Learning Tip</h4>
           <p className="text-sm text-indigo-100">You seem to struggle with Algebra. Try asking Rohan for some real-life Math examples!</p>
           <Button variant="primary" size="sm" className="bg-white/20 border-white/20 text-white" onClick={() => setScreen('chat')}>
             Ask Rohan
           </Button>
         </div>
         <HelpCircle className="absolute -bottom-6 -right-6 w-32 h-32 text-indigo-500/30" />
      </Card>
    </div>
  );

  const handleLogout = () => {
    setUser(null);
    setChatHistory([]);
    setThreads([]);
    setNotes([]);
    localStorage.removeItem('globerx_user');
    localStorage.removeItem('globerx_history');
    localStorage.removeItem('globerx_notes');
    localStorage.removeItem('globerx_teacher_id');
    setScreen('login');
  };

  const renderSidebar = () => (
    <nav className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-100 p-6 flex flex-col z-50">
      <div className="mb-10 px-2 flex items-center gap-3">
        <div className="w-10 h-10 bg-accent-gradient rounded-xl flex items-center justify-center shadow-lg transform rotate-6">
          <BookOpen className="text-brand-text" size={24} />
        </div>
        <h1 className="text-xl font-display font-extrabold tracking-tighter">GloberX AI</h1>
      </div>

      <div className="flex-1 space-y-2">
        {[
          { id: 'home', icon: HomeIcon, label: 'Dashboard' },
          { id: 'chat', icon: MessageCircle, label: 'AI Teacher' },
          { id: 'history', icon: History, label: 'Chat History' },
          { id: 'notes', icon: FileText, label: 'Study Notes' },
          { id: 'planner', icon: Layout, label: 'Study Planner' },
          { id: 'quiz', icon: BookOpen, label: 'Daily Quiz' },
          { id: 'analytics', icon: BarChart2, label: 'Analytics' },
          { id: 'scanner', icon: Camera, label: 'Homework Scanner' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setScreen(item.id as Screen)}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all",
              screen === item.id 
                ? "bg-accent-gradient text-brand-text shadow-md translate-x-1" 
                : "text-brand-text-muted hover:bg-gray-50"
            )}
          >
            <item.icon size={20} />
            {item.label}
          </button>
        ))}
      </div>

      <div className="pt-6 border-t border-gray-100 space-y-4">
        <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden">
                <Avatar teacherId={selectedTeacherId} size="sm" />
            </div>
            <div>
                <p className="text-xs font-bold">{user?.name}</p>
                <p className="text-[10px] text-brand-text-muted">Grade {user?.class}</p>
            </div>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-bold text-red-400 hover:bg-red-50 transition-all active:scale-95">
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </nav>
  );

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-brand-background relative">
        {renderAuthModal()}
        {/* GLOBAL LOADING OVERLAY */}
        <AnimatePresence>
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-white/60 backdrop-blur-md z-[100] flex flex-col items-center justify-center gap-4"
            >
              <div className="relative">
                 <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 border-4 border-gray-100 border-t-brand-accent-start rounded-full"
                 />
                 <BookOpen className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-accent-start" size={24} />
              </div>
              <p className="text-sm font-bold text-brand-text/60 animate-pulse uppercase tracking-[0.2em]">Thinking...</p>
            </motion.div>
          )}
        </AnimatePresence>

      {/* DESKTOP SIDEBAR */}
      <div className="hidden lg:block">
        {['home', 'planner', 'quiz', 'scanner', 'analytics', 'chat', 'history', 'notes'].includes(screen) && renderSidebar()}
      </div>

      {/* MAIN CONTENT AREA */}
      <main className={cn(
        "transition-all duration-300 min-h-screen flex flex-col",
        ['home', 'planner', 'quiz', 'scanner', 'analytics', 'chat', 'history', 'notes'].includes(screen) && "lg:pl-64"
      )}>
        <div className={cn(
          "flex-1 flex flex-col mx-auto w-full",
          ['test', 'onboarding', 'login'].includes(screen) ? "max-w-2xl" : "max-w-6xl"
        )}>
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex-1"
            >
              {screen === 'login' && renderLogin()}
              {screen === 'onboarding' && renderOnboarding()}
              {screen === 'test' && renderTest()}
              {screen === 'home' && renderHome()}
              {screen === 'chat' && renderChat()}
              {screen === 'planner' && renderPlanner()}
              {screen === 'history' && renderHistory()}
              {screen === 'notes' && renderNotes()}
              {screen === 'quiz' && renderQuiz()}
              {screen === 'scanner' && renderScanner()}
              {screen === 'analytics' && renderAnalytics()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="lg:hidden">
        {['home', 'planner', 'quiz', 'scanner', 'analytics', 'history', 'notes'].includes(screen) && (
          <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-gray-100 flex justify-around items-center px-4 pb-4 z-50">
            {[
              { id: 'home', icon: HomeIcon, label: 'Home' },
              { id: 'history', icon: History, label: 'History' },
              { id: 'chat', icon: MessageCircle, label: 'AI Teacher', center: true },
              { id: 'notes', icon: FileText, label: 'Notes' },
              { id: 'analytics', icon: BarChart2, label: 'Stats' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setScreen(item.id as Screen)}
                className={cn(
                  "flex flex-col items-center gap-1 transition-all",
                  item.center ? "-mt-8" : "",
                  screen === item.id ? "opacity-100" : "opacity-40"
                )}
              >
                {item.center ? (
                  <div className="w-14 h-14 bg-accent-gradient rounded-full flex items-center justify-center shadow-[0_4px_15px_rgba(255,193,7,0.4)] border-4 border-white">
                    <MessageCircle size={28} className="text-white fill-white" />
                  </div>
                ) : (
                  <>
                    <item.icon size={22} className="text-brand-text" />
                    <span className="text-[10px] font-bold">{item.label}</span>
                  </>
                )}
              </button>
            ))}
          </nav>
        )}
      </div>
      </div>
    </ErrorBoundary>
  );
}
