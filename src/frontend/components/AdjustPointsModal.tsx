import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { X, Plus, Minus, AlertTriangle, Sparkles } from 'lucide-react';

interface AdjustPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess: (newTotalPoints: number, message: string) => void;
}

const PRESETS = { add: [10, 50, 100, 300, 500, 1000], deduct: [10, 50, 100, 300, 500] };
const TAGS = {
  add: ['📝 テスト・勉強', '🧹 特別なお手伝い', '🎯 目標達成', '🎂 お祝い', '🌟 特別ご褒美'],
  deduct: ['⚠️ 約束違反ペナルティ', '🎁 リアルご褒美交換', '🔄 誤付与の回収', '📱 スマホ時間超過'],
};

export const AdjustPointsModal: React.FC<AdjustPointsModalProps> = ({
  isOpen, onClose, user, onSuccess,
}) => {
  const [mode, setMode] = useState<'add' | 'deduct'>('add');
  const [amountInput, setAmountInput] = useState<string>('50');
  const [reasonInput, setReasonInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setMode('add');
      setAmountInput('50');
      setReasonInput('');
      setErrorMsg('');
      setLoading(false);
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const currentPoints = Number(user.current_points) || 0;
  const numAmount = parseInt(amountInput, 10) || 0;
  const calculatedPoints = mode === 'add' ? currentPoints + numAmount : currentPoints - numAmount;
  const isInsufficient = mode === 'deduct' && numAmount > currentPoints;
  const canSubmit = numAmount > 0 && reasonInput.trim().length > 0 && !isInsufficient && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/parent/adjust-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, amount: numAmount, reason: reasonInput.trim(), type: mode }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string; message?: string; newTotalPoints?: number };
      if (!res.ok || !data.success) {
        const msg = data.error || `ポイント調整に失敗しました (${res.status})`;
        console.error('[/api/parent/adjust-points] failed', res.status, msg);
        setErrorMsg(msg);
        setLoading(false);
        return;
      }
      onSuccess(data.newTotalPoints ?? calculatedPoints, data.message || 'ポイントを更新しました');
      onClose();
    } catch (err) {
      const errorText = err instanceof Error ? err.message : String(err);
      console.error('[/api/parent/adjust-points] network error', err);
      setErrorMsg(`通信エラーが発生しました: ${errorText}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg glass-card rounded-3xl border border-slate-700/80 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 shadow-2xl p-6 space-y-4 relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shadow-inner">
              {user.avatar || '⚡'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">{user.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
                  {user.grade_level === 'high_3' ? '高3' : user.grade_level === 'junior_1' ? '中1' : 'その他'}
                </span>
              </div>
              <p className="text-xs text-slate-400">所持: <span className="font-mono font-black text-amber-400">{currentPoints.toLocaleString()} pt</span></p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-950/60 border border-slate-800">
          <button
            type="button"
            onClick={() => { setMode('add'); setErrorMsg(''); }}
            className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              mode === 'add' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-glow-gold' : 'text-slate-400'
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" /> ポイントをあげる
          </button>
          <button
            type="button"
            onClick={() => { setMode('deduct'); setErrorMsg(''); }}
            className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              mode === 'deduct' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-400'
            }`}
          >
            <Minus className="w-3.5 h-3.5 text-rose-400" /> ポイントをへらす
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {PRESETS[mode].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => { setAmountInput(val.toString()); setErrorMsg(''); }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border transition-all ${
                    amountInput === val.toString()
                      ? mode === 'add' ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400' : 'bg-rose-500/30 text-rose-200 border-rose-400'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700'
                  }`}
                >
                  {mode === 'add' ? `+${val}` : `-${val}`} pt
                </button>
              ))}
              {mode === 'deduct' && currentPoints > 0 && (
                <button
                  type="button"
                  onClick={() => { setAmountInput(currentPoints.toString()); setErrorMsg(''); }}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40"
                >
                  全額 ({currentPoints}pt)
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                value={amountInput}
                onChange={(e) => { setAmountInput(e.target.value); setErrorMsg(''); }}
                placeholder="ポイント数"
                className={`w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border text-base font-mono font-black text-white focus:outline-none ${
                  isInsufficient ? 'border-rose-500/80' : 'border-slate-700 focus:border-amber-500/60'
                }`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">pt</span>
            </div>
            {isInsufficient && (
              <p className="text-xs text-rose-400 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> 所持ポイント（{currentPoints}pt）を超えています
              </p>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-bold">調整後の所持ポイント</span>
            <span className={`font-mono font-black text-sm ${isInsufficient || calculatedPoints < currentPoints ? 'text-rose-400' : calculatedPoints > currentPoints ? 'text-emerald-400' : 'text-white'}`}>
              {currentPoints.toLocaleString()} pt ➔ {calculatedPoints.toLocaleString()} pt
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-300">調整理由・メッセージ *</label>
            <div className="flex flex-wrap gap-1">
              {TAGS[mode].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => { setReasonInput(tag); setErrorMsg(''); }}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold border transition-all ${
                    reasonInput === tag ? 'bg-amber-500/25 text-amber-200 border-amber-400' : 'bg-slate-800/60 text-slate-300 border-slate-700/80'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={reasonInput}
              onChange={(e) => { setReasonInput(e.target.value); setErrorMsg(''); }}
              placeholder={mode === 'add' ? '例: テスト100点のご褒美！' : '例: 約束を守れなかったため'}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button type="button" onClick={onClose} disabled={loading} className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`px-5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 ${
                !canSubmit
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : mode === 'add'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 active:scale-95'
                  : 'bg-gradient-to-r from-rose-500 to-amber-600 text-white active:scale-95'
              }`}
            >
              {loading ? '処理中...' : mode === 'add' ? <><Sparkles className="w-3.5 h-3.5" /> +{numAmount}pt 付与</> : <><Minus className="w-3.5 h-3.5" /> -{numAmount}pt 引き落とし</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
