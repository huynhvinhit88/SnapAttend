import { X } from 'lucide-react';
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
  onClear?: () => void;
  options?: { value: string | number; label: string }[]; // Cho trường hợp là Select
}

export const Input = React.forwardRef<HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement, InputProps>(
  ({ className, label, error, type = 'text', icon, onClear, options, ...props }, ref) => {
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
        
        <div className="relative group">
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
            <div className="relative">
              <input 
                ref={ref as any} 
                type={type} 
                className={cn(inputClasses, onClear && props.value && 'pr-10')} 
                {...(props as any)} 
              />
              {onClear && props.value && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClear();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-foreground/10 hover:bg-foreground/20 text-foreground/40 hover:text-foreground transition-all z-10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
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
