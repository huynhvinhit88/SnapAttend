import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, CheckCircle2, Clock, XCircle, Info } from 'lucide-react';
import { db } from '../db/db';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import type { AttendanceStatus } from '../types/database';


interface AttendanceProps {
  sessionId: number;
  onBack: () => void;
}

export const Attendance = ({ sessionId, onBack }: AttendanceProps) => {
  const session = useLiveQuery(() => db.sessions.get(sessionId), [sessionId]);
  const section = useLiveQuery(() => session ? db.sections.get(session.sectionId) : undefined, [session]);
  const enrollments = useLiveQuery(() => db.enrollments.where('sectionId').equals(session?.sectionId || 0).toArray(), [session]);
  const students = useLiveQuery(() => db.students.toArray(), []);
  const records = useLiveQuery(() => db.attendance.where('sessionId').equals(sessionId).toArray(), [sessionId]);

  const enrolledStudents = enrollments?.map(e => students?.find(s => s.id === e.studentId)).filter(Boolean) || [];

  // Logic rung thiết bị (Haptic Feedback)
  const triggerHaptic = useCallback((pattern: number[] = [20]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  const handleToggleStatus = async (studentId: number) => {
    const existingRecord = records?.find(r => r.studentId === studentId);
    // Mặc định ban đầu là present, chạm sẽ xoay vòng
    let nextStatus: AttendanceStatus = 'late'; // Chạm lần đầu (từ mặc định present) -> late

    if (existingRecord) {
      const status = existingRecord.status as any;
      if (status === 'present') nextStatus = 'late';
      else if (status === 'late') nextStatus = 'absent_cp';
      else if (status === 'absent_cp') nextStatus = 'absent_kp';
      else if (status === 'absent_kp') nextStatus = 'present';
    }

    triggerHaptic(nextStatus === 'present' ? [30] : nextStatus === 'late' ? [15, 10, 15] : [50]);

    if (existingRecord) {
      await db.attendance.update(existingRecord.id!, { status: nextStatus, timestamp: Date.now() });
    } else {
      await db.attendance.add({
        sessionId,
        studentId,
        status: nextStatus,
        timestamp: Date.now()
      });
    }
  };

  const stats = {
    late: records?.filter(r => r.status === 'late').length || 0,
    absent_cp: records?.filter(r => r.status === 'absent_cp').length || 0,
    absent_kp: records?.filter(r => r.status === 'absent_kp').length || 0,
    total: enrolledStudents.length,
    // Present = Tổng - (Vắng CP + Vắng KP + Muộn)
    get present() { return this.total - this.late - this.absent_cp - this.absent_kp }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" className="p-2" onClick={onBack}>
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground leading-tight">{section?.name}</h1>
          <p className="text-foreground/40 text-sm">{session?.date} • {session?.startTime} - {session?.endTime}</p>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-5 gap-2">
        <div className="bg-foreground/5 p-2 rounded-2xl border border-foreground/5 text-center">
          <p className="text-[9px] text-foreground/40 font-bold uppercase mb-0.5">Tổng</p>
          <p className="text-lg font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="bg-green-500/10 p-2 rounded-2xl border border-green-500/10 text-center">
          <p className="text-[9px] text-green-500/60 font-bold uppercase mb-0.5">Có mặt</p>
          <p className="text-lg font-bold text-green-500">{stats.present}</p>
        </div>
        <div className="bg-yellow-500/10 p-2 rounded-2xl border border-yellow-500/10 text-center">
          <p className="text-[9px] text-yellow-500/60 font-bold uppercase mb-0.5">Trễ</p>
          <p className="text-lg font-bold text-yellow-500">{stats.late}</p>
        </div>
        <div className="bg-orange-500/10 p-2 rounded-2xl border border-orange-500/10 text-center">
          <p className="text-[9px] text-orange-500/60 font-bold uppercase mb-0.5">Vắng CP</p>
          <p className="text-lg font-bold text-orange-500">{stats.absent_cp}</p>
        </div>
        <div className="bg-red-500/10 p-2 rounded-2xl border border-red-500/10 text-center">
          <p className="text-[9px] text-red-500/60 font-bold uppercase mb-0.5">Vắng KP</p>
          <p className="text-lg font-bold text-red-500">{stats.absent_kp}</p>
        </div>
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {enrolledStudents.map((student) => {
          const record = records?.find(r => r.studentId === student?.id);
          const status = record?.status || 'present'; // Mặc định là present

          return (
            <motion.div 
              key={student?.id} 
              whileTap={{ scale: 0.95 }}
              onClick={() => handleToggleStatus(student?.id!)}
              className="cursor-pointer"
            >
              <Card className={clsx(
                "relative p-3 flex flex-col items-center justify-center transition-all duration-300 border-2",
                status === 'present' && "bg-green-500/20 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]",
                status === 'late' && "bg-yellow-500/20 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]",
                status === 'absent_cp' && "bg-orange-500/10 border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.05)]",
                status === 'absent_kp' && "bg-red-500/20 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              )}>
                <div className="relative mb-3">
                  {student?.avatar ? (
                    <img src={student.avatar} className="w-16 h-16 rounded-full object-cover border-2 border-foreground/10" alt="" />
                  ) : (
                    <div className="w-16 h-16 bg-foreground/10 rounded-full flex items-center justify-center text-foreground/40 text-xl font-bold">
                      {student?.name.charAt(0)}
                    </div>
                  )}
                  <AnimatePresence>
                    <motion.div 
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="absolute -bottom-1 -right-1"
                    >
                      {status === 'present' && <CheckCircle2 className="w-6 h-6 text-green-500 fill-background" />}
                      {status === 'late' && <Clock className="w-6 h-6 text-yellow-500 fill-background" />}
                      {status === 'absent_cp' && (
                        <div className="relative">
                          <XCircle className="w-6 h-6 text-orange-500 fill-background" />
                          <span className="absolute -top-1 -right-1 bg-orange-500 text-[8px] text-white px-1 rounded-full font-black">P</span>
                        </div>
                      )}
                      {status === 'absent_kp' && <XCircle className="w-6 h-6 text-red-600 fill-background" />}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <p className="text-sm font-bold text-foreground text-center line-clamp-1">{student?.name}</p>
                <p className="text-[10px] text-foreground/30 font-bold uppercase mt-1">{student?.studentCode}</p>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-background-light/80 backdrop-blur-xl border border-foreground/10 px-6 py-3 rounded-full shadow-2xl z-40">
        <div className="flex items-center gap-2 text-foreground/50 text-xs font-medium">
          <Info className="w-4 h-4" />
          <span>Chạm vào học sinh để đổi trạng thái</span>
        </div>
        <div className="w-px h-6 bg-foreground/10" />
        <Button 
          variant="ghost" 
          className="text-primary text-xs font-bold uppercase tracking-widest p-1"
          onClick={async () => {
             if(confirm('Hoàn tất điểm danh cho ca học này? Những học sinh chưa được chạm sẽ được mặc định là có mặt.')) {
               try {
                 const missingStudents = enrolledStudents.filter(s => s && !records?.some(r => r.studentId === s.id));
                 
                 await db.transaction('rw', [db.attendance, db.sessions], async () => {
                   if (missingStudents.length > 0) {
                     const newRecords = missingStudents
                       .filter((s): s is NonNullable<typeof s> => !!s && !!s.id)
                       .map(s => ({
                         sessionId,
                         studentId: s.id as number,
                         status: 'present' as const,
                         timestamp: Date.now()
                       }));
                     if (newRecords.length > 0) {
                       await db.attendance.bulkAdd(newRecords);
                     }
                   }
                   await db.sessions.update(sessionId, { status: 'completed' });
                 });
                 
                 onBack();
               } catch (error) {
                 console.error('Lỗi khi hoàn tất điểm danh:', error);
                 alert('Có lỗi xảy ra khi lưu dữ liệu. Vui lòng thử lại!');
               }
             }
          }}
        >
          Hoàn tất
        </Button>
      </div>
    </div>
  );
};
