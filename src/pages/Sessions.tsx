import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Plus, Calendar, Clock, Trash2, Search, 
  Play, Repeat, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { db } from '../db/db';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { motion } from 'framer-motion';
import { useFilter } from '../context/FilterContext';
import { PageHeader } from '../components/ui/PageHeader';
import { addWeeks, format } from 'date-fns';
import { clsx } from 'clsx';

interface SessionsProps {
  onStartAttendance?: (sessionId: number) => void;
}

export const Sessions = ({ onStartAttendance }: SessionsProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const { filters, updateFilter } = useFilter();
  const { searchTerm, filterDate } = filters.sessions;

  const [formData, setFormData] = useState({
    sectionId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '07:00',
    endTime: '09:00'
  });

  const [recurringData, setRecurringData] = useState({
    sectionId: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    startTime: '07:00',
    endTime: '09:00',
    weeks: 10
  });

  const sessions = useLiveQuery(() => db.sessions.toArray());
  const sections = useLiveQuery(() => db.sections.toArray());
  const academicYears = useLiveQuery(() => db.academicYears.toArray());

  const [sessionYearFilter, setSessionYearFilter] = useState('');
  const [recurringYearFilter, setRecurringYearFilter] = useState('');

  const defaultYear = useMemo(() => 
    academicYears?.find(y => y.isDefault)?.name || '', 
    [academicYears]
  );

  // Tự động chọn năm mặc định khi mở modal hoặc khi dữ liệu năm học tải xong
  useEffect(() => {
    if (defaultYear) {
      setSessionYearFilter(defaultYear);
      setRecurringYearFilter(defaultYear);
    }
  }, [defaultYear]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sectionId) return alert('Vui lòng chọn lớp học phần');

    try {
      await db.sessions.add({
        sectionId: parseInt(formData.sectionId),
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        status: 'pending',
        createdAt: Date.now()
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Lỗi tạo ca học:', error);
    }
  };

  const handleCreateRecurringSessions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recurringData.sectionId) return alert('Vui lòng chọn lớp học phần');

    try {
      const start = new Date(recurringData.startDate);
      const newSessions: any[] = [];

      for (let i = 0; i < recurringData.weeks; i++) {
        const currentDate = addWeeks(start, i);
        newSessions.push({
          sectionId: parseInt(recurringData.sectionId),
          date: format(currentDate, 'yyyy-MM-dd'),
          startTime: recurringData.startTime,
          endTime: recurringData.endTime,
          status: 'pending' as const,
          createdAt: Date.now()
        });
      }

      await db.sessions.bulkAdd(newSessions);
      setIsRecurringModalOpen(false);
      alert(`Đã tạo thành công ${recurringData.weeks} ca học cho môn này!`);
    } catch (error) {
      console.error('Lỗi tạo lịch định kỳ:', error);
    }
  };

  const handleDeleteSession = async (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa ca học này?')) {
      await db.sessions.delete(id);
      await db.attendance.where('sessionId').equals(id).delete();
    }
  };

  const filteredSessions = sessions?.filter(s => {
    const section = sections?.find(sec => sec.id === s.sectionId);
    const sName = section?.name?.toLowerCase() || '';
    const sTerm = searchTerm?.toLowerCase() || '';
    
    const matchesName = sName.includes(sTerm);
    const matchesDate = !filterDate || s.date === filterDate;
    
    return matchesName && matchesDate;
  }).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title="Ca học"
        description="Lập kế hoạch giảng dạy, tạo lịch học định kỳ và theo dõi tiến độ điểm danh."
        icon={<Calendar className="w-8 h-8" />}
        breadcrumbs={[
          { label: 'Trang chủ' },
          { label: 'Đào tạo', active: true }
        ]}
        stats={[
          { label: 'Tổng số ca', value: sessions?.length || 0, icon: Calendar },
          { label: 'Hoàn thành', value: sessions?.filter(s => s.status === 'completed').length || 0, icon: CheckCircle2, color: 'text-green-500' },
          { label: 'Đang chờ', value: sessions?.filter(s => s.status === 'pending').length || 0, icon: AlertCircle, color: 'text-yellow-500' },
        ]}
      >
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setIsRecurringModalOpen(true)}>
            <Repeat className="w-5 h-5" />
            Tạo Lịch Định Kỳ
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-5 h-5" />
            Thêm Ca Lẻ
          </Button>
        </div>
      </PageHeader>

      {/* Search & Filter Card - Styled like Reports */}
      <Card className="flex flex-col md:flex-row items-end gap-6 relative overflow-hidden p-6 border-none shadow-none">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
        
        <div className="flex-1 w-full relative z-10">
          <Input 
            label="Tìm kiếm ca học"
            icon={<Search className="w-4 h-4" />}
            className="h-12" 
            placeholder="Tìm theo tên lớp..." 
            value={searchTerm}
            onChange={(e) => updateFilter('sessions', { searchTerm: e.target.value })}
          />
        </div>
        
        <div className="flex items-end gap-2 w-full md:w-auto relative z-10">
          <div className="w-full md:w-60">
            <Input 
              label="Ngày diễn ra ca học" 
              type="date"
              icon={<Calendar className="w-4 h-4" />}
              className="h-12"
              value={filterDate} 
              onChange={e => updateFilter('sessions', { filterDate: e.target.value })}
            />
          </div>
          <Button 
            variant="secondary" 
            onClick={() => updateFilter('sessions', { filterDate: '' })}
            disabled={!filterDate}
            className="w-11 h-11 p-0 flex-shrink-0 mb-[26px] rounded-xl"
            title="Xóa ngày"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSessions?.map((item, index) => {
          const section = sections?.find(s => s.id === item.sectionId);
          const isFinished = item.status === 'completed';

          return (
            <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <Card className="relative group overflow-hidden border-foreground/5 hover:border-primary/30 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className={clsx(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110",
                    isFinished ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary"
                  )}>
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="flex gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity z-10">
                    <Button variant="ghost" className="p-2 w-9 h-9 rounded-xl text-red-500 hover:bg-red-500/10" title="Xóa" onClick={() => handleDeleteSession(item.id!)}>
                      <Trash2 className="w-4.5 h-4.5" />
                    </Button>
                  </div>
                </div>

                <h3 className="text-xl font-black text-foreground truncate mb-1">{section?.name || 'Không xác định'}</h3>
                
                <div className="flex items-center gap-4 mt-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-foreground/30 uppercase font-black tracking-widest leading-none">Ngày dạy</p>
                    <p className="text-sm font-bold text-foreground/80">{item.date}</p>
                  </div>
                  <div className="w-px h-8 bg-foreground/5" />
                  <div className="space-y-1">
                    <p className="text-[10px] text-foreground/30 uppercase font-black tracking-widest leading-none">Thời gian</p>
                    <p className="text-sm font-bold text-foreground/80">{item.startTime} - {item.endTime}</p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-foreground/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isFinished ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Đã xong</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 rounded-full">
                        <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
                        <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest">Chờ dạy</span>
                      </div>
                    )}
                  </div>
                  
                  {!isFinished && (
                    <Button 
                      onClick={() => onStartAttendance?.(item.id!)}
                      className="h-10 px-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                    >
                      <Play className="w-3.5 h-3.5 mr-2 fill-current" /> Điểm danh
                    </Button>
                  )}
                </div>
                
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              </Card>
            </motion.div>
          );
        })}
      </div>

      {filteredSessions?.length === 0 && (
        <div className="text-center py-24 px-4 bg-background-light/30 backdrop-blur-3xl rounded-[3rem] border border-dashed border-foreground/10">
          <Calendar className="w-20 h-20 text-foreground/5 mx-auto mb-6" />
          <p className="text-foreground/40 font-bold text-lg">Hệ thống chưa ghi nhận ca dạy học nào.</p>
          <p className="text-foreground/20 text-sm mt-2">Hãy nhấn 'Tạo Lịch Định Kỳ' để thiết lập ca học cho cả kỳ!</p>
        </div>
      )}

      {/* Modal Thêm Ca Lẻ */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Thêm Ca Học Lẻ">
        <form noValidate onSubmit={handleCreateSession} className="space-y-6 pt-4">
          <Input 
            label="Lọc theo năm học" type="select"
            options={[{ value: '', label: 'Tất cả năm học' }, ...(academicYears?.map(y => ({ value: y.name, label: y.name })) || [])]}
            value={sessionYearFilter}
            onChange={e => setSessionYearFilter(e.target.value)}
          />
          <Input 
            label="Lớp học phần" type="select"
            options={[
              { value: '', label: 'Chọn lớp HP...' }, 
              ...(sections?.filter(s => !sessionYearFilter || s.schoolYear === sessionYearFilter).map(s => ({ value: s.id!.toString(), label: s.name })) || [])
            ]}
            value={formData.sectionId}
            onChange={e => setFormData({...formData, sectionId: e.target.value})}
          />
          <Input label="Ngày học" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Giờ vào" type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
            <Input label="Giờ ra" type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
          </div>
          <div className="flex gap-4 pt-6">
            <Button type="button" variant="secondary" className="flex-1 h-12 rounded-2xl" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" className="flex-1 h-12 rounded-2xl shadow-lg shadow-primary/20">Lưu Ca Học</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Tạo Lịch Định Kỳ */}
      <Modal isOpen={isRecurringModalOpen} onClose={() => setIsRecurringModalOpen(false)} title="Thiết lập Lịch Học Định Kỳ">
        <form noValidate onSubmit={handleCreateRecurringSessions} className="space-y-6 pt-4">
          <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 mb-6">
            <p className="text-xs text-foreground/50 leading-relaxed font-medium">
              Hệ thống sẽ tự động tạo chuỗi các ca học lặp lại theo tuần cho lớp HP đã chọn. Giúp bạn tiết kiệm thời gian thiết lập thủ công.
            </p>
          </div>
          <Input 
            label="Lọc theo năm học" type="select"
            options={[{ value: '', label: 'Tất cả năm học' }, ...(academicYears?.map(y => ({ value: y.name, label: y.name })) || [])]}
            value={recurringYearFilter}
            onChange={e => setRecurringYearFilter(e.target.value)}
          />
          <Input 
            label="Lớp học phần" type="select"
            options={[
              { value: '', label: 'Chọn lớp HP...' }, 
              ...(sections?.filter(s => !recurringYearFilter || s.schoolYear === recurringYearFilter).map(s => ({ value: s.id!.toString(), label: s.name })) || [])
            ]}
            value={recurringData.sectionId}
            onChange={e => setRecurringData({...recurringData, sectionId: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Ngày bắt đầu" type="date" value={recurringData.startDate} onChange={e => setRecurringData({...recurringData, startDate: e.target.value})} />
            <Input label="Số tuần lặp lại" type="number" value={recurringData.weeks} onChange={e => setRecurringData({...recurringData, weeks: parseInt(e.target.value)})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Giờ vào" type="time" value={recurringData.startTime} onChange={e => setRecurringData({...recurringData, startTime: e.target.value})} />
            <Input label="Giờ ra" type="time" value={recurringData.endTime} onChange={e => setRecurringData({...recurringData, endTime: e.target.value})} />
          </div>
          <div className="flex gap-4 pt-6">
            <Button type="button" variant="secondary" className="flex-1 h-12 rounded-2xl" onClick={() => setIsRecurringModalOpen(false)}>Hủy</Button>
            <Button type="submit" className="flex-1 h-12 rounded-2xl shadow-lg shadow-primary/20">Tạo Toàn Bộ Lịch</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
