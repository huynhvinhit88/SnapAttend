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
  options?: { value: string | number; label: string }[]; // Cho trường hợp là Select
}

export const Input = React.forwardRef<HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement, InputProps>(
  ({ className, label, error, type = 'text', options, ...props }, ref) => {
    const isSelect = type === 'select';
    const isTextarea = type === 'textarea';

    const inputClasses = cn(
      'input-field',
      error && 'border-red-500 focus:ring-red-500/50 focus:border-red-500',
      className
    );

    return (
      <div className="w-full">
        {label && <label className="label-text">{label}</label>}
        
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

        <div className="min-h-[20px] mt-1.5">
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </div>
      </div>
    );
  }
);
