import React from 'react';
import { motion } from 'framer-motion';

import type { LucideIcon } from 'lucide-react';

export interface StatItem {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  breadcrumbs?: { label: string; active?: boolean }[];
  stats?: StatItem[];
}

export const PageHeader = ({ title, description, icon, children, breadcrumbs, stats }: PageHeaderProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mb-8 p-6 md:p-8 bg-background-light/30 backdrop-blur-3xl border border-foreground/5 rounded-[2.5rem] shadow-xl shadow-foreground/5 overflow-hidden group"
    >
      {/* Decorative accent gradient */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-accent/50 to-primary/50 opacity-50" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="flex items-start gap-5">
          {icon && (
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
              {icon}
            </div>
          )}
          <div className="space-y-1">
            {breadcrumbs && (
              <div className="flex items-center gap-2 mb-2">
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={idx}>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${crumb.active ? 'text-primary' : 'text-foreground/30'}`}>
                      {crumb.label}
                    </span>
                    {idx < breadcrumbs.length - 1 && <span className="text-foreground/10 text-[10px]">/</span>}
                  </React.Fragment>
                ))}
              </div>
            )}
            <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight leading-none">
              {title}
            </h1>
            {description && (
              <p className="text-foreground/50 font-medium text-sm md:text-base max-w-2xl">
                {description}
              </p>
            )}

            {stats && stats.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 pt-4 border-t border-foreground/5">
                {stats.map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${stat.color ? stat.color.replace('text', 'bg') : 'bg-primary/50'}`} />
                      <Icon className={`w-3.5 h-3.5 ${stat.color || 'text-foreground/40'}`} />
                      <span className="text-sm font-black text-foreground truncate max-w-[200px]">
                        {stat.value}
                      </span>
                      <span className="text-[10px] text-foreground/30 font-black uppercase tracking-widest">
                        {stat.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        {children && (
          <div className="flex items-center gap-3">
            {children}
          </div>
        )}
      </div>

      {/* Subtle decorative background element */}
      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-500" />
    </motion.div>
  );
};
