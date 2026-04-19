import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useFilter } from '../context/FilterContext';
import { PageHeader } from '../components/ui/PageHeader';
import { BookOpen, Layers, Plus, Pencil, Users, UserPlus, Trash2, Search } from 'lucide-react';
import { db } from '../db/db';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { motion } from 'framer-motion';
import { SectionForm } from '../components/master-data/forms/SectionForm';

export const Sections = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isViewStudentsModalOpen, setIsViewStudentsModalOpen] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [initialSubjectId, setInitialSubjectId] = useState<number | null>(null);
  
  const { filters, updateFilter } = useFilter();
  const { searchTerm } = filters.sections;
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const sections = useLiveQuery(() => db.sections.toArray());
  const sectionCount = useLiveQuery(() => db.sections.count());
  const subjects = useLiveQuery(() => db.subjects.toArray());
  const subjectCount = useLiveQuery(() => db.subjects.count());
  const teachers = useLiveQuery(() => db.teachers.toArray());
  const students = useLiveQuery(() => db.students.toArray());
  const enrollments = useLiveQuery(() => db.enrollments.toArray());
  const classes = useLiveQuery(() => db.classes.toArray());
  const academicYears = useLiveQuery(() => db.academicYears.toArray());
  
  const [yearFilter, setYearFilter] = useState('');

  const handleEditSection = (id: number) => {
    setEditingId(id);
    setIsModalOpen(true);
  };

  const handleMapStudents = async (studentIds: number[]) => {
    if (!selectedSectionId) return;
    const existingEnrollments = enrollments?.filter(e => e.sectionId === selectedSectionId) || [];
    const existingStudentIds = existingEnrollments.map(e => e.studentId);
    const newStudentIds = studentIds.filter(id => !existingStudentIds.includes(id));
    
    if (newStudentIds.length === 0) return;
    for (const studentId of newStudentIds) {
      await db.enrollments.add({ sectionId: selectedSectionId, studentId, createdAt: Date.now() });
    }
  };

  const handleUnenrollStudent = async (enrollmentId: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa học sinh này khỏi lớp học phần?')) {
      await db.enrollments.delete(enrollmentId);
    }
  };

  const handleDeleteSection = async (id: number) => {
    if (confirm('Xóa lớp học phần này sẽ xóa toàn bộ danh sách điểm danh liên quan?')) {
      await db.transaction('rw', [db.sections, db.enrollments], async () => {
        await db.sections.delete(id);
        await db.enrollments.where('sectionId').equals(id).delete();
      });
    }
  };

  const groupedData = useMemo(() => {
    if (!subjects || !sections || !teachers) return [];
    const searchLow = searchTerm.toLowerCase();
    
    return subjects.map(subject => {
      const subjectSections = sections.filter(s => s.subjectId === subject.id);
      const filteredSubSections = subjectSections.filter(s => {
        const teacher = teachers.find(t => t.id === s.teacherId);
        const matchesYear = !yearFilter || s.schoolYear === yearFilter;
        const matchesSearch = 
          s.name.toLowerCase().includes(searchLow) || 
          subject.name.toLowerCase().includes(searchLow) ||
          teacher?.name.toLowerCase().includes(searchLow);
        return matchesYear && matchesSearch;
      });

      const isSubjectMatch = subject.name.toLowerCase().includes(searchLow);
      if (filteredSubSections.length > 0 || (isSubjectMatch && !searchTerm)) {
        return { subject, sections: filteredSubSections };
      }
      return null;
    }).filter(item => item !== null) as { subject: any, sections: any[] }[];
  }, [subjects, sections, teachers, searchTerm, yearFilter]);

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title="Lớp học phần"
        description="Quản lý nhóm học sinh đăng ký theo từng môn học và đào tạo cụ thể."
        icon={<Layers className="w-8 h-8 text-primary" />}
        breadcrumbs={[{ label: 'Trang chủ' }, { label: 'Đào tạo', active: true }]}
        stats={[
          { label: 'Tổng lớp HP', value: sectionCount || 0, icon: Layers },
          { label: 'Tổng số môn học', value: subjectCount || 0, icon: BookOpen, color: 'text-primary' },
        ]}
      >
        <Button onClick={() => {
          setEditingId(null);
          setInitialSubjectId(null);
          setIsModalOpen(true);
        }}>
          <Plus className="w-5 h-5 mr-2" />
          Thêm Lớp HP
        </Button>
      </PageHeader>

      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="relative group flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/30 group-focus-within:text-primary transition-colors" />
          <Input 
            className="pl-12 h-14 bg-background-light/50 backdrop-blur-xl border-foreground/10 focus:border-primary/50 shadow-inner" 
            placeholder="Tìm theo tên lớp, môn học hoặc giáo viên..." 
            value={searchTerm} 
            onChange={e => updateFilter('sections', { searchTerm: e.target.value })} 
          />
        </div>
        <div className="w-full md:w-64">
          <Input 
            label="Lọc theo năm học"
            type="select"
            options={[{ value: '', label: 'Tất cả năm học' }, ...(academicYears?.map(y => ({ value: y.name, label: y.name })) || [])]}
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {groupedData.map((group, idx) => (
          <motion.div
            key={group.subject.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="h-full border-foreground/5 hover:border-primary/20 transition-all flex flex-col p-0 overflow-hidden">
              <div className="p-6 bg-foreground/[0.02] border-b border-foreground/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-foreground">{group.subject.name}</h3>
                    <p className="text-[10px] text-foreground/30 font-black uppercase tracking-widest">
                      {group.sections.length} Lớp học phần
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  className="text-primary hover:bg-primary/10 px-3 h-10 rounded-xl font-bold text-xs"
                  onClick={() => {
                    setEditingId(null);
                    setInitialSubjectId(group.subject.id);
                    setIsModalOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Thêm lớp học phần
                </Button>
              </div>

              <div className="p-4 flex-1 space-y-3">
                {group.sections.length > 0 ? (
                  group.sections.map(section => {
                    const teacher = teachers?.find(t => t.id === section.teacherId);
                    const sectionEnrollments = enrollments?.filter(e => e.sectionId === section.id) || [];
                    const stdCount = sectionEnrollments.length;

                    return (
                      <div key={section.id} className="p-4 rounded-2xl bg-foreground/[0.03] border border-foreground/5 group/item hover:bg-foreground/[0.05] transition-all">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-foreground group-hover/item:text-primary transition-colors">{section.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-foreground/40 font-black uppercase tracking-widest">{teacher?.name || 'Chưa phân công'}</span>
                              <span className="w-1 h-1 rounded-full bg-foreground/10" />
                              <span className="text-[10px] text-primary font-bold">{section.semester} • {section.schoolYear}</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-1 items-center">
                            <Button variant="ghost" className="p-2 w-8 h-8 rounded-lg text-primary hover:bg-primary/10" onClick={() => handleEditSection(section.id!)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" className="p-2 w-8 h-8 rounded-lg text-primary hover:bg-primary/10" onClick={() => { setSelectedSectionId(section.id!); setIsViewStudentsModalOpen(true); }}>
                              <Users className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" className="p-2 w-8 h-8 rounded-lg text-primary hover:bg-primary/10" onClick={() => { setSelectedSectionId(section.id!); setIsMapModalOpen(true); }}>
                              <UserPlus className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" className="p-2 w-8 h-8 rounded-lg text-red-500 hover:bg-red-500/10" onClick={() => handleDeleteSection(section.id!)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-foreground/40 tracking-tighter">
                            <Users className="w-3 h-3" />
                            {stdCount} Học viên ghi danh
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-10 text-center bg-foreground/[0.02] rounded-2xl border border-dashed border-foreground/5">
                    <Layers className="w-10 h-10 text-foreground/5 mx-auto mb-2" />
                    <p className="text-xs text-foreground/30 font-bold uppercase tracking-widest">Không có lớp học phần phù hợp</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {groupedData.length === 0 && (
        <div className="text-center py-24 px-4 bg-background-light/30 backdrop-blur-3xl rounded-[3rem] border border-dashed border-foreground/10">
          <Layers className="w-20 h-20 text-foreground/5 mx-auto mb-6" />
          <p className="text-foreground/40 font-bold text-lg">Hệ thống chưa ghi nhận hoặc không tìm thấy lớp học phần nào.</p>
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? "Cập nhật Lớp Học Phần" : "Thiết lập Lớp Học Phần Mới"}
      >
        <SectionForm 
          editingId={editingId} 
          initialSubjectId={initialSubjectId}
          onSuccess={() => setIsModalOpen(false)} 
          onCancel={() => setIsModalOpen(false)} 
        />
      </Modal>

      <Modal 
        isOpen={isMapModalOpen} 
        onClose={() => { setIsMapModalOpen(false); setClassSearchTerm(''); }} 
        title="Ghi danh học viên"
      >
        <div className="space-y-6 pt-2">
          <p className="text-foreground/50 text-xs font-medium leading-relaxed border-l-2 border-primary pl-4 py-1 bg-primary/5 rounded-r-lg">
            Ghi danh lẻ từng học viên hoặc chọn 'Ghi danh cả lớp' để thêm nhanh toàn bộ sỹ số từ các lớp hành chính.
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
          </div>
          <div className="pt-6 border-t border-foreground/5">
            <Button className="w-full h-12 rounded-2xl shadow-xl shadow-primary/10" onClick={() => setIsMapModalOpen(false)}>
              Hoàn tất ghi danh
            </Button>
          </div>
        </div>
      </Modal>

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
                  <Button variant="ghost" className="p-2 w-10 h-10 rounded-xl text-red-500/20 group-hover/item:text-red-500 hover:bg-red-500/10 transition-all" onClick={() => handleUnenrollStudent(enrollment.id!)}>
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              );
            })}
          </div>
          <div className="pt-4 border-t border-foreground/5">
            <Button variant="secondary" className="w-full h-12 rounded-2xl" onClick={() => setIsViewStudentsModalOpen(false)}> Đóng danh sách </Button>
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
