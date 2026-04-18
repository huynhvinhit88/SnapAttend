import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, School, Trash2, Search, Pencil } from 'lucide-react';
import { db } from '../db/db';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { motion } from 'framer-motion';
import { useFilter } from '../context/FilterContext';

export const Classes = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { filters, updateFilter } = useFilter();
  const { searchTerm } = filters.classes;
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    major: '',
    academicYear: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Truy vấn dữ liệu từ IndexedDB (Tự động cập nhật khi có thay đổi)
  const classes = useLiveQuery(
    () => db.classes.toArray(),
    []
  );

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập tên lớp học';
    if (!formData.grade) newErrors.grade = 'Vui lòng chọn khối';
    if (!formData.academicYear.trim()) newErrors.academicYear = 'Vui lòng nhập niên khóa';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (editingId) {
        await db.classes.update(editingId, formData);
      } else {
        await db.classes.add({
          ...formData,
          createdAt: Date.now()
        });
      }
      
      setFormData({ name: '', grade: '', major: '', academicYear: '' });
      setErrors({});
      setEditingId(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Lỗi lưu lớp học:', error);
      alert('Không thể lưu lớp học. Vui lòng thử lại!');
    }
  };

  const handleEditClass = (cls: any) => {
    setFormData({
      name: cls.name,
      grade: cls.grade,
      major: cls.major || '',
      academicYear: cls.academicYear
    });
    setEditingId(cls.id);
    setIsModalOpen(true);
  };

  const handleDeleteClass = async (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa lớp này không? Dữ liệu liên quan có thể bị ảnh hưởng.')) {
      await db.classes.delete(id);
    }
  };

  const filteredClasses = classes?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.major?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Quản lý Lớp</h1>
          <p className="text-white/50">Danh mục các lớp học hành chính trong hệ thống.</p>
        </div>
        <Button onClick={() => {
          setEditingId(null);
          setFormData({ name: '', grade: '', major: '', academicYear: '' });
          setIsModalOpen(true);
        }} className="w-full md:w-auto">
          <Plus className="w-5 h-5" />
          Thêm Lớp Mới
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
        <Input 
          className="pl-12" 
          placeholder="Tìm kiếm theo tên lớp hoặc chuyên ngành..." 
          value={searchTerm}
          onChange={(e) => updateFilter('classes', { searchTerm: e.target.value })}
        />
      </div>

      {/* Grid Danh sách */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClasses?.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="relative group overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <Button 
                  variant="ghost" 
                  className="p-2 text-primary hover:bg-primary/10"
                  onClick={() => handleEditClass(item)}
                >
                  <Pencil className="w-5 h-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  className="p-2 text-red-500 hover:bg-red-500/10"
                  onClick={() => handleDeleteClass(item.id!)}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <School className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{item.name}</h3>
                  <p className="text-primary text-sm font-medium">{item.grade}</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-white/30 uppercase font-bold tracking-wider">Chuyên ngành</p>
                  <p className="text-white/80 text-sm mt-1">{item.major || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-white/30 uppercase font-bold tracking-wider">Niên khóa</p>
                  <p className="text-white/80 text-sm mt-1">{item.academicYear}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredClasses?.length === 0 && (
        <div className="text-center py-20 px-4 bg-white/5 rounded-3xl border border-dashed border-white/10">
          <School className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 font-medium">Chưa có dữ liệu lớp học nào được tìm thấy.</p>
        </div>
      )}

      {/* Modal Thêm Mới/Sửa */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? "Sửa Thông Tin Lớp" : "Thêm Lớp Học Mới"}
      >
        <form noValidate onSubmit={handleAddClass} className="space-y-4">
          <Input 
            label="Tên Lớp (VD: 10A1)" 
            value={formData.name}
            error={errors.name}
            onChange={(e) => {
              setFormData({...formData, name: e.target.value});
              if (errors.name) setErrors({...errors, name: ''});
            }}
          />
          <Input 
            label="Khối" 
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
            label="Chuyên ngành / Khối chuyên (Nếu có)" 
            value={formData.major}
            onChange={(e) => setFormData({...formData, major: e.target.value})}
          />
          <Input 
            label="Niên khóa (VD: 2024 - 2027)" 
            value={formData.academicYear}
            error={errors.academicYear}
            onChange={(e) => {
              setFormData({...formData, academicYear: e.target.value});
              if (errors.academicYear) setErrors({...errors, academicYear: ''});
            }}
          />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" className="flex-1">
              {editingId ? "Cập Nhật" : "Lưu Lớp Học"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
