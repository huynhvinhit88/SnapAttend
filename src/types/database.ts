export type AttendanceStatus = 'present' | 'late' | 'absent_cp' | 'absent_kp';

export interface AcademicYear {
  id?: number;
  name: string;
  isDefault: boolean;
  createdAt: number;
}

export interface Class {
  id?: number;
  name: string;
  grade: string;
  major?: string;
  academicYear: string;
  createdAt: number;
}

export interface Teacher {
  id?: number;
  name: string;
  teacherCode: string;
  department?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  createdAt: number;
}

export interface Student {
  id?: number;
  name: string;
  studentCode: string;
  classId: number;
  email?: string;
  avatar?: string; // Base64 compressed
  academicYear?: string;
  createdAt: number;
}

export interface Subject {
  id?: number;
  code: string;
  name: string;
  credits: number;
  createdAt: number;
}

export interface SubjectSection {
  id?: number;
  name: string;
  subjectId: number;
  teacherId: number;
  semester: string;
  schoolYear: string;
  createdAt: number;
}

export interface Enrollment {
  id?: number;
  sectionId: number;
  studentId: number;
  createdAt: number;
}

export interface Session {
  id?: number;
  sectionId: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: 'pending' | 'completed';
  createdAt: number;
}

export interface AttendanceRecord {
  id?: number;
  sessionId: number;
  studentId: number;
  status: AttendanceStatus;
  note?: string;
  timestamp: number;
}

export interface AppSettings {
  id: string; // e.g., 'security', 'ui'
  value: any;
}
