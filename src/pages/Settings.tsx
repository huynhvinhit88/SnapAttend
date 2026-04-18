import React, { useState, useEffect } from 'react';
import { ShieldCheck, Download, Upload, Lock, RefreshCcw, Settings as SettingsIcon, CheckCircle, Database } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { authService } from '../services/auth.service';
import { backupService } from '../services/backup.service';
import { googleDriveService } from '../services/googleDrive.service';

export const Settings = () => {
  const [pinData, setPinData] = useState({ old: '', new: '' });
  const [backupPassword, setBackupPassword] = useState('');
  const [googleConfig, setGoogleConfig] = useState({ clientId: '', apiKey: '' });
  const [folderId, setFolderId] = useState<string | null>(null);

  useEffect(() => {
    loadGoogleDriveInfo();
  }, []);

  const loadGoogleDriveInfo = async () => {
    const config = await googleDriveService.getConfig();
    const fid = await googleDriveService.getFolderId();
    setGoogleConfig(config);
    setFolderId(fid);
  };

  const handleSaveGoogleConfig = async () => {
    await googleDriveService.saveConfig(googleConfig);
    alert('Đã lưu cấu hình Google Drive!');
  };

  const handlePickFolder = async () => {
    try {
      const fid = await googleDriveService.pickFolder();
      setFolderId(fid);
      alert('Đã kết nối thư mục Google Drive thành công!');
    } catch (err) {
      console.error(err);
      alert('Lỗi khi chọn thư mục: ' + (typeof err === 'string' ? err : 'Vui lòng kiểm tra Client ID và API Key'));
    }
  };
  
  const handleUpdatePin = () => {
    if (authService.verifyPin(pinData.old)) {
      authService.setPin(pinData.new);
      alert('Đã đổi mã PIN thành công!');
      setPinData({ old: '', new: '' });
    } else {
      alert('Mã PIN cũ không chính xác!');
    }
  };

  const handleExport = async () => {
    const content = await backupService.exportData(backupPassword);
    backupService.downloadBackup(content);
    alert('Đã chuẩn bị file sao lưu thành công!');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const success = await backupService.importData(content, backupPassword);
      if (success) {
        alert('Khôi phục dữ liệu thành công! Ứng dụng sẽ tải lại.');
        window.location.reload();
      } else {
        alert('Khôi phục thất bại. Vui lòng kiểm tra mật mã file (nếu có).');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Cài đặt hệ thống"
        description="Quản lý bảo mật, dữ liệu và thiết lập ứng dụng."
        icon={<SettingsIcon className="w-8 h-8" />}
        breadcrumbs={[
          { label: 'Trang chủ' },
          { label: 'Cài đặt', active: true }
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Security Section */}
        <Card className="h-full">
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="text-primary w-6 h-6" />
            <h2 className="text-xl font-bold text-foreground">Bảo mật & Mã PIN</h2>
          </div>
          
          <div className="space-y-4">
            <Input 
              label="Mã PIN hiện tại" type="password" maxLength={4}
              value={pinData.old} onChange={e => setPinData({...pinData, old: e.target.value})}
            />
            <Input 
              label="Mã PIN mới (4 số)" type="password" maxLength={4}
              value={pinData.new} onChange={e => setPinData({...pinData, new: e.target.value})}
            />
            <Button className="w-full" onClick={handleUpdatePin}>
              Cập nhật mã PIN
            </Button>
          </div>
        </Card>

        {/* Backup Section */}
        <Card className="h-full">
          <div className="flex items-center gap-3 mb-6">
            <RefreshCcw className="text-accent w-6 h-6" />
            <h2 className="text-xl font-bold text-foreground">Sao lưu & Khôi phục</h2>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-foreground/40 mb-4">
              Dữ liệu của bạn được lưu trữ hoàn toàn trên thiết bị này. Hãy thường xuyên sao lưu để tránh mất dữ liệu.
            </p>
            
            <Input 
              label="Mật mã file sao lưu (Tùy chọn)" type="password" 
              placeholder="Để trống nếu không cần mã hóa file"
              value={backupPassword} onChange={e => setBackupPassword(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button variant="secondary" onClick={handleExport}>
                <Download className="w-4 h-4" />
                Sao lưu ngay
              </Button>
              <div className="relative">
                <Button variant="secondary" className="w-full" onClick={() => document.getElementById('import-file')?.click()}>
                  <Upload className="w-4 h-4" />
                  Khôi phục
                </Button>
                <input id="import-file" type="file" className="hidden" accept=".json" onChange={handleImport} />
              </div>
            </div>
          </div>
        </Card>

        {/* Google Drive Section */}
        <Card className="md:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.71 3h8.58l5.71 10-4.29 7.5H6.29L2 13l5.71-10zM15 18l3.43-6H5.57l3.43 6h6z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Google Drive Sync</h2>
                <p className="text-xs text-foreground/40">Tự động sao lưu và đồng bộ lên đám mây</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Input 
                label="Google Client ID"
                value={googleConfig.clientId}
                onChange={e => setGoogleConfig({...googleConfig, clientId: e.target.value})}
                placeholder="Nhập Client ID từ Google Cloud Console"
              />
              <Input 
                label="API Key"
                value={googleConfig.apiKey}
                onChange={e => setGoogleConfig({...googleConfig, apiKey: e.target.value})}
                placeholder="Nhập API Key để sử dụng Folder Picker"
              />
              <div className="flex gap-3">
                <Button className="flex-1" onClick={handleSaveGoogleConfig}>
                  Lưu cấu hình
                </Button>
                <Button variant="secondary" className="flex-1" onClick={handlePickFolder}>
                  {folderId ? 'Thay đổi thư mục lưu' : 'Chọn thư mục lưu'}
                </Button>
              </div>
            </div>

            <div className="p-4 bg-foreground/5 rounded-2xl border border-foreground/10 flex flex-col justify-center items-center text-center space-y-2">
              {folderId ? (
                <>
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                  <p className="text-sm font-bold text-foreground">Đã kết nối</p>
                  <p className="text-[10px] text-foreground/40 break-all px-2">ID: {folderId}</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-foreground/5 rounded-full flex items-center justify-center">
                    <Database className="w-6 h-6 text-foreground/20" />
                  </div>
                  <p className="text-sm font-bold text-foreground/40">Chưa kết nối</p>
                  <p className="text-[10px] text-foreground/20">Hãy chọn thư mục để kích hoạt</p>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Info Section */}
      <div className="p-6 glass-card border-primary/20 bg-primary/5">
        <div className="flex gap-4">
          <Lock className="w-6 h-6 text-primary shrink-0" />
          <div>
            <h4 className="font-bold text-foreground mb-1">Bảo mật Hybrid</h4>
            <p className="text-sm text-foreground/60">
              Dữ liệu trên máy được bảo vệ bằng Master Key riêng biệt cho từng thiết bị. 
              Mã PIN đóng vai trò là cổng truy cập. File sao lưu có thể được đặt mật khẩu riêng 
              để chuyển đổi dữ liệu an toàn giữa các thiết bị.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
