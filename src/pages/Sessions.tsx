import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Plus, Calendar, Clock, Trash2, Search, 
  Play, Repeat, AlertCircle, CheckCircle2, Layers, BookOpen 
} from 'lucide-react';
import { db } from '../db/db';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { motion } from 'framer-motion';
import { useFilter } from '../context/FilterContext';
import { PageHeader } from '../components/ui/PageHeader';
import { addDays, addWeeks, format, getDay, parseISO } from 'date-fns';
import { clsx } from 'clsx';

interface SessionsProps {
  onStartAttendance?: (sessionId: number) => void;
}

export const Sessions = ({ onStartAttendance }: SessionsProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const { filters, updateFilter } = useFilter();
  const { status, subjectId, sectionId, filterDate } = filters.sessions;

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
    weeks: 10,
    daysOfWeek: [getDay(new Date())]
  });

  const DAY_OPTIONS = [
    { value: 1, label: 'T2' },
    { value: 2, label: 'T3' },
    { value: 3, label: 'T4' },
    { value: 4, label: 'T5' },
    { value: 5, label: 'T6' },
    { value: 6, label: 'T7' },
    { value: 0, label: 'CN' },
  ];

  const sessions = useLiveQuery(() => db.sessions.toArray());
  const sections = useLiveQuery(() => db.sections.toArray());
  const subjects = useLiveQuery(() => db.subjects.toArray());
  const academicYears = useLiveQuery(() => db.academicYears.toArray());

  const [sessionYearFilter, setSessionYearFilter] = useState('');
  const [recurringYearFilter, setRecurringYearFilter] = useState('');

  const defaultYear = useMemo(() => 
    academicYears?.find(y => y.isDefault)?.name || '', 
    [academicYears]
  );

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
      if (recurringData.daysOfWeek.length === 0) {
        return alert('Vui lòng chọn ít nhất một thứ trong tuần');
      }

      const start = parseISO(recurringData.startDate);
      const newSessions: any[] = [];

      for (const dayOfWeek of recurringData.daysOfWeek) {
        let firstOccurrence = start;
        while (getDay(firstOccurrence) !== dayOfWeek) {
          firstOccurrence = addDays(firstOccurrence, 1);
        }
        
        for (let i = 0; i < recurringData.weeks; i++) {
          const sessionDate = addWeeks(firstOccurrence, i);
          newSessions.push({
            sectionId: parseInt(recurringData.sectionId),
            date: format(sessionDate, 'yyyy-MM-dd'),
            startTime: recurringData.startTime,
            endTime: recurringData.endTime,
            status: 'pending' as const,
            createdAt: Date.now()
          });
        }
      }

      newSessions.sort((a, b) => a.date.localeCompare(b.date));
      await db.sessions.bulkAdd(newSessions);
      setIsRecurringModalOpen(false);
      alert(`Đã tạo thành công ${newSessions.length} ca học!`);
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

  const handleTodayFilter = () => {
    updateFilter('sessions', { 
      filterDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'pending'
    });
  };

  const groupedData = useMemo(() => {
    if (!sections || !sessions || !subjects) return [];
    
    return sections.filter(s => {
      // Lọc theo Môn học
      const matchesSubject = subjectId === 'all' || s.subjectId === parseInt(subjectId);
      // Lọc theo Lớp học phần
      const matchesSection = sectionId === 'all' || s.id === parseInt(sectionId);
      
      return matchesSubject && matchesSection;
    }).map(section => {
      const sectionSessions = sessions.filter(s => s.sectionId === section.id);
      const subject = subjects.find(sub => sub.id === section.subjectId);
      
      const filteredSubSessions = sectionSessions.filter(s => {
        const matchesDate = !filterDate || s.date === filterDate;
        const matchesStatus = status === 'all' || s.status === status;
        return matchesDate && matchesStatus;
      }).sort((a, b) => b.date.localeCompare(a.date));

      // Luôn hiển thị nếu không có bộ lọc ngày/trạng thái, 
      // hoặc nếu có bộ lọc thì phải có ca học khớp
      const hasStrictFilter = filterDate || status !== 'all';
      
      if (!hasStrictFilter || filteredSubSessions.length > 0) {
        return { section, subject, sessions: filteredSubSessions };
      }
      return null;
    }).filter(item => item !== null) as { section: any, subject: any, sessions: any[] }[];
  }, [sections, sessions, subjects, status, subjectId, sectionId, filterDate]);

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title="Ca học"
        description="Lập kế hoạch giảng dạy, tạo lịch học định kỳ và theo dõi tiến độ điểm danh."
        icon={<Calendar className="w-8 h-8 text-primary" />}
        breadcrumbs={[{ label: 'Trang chủ' }, { label: 'Đào tạo', active: true }]}
        stats={[
          { label: 'Tổng số ca', value: sessions?.length || 0, icon: Calendar },
          { label: 'Hoàn thành', value: sessions?.filter(s => s.status === 'completed').length || 0, icon: CheckCircle2, color: 'text-green-500' },
        ]}
      >
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => {
            setRecurringYearFilter(defaultYear);
            setRecurringData(prev => ({ ...prev, sectionId: '' }));
            setIsRecurringModalOpen(true);
          }}>
            <Repeat className="w-5 h-5" /> Tạo Định Kỳ
          </Button>
          <Button onClick={() => {
            setSessionYearFilter(defaultYear);
            setFormData(prev => ({ ...prev, sectionId: '' }));
            setIsModalOpen(true);
          }}>
            <Plus className="w-5 h-5" /> Thêm Ca Lẻ
          </Button>
        </div>
      </PageHeader>

      <Card className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative overflow-hidden p-6 border-none shadow-none">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
        
        <div className="relative z-10">
          <Input 
            label="Trạng thái" 
            type="select"
            icon={<AlertCircle className="w-4 h-4" />}
            options={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'completed', label: 'Đã điểm danh' },
              { value: 'pending', label: 'Chưa điểm danh' }
            ]}
            value={status} 
            onChange={e => updateFilter('sessions', { status: e.target.value })}
          />
        </div>

        <div className="relative z-10">
          <Input 
            label="Môn học" 
            type="select"
            icon={<BookOpen className="w-4 h-4" />}
            options={[{ value: 'all', label: 'Tất cả môn học' }, ...(subjects?.map(s => ({ value: s.id!.toString(), label: s.name })) || [])]}
            value={subjectId} 
            onChange={e => updateFilter('sessions', { subjectId: e.target.value, sectionId: 'all' })}
          />
        </div>

        <div className="relative z-10">
          <Input 
            label="Lớp học phần" 
            type="select"
            icon={<Layers className="w-4 h-4" />}
            options={[{ value: 'all', label: 'Tất cả lớp học phần' }, ...(sections?.filter(s => subjectId === 'all' || s.subjectId === parseInt(subjectId)).map(s => ({ value: s.id!.toString(), label: s.name })) || [])]}
            value={sectionId} 
            onChange={e => updateFilter('sessions', { sectionId: e.target.value })}
          />
        </div>

        <div className="flex items-end gap-2 relative z-10">
          <div className="flex-1">
            <Input 
              label="Ngày diễn ra" 
              type="date"
              icon={<Calendar className="w-4 h-4" />}
              className="bg-background-light"
              value={filterDate} 
              onChange={e => updateFilter('sessions', { filterDate: e.target.value })}
            />
          </div>
          <Button 
            variant="secondary" 
            onClick={() => updateFilter('sessions', { filterDate: '' })}
            disabled={!filterDate}
            className="w-12 h-12 p-0 flex-shrink-0 rounded-xl"
            title="Xóa ngày"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {groupedData.map((group, idx) => (
          <motion.div
            key={group.section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="h-full border-foreground/5 hover:border-primary/20 transition-all flex flex-col p-0 overflow-hidden group">
              <div className="p-6 bg-foreground/[0.02] border-b border-foreground/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold shadow-inner">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors">{group.section.name}</h3>
                    <p className="text-[10px] text-foreground/30 font-black uppercase tracking-widest">
                      {group.subject?.name} • {group.sessions.length} Ca học
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5 self-end sm:self-auto">
                  <Button 
                    variant="ghost" 
                    className="h-9 px-3 rounded-xl text-primary hover:bg-primary/10 font-bold text-[10px] uppercase tracking-wider"
                    onClick={() => {
                      setRecurringYearFilter(group.section.schoolYear);
                      setRecurringData(prev => ({ ...prev, sectionId: group.section.id.toString() }));
                      setIsRecurringModalOpen(true);
                    }}
                  >
                    <Repeat className="w-3.5 h-3.5 mr-1" /> Định kỳ
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="h-9 px-3 rounded-xl text-primary hover:bg-primary/10 font-bold text-[10px] uppercase tracking-wider"
                    onClick={() => {
                      setSessionYearFilter(group.section.schoolYear);
                      setFormData(prev => ({ ...prev, sectionId: group.section.id.toString() }));
                      setIsModalOpen(true);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Ca lẻ
                  </Button>
                </div>
              </div>

              <div className="p-4 flex-1 space-y-3">
                {group.sessions.length > 0 ? (
                  group.sessions.map(item => {
                    const isFinished = item.status === 'completed';
                    return (
                      <div key={item.id} className="p-4 rounded-2xl bg-foreground/[0.02] border border-foreground/5 group/item hover:bg-foreground/[0.04] transition-all relative overflow-hidden">
                        <div className="flex items-center justify-between relative z-10">
                          <div className="flex items-center gap-4">
                            <div className={clsx(
                              "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
                              isFinished ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary"
                            )}>
                              <Clock className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">{item.date}</p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-foreground/30">
                                {item.startTime} - {item.endTime}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {isFinished ? (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 rounded-full border border-green-500/20">
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                                <span className="text-[9px] text-green-500 font-black uppercase tracking-widest">Xong</span>
                              </div>
                            ) : (
                              <Button 
                                onClick={() => onStartAttendance?.(item.id!)}
                                className="h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md shadow-primary/20"
                              >
                                <Play className="w-3 h-3 mr-1.5 fill-current" /> Điểm danh
                              </Button>
                            )}
                            <Button variant="ghost" className="p-2 w-8 h-8 rounded-lg text-red-500/20 hover:text-red-500 hover:bg-red-500/10 transition-all" onClick={() => handleDeleteSession(item.id!)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-10 text-center bg-foreground/[0.01] rounded-2xl border border-dashed border-foreground/5">
                    <Calendar className="w-8 h-8 text-foreground/5 mx-auto mb-2" />
                    <p className="text-[10px] text-foreground/20 font-black uppercase tracking-widest">Không có ca học nào</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {groupedData.length === 0 && (
        <div className="text-center py-24 px-4 bg-background-light/30 backdrop-blur-3xl rounded-[3rem] border border-dashed border-foreground/10">
          <Calendar className="w-20 h-20 text-foreground/5 mx-auto mb-6" />
          <p className="text-foreground/40 font-bold text-lg">Không tìm thấy kế hoạch ca học nào.</p>
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
          <div className="space-y-3">
            <label className="label-text">Chọn các thứ trong tuần</label>
            <div className="flex flex-wrap gap-2">
              {DAY_OPTIONS.map((day) => {
                const isActive = (recurringData as any).daysOfWeek.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => {
                        const days = (recurringData as any).daysOfWeek;
                        setRecurringData({
                            ...recurringData,
                            daysOfWeek: days.includes(day.value) ? days.filter((d: any) => d !== day.value) : [...days, day.value].sort()
                        });
                    }}
                    className={clsx(
                      "w-11 h-11 rounded-xl text-xs font-black transition-all flex items-center justify-center border-2",
                      isActive 
                        ? "bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-105" 
                        : "bg-primary/5 border-transparent text-foreground/40 hover:bg-primary/10 hover:text-primary/70"
                    )}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Ngày bắt đầu" type="date" value={recurringData.startDate} onChange={e => setRecurringData({...recurringData, startDate: e.target.value})} />
            <Input label="Số tuần lặp lại" type="number" value={recurringData.weeks} onChange={e => setRecurringData({...recurringData, weeks: parseInt(e.target.value) || 0})} />
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
