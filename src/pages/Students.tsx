import React, { useState, useRef, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2, Search, Camera, Upload, Pencil } from 'lucide-react';
import { db } from '../db/db';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { imageService } from '../services/image.service';
import { motion } from 'framer-motion';
import { useFilter } from '../context/FilterContext';

export const Students = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { filters, updateFilter } = useFilter();
  const { searchTerm, selectedClassId } = filters.students;
  const [editingId, setEditingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    studentCode: '',
    classId: '',
    avatar: '' as string | undefined
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const classes = useLiveQuery(() => db.classes.toArray());
  const students = useLiveQuery(() => db.students.toArray());

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.studentCode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = selectedClassId === 'all' || s.classId === parseInt(selectedClassId);
      return matchesSearch && matchesClass;
    });
  }, [students, searchTerm, selectedClassId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await imageService.compressImage(file);
      setFormData({ ...formData, avatar: compressed });
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập họ và tên';
    if (!formData.studentCode.trim()) newErrors.studentCode = 'Vui lòng nhập mã học sinh';
    if (!formData.classId) newErrors.classId = 'Vui lòng chọn lớp học';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      const data = {
        name: formData.name.trim(),
        studentCode: formData.studentCode.trim(),
        classId: parseInt(formData.classId),
        avatar: formData.avatar || undefined,
      };

      if (editingId) {
        await db.students.update(editingId, data);
      } else {
        await db.students.add({
          ...data,
          createdAt: Date.now()
        });
      }

      setFormData({ name: '', studentCode: '', classId: '', avatar: '' });
      setErrors({});
      setEditingId(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Lỗi lưu học sinh:', error);
      alert('Không thể lưu thông tin học sinh.');
    }
  };

  const handleEditStudent = (student: any) => {
    setFormData({
      name: student.name,
      studentCode: student.studentCode,
      classId: student.classId.toString(),
      avatar: student.avatar || ''
    });
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Quản lý Học sinh</h1>
          <p className="text-foreground/50">Danh sách học sinh theo từng lớp học.</p>
        </div>
        <Button onClick={() => {
          setEditingId(null);
          setFormData({ name: '', studentCode: '', classId: '', avatar: '' });
          setIsModalOpen(true);
        }}>
          <Plus className="w-5 h-5" />
          Thêm Học Sinh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input 
          placeholder="Tìm theo tên, mã học sinh..." 
          icon={<Search className="w-5 h-5 flex-shrink-0" />}
          value={searchTerm}
          onChange={(e) => updateFilter('students', { searchTerm: e.target.value })}
          className="w-full md:w-80"
        />
        <Input 
          type="select"
          options={[
            { value: 'all', label: 'Tất cả các lớp' },
            ...(classes?.map(c => ({ value: c.id!.toString(), label: c.name })) || [])
          ]}
          value={selectedClassId}
          onChange={(e) => updateFilter('students', { selectedClassId: e.target.value })}
          className="w-full md:w-64"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents?.map((item, index) => {
          const studentClass = classes?.find(c => c.id === item.classId);
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card className="relative group p-4">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <Button variant="ghost" className="p-2 text-primary hover:bg-primary/10" onClick={() => handleEditStudent(item)}>
                    <Pencil className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" className="p-2 text-red-500 hover:bg-red-500/10" onClick={() => handleDeleteStudent(item.id!)}>
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-4">
                  {item.avatar ? (
                    <img src={item.avatar} alt={item.name} className="w-16 h-16 rounded-2xl object-cover border border-foreground/10" />
                  ) : (
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold text-xl">
                      {item.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-foreground leading-tight">{item.name}</h3>
                    <p className="text-foreground/40 text-sm mt-1">MSHS: {item.studentCode}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-foreground/5 rounded text-[10px] text-foreground/60 font-bold uppercase tracking-wider">
                      {studentClass?.name || 'K/N'}
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? "Sửa Thông Tin Học Sinh" : "Thêm Học Sinh"}
      >
        <form noValidate onSubmit={handleAddStudent} className="space-y-4">
          <div className="flex justify-center mb-6">
            <div 
              className="relative w-24 h-24 bg-foreground/5 rounded-3xl border-2 border-dashed border-foreground/10 flex items-center justify-center cursor-pointer hover:bg-foreground/10 overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {formData.avatar ? (
                <img src={formData.avatar} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <Camera className="w-8 h-8 text-foreground/20" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload className="w-6 h-6 text-foreground" />
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
          </div>

          <Input 
            label="Họ và tên" 
            value={formData.name} 
            error={errors.name}
            onChange={e => {
              setFormData({...formData, name: e.target.value});
              if (errors.name) setErrors({...errors, name: ''});
            }} 
          />
          <Input 
            label="Mã học sinh (ID)" 
            value={formData.studentCode} 
            error={errors.studentCode}
            onChange={e => {
              setFormData({...formData, studentCode: e.target.value});
              if (errors.studentCode) setErrors({...errors, studentCode: ''});
            }} 
          />
          <Input 
            label="Lớp hành chính" 
            type="select"
            error={errors.classId}
            options={[
              { value: '', label: 'Chọn lớp...' },
              ...(classes?.map(c => ({ value: c.id!.toString(), label: c.name })) || [])
            ]}
            value={formData.classId}
            onChange={e => {
              setFormData({...formData, classId: e.target.value});
              if (errors.classId) setErrors({...errors, classId: ''});
            }}
          />
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" className="flex-1">
              {editingId ? "Cập Nhật" : "Lưu Thông Tin"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
