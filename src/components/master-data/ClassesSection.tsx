import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, School, Trash2, Search, Pencil, Users } from 'lucide-react';
import { db } from '../../db/db';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { motion } from 'framer-motion';
import { useFilter } from '../../context/FilterContext';

import { ClassForm } from './forms/ClassForm';

export const ClassesSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { filters, updateFilter } = useFilter();
  const { searchTerm } = filters.classes;
  const [editingId, setEditingId] = useState<number | null>(null);

  const classes = useLiveQuery(() => db.classes.toArray());
  const academicYears = useLiveQuery(() => db.academicYears.toArray());
  
  const filteredClasses = useMemo(() => {
    if (!classes) return [];
    return classes.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.academicYear.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.major && c.major.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [classes, searchTerm]);

  const handleEditClass = (item: any) => {
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const handleDeleteClass = async (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa lớp học này? Mọi dữ liệu liên quan đến học sinh và ghi danh trong lớp sẽ bị xóa vĩnh viễn.')) {
      try {
        await db.transaction('rw', [db.classes, db.students, db.enrollments], async () => {
          await db.classes.delete(id);
          const studentsInClass = await db.students.where('classId').equals(id).toArray();
          const studentIds = studentsInClass.map(s => s.id!);
          await db.students.where('classId').equals(id).delete();
          await db.enrollments.where('studentId').anyOf(studentIds).delete();
        });
      } catch (error) {
        console.error('Lỗi khi xóa lớp học:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <School className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Danh mục Lớp học</h2>
            <p className="text-foreground/40 text-sm">Quản lý {classes?.length || 0} lớp hành chính</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
            <Input 
              placeholder="Tìm kiếm..." 
              value={searchTerm}
              onChange={(e) => updateFilter('classes', { searchTerm: e.target.value })}
              className="pl-9 h-11 bg-background-light/50 border-foreground/5 shadow-inner"
            />
          </div>
          <Button onClick={() => {
            setEditingId(null);
            setIsModalOpen(true);
          }} className="h-11 rounded-xl shadow-lg shadow-primary/20">
            <Plus className="w-5 h-5 mr-2" />
            Thêm mới
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* ... (Listing remains same) */}
        {filteredClasses?.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="relative group overflow-hidden border-foreground/5 hover:border-primary/30 transition-all">
              <div className="absolute top-0 right-0 p-4 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                <Button variant="ghost" className="p-2 w-10 h-10 rounded-xl text-primary hover:bg-primary/10" onClick={() => handleEditClass(item)}>
                  <Pencil className="w-5 h-5" />
                </Button>
                <Button variant="ghost" className="p-2 w-10 h-10 rounded-xl text-red-500 hover:bg-red-500/10" onClick={() => handleDeleteClass(item.id!)}>
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <School className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground truncate max-w-[150px]">{item.name}</h3>
                  <div className="inline-flex px-1.5 py-0.5 rounded-md bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
                    {item.grade}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-foreground/5 grid grid-cols-1 gap-4">
                <div className="flex justify-between items-center group/item">
                  <span className="text-[10px] text-foreground/30 uppercase font-black tracking-widest">Chuyên ngành</span>
                  <span className="text-foreground/80 text-sm font-medium">{item.major || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center group/item">
                  <span className="text-[10px] text-foreground/30 uppercase font-black tracking-widest">Niên khóa</span>
                  <span className="text-foreground/80 text-sm font-medium">{item.academicYear}</span>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredClasses?.length === 0 && (
        <div className="text-center py-20 px-4 bg-background-light/30 backdrop-blur-3xl rounded-[2rem] border border-dashed border-foreground/10">
          <School className="w-16 h-16 text-foreground/5 mx-auto mb-4" />
          <p className="text-foreground/40 font-bold">Không tìm thấy lớp học nào</p>
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? "Cập nhật Thông tin Lớp" : "Thêm Lớp Hành Chính Mới"}
      >
        <ClassForm 
          editingId={editingId} 
          onSuccess={() => setIsModalOpen(false)} 
          onCancel={() => setIsModalOpen(false)} 
        />
      </Modal>
    </div>
  );
};
