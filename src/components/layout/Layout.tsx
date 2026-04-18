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
    <div className="flex flex-col lg:flex-row h-screen bg-background overflow-hidden">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-background-light/30 backdrop-blur-xl border-b border-white/10 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/30">
            <Calendar className="text-white w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight">SnapAttend</h1>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-white/70 hover:text-white"
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
