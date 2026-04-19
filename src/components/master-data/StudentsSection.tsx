import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2, Search, Pencil, Users } from 'lucide-react';
import { db } from '../../db/db';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { motion } from 'framer-motion';
import { useFilter } from '../../context/FilterContext';

import { StudentForm } from './forms/StudentForm';

export const StudentsSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { filters, updateFilter } = useFilter();
  const { searchTerm } = filters.students;
  const [editingId, setEditingId] = useState<number | null>(null);

  const classes = useLiveQuery(() => db.classes.toArray());
  const students = useLiveQuery(() => db.students.toArray());

  const filteredStudents = useMemo(() => {
    if (!students || !classes) return [];
    return students.filter(s => {
      const studentClass = classes.find(c => c.id === s.classId);
      const searchStr = searchTerm.toLowerCase();
      
      const matchesSearch = 
        s.name.toLowerCase().includes(searchStr) ||
        s.studentCode.toLowerCase().includes(searchStr) ||
        (studentClass?.name.toLowerCase().includes(searchStr)) ||
        (s.academicYear?.toLowerCase().includes(searchStr));
        
      return matchesSearch;
    });
  }, [students, classes, searchTerm]);

  const handleEditStudent = (student: any) => {
    setEditingId(student.id);
    setIsModalOpen(true);
  };

  const handleDeleteStudent = async (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa học sinh này không?')) {
      try {
        await db.transaction('rw', [db.students, db.enrollments, db.attendance], async () => {
          await db.students.delete(id);
          await db.enrollments.where('studentId').equals(id).delete();
          await db.attendance.where('studentId').equals(id).delete();
        });
      } catch (error) {
        console.error('Lỗi khi xóa học sinh:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* ... (Toolbar remains same) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Danh mục Học sinh</h2>
            <p className="text-foreground/40 text-sm">Quản lý hồ sơ {students?.length || 0} học sinh</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
            <Input 
              placeholder="Tìm kiếm..." 
              value={searchTerm}
              onChange={(e) => updateFilter('students', { searchTerm: e.target.value })}
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
        {filteredStudents?.map((item, index) => {
          const studentClass = classes?.find(c => c.id === item.classId);
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card className="relative group p-4 border-foreground/5 hover:border-primary/30 transition-all">
                <div className="absolute top-2 right-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                  <Button variant="ghost" className="p-2 w-10 h-10 rounded-xl text-primary hover:bg-primary/10" onClick={() => handleEditStudent(item)}>
                    <Pencil className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" className="p-2 w-10 h-10 rounded-xl text-red-500 hover:bg-red-500/10" onClick={() => handleDeleteStudent(item.id!)}>
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-4">
                  {item.avatar ? (
                    <img src={item.avatar} alt={item.name} className="w-16 h-16 rounded-2xl object-cover border border-foreground/10 group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold text-xl group-hover:scale-105 transition-transform">
                      {item.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-bold text-foreground leading-tight truncate">{item.name}</h3>
                    <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mt-1">MSHS: {item.studentCode}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-foreground/5 rounded text-[10px] text-foreground/60 font-bold uppercase tracking-wider">
                        {studentClass?.name || 'K/N'}
                      </span>
                      {item.academicYear && (
                        <span className="px-2 py-0.5 bg-primary/5 rounded text-[10px] text-primary font-bold uppercase tracking-wider">
                          {item.academicYear}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {filteredStudents?.length === 0 && (
        <div className="text-center py-20 px-4 bg-background-light/30 backdrop-blur-3xl rounded-[2rem] border border-dashed border-foreground/10">
          <Users className="w-16 h-16 text-foreground/5 mx-auto mb-4" />
          <p className="text-foreground/40 font-bold">Không tìm thấy học sinh nào</p>
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? "Sửa Thông Tin Học Sinh" : "Thêm Học Sinh Mới"}
      >
        <StudentForm 
          editingId={editingId} 
          onSuccess={() => setIsModalOpen(false)} 
          onCancel={() => setIsModalOpen(false)} 
        />
      </Modal>
    </div>
  );
};
