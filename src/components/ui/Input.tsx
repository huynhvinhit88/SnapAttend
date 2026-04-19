import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> {
  label?: string;
  error?: string;
  type?: string;
  icon?: React.ReactNode;
  options?: { value: string | number; label: string }[]; // Cho trường hợp là Select
}

export const Input = React.forwardRef<HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement, InputProps>(
  ({ className, label, error, type = 'text', icon, options, ...props }, ref) => {
    const isSelect = type === 'select';
    const isTextarea = type === 'textarea';

    const inputClasses = cn(
      'input-field placeholder:text-foreground/30',
      icon && 'pl-12', // Thêm padding trái nếu có icon
      error && 'border-red-500 focus:ring-red-500/50 focus:border-red-500',
      className
    );

    return (
      <div className="w-full">
        {label && <label className="label-text">{label}</label>}
        
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none transition-colors group-focus-within:text-primary">
              {icon}
            </div>
          )}

          {isSelect ? (
            <select 
              ref={ref as any} 
              className={inputClasses} 
              {...(props as any)}
            >
              {options?.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-background-light text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          ) : isTextarea ? (
            <textarea 
              ref={ref as any} 
              className={cn(inputClasses, 'min-h-[100px] resize-none')} 
              {...(props as any)} 
            />
          ) : (
            <input 
              ref={ref as any} 
              type={type} 
              className={inputClasses} 
              {...(props as any)} 
            />
          )}
        </div>

        {error && (
          <div className="mt-1.5">
            <p className="text-xs text-red-500 font-medium">{error}</p>
          </div>
        )}
      </div>
    );
  }
);
