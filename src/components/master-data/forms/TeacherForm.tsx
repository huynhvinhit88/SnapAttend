import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/db';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

interface TeacherFormProps {
  editingId?: number | null;
  initialDepartment?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const TeacherForm: React.FC<TeacherFormProps> = ({ 
  editingId, 
  initialDepartment,
  onSuccess, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    teacherCode: '',
    department: initialDepartment || '',
    avatar: '' as string | undefined
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subjects = useLiveQuery(() => db.subjects.toArray());

  useEffect(() => {
    if (editingId) {
      db.teachers.get(editingId).then(teacher => {
        if (teacher) {
          setFormData({
            name: teacher.name,
            teacherCode: teacher.teacherCode,
            department: teacher.department || '',
            avatar: teacher.avatar
          });
        }
      });
    } else if (initialDepartment) {
      setFormData(prev => ({ ...prev, department: initialDepartment }));
    }
  }, [editingId, initialDepartment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập họ tên';
    if (!formData.teacherCode.trim()) newErrors.teacherCode = 'Vui lòng nhập mã giáo viên';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        name: formData.name.trim(),
        teacherCode: formData.teacherCode.trim(),
        department: formData.department.trim(),
        avatar: formData.avatar
      };

      if (editingId) {
        await db.teachers.update(editingId, data);
      } else {
        await db.teachers.add({
          ...data,
          createdAt: Date.now()
        });
      }
      onSuccess();
    } catch (error) {
      console.error('Lỗi khi lưu giáo viên:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4 pt-2">
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
        type="select"
        options={[
          { value: '', label: 'Chọn bộ môn...' },
          ...(subjects?.map(s => ({ value: s.name, label: s.name })) || [])
        ]}
        value={formData.department}
        onChange={(e) => setFormData({...formData, department: e.target.value})}
      />
      
      <div className="flex gap-3 pt-6">
        <Button type="button" variant="secondary" className="flex-1 h-12 rounded-2xl" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit" className="flex-1 h-12 rounded-2xl shadow-lg shadow-primary/20" isLoading={isSubmitting}>
          {editingId ? "Cập Nhật" : "Lưu Giáo Viên"}
        </Button>
      </div>
    </form>
  );
};
