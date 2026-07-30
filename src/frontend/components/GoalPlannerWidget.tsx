import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { User, UserGoal } from '../types';
import { Target, Calendar, Flame, Zap, Edit3, Check, TrendingUp } from 'lucide-react';

interface GoalPlannerWidgetProps {
  currentUser: User | null;
  currentGoal: UserGoal | null;
  onGoalUpdated: (newGoal: UserGoal) => void;
  onNavigate?: (tab: string) => void;
}

export const GoalPlannerWidget: React.FC<GoalPlannerWidgetProps> = ({
  currentUser,
  currentGoal,
  onGoalUpdated,
  onNavigate,
}) => {
  if (!currentUser) return null;

  // Defaults if no goal set yet
  const targetTitle = currentGoal ? currentGoal.target_title : '';
  const targetPoints = currentGoal ? currentGoal.target_points : 0;
  const targetDateStr = currentGoal ? currentGoal.target_date : '';

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>(targetTitle);
  const [editPointsStr, setEditPointsStr] = useState<string>(targetPoints ? String(targetPoints) : '');
  const [editDate, setEditDate] = useState<string>(targetDateStr || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]);
  const [loading, setLoading] = useState<boolean>(false);

  const editPoints = Number(editPointsStr) || 0;

  // Calculations
  const today = new Date();
  const targetDate = targetDateStr ? new Date(targetDateStr) : today;
  const timeDiff = targetDate.getTime() - today.getTime();
  const daysRemaining = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)));

  const pointsNeeded = Math.max(0, targetPoints - currentUser.current_points);
  const dailyRequiredPace = Math.ceil(pointsNeeded / daysRemaining);

  const progressPercent = targetPoints > 0 ? Math.min(100, Math.round((currentUser.current_points / targetPoints) * 100)) : 0;

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          targetTitle: editTitle,
          targetPoints: editPoints,
          targetDate: editDate,
        })
      });
      const data = await res.json();
      if (data.success && data.goal) {
        onGoalUpdated(data.goal);
        setIsEditing(false);
      } else {
        const updatedGoal: UserGoal = {
          id: 'goal_' + Date.now(),
          user_id: currentUser.id,
          target_title: editTitle,
          target_points: editPoints,
          target_date: editDate,
        };
        onGoalUpdated(updatedGoal);
        setIsEditing(false);
      }
    } catch (err) {
      const updatedGoal: UserGoal = {
        id: 'goal_' + Date.now(),
        user_id: currentUser.id,
        target_title: editTitle,
        target_points: editPoints,
        target_date: editDate,
      };
      onGoalUpdated(updatedGoal);
      setIsEditing(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 rounded-3xl border border-amber-500/30 space-y-6 shadow-2xl relative overflow-hidden">
      
      {/* Celebratory Banner when Goal 100% Reached */}
      {progressPercent >= 100 && targetPoints > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-amber-500/20 to-yellow-500/20 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-glow-gold">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-amber-400 animate-bounce shrink-0" />
            <div>
              <div className="font-black text-sm text-emerald-300">🎉 おめでとうございます！目標ポイント達成！</div>
              <div className="text-xs text-slate-300">「ご褒美・交換所」からポイント交換の申請を送りましょう！</div>
            </div>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('wishlist')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs hover:opacity-90 transition-all shrink-0 shadow-glow-gold"
            >
              🎁 ご褒美・交換所へ移動 ➔
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white">目標 ＆ 達成ペース計画</h3>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
                いつでも変更OK
              </span>
            </div>
            <p className="text-xs text-slate-400">期間までの残り日数から、1日あたり必要な頑張りペースを自動算出！</p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditTitle(targetTitle);
            setEditPointsStr(targetPoints ? String(targetPoints) : '');
            setEditDate(targetDateStr);
            setIsEditing(true);
          }}
          className="px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white hover:border-amber-400 transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
          <span>目標・期日を変更</span>
        </button>
      </div>

      {/* Main Goal Display Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Card 1: Target Item */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">目標のご褒美</span>
          <div className="text-base font-black text-amber-300 truncate">{targetTitle || '未設定 (目標を設定しよう)'}</div>
          <div className="text-xs text-amber-400 font-mono font-extrabold">{targetPoints.toLocaleString()} pt 目標</div>
        </div>

        {/* Card 2: Deadline */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3 text-cyan-400" /> 達成期日
          </span>
          <div className="text-base font-black text-white font-mono">{targetDateStr || '未設定'}</div>
          <div className="text-xs text-cyan-400 font-mono font-bold">{targetDateStr ? `残り ${daysRemaining} 日` : '-'}</div>
        </div>

        {/* Card 3: Remaining Points */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">必要な残りポイント</span>
          <div className="text-base font-black text-amber-400 font-mono">{pointsNeeded.toLocaleString()} pt</div>
          <div className="text-xs text-slate-400">進捗率: {progressPercent}%</div>
        </div>

        {/* Card 4: Daily Target Pace */}
        <div className="bg-gradient-to-tr from-amber-500/20 to-yellow-500/10 p-4 rounded-2xl border border-amber-500/40 space-y-1 shadow-glow-gold">
          <span className="text-[10px] font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-400" /> 1日あたりの必要ペース
          </span>
          <div className="text-2xl font-black text-amber-300 font-mono">
            {dailyRequiredPace.toLocaleString()} <span className="text-xs">pt/日</span>
          </div>
          <div className="text-[10px] text-amber-200">期日通りに達成するための目安</div>
        </div>

      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-mono text-slate-300">
          <span>目標達成度 ({progressPercent}%)</span>
          <span>{currentUser.current_points.toLocaleString()} / {targetPoints.toLocaleString()} pt</span>
        </div>
        <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 rounded-full transition-all duration-700 shadow-glow-gold"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Daily Quest Recommendation Plan */}
      <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2">
        <div className="text-xs font-extrabold text-white flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyber-neonCyan" />
            <span>期日達成のためのオススメ日課目安 (目標ペース: {dailyRequiredPace.toLocaleString()} pt/日):</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-300">
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 flex items-start gap-2.5">
            <span className="text-xl">🧠</span>
            <div className="space-y-0.5">
              <div className="font-bold text-white">クイズ中心の場合</div>
              <div className="text-xs text-cyan-400 font-mono font-extrabold">
                1日 {dailyRequiredPace.toLocaleString()} 問
              </div>
              <p className="text-[10px] text-slate-400">1問1ptで全額稼ぐ場合の目安</p>
            </div>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 flex items-start gap-2.5">
            <span className="text-xl">📚</span>
            <div className="space-y-0.5">
              <div className="font-bold text-white">読書・映画インプット中心</div>
              <div className="text-xs text-purple-400 font-mono font-extrabold">
                1日 約 {Math.max(1, Math.ceil(dailyRequiredPace / 300))} 冊/本
              </div>
              <p className="text-[10px] text-slate-400">読書(+300pt)や映画(+120pt)の感想提出</p>
            </div>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 flex items-start gap-2.5">
            <span className="text-xl">🏋️‍♂️</span>
            <div className="space-y-0.5">
              <div className="font-bold text-white">動画トレーニング組み合わせ</div>
              <div className="text-xs text-emerald-400 font-mono font-extrabold">
                1日 {Math.max(1, Math.ceil(dailyRequiredPace / 50))} 回
              </div>
              <p className="text-[10px] text-slate-400">1回あたり+50ptでトレーニング達成</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="glass-card w-full max-w-md rounded-3xl p-5 sm:p-6 border border-amber-500/40 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto scrollbar-none">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" />
              <span>目標と達成期日の変更</span>
            </h3>

            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">欲しいもの・目標タイトル</label>
                <input
                  type="text"
                  required
                  placeholder="例: ゲーム機, 好きな本, スニーカー"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">必要目標ポイント (pt)</label>
                <input
                  type="number"
                  min={100}
                  step={100}
                  placeholder="例: 5000"
                  value={editPointsStr}
                  onChange={(e) => setEditPointsStr(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">達成予定期日</label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition-all flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  <span>設定を更新する</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
