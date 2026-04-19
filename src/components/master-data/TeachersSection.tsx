import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, GraduationCap, Trash2, Search, Pencil } from 'lucide-react';
import { db } from '../../db/db';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { motion } from 'framer-motion';
import { useFilter } from '../../context/FilterContext';
import { TeacherForm } from './forms/TeacherForm';

export const TeachersSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { filters, updateFilter } = useFilter();
  const { searchTerm } = filters.teachers;
  const [editingId, setEditingId] = useState<number | null>(null);

  const teachers = useLiveQuery(() => db.teachers.toArray());
  const teacherCount = useLiveQuery(() => db.teachers.count());

  const filteredTeachers = useMemo(() => {
    if (!teachers) return [];
    return teachers.filter(t => 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.teacherCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [teachers, searchTerm]);

  const handleEditTeacher = (teacher: any) => {
    setEditingId(teacher.id);
    setIsModalOpen(true);
  };

  const handleDeleteTeacher = async (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa giáo viên này không?')) {
      await db.teachers.delete(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Đội ngũ Giáo viên</h2>
            <p className="text-foreground/40 text-sm">Quản lý hồ sơ {teacherCount || 0} giáo viên</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
            <Input 
              placeholder="Tìm kiếm..." 
              value={searchTerm}
              onChange={(e) => updateFilter('teachers', { searchTerm: e.target.value })}
              className="pl-9 h-11 bg-background-light/50 border-foreground/5 shadow-inner"
            />
          </div>
          <Button onClick={() => {
            setEditingId(null);
            setIsModalOpen(true);
          }} className="h-11 rounded-x1 shadow-lg shadow-primary/20 bg-accent hover:bg-accent/90">
            <Plus className="w-5 h-5 mr-2" />
            Thêm mới
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeachers?.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="relative group overflow-hidden border-foreground/5 hover:border-accent/30 transition-all">
              <div className="absolute top-0 right-0 p-4 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                <Button variant="ghost" className="p-2 w-10 h-10 rounded-xl text-primary hover:bg-primary/10" onClick={() => handleEditTeacher(item)}>
                  <Pencil className="w-5 h-5" />
                </Button>
                <Button variant="ghost" className="p-2 w-10 h-10 rounded-xl text-red-500 hover:bg-red-500/10" onClick={() => handleDeleteTeacher(item.id!)}>
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <GraduationCap className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground truncate max-w-[180px]">{item.name}</h3>
                  <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">{item.teacherCode}</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-foreground/5">
                <p className="text-[10px] text-foreground/30 uppercase font-black tracking-widest">Bộ môn</p>
                <p className="text-foreground/80 text-sm font-medium mt-1">{item.department || 'Chưa xác định'}</p>
              </div>
              
              {/* Decorative accent */}
              <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors" />
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredTeachers?.length === 0 && (
        <div className="text-center py-20 px-4 bg-background-light/30 backdrop-blur-3xl rounded-[2rem] border border-dashed border-foreground/10">
          <GraduationCap className="w-16 h-16 text-foreground/5 mx-auto mb-4" />
          <p className="text-foreground/40 font-bold">Không tìm thấy giáo viên nào</p>
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? "Sửa Thông Tin Giáo Viên" : "Thêm Giáo Viên Mới"}
      >
        <TeacherForm 
          editingId={editingId} 
          onSuccess={() => setIsModalOpen(false)} 
          onCancel={() => setIsModalOpen(false)} 
        />
      </Modal>
    </div>
  );
};
