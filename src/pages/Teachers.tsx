import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, GraduationCap, Trash2, Search, Pencil } from 'lucide-react';
import { db } from '../db/db';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { motion } from 'framer-motion';
import { useFilter } from '../context/FilterContext';

export const Teachers = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { filters, updateFilter } = useFilter();
  const { searchTerm } = filters.teachers;
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    teacherCode: '',
    department: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const teachers = useLiveQuery(
    () => db.teachers.toArray(),
    []
  );

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập họ và tên';
    if (!formData.teacherCode.trim()) newErrors.teacherCode = 'Vui lòng nhập mã giáo viên';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (editingId) {
        await db.teachers.update(editingId, formData);
      } else {
        await db.teachers.add({
          ...formData,
          createdAt: Date.now()
        });
      }
      
      setFormData({ name: '', teacherCode: '', department: '' });
      setErrors({});
      setEditingId(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Lỗi lưu giáo viên:', error);
      alert('Không thể lưu giáo viên. Vui lòng thử lại!');
    }
  };

  const handleEditTeacher = (teacher: any) => {
    setFormData({
      name: teacher.name,
      teacherCode: teacher.teacherCode,
      department: teacher.department || ''
    });
    setEditingId(teacher.id);
    setIsModalOpen(true);
  };

  const handleDeleteTeacher = async (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa giáo viên này không?')) {
      await db.teachers.delete(id);
    }
  };

  const filteredTeachers = teachers?.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.teacherCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Danh mục Giáo viên</h1>
          <p className="text-foreground/50">Quản lý danh sách giáo viên giảng dạy trong hệ thống.</p>
        </div>
        <Button onClick={() => {
          setEditingId(null);
          setFormData({ name: '', teacherCode: '', department: '' });
          setIsModalOpen(true);
        }}>
          <Plus className="w-5 h-5" />
          Thêm Giáo Viên
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/30" />
        <Input 
          className="pl-12" 
          placeholder="Tìm kiếm theo tên hoặc mã giáo viên..." 
          value={searchTerm}
          onChange={(e) => updateFilter('teachers', { searchTerm: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeachers?.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="relative group">
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <Button 
                  variant="ghost" 
                  className="p-2 text-primary hover:bg-primary/10"
                  onClick={() => handleEditTeacher(item)}
                >
                  <Pencil className="w-5 h-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  className="p-2 text-red-500 hover:bg-red-500/10"
                  onClick={() => handleDeleteTeacher(item.id!)}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{item.name}</h3>
                  <p className="text-foreground/40 text-sm">Mã: {item.teacherCode}</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-foreground/10">
                <p className="text-xs text-foreground/30 uppercase font-bold tracking-wider">Bộ môn</p>
                <p className="text-foreground/80 mt-1">{item.department || 'Chưa xác định'}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? "Sửa Thông Tin Giáo Viên" : "Thêm Giáo Viên Mới"}
      >
        <form noValidate onSubmit={handleAddTeacher} className="space-y-4">
          <Input 
            label="Họ và tên" 
            value={formData.name}
            error={errors.name}
            onChange={(e) => {
              setFormData({...formData, name: e.target.value});
              if (errors.name) setErrors({...errors, name: ''});
            }}
          />
          <Input 
            label="Mã giáo viên" 
            value={formData.teacherCode}
            error={errors.teacherCode}
            onChange={(e) => {
              setFormData({...formData, teacherCode: e.target.value});
              if (errors.teacherCode) setErrors({...errors, teacherCode: ''});
            }}
          />
          <Input 
            label="Bộ môn" 
            value={formData.department}
            onChange={(e) => setFormData({...formData, department: e.target.value})}
          />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" className="flex-1">
              {editingId ? "Cập Nhật" : "Lưu Giáo Viên"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
