import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useFilter } from '../../context/FilterContext';
import { format } from 'date-fns';
import { clsx } from 'clsx';

interface QuickAttendanceFABProps {
  onNavigate: (id: string) => void;
  activeId: string;
}

export const QuickAttendanceFAB = ({ onNavigate, activeId }: QuickAttendanceFABProps) => {
  const { updateFilter } = useFilter();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Hiệu ứng ẩn/hiện khi cuộn trang
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleQuickAccess = () => {
    // 1. Cập nhật filter về ngày hôm nay
    updateFilter('sessions', { 
      filterDate: format(new Date(), 'yyyy-MM-dd'),
      searchTerm: '' 
    });
    
    // 2. Chuyển hướng sang trang ca học
    onNavigate('sessions');
  };

  // Không hiển thị nếu đang ở trang điểm danh hoặc chính trang ca học (tùy chọn)
  // Nhưng ở đây ta cứ cho hiển thị để chuyển nhanh bất cứ lúc nào
  if (activeId === 'attendance') return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 100 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 100 }}
          className="fixed bottom-4 right-4 z-50 md:bottom-8 md:right-8"
        >
          <button
            onClick={handleQuickAccess}
            className={clsx(
              "group relative flex items-center gap-2 p-2 md:p-2.5 rounded-2xl transition-all active:scale-95 shadow-2xl overflow-hidden",
              "bg-primary/20 backdrop-blur-xl border border-primary/30",
              "hover:bg-primary/30 hover:shadow-primary/40"
            )}
          >
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative z-10 w-10 h-10 flex items-center justify-center bg-primary rounded-xl shadow-lg group-hover:rotate-12 transition-transform">
              <Zap className="w-5 h-5 text-white fill-current" />
            </div>

            <div className="relative z-10 pr-3">
              <p className="hidden md:block text-[9px] text-primary font-black uppercase tracking-widest leading-none mb-1 opacity-70">Truy cập nhanh</p>
              <p className="text-xs md:text-sm font-black text-foreground leading-none">Điểm danh Hôm nay</p>
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
