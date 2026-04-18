import Dexie, { type Table } from 'dexie';
import type { 
  Class, Student, Teacher, Subject, 
  SubjectSection, Enrollment, Session, 
  AttendanceRecord, AppSettings 
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

  constructor() {
    super('SnapAttendDB');
    
    this.version(1).stores({
      classes: '++id, name, grade',
      teachers: '++id, teacherCode',
      students: '++id, studentCode, classId',
      subjects: '++id, code, name',
      sections: '++id, subjectId, teacherId',
      enrollments: '++id, sectionId, studentId',
      sessions: '++id, sectionId, date',
      attendance: '++id, sessionId, studentId',
      settings: 'id'
    });

    // Cấu hình Middleware để tự động mã hóa/giải mã thông tin nhạy cảm
    this.setupEncryptionHooks();
  }

  private setupEncryptionHooks() {
    // Hooks cho Students
    this.students.hook('creating', (_id, obj) => {
      obj.name = obj.name ? cryptoService.encrypt(obj.name) : '';
      obj.studentCode = obj.studentCode ? cryptoService.encrypt(obj.studentCode) : '';
      if (obj.email) obj.email = cryptoService.encrypt(obj.email);
      if (obj.avatar) obj.avatar = cryptoService.encrypt(obj.avatar);
    });

    this.students.hook('updating', (mods: any) => {
      const encryptedUpdates: any = {};
      if (mods.name) encryptedUpdates.name = cryptoService.encrypt(mods.name);
      if (mods.studentCode) encryptedUpdates.studentCode = cryptoService.encrypt(mods.studentCode);
      if (mods.email) encryptedUpdates.email = cryptoService.encrypt(mods.email);
      if (mods.avatar) encryptedUpdates.avatar = cryptoService.encrypt(mods.avatar);
      return encryptedUpdates;
    });

    this.students.hook('reading', (obj) => {
      if (!obj) return obj;
      return {
        ...obj,
        name: obj.name ? cryptoService.decrypt(obj.name) || obj.name : obj.name,
        studentCode: obj.studentCode ? cryptoService.decrypt(obj.studentCode) || obj.studentCode : obj.studentCode,
        email: obj.email ? cryptoService.decrypt(obj.email) : undefined,
        avatar: obj.avatar ? cryptoService.decrypt(obj.avatar) : undefined
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
