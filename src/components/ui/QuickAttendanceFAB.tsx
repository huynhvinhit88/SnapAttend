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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Phát hiện Modal mở để ẩn FAB
  useEffect(() => {
    const checkModal = () => {
      setIsModalOpen(document.body.hasAttribute('data-modal-open'));
    };

    // Kiểm tra lần đầu
    checkModal();

    const observer = new MutationObserver(checkModal);
    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['data-modal-open'] 
    });

    return () => observer.disconnect();
  }, []);

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
    // 1. Cập nhật filter về ngày hôm nay và trạng thái chưa điểm danh
    updateFilter('sessions', { 
      filterDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'pending',
      sectionId: 'all',
      subjectId: 'all'
    });
    
    // 2. Chuyển hướng sang trang ca học
    onNavigate('sessions');
  };

  // Không hiển thị nếu đang ở trang điểm danh
  if (activeId === 'attendance') return null;

  return (
    <AnimatePresence>
      {(isVisible && !isModalOpen) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 100 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 100 }}
          className="fixed bottom-6 right-6 z-50 md:bottom-8 md:right-8"
        >
          <button
            onClick={handleQuickAccess}
            className={clsx(
              "group relative flex items-center gap-2 p-2 md:p-2.5 rounded-[1.5rem] transition-all active:scale-95 shadow-2xl overflow-hidden",
              "bg-primary/95 backdrop-blur-xl border border-white/10 shadow-primary/40",
              "hover:bg-primary hover:shadow-primary/60"
            )}
          >
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
            
            <div className="relative z-10 w-10 h-10 flex items-center justify-center bg-white/10 rounded-2xl shadow-inner group-hover:rotate-12 transition-transform">
              <Zap className="w-5 h-5 text-white fill-current" />
            </div>

            <div className="relative z-10 pr-3 text-left">
              <p className="text-[8px] text-white/50 font-black uppercase tracking-widest leading-none mb-1">Truy cập nhanh</p>
              <p className="text-xs md:text-sm font-black text-white leading-none">Điểm danh Hôm nay</p>
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
