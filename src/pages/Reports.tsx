import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useLiveQuery } from 'dexie-react-hooks';
import { FileSpreadsheet, Filter, CheckCircle2, Clock, XCircle, Calendar, BookOpen, Layers, Trash2, BarChart3, Cloud, RefreshCw } from 'lucide-react';
import { db } from '../db/db';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { format, parseISO } from 'date-fns';
import { useFilter } from '../context/FilterContext';
import { PageHeader } from '../components/ui/PageHeader';
import { googleDriveService } from '../services/googleDrive.service';

// Component hiển thị bảng điểm danh cho một Ca học cụ thể
const SessionReportTable = ({ 
  session, 
  sectionName, 
  enrollments, 
  students, 
  records 
}: { 
  session: any, 
  sectionName: string, 
  enrollments: any[], 
  students: any[], 
  records: any[] 
}) => {
  const combinedData = useMemo(() => {
    if (!enrollments || !students) return [];
    const sectionEnrollments = enrollments.filter(e => e.sectionId === session.sectionId);
    
    return sectionEnrollments.map(enrollment => {
      const student = students.find(s => s.id === enrollment.studentId);
      const record = records?.find(r => 
        r.sessionId === session.id && r.studentId === enrollment.studentId
      );

      return {
        id: enrollment.id,
        name: student?.name || 'N/A',
        studentCode: student?.studentCode || 'N/A',
        status: record?.status || 'present',
        timestamp: record?.timestamp || session.createdAt,
        isImplicit: !record
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [session, enrollments, students, records]);

  return (
    <Card className="p-0 overflow-hidden border-primary/10 shadow-lg">
      <div className="bg-primary/5 p-4 border-b border-foreground/10 flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{sectionName}</h3>
            <p className="text-foreground/40 text-xs font-bold uppercase tracking-widest">
              {format(parseISO(session.date), 'dd/MM/yyyy')} • {session.startTime} - {session.endTime}
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-[10px] text-foreground/30 font-bold uppercase">Sĩ số</p>
            <p className="text-sm font-bold text-foreground">{combinedData.length}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-red-400/60 font-bold uppercase">Vắng</p>
            <p className="text-sm font-bold text-red-500">{combinedData.filter(d => d.status === 'absent').length}</p>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-foreground/5 border-b border-foreground/5">
              <th className="p-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest pl-6">Học sinh</th>
              <th className="p-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest text-center">Mã HS</th>
              <th className="p-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest text-center">Trạng thái</th>
              <th className="p-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest text-right pr-6">Ghi nhận</th>
            </tr>
          </thead>
          <tbody>
            {combinedData.map((item) => (
              <tr key={item.id} className="border-b border-foreground/5 hover:bg-foreground/5 transition-colors">
                <td className="p-4 pl-6">
                  <span className="text-foreground font-medium text-sm">{item.name}</span>
                </td>
                <td className="p-4 text-center text-foreground/50 text-xs font-mono">{item.studentCode}</td>
                <td className="p-4">
                  <div className="flex justify-center">
                    {item.status === 'present' && <span className="flex items-center gap-1.5 text-green-500 bg-green-500/10 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase border border-green-500/20"><CheckCircle2 className="w-3 h-3" /> Có mặt</span>}
                    {item.status === 'late' && <span className="flex items-center gap-1.5 text-yellow-500 bg-yellow-500/10 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase border border-yellow-500/20"><Clock className="w-3 h-3" /> Trễ</span>}
                    {item.status === 'absent' && <span className="flex items-center gap-1.5 text-red-500 bg-red-500/10 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase border border-red-500/20"><XCircle className="w-3 h-3" /> Vắng</span>}
                  </div>
                </td>
                <td className="p-4 text-right text-foreground/20 text-[10px] pr-6">
                  {item.isImplicit ? '-' : format(new Date(item.timestamp), 'HH:mm:ss')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export const Reports = () => {
  const { filters, updateFilter } = useFilter();
  const filter = filters.reports;
  const [isSyncing, setIsSyncing] = useState(false);
  
  const setFilter = (newFilter: any) => updateFilter('reports', newFilter);

  const subjects = useLiveQuery(() => db.subjects.toArray());
  const sections = useLiveQuery(() => db.sections.toArray());
  const sessions = useLiveQuery(() => db.sessions.toArray());
  const students = useLiveQuery(() => db.students.toArray());
  const enrollments = useLiveQuery(() => db.enrollments.toArray());
  const records = useLiveQuery(() => db.attendance.toArray());

  // Logic lọc Ca học khớp với điều kiện
  const matchingSessions = useMemo(() => {
    if (!sessions || !sections) return [];

    return sessions.filter(s => {
      // Lọc theo ngày (nếu có nhập)
      const matchesDate = !filter.date || s.date === filter.date;
      
      // Lọc theo môn học (thông qua section)
      let matchesSubject = true;
      const section = sections.find(sec => sec.id === s.sectionId);
      if (filter.subjectId !== 'all' && section) {
        matchesSubject = section.subjectId === parseInt(filter.subjectId);
      }

      // Lọc theo lớp học phần
      const matchesSection = filter.sectionId === 'all' || s.sectionId === parseInt(filter.sectionId);

      return matchesDate && matchesSubject && matchesSection;
    }).sort((a, b) => b.createdAt - a.createdAt); // Mới nhất lên đầu
  }, [sessions, sections, filter]);

  const getReportAOA = () => {
    const headers = ["Lớp học phần", "Ca học", "Họ và tên", "Mã HS", "Trạng thái", "Ngày", "Giờ ghi nhận"];
    const rows: any[][] = [];

    matchingSessions.forEach(session => {
      const section = sections?.find(s => s.id === session.sectionId);
      const sectionEnrollments = enrollments?.filter(e => e.sectionId === session.sectionId) || [];
      
      sectionEnrollments.forEach(enrollment => {
        const student = students?.find(s => s.id === enrollment.studentId);
        const record = records?.find(r => r.sessionId === session.id && r.studentId === enrollment.studentId);
        const status = record?.status || 'present';
        const timestamp = record ? format(new Date(record.timestamp), 'HH:mm:ss') : '-';
        const statusText = status === 'present' ? 'Có mặt' : status === 'late' ? 'Trễ' : 'Vắng';
        
        rows.push([
          section?.name || 'N/A',
          `${session.startTime}-${session.endTime}`,
          student?.name || 'N/A',
          student?.studentCode || 'N/A',
          statusText,
          session.date,
          timestamp
        ]);
      });
    });
    return [headers, ...rows];
  };

  const handleExportExcel = () => {
    if (!matchingSessions || matchingSessions.length === 0) return alert('Không có dữ liệu để xuất!');
    const aoa = getReportAOA();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, "Báo cáo");
    XLSX.writeFile(wb, `Bao_cao_tong_hop_${format(new Date(), 'ddMMyyyy')}.xlsx`);
  };

  const handleUploadToDrive = async () => {
    if (!matchingSessions || matchingSessions.length === 0) return alert('Không có dữ liệu để tải lên!');
    
    setIsSyncing(true);
    try {
      const aoa = getReportAOA();
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      XLSX.utils.book_append_sheet(wb, ws, "Báo cáo");
      
      const excelBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const fileName = `Bao_cao_SnapAttend_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
      
      await googleDriveService.uploadFile(
        fileName, 
        excelBuffer, 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      alert('Đã tải báo cáo Excel lên Drive thành công!');
    } catch (error) {
      console.error(error);
      alert('Lỗi khi tải lên Drive: ' + (typeof error === 'string' ? error : 'Vui lòng kiểm tra cấu hình trong Cài đặt'));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title="Báo cáo điểm danh"
        description="Truy vấn và xuất dữ liệu thống kê chi tiết theo bộ lọc."
        icon={<BarChart3 className="w-8 h-8" />}
      >
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleUploadToDrive} disabled={matchingSessions.length === 0 || isSyncing}>
            {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
            Tải lên Drive
          </Button>
          <Button onClick={handleExportExcel} disabled={matchingSessions.length === 0}>
            <FileSpreadsheet className="w-5 h-5" />
            Xuất Excel
          </Button>
        </div>
      </PageHeader>

      {/* Advanced Filter Card */}
      <Card className="flex flex-col md:flex-row items-end gap-6 relative overflow-hidden p-6 border-none shadow-none">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="flex-1 w-full">
          <Input 
            label="Môn học" 
            type="select"
            icon={<BookOpen className="w-4 h-4" />}
            options={[{ value: 'all', label: 'Tất cả môn học' }, ...(subjects?.map(s => ({ value: s.id!.toString(), label: s.name })) || [])]}
            value={filter.subjectId} 
            onChange={e => setFilter({...filter, subjectId: e.target.value, sectionId: 'all'})}
          />
        </div>
        <div className="flex-1 w-full">
          <Input 
            label="Lớp học phần" 
            type="select"
            icon={<Layers className="w-4 h-4" />}
            options={[{ value: 'all', label: 'Tất cả lớp học phần' }, ...(sections?.filter(s => filter.subjectId === 'all' || s.subjectId === parseInt(filter.subjectId)).map(s => ({ value: s.id!.toString(), label: s.name })) || [])]}
            value={filter.sectionId} 
            onChange={e => setFilter({...filter, sectionId: e.target.value})}
          />
        </div>
        <div className="flex items-end gap-2 w-full md:w-auto flex-1">
          <div className="flex-1">
            <Input 
              label="Ngày diễn ra ca học" 
              type="date"
              icon={<Calendar className="w-4 h-4" />}
              value={filter.date} 
              onChange={e => setFilter({...filter, date: e.target.value})}
            />
          </div>
          <Button 
            variant="secondary" 
            onClick={() => setFilter({...filter, date: ''})}
            disabled={!filter.date}
            className="w-11 h-11 p-0 flex-shrink-0 mb-[26px]"
            title="Xóa ngày"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Multi-Session Results */}
      <div className="space-y-12">
        {matchingSessions.map((session) => (
          <SessionReportTable 
            key={session.id} 
            session={session}
            sectionName={sections?.find(s => s.id === session.sectionId)?.name || 'N/A'}
            students={students || []}
            enrollments={enrollments || []}
            records={records || []}
          />
        ))}

        {matchingSessions.length === 0 && (
          <div className="py-24 text-center glass-card border-dashed border-foreground/10 rounded-3xl">
            <Filter className="w-16 h-16 text-foreground/5 mx-auto mb-6" />
            <h3 className="text-xl font-bold text-foreground/40 mb-2">Không tìm thấy dữ liệu</h3>
            <p className="text-foreground/20 text-sm max-w-xs mx-auto">Hãy thử thay đổi điều kiện lọc (Ngày, Môn học hoặc Lớp học phần) để tìm kết quả khác.</p>
          </div>
        )}
      </div>
    </div>
  );
};
