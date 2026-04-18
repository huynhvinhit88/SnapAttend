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

  async saveFolderId(folderId: string) {
    await db.settings.put({ id: 'google_drive_folder_id', value: folderId });
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

  async pickFolder(): Promise<string> {
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
            this.saveFolderId(folderId);
            resolve(folderId);
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
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,explicitlyTrash`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      if (response.status === 404) return false;
      const data = await response.json();
      return !data.explicitlyTrash;
    } catch (err) {
      return false;
    }
  }

  async uploadFile(name: string, content: string | Blob | Uint8Array, mimeType: string = 'application/json'): Promise<any> {
    let folderId = await this.getFolderId();
    
    // Kiểm tra folder tồn tại, nếu không thì bắt chọn lại
    if (!folderId || !(await this.validateFolder(folderId))) {
      folderId = await this.pickFolder();
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
    const redirectUri = window.location.origin + window.location.pathname;
    const scope = 'https://www.googleapis.com/auth/drive.file';
    
    return `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${config.clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${encodeURIComponent(state)}` +
      `&prompt=consent`;
  }

  handleRedirectCallback(): string | null {
    const hash = window.location.hash;
    if (!hash) return null;

    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    
    if (token) {
      this.accessToken = token;
      // Clear hash from URL for clean look
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      return token;
    }
    
    return null;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }
}

export const googleDriveService = new GoogleDriveService();
