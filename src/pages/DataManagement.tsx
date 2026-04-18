import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import * as XLSX from 'xlsx';
import { 
  FileUp, FileDown, CheckCircle2, AlertTriangle, 
  XCircle, Upload, Database, Download, Trash2, 
  Info, Check
} from 'lucide-react';
import { db } from '../db/db';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { PageHeader } from '../components/ui/PageHeader';

type Category = 'classes' | 'students' | 'teachers' | 'subjects' | 'sections' | 'sessions';

interface ValidationResult {
  row: any;
  status: 'ok' | 'warning' | 'error';
  errors: string[];
  warnings: string[];
  invalidFields: string[];
  transformedData: any;
}

const CATEGORIES: { id: Category; label: string; icon: any }[] = [
  { id: 'classes', label: 'Quản lý Lớp', icon: Database },
  { id: 'students', label: 'Học sinh', icon: Database },
  { id: 'teachers', label: 'Giáo viên', icon: Database },
  { id: 'subjects', label: 'Môn học', icon: Database },
  { id: 'sections', label: 'Lớp học phần', icon: Database },
  { id: 'sessions', label: 'Ca học', icon: Database },
];

export const DataManagement = () => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [selectedCategory, setSelectedCategory] = useState<Category>('classes');
  const [importData, setImportData] = useState<ValidationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportSelection, setExportSelection] = useState<Set<Category>>(new Set());
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Lấy dữ liệu từ DB để validation
  const dbClasses = useLiveQuery(() => db.classes.toArray());
  const dbStudents = useLiveQuery(() => db.students.toArray());
  const dbTeachers = useLiveQuery(() => db.teachers.toArray());
  const dbSubjects = useLiveQuery(() => db.subjects.toArray());
  const dbSections = useLiveQuery(() => db.sections.toArray());

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const processFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      alert('Vui lòng chọn tệp định dạng Excel (.xlsx hoặc .xls)');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        await validateData(data);
      } catch (error) {
        console.error('Lỗi đọc file:', error);
        alert('Không thể đọc tệp Excel. Vui lòng kiểm tra lại định dạng!');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const validateData = async (rawData: any[]) => {
    const results: ValidationResult[] = [];

    for (const row of rawData) {
      const result: ValidationResult = {
        row,
        status: 'ok',
        errors: [],
        warnings: [],
        invalidFields: [],
        transformedData: {}
      };

      try {
        switch (selectedCategory) {
          case 'classes': {
            const name = row['Tên lớp'] || row['name'];
            if (!name) {
              result.status = 'error';
              result.errors.push('Tên lớp là bắt buộc');
              result.invalidFields.push('Tên lớp');
            }
            result.transformedData = {
              name: name?.toString(),
              grade: (row['Khối'] || row['grade'])?.toString() || 'Khối 10',
              major: (row['Chuyên ngành'] || row['major'])?.toString(),
              academicYear: (row['Niên khóa'] || row['academicYear'])?.toString(),
              createdAt: Date.now()
            };
            break;
          }

          case 'students': {
            const code = (row['Mã học sinh'] || row['studentCode'])?.toString();
            const name = row['Họ và tên'] || row['name'];
            const className = row['Tên lớp'] || row['className'];

            if (!code || !name || !className) {
              result.status = 'error';
              if (!code) { result.errors.push('Mã HS thiếu'); result.invalidFields.push('Mã học sinh'); }
              if (!name) { result.errors.push('Tên thiếu'); result.invalidFields.push('Họ và tên'); }
              if (!className) { result.errors.push('Lớp thiếu'); result.invalidFields.push('Tên lớp'); }
            } else {
              const matchedClass = dbClasses?.find(c => c.name === className);
              if (!matchedClass) {
                result.status = 'error';
                result.errors.push(`Lớp "${className}" không tồn tại`);
                result.invalidFields.push('Tên lớp');
              } else {
                result.transformedData = {
                  studentCode: code,
                  name: name.toString(),
                  classId: matchedClass.id,
                  email: (row['Email'] || row['email'])?.toString(),
                  createdAt: Date.now()
                };
                if (dbStudents?.some(s => s.studentCode === code)) {
                  result.status = 'warning';
                  result.warnings.push('Mã học sinh đã tồn tại - Sẽ cập nhật');
                }
              }
            }
            break;
          }

          case 'teachers': {
            const code = (row['Mã giáo viên'] || row['teacherCode'])?.toString();
            const name = row['Họ và tên'] || row['name'];

            if (!code || !name) {
              result.status = 'error';
              if (!code) { result.errors.push('Mã GV thiếu'); result.invalidFields.push('Mã giáo viên'); }
              if (!name) { result.errors.push('Tên thiếu'); result.invalidFields.push('Họ và tên'); }
            } else {
              result.transformedData = {
                teacherCode: code,
                name: name.toString(),
                department: (row['Khoa/Bộ môn'] || row['department'])?.toString(),
                createdAt: Date.now()
              };
              if (dbTeachers?.some(t => t.teacherCode === code)) {
                result.status = 'warning';
                result.warnings.push('Mã giáo viên đã tồn tại - Sẽ cập nhật');
              }
            }
            break;
          }

          case 'subjects': {
            const code = (row['Mã môn học'] || row['code'])?.toString();
            const name = row['Tên môn học'] || row['name'];
            if (!code || !name) {
              result.status = 'error';
              result.errors.push('Mã và Tên môn học là bắt buộc');
              result.invalidFields.push('Mã môn học', 'Tên môn học');
            } else {
              result.transformedData = {
                code,
                name: name.toString(),
                credits: parseInt(row['Số tín chỉ'] || row['credits'] || '0'),
                createdAt: Date.now()
              };
              if (dbSubjects?.some(s => s.code === code)) {
                result.status = 'warning';
                result.warnings.push('Môn học đã tồn tại - Sẽ cập nhật');
              }
            }
            break;
          }

          case 'sections': {
            const name = row['Tên lớp HP'] || row['name'];
            const subjectName = row['Tên môn học'] || row['subjectName'];
            const teacherName = row['Tên giáo viên'] || row['teacherName'];

            if (!name || !subjectName || !teacherName) {
              result.status = 'error';
              result.errors.push('Thiếu thông tin bắt buộc');
              result.invalidFields.push('Tên lớp HP', 'Tên môn học', 'Tên giáo viên');
            } else {
              const matchedSubject = dbSubjects?.find(s => s.name === subjectName);
              const matchedTeacher = dbTeachers?.find(t => t.name === teacherName);

              if (!matchedSubject || !matchedTeacher) {
                result.status = 'error';
                if (!matchedSubject) { result.errors.push(`Môn "${subjectName}" không tồn tại`); result.invalidFields.push('Tên môn học'); }
                if (!matchedTeacher) { result.errors.push(`GV "${teacherName}" không tồn tại`); result.invalidFields.push('Tên giáo viên'); }
              } else {
                result.transformedData = {
                  name: name.toString(),
                  subjectId: matchedSubject.id,
                  teacherId: matchedTeacher.id,
                  semester: (row['Học kỳ'] || row['semester'])?.toString() || 'Học kỳ 1',
                  schoolYear: (row['Năm học'] || row['schoolYear'])?.toString() || '2024-2025',
                  createdAt: Date.now()
                };
                if (dbSections?.some(s => s.name === name)) {
                  result.status = 'warning';
                  result.warnings.push('Lớp HP đã tồn tại - Sẽ cập nhật');
                }
              }
            }
            break;
          }

          case 'sessions': {
            const sectionName = row['Tên lớp HP'] || row['sectionName'];
            const date = row['Ngày'] || row['date'];
            if (!sectionName || !date) {
              result.status = 'error';
              result.errors.push('Thiếu thông tin bắt buộc');
              result.invalidFields.push('Tên lớp HP', 'Ngày');
            } else {
              const matchedSection = dbSections?.find(s => s.name === sectionName);
              if (!matchedSection) {
                result.status = 'error';
                result.errors.push(`Lớp HP "${sectionName}" không tồn tại`);
                result.invalidFields.push('Tên lớp HP');
              } else {
                result.transformedData = {
                  sectionId: matchedSection.id,
                  date: date.toString(),
                  startTime: (row['Giờ bắt đầu'] || row['startTime'])?.toString() || '07:00',
                  endTime: (row['Giờ kết thúc'] || row['endTime'])?.toString() || '09:00',
                  status: 'pending',
                  createdAt: Date.now()
                };
              }
            }
            break;
          }
        }
      } catch (err) {
        result.status = 'error';
        result.errors.push('Dữ liệu không hợp lệ');
      }

      results.push(result);
    }

    setImportData(results);
  };

  const handleImport = async () => {
    const validData = importData.filter(r => r.status !== 'error').map(r => r.transformedData);
    if (validData.length === 0) return;

    setIsProcessing(true);
    try {
      await db.transaction('rw', [selectedCategory], async () => {
        const table = db[selectedCategory as keyof typeof db] as any;
        
        for (const data of validData) {
          let existing;
          if (selectedCategory === 'students') existing = await table.where('studentCode').equals(data.studentCode).first();
          else if (selectedCategory === 'teachers') existing = await table.where('teacherCode').equals(data.teacherCode).first();
          else if (selectedCategory === 'subjects') existing = await table.where('code').equals(data.code).first();
          else if (selectedCategory === 'classes' || selectedCategory === 'sections') existing = await table.where('name').equals(data.name).first();

          if (existing) {
            await table.update(existing.id, data);
          } else {
            await table.add(data);
          }
        }
      });

      alert(`Đã nhập thành công ${validData.length} dòng dữ liệu!`);
      setImportData([]);
    } catch (error) {
      console.error('Lỗi import:', error);
      alert('Đã xảy ra lỗi trong quá trình import dữ liệu.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    if (exportSelection.size === 0) return alert('Vui lòng chọn ít nhất một danh mục để xuất!');

    setIsProcessing(true);
    try {
      const wb = XLSX.utils.book_new();
      const CATEGORY_HEADERS: Record<Category, string[]> = {
        classes: ['Tên lớp', 'Khối', 'Chuyên ngành', 'Niên khóa'],
        students: ['Mã học sinh', 'Họ và tên', 'Tên lớp', 'Email'],
        teachers: ['Mã giáo viên', 'Họ và tên', 'Khoa/Bộ môn'],
        subjects: ['Mã môn học', 'Tên môn học', 'Số tín chỉ'],
        sections: ['Tên lớp HP', 'Tên môn học', 'Tên giáo viên', 'Học kỳ', 'Năm học'],
        sessions: ['Tên lớp HP', 'Ngày', 'Giờ bắt đầu', 'Giờ kết thúc']
      };

      for (const category of Array.from(exportSelection)) {
        const data = await (db[category as keyof typeof db] as any).toArray();
        const headers = CATEGORY_HEADERS[category];
        let rows = [];

        switch (category) {
          case 'classes': rows = data.map((d: any) => [d.name, d.grade, d.major || '', d.academicYear]); break;
          case 'students':
            rows = data.map((d: any) => [
              d.studentCode, d.name, dbClasses?.find(c => c.id === d.classId)?.name || 'N/A', d.email || ''
            ]);
            break;
          case 'teachers': rows = data.map((d: any) => [d.teacherCode, d.name, d.department || '']); break;
          case 'subjects': rows = data.map((d: any) => [d.code, d.name, d.credits]); break;
          case 'sections':
            rows = data.map((d: any) => [
              d.name, dbSubjects?.find(s => s.id === d.subjectId)?.name || 'N/A', dbTeachers?.find(t => t.id === d.teacherId)?.name || 'N/A', d.semester, d.schoolYear
            ]);
            break;
          case 'sessions':
            rows = data.map((d: any) => [
              dbSections?.find(s => s.id === d.sectionId)?.name || 'N/A', d.date, d.startTime, d.endTime
            ]);
            break;
        }

        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const range = { s: { c: 0, r: 0 }, e: { c: headers.length - 1, r: rows.length } };
        ws['!ref'] = XLSX.utils.encode_range(range);

        XLSX.utils.book_append_sheet(wb, ws, CATEGORIES.find(c => c.id === category)?.label || 'Dữ liệu');
      }

      XLSX.writeFile(wb, `SnapAttend_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Lỗi export:', error);
      alert('Không thể xuất tệp Excel.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsProcessing(true);
    try {
      await db.transaction('rw', [
        db.classes, db.students, db.teachers, db.subjects, 
        db.sections, db.enrollments, db.sessions, db.attendance
      ], async () => {
        await Promise.all([
          db.classes.clear(),
          db.students.clear(),
          db.teachers.clear(),
          db.subjects.clear(),
          db.sections.clear(),
          db.enrollments.clear(),
          db.sessions.clear(),
          db.attendance.clear()
        ]);
      });
      alert('Đã xóa toàn bộ dữ liệu thành công!');
      setIsConfirmingDelete(false);
    } catch (error) {
      console.error('Lỗi khi xóa dữ liệu:', error);
      alert('Không thể xóa dữ liệu. Vui lòng thử lại!');
    } finally {
      setIsProcessing(false);
    }
  };

  const stats = useMemo(() => {
    return {
      total: importData.length,
      ok: importData.filter(d => d.status === 'ok').length,
      warning: importData.filter(d => d.status === 'warning').length,
      error: importData.filter(d => d.status === 'error').length
    };
  }, [importData]);

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title="Quản lý Dữ liệu"
        description="Đưa dữ liệu vào hệ thống hoặc sao lưu ra tệp Excel để đảm bảo an toàn thông tin."
        icon={<Database className="w-8 h-8" />}
        breadcrumbs={[
          { label: 'Trang chủ' },
          { label: 'Hệ thống', active: true }
        ]}
      />

      <div className="flex gap-2 p-1 bg-foreground/5 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('import')}
          className={clsx(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-black text-xs uppercase tracking-widest",
            activeTab === 'import' ? "bg-primary text-foreground shadow-lg shadow-primary/20" : "text-foreground/40 hover:text-foreground"
          )}
        >
          <FileUp className="w-4 h-4" /> Import Excel
        </button>
        <button 
          onClick={() => setActiveTab('export')}
          className={clsx(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-black text-xs uppercase tracking-widest",
            activeTab === 'export' ? "bg-primary text-foreground shadow-lg shadow-primary/20" : "text-foreground/40 hover:text-foreground"
          )}
        >
          <FileDown className="w-4 h-4" /> Export Excel
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'import' ? (
          <motion.div key="import" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <Card className="p-8 bg-background-light/50 backdrop-blur-3xl border-foreground/5">
              <div className="flex flex-col md:flex-row gap-12">
                <div className="w-full md:w-1/3 space-y-6">
                  <h3 className="text-foreground font-black text-sm uppercase tracking-widest flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">1</div>
                    Chọn danh mục
                  </h3>
                  <div className="grid grid-cols-1 gap-2.5">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => { setSelectedCategory(cat.id); setImportData([]); }}
                        className={clsx(
                          "w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-sm font-bold",
                          selectedCategory === cat.id 
                            ? "bg-primary/10 border-primary/50 text-primary shadow-lg shadow-primary/5" 
                            : "bg-foreground/5 border-transparent text-foreground/40 hover:bg-foreground/10 hover:text-foreground/60"
                        )}
                      >
                        {cat.label}
                        {selectedCategory === cat.id && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-full md:w-2/3 space-y-6">
                  <h3 className="text-foreground font-black text-sm uppercase tracking-widest flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">2</div>
                    Tải tệp nguồn
                  </h3>
                  <label 
                    onDragOver={handleDragOver} onDrop={handleDrop}
                    className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-foreground/10 rounded-[2.5rem] cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-all group overflow-hidden relative"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 relative z-10">
                      <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                        <FileUp className="w-10 h-10 text-primary" />
                      </div>
                      <p className="mb-2 text-lg text-foreground font-black tracking-tight">Kéo thả hoặc Nhấn để chọn tệp</p>
                      <p className="text-xs text-foreground/30 font-bold uppercase tracking-widest">Hỗ trợ .XLSX, .XLS</p>
                    </div>
                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileSelect} disabled={isProcessing} />
                    
                    {/* Decorative gradient */}
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </label>
                </div>
              </div>
            </Card>

            {importData.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center justify-between bg-foreground/5 p-4 rounded-3xl border border-foreground/5">
                  <h3 className="text-sm font-black text-foreground uppercase tracking-widest ml-2">
                    Bản xem trước: {CATEGORIES.find(c => c.id === selectedCategory)?.label}
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="ghost" className="text-xs font-black uppercase text-red-500 hover:bg-red-500/10" onClick={() => setImportData([])}>
                      <Trash2 className="w-4 h-4 mr-2" /> Hủy
                    </Button>
                    <Button className="text-xs font-black uppercase shadow-lg shadow-primary/20" onClick={handleImport} disabled={isProcessing || stats.ok + stats.warning === 0}>
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Xác nhận nhập
                    </Button>
                  </div>
                </div>

                <div className="glass-card overflow-hidden rounded-[2.5rem] border border-foreground/10 shadow-2xl">
                  <div className="max-h-[600px] overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-background-light/95 backdrop-blur-md z-10">
                        <tr className="border-b border-foreground/5">
                          <th className="p-5 text-[10px] font-black text-foreground/40 uppercase tracking-widest pl-8">Trạng thái</th>
                          {Object.keys(importData[0].row).map(key => (
                            <th key={key} className="p-5 text-[10px] font-black text-foreground/40 uppercase tracking-widest">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importData.map((res, idx) => (
                          <tr key={idx} className="border-b border-foreground/5 hover:bg-primary/5 transition-colors group">
                            <td className="p-5 pl-8">
                              {res.status === 'ok' && <CheckCircle2 className="w-5 h-5 text-green-500 shadow-sm" />}
                              {res.status === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500 shadow-sm" />}
                              {res.status === 'error' && <XCircle className="w-5 h-5 text-red-500 shadow-sm" />}
                            </td>
                            {Object.entries(res.row).map(([key, value], vIdx) => (
                              <td key={vIdx} className={clsx(
                                "p-5 text-sm transition-all",
                                res.invalidFields.includes(key) ? "text-red-500 font-black bg-red-500/5" : "text-foreground/70"
                              )}>
                                {value?.toString()}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-6 bg-background-light/50 flex items-center justify-between border-t border-foreground/5">
                    <div className="flex gap-8">
                      <StatItem color="bg-primary/50" label="Tổng" count={stats.total} />
                      <StatItem color="bg-green-500" label="Hợp lệ" count={stats.ok} />
                      <StatItem color="bg-yellow-500" label="Cảnh báo" count={stats.warning} />
                      <StatItem color="bg-red-500" label="Lỗi" count={stats.error} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div key="export" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <Card className="p-8 bg-background-light/50 backdrop-blur-3xl border-foreground/5">
              <div className="space-y-8">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-lg font-black text-foreground tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-inner">
                      <FileDown className="w-5 h-5" />
                    </div>
                    Chọn dữ liệu cần sao lưu
                  </h3>
                  <div className="flex gap-3">
                    <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-foreground/40 hover:text-foreground" onClick={() => setExportSelection(new Set())}>Bỏ chọn tất cả</Button>
                    <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10" onClick={() => setExportSelection(new Set(CATEGORIES.map(c => c.id)))}>Chọn toàn bộ</Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id} onClick={() => {
                        const newSet = new Set(exportSelection);
                        if (newSet.has(cat.id)) newSet.delete(cat.id);
                        else newSet.add(cat.id);
                        setExportSelection(newSet);
                      }}
                      className={clsx(
                        "flex items-center justify-between p-6 rounded-[2rem] border transition-all group relative overflow-hidden",
                        exportSelection.has(cat.id) 
                          ? "bg-primary/10 border-primary/50 shadow-xl shadow-primary/5" 
                          : "bg-background-light/50 border-foreground/5 hover:border-foreground/10"
                      )}
                    >
                      <div className="flex items-center gap-5 relative z-10">
                        <div className={clsx(
                          "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-inner",
                          exportSelection.has(cat.id) ? "bg-primary text-foreground scale-110" : "bg-foreground/5 text-foreground/20 group-hover:bg-foreground/10"
                        )}>
                          <Database className="w-7 h-7" />
                        </div>
                        <div className="text-left">
                          <p className={clsx(
                            "font-black tracking-tight transition-colors",
                            exportSelection.has(cat.id) ? "text-foreground" : "text-foreground/40 group-hover:text-foreground/60"
                          )}>{cat.label}</p>
                          <p className="text-[9px] font-black text-foreground/20 uppercase tracking-widest">Excel Sheet</p>
                        </div>
                      </div>
                      {exportSelection.has(cat.id) && (
                        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                          <Check className="w-4 h-4 text-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="pt-10 border-t border-foreground/5 flex justify-center">
                  <Button 
                    size="lg" className="px-16 h-16 rounded-2xl shadow-2xl shadow-primary/20 group relative overflow-hidden"
                    onClick={handleExport} disabled={isProcessing || exportSelection.size === 0}
                  >
                    <span className="relative z-10 flex items-center gap-3 font-black uppercase text-xs tracking-widest">
                      <Download className="w-5 h-5" /> Tải về tệp Excel
                    </span>
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                  </Button>
                </div>
              </div>
            </Card>

            <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10 flex items-start gap-4 mx-4">
              <Info className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div className="space-y-1">
                <h4 className="font-black text-sm text-foreground uppercase tracking-tight">An toàn dữ liệu tuyệt đối</h4>
                <p className="text-xs text-foreground/40 leading-relaxed">
                  Tất cả các tệp xuất ra đều được chuẩn hóa để có thể nhập ngược lại vào hệ thống bất cứ lúc nào. SnapAttend khuyến nghị bạn nên sao lưu dữ liệu hàng tuần.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isProcessing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto shadow-2xl shadow-primary/10" />
              <div className="space-y-2">
                <p className="text-xl font-black text-foreground tracking-tight animate-pulse">Đang đồng bộ hóa...</p>
                <p className="text-xs text-foreground/30 font-bold uppercase tracking-widest">Vui lòng không đóng cửa sổ này</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-12 pt-12 border-t border-foreground/5">
        <div className="max-w-xl">
          <h3 className="text-red-500 font-black text-xs uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Vùng nguy hiểm
          </h3>
          <Card className="p-6 border-red-500/20 bg-red-500/[0.02] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <p className="font-bold text-foreground">Xóa toàn bộ dữ liệu</p>
              <p className="text-xs text-foreground/40 leading-relaxed">
                Thao tác này sẽ dọn dẹp sạch sẽ mọi thông tin trong ứng dụng. Hãy cân nhắc kỹ trước khi thực hiện.
              </p>
            </div>

            {!isConfirmingDelete ? (
              <Button 
                variant="ghost" 
                className="text-red-500 hover:bg-red-500/10 text-xs font-black uppercase tracking-widest whitespace-nowrap"
                onClick={() => setIsConfirmingDelete(true)}
              >
                Xóa ngay
              </Button>
            ) : (
              <div className="flex gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                <Button 
                  variant="secondary" 
                  className="text-[10px] font-black uppercase tracking-widest px-4 h-10"
                  onClick={() => setIsConfirmingDelete(false)}
                >
                  Hủy
                </Button>
                <Button 
                  className="bg-red-500 hover:bg-red-600 text-foreground text-[10px] font-black uppercase tracking-widest px-4 h-10 shadow-lg shadow-red-500/20"
                  onClick={handleDeleteAll}
                  disabled={isProcessing}
                >
                  Xác nhận xóa
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

const StatItem = ({ color, label, count }: { color: string; label: string; count: number }) => (
  <div className="flex items-center gap-2.5">
    <div className={clsx("w-3 h-3 rounded-full shadow-sm", color)} />
    <span className="text-[10px] text-foreground/40 uppercase font-black tracking-widest">{label}:</span>
    <span className="text-sm font-black text-foreground">{count}</span>
  </div>
);
