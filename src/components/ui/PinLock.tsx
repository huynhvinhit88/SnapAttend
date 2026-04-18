import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Delete } from 'lucide-react';
import { Button } from './Button';
import { authService } from '../../services/auth.service';

interface PinLockProps {
  onSuccess: () => void;
}

export const PinLock = ({ onSuccess }: PinLockProps) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const isSettingPin = !authService.hasPin();

  const handleKeyPress = (val: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + val);
      setError(false);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    if (pin.length === 4) {
      if (isSettingPin) {
        authService.setPin(pin);
        onSuccess();
      } else {
        if (authService.verifyPin(pin)) {
          onSuccess();
        } else {
          setError(true);
          setPin('');
          // Rung báo lỗi
          if ('vibrate' in navigator) navigator.vibrate([50, 50, 50]);
        }
      }
    }
  }, [pin, isSettingPin, onSuccess]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6"
    >
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">
          {isSettingPin ? 'Thiết lập mã PIN' : 'Nhập mã PIN'}
        </h2>
        <p className="text-white/40 mb-8 text-center text-sm">
          {isSettingPin 
            ? 'Vui lòng tạo mã PIN 4 số để bảo vệ dữ liệu của bạn.' 
            : 'Ứng dụng đang khóa. Vui lòng nhập mã PIN để vào.'}
        </p>

        {/* PIN Indicators */}
        <div className="flex gap-4 mb-12">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              animate={error ? { x: [0, -10, 10, -10, 10, 0] } : {}}
              className={clsx(
                "w-4 h-4 rounded-full border-2 transition-all duration-200",
                pin.length > i 
                  ? "bg-primary border-primary scale-110 shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                  : "border-white/10"
              )}
            />
          ))}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-4 w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((val) => (
            <Button
              key={val}
              variant="secondary"
              className="h-16 text-2xl font-bold"
              onClick={() => handleKeyPress(val.toString())}
            >
              {val}
            </Button>
          ))}
          <div />
          <Button
            variant="secondary"
            className="h-16 text-2xl font-bold"
            onClick={() => handleKeyPress('0')}
          >
            0
          </Button>
          <Button
            variant="ghost"
            className="h-16 text-white/40"
            onClick={handleBackspace}
          >
            <Delete className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

import { clsx } from 'clsx';
