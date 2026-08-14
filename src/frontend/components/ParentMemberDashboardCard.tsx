import React from 'react';
import { User, ActionLog, WishItem } from '../types';
import { getLogicalDaysDiff, todayLogicalDateStr, logLogicalDateStr } from '../dateUtils';
import { Flame, Trophy, Zap, Gift, BookOpen, Dumbbell, Utensils, CheckCircle2, ChevronRight, AlertCircle, History } from 'lucide-react';

interface ParentMemberDashboardCardProps {
  user: User;
  actionLogs: ActionLog[];
  wishItems: WishItem[];
  midThreshold?: number;
  godThreshold?: number;
  onSelectUserFilter: (userId: string, targetSubTab: 'requests_logs') => void;
}

export const ParentMemberDashboardCard: React.FC<ParentMemberDashboardCardProps> = ({
  user,
  actionLogs,
  wishItems,
  midThreshold = 100,
  godThreshold = 250,
  onSelectUserFilter,
}) => {
  const todayStr = todayLogicalDateStr();

  // 1. 該当ユーザーの本日（朝4時区切り論理日）のログを集計
  const userTodayLogs = actionLogs.filter(
    (log) => log.user_id === user.id && logLogicalDateStr(log.created_at) === todayStr
  );

  // 本日の獲得ポイント（素点・ボーナス・合計）
  let todayBasePoints = 0;
  let todayBonusPoints = 0;
  let todayTotalPoints = 0;

  let quizCount = 0;
  let hasInput = false;
  let hasTraining = false;
  let hasMeal = false;

  userTodayLogs.forEach((log) => {
    todayTotalPoints += log.earned_points || 0;
    if (log.category === 'bonus') {
      todayBonusPoints += log.earned_points || 0;
    } else {
      if (log.base_points !== undefined && log.base_points !== null) {
        todayBasePoints += log.base_points;
        todayBonusPoints += (log.earned_points || 0) - log.base_points;
      } else {
        todayBasePoints += log.earned_points || 0;
      }
    }

    if (log.category === 'quiz') {
      quizCount += 1;
    } else if (['input_book', 'input_manga', 'input_movie'].includes(log.category)) {
      hasInput = true;
    } else if (log.category === 'training') {
      hasTraining = true;
    } else if (['eat_rice', 'eat_meat'].includes(log.category)) {
      hasMeal = true;
    }
  });

  // 2. DB連続日数の動的補正（2日以上未活動なら0日補正）
  const diffDaily = getLogicalDaysDiff(user.last_action_date);
  const diffMid = getLogicalDaysDiff(user.last_50pt_date);
  const diffGod = getLogicalDaysDiff(user.last_100pt_date);

  const streakDaily = diffDaily <= 1 ? (user.current_streak_days || 0) : 0;
  const streakMid = diffMid <= 1 ? (user.current_50pt_streak_days || 0) : 0;
  const streakGod = diffGod <= 1 ? (user.current_100pt_streak_days || 0) : 0;

  // 3. 未承認の申請アイテム（このユーザーのもの）
  const userClaimedWishes = wishItems.filter(
    (item) => item.user_id === user.id && item.is_claimed && !item.is_approved
  );

  return (
    <div className="glass-card p-5 sm:p-6 rounded-3xl border border-slate-800 bg-slate-900/90 space-y-5 shadow-xl transition-all hover:border-slate-700 relative overflow-hidden flex flex-col justify-between">
      {/* Background Subtle Accent */}
      <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />

      <div className="space-y-4">
        {/* HEADER: User Info & Wish Alert */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl shadow-inner shrink-0">
              {user.avatar || '⚡'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-white">{user.name}</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
                  {user.grade_level === 'high_3' ? '高3' : user.grade_level === 'junior_1' ? '中1' : 'その他'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {user.id}</p>
            </div>
          </div>

          {userClaimedWishes.length > 0 && (
            <button
              onClick={() => onSelectUserFilter(user.id, 'requests_logs')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-black animate-pulse hover:bg-rose-500/30 transition-all shrink-0"
              title="未承認のリクエストがあります"
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>未承認 {userClaimedWishes.length}件</span>
            </button>
          )}
        </div>

        {/* POINTS SUMMARY (Total & Today) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-1">
            <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <span>通算所持ポイント</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
              {(user.current_points || 0).toLocaleString()} <span className="text-xs text-amber-300">pt</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-1">
            <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
              <span>本日の獲得ポイント</span>
              {userTodayLogs.length > 0 && (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                  {userTodayLogs.length}件の活動
                </span>
              )}
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              +{todayTotalPoints.toLocaleString()} <span className="text-xs text-emerald-300">pt</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
              <span>素点: {todayBasePoints}</span>
              <span>ボーナス: {todayBonusPoints}</span>
            </div>
          </div>
        </div>

        {/* STREAK COUNTERS (3 Types) */}
        <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-2.5">
          <div className="text-xs font-black text-slate-300 flex items-center gap-1.5 border-b border-slate-800/60 pb-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <span>連続達成ステータス</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {/* 1. Daily Streak */}
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>通常連続</span>
              </div>
              <div className={`text-base font-black font-mono mt-0.5 ${streakDaily > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                {streakDaily} <span className="text-[10px]">日</span>
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">
                {diffDaily === 0 ? '本日完了' : diffDaily === 1 ? '昨日活動' : '失効中'}
              </div>
            </div>

            {/* 2. Mid Streak */}
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
                <Flame className="w-3 h-3 text-orange-400" />
                <span>{midThreshold}pt連続</span>
              </div>
              <div className={`text-base font-black font-mono mt-0.5 ${streakMid > 0 ? 'text-orange-400' : 'text-slate-500'}`}>
                {streakMid} <span className="text-[10px]">日</span>
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">
                {diffMid === 0 ? '本日達成' : diffMid === 1 ? '昨日達成' : '未達成'}
              </div>
            </div>

            {/* 3. God Streak */}
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
                <Trophy className="w-3 h-3 text-purple-400" />
                <span>{godThreshold}pt連続</span>
              </div>
              <div className={`text-base font-black font-mono mt-0.5 ${streakGod > 0 ? 'text-purple-400' : 'text-slate-500'}`}>
                {streakGod} <span className="text-[10px]">日</span>
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">
                {diffGod === 0 ? '本日達成' : diffGod === 1 ? '昨日達成' : '未達成'}
              </div>
            </div>
          </div>
        </div>

        {/* TODAY'S CATEGORY PROGRESS */}
        <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-2">
          <div className="text-xs font-black text-slate-300 flex items-center justify-between">
            <span>本日のアクティビティ</span>
            <span className="text-[10px] text-slate-400">
              {[quizCount > 0, hasInput, hasTraining, hasMeal].filter(Boolean).length} / 4 カテゴリ
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className={`p-2 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
              quizCount > 0
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                : 'bg-slate-900/40 border-slate-800/60 text-slate-500'
            }`}>
              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${quizCount > 0 ? 'text-blue-400' : 'text-slate-600'}`} />
              <span className="truncate">🧠 クイズ {quizCount > 0 ? `${quizCount}問` : ''}</span>
            </div>

            <div className={`p-2 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
              hasInput
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-slate-900/40 border-slate-800/60 text-slate-500'
            }`}>
              <BookOpen className={`w-3.5 h-3.5 shrink-0 ${hasInput ? 'text-amber-400' : 'text-slate-600'}`} />
              <span className="truncate">📖 読書/入力</span>
            </div>

            <div className={`p-2 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
              hasTraining
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-900/40 border-slate-800/60 text-slate-500'
            }`}>
              <Dumbbell className={`w-3.5 h-3.5 shrink-0 ${hasTraining ? 'text-emerald-400' : 'text-slate-600'}`} />
              <span className="truncate">🏃 運動</span>
            </div>

            <div className={`p-2 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
              hasMeal
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-slate-900/40 border-slate-800/60 text-slate-500'
            }`}>
              <Utensils className={`w-3.5 h-3.5 shrink-0 ${hasMeal ? 'text-rose-400' : 'text-slate-600'}`} />
              <span className="truncate">🍚 食事</span>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ACTION FOOTER */}
      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-4">
        <button
          onClick={() => onSelectUserFilter(user.id, 'requests_logs')}
          className="flex-1 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/80 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
        >
          <History className="w-3.5 h-3.5 text-amber-400" />
          <span>活動履歴・申請を見る</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    </div>
  );
};
