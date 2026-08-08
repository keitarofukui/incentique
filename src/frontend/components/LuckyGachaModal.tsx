import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Sparkles, X } from 'lucide-react';

export interface GachaResult {
  basePoints: number;
  multiplier: number;
  finalEarnedPoints: number;
  bonusTier: string;
  bonusLabel: string;
  actionTitle?: string;
  fromQuiz?: boolean;
}

interface LuckyGachaModalProps {
  result: GachaResult | null;
  onClose: () => void;
}

export const LuckyGachaModal: React.FC<LuckyGachaModalProps> = ({ result, onClose }) => {
  if (!result) return null;

  const [spinning, setSpinning] = useState<boolean>(true);
  const [displayedMult, setDisplayedMult] = useState<number>(1);

  const savedOnClose = useRef(onClose);
  useEffect(() => {
    savedOnClose.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!result) return;

    if (result.multiplier === 1) {
      setSpinning(false);
      setDisplayedMult(1);
      return;
    }

    // Slot reel spinning animation for 2x, 3x, 10x
    setSpinning(true);
    let count = 0;
    const interval = setInterval(() => {
      const sampleMults = [1, 2, 3, 5, 10];
      setDisplayedMult(sampleMults[Math.floor(Math.random() * sampleMults.length)]);
      count++;

      if (count > 12) {
        clearInterval(interval);
        setDisplayedMult(result.multiplier);
        setSpinning(false);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [result]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        savedOnClose.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isJackpot = result.multiplier === 10;
  const isSuper = result.multiplier === 3;

  // Don't show modal overlay for normal 1x unless it's a bonus
  if (result.multiplier <= 1) return null;

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in zoom-in duration-300 overflow-y-auto"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="ガチャ結果"
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-sm sm:max-w-md rounded-3xl p-5 sm:p-6 border-2 shadow-2xl space-y-4 sm:space-y-5 text-center my-auto max-h-[85vh] overflow-y-auto ${
          isJackpot
            ? 'bg-gradient-to-b from-amber-950 via-slate-900 to-purple-950 border-amber-400 shadow-amber-500/30'
            : isSuper
            ? 'bg-gradient-to-b from-purple-950 to-slate-900 border-cyan-400 shadow-cyan-500/30'
            : 'bg-gradient-to-b from-emerald-950 to-slate-900 border-emerald-400 shadow-emerald-500/30'
        }`}
      >

        {/* Floating background sparkles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-black uppercase tracking-wider animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>ラッキーボーナスガチャ発動！</span>
        </div>

        {/* Slot Reel Box */}
        <div className="py-2 space-y-2">
          <div className="text-xs font-bold text-slate-300">
            {result.actionTitle ? `「${result.actionTitle}」クリア！` : '獲得ポイントが倍増！'}
          </div>

          <div className="relative py-4 sm:py-5 px-4 bg-slate-950/80 rounded-2xl border border-slate-800 shadow-inner flex items-center justify-center gap-2 overflow-hidden">
            {spinning ? (
              <div className="text-4xl sm:text-5xl font-black font-mono text-cyan-400 animate-pulse tracking-widest">
                🎰 {displayedMult}x ...
              </div>
            ) : (
              <div className="space-y-1">
                <div className={`text-4xl sm:text-5xl font-black font-mono tracking-wider ${
                  isJackpot
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 animate-pulse drop-shadow-[0_0_20px_rgba(245,158,11,0.8)]'
                    : isSuper
                    ? 'text-cyan-300 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]'
                    : 'text-emerald-300 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]'
                }`}>
                  {result.bonusLabel}
                </div>

                <div className="text-xs font-bold text-amber-300 pt-1">
                  ポイントが <span className="text-base font-black font-mono underline">{result.multiplier}倍</span> にフィーバー強化！
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Points Transformation Box */}
        {!spinning && (
          <div className="bg-slate-950/90 p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-1.5 animate-in fade-in duration-300">
            <div className="flex items-center justify-center gap-3 text-xs sm:text-sm font-bold text-slate-400">
              <span>基本 {result.basePoints} pt</span>
              <span className="text-amber-400 font-mono">× {result.multiplier}</span>
            </div>

            <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono tracking-wider">
              +{result.finalEarnedPoints} <span className="text-xs">pt 獲得！</span>
            </div>
          </div>
        )}

        {/* Submit / Close Button */}
        <button
          onClick={onClose}
          className={`w-full py-3 rounded-2xl font-black text-sm text-slate-950 transition-all shadow-xl ${
            isJackpot
              ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:brightness-110 shadow-amber-500/40'
              : isSuper
              ? 'bg-gradient-to-r from-cyan-400 to-purple-400 hover:brightness-110 shadow-cyan-500/40'
              : 'bg-gradient-to-r from-emerald-400 to-teal-400 hover:brightness-110 shadow-emerald-500/40'
          }`}
        >
          {spinning ? 'スロット抽選中...' : 'ポイントを受け取る！'}
        </button>

      </div>
    </div>,
    document.body
  );
};
