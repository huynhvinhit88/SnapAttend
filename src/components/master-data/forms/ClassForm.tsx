import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/db';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

interface ClassFormProps {
  editingId?: number | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ClassForm: React.FC<ClassFormProps> = ({ editingId, onSuccess, onCancel }) => {
  const academicYears = useLiveQuery(() => db.academicYears.toArray());
  const defaultYear = useMemo(() => academicYears?.find(y => y.isDefault)?.name || '', [academicYears]);

  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    academicYear: '',
    major: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingId) {
      db.classes.get(editingId).then(item => {
        if (item) {
          setFormData({
            name: item.name,
            grade: item.grade,
            academicYear: item.academicYear,
            major: item.major || ''
          });
        }
      });
    } else if (defaultYear) {
      setFormData(prev => ({ ...prev, academicYear: defaultYear }));
    }
  }, [editingId, defaultYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập tên lớp';
    if (!formData.grade.trim()) newErrors.grade = 'Vui lòng chọn khối';
    if (!formData.academicYear.trim()) newErrors.academicYear = 'Vui lòng nhập niên khóa';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
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
      onSuccess();
    } catch (error) {
      console.error('Lỗi khi lưu lớp học:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4 pt-2">
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
        label="Năm học" 
        type="select"
        error={errors.academicYear}
        options={[
          { value: '', label: 'Chọn năm học...' },
          ...(academicYears?.map(y => ({ value: y.name, label: y.name })) || [])
        ]}
        value={formData.academicYear}
        onChange={(e) => {
          setFormData({...formData, academicYear: e.target.value});
          if (errors.academicYear) setErrors({...errors, academicYear: ''});
        }}
      />
      <div className="flex gap-3 pt-6">
        <Button type="button" variant="secondary" className="flex-1 h-12 rounded-2xl" onClick={onCancel}>
          Hủy bỏ
        </Button>
        <Button type="submit" className="flex-1 h-12 rounded-2xl shadow-lg shadow-primary/20" loading={isSubmitting}>
          {editingId ? "Lưu thay đổi" : "Tạo Lớp Học"}
        </Button>
      </div>
    </form>
  );
};
