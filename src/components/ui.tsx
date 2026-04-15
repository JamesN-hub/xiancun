import React from 'react';
import { cn } from '../lib/utils';

export const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md',
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}) => {
  const variants = {
    primary: 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-sm',
    secondary: 'bg-slate-100 text-slate-900 border-slate-200 hover:bg-slate-200',
    danger: 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 border-transparent',
    outline: 'border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg font-bold'
  };
  return (
    <button 
      className={cn(
        'hand-button inline-flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none font-hand',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('hand-card overflow-hidden', className)}>
    {children}
  </div>
);

export const Input = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => (
  <div className="space-y-1.5">
    {label && <label className="text-sm font-bold text-slate-700 ml-1 font-hand">{label}</label>}
    <input 
      className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 focus:border-emerald-500 focus:ring-0 outline-none transition-all font-hand"
      style={{ borderRadius: '8px 16px 8px 16px/16px 8px 16px 8px' }}
      {...props}
    />
  </div>
);
