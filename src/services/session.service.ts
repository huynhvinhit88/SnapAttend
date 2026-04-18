import { addDays, format, isAfter, parseISO, getDay } from 'date-fns';
import { db } from '../db/db';

interface RecurringPattern {
  sectionId: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  daysOfWeek: number[]; // 0 (CN) - 6 (Thứ 7)
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
}

class SessionService {
  /**
   * Tự động tạo hàng loạt ca học dựa trên lịch định kỳ
   */
  async generateSessions(pattern: RecurringPattern) {
    const { sectionId, startDate, endDate, daysOfWeek, startTime, endTime } = pattern;
    
    let currentDate = parseISO(startDate);
    const lastDate = parseISO(endDate);
    const sessionsToAdd = [];

    while (!isAfter(currentDate, lastDate)) {
      const day = getDay(currentDate);
      
      if (daysOfWeek.includes(day)) {
        sessionsToAdd.push({
          sectionId,
          date: format(currentDate, 'yyyy-MM-dd'),
          startTime,
          endTime,
          status: 'pending' as const,
          createdAt: Date.now()
        });
      }
      
      currentDate = addDays(currentDate, 1);
    }

    if (sessionsToAdd.length > 0) {
      await db.sessions.bulkAdd(sessionsToAdd);
    }
    
    return sessionsToAdd.length;
  }
}

export const sessionService = new SessionService();
