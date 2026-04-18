import CryptoJS from 'crypto-js';

const PIN_STORAGE_KEY = 'snapattend_pin_hash';
const SESSION_LOCK_KEY = 'snapattend_unlocked';

class AuthService {
  /**
   * Kiểm tra xem người dùng đã thiết lập mã PIN chưa
   */
  hasPin(): boolean {
    return !!localStorage.getItem(PIN_STORAGE_KEY);
  }

  /**
   * Thiết lập mã PIN mới
   */
  setPin(pin: string) {
    const hash = CryptoJS.SHA256(pin).toString();
    localStorage.setItem(PIN_STORAGE_KEY, hash);
    this.unlock(); // Tự động mở khóa sau khi thiết lập
  }

  /**
   * Kiểm tra mã PIN nhập vào
   */
  verifyPin(pin: string): boolean {
    const hash = CryptoJS.SHA256(pin).toString();
    const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
    
    if (hash === storedHash) {
      this.unlock();
      return true;
    }
    return false;
  }

  /**
   * Đánh dấu ứng dụng đã được mở khóa trong phiên hiện tại
   */
  unlock() {
    sessionStorage.setItem(SESSION_LOCK_KEY, 'true');
  }

  /**
   * Kiểm tra trạng thái mở khóa trong phiên
   */
  isUnlocked(): boolean {
    // Nếu chưa thiết lập PIN thì coi như luôn mở khóa
    if (!this.hasPin()) return true;
    return sessionStorage.getItem(SESSION_LOCK_KEY) === 'true';
  }

  /**
   * Khóa ứng dụng
   */
  lock() {
    sessionStorage.removeItem(SESSION_LOCK_KEY);
  }
}

export const authService = new AuthService();
