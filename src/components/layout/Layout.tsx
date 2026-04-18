import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Menu, Calendar } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeId: string;
  onNavigate: (id: string) => void;
  onLock: () => void;
}

export const Layout = ({ children, activeId, onNavigate, onLock }: LayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Đóng sidebar khi chuyển trang trên di động
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [activeId]);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background relative overflow-hidden">
      {/* Ambient Background Orbs (Lively Accents) */}
      <div className="bg-orb w-[500px] h-[500px] -top-24 -left-24 bg-orb-1/10" />
      <div className="bg-orb w-[400px] h-[400px] -bottom-24 -right-24 bg-orb-2/10" />
      <div className="bg-orb w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary/5" />

      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-background-light/30 backdrop-blur-xl border-b border-foreground/10 z-40">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="SnapAttend Logo" 
            className="w-8 h-8 object-contain rounded-lg shadow-lg shadow-primary/20" 
          />
          <h1 className="text-lg font-bold text-foreground tracking-tight">SnapAttend</h1>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-foreground/70 hover:text-foreground"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        activeId={activeId} 
        onNavigate={onNavigate} 
        onLock={onLock} 
      />
      
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
