import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, School, Trash2, Search, Pencil, Users, TrendingUp } from 'lucide-react';
import { db } from '../db/db';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { motion } from 'framer-motion';
import { useFilter } from '../context/FilterContext';
import { PageHeader } from '../components/ui/PageHeader';

export const Classes = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { filters, updateFilter } = useFilter();
  const { searchTerm } = filters.classes;
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    academicYear: '',
    major: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const classes = useLiveQuery(() => db.classes.toArray());
  const totalStudents = useLiveQuery(() => db.students.count());
  const academicYears = useLiveQuery(() => db.academicYears.toArray());
  const defaultYear = useMemo(() => academicYears?.find(y => y.isDefault)?.name || '', [academicYears]);

  // Lọc danh sách lớp dựa trên từ khóa tìm kiếm
  const filteredClasses = useMemo(() => {
    if (!classes) return [];
    return classes.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.academicYear.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.major && c.major.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [classes, searchTerm]);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập tên lớp';
    if (!formData.grade.trim()) newErrors.grade = 'Vui lòng chọn khối';
    if (!formData.academicYear.trim()) newErrors.academicYear = 'Vui lòng nhập niên khóa';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (editingId) {
        await db.classes.update(editingId, {
          ...formData
        });
      } else {
        await db.classes.add({
          ...formData,
          createdAt: Date.now()
        });
      }
      setFormData({ name: '', grade: '', academicYear: '', major: '' });
      setEditingId(null);
      setErrors({});
      setIsModalOpen(false);
    } catch (error) {
      console.error('Lỗi khi lưu lớp học:', error);
      alert('Không thể lưu thông tin lớp học. Vui lòng thử lại!');
    }
  };

  const handleEditClass = (item: any) => {
    setFormData({
      name: item.name,
      grade: item.grade,
      academicYear: item.academicYear,
      major: item.major || ''
    });
    setEditingId(item.id);
    setErrors({});
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
        alert('Lỗi: Không thể xóa lớp học.');
      }
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <PageHeader 
        title="Lớp"
        description="Quản lý danh mục các lớp học hành chính trong hệ thống."
        icon={<School className="w-8 h-8" />}
        breadcrumbs={[
          { label: 'Trang chủ' },
          { label: 'Danh mục', active: true }
        ]}
        stats={[
          { label: 'Tổng số lớp', value: classes?.length || 0, icon: School },
          { label: 'Tổng học sinh', value: totalStudents || 0, icon: Users, color: 'text-primary' },
          { label: 'Tỉ lệ lấp đầy', value: '100%', icon: TrendingUp, color: 'text-green-500' },
        ]}
      >
        <Button onClick={() => {
          setEditingId(null);
          setFormData({ name: '', grade: '', academicYear: defaultYear, major: '' });
          setErrors({});
          setIsModalOpen(true);
        }}>
          <Plus className="w-5 h-5" />
          Thêm Lớp Mới
        </Button>
      </PageHeader>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/30 transition-colors group-focus-within:text-primary" />
        <Input 
          className="pl-12 h-14 text-lg bg-background-light/50 backdrop-blur-xl border-foreground/10 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 shadow-inner" 
          placeholder="Tìm kiếm theo tên lớp, niên khóa hoặc chuyên ngành..." 
          value={searchTerm}
          onChange={(e) => updateFilter('classes', { searchTerm: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClasses?.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="relative group overflow-hidden border-foreground/5 hover:border-primary/30 transition-all hover:shadow-2xl hover:shadow-primary/5">
              <div className="absolute top-0 right-0 p-4 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                <Button 
                  variant="ghost" 
                  className="p-2 w-10 h-10 rounded-xl text-primary hover:bg-primary/10"
                  onClick={() => handleEditClass(item)}
                  title="Sửa"
                >
                  <Pencil className="w-5 h-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  className="p-2 w-10 h-10 rounded-xl text-red-500 hover:bg-red-500/10"
                  onClick={() => handleDeleteClass(item.id!)}
                  title="Xóa"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 bg-primary/10 rounded-[1.25rem] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <School className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-black text-foreground truncate">{item.name}</h3>
                  <div className="inline-flex px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider mt-1">
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
              
              {/* Decorative accent orb */}
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredClasses?.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 px-4 bg-background-light/30 backdrop-blur-3xl rounded-[3rem] border border-dashed border-foreground/10">
          <School className="w-20 h-20 text-foreground/5 mx-auto mb-6" />
          <p className="text-foreground/40 font-bold text-lg">Chưa có dữ liệu lớp học nào được tìm thấy.</p>
          <p className="text-foreground/20 text-sm mt-2">Hãy nhấn 'Thêm Lớp Mới' để bắt đầu!</p>
        </motion.div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? "Cập nhật Thông tin Lớp" : "Thêm Lớp Hành Chính Mới"}
      >
        <form noValidate onSubmit={handleAddClass} className="space-y-6 pt-4">
          <Input 
            label="Tên Lớp (VD: 10A1, CNTT-K15)" 
            value={formData.name}
            error={errors.name}
            onChange={(e) => {
              setFormData({...formData, name: e.target.value});
              if (errors.name) setErrors({...errors, name: ''});
            }}
          />
          <Input 
            label="Khối đào tạo" 
            type="select"
            error={errors.grade}
            options={[
              { value: '', label: 'Chọn khối...' },
              { value: 'Khối 10', label: 'Khối 10' },
              { value: 'Khối 11', label: 'Khối 11' },
              { value: 'Khối 12', label: 'Khối 12' },
            ]}
            value={formData.grade}
            onChange={(e) => {
              setFormData({...formData, grade: e.target.value});
              if (errors.grade) setErrors({...errors, grade: ''});
            }}
          />
          <Input 
            label="Chuyên ngành / Khối chuyên (Tùy chọn)" 
            placeholder="VD: Chuyên Toán, Công nghệ thông tin..."
            value={formData.major}
            onChange={(e) => setFormData({...formData, major: e.target.value})}
          />
          <Input 
            label="Niên khóa (VD: 2024-2025, K15...)" 
            value={formData.academicYear}
            error={errors.academicYear}
            onChange={(e) => {
              setFormData({...formData, academicYear: e.target.value});
              if (errors.academicYear) setErrors({...errors, academicYear: ''});
            }}
          />
          <div className="flex gap-4 pt-6">
            <Button type="button" variant="secondary" className="flex-1 h-12 rounded-2xl" onClick={() => setIsModalOpen(false)}>
              Hủy bỏ
            </Button>
            <Button type="submit" className="flex-1 h-12 rounded-2xl shadow-lg shadow-primary/20">
              {editingId ? "Lưu thay đổi" : "Tạo Lớp Học"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
