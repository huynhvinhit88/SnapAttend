import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Database, Trash2, Search, UserPlus, Users, Pencil } from 'lucide-react';
import { db } from '../db/db';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { motion } from 'framer-motion';
import { useFilter } from '../context/FilterContext';

export const Sections = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isViewStudentsModalOpen, setIsViewStudentsModalOpen] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  
  const { filters, updateFilter } = useFilter();
  const { searchTerm } = filters.sections;
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const currentYear = new Date().getFullYear();
  const defaultYear = `${currentYear}-${currentYear + 1}`;

  const [formData, setFormData] = useState({
    name: '',
    subjectId: '',
    teacherId: '',
    semester: 'Học kỳ 1',
    schoolYear: defaultYear
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sections = useLiveQuery(() => db.sections.toArray());
  const subjects = useLiveQuery(() => db.subjects.toArray());
  const teachers = useLiveQuery(() => db.teachers.toArray());
  const students = useLiveQuery(() => db.students.toArray());
  const enrollments = useLiveQuery(() => db.enrollments.toArray());
  const classes = useLiveQuery(() => db.classes.toArray());

  const handleAddSection = async (e: React.FormEvent) => {
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

      setFormData({ 
        name: '', 
        subjectId: '', 
        teacherId: '', 
        semester: 'Học kỳ 1', 
        schoolYear: defaultYear 
      });
      setErrors({});
      setEditingId(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Lỗi lưu lớp học tập:', error);
      alert('Không thể lưu lớp học phần. Vui lòng thử lại!');
    }
  };

  const handleEditSection = (section: any) => {
    setFormData({
      name: section.name,
      subjectId: section.subjectId.toString(),
      teacherId: section.teacherId.toString(),
      semester: section.semester,
      schoolYear: section.schoolYear,
    });
    setEditingId(section.id);
    setIsModalOpen(true);
  };

  const handleMapStudents = async (studentIds: number[]) => {
    if (!selectedSectionId) return;
    
    // Thêm những học sinh chưa có trong danh sách ghi danh
    const existingEnrollments = enrollments?.filter(e => e.sectionId === selectedSectionId) || [];
    const existingStudentIds = existingEnrollments.map(e => e.studentId);
    
    const newStudentIds = studentIds.filter(id => !existingStudentIds.includes(id));
    
    if (newStudentIds.length === 0) return;

    for (const studentId of newStudentIds) {
      await db.enrollments.add({
        sectionId: selectedSectionId,
        studentId,
        createdAt: Date.now()
      });
    }
    // Form không tự động đóng để người dùng có thể thêm nhiều học sinh liên tục
  };

  const handleUnenrollStudent = async (enrollmentId: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa học sinh này khỏi lớp học phần?')) {
      await db.enrollments.delete(enrollmentId);
    }
  };

  const handleDeleteSection = async (id: number) => {
    if (confirm('Xóa lớp học phần này sẽ xóa toàn bộ danh sách điểm danh liên quan?')) {
      await db.sections.delete(id);
      await db.enrollments.where('sectionId').equals(id).delete();
    }
  };

  const filteredSections = sections?.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Lớp học phần</h1>
          <p className="text-white/50">Quản lý nhóm học sinh đăng ký theo từng môn học.</p>
        </div>
        <Button onClick={() => {
          setEditingId(null);
          setFormData({ name: '', subjectId: '', teacherId: '', semester: 'Học kỳ 1', schoolYear: defaultYear });
          setIsModalOpen(true);
        }}>
          <Plus className="w-5 h-5" />
          Tạo Lớp Học Phần
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
        <Input 
          className="pl-12" 
          placeholder="Tìm kiếm lớp học phần..." 
          value={searchTerm} 
          onChange={e => updateFilter('sections', { searchTerm: e.target.value })} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSections?.map((item, index) => {
          const subject = subjects?.find(s => s.id === item.subjectId);
          const teacher = teachers?.find(t => t.id === item.teacherId);
          
          // Chỉ đếm những học sinh thực sự còn tồn tại trong bảng students
          const sectionEnrollments = enrollments?.filter(e => e.sectionId === item.id) || [];
          const studentCount = sectionEnrollments.filter(e => 
            students?.some(s => s.id === e.studentId)
          ).length;

          return (
            <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <Card className="relative group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                    <Database className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" className="p-2 text-primary hover:bg-primary/10" title="Sửa" onClick={() => handleEditSection(item)}>
                      <Pencil className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" className="p-2 text-primary hover:bg-primary/10" title="Xem danh sách" onClick={() => { setSelectedSectionId(item.id!); setIsViewStudentsModalOpen(true); }}>
                      <Users className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" className="p-2 text-primary hover:bg-primary/10" title="Ghi danh" onClick={() => { setSelectedSectionId(item.id!); setIsMapModalOpen(true); }}>
                      <UserPlus className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" className="p-2 text-red-500 hover:bg-red-500/10" title="Xóa" onClick={() => handleDeleteSection(item.id!)}>
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-1">{item.name}</h3>
                <p className="text-white/60 text-sm mb-4">{subject?.name} • {teacher?.name}</p>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 text-white/40 text-xs font-bold uppercase tracking-wider">
                    <Users className="w-4 h-4" />
                    {studentCount} Học sinh
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-white/30">{item.semester}</span>
                    <span className="text-[10px] text-white/20 font-bold">{item.schoolYear}</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Modal Tạo/Sửa Lớp Học Phần */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? "Sửa Lớp Học Phần" : "Tạo Lớp Học Phần"}
      >
        <form noValidate onSubmit={handleAddSection} className="space-y-4">
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
            label="Môn học" type="select" 
            error={errors.subjectId}
            options={[{ value: '', label: 'Chọn môn học...' }, ...(subjects?.map(s => ({ value: s.id!.toString(), label: s.name })) || [])]}
            value={formData.subjectId} 
            onChange={e => {
              setFormData({...formData, subjectId: e.target.value});
              if (errors.subjectId) setErrors({...errors, subjectId: ''});
            }}
          />
          <Input 
            label="Giáo viên phụ trách" type="select" 
            error={errors.teacherId}
            options={[{ value: '', label: 'Chọn giáo viên...' }, ...(teachers?.map(t => ({ value: t.id!.toString(), label: t.name })) || [])]}
            value={formData.teacherId} 
            onChange={e => {
              setFormData({...formData, teacherId: e.target.value});
              if (errors.teacherId) setErrors({...errors, teacherId: ''});
            }}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Học kỳ" value={formData.semester} onChange={e => setFormData({...formData, semester: e.target.value})} />
            <Input label="Năm học" value={formData.schoolYear} onChange={e => setFormData({...formData, schoolYear: e.target.value})} />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" className="flex-1">
              {editingId ? "Cập Nhật" : "Tạo Lớp"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Mapping Học Sinh */}
      <Modal 
        isOpen={isMapModalOpen} 
        onClose={() => { setIsMapModalOpen(false); setClassSearchTerm(''); }} 
        title="Ghi danh học sinh"
      >
        <div className="space-y-6">
          <p className="text-white/60 text-sm italic border-l-2 border-primary pl-3">Chọn học sinh tham gia lớp học phần này. Bạn có thể chọn nhanh theo lớp hành chính.</p>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input 
              className="pl-10 h-10 text-sm" 
              placeholder="Tìm kiếm lớp hành chính..." 
              value={classSearchTerm}
              onChange={e => setClassSearchTerm(e.target.value)}
            />
          </div>

          <div className="max-h-[400px] overflow-auto space-y-4 pr-2 custom-scrollbar">
            {classes?.filter(cls => 
              cls.name.toLowerCase().includes(classSearchTerm.toLowerCase())
            ).map(cls => {
              const classStudents = students?.filter(s => s.classId === cls.id) || [];
              if (classStudents.length === 0) return null;
              
              return (
                <div key={cls.id} className="space-y-2">
                  <div className="flex items-center justify-between sticky top-0 bg-background-light py-2 border-b border-white/5 z-10">
                    <span className="text-sm font-bold text-primary uppercase tracking-wider">{cls.name}</span>
                    <Button 
                      variant="ghost" className="text-xs h-8 hover:bg-primary/10"
                      onClick={() => handleMapStudents(classStudents.map(s => s.id!))}
                    >
                      Ghi danh cả lớp
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {classStudents.map(s => {
                      const isEnrolled = enrollments?.some(e => e.sectionId === selectedSectionId && e.studentId === s.id);
                      return (
                        <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                          <span className="text-white/80">{s.name} <span className="text-xs text-white/30 ml-2">({s.studentCode})</span></span>
                          {isEnrolled ? (
                            <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider bg-green-500/10 px-2 py-1 rounded-full">Đã ghi danh</span>
                          ) : (
                            <Button variant="ghost" className="h-8 text-xs text-primary" onClick={() => handleMapStudents([s.id!])}>+ Thêm</Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Hiển thị học sinh mồ côi (không thuộc lớp nào hoặc lớp đã bị xóa) */}
            {(() => {
              const classIds = classes?.map(c => c.id) || [];
              const unassignedStudents = students?.filter(s => !s.classId || !classIds.includes(s.classId)) || [];
              const unassignedTitle = "Chưa xác định lớp";
              
              if (unassignedStudents.length === 0) return null;
              
              // Chỉ hiển thị nhóm này nếu không tìm kiếm hoặc tên nhóm khớp với từ khóa
              if (classSearchTerm && !unassignedTitle.toLowerCase().includes(classSearchTerm.toLowerCase())) {
                return null;
              }

              return (
                <div className="space-y-2 pt-4">
                  <div className="flex items-center justify-between sticky top-0 bg-background-light py-2 border-b border-white/5 z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-yellow-500 uppercase tracking-wider">{unassignedTitle}</span>
                      <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full font-bold">Lưu ý</span>
                    </div>
                    <Button 
                      variant="ghost" className="text-xs h-8 hover:bg-yellow-500/10 text-yellow-500"
                      onClick={() => handleMapStudents(unassignedStudents.map(s => s.id!))}
                    >
                      Ghi danh cả nhóm
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {unassignedStudents.map(s => {
                      const isEnrolled = enrollments?.some(e => e.sectionId === selectedSectionId && e.studentId === s.id);
                      return (
                        <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-dashed border-white/10 hover:border-white/20 transition-colors">
                          <span className="text-white/80">{s.name} <span className="text-xs text-white/30 ml-2">({s.studentCode})</span></span>
                          {isEnrolled ? (
                            <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider bg-green-500/10 px-2 py-1 rounded-full">Đã ghi danh</span>
                          ) : (
                            <Button variant="ghost" className="h-8 text-xs text-primary" onClick={() => handleMapStudents([s.id!])}>+ Thêm</Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="pt-4 border-t border-white/10">
            <Button className="w-full" onClick={() => setIsMapModalOpen(false)}>
              Hoàn tất ghi danh
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Xem Danh Sách Học Sinh */}
      <Modal isOpen={isViewStudentsModalOpen} onClose={() => setIsViewStudentsModalOpen(false)} title="Danh sách học sinh của lớp">
        <div className="space-y-4">
          <div className="max-h-[450px] overflow-auto space-y-2 pr-2 custom-scrollbar">
            {enrollments?.filter(e => e.sectionId === selectedSectionId).map((enrollment) => {
              const student = students?.find(s => s.id === enrollment.studentId);
              if (!student) return null;

              return (
                <div key={enrollment.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{student.name}</p>
                      <p className="text-white/40 text-[10px] font-bold uppercase">{student.studentCode}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    className="p-2 text-red-500/30 group-hover:text-red-500 hover:bg-red-500/10 transition-all"
                    onClick={() => handleUnenrollStudent(enrollment.id!)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
            
            {enrollments?.filter(e => e.sectionId === selectedSectionId).length === 0 && (
              <div className="text-center py-10">
                <Users className="w-12 h-12 text-white/5 mx-auto mb-3" />
                <p className="text-white/40 text-sm italic">Lớp học phần này chưa có học sinh nào.</p>
              </div>
            )}
          </div>
          <div className="pt-4 border-t border-white/10">
            <Button variant="secondary" className="w-full" onClick={() => setIsViewStudentsModalOpen(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
