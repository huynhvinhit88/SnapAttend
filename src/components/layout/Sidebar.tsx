import { 
  Users, BookOpen, Calendar, BarChart3, 
  Settings, Database, GraduationCap, School,
  Layers, Lock, X, Sun, Moon
} from 'lucide-react';
import { clsx } from 'clsx';
import { useTheme } from '../../context/ThemeContext';

const menuItems = [
  { id: 'classes', label: 'Lớp', icon: School },
  { id: 'students', label: 'Học sinh', icon: Users },
  { id: 'teachers', label: 'Giáo viên', icon: GraduationCap },
  { id: 'subjects', label: 'Môn học', icon: BookOpen },
  { id: 'sections', label: 'Lớp học phần', icon: Layers },
  { id: 'sessions', label: 'Ca học', icon: Calendar },
  { id: 'reports', label: 'Báo cáo', icon: BarChart3 },
  { id: 'data', label: 'Dữ liệu', icon: Database },
  { id: 'settings', label: 'Cài đặt', icon: Settings },
];

interface SidebarProps {
  activeId: string;
  onNavigate: (id: string) => void;
  onLock: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ activeId, onNavigate, onLock, isOpen, onClose }: SidebarProps) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* Backdrop (Lớp phủ mờ) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={clsx(
        "fixed inset-y-0 left-0 w-72 h-full bg-background-light/25 backdrop-blur-3xl border-r border-foreground/5 flex flex-col p-4 z-[60] transition-transform duration-300 lg:static lg:translate-x-0 lg:w-64",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between px-4 py-8">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="SnapAttend Logo" 
              className="w-10 h-10 object-contain rounded-2xl shadow-xl shadow-primary/20" 
            />
            <h1 className="text-xl font-black text-foreground tracking-tighter">SnapAttend</h1>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-2 text-foreground/50 hover:text-foreground"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold',
              activeId === item.id 
                ? 'bg-primary text-white shadow-xl shadow-primary/30' 
                : 'text-foreground/50 hover:bg-foreground/5 hover:text-foreground'
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          <button
            onClick={toggleTheme}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-foreground/5 text-foreground hover:bg-foreground/10 transition-all font-bold text-sm border border-foreground/10"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            {theme === 'light' ? 'Tối' : 'Sáng'}
          </button>
          <button
            onClick={onLock}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all font-bold text-sm"
          >
            <Lock className="w-4 h-4" />
            Khóa
          </button>
        </div>
        <div className="p-4 bg-foreground/5 rounded-2xl border border-foreground/10">
          <p className="text-xs text-foreground/40 text-center uppercase tracking-widest font-bold">
            v1.0.0
          </p>
        </div>
      </div>
    </div>
    </>
  );
};
