import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2, Search, Camera, Upload, Pencil, Users, School } from 'lucide-react';
import { db } from '../db/db';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { imageService } from '../services/image.service';
import { motion } from 'framer-motion';
import { useFilter } from '../context/FilterContext';

import { PageHeader } from '../components/ui/PageHeader';

export const Students = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { filters, updateFilter } = useFilter();
  const { searchTerm } = filters.students;
  const [editingId, setEditingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    studentCode: '',
    classId: '',
    avatar: '' as string | undefined,
    academicYear: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const classes = useLiveQuery(() => db.classes.toArray());
  const students = useLiveQuery(() => db.students.toArray());
  const classesCount = useLiveQuery(() => db.classes.count());

  // Tự động điền niên khóa của lớp khi lớp được chọn
  useEffect(() => {
    if (formData.classId && !editingId) {
      const selectedClass = classes?.find(c => c.id === parseInt(formData.classId));
      if (selectedClass) {
        setFormData(prev => ({ ...prev, academicYear: selectedClass.academicYear }));
      }
    }
  }, [formData.classId, classes, editingId]);

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
        academicYear: formData.academicYear.trim() || undefined,
      };

      if (editingId) {
        await db.students.update(editingId, data);
      } else {
        await db.students.add({
          ...data,
          createdAt: Date.now()
        });
      }

      setFormData({ name: '', studentCode: '', classId: '', avatar: '', academicYear: '' });
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
      avatar: student.avatar || '',
      academicYear: student.academicYear || ''
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
      <PageHeader
        title="Học sinh"
        description="Danh sách học sinh chính thức theo từng lớp học."
        icon={<Users className="w-8 h-8" />}
        breadcrumbs={[
          { label: 'Trang chủ' },
          { label: 'Học tập', active: true }
        ]}
        stats={[
          { label: 'Tổng số học sinh', value: students?.length || 0, icon: Users },
          { label: 'Số lớp hành chính', value: classesCount || 0, icon: School, color: 'text-accent' },
        ]}
      >
        <Button onClick={() => {
          setEditingId(null);
          setFormData({ name: '', studentCode: '', classId: '', avatar: '', academicYear: '' });
          setIsModalOpen(true);
        }}>
          <Plus className="w-5 h-5" />
          Thêm Học Sinh
        </Button>
      </PageHeader>

      {/* Search & Filter Card */}
      <Card className="flex flex-col md:flex-row items-end gap-6 relative overflow-hidden p-6 border-none shadow-none">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
        
        <div className="flex-1 w-full relative z-10">
          <Input 
            label="Tìm kiếm học sinh"
            placeholder="Tìm theo tên, mã HS, tên lớp hoặc niên khóa..." 
            icon={<Search className="w-4 h-4" />}
            className="h-12"
            value={searchTerm}
            onChange={(e) => updateFilter('students', { searchTerm: e.target.value })}
          />
        </div>
        
      </Card>

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
                <div className="absolute top-2 right-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex gap-2">
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
          <Input 
            label="Niên khóa (Tự do)" 
            placeholder="VD: K15, 2021-2025..."
            value={formData.academicYear}
            onChange={e => setFormData({...formData, academicYear: e.target.value})}
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
