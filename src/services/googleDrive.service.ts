import { db } from '../db/db';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface GoogleConfig {
  clientId: string;
  apiKey: string;
}

class GoogleDriveService {
  private accessToken: string | null = null;
  private tokenClient: any = null;
  constructor() {
    this.loadScripts();
  }

  private loadScripts() {
    if (typeof window === 'undefined') return;

    // Load GAPI
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => {
      window.gapi.load('client:picker', () => {
        // GAPI Loaded
      });
    };
    document.head.appendChild(gapiScript);

    // Load GSI
    const gsiScript = document.createElement('script');
    gsiScript.src = 'https://accounts.google.com/gsi/client';
    gsiScript.async = true;
    gsiScript.defer = true;
    gsiScript.onload = () => {
      // GSI Loaded
    };
    document.head.appendChild(gsiScript);
  }

  async getConfig(): Promise<GoogleConfig> {
    const settings = await db.settings.get('google_drive_config');
    const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const envApiKey = import.meta.env.VITE_GOOGLE_API_KEY;

    return settings?.value || { 
      clientId: envClientId || '', 
      apiKey: envApiKey || '' 
    };
  }

  async saveConfig(config: GoogleConfig) {
    await db.settings.put({ id: 'google_drive_config', value: config });
  }

  async getFolderId(): Promise<string | null> {
    const settings = await db.settings.get('google_drive_folder_id');
    return settings?.value || null;
  }

  async getFolderName(): Promise<string | null> {
    const settings = await db.settings.get('google_drive_folder_name');
    return settings?.value || null;
  }

  async saveFolderInfo(folderId: string, folderName: string) {
    await db.settings.put({ id: 'google_drive_folder_id', value: folderId });
    await db.settings.put({ id: 'google_drive_folder_name', value: folderName });
  }

  async authenticate(): Promise<string> {
    const config = await this.getConfig();
    if (!config.clientId) throw new Error('Vui lòng thiết lập Google Client ID trong cài đặt.');

    return new Promise((resolve, reject) => {
      try {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: config.clientId,
          scope: 'https://www.googleapis.com/auth/drive.file',
          callback: (response: any) => {
            if (response.error !== undefined) {
              reject(response);
            }
            this.accessToken = response.access_token;
            resolve(response.access_token);
          },
        });

        if (this.accessToken) {
          resolve(this.accessToken);
        } else {
          this.tokenClient.requestAccessToken({ prompt: 'consent' });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  async pickFolder(): Promise<{ id: string, name: string }> {
    const config = await this.getConfig();
    if (!config.apiKey) throw new Error('Vui lòng thiết lập API Key trong cài đặt.');
    
    const token = await this.authenticate();

    return new Promise((resolve, reject) => {
      const picker = new window.google.picker.PickerBuilder()
        .addView(new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
          .setSelectFolderEnabled(true)
          .setMimeTypes('application/vnd.google-apps.folder'))
        .setOAuthToken(token)
        .setDeveloperKey(config.apiKey)
        .setCallback((data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const folderId = data.docs[0].id;
            const folderName = data.docs[0].name;
            this.saveFolderInfo(folderId, folderName).then(() => {
              resolve({ id: folderId, name: folderName });
            }).catch(reject);
          } else if (data.action === window.google.picker.Action.CANCEL) {
            reject('User cancelled picker');
          }
        })
        .build();
      picker.setVisible(true);
    });
  }

  async validateFolder(folderId: string): Promise<boolean> {
    if (!this.accessToken) await this.authenticate();
    
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,trashed`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) return false;
        // Nếu là lỗi quyền (403/401), ta vẫn trả về true để lệnh upload tiếp theo được thực hiện.
        // Nếu thực sự không có quyền upload, lệnh upload sẽ ném lỗi chi tiết hơn.
        return true;
      }
      
      const data = await response.json();
      return !data.trashed;
    } catch (err) {
      console.error('Lỗi validate folder (exception):', err);
      return false;
    }
  }

  async uploadFile(name: string, content: string | Blob | Uint8Array, mimeType: string = 'application/json'): Promise<any> {
    let folderId = await this.getFolderId();
    
    if (!folderId) {
      throw new Error('Chưa chọn thư mục lưu trữ trên Google Drive. Vui lòng thiết lập trong phần kết nối.');
    }

    if (!this.accessToken) await this.authenticate();

    const metadata = {
      name,
      mimeType,
      parents: [folderId]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([content as any], { type: mimeType }));

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: form
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Lỗi upload Google Drive:', errorData);
        throw new Error(errorData.error?.message || `Lỗi tải lên: ${response.status}`);
    }

    return await response.json();
  }

  async listFiles(mimeType?: string): Promise<any[]> {
    const folderId = await this.getFolderId();
    if (!folderId) throw new Error('Chưa chọn thư mục lưu trữ');

    if (!this.accessToken) await this.authenticate();

    let query = `'${folderId}' in parents and trashed = false`;
    if (mimeType) {
      query += ` and mimeType = '${mimeType}'`;
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime,size)`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    const data = await response.json();
    return data.files || [];
  }

  async listFolders(parentId?: string): Promise<any[]> {
    if (!this.accessToken) await this.authenticate();

    let query = `mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    } else {
      query += ` and 'root' in parents`;
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime)&orderBy=name`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Lỗi lấy danh sách thư mục');
    }

    const data = await response.json();
    return data.files || [];
  }

  async downloadFile(fileId: string): Promise<ArrayBuffer> {
    if (!this.accessToken) await this.authenticate();

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    return await response.arrayBuffer();
  }

  isConnected(): boolean {
    return !!this.accessToken;
  }

  async getAuthRedirectUrl(state: string = ''): Promise<string> {
    const config = await this.getConfig();
    // Luôn sử dụng Origin (địa chỉ gốc) kèm dấu gạch chéo cuối để khớp với cấu hình của bạn
    const redirectUri = window.location.origin + '/';
    const scope = 'https://www.googleapis.com/auth/drive.file';
    
    const params = new URLSearchParams({
      client_id: config.clientId.trim(),
      redirect_uri: redirectUri,
      response_type: 'token',
      scope: scope,
      state: state,
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  handleRedirectCallback(): { token: string; state: string | null } | null {
    const hash = window.location.hash;
    if (!hash) return null;

    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    const state = params.get('state');
    
    if (token) {
      this.accessToken = token;
      // Clear hash from URL for clean look
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      return { token, state };
    }
    
    return null;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  async disconnect() {
    this.accessToken = null;
    await db.settings.delete('google_drive_folder_id');
    await db.settings.delete('google_drive_folder_name');
  }
}

export const googleDriveService = new GoogleDriveService();
