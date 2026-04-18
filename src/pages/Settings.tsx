import React, { useState } from 'react';
import { Settings as SettingsIcon, ShieldCheck, Download, Upload, Lock, RefreshCcw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { authService } from '../services/auth.service';
import { backupService } from '../services/backup.service';
import { motion } from 'framer-motion';

export const Settings = () => {
  const [pinData, setPinData] = useState({ old: '', new: '' });
  const [backupPassword, setBackupPassword] = useState('');
  
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
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Cài đặt hệ thống</h1>
        <p className="text-white/50">Quản lý bảo mật, dữ liệu và thiết lập ứng dụng.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Security Section */}
        <Card className="h-full">
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="text-primary w-6 h-6" />
            <h2 className="text-xl font-bold text-white">Bảo mật & Mã PIN</h2>
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
            <h2 className="text-xl font-bold text-white">Sao lưu & Khôi phục</h2>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-white/40 mb-4">
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
      </div>

      {/* Info Section */}
      <div className="p-6 glass-card border-primary/20 bg-primary/5">
        <div className="flex gap-4">
          <Lock className="w-6 h-6 text-primary shrink-0" />
          <div>
            <h4 className="font-bold text-white mb-1">Bảo mật Hybrid</h4>
            <p className="text-sm text-white/60">
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
