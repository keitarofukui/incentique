import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { User } from '../types';
import { UserPlus, X, Sparkles, AlertCircle } from 'lucide-react';

interface UserRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserRegistered?: (newUser: User, initialGoal?: { title: string; points: number; date: string }) => void;
  onSuccess?: (newUser: User, initialGoal?: { title: string; points: number; date: string }) => void;
}

export const UserRegisterModal: React.FC<UserRegisterModalProps> = ({
  isOpen,
  onClose,
  onUserRegistered,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState<string>('');
  const [gradeLevel, setGradeLevel] = useState<'high_3' | 'junior_1' | 'other'>('high_3');
  const [avatar, setAvatar] = useState<string>('⚡');

  // Goal Setting Onboarding Fields (Blank by default)
  const [targetTitle, setTargetTitle] = useState<string>('');
  const [targetPoints, setTargetPoints] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const avatars = ['🔥', '⚡', '🚀', '🥋', '🏆', '💎', '⚽', '🏉', '🎯', '🦁'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setErrorMsg('');
    const callback = onUserRegistered || onSuccess;

    const initialGoal = targetTitle.trim() ? {
      title: targetTitle.trim(),
      points: Number(targetPoints) || 5000,
      date: targetDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
    } : undefined;

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          gradeLevel,
          avatar
        })
      });

      const data = await res.json();
      if (data.success && data.user) {
        if (callback) callback(data.user, initialGoal);
        setName('');
        onClose();
      } else {
        // Don't fake a local user here: it looks registered but nothing was
        // saved, and it disappears on the next refresh.
        setErrorMsg(data.error || '登録に失敗しました。もう一度お試しください。');
      }
    } catch (err) {
      setErrorMsg('通信エラーが発生しました。接続を確認してもう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="glass-card w-full max-w-md rounded-3xl p-4 sm:p-6 border border-slate-700 shadow-2xl space-y-3.5 max-h-[88vh] overflow-y-auto scrollbar-none">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-cyber-neonCyan" />
            <h3 className="text-lg font-black text-white">新規ユーザー登録</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-bold">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">名前・ニックネーム</label>
            <input
              type="text"
              required
              placeholder="例: レン, タロウ"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyber-neonCyan"
            />
          </div>

          {/* Grade level / Mode */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">学年区分 / 学習レベル</label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyber-neonCyan"
            >
              <option value="high_3">高校レベル</option>
              <option value="junior_1">中学レベル</option>
              <option value="other">一般・その他</option>
            </select>
          </div>

          {/* Avatar selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">アバターアイコン</label>
            <div className="flex items-center gap-2 flex-wrap">
              {avatars.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border transition-all ${
                    avatar === a
                      ? 'bg-cyber-neonCyan/20 border-cyber-neonCyan scale-110 shadow-glow-cyan'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>



          {/* Initial Goal Setting Section */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>最初の目標（ご褒美アイテム）を設定しよう！</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">🎁 欲しいご褒美アイテム名</label>
                <input
                  type="text"
                  required
                  value={targetTitle}
                  onChange={(e) => setTargetTitle(e.target.value)}
                  placeholder="例: PlayStation 5, 図書カード"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">🎯 必要ポイント(pt)</label>
                <input
                  type="number"
                  required
                  min={100}
                  step={100}
                  value={targetPoints}
                  onChange={(e) => setTargetPoints(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 block">📅 達成目標日</label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyber-neonCyan to-cyber-neonPurple text-white font-black text-xs hover:opacity-90 transition-all flex items-center gap-1.5 shadow-glow-cyan"
            >
              <Sparkles className="w-4 h-4" />
              <span>登録してスタート</span>
            </button>
          </div>

        </form>

      </div>
    </div>,
    document.body
  );
};
