import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Plus, Database, Trash2, Search, UserPlus, 
  Users, Pencil, Layers 
} from 'lucide-react';
import { db } from '../db/db';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { motion } from 'framer-motion';
import { useFilter } from '../context/FilterContext';
import { PageHeader } from '../components/ui/PageHeader';
import { BookOpen } from 'lucide-react';

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
  const sectionCount = useLiveQuery(() => db.sections.count());
  const subjectCount = useLiveQuery(() => db.subjects.count());
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
    <div className="space-y-8 pb-20">
      <PageHeader
        title="Lớp học phần"
        description="Quản lý nhóm học sinh đăng ký theo từng môn học và khóa đào tạo cụ thể."
        icon={<Layers className="w-8 h-8" />}
        breadcrumbs={[
          { label: 'Trang chủ' },
          { label: 'Đào tạo', active: true }
        ]}
        stats={[
          { label: 'Tổng lớp HP', value: sectionCount || 0, icon: Layers },
          { label: 'Tổng số môn học', value: subjectCount || 0, icon: BookOpen, color: 'text-primary' },
        ]}
      >
        <Button onClick={() => {
          setEditingId(null);
          setFormData({ name: '', subjectId: '', teacherId: '', semester: 'Học kỳ 1', schoolYear: defaultYear });
          setErrors({});
          setIsModalOpen(true);
        }}>
          <Plus className="w-5 h-5" />
          Thêm Lớp HP
        </Button>
      </PageHeader>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/30 group-focus-within:text-primary transition-colors" />
        <Input 
          className="pl-12 h-14 bg-background-light/50 backdrop-blur-xl border-foreground/10 focus:border-primary/50 shadow-inner" 
          placeholder="Tìm kiếm theo tên lớp học phần hoặc mã môn..." 
          value={searchTerm} 
          onChange={e => updateFilter('sections', { searchTerm: e.target.value })} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSections?.map((item, index) => {
          const subject = subjects?.find(s => s.id === item.subjectId);
          const teacher = teachers?.find(t => t.id === item.teacherId);
          
          const sectionEnrollments = enrollments?.filter(e => e.sectionId === item.id) || [];
          const studentCount = sectionEnrollments.filter(e => 
            students?.some(s => s.id === e.studentId)
          ).length;

          return (
            <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }}>
              <Card className="relative group overflow-hidden hover:border-primary/30 transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                    <Database className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button variant="ghost" className="p-2 w-9 h-9 rounded-xl text-primary hover:bg-primary/10" title="Sửa" onClick={() => handleEditSection(item)}>
                      <Pencil className="w-4.5 h-4.5" />
                    </Button>
                    <Button variant="ghost" className="p-2 w-9 h-9 rounded-xl text-primary hover:bg-primary/10" title="Xem danh sách" onClick={() => { setSelectedSectionId(item.id!); setIsViewStudentsModalOpen(true); }}>
                      <Users className="w-4.5 h-4.5" />
                    </Button>
                    <Button variant="ghost" className="p-2 w-9 h-9 rounded-xl text-primary hover:bg-primary/10" title="Ghi danh" onClick={() => { setSelectedSectionId(item.id!); setIsMapModalOpen(true); }}>
                      <UserPlus className="w-4.5 h-4.5" />
                    </Button>
                    <Button variant="ghost" className="p-2 w-9 h-9 rounded-xl text-red-500 hover:bg-red-500/10" title="Xóa" onClick={() => handleDeleteSection(item.id!)}>
                      <Trash2 className="w-4.5 h-4.5" />
                    </Button>
                  </div>
                </div>

                <h3 className="text-xl font-black text-foreground mb-1 mt-2">{item.name}</h3>
                <p className="text-primary text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                  {subject?.name} <span className="text-foreground/20">•</span> {teacher?.name}
                </p>

                <div className="mt-8 pt-6 border-t border-foreground/5 flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-foreground/5 px-3 py-1.5 rounded-xl border border-foreground/5">
                    <Users className="w-4 h-4 text-foreground/40" />
                    <span className="text-xs font-black text-foreground/60 tracking-tight">{studentCount} Học sinh</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-foreground/30 font-black uppercase tracking-widest">{item.semester}</p>
                    <p className="text-[10px] text-primary font-bold">{item.schoolYear}</p>
                  </div>
                </div>
                
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              </Card>
            </motion.div>
          );
        })}
      </div>

      {filteredSections?.length === 0 && (
        <div className="text-center py-24 px-4 bg-background-light/30 backdrop-blur-3xl rounded-[3rem] border border-dashed border-foreground/10">
          <Layers className="w-20 h-20 text-foreground/5 mx-auto mb-6" />
          <p className="text-foreground/40 font-bold text-lg">Hệ thống chưa ghi nhận lớp học phần nào.</p>
          <Button variant="ghost" className="mt-4 text-primary hover:bg-primary/5" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Tạo Lớp Bây Giờ
          </Button>
        </div>
      )}

      {/* Modal Tạo/Sửa Lớp Học Phần */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? "Cập nhật Lớp Học Phần" : "Thiết lập Lớp Học Phần Mới"}
      >
        <form noValidate onSubmit={handleAddSection} className="space-y-6 pt-4">
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
            label="Môn học giảng dạy" type="select" 
            error={errors.subjectId}
            options={[{ value: '', label: 'Chọn môn học...' }, ...(subjects?.map(s => ({ value: s.id!.toString(), label: s.name })) || [])]}
            value={formData.subjectId} 
            onChange={e => {
              setFormData({...formData, subjectId: e.target.value, teacherId: ''});
              if (errors.subjectId) setErrors({...errors, subjectId: ''});
            }}
          />
          <Input 
            label="Giáo viên phụ trách" type="select" 
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
            <Input label="Học kỳ" value={formData.semester} onChange={e => setFormData({...formData, semester: e.target.value})} />
            <Input label="Năm học" value={formData.schoolYear} onChange={e => setFormData({...formData, schoolYear: e.target.value})} />
          </div>
          <div className="flex gap-4 pt-6">
            <Button type="button" variant="secondary" className="flex-1 h-12 rounded-2xl" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" className="flex-1 h-12 rounded-2xl shadow-lg shadow-primary/20">
              {editingId ? "Cập Nhật" : "Hoàn Tất Tạo Lớp"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Ghi Danh Học Sinh (Mapping) */}
      <Modal 
        isOpen={isMapModalOpen} 
        onClose={() => { setIsMapModalOpen(false); setClassSearchTerm(''); }} 
        title="Ghi danh học viên"
      >
        <div className="space-y-6 pt-2">
          <p className="text-foreground/50 text-xs font-medium leading-relaxed border-l-2 border-primary pl-4 py-1 bg-primary/5 rounded-r-lg">
            Bạn có thể ghi danh lẻ từng học viên hoặc chọn 'Ghi danh cả lớp' để thêm nhanh toàn bộ sỹ số từ các lớp hành chính.
          </p>
          
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30 group-focus-within:text-primary transition-colors" />
            <Input 
              className="pl-10 h-11 bg-background-light border-foreground/10 shadow-inner text-sm" 
              placeholder="Tìm kiếm lớp hành chính..." 
              value={classSearchTerm}
              onChange={e => setClassSearchTerm(e.target.value)}
            />
          </div>

          <div className="max-h-[450px] overflow-auto space-y-6 pr-2 custom-scrollbar">
            {classes?.filter(cls => 
              cls.name.toLowerCase().includes(classSearchTerm.toLowerCase())
            ).map(cls => {
              const classStudents = students?.filter(s => s.classId === cls.id) || [];
              if (classStudents.length === 0) return null;
              
              return (
                <div key={cls.id} className="space-y-3">
                  <div className="flex items-center justify-between sticky top-0 bg-background-light/95 backdrop-blur-md py-2.5 px-3 rounded-xl border border-foreground/5 z-10 shadow-sm">
                    <span className="text-xs font-black text-primary uppercase tracking-widest">{cls.name}</span>
                    <Button 
                      variant="ghost" className="text-[10px] h-7 font-black uppercase tracking-widest px-3 hover:bg-primary/10 rounded-lg"
                      onClick={() => handleMapStudents(classStudents.map(s => s.id!))}
                    >
                      Ghi danh cả lớp
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 pl-2">
                    {classStudents.map(s => {
                      const isEnrolled = enrollments?.some(e => e.sectionId === selectedSectionId && e.studentId === s.id);
                      return (
                        <div key={s.id} className="flex items-center justify-between p-3 rounded-2xl bg-foreground/5 border border-transparent hover:border-foreground/10 transition-all group/std">
                          <span className="text-sm font-bold text-foreground/80 group-hover/std:text-foreground">
                            {s.name} <span className="text-[10px] text-foreground/30 ml-2 font-black">#{s.studentCode}</span>
                          </span>
                          {isEnrolled ? (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 rounded-full">
                              <div className="w-1 h-1 rounded-full bg-green-500" />
                              <span className="text-[10px] text-green-500 font-black uppercase tracking-widest">Ghi danh xong</span>
                            </div>
                          ) : (
                            <Button variant="ghost" className="h-8 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 px-3 rounded-lg" onClick={() => handleMapStudents([s.id!])}>+ Thêm</Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Nhóm học sinh tự do */}
            {(() => {
              const classIds = classes?.map(c => c.id) || [];
              const unassignedStudents = students?.filter(s => !s.classId || !classIds.includes(s.classId)) || [];
              const unassignedTitle = "Học viên tự do";
              
              if (unassignedStudents.length === 0) return null;
              if (classSearchTerm && !unassignedTitle.toLowerCase().includes(classSearchTerm.toLowerCase())) return null;

              return (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between sticky top-0 bg-background-light/95 backdrop-blur-md py-2.5 px-3 rounded-xl border border-yellow-500/10 z-10 shadow-sm">
                    <span className="text-xs font-black text-yellow-500 uppercase tracking-widest">{unassignedTitle}</span>
                    <Button 
                      variant="ghost" className="text-[10px] h-7 font-black uppercase tracking-widest px-3 hover:bg-yellow-500/10 text-yellow-500 rounded-lg"
                      onClick={() => handleMapStudents(unassignedStudents.map(s => s.id!))}
                    >
                      Thêm tất cả
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 pl-2">
                    {unassignedStudents.map(s => {
                      const isEnrolled = enrollments?.some(e => e.sectionId === selectedSectionId && e.studentId === s.id);
                      return (
                        <div key={s.id} className="flex items-center justify-between p-3 rounded-2xl bg-yellow-500/5 border border-dashed border-yellow-500/10 hover:border-yellow-500/30 transition-all">
                          <span className="text-sm font-bold text-foreground/80">{s.name} <span className="text-[10px] text-foreground/30 ml-2 font-black">#{s.studentCode}</span></span>
                          {isEnrolled ? (
                            <CheckIcon className="w-4 h-4 text-green-500" />
                          ) : (
                            <Button variant="ghost" className="h-8 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 px-3 rounded-lg" onClick={() => handleMapStudents([s.id!])}>+ Thêm</Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="pt-6 border-t border-foreground/5">
            <Button className="w-full h-12 rounded-2xl shadow-xl shadow-primary/10" onClick={() => setIsMapModalOpen(false)}>
              Hoàn tất ghi danh
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Xem Danh Sách Học Sinh */}
      <Modal isOpen={isViewStudentsModalOpen} onClose={() => setIsViewStudentsModalOpen(false)} title="Danh sách lớp học phần">
        <div className="space-y-6 pt-2">
          <div className="max-h-[500px] overflow-auto space-y-2 pr-2 custom-scrollbar">
            {enrollments?.filter(e => e.sectionId === selectedSectionId).map((enrollment) => {
              const student = students?.find(s => s.id === enrollment.studentId);
              if (!student) return null;

              return (
                <div key={enrollment.id} className="flex items-center justify-between p-4 rounded-2xl bg-foreground/5 border border-foreground/5 group/item transition-all hover:bg-foreground/10">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-xs font-black text-primary shadow-inner">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-black text-foreground">{student.name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">{student.studentCode}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    className="p-2 w-10 h-10 rounded-xl text-red-500/20 group-hover/item:text-red-500 hover:bg-red-500/10 transition-all"
                    onClick={() => handleUnenrollStudent(enrollment.id!)}
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              );
            })}
            
            {enrollments?.filter(e => e.sectionId === selectedSectionId).length === 0 && (
              <div className="text-center py-20 bg-foreground/5 rounded-[2rem] border border-dashed border-foreground/10">
                <Users className="w-12 h-12 text-foreground/5 mx-auto mb-4" />
                <p className="text-foreground/40 text-sm font-bold opacity-50">Lớp hiện chưa có học sinh nào.</p>
              </div>
            )}
          </div>
          <div className="pt-4 border-t border-foreground/5">
            <Button variant="secondary" className="w-full h-12 rounded-2xl" onClick={() => setIsViewStudentsModalOpen(false)}>
              Đóng danh sách
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
  </svg>
);
