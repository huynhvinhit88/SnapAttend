import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, BookOpen, Trash2, Search, Pencil } from 'lucide-react';
import { db } from '../../db/db';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { motion } from 'framer-motion';
import { useFilter } from '../../context/FilterContext';

import { SubjectForm } from './forms/SubjectForm';

export const SubjectsSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { filters, updateFilter } = useFilter();
  const { searchTerm } = filters.subjects;
  const [editingId, setEditingId] = useState<number | null>(null);

  const subjects = useLiveQuery(() => db.subjects.toArray());
  const subjectCount = useLiveQuery(() => db.subjects.count());

  const filteredSubjects = useMemo(() => {
    if (!subjects) return [];
    return subjects.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [subjects, searchTerm]);

  const handleEditSubject = (subject: any) => {
    setEditingId(subject.id);
    setIsModalOpen(true);
  };

  const handleDeleteSubject = async (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa môn học này?')) {
      await db.subjects.delete(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* ... (Toolbar remains same) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Danh sách Môn học</h2>
            <p className="text-foreground/40 text-sm">Quản lý {subjectCount || 0} môn học trong hệ thống</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
            <Input 
              placeholder="Tìm kiếm..." 
              value={searchTerm}
              onChange={(e) => updateFilter('subjects', { searchTerm: e.target.value })}
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
        {filteredSubjects?.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="relative group overflow-hidden border-foreground/5 hover:border-indigo-500/30 transition-all">
              <div className="absolute top-0 right-0 p-4 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                <Button variant="ghost" className="p-2 w-10 h-10 rounded-xl text-primary hover:bg-primary/10" onClick={() => handleEditSubject(item)}>
                  <Pencil className="w-5 h-5" />
                </Button>
                <Button variant="ghost" className="p-2 w-10 h-10 rounded-xl text-red-500 hover:bg-red-500/10" onClick={() => handleDeleteSubject(item.id!)}>
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <BookOpen className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground truncate max-w-[180px]">{item.name}</h3>
                  <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">{item.code}</p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <span className="px-2.5 py-1 bg-indigo-500/10 rounded-lg text-[10px] font-black text-indigo-400 uppercase tracking-tighter">
                   {item.credits} TÍN CHỈ / TIẾT
                </span>
              </div>
              <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredSubjects?.length === 0 && (
        <div className="text-center py-20 px-4 bg-background-light/30 backdrop-blur-3xl rounded-[2rem] border border-dashed border-foreground/10">
          <BookOpen className="w-16 h-16 text-foreground/5 mx-auto mb-4" />
          <p className="text-foreground/40 font-bold">Không tìm thấy môn học nào</p>
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? "Sửa Thông Tin Môn Học" : "Thêm Môn Học Mới"}
      >
        <SubjectForm 
          editingId={editingId} 
          onSuccess={() => setIsModalOpen(false)} 
          onCancel={() => setIsModalOpen(false)} 
        />
      </Modal>
    </div>
  );
};
