import React, { useState } from 'react';
import { User, ActionLog, UserGoal, UserSummary, DailyStatItem } from '../types';
import { Banknote, X, AlertTriangle } from 'lucide-react';
import { DailyChart } from './DailyChart';
import { PersonalStreakCard } from './PersonalStreakCard';
import { ActivityInsightsCard } from './ActivityInsightsCard';
import { todayLocalDateStr } from '../dateUtils';

interface DashboardProps {
  currentUser: User | null;
  currentGoal: UserGoal | null;
  users: User[];
  actionLogs: ActionLog[];
  userSummary?: UserSummary | null;
  dailyStats?: DailyStatItem[];
  onNavigate: (tab: string) => void;
  onGoalUpdated: (newGoal: UserGoal) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  currentGoal,
  users,
  actionLogs,
  userSummary,
  dailyStats,
  onNavigate,
  onGoalUpdated,
}) => {
  const [showDecayBanner, setShowDecayBanner] = useState<boolean>(true);
  const [showCashBanner, setShowCashBanner] = useState<boolean>(true);

  if (!currentUser) return null;

  const userLogs = actionLogs
    .filter((log) => log.user_id === currentUser.id)
    .sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (timeA !== timeB && !isNaN(timeA) && !isNaN(timeB)) {
        return timeB - timeA;
      }
      return (b.id || '').localeCompare(a.id || '');
    });
  const userMajorLogs = userLogs.filter((log) => log.category !== 'quiz');
  const quizSuccessCount = userSummary?.quizTotalCount !== undefined
    ? userSummary.quizTotalCount
    : userLogs.filter((log) => log.category === 'quiz').length;

  // Active until July 31, 2026
  const isCashBackBannerActive = todayLocalDateStr() <= '2026-07-31';
  // ポイント失効ルール告知バナー: 導入日から先頭3日間（2026年9月20日まで）表示
  const isDecayBannerActive = todayLocalDateStr() <= '2026-09-20';

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ⚠️ ポイント失効（インアクティビティ）ルール導入お知らせバナー（先頭3日間表示） */}
      {showDecayBanner && isDecayBannerActive && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-rose-950/90 via-slate-900/90 to-amber-950/90 border-2 border-rose-500/60 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl relative overflow-hidden group">
          <button
            onClick={() => setShowDecayBanner(false)}
            className="absolute top-2.5 right-2.5 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all z-10"
            title="閉じる"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 shadow-lg">
              <AlertTriangle className="w-7 h-7 text-rose-400 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="text-xs sm:text-sm font-black text-rose-200 flex items-center gap-2 flex-wrap">
                <span className="bg-gradient-to-r from-rose-500 to-red-600 text-white text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  【⚠️ 重要ルール追加】
                </span>
                <span>毎日続けよう！「ポイント失効システム」が導入されました</span>
              </div>
              <div className="text-xs text-slate-200 leading-relaxed">
                1ポイントも獲得しない日が続くと、所持ポイントが段階的に失効します（<strong className="text-rose-300 font-bold">3日連続で1/3失効</strong>、<strong className="text-rose-300 font-bold">5日連続でさらに50%失効</strong>、<strong className="text-red-400 font-bold">10日連続で全額0pt</strong>）。
              </div>
              <p className="text-[0.6875rem] text-emerald-300 font-bold flex items-center gap-1">
                <span>💡 その日にたった1ptでも獲得（クイズ1問正解・運動・読書等）すれば失効を完全に阻止できます！</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('streak_bonus_info')}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 text-xs font-black hover:brightness-110 transition-all shadow-lg shrink-0 flex items-center justify-center gap-1.5 border border-rose-300/40 whitespace-nowrap"
          >
            <span>📜 失効ルールを詳しく見る ➔</span>
          </button>
        </div>
      )}

      {/* Cash Back Announcement Banner (Top Most Header Banner, Active until July 31) */}
      {showCashBanner && isCashBackBannerActive && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-950/90 via-teal-950/80 to-amber-950/90 border-2 border-emerald-500/60 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl relative overflow-hidden group">
          <button
            onClick={() => setShowCashBanner(false)}
            className="absolute top-2.5 right-2.5 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all z-10"
            title="閉じる"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg">
              <Banknote className="w-7 h-7 text-emerald-400 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="text-xs sm:text-sm font-black text-emerald-300 flex items-center gap-2 flex-wrap">
                <span className="bg-emerald-500 text-slate-950 text-xs font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  【新機能】ポイント現金還元スタート！
                </span>
                <span>ポイントを現金（お小遣い）に還元できるようになりました！</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                交換所で <strong className="text-emerald-300 font-bold">「💵 現金還元 (7掛け/70%還元)」</strong> を選んで申請できます！貯めたポイントをお小遣いに還元しよう！
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('wishlist')}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-300 text-slate-950 text-xs font-black hover:brightness-110 transition-all shadow-lg shrink-0 flex items-center justify-center gap-1.5 border border-emerald-200/40 whitespace-nowrap"
          >
            <span>🎁 さっそく交換所を見る ➔</span>
          </button>
        </div>
      )}

      {/* 1. BLOCK 1 (TOP HERO CARD): 自分専用の連続記録 ＆ 全カテゴリ制覇 */}
      <PersonalStreakCard
        currentUser={currentUser}
        actionLogs={actionLogs}
        userSummary={userSummary}
        onNavigate={onNavigate}
      />

      {/* 2. BLOCK 2: 7日 / 30日 / 90日 3期間対応ニュルっと動く積み上げ面グラデーショングラフ */}
      <DailyChart actionLogs={actionLogs} userId={currentUser.id} dailyStats={dailyStats} />

      {/* 4. BLOCK 4: 活動インサイト（獲得内訳円グラフ・種目別回数・ご褒美＆失効履歴） */}
      <ActivityInsightsCard
        userSummary={userSummary}
        quizSuccessCount={quizSuccessCount}
        onNavigate={onNavigate}
      />
    </div>
  );
};
