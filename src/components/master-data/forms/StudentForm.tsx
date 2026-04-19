import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Camera, Upload } from 'lucide-react';
import { db } from '../../../db/db';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { imageService } from '../../../services/image.service';

interface StudentFormProps {
  editingId?: number | null;
  initialClassId?: number | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const StudentForm: React.FC<StudentFormProps> = ({ 
  editingId, 
  initialClassId,
  onSuccess, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    studentCode: '',
    classId: initialClassId ? initialClassId.toString() : '',
    avatar: '' as string | undefined,
    academicYear: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const classes = useLiveQuery(() => db.classes.toArray());

  useEffect(() => {
    if (editingId) {
      db.students.get(editingId).then(student => {
        if (student) {
          setFormData({
            name: student.name,
            studentCode: student.studentCode,
            classId: student.classId.toString(),
            avatar: student.avatar || '',
            academicYear: student.academicYear || ''
          });
        }
      });
    } else if (initialClassId) {
      setFormData(prev => ({ ...prev, classId: initialClassId.toString() }));
    }
  }, [editingId, initialClassId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await imageService.compressImage(file);
      setFormData({ ...formData, avatar: compressed });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập họ và tên';
    if (!formData.studentCode.trim()) newErrors.studentCode = 'Vui lòng nhập mã học sinh';
    if (!formData.classId) newErrors.classId = 'Vui lòng chọn lớp học';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
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
      onSuccess();
    } catch (error) {
      console.error('Lỗi lưu học sinh:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4 pt-2">
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
      
      <div className="flex gap-3 pt-6">
        <Button type="button" variant="secondary" className="flex-1 h-12 rounded-2xl" onClick={onCancel}>Hủy</Button>
        <Button type="submit" className="flex-1 h-12 rounded-2xl shadow-lg shadow-primary/20" loading={isSubmitting}>
          {editingId ? "Cập Nhật" : "Lưu Thông Tin"}
        </Button>
      </div>
    </form>
  );
};
