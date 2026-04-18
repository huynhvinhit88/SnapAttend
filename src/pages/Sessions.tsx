import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Calendar, Trash2, Search, Zap, Clock } from 'lucide-react';
import { db } from '../db/db';
import { sessionService } from '../services/session.service';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { clsx } from 'clsx';
import { useFilter } from '../context/FilterContext';

export const Sessions = ({ onStartAttendance }: { onStartAttendance: (id: number) => void }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { filters, updateFilter } = useFilter();
  const { selectedSectionId, filterDate } = filters.sessions;
  
  const setFilterDate = (val: string) => updateFilter('sessions', { filterDate: val });
  const setSelectedSectionId = (val: string) => updateFilter('sessions', { selectedSectionId: val });
  
  const [formData, setFormData] = useState({
    sectionId: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    daysOfWeek: [] as number[],
    startTime: '08:00',
    endTime: '10:00'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sessions = useLiveQuery(() => db.sessions.orderBy('date').reverse().toArray());
  const sections = useLiveQuery(() => db.sections.toArray());

  const handleCreateSessions = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    
    if (!formData.sectionId) newErrors.sectionId = 'Vui lòng chọn lớp học phần';
    if (formData.daysOfWeek.length === 0) newErrors.daysOfWeek = 'Vui lòng chọn ít nhất một thứ';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const count = await sessionService.generateSessions({
        sectionId: parseInt(formData.sectionId),
        startDate: formData.startDate,
        endDate: formData.endDate,
        daysOfWeek: formData.daysOfWeek,
        startTime: formData.startTime,
        endTime: formData.endTime
      });

      alert(`Đã tạo thành công ${count} ca học!`);
      setErrors({});
      setIsModalOpen(false);
    } catch (error) {
      console.error('Lỗi tạo ca học:', error);
      alert('Không thể tạo ca học. Vui lòng kiểm tra lại thông tin!');
    }
  };

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day) 
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day]
    }));
  };

  const handleDeleteSession = async (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa ca học này?')) {
      await db.sessions.delete(id);
    }
  };

  const filteredSessions = sessions?.filter(s => 
    (selectedSectionId === 'all' || s.sectionId === parseInt(selectedSectionId)) &&
    (filterDate === '' || s.date === filterDate)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Lịch học & Ca học</h1>
          <p className="text-foreground/50">Quản lý các buổi học cụ thể và tạo lịch định kỳ.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Zap className="w-5 h-5 text-yellow-400" />
          Tạo Ca Học Định Kỳ
        </Button>
      </div>

      <Card className="p-4 flex flex-col md:flex-row items-end md:items-center gap-4 bg-foreground/5 border-foreground/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
        
        <div className="flex-1 w-full">
          <Input 
            label="Lớp học phần"
            type="select"
            icon={<Search className="w-4 h-4" />}
            options={[
              { value: 'all', label: 'Tất cả lớp học phần' },
              ...(sections?.map(s => ({ value: s.id!.toString(), label: s.name })) || [])
            ]}
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
          />
        </div>
        
        <div className="flex items-end gap-2 w-full md:w-auto">
          <div className="w-full md:w-64">
            <Input 
              label="Ngày diễn ra"
              type="date"
              icon={<Calendar className="w-4 h-4" />}
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          <Button 
            variant="secondary" 
            onClick={() => setFilterDate('')} 
            disabled={!filterDate}
            className="w-11 h-11 p-0 flex-shrink-0 mb-[26px]"
            title="Xóa ngày"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSessions?.map((item, index) => {
          const section = sections?.find(s => s.id === item.sectionId);
          const dateObj = parseISO(item.date);
          
          return (
            <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }}>
              <Card 
                className="relative group p-0 overflow-hidden"
                onClick={() => onStartAttendance(item.id!)}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-foreground/5 px-3 py-1 rounded-lg text-[10px] font-bold text-foreground/40 uppercase tracking-widest">
                      {format(dateObj, 'eeee', { locale: vi })}
                    </div>
                    <Button 
                      variant="ghost" className="p-1 text-red-500 opacity-0 group-hover:opacity-100" 
                      onClick={(e) => { e.stopPropagation(); handleDeleteSession(item.id!); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <h3 className="text-lg font-bold text-foreground mb-1">{section?.name}</h3>
                  
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-1.5 text-primary">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm font-medium">{format(dateObj, 'dd/MM/yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-foreground/50">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">{item.startTime} - {item.endTime}</span>
                    </div>
                  </div>
                </div>

                <div className={clsx(
                  "h-1.5 w-full",
                  item.status === 'completed' ? 'bg-green-500' : 'bg-primary/30'
                )} />
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Modal Tạo Lịch Định Kỳ */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Thiết lập lịch học định kỳ">
        <form noValidate onSubmit={handleCreateSessions} className="space-y-6">
          <Input 
            label="Lớp học phần áp dụng" type="select" 
            error={errors.sectionId}
            options={[{ value: '', label: 'Chọn lớp học phần...' }, ...(sections?.map(s => ({ value: s.id!.toString(), label: s.name })) || [])]}
            value={formData.sectionId} 
            onChange={e => {
              setFormData({...formData, sectionId: e.target.value});
              if (errors.sectionId) setErrors({...errors, sectionId: ''});
            }}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Từ ngày" type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
            <Input label="Đến ngày" type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
          </div>

          <div>
            <label className="label-text">Lặp lại vào các thứ</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <button
                  key={d} type="button"
                  onClick={() => {
                    toggleDay(d);
                    if (errors.daysOfWeek) setErrors({...errors, daysOfWeek: ''});
                  }}
                  className={clsx(
                    "w-10 h-10 rounded-xl font-bold transition-all border",
                    formData.daysOfWeek.includes(d) 
                      ? "bg-primary border-primary text-foreground shadow-lg shadow-primary/20" 
                      : "bg-foreground/5 border-foreground/10 text-foreground/40",
                    errors.daysOfWeek && "border-red-500"
                  )}
                >
                  {d === 0 ? 'CN' : `T${d + 1}`}
                </button>
              ))}
            </div>
            {errors.daysOfWeek && <p className="mt-1 text-xs text-red-500 font-medium">{errors.daysOfWeek}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Giờ bắt đầu" type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
            <Input label="Giờ kết thúc" type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" className="flex-1">Tạo Hàng Loạt</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
