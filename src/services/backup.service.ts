import { db } from '../db/db';
import { cryptoService } from './crypto.service';

class BackupService {
  /**
   * Xuất toàn bộ dữ liệu ra file JSON mã hóa
   */
  async exportData(password?: string): Promise<string> {
    const data: any = {
      classes: await db.classes.toArray(),
      teachers: await db.teachers.toArray(),
      students: await db.students.toArray(),
      subjects: await db.subjects.toArray(),
      sections: await db.sections.toArray(),
      enrollments: await db.enrollments.toArray(),
      sessions: await db.sessions.toArray(),
      attendance: await db.attendance.toArray(),
      exportDate: new Date().toISOString()
    };

    const jsonStr = JSON.stringify(data);
    
    // Nếu có password, mã hóa thêm một lớp nữa
    if (password) {
      return cryptoService.encryptWithPassword(data, password);
    }
    
    return jsonStr;
  }

  /**
   * Khôi phục dữ liệu từ chuỗi JSON/Encrypted
   */
  async importData(content: string, password?: string): Promise<boolean> {
    try {
      let data: any;
      
      if (password) {
        data = cryptoService.decryptWithPassword(content, password);
      } else {
        data = JSON.parse(content);
      }

      if (!data || !data.classes) throw new Error('Dữ liệu không hợp lệ');

      // Thực hiện khôi phục (clear cũ và add mới)
      await db.transaction('rw', [db.classes, db.teachers, db.students, db.subjects, db.sections, db.enrollments, db.sessions, db.attendance], async () => {
        await Promise.all([
          db.classes.clear(), db.teachers.clear(), db.students.clear(),
          db.subjects.clear(), db.sections.clear(), db.enrollments.clear(),
          db.sessions.clear(), db.attendance.clear()
        ]);

        await Promise.all([
          db.classes.bulkAdd(data.classes),
          db.teachers.bulkAdd(data.teachers),
          db.students.bulkAdd(data.students),
          db.subjects.bulkAdd(data.subjects),
          db.sections.bulkAdd(data.sections),
          db.enrollments.bulkAdd(data.enrollments),
          db.sessions.bulkAdd(data.sessions),
          db.attendance.bulkAdd(data.attendance)
        ]);
      });

      return true;
    } catch (error) {
      console.error('Lỗi khôi phục dữ liệu:', error);
      return false;
    }
  }

  /**
   * Tải file về máy
   */
  downloadBackup(content: string) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `snapattend_backup_${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

export const backupService = new BackupService();
