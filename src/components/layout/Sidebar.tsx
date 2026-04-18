  Users, BookOpen, Calendar, BarChart3, 
  Settings, Database, GraduationCap, School,
  Layers, Lock
} from 'lucide-react';
import { clsx } from 'clsx';

const menuItems = [
  { id: 'classes', label: 'Quản lý Lớp', icon: School },
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
}

export const Sidebar = ({ activeId, onNavigate, onLock }: SidebarProps) => {
  return (
    <div className="w-64 h-full bg-background-light/30 backdrop-blur-xl border-r border-white/10 flex flex-col p-4">
      <div className="flex items-center gap-3 px-4 py-8">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
          <Calendar className="text-white w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">SnapAttend</h1>
      </div>

      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium',
              activeId === item.id 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'text-white/50 hover:bg-white/5 hover:text-white'
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 space-y-4">
        <button
          onClick={onLock}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all font-bold text-sm"
        >
          <Lock className="w-4 h-4" />
          Khóa ứng dụng
        </button>
        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
          <p className="text-xs text-white/40 text-center uppercase tracking-widest font-bold">
            v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
};
