import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { ShieldCheck, X, AlertCircle } from 'lucide-react';

interface ParentPinAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ParentPinAuthModal: React.FC<ParentPinAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setErrorMsg('');
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setErrorMsg('');
  };

  const verifyPin = async (inputPin: string) => {
    setIsVerifying(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/parent/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: inputPin }),
      });
      const data = await res.json();
      if (data.success && data.valid) {
        setPin('');
        setErrorMsg('');
        onSuccess();
      } else {
        setErrorMsg(data.error || 'PINコードが正しくありません。初期値は 1234 です。');
        setPin('');
      }
    } catch (err) {
      setErrorMsg('通信エラーが発生しました');
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-sm glass-card p-6 rounded-3xl border border-amber-500/40 shadow-2xl space-y-6 text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-glow-gold">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-white">保護者管理者認証</h3>
          <p className="text-xs text-slate-400">
            保護者用4桁PINを入力してください<br />
            <span className="text-[11px] text-amber-400/80">（初期PINコード: 1234）</span>
          </p>
        </div>

        {/* PIN Display Dots */}
        <div className="flex justify-center gap-3 py-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-5 h-5 rounded-full border transition-all ${
                pin.length > idx
                  ? 'bg-amber-400 border-amber-300 shadow-glow-gold scale-110'
                  : 'bg-slate-900 border-slate-700'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-bold text-red-300 flex items-center justify-center gap-1.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num)}
              disabled={isVerifying}
              className="py-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xl font-bold text-white font-mono hover:bg-amber-500/20 hover:border-amber-500/40 hover:text-amber-300 transition-all active:scale-95"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleNumberClick('0')}
            disabled={isVerifying}
            className="py-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xl font-bold text-white font-mono hover:bg-amber-500/20 hover:border-amber-500/40 hover:text-amber-300 transition-all active:scale-95"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            disabled={isVerifying}
            className="py-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-sm font-bold text-slate-400 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300 transition-all active:scale-95 flex items-center justify-center"
          >
            消去
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
