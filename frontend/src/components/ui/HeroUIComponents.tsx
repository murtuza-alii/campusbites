import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/* 1. Accessible HeroUI Status Chip */
export type ChipVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'amber';

interface HeroChipProps {
  children: React.ReactNode;
  variant?: ChipVariant;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  className?: string;
}

export function HeroChip({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  className = '',
}: HeroChipProps) {
  const variantStyles: Record<ChipVariant, { bg: string; text: string; border: string; dotColor: string }> = {
    default: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
      dotColor: 'bg-slate-500',
    },
    primary: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200/80',
      dotColor: 'bg-indigo-600',
    },
    success: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200/80',
      dotColor: 'bg-emerald-500',
    },
    warning: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200/80',
      dotColor: 'bg-amber-500',
    },
    danger: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200/80',
      dotColor: 'bg-rose-500',
    },
    amber: {
      bg: 'bg-orange-50',
      text: 'text-orange-800',
      border: 'border-orange-200/80',
      dotColor: 'bg-orange-600',
    },
  };

  const sizeStyles = {
    sm: 'px-2.5 py-0.5 text-[10.5px]',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm',
  };

  const style = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-full border ${style.bg} ${style.text} ${style.border} ${sizeStyles[size]} ${className}`}
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.dotColor}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${style.dotColor}`} />
        </span>
      )}
      {children}
    </span>
  );
}

/* 2. Tactile HeroButton with Spring Feedback */
interface HeroButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export function HeroButton({
  children,
  variant = 'primary',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}: HeroButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-bold rounded-2xl transition-all duration-200 select-none active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 focus:ring-indigo-500 border border-indigo-500/30',
    secondary: 'bg-slate-900 text-white shadow-md hover:bg-black focus:ring-slate-900',
    outline: 'bg-white text-slate-800 border border-slate-300 shadow-sm hover:bg-slate-50 hover:border-slate-400 focus:ring-slate-400',
    danger: 'bg-rose-600 text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 focus:ring-rose-500',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variants[variant]} ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

/* 3. HeroUI Smooth Modal Container */
interface HeroModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
}

export function HeroModal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: HeroModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`relative w-full ${maxWidth} bg-white rounded-[2rem] border border-slate-200/90 shadow-2xl overflow-hidden z-10`}
          >
            {title && (
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div className="text-lg font-black text-slate-900">{title}</div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            )}
            <div className="p-6 sm:p-8">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
