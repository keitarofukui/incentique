import React, { useState } from 'react';
import { User, ActionLog, UserGoal } from '../types';
import { Brain, BookOpen, Dumbbell, CheckCircle2, Clock, XCircle, ArrowRight, Zap, Utensils, Banknote, X } from 'lucide-react';
import { GoalPlannerWidget } from './GoalPlannerWidget';
import { DailyChart } from './DailyChart';
import { RivalPulse } from './RivalPulse';
import { formatLogDateTime, todayLocalDateStr } from '../dateUtils';

interface DashboardProps {
  currentUser: User | null;
  currentGoal: UserGoal | null;
  users: User[];
  actionLogs: ActionLog[];
  onNavigate: (tab: string) => void;
  onOpenTrainingModal: () => void;
  onOpenInputReviewModal: (category?: 'input_book' | 'input_movie' | 'input_manga') => void;
  onOpenEatRiceModal?: () => void;
  onGoalUpdated: (newGoal: UserGoal) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  currentGoal,
  users,
  actionLogs,
  onNavigate,
  onOpenTrainingModal,
  onOpenInputReviewModal,
  onOpenEatRiceModal,
  onGoalUpdated,
}) => {
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
  const quizSuccessCount = userLogs.filter((log) => log.category === 'quiz').length;

  // Active until tomorrow (July 31, 2026)
  const isCashBackBannerActive = todayLocalDateStr() <= '2026-07-31';

  return (
    <div className="space-y-6">

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
                <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
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

      {/* Summer Break All-Actions 2x Campaign Banner (Top Most Header Banner) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-yellow-500/20 border-2 border-amber-500/50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-glow-gold">
        <div className="flex items-center gap-3">
          <span className="text-3xl animate-bounce">☀️🍧</span>
          <div>
            <div className="text-sm font-black text-amber-300 flex items-center gap-1.5">
              <span>【夏休み限定企画】全アクション対象！ガチャボーナス確率 2倍キャンペーン！</span>
            </div>
            <p className="text-xs text-slate-200 mt-0.5">
              8月31日まで、<strong className="text-amber-300 font-extrabold underline">全てのポイント獲得（クイズ・読書・映画・運動など）</strong>でラッキーガチャボーナス（2倍・3倍・10倍）の発生確率が <strong className="text-amber-300 font-black text-sm">2倍（当選率60%）</strong> に超大幅アップ中！
            </p>
          </div>
        </div>
      </div>

      {/* Streak Bonus Release Banner (Limited time until tomorrow) */}
      {new Date() < new Date('2026-08-04T00:00:00+09:00') && (
        <button
          onClick={() => onNavigate('streak_bonus_info')}
          className="w-full text-left p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 border-2 border-indigo-400/50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-glow-indigo group cursor-pointer hover:brightness-110 transition-all"
        >
          <div className="flex items-center gap-3 w-full">
            <span className="text-3xl group-hover:scale-110 transition-transform">🔥</span>
            <div className="flex-1">
              <div className="text-sm font-black text-indigo-300 flex items-center gap-1.5">
                <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider">New</span>
                <span>新機能「連続記録ボーナス」リリース！</span>
              </div>
              <p className="text-xs text-slate-200 mt-0.5 font-bold">
                毎日続けてボーナスポイント大量GET！詳細は<span className="text-indigo-300 underline underline-offset-2">こちらをタップして確認</span>👆
              </p>
            </div>
            <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-400/30 group-hover:bg-indigo-500/40 transition-colors">
              <span className="text-indigo-300 text-xl font-bold">➔</span>
            </div>
          </div>
        </button>
      )}

      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/80 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-cyber-neonCyan/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-neonCyan/10 border border-cyber-neonCyan/30 text-cyber-neonCyan text-xs font-bold">
              <Zap className="w-3.5 h-3.5" />
              <span>文武両道・習慣化クエスト</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>{currentUser.avatar || '⚡'}</span>
              <span>おかえり、<span className="gradient-text-cyan">{currentUser.name}</span> さん！</span>
            </h2>
            <p className="text-sm text-slate-300 max-w-xl">
              「クイズ(5教科)」「読書・映画インプット」「トレーニング」を達成して、目標のご褒美をゲットしよう！
            </p>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-amber-500/30 flex flex-wrap items-center justify-around gap-4 shrink-0 bg-slate-900/80">
            <div className="text-center px-4 border-r border-slate-700/50">
              <div className="text-[10px] sm:text-xs text-slate-400 font-bold mb-1">連続アクション</div>
              <div className="text-xl sm:text-2xl font-black text-white flex items-center justify-center gap-1">
                🔥 {currentUser.current_streak_days || 0} <span className="text-xs text-slate-400 font-normal">日連続</span>
              </div>
            </div>

            { (currentUser.current_50pt_streak_days || 0) > 0 && (
              <div className="text-center px-4 border-r border-slate-700/50 hidden sm:block">
                <div className="text-[10px] sm:text-xs text-slate-400 font-bold mb-1">50pt超え</div>
                <div className="text-xl sm:text-2xl font-black text-rose-400 flex items-center justify-center gap-1">
                  💥 {currentUser.current_50pt_streak_days} <span className="text-xs text-rose-400/70 font-normal">日連続</span>
                </div>
              </div>
            )}

            <div className="text-center px-4">
              <div className="text-[10px] sm:text-xs text-slate-400 font-semibold mb-1">現在獲得ポイント</div>
              <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                {currentUser.current_points.toLocaleString()} <span className="text-xs text-amber-300">pt</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's head-to-head, streaks and weekly crowns */}
      <RivalPulse
        users={users}
        currentUser={currentUser}
        actionLogs={actionLogs}
        onNavigate={onNavigate}
      />

      {/* Goal & Pace Planner */}
      <GoalPlannerWidget
        currentUser={currentUser}
        currentGoal={currentGoal}
        onGoalUpdated={onGoalUpdated}
        onNavigate={onNavigate}
      />

      {/* 7-Day Point Earning Chart Visualization */}
      <DailyChart actionLogs={actionLogs} userId={currentUser.id} />

      {/* Daily Quests & Earn Points Action Hub */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-emerald-500/10 p-4 rounded-2xl border border-amber-500/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>ポイントを稼ぐ！デイリーアクション</span>
              </h3>
              <p className="text-xs text-slate-300">自己申告でその場ですぐにポイント獲得！好きなアクションを選んで挑戦しよう</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

          {/* Quest 1: クイズ */}
          <div
            onClick={() => onNavigate('quiz')}
            className="glass-card glass-card-hover p-6 rounded-2xl cursor-pointer relative overflow-hidden group border-2 border-cyan-500/40 hover:border-cyan-400 bg-gradient-to-b from-cyan-950/30 to-slate-900/60 shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyber-neonCyan shadow-glow-cyan">
                <Brain className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-3 py-1 rounded-full">
                5教科対応
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase text-cyan-400 tracking-wider">即時自動採点</span>
              <h4 className="text-xl font-black text-white group-hover:text-cyber-neonCyan transition-colors">
                🧠 クイズで稼ぐ
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                全5教科（英語・数学・国語・理科・社会）の2,000問超から出題！正解するたびに即ptゲット！
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between text-xs font-black text-cyber-neonCyan pt-3 border-t border-cyan-500/20">
              <span className="flex items-center gap-1">
                <span>クイズで稼ぐ</span>
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Quest 2: インプット（読書・映画・漫画） */}
          <div
            onClick={() => onOpenInputReviewModal('input_book')}
            className="glass-card glass-card-hover p-6 rounded-2xl cursor-pointer relative overflow-hidden group border-2 border-purple-500/40 hover:border-purple-400 bg-gradient-to-b from-purple-950/30 to-slate-900/60 shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-400">
                <BookOpen className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 px-3 py-1 rounded-full">
                自己申告
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase text-purple-400 tracking-wider">自己申告で即獲得</span>
              <h4 className="text-xl font-black text-white group-hover:text-purple-300 transition-colors">
                📚 読書・映画で稼ぐ
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                読んだ本や観た映画の感想・レビューを記録してポイント獲得！
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between text-xs font-black text-purple-400 pt-3 border-t border-purple-500/20">
              <span className="flex items-center gap-1">
                <span>読書・映画で稼ぐ</span>
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Quest 3: トレーニング */}
          <div
            onClick={onOpenTrainingModal}
            className="glass-card glass-card-hover p-6 rounded-2xl cursor-pointer relative overflow-hidden group border-2 border-emerald-500/40 hover:border-emerald-400 bg-gradient-to-b from-emerald-950/30 to-slate-900/60 shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                <Dumbbell className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full">
                動画連動
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase text-emerald-400 tracking-wider">YouTube動画連動</span>
              <h4 className="text-xl font-black text-white group-hover:text-emerald-300 transition-colors">
                🏋️‍♂️ 運動で稼ぐ
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                HIIT・プランク・筋トレ・ランニングなど運動実施を報告してポイント獲得！
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between text-xs font-black text-emerald-400 pt-3 border-t border-emerald-500/20">
              <span className="flex items-center gap-1">
                <span>運動で稼ぐ</span>
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Quest 4: 食べて稼ぐ（お米提出） */}
          <div
            onClick={onOpenEatRiceModal}
            className="glass-card glass-card-hover p-6 rounded-2xl cursor-pointer relative overflow-hidden group border-2 border-amber-500/40 hover:border-amber-400 bg-gradient-to-b from-amber-950/30 to-slate-900/60 shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-glow-gold">
                <Utensils className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full">
                食育・身体作り
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase text-amber-400 tracking-wider">
                米 3〜10% / 肉 4.5〜15% (1.5倍ボーナス)
              </span>
              <h4 className="text-xl font-black text-white group-hover:text-amber-300 transition-colors">
                🍚🥩 食べて稼ぐ
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                ご飯やお肉（唐揚げ・生姜焼き・ステーキ等）の量を記録してポイント獲得！
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between text-xs font-black text-amber-400 pt-3 border-t border-amber-500/20">
              <span className="flex items-center gap-1">
                <span>お米を提出して稼ぐ</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Timeline */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" />
              <span>主な活動成果（読書・運動・インプット）</span>
            </h3>
            {quizSuccessCount > 0 && (
              <span className="text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2.5 py-0.5 rounded-full">
                🧠 クイズ累積正解: {quizSuccessCount}問 (+{quizSuccessCount}pt)
              </span>
            )}
          </div>
          <button
            onClick={() => onNavigate('action-logs')}
            className="text-xs font-bold text-cyber-neonCyan hover:underline self-start sm:self-auto"
          >
            全ログ・絞り込み表示 →
          </button>
        </div>

        {userMajorLogs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            読書や運動の報告ログはまだありません。上のボタンから感想や成果を投稿してみよう！
          </p>
        ) : (
          <div className="space-y-3">
            {userMajorLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">{log.title_or_menu}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatLogDateTime(log.created_at)}
                    </span>
                  </div>
                  {log.review_text && (
                    <p className="text-xs text-slate-400 line-clamp-1 italic">
                      "{log.review_text}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-black text-amber-400 font-mono">
                    +{log.earned_points} pt
                  </span>

                  {log.status !== 'rejected' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 獲得完了
                    </span>
                  )}
                  {log.status === 'rejected' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/30">
                      <XCircle className="w-3.5 h-3.5" /> 差戻し
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
