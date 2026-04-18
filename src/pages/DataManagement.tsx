import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import * as XLSX from 'xlsx';
import { 
  FileUp, FileDown, CheckCircle2, AlertTriangle, 
  XCircle, Database, Trash2, 
  Cloud, RefreshCw, Search, History,
  FileJson, CloudUpload, CloudDownload, Calendar
} from 'lucide-react';
import { db } from '../db/db';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { PageHeader } from '../components/ui/PageHeader';
import { Modal } from '../components/ui/Modal';
import { googleDriveService } from '../services/googleDrive.service';
import { backupService } from '../services/backup.service';

type Category = 'classes' | 'students' | 'teachers' | 'subjects' | 'sections' | 'sessions';

interface ValidationResult {
  row: any;
  status: 'ok' | 'warning' | 'error';
  errors: string[];
  warnings: string[];
  invalidFields: string[];
  transformedData: any;
}

const StatItem = ({ color, label, count }: { color: string; label: string; count: number }) => (
  <div className="flex items-center gap-2.5">
    <div className={clsx("w-3 h-3 rounded-full shadow-sm", color)} />
    <span className="text-[10px] text-foreground/40 uppercase font-black tracking-widest">{label}:</span>
    <span className="text-sm font-black text-foreground">{count}</span>
  </div>
);

const CATEGORIES: { id: Category; label: string; icon: any }[] = [
  { id: 'classes', label: 'Quản lý Lớp', icon: Database },
  { id: 'students', label: 'Học sinh', icon: Database },
  { id: 'teachers', label: 'Giáo viên', icon: Database },
  { id: 'subjects', label: 'Môn học', icon: Database },
  { id: 'sections', label: 'Lớp học phần', icon: Database },
  { id: 'sessions', label: 'Ca học', icon: Database },
];

export const DataManagement = () => {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'cloud'>('import');
  const [selectedCategory, setSelectedCategory] = useState<Category>('classes');
  const [importData, setImportData] = useState<ValidationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportSelection, setExportSelection] = useState<Set<Category>>(new Set());
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  
  // Cloud Sync State
  const [cloudFiles, setCloudFiles] = useState<any[]>([]);
  const [excelCloudFiles, setExcelCloudFiles] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(googleDriveService.isConnected());
  const [isCloudPickerOpen, setIsCloudPickerOpen] = useState(false);

  // Lấy dữ liệu từ DB để validation
  const dbClasses = useLiveQuery(() => db.classes.toArray());
  const dbStudents = useLiveQuery(() => db.students.toArray());
  const dbTeachers = useLiveQuery(() => db.teachers.toArray());
  const dbSubjects = useLiveQuery(() => db.subjects.toArray());
  const dbSections = useLiveQuery(() => db.sections.toArray());
  const academicYears = useLiveQuery(() => db.academicYears.toArray());
  const [selectedYearToDelete, setSelectedYearToDelete] = useState('');

  const handleDeleteYear = async () => {
    if (!selectedYearToDelete) return;
    
    // Đếm dữ liệu sẽ xóa
    const sectionsToDelete = await db.sections.where('schoolYear').equals(selectedYearToDelete).toArray();
    const sectionIds = sectionsToDelete.map(s => s.id!);
    
    const sessionsToDelete = await db.sessions.where('sectionId').anyOf(sectionIds).toArray();
    const sessionIds = sessionsToDelete.map(s => s.id!);
    
    const enrollmentsCount = await db.enrollments.where('sectionId').anyOf(sectionIds).count();
    const attendanceCount = await db.attendance.where('sessionId').anyOf(sessionIds).count();
    const classesToDelete = await db.classes.where('academicYear').equals(selectedYearToDelete).toArray();
    const classIds = classesToDelete.map(c => c.id!);
    const studentsCount = await db.students.where('classId').anyOf(classIds).count();

    const confirmMsg = `Bạn có chắc chắn muốn xóa TOÀN BỘ dữ liệu của năm học ${selectedYearToDelete}?\n\n` +
      `Dữ liệu sẽ mất:\n` +
      `- ${classesToDelete.length} Lớp hành chính\n` +
      `- ${studentsCount} Học sinh thuộc lớp hành chính\n` +
      `- ${sectionsToDelete.length} Lớp học phần\n` +
      `- ${enrollmentsCount} Ghi danh lớp phần\n` +
      `- ${sessionsToDelete.length} Ca dạy\n` +
      `- ${attendanceCount} Bản ghi điểm danh\n\n` +
      `Thao tác này KHÔNG THỂ hoàn tác!`;

    if (confirm(confirmMsg)) {
      setIsProcessing(true);
      try {
        await db.transaction('rw', [
          db.classes, db.students, db.sections, 
          db.enrollments, db.sessions, db.attendance,
          db.academicYears
        ], async () => {
          // 1. Xóa Attendance
          await db.attendance.where('sessionId').anyOf(sessionIds).delete();
          // 2. Xóa Sessions
          await db.sessions.where('sectionId').anyOf(sectionIds).delete();
          // 3. Xóa Enrollments
          await db.enrollments.where('sectionId').anyOf(sectionIds).delete();
          // 4. Xóa Sections
          await db.sections.where('schoolYear').equals(selectedYearToDelete).delete();
          // 5. Xóa Students
          await db.students.where('classId').anyOf(classIds).delete();
          // 6. Xóa Classes
          await db.classes.where('academicYear').equals(selectedYearToDelete).delete();
          // 7. Xóa chính năm học đó khỏi danh sách quản lý
          await db.academicYears.where('name').equals(selectedYearToDelete).delete();
        });
        
        alert(`Đã dọn dẹp thành công dữ liệu năm học ${selectedYearToDelete}!`);
        setSelectedYearToDelete('');
      } catch (error) {
        console.error(error);
        alert('Lỗi hệ thống: Không thể xóa dữ liệu.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Cloud Sync Logic
  const fetchCloudFiles = async () => {
    // Không tự động authenticate ở đây vì sẽ bị chặn popup (do không phải user gesture)
    if (!googleDriveService.isConnected()) {
      setIsConnected(false);
      return;
    }

    try {
      setIsSyncing(true);
      setIsConnected(true);
      const files = await googleDriveService.listFiles('application/json');
      setCloudFiles(files.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()));
    } catch (error) {
      console.error(error);
      setIsConnected(false);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectDrive = async () => {
    setIsSyncing(true);
    try {
      await googleDriveService.authenticate();
      setIsConnected(true);
      alert('Đã kết nối Google Drive thành công!');
      fetchCloudFiles();
    } catch (error) {
      console.error(error);
      alert('Không thể kết nối Google Drive. Vui lòng kiểm tra pop-up hoặc cài đặt.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCloudBackup = async () => {
    // Đăng nhập ngay lập tức để giữ user gesture (quan trọng cho mobile/PWA)
    try {
      await googleDriveService.authenticate();
      setIsConnected(true);
    } catch (error) {
      return alert('Vui lòng cho phép mở cửa sổ đăng nhập Google.');
    }

    setIsSyncing(true);
    try {
      const content = await backupService.exportData();
      const fileName = `SnapAttend_Sync_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      await googleDriveService.uploadFile(fileName, content);
      alert('Đã sao lưu lên Google Drive thành công!');
      fetchCloudFiles();
    } catch (error) {
      console.error(error);
      alert('Lỗi sao lưu: ' + (typeof error === 'string' ? error : 'Vui lòng kiểm tra kết nối Google Drive trong Cài đặt'));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreFromCloud = async (fileId: string) => {
    if (!confirm('Bạn có chắc chắn muốn khôi phục dữ liệu từ bản sao lưu này? Dữ liệu hiện tại sẽ bị ghi đè.')) return;
    
    // Đăng nhập ngay lập tức để giữ user gesture
    try {
      await googleDriveService.authenticate();
      setIsConnected(true);
    } catch (error) {
      return alert('Vui lòng cho phép mở cửa sổ đăng nhập Google.');
    }

    setIsSyncing(true);
    try {
      const buffer = await googleDriveService.downloadFile(fileId);
      const content = new TextDecoder().decode(buffer);
      const success = await backupService.importData(content);
      if (success) {
        alert('Khôi phục dữ liệu thành công! Ứng dụng sẽ tải lại.');
        window.location.reload();
      } else {
        alert('Khôi phục thất bại. Định dạng file không hợp lệ.');
      }
    } catch (error) {
      console.error(error);
      alert('Lỗi khôi phục: ' + (typeof error === 'string' ? error : 'Vui lòng kiểm tra lại cấu hình'));
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'cloud') {
      fetchCloudFiles();
    }
  }, [activeTab]);

  // Excel Logic
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
              grade: (row['Khối đào tạo'] || row['Khối'] || row['grade'])?.toString() || 'Khối 10',
              major: (row['Chuyên ngành'] || row['major'])?.toString(),
              academicYear: (row['Năm học'] || row['Niên khóa'] || row['academicYear'])?.toString(),
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
                  academicYear: (row['Niên khóa'] || row['academicYear'])?.toString(),
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

  const handleExport = async (isCloud: boolean = false) => {
    if (exportSelection.size === 0) return alert('Vui lòng chọn ít nhất một danh mục để xuất!');

    if (isCloud) {
      // Đăng nhập ngay lập tức để giữ user gesture
      try {
        await googleDriveService.authenticate();
        setIsConnected(true);
      } catch (error) {
        return alert('Vui lòng cho phép mở cửa sổ đăng nhập Google.');
      }
    }

    setIsProcessing(true);
    try {
      const wb = XLSX.utils.book_new();
      const CATEGORY_HEADERS: Record<Category, string[]> = {
        classes: ['Tên lớp', 'Khối đào tạo', 'Chuyên ngành', 'Năm học'],
        students: ['Mã học sinh', 'Họ và tên', 'Tên lớp', 'Email', 'Niên khóa'],
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
              d.studentCode, d.name, dbClasses?.find(c => c.id === d.classId)?.name || 'N/A', d.email || '', d.academicYear || ''
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

      const fileName = `SnapAttend_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      if (isCloud) {
        const excelBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        await googleDriveService.uploadFile(fileName, excelBuffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        alert('Đã lưu tệp Excel lên Google Drive thành công!');
      } else {
        XLSX.writeFile(wb, fileName);
      }
    } catch (error) {
      console.error('Lỗi export:', error);
      alert('Không thể xuất tệp Excel: ' + (typeof error === 'string' ? error : 'Vui lòng kiểm tra lại cấu hình Cloud'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloudImport = async () => {
    // Đăng nhập ngay lập tức để giữ user gesture
    try {
      await googleDriveService.authenticate();
      setIsConnected(true);
    } catch (error) {
      return alert('Vui lòng cho phép mở cửa sổ đăng nhập Google.');
    }

    try {
      setIsSyncing(true);
      const files = await googleDriveService.listFiles('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      setExcelCloudFiles(files);
      setIsCloudPickerOpen(true);
    } catch (error) {
      console.error(error);
      alert('Không thể lấy danh sách tệp từ Drive: ' + error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectCloudExcel = async (fileId: string) => {
    setIsProcessing(true);
    setIsCloudPickerOpen(false);
    try {
      const buffer = await googleDriveService.downloadFile(fileId);
      const wb = XLSX.read(buffer, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      await validateData(data);
    } catch (error) {
      console.error('Lỗi đọc file từ Drive:', error);
      alert('Không thể đọc tệp Excel từ Drive.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsProcessing(true);
    try {
      await db.transaction('rw', [
        db.classes, db.students, db.teachers, db.subjects, 
        db.sections, db.enrollments, db.sessions, db.attendance,
        db.academicYears
      ], async () => {
        await Promise.all([
          db.classes.clear(),
          db.students.clear(),
          db.teachers.clear(),
          db.subjects.clear(),
          db.sections.clear(),
          db.enrollments.clear(),
          db.sessions.clear(),
          db.attendance.clear(),
          db.academicYears.clear()
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

      {/* Tab Switcher */}
      <div className="flex p-1 bg-foreground/5 rounded-2xl w-fit mb-8">
        <button
          onClick={() => setActiveTab('import')}
          className={clsx(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all",
            activeTab === 'import' ? "bg-background text-primary shadow-sm" : "text-foreground/40 hover:text-foreground"
          )}
        >
          <FileUp className="w-4 h-4" />
          Nhập Excel
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={clsx(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all",
            activeTab === 'export' ? "bg-background text-primary shadow-sm" : "text-foreground/40 hover:text-foreground"
          )}
        >
          <FileDown className="w-4 h-4" />
          Xuất dữ liệu
        </button>
        <button
          onClick={() => setActiveTab('cloud')}
          className={clsx(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all",
            activeTab === 'cloud' ? "bg-background text-primary shadow-sm" : "text-foreground/40 hover:text-foreground"
          )}
        >
          <Cloud className="w-4 h-4" />
          Đám mây
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'import' ? (
          <motion.div
            key="import-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-1 border-none shadow-none">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Database className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Chọn danh mục</h3>
                </div>
                <div className="space-y-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setImportData([]);
                      }}
                      className={clsx(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all border",
                        selectedCategory === cat.id 
                          ? "bg-primary/5 border-primary text-primary" 
                          : "bg-background border-foreground/5 text-foreground/40 hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <cat.icon className="w-4 h-4" />
                        {cat.label}
                      </div>
                      {selectedCategory === cat.id && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="lg:col-span-2 border-none shadow-none flex flex-col items-center justify-center p-12 text-center">
                <div 
                  className={clsx(
                    "w-full max-w-md p-12 rounded-3xl border-2 border-dashed transition-all cursor-pointer group",
                    importData.length > 0 
                      ? "border-green-500/30 bg-green-500/5" 
                      : "border-foreground/10 hover:border-primary/30 hover:bg-primary/5"
                  )}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('excel-upload')?.click()}
                >
                  <input 
                    id="excel-upload" 
                    type="file" 
                    className="hidden" 
                    accept=".xlsx, .xls"
                    onChange={handleFileSelect}
                  />
                  {isProcessing ? (
                    <RefreshCw className="w-16 h-16 text-primary animate-spin mx-auto mb-6" />
                  ) : importData.length > 0 ? (
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
                  ) : (
                    <FileUp className="w-16 h-16 text-foreground/10 group-hover:text-primary/40 mx-auto mb-6 transition-colors" />
                  )}
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {importData.length > 0 ? 'Tệp đã sẵn sàng' : 'Tải lên tệp Excel'}
                  </h3>
                  <p className="text-foreground/40 text-sm mb-6">
                    Kéo thả hoặc nhấn để chọn tệp .xlsx mẫu tương ứng với danh mục
                  </p>
                  {importData.length > 0 && (
                    <Button variant="secondary" onClick={(e) => {
                      e.stopPropagation();
                      setImportData([]);
                    }}>
                      <Trash2 className="w-4 h-4" />
                      Chọn tệp khác
                    </Button>
                  )}
                  
                  {importData.length === 0 && (
                    <div className="mt-4 pt-4 border-t border-foreground/5 flex flex-col items-center gap-2">
                       <p className="text-[10px] text-foreground/20 font-black uppercase tracking-widest mb-2">Hoặc chọn từ đám mây</p>
                       <Button variant="ghost" className="border border-primary/20 hover:bg-primary/5 text-primary" onClick={(e) => {
                         e.stopPropagation();
                         handleCloudImport();
                       }}>
                         <Cloud className="w-4 h-4" />
                         Chọn từ Drive
                       </Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {importData.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center justify-between bg-foreground/5 p-4 rounded-3xl border border-foreground/5">
                  <div className="flex gap-8 px-4">
                    <StatItem color="bg-primary" label="Tổng" count={stats.total} />
                    <StatItem color="bg-green-500" label="Hợp lệ" count={stats.ok} />
                    <StatItem color="bg-yellow-500" label="Cảnh báo" count={stats.warning} />
                    <StatItem color="bg-red-500" label="Lỗi" count={stats.error} />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setImportData([])}>Hủy</Button>
                    <Button 
                      disabled={stats.ok + stats.warning === 0 || isProcessing}
                      onClick={handleImport}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Nhập dữ liệu
                    </Button>
                  </div>
                </div>

                <div className="glass-card rounded-3xl overflow-hidden border border-foreground/10">
                  <div className="max-h-[500px] overflow-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-foreground/5 sticky top-0">
                        <tr>
                          <th className="p-4 font-bold">Dòng</th>
                          <th className="p-4 font-bold">Trạng thái</th>
                          {Object.keys(importData[0].row).map(key => (
                            <th key={key} className="p-4 font-bold">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importData.map((res, idx) => (
                          <tr key={idx} className="border-b border-foreground/5 hover:bg-foreground/5">
                            <td className="p-4 text-foreground/40">{idx + 1}</td>
                            <td className="p-4">
                              {res.status === 'ok' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                              {res.status === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                              {res.status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                            </td>
                            {Object.entries(res.row).map(([key, val], vIdx) => (
                              <td key={vIdx} className={clsx("p-4", res.invalidFields.includes(key) && "text-red-500 font-bold")}>
                                {String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : activeTab === 'export' ? (
          <motion.div
            key="export-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <Card className="p-8 border-none shadow-none">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Chọn danh mục xuất</h3>
                  <p className="text-sm text-foreground/40">Hãy chọn các danh mục bạn muốn xuất ra tệp Excel</p>
                </div>
                <Button 
                  variant="secondary"
                  onClick={() => {
                    if (exportSelection.size === CATEGORIES.length) setExportSelection(new Set());
                    else setExportSelection(new Set(CATEGORIES.map(c => c.id)));
                  }}
                >
                  {exportSelection.size === CATEGORIES.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      const newSelection = new Set(exportSelection);
                      if (newSelection.has(cat.id)) newSelection.delete(cat.id);
                      else newSelection.add(cat.id);
                      setExportSelection(newSelection);
                    }}
                    className={clsx(
                      "flex items-center gap-4 p-6 rounded-2xl font-bold transition-all border shadow-none text-left",
                      exportSelection.has(cat.id)
                        ? "bg-primary/5 border-primary text-primary"
                        : "bg-background border-foreground/5 text-foreground/40 hover:border-primary/30"
                    )}
                  >
                    <div className={clsx(
                      "p-3 rounded-xl transition-colors",
                      exportSelection.has(cat.id) ? "bg-primary/20" : "bg-foreground/5"
                    )}>
                      <cat.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span>{cat.label}</span>
                        {exportSelection.has(cat.id) && <CheckCircle2 className="w-5 h-5" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-3 p-6 bg-primary/5 rounded-3xl">
                <Button 
                  size="lg" 
                  variant="ghost"
                  disabled={exportSelection.size === 0 || isProcessing}
                  onClick={() => handleExport(true)}
                  className="px-8 h-14 border border-primary/30 text-primary hover:bg-primary/10"
                >
                  <CloudUpload className="w-5 h-5" />
                  Tải lên Drive
                </Button>
                <Button 
                  size="lg" 
                  disabled={exportSelection.size === 0 || isProcessing}
                  onClick={() => handleExport(false)}
                  className="px-12 h-14 text-lg"
                >
                  {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                  Xuất Excel ({exportSelection.size})
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="cloud-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <Card className="border-none shadow-none bg-primary/5 overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                  <div className="relative p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                        <Cloud className="w-6 h-6 text-primary" />
                      </div>
                      <div className={clsx(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        isConnected ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                      )}>
                        {isConnected ? 'Đã kết nối' : 'Chưa kết nối'}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Đồng bộ hoàn hảo</h3>
                    <p className="text-sm text-foreground/40 mb-6 leading-relaxed">
                      Tất cả dữ liệu được đóng gói thành file JSON và lưu trữ an toàn trong thư mục bạn chọn trên Google Drive.
                    </p>
                    
                    <div className="space-y-3">
                      {!isConnected && (
                        <Button 
                          variant="secondary"
                          className="w-full h-12 border-primary/30 text-primary hover:bg-primary/10"
                          onClick={handleConnectDrive}
                          disabled={isSyncing}
                        >
                          <RefreshCw className={clsx("w-4 h-4", isSyncing && "animate-spin")} />
                          Kết nối Google Drive
                        </Button>
                      )}
                      <Button 
                        className="w-full h-12 shadow-xl shadow-primary/20"
                        onClick={handleCloudBackup}
                        disabled={isSyncing}
                      >
                        {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                        Sao lưu lên Đám mây
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card className="border-none shadow-none">
                  <h4 className="font-bold text-foreground/60 p-4 border-b border-foreground/5 uppercase text-[10px] tracking-widest">Hướng dẫn</h4>
                  <div className="p-4 space-y-4">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black">1</div>
                      <p className="text-xs text-foreground/60 leading-relaxed">Chọn một thư mục chuyên biệt trên Drive để lưu dữ liệu.</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black">2</div>
                      <p className="text-xs text-foreground/60 leading-relaxed">Dữ liệu được lưu dưới dạng .json giúp khôi phục nguyên vẹn cấu trúc.</p>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <Card className="h-full flex flex-col border-none shadow-none">
                  <div className="px-6 py-4 border-b border-foreground/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <History className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-bold text-foreground">Lịch sử sao lưu trên Drive</h3>
                    </div>
                    <Button variant="secondary" onClick={fetchCloudFiles} disabled={isSyncing}>
                      <RefreshCw className={clsx("w-4 h-4", isSyncing && "animate-spin")} />
                    </Button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto min-h-[400px]">
                    {cloudFiles.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-12">
                        <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center mb-4">
                          <Search className="w-8 h-8 text-foreground/10" />
                        </div>
                        <p className="text-foreground/40 font-bold">Chưa có bản sao lưu nào</p>
                        <p className="text-xs text-foreground/20 max-w-xs mx-auto">Hãy nhấn "Sao lưu lên Đám mây" để lưu bản ghi đầu tiên</p>
                      </div>
                    ) : (
                      <div className="p-4 grid grid-cols-1 gap-3">
                        {cloudFiles.map((file) => (
                          <div 
                            key={file.id}
                            className="group flex items-center justify-between p-4 bg-foreground/3 rounded-2xl border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                <FileJson className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <h5 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{file.name}</h5>
                                <div className="flex gap-4 mt-0.5">
                                  <p className="text-[10px] text-foreground/40 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(file.createdTime).toLocaleString('vi-VN')}
                                  </p>
                                  <p className="text-[10px] text-foreground/40 flex items-center gap-1">
                                    <Database className="w-3 h-3" />
                                    {(parseInt(file.size || '0') / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                              </div>
                            </div>
                            <Button variant="secondary" onClick={() => handleRestoreFromCloud(file.id)}>
                              <CloudDownload className="w-4 h-4" />
                              Khôi phục
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
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
        <div className="max-w-5xl">
          <h3 className="text-red-500 font-black text-xs uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Vùng nguy hiểm
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 border-red-500/20 bg-red-500/[0.02] flex flex-col justify-between gap-6">
              <div className="space-y-1">
                <p className="font-bold text-foreground">Xóa dữ liệu theo năm học</p>
                <p className="text-xs text-foreground/40 leading-relaxed">
                  Gỡ bỏ toàn bộ lớp học, học sinh, lớp HP và điểm danh thuộc một năm học cụ thể.
                </p>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <Input 
                    label="Chọn năm học muốn xóa"
                    type="select"
                    options={[{ value: '', label: 'Chọn năm học...' }, ...(academicYears?.map(y => ({ value: y.name, label: y.name })) || [])]}
                    value={selectedYearToDelete}
                    onChange={e => setSelectedYearToDelete(e.target.value)}
                  />
                </div>
                <Button 
                  variant="ghost" 
                  disabled={!selectedYearToDelete || isProcessing}
                  className="text-red-500 hover:bg-red-500/10 text-[10px] font-black uppercase tracking-widest h-11 mt-[26px]"
                  onClick={handleDeleteYear}
                >
                  Xóa năm học
                </Button>
              </div>
            </Card>

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
      {/* Modal chọn file từ Cloud */}
      <Modal
        isOpen={isCloudPickerOpen}
        onClose={() => setIsCloudPickerOpen(false)}
        title="Chọn tệp Excel từ Drive"
      >
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {excelCloudFiles.length === 0 ? (
            <div className="text-center py-12 text-foreground/40 italic">
              Không tìm thấy tệp Excel nào trong thư mục SnapAttend.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {excelCloudFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => handleSelectCloudExcel(file.id)}
                  className="flex items-center justify-between p-4 rounded-2xl bg-foreground/5 hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                      <FileDown className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{file.name}</h5>
                      <p className="text-[10px] text-foreground/40 mt-0.5">
                        {new Date(file.createdTime).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-500 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};


