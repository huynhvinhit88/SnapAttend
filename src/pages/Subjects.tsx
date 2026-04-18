import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, BookOpen, Trash2, Search, Pencil } from 'lucide-react';
import { db } from '../db/db';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { motion } from 'framer-motion';
import { useFilter } from '../context/FilterContext';

export const Subjects = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { filters, updateFilter } = useFilter();
  const { searchTerm } = filters.subjects;
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    credits: '3'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const subjects = useLiveQuery(() => db.subjects.toArray());

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    
    if (!formData.code.trim()) newErrors.code = 'Vui lòng nhập mã môn học';
    if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập tên môn học';
    if (!formData.credits.trim()) newErrors.credits = 'Vui lòng nhập số tín chỉ/tiết';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const data = {
        ...formData,
        credits: parseInt(formData.credits)
      };

      if (editingId) {
        await db.subjects.update(editingId, data);
      } else {
        await db.subjects.add({
          ...data,
          createdAt: Date.now()
        });
      }
      
      setFormData({ code: '', name: '', credits: '3' });
      setErrors({});
      setEditingId(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Lỗi lưu môn học:', error);
      alert('Không thể lưu môn học. Vui lòng thử lại!');
    }
  };

  const handleEditSubject = (subject: any) => {
    setFormData({
      code: subject.code,
      name: subject.name,
      credits: subject.credits.toString()
    });
    setEditingId(subject.id);
    setIsModalOpen(true);
  };

  const handleDeleteSubject = async (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa môn học này?')) {
      await db.subjects.delete(id);
    }
  };

  const filteredSubjects = subjects?.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Quản lý Môn học</h1>
          <p className="text-foreground/50">Danh mục các môn học/tiết học trong chương trình.</p>
        </div>
        <Button onClick={() => {
          setEditingId(null);
          setFormData({ code: '', name: '', credits: '3' });
          setIsModalOpen(true);
        }}>
          <Plus className="w-5 h-5" />
          Thêm Môn Học
        </Button>
      </div>

      <div className="relative">
        <Input 
          placeholder="Tìm tên môn học, mã môn..." 
          icon={<Search className="w-5 h-5 flex-shrink-0" />}
          value={searchTerm}
          onChange={(e) => updateFilter('subjects', { searchTerm: e.target.value })}
          className="max-w-md"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSubjects?.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="relative group">
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <Button variant="ghost" className="p-2 text-primary hover:bg-primary/10" onClick={() => handleEditSubject(item)}>
                  <Pencil className="w-5 h-5" />
                </Button>
                <Button variant="ghost" className="p-2 text-red-500 hover:bg-red-500/10" onClick={() => handleDeleteSubject(item.id!)}>
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{item.name}</h3>
                  <p className="text-foreground/40 text-sm">{item.code}</p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <span className="px-3 py-1 bg-foreground/5 rounded-lg text-xs font-bold text-foreground/60">
                   {item.credits} TÍN CHỈ / TIẾT
                </span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? "Sửa Thông Tin Môn Học" : "Thêm Môn Học"}
      >
        <form noValidate onSubmit={handleAddSubject} className="space-y-4">
          <Input 
            label="Mã môn học" 
            value={formData.code} 
            error={errors.code}
            onChange={e => {
              setFormData({...formData, code: e.target.value});
              if (errors.code) setErrors({...errors, code: ''});
            }} 
          />
          <Input 
            label="Tên môn học" 
            value={formData.name} 
            error={errors.name}
            onChange={e => {
              setFormData({...formData, name: e.target.value});
              if (errors.name) setErrors({...errors, name: ''});
            }} 
          />
          <Input 
            label="Số tín chỉ / Tiết học" 
            type="number" 
            value={formData.credits} 
            error={errors.credits}
            onChange={e => {
              setFormData({...formData, credits: e.target.value});
              if (errors.credits) setErrors({...errors, credits: ''});
            }} 
          />
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" className="flex-1">
              {editingId ? "Cập Nhật" : "Lưu Môn Học"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
