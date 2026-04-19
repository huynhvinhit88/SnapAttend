import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { School, Users, GraduationCap, BookOpen, Plus, Pencil, Trash2, ChevronRight, UserPlus, FolderPlus } from 'lucide-react';
import { db } from '../../db/db';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { motion, AnimatePresence } from 'framer-motion';

// Import Shared Forms
import { ClassForm } from './forms/ClassForm';
import { StudentForm } from './forms/StudentForm';
import { TeacherForm } from './forms/TeacherForm';
import { SubjectForm } from './forms/SubjectForm';

type ModalType = 'class' | 'student' | 'teacher' | 'subject' | null;

export const OverviewSection = () => {
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [initialData, setInitialData] = useState<any>(null);

  // Fetch Data
  const classes = useLiveQuery(() => db.classes.toArray());
  const students = useLiveQuery(() => db.students.toArray());
  const teachers = useLiveQuery(() => db.teachers.toArray());
  const subjects = useLiveQuery(() => db.subjects.toArray());

  // Group Data
  const classesWithStudents = useMemo(() => {
    if (!classes || !students) return [];
    return classes.map(c => ({
      ...c,
      students: students.filter(s => s.classId === c.id)
    }));
  }, [classes, students]);

  const subjectsWithTeachers = useMemo(() => {
    if (!subjects || !teachers) return [];
    return subjects.map(s => ({
      ...s,
      teachers: teachers.filter(t => t.department === s.name)
    }));
  }, [subjects, teachers]);

  const openModal = (type: ModalType, id: number | null = null, data: any = null) => {
    setModalType(type);
    setEditingId(id);
    setInitialData(data);
  };

  const closeModal = () => {
    setModalType(null);
    setEditingId(null);
    setInitialData(null);
  };

  const handleDelete = async (table: string, id: number, label: string) => {
    if (confirm(`Bạn có chắc muốn xóa ${label} này?`)) {
      if (table === 'classes') {
        await db.transaction('rw', [db.classes, db.students, db.enrollments], async () => {
          await db.classes.delete(id);
          const relatedStudents = await db.students.where('classId').equals(id).toArray();
          const studentIds = relatedStudents.map(s => s.id!);
          await db.students.where('classId').equals(id).delete();
          await db.enrollments.where('studentId').anyOf(studentIds).delete();
        });
      } else {
        await (db as any)[table].delete(id);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      
      {/* SECTION 1: CLASSES & STUDENTS */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-foreground/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <School className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-black text-lg text-foreground uppercase tracking-tight">Lớp học & Học sinh</h3>
          </div>
          <Button size="sm" onClick={() => openModal('class')} className="rounded-xl h-9">
            <Plus className="w-4 h-4 mr-1.5" /> Thêm lớp
          </Button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 no-scrollbar">
          {classesWithStudents.map((cls) => (
            <Card key={cls.id} className="p-0 border-foreground/5 overflow-hidden group">
              {/* Class Header */}
              <div className="p-4 bg-foreground/5 flex items-center justify-between border-b border-foreground/5">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center font-black text-primary text-sm">
                      {cls.name.substring(0, 2)}
                   </div>
                   <div>
                      <h4 className="font-bold text-foreground leading-none">{cls.name}</h4>
                      <p className="text-[10px] text-foreground/40 font-black uppercase mt-1 tracking-widest">{cls.academicYear}</p>
                   </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="p-2 h-8 w-8 text-primary" onClick={() => openModal('class', cls.id!)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2 h-8 w-8 text-red-500" onClick={() => handleDelete('classes', cls.id!, 'lớp')}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Students List */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Danh sách ({cls.students.length})</span>
                  <button 
                    onClick={() => openModal('student', null, { classId: cls.id })}
                    className="flex items-center gap-1 text-[10px] font-black text-primary hover:text-primary/70 uppercase tracking-widest transition-colors"
                  >
                    <UserPlus className="w-3 h-3" /> Thêm học sinh
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-1">
                  {cls.students.length > 0 ? (
                    cls.students.map(std => (
                      <div key={std.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-foreground/5 group/item transition-colors">
                        <div className="flex items-center gap-3">
                           {std.avatar ? (
                             <img src={std.avatar} className="w-6 h-6 rounded-full object-cover" />
                           ) : (
                             <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-[10px] font-bold text-primary">
                               {std.name.charAt(0)}
                             </div>
                           )}
                           <span className="text-sm font-medium text-foreground/80">{std.name}</span>
                        </div>
                        <div className="flex opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <button onClick={() => openModal('student', std.id!)} className="p-1 text-primary/50 hover:text-primary">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete('students', std.id!, 'học sinh')} className="p-1 text-red-500/50 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-foreground/20 italic py-2">Chưa có học sinh trong lớp này</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {classesWithStudents.length === 0 && (
            <div className="text-center py-12 bg-background-light/30 rounded-[2rem] border border-dashed border-foreground/10">
              <School className="w-12 h-12 text-foreground/5 mx-auto mb-3" />
              <p className="text-foreground/30 text-xs font-bold">Chưa có lớp học nào</p>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: SUBJECTS & TEACHERS */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-foreground/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-xl">
              <BookOpen className="w-5 h-5 text-accent" />
            </div>
            <h3 className="font-black text-lg text-foreground uppercase tracking-tight">Môn học & Giáo viên</h3>
          </div>
          <Button size="sm" onClick={() => openModal('subject')} className="rounded-xl h-9 bg-accent hover:bg-accent/90">
            <Plus className="w-4 h-4 mr-1.5" /> Thêm môn học
          </Button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 no-scrollbar">
          {subjectsWithTeachers.map((sbj) => (
            <Card key={sbj.id} className="p-0 border-foreground/5 overflow-hidden group">
              {/* Subject Header */}
              <div className="p-4 bg-foreground/5 flex items-center justify-between border-b border-foreground/5">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center font-black text-accent text-sm">
                      <BookOpen className="w-5 h-5" />
                   </div>
                   <div>
                      <h4 className="font-bold text-foreground leading-none">{sbj.name}</h4>
                      <p className="text-[10px] text-foreground/40 font-black uppercase mt-1 tracking-widest">{sbj.code} • {sbj.credits} TÍN CHỈ</p>
                   </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="p-2 h-8 w-8 text-primary" onClick={() => openModal('subject', sbj.id!)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2 h-8 w-8 text-red-500" onClick={() => handleDelete('subjects', sbj.id!, 'môn học')}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Teachers List */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Giáo viên ({sbj.teachers.length})</span>
                  <button 
                    onClick={() => openModal('teacher', null, { department: sbj.name })}
                    className="flex items-center gap-1 text-[10px] font-black text-accent hover:text-accent/70 uppercase tracking-widest transition-colors"
                  >
                    <UserPlus className="w-3 h-3" /> Thêm giáo viên
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-1">
                  {sbj.teachers.length > 0 ? (
                    sbj.teachers.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-foreground/5 group/item transition-colors">
                        <div className="flex items-center gap-3">
                           <div className="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center text-[10px] font-bold text-accent">
                             <GraduationCap className="w-3.5 h-3.5" />
                           </div>
                           <span className="text-sm font-medium text-foreground/80">{t.name}</span>
                        </div>
                        <div className="flex opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <button onClick={() => openModal('teacher', t.id!)} className="p-1 text-primary/50 hover:text-primary">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete('teachers', t.id!, 'giáo viên')} className="p-1 text-red-500/50 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-foreground/20 italic py-2">Chưa có giáo viên bộ môn</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {subjectsWithTeachers.length === 0 && (
            <div className="text-center py-12 bg-background-light/30 rounded-[2rem] border border-dashed border-foreground/10">
              <BookOpen className="w-12 h-12 text-foreground/5 mx-auto mb-3" />
              <p className="text-foreground/30 text-xs font-bold">Chưa có môn học nào</p>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      <Modal 
        isOpen={modalType !== null} 
        onClose={closeModal}
        title={
          modalType === 'class' ? (editingId ? "Sửa thông tin Lớp" : "Thêm Lớp học") :
          modalType === 'student' ? (editingId ? "Sửa thông tin Học sinh" : "Thêm Học sinh") :
          modalType === 'teacher' ? (editingId ? "Sửa thông tin Giáo viên" : "Thêm Giáo viên") :
          modalType === 'subject' ? (editingId ? "Sửa thông tin Môn học" : "Thêm Môn học") : ""
        }
      >
        {modalType === 'class' && <ClassForm editingId={editingId} onSuccess={closeModal} onCancel={closeModal} />}
        {modalType === 'student' && <StudentForm editingId={editingId} initialClassId={initialData?.classId} onSuccess={closeModal} onCancel={closeModal} />}
        {modalType === 'teacher' && <TeacherForm editingId={editingId} initialDepartment={initialData?.department} onSuccess={closeModal} onCancel={closeModal} />}
        {modalType === 'subject' && <SubjectForm editingId={editingId} onSuccess={closeModal} onCancel={closeModal} />}
      </Modal>

    </div>
  );
};
