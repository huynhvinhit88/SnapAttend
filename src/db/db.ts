import Dexie, { type Table } from 'dexie';
import type { 
  Class, Student, Teacher, Subject, 
  SubjectSection, Enrollment, Session, 
  AttendanceRecord, AppSettings, AcademicYear
} from '../types/database';
import { cryptoService } from '../services/crypto.service';

export class SnapAttendDB extends Dexie {
  classes!: Table<Class>;
  teachers!: Table<Teacher>;
  students!: Table<Student>;
  subjects!: Table<Subject>;
  sections!: Table<SubjectSection>;
  enrollments!: Table<Enrollment>;
  sessions!: Table<Session>;
  attendance!: Table<AttendanceRecord>;
  settings!: Table<AppSettings>;
  academicYears!: Table<AcademicYear>;

  constructor() {
    super('SnapAttendDB');
    
    this.version(3).stores({
      classes: '++id, name, grade, academicYear',
      teachers: '++id, teacherCode',
      students: '++id, studentCode, classId, academicYear',
      subjects: '++id, code, name',
      sections: '++id, subjectId, teacherId, schoolYear',
      enrollments: '++id, sectionId, studentId',
      sessions: '++id, sectionId, date',
      attendance: '++id, sessionId, studentId',
      settings: 'id',
      academicYears: '++id, name, isDefault'
    });

    // Cấu hình Middleware để tự động mã hóa/giải mã thông tin nhạy cảm
    this.setupEncryptionHooks();
  }

  private setupEncryptionHooks() {
    // Hooks cho Students
    this.students.hook('creating', (_id, obj) => {
      obj.name = obj.name ? cryptoService.encrypt(obj.name) : '';
      obj.studentCode = obj.studentCode ? cryptoService.encrypt(obj.studentCode) : '';
      if (obj.avatar) obj.avatar = cryptoService.encrypt(obj.avatar);
      if (obj.academicYear) obj.academicYear = cryptoService.encrypt(obj.academicYear);
    });

    this.students.hook('updating', (mods: any) => {
      const encryptedUpdates: any = {};
      if (mods.name) encryptedUpdates.name = cryptoService.encrypt(mods.name);
      if (mods.studentCode) encryptedUpdates.studentCode = cryptoService.encrypt(mods.studentCode);
      if (mods.avatar) encryptedUpdates.avatar = cryptoService.encrypt(mods.avatar);
      if (mods.academicYear) encryptedUpdates.academicYear = cryptoService.encrypt(mods.academicYear);
      return encryptedUpdates;
    });

    this.students.hook('reading', (obj) => {
      if (!obj) return obj;
      return {
        ...obj,
        name: obj.name ? cryptoService.decrypt(obj.name) || obj.name : obj.name,
        studentCode: obj.studentCode ? cryptoService.decrypt(obj.studentCode) || obj.studentCode : obj.studentCode,
        avatar: obj.avatar ? cryptoService.decrypt(obj.avatar) : undefined,
        academicYear: obj.academicYear ? cryptoService.decrypt(obj.academicYear) : undefined
      };
    });

    // Hooks cho Teachers
    this.teachers.hook('creating', (_id, obj) => {
      obj.name = obj.name ? cryptoService.encrypt(obj.name) : '';
    });

    this.teachers.hook('updating', (mods: any) => {
      const encryptedUpdates: any = {};
      if (mods.name) encryptedUpdates.name = cryptoService.encrypt(mods.name);
      return encryptedUpdates;
    });

    this.teachers.hook('reading', (obj) => {
      if (!obj) return obj;
      return {
        ...obj,
        name: obj.name ? cryptoService.decrypt(obj.name) || obj.name : obj.name
      };
    });
  }
}

export const db = new SnapAttendDB();
