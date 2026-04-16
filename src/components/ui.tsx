import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

export const ConfirmModal = ({ 
  isOpen, 
  title, 
  description, 
  onConfirm, 
  onCancel, 
  confirmText = "確認", 
  cancelText = "取消",
  confirmVariant = "primary"
}: { 
  isOpen: boolean; 
  title: string; 
  description: string; 
  onConfirm: () => void; 
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20, x: '-50%', left: '50%', top: '50%', translateY: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: 0, x: '-50%', left: '50%', top: '50%', translateY: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: 20, x: '-50%', left: '50%', top: '50%', translateY: '-50%' }}
            className="fixed z-50 w-full max-w-sm px-6"
          >
            <Card className="bg-white p-6 space-y-6 shadow-2xl border-2 border-slate-200">
              <div className="space-y-2 text-center">
                <h3 className="text-2xl font-bold text-slate-900 font-hand">{title}</h3>
                <p className="text-slate-500 font-hand leading-relaxed">{description}</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={onCancel} variant="secondary" className="flex-1 py-3">
                  {cancelText}
                </Button>
                <Button onClick={onConfirm} variant={confirmVariant} className="flex-1 py-3">
                  {confirmText}
                </Button>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
