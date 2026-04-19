import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/db';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

interface SectionFormProps {
  editingId?: number | null;
  initialSubjectId?: number | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const SectionForm = ({ editingId, initialSubjectId, onSuccess, onCancel }: SectionFormProps) => {
  const academicYears = useLiveQuery(() => db.academicYears.toArray());
  const subjects = useLiveQuery(() => db.subjects.toArray());
  const teachers = useLiveQuery(() => db.teachers.toArray());
  
  const defaultYear = useMemo(() => 
    academicYears?.find(y => y.isDefault)?.name || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    [academicYears]
  );

  const [formData, setFormData] = useState({
    name: '',
    subjectId: '',
    teacherId: '',
    semester: 'Học kỳ 1',
    schoolYear: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data
  useEffect(() => {
    const initForm = async () => {
      if (editingId) {
        const section = await db.sections.get(editingId);
        if (section) {
          setFormData({
            name: section.name,
            subjectId: section.subjectId.toString(),
            teacherId: section.teacherId.toString(),
            semester: section.semester,
            schoolYear: section.schoolYear,
          });
        }
      } else {
        setFormData(prev => ({
          ...prev,
          subjectId: initialSubjectId ? initialSubjectId.toString() : '',
          schoolYear: defaultYear || ''
        }));
      }
    };
    initForm();
  }, [editingId, initialSubjectId, defaultYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập tên lớp học phần';
    if (!formData.subjectId) newErrors.subjectId = 'Vui lòng chọn môn học';
    if (!formData.teacherId) newErrors.teacherId = 'Vui lòng chọn giáo viên';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      const data = {
        name: formData.name.trim(),
        subjectId: parseInt(formData.subjectId),
        teacherId: parseInt(formData.teacherId),
        semester: formData.semester,
        schoolYear: formData.schoolYear,
      };

      if (editingId) {
        await db.sections.update(editingId, data);
      } else {
        await db.sections.add({
          ...data,
          createdAt: Date.now()
        });
      }
      onSuccess();
    } catch (error) {
      console.error('Lỗi lưu lớp học tập:', error);
      alert('Không thể lưu lớp học phần. Vui lòng thử lại!');
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-6 pt-4">
      <Input 
        label="Tên gợi nhớ (VD: Toán 10A1 - Thầy Nam)" 
        value={formData.name} 
        error={errors.name}
        onChange={e => {
          setFormData({...formData, name: e.target.value});
          if (errors.name) setErrors({...errors, name: ''});
        }} 
      />
      
      <Input 
        label="Môn học giảng dạy" 
        type="select" 
        error={errors.subjectId}
        options={[
          { value: '', label: 'Chọn môn học...' },
          ...(subjects?.map(s => ({ value: s.id!.toString(), label: s.name })) || [])
        ]}
        value={formData.subjectId} 
        onChange={e => {
          setFormData({...formData, subjectId: e.target.value, teacherId: ''});
          if (errors.subjectId) setErrors({...errors, subjectId: ''});
        }}
      />
      
      <Input 
        label="Giáo viên phụ trách" 
        type="select" 
        error={errors.teacherId}
        options={[
          { value: '', label: 'Chọn giáo viên...' },
          ...(teachers?.filter(t => {
            const selectedSubject = subjects?.find(s => s.id === parseInt(formData.subjectId));
            return !formData.subjectId || t.department === selectedSubject?.name;
          }).map(t => ({ value: t.id!.toString(), label: t.name })) || [])
        ]}
        value={formData.teacherId} 
        onChange={e => {
          setFormData({...formData, teacherId: e.target.value});
          if (errors.teacherId) setErrors({...errors, teacherId: ''});
        }}
      />
      
      <div className="grid grid-cols-2 gap-4">
        <Input 
          label="Học kỳ" 
          value={formData.semester} 
          onChange={e => setFormData({...formData, semester: e.target.value})} 
        />
        <Input 
          label="Năm học" 
          type="select"
          options={[
            { value: '', label: 'Chọn năm học...' },
            ...(academicYears?.map(y => ({ value: y.name, label: y.name })) || [])
          ]}
          value={formData.schoolYear} 
          onChange={e => setFormData({...formData, schoolYear: e.target.value})} 
        />
      </div>
      
      <div className="flex gap-4 pt-6">
        <Button type="button" variant="secondary" className="flex-1 h-12 rounded-2xl" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit" className="flex-1 h-12 rounded-2xl shadow-lg shadow-primary/20">
          {editingId ? "Cập Nhật" : "Hoàn Tất Tạo Lớp"}
        </Button>
      </div>
    </form>
  );
};
