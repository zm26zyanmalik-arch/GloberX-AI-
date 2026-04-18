import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

import { TEACHERS } from '../constants.ts';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Button({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  loading = false,
  children,
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent',
  size?: 'sm' | 'md' | 'lg',
  loading?: boolean
}) {
  const base = "font-bold rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 tracking-tight";
  const variants = {
    primary: "bg-white text-brand-text shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-transparent",
    secondary: "bg-gray-100 text-brand-text",
    ghost: "bg-transparent text-brand-text-muted hover:bg-gray-100",
    accent: "bg-accent-gradient text-brand-text shadow-[0_4px_10px_rgba(255,193,7,0.3)] hover:brightness-105"
  };
  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3.5 text-sm",
    lg: "px-8 py-4.5 text-base"
  };

  return (
    <button 
      className={cn(base, variants[variant], sizes[size], className)} 
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" size={18} />}
      {children}
    </button>
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("premium-card p-5", className)} {...props} />;
}

export function Avatar({ 
  teacherId, 
  isTalking, 
  className, 
  size = 'md'
}: { 
  teacherId: 'rohan' | 'priya', 
  isTalking?: boolean, 
  className?: string, 
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}) {
  const [errorCount, setErrorCount] = useState(0);
  const [hasFailed, setHasFailed] = useState(false);
  const teacher = TEACHERS.find(t => t.id === teacherId);
  const isRohan = teacherId === 'rohan';
  
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
    full: 'w-full aspect-square'
  };

  const getAvatarUrl = (count: number) => {
    if (!teacher) return '';
    if (count === 0) return teacher.avatar;
    // Fallback to stylized avatars if primary image fails
    const seed = isRohan ? 'rohan' : 'priya';
    return isRohan 
      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&hair=short&glasses=wayfarers&facialHair=short&facialHairColor=2c2c2c&backgroundColor=FFF9E6`
      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&mouth=smile&hair=long&glasses=pink&backgroundColor=FFF9E6`;
  };

  const handleError = () => {
    if (errorCount < 1) {
      setTimeout(() => setErrorCount(prev => prev + 1), 1000);
    } else {
      setHasFailed(true);
    }
  };

  return (
    <div className={cn(
      "relative rounded-full border-4 border-white shadow-xl overflow-hidden shrink-0 flex items-center justify-center transition-all duration-500",
      isTalking && "ring-8 ring-brand-accent-start/20 scale-105",
      sizeClasses[size], 
      className
    )}>
      <AnimatePresence>
        {isTalking && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.2 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
            className="absolute inset-0 bg-brand-accent-start/20 z-0"
          />
        )}
      </AnimatePresence>

      {!hasFailed ? (
        <img 
          key={`${teacherId}-${errorCount}`}
          src={getAvatarUrl(errorCount)} 
          alt={teacherId}
          className="w-full h-full object-cover relative z-10"
          referrerPolicy="no-referrer"
          onError={handleError}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-brand-text-muted bg-gray-50 h-full w-full relative z-10 uppercase font-bold text-xs tracking-tighter">
          <span>{isRohan ? 'Rohan' : 'Priya'}</span>
        </div>
      )}
    </div>
  );
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("GloberX Global Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6 bg-brand-secondary">
          <div className="w-24 h-24 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center shadow-lg">
            <AlertCircle size={48} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-display font-extrabold tracking-tight">Oops! Something went wrong</h1>
            <p className="text-brand-text-muted max-w-xs">We've encountered a glitch. Don't worry, your data is safe.</p>
          </div>
          <Button 
            variant="accent" 
            className="w-full max-w-sm py-4" 
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={20} /> Restart GloberX
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
