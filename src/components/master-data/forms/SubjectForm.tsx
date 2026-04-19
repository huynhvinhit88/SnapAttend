import React, { useState, useEffect } from 'react';
import { db } from '../../../db/db';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

interface SubjectFormProps {
  editingId?: number | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const SubjectForm: React.FC<SubjectFormProps> = ({ editingId, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    credits: 0
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingId) {
      db.subjects.get(editingId).then(subject => {
        if (subject) {
          setFormData({
            name: subject.name,
            code: subject.code,
            credits: subject.credits
          });
        }
      });
    }
  }, [editingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập tên môn học';
    if (!formData.code.trim()) newErrors.code = 'Vui lòng nhập mã môn học';
    if (formData.credits < 0) newErrors.credits = 'Số tín chỉ không hợp lệ';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await db.subjects.update(editingId, {
          ...formData,
          credits: parseInt(formData.credits.toString())
        });
      } else {
        await db.subjects.add({
          name: formData.name.trim(),
          code: formData.code.trim(),
          credits: parseInt(formData.credits.toString()),
          createdAt: Date.now()
        });
      }
      onSuccess();
    } catch (error) {
      console.error('Lỗi khi lưu môn học:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4 pt-2">
      <Input 
        label="Tên môn học" 
        value={formData.name} 
        error={errors.name}
        onChange={e => {
          setFormData({...formData, name: e.target.value});
          if (errors.name) setErrors({...errors, name: ''});
        }} 
      />
      <Input 
        label="Mã môn học" 
        value={formData.code} 
        error={errors.code}
        onChange={e => {
          setFormData({...formData, code: e.target.value});
          if (errors.code) setErrors({...errors, code: ''});
        }} 
      />
      <Input 
        label="Số tín chỉ / Tiết học" 
        type="number" 
        value={formData.credits} 
        error={errors.credits}
        onChange={e => {
          setFormData({...formData, credits: parseInt(e.target.value) || 0});
          if (errors.credits) setErrors({...errors, credits: ''});
        }} 
      />
      
      <div className="flex gap-3 pt-6">
        <Button type="button" variant="secondary" className="flex-1 h-12 rounded-2xl" onClick={onCancel}>Hủy</Button>
        <Button type="submit" className="flex-1 h-12 rounded-2xl shadow-lg shadow-primary/20" loading={isSubmitting}>
          {editingId ? "Cập Nhật" : "Lưu Môn Học"}
        </Button>
      </div>
    </form>
  );
};
