import React, { useState, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.18.5/package/xlsx.mjs';
import { 
  FileUp, FileDown, CheckCircle2, AlertTriangle, 
  XCircle, Upload, Database, Download, Trash2, 
  Search, Info, Check
} from 'lucide-react';
import { db } from '../db/db';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

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
              grade: (row['Khối'] || row['grade'])?.toString(),
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
                // Kiểm tra trùng mã
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
                if (!dbSections?.some(s => s.name === name)) {
                  result.warnings.push('Sẽ tạo lớp học phần mới');
                } else {
                  result.status = 'warning';
                  result.warnings.push('Lớp học phần đã tồn tại - Sẽ cập nhật');
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
          // Xử lý cập nhật nếu trùng mã
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

      alert(`Đã import thành công ${validData.length} dòng dữ liệu!`);
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

        // Chuyển đổi dữ liệu thành dạng mảng hàng để kiểm soát cột
        switch (category) {
          case 'classes':
            rows = data.map((d: any) => [d.name, d.grade, d.major || '', d.academicYear]);
            break;
          case 'students':
            rows = data.map((d: any) => [
              d.studentCode,
              d.name,
              dbClasses?.find(c => c.id === d.classId)?.name || 'N/A',
              d.email || ''
            ]);
            break;
          case 'teachers':
            rows = data.map((d: any) => [d.teacherCode, d.name, d.department || '']);
            break;
          case 'subjects':
            rows = data.map((d: any) => [d.code, d.name, d.credits]);
            break;
          case 'sections':
            rows = data.map((d: any) => [
              d.name,
              dbSubjects?.find(s => s.id === d.subjectId)?.name || 'N/A',
              dbTeachers?.find(t => t.id === d.teacherId)?.name || 'N/A',
              d.semester,
              d.schoolYear
            ]);
            break;
          case 'sessions':
            rows = data.map((d: any) => [
              dbSections?.find(s => s.id === d.sectionId)?.name || 'N/A',
              d.date,
              d.startTime,
              d.endTime
            ]);
            break;
        }

        // Tạo worksheet từ mảng: [Tiêu đề, ...Dữ liệu]
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

        // ÉP BUỘC GIỚI HẠN VÙNG DỮ LIỆU (Manual Range)
        // Điều này đảm bảo không có cột trống nào (như cột E) bị lọt vào vùng dữ liệu của tệp
        const range = {
          s: { c: 0, r: 0 },
          e: { c: headers.length - 1, r: rows.length }
        };
        ws['!ref'] = XLSX.utils.encode_range(range);

        XLSX.utils.book_append_sheet(wb, ws, CATEGORIES.find(c => c.id === category)?.label || 'Data');
      }

      XLSX.writeFile(wb, `SnapAttend_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Lỗi export:', error);
      alert('Không thể xuất tệp Excel.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleExportSelection = (cat: Category) => {
    const newSelection = new Set(exportSelection);
    if (newSelection.has(cat)) newSelection.delete(cat);
    else newSelection.add(cat);
    setExportSelection(newSelection);
  };

  // Tính toán số lượng import
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Quản lý Dữ liệu</h1>
          <p className="text-white/50">Đưa dữ liệu vào hệ thống hoặc sao lưu ra tệp Excel.</p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-white/5 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('import')}
          className={clsx(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-bold text-sm",
            activeTab === 'import' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/40 hover:text-white"
          )}
        >
          <FileUp className="w-4 h-4" />
          Import Dữ liệu
        </button>
        <button 
          onClick={() => setActiveTab('export')}
          className={clsx(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-bold text-sm",
            activeTab === 'export' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/40 hover:text-white"
          )}
        >
          <FileDown className="w-4 h-4" />
          Export Dữ liệu
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'import' ? (
          <motion.div 
            key="import" 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <Card className="p-8">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-1/3 space-y-4">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" />
                    Bước 1: Chọn danh mục
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => { setSelectedCategory(cat.id); setImportData([]); }}
                        className={clsx(
                          "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-sm",
                          selectedCategory === cat.id 
                            ? "bg-primary/10 border-primary text-primary" 
                            : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10"
                        )}
                      >
                        {cat.label}
                        {selectedCategory === cat.id && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-full md:w-2/3 space-y-4">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <Upload className="w-4 h-4 text-primary" />
                    Bước 2: Tải tệp lên
                  </h3>
                  <label 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-white/10 rounded-3xl cursor-pointer hover:bg-white/5 hover:border-primary/50 transition-all group"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <FileUp className="w-8 h-8 text-primary" />
                      </div>
                      <p className="mb-2 text-sm text-white font-medium">Nhấn để tải hoặc kéo thả file Excel vào đây</p>
                      <p className="text-xs text-white/30 italic">Hỗ trợ .xlsx, .xls</p>
                    </div>
                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileSelect} disabled={isProcessing} />
                  </label>
                </div>
              </div>
            </Card>

            {importData.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    Xem trước dữ liệu ({selectedCategory})
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setImportData([])}>
                      <Trash2 className="w-4 h-4" />
                      Hủy bỏ
                    </Button>
                    <Button onClick={handleImport} disabled={isProcessing || stats.ok + stats.warning === 0}>
                      <CheckCircle2 className="w-4 h-4" />
                      Xác nhận Import
                    </Button>
                  </div>
                </div>

                <div className="glass-card overflow-hidden rounded-3xl border border-white/10">
                  <div className="max-h-[600px] overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-background-light z-10 shadow-lg">
                        <tr className="border-b border-white/10">
                          <th className="p-4 text-[10px] font-bold text-white/40 uppercase tracking-widest pl-6">Trạng thái</th>
                          {Object.keys(importData[0].row).map(key => (
                            <th key={key} className="p-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importData.map((res, idx) => (
                          <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                            <td className="p-4 pl-6">
                              {res.status === 'ok' && <CheckCircle2 className="w-5 h-5 text-green-500" title="Hợp lệ" />}
                              {res.status === 'warning' && (
                                <div className="relative">
                                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                                  <div className="absolute left-full ml-2 top-0 hidden group-hover:block bg-yellow-500 text-black text-[10px] px-2 py-1 rounded whitespace-nowrap z-20">
                                    {res.warnings.join(', ')}
                                  </div>
                                </div>
                              )}
                              {res.status === 'error' && (
                                <div className="relative">
                                  <XCircle className="w-5 h-5 text-red-500" />
                                  <div className="absolute left-full ml-2 top-0 hidden group-hover:block bg-red-500 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-20">
                                    {res.errors.join(', ')}
                                  </div>
                                </div>
                              )}
                            </td>
                            {Object.entries(res.row).map(([key, value], vIdx) => (
                              <td key={vIdx} className={clsx(
                                "p-4 text-sm transition-colors",
                                res.invalidFields.includes(key) ? "text-red-500 font-bold bg-red-500/5" : "text-white/70"
                              )}>
                                {value?.toString()}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 bg-white/5 flex items-center justify-between border-t border-white/10">
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-white/30" />
                        <span className="text-xs text-white/40 uppercase font-bold tracking-widest">Tổng: {stats.total}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs text-green-500 uppercase font-bold tracking-widest">Hợp lệ: {stats.ok}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        <span className="text-xs text-yellow-500 uppercase font-bold tracking-widest">Cảnh báo: {stats.warning}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-xs text-red-500 uppercase font-bold tracking-widest">Lỗi: {stats.error}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="export" 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <Card className="p-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Download className="w-5 h-5 text-primary" />
                    Chọn danh mục cần xuất
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setExportSelection(new Set())}>Bỏ chọn tất cả</Button>
                    <Button variant="ghost" onClick={() => setExportSelection(new Set(CATEGORIES.map(c => c.id)))}>Chọn tất cả</Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => toggleExportSelection(cat.id)}
                      className={clsx(
                        "flex items-center justify-between p-6 rounded-3xl border transition-all group relative overflow-hidden",
                        exportSelection.has(cat.id) 
                          ? "bg-primary/10 border-primary shadow-lg shadow-primary/10" 
                          : "bg-white/5 border-white/5 hover:border-white/10"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={clsx(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                          exportSelection.has(cat.id) ? "bg-primary text-white" : "bg-white/5 text-white/30 group-hover:bg-white/10"
                        )}>
                          <cat.icon className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                          <p className={clsx(
                            "font-bold transition-colors",
                            exportSelection.has(cat.id) ? "text-white" : "text-white/50"
                          )}>{cat.label}</p>
                          <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">XLSX Format</p>
                        </div>
                      </div>
                      {exportSelection.has(cat.id) && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="pt-8 border-t border-white/10 flex justify-end">
                  <Button 
                    size="lg" 
                    className="px-12"
                    onClick={handleExport}
                    disabled={isProcessing || exportSelection.size === 0}
                  >
                    <FileDown className="w-5 h-5 mr-2" />
                    Bắt đầu Xuất File
                  </Button>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card p-6 border border-primary/10 rounded-3xl">
                <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  Lưu ý khi xuất tệp
                </h4>
                <ul className="space-y-2 text-sm text-white/40 list-disc list-inside">
                  <li>Tệp xuất ra tuân thủ định dạng chuẩn để có thể import ngược lại.</li>
                  <li>Dữ liệu nhạy cảm (Tên, Mã số) sẽ được tự động giải mã khi xuất.</li>
                  <li>Mỗi danh mục được chọn sẽ là một "Sheet" riêng trong tệp Excel.</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <div className="text-center space-y-4">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-white font-bold animate-pulse">Đang xử lý dữ liệu...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
