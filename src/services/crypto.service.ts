import CryptoJS from 'crypto-js';

const MASTER_KEY_STORAGE_KEY = 'snapattend_master_key';

class CryptoService {
  private masterKey: string;

  constructor() {
    this.masterKey = this.initMasterKey();
  }

  /**
   * Khởi tạo hoặc lấy Master Key từ localStorage.
   * Nếu chưa có (lần đầu chạy), sẽ sinh một chuỗi ngẫu nhiên 32 ký tự.
   */
  private initMasterKey(): string {
    let key = localStorage.getItem(MASTER_KEY_STORAGE_KEY);
    if (!key) {
      key = CryptoJS.lib.WordArray.random(32).toString();
      localStorage.setItem(MASTER_KEY_STORAGE_KEY, key);
    }
    return key;
  }

  /**
   * Mã hóa đối tượng dữ liệu
   */
  encrypt(data: any): string {
    const jsonStr = JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonStr, this.masterKey).toString();
  }

  /**
   * Giải mã chuỗi đã mã hóa về đối tượng gốc
   */
  decrypt(encryptedStr: string): any {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedStr, this.masterKey);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Lỗi giải mã dữ liệu:', error);
      return null;
    }
  }

  /**
   * Mã hóa dữ liệu bằng mật khẩu tùy chọn (dùng cho Backup JSON)
   */
  encryptWithPassword(data: any, password: string): string {
    const jsonStr = JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonStr, password).toString();
  }

  /**
   * Giải mã dữ liệu bằng mật khẩu (dùng cho Restore JSON)
   */
  decryptWithPassword(encryptedStr: string, password: string): any {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedStr, password);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedData);
    } catch (error) {
      return null;
    }
  }
}

export const cryptoService = new CryptoService();
