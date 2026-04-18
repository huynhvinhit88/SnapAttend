import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  ShieldCheck, Lock, Settings as SettingsIcon, Star,
  Plus, Calendar, Info
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { db } from '../db/db';
import { authService } from '../services/auth.service';

export const Settings = () => {
  const [pinData, setPinData] = useState({ old: '', new: '' });
  const [newYearName, setNewYearName] = useState('');

  const academicYears = useLiveQuery(() => db.academicYears.toArray());

  const handleAddYear = async () => {
    if (!newYearName.trim()) return;
    try {
      const existing = await db.academicYears.where('name').equalsIgnoreCase(newYearName.trim()).first();
      if (existing) return alert('Năm học này đã tồn tại!');

      const isFirst = (academicYears?.length || 0) === 0;
      await db.academicYears.add({
        name: newYearName.trim(),
        isDefault: isFirst,
        createdAt: Date.now()
      });
      setNewYearName('');
    } catch (err) {
      console.error(err);
    }
  };


  const handleSetDefaultYear = async (id: number) => {
    await db.transaction('rw', db.academicYears, async () => {
      await db.academicYears.toCollection().modify({ isDefault: false });
      await db.academicYears.update(id, { isDefault: true });
    });
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Cài đặt"
        description="Quản lý bảo mật và thiết lập ứng dụng."
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

        {/* Academic Year Management */}
        <Card className="h-full">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="text-primary w-6 h-6" />
            <h2 className="text-xl font-bold text-foreground">Quản lý Năm học</h2>
          </div>
          
          <div className="space-y-6">
            <div className="flex gap-2">
              <Input 
                label="Thêm năm học mới" 
                placeholder="VD: 2024-2025"
                value={newYearName}
                onChange={e => setNewYearName(e.target.value)}
                className="flex-1"
              />
              <Button className="mt-[26px] h-11 w-11 p-0 flex-shrink-0" onClick={handleAddYear}>
                <Plus className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-2 max-h-[160px] overflow-auto pr-2 custom-scrollbar border-t border-foreground/5 pt-4">
              {academicYears?.map(y => (
                <div key={y.id} className="flex items-center justify-between p-3 rounded-xl bg-foreground/5 border border-foreground/5 hover:border-foreground/10 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-foreground">{y.name}</span>
                    {y.isDefault && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-[10px] font-black uppercase tracking-widest rounded-full">
                        <Star className="w-3 h-3 fill-current" /> Mặc định
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!y.isDefault && (
                      <Button variant="ghost" className="p-1 h-7 text-[10px] uppercase font-black tracking-widest hover:bg-primary/10 text-primary" onClick={() => handleSetDefaultYear(y.id!)}>
                        Đặt mặc định
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 rounded-2xl bg-primary/5 border border-primary/10 flex gap-3">
              <Info className="w-5 h-5 text-primary shrink-0" />
              <p className="text-xs text-foreground/60 leading-relaxed">
                <strong>Lưu ý:</strong> Để xóa năm học, hãy sử dụng tính năng <strong>Dọn dẹp dữ liệu theo năm học</strong> tại mục <strong>Dữ liệu</strong>. Năm học sẽ tự động được gỡ bỏ sau khi dữ liệu liên quan đã được xóa sạch.
              </p>
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
              Dữ liệu của bạn được bảo vệ bằng lớp mã hóa an toàn ngay tại thiết bị này. 
              Mã PIN đóng vai trò là lớp bảo vệ truy cập nhanh, trong khi tất cả các dữ liệu 
              nhạy cảm (tên, mã số, hình ảnh...) đều được mã hóa bằng công nghệ cấp độ cao.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
