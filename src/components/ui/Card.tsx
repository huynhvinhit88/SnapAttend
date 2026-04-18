import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card = ({ children, className, onClick }: CardProps) => {
  return (
    <div 
      onClick={onClick}
      className={cn(
        'glass-card p-6 transition-all ring-primary/0',
        onClick && 'cursor-pointer hover:bg-white/10 active:scale-[0.98] hover:ring-2 hover:ring-primary/20',
        className
      )}
    >
      {children}
    </div>
  );
};
