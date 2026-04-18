import { TeacherId, Subject, Language } from './types.ts';

export const TEACHERS = [
  {
    id: 'rohan' as TeacherId,
    name: 'Rohan',
    gender: 'male',
    description: 'Lead STEM Educator. Specialized in conceptual clarity.',
    personality: 'Logical, analytical, yet extremely encouraging. He breaks complex problems into bite-sized steps.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rohan&hair=short&glasses=wayfarers&facialHair=short&facialHairColor=2c2c2c&backgroundColor=F4F4F5',
  },
  {
    id: 'priya' as TeacherId,
    name: 'Priya',
    gender: 'female',
    description: 'Humanities & Languages Expert. Focuses on storytelling.',
    personality: 'Empathetic, articulate, and deeply patient. She uses real-world context and narratives to teach.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya&mouth=smile&hair=long&glasses=pink&backgroundColor=F4F4F5',
  }
];

export const SUBJECTS: Subject[] = ['Maths', 'Science', 'English', 'Hindi', 'Social Science'];

export const LANGUAGES: Language[] = ['English', 'Hindi', 'Hinglish', 'Urdu', 'Marathi'];

export const CLASS_SYLLABUS_EXAMPLES: Record<string, string[]> = {
  '8': ['Fractions', 'Basic Science', 'Hindi Grammar', 'Force & Pressure', 'Microorganisms'],
  '9': ['Algebra', 'Physics Basics', 'Sentence Structure', 'Motion', 'Tissues'],
  '10': ['Trigonometry', 'Chemical Reactions', 'Life Processes', 'Metals & Non-metals', 'Quadratic Equations'],
};

export const DEFAULT_QUIZ = [
  {
    id: '1',
    question: 'What is 5 x 6?',
    options: ['25', '30', '35', '40'],
    correctAnswer: 1
  },
  {
    id: '2',
    question: 'Water boils at how many degrees Celsius?',
    options: ['80', '90', '100', '110'],
    correctAnswer: 2
  }
];
