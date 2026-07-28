import React from 'react';
import { User, ActionLog, UserGoal } from '../types';
import { Brain, BookOpen, Dumbbell, CheckCircle2, Clock, XCircle, ArrowRight, Zap, Flame, Swords, Utensils } from 'lucide-react';
import { GoalPlannerWidget } from './GoalPlannerWidget';
import { DailyChart } from './DailyChart';
import { formatLogDateTime, formatRelativeTime, logLocalDateStr, todayLocalDateStr, toLocalDateStr } from '../dateUtils';

interface DashboardProps {
  currentUser: User | null;
  currentGoal: UserGoal | null;
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
  actionLogs,
  onNavigate,
  onOpenTrainingModal,
  onOpenInputReviewModal,
  onOpenEatRiceModal,
  onGoalUpdated,
}) => {
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

  // Check if 2-day limited announcement banner is active (July 28 ~ July 29, 2026)
  const isNewFeatureBannerActive = todayLocalDateStr() <= '2026-07-29';

  return (
    <div className="space-y-6">

      {/* 2-Day Limited Announcement Banner for New "Eat to Earn" (Rice & Meat 1.5x) Feature */}
      {isNewFeatureBannerActive && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-red-950/80 via-rose-950/70 to-amber-950/80 border-2 border-rose-500/60 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-glow-purple relative overflow-hidden">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-bounce">🎉🥩</span>
            <div>
              <div className="text-xs sm:text-sm font-black text-rose-200 flex items-center gap-2">
                <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                  【新登場】2日間限定ピックアップ！
                </span>
                <span>新機能「🍚🥩 食べて稼ぐ（お米＆お肉）」を追加！</span>
              </div>
              <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                ご飯だけでなく <strong className="text-rose-300 font-black underline">お肉（唐揚げ・生姜焼き・ステーキ等）</strong> でもポイントが稼げるようになりました！お肉はタンパク質補給で <strong className="text-amber-300 font-black text-sm">還元率1.5倍ボーナス（最大15%還元）</strong>！
              </p>
            </div>
          </div>

          {onOpenEatRiceModal && (
            <button
              onClick={onOpenEatRiceModal}
              className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 text-white text-xs font-black hover:brightness-110 transition-all shadow-lg shrink-0 flex items-center justify-center gap-1.5 border border-rose-300/40 whitespace-nowrap"
            >
              <span>🥩 さっそく食べて稼ぐ！ ➔</span>
            </button>
          )}
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

          <div className="glass-card p-4 rounded-2xl border border-amber-500/30 flex items-center justify-around gap-4 shrink-0 bg-slate-900/80">
            <div className="text-center px-4">
              <div className="text-xs text-slate-400 font-semibold">現在獲得ポイント</div>
              <div className="text-3xl font-black text-amber-400 font-mono">
                {currentUser.current_points.toLocaleString()} <span className="text-xs text-amber-300">pt</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 Rival Highlight News (Displays ONLY when a notable achievement occurs today or yesterday) */}
      {(() => {
        // Filter for notable rival achievements (Today or Yesterday, in local/JST days)
        const todayStr = todayLocalDateStr();
        const yesterdayStr = toLocalDateStr(new Date(Date.now() - 86400000));

        const notableLogs = actionLogs.filter((log) => {
          if (log.user_id === currentUser.id) return false;

          if (!log.created_at) return true; // If no date, treat as recent
          const logDay = logLocalDateStr(log.created_at);
          if (logDay !== todayStr && logDay !== yesterdayStr) return false;

          // Notable conditions: High points (>=100pt), major reading/movie review or training log
          if (log.earned_points >= 100) return true;
          if (log.category && (log.category.startsWith('input_') || log.category === 'training')) return true;
          return false;
        }).sort((a, b) => {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return timeB - timeA;
        }).slice(0, 2);

        // If no notable achievements in recent logs, hide completely
        if (notableLogs.length === 0) return null;

        return (
          <div className="glass-card p-5 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 shadow-2xl space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Flame className="w-5 h-5 animate-bounce text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                    <span>🔥 LIVE速報！ライバルの注目の頑張り</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    ライバルが最新の成果や高ポイントを獲得！刺激を受けて挑戦しよう！
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigate('rivals')}
                className="px-3 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30 font-bold text-xs transition-all flex items-center gap-1 shrink-0"
              >
                <Swords className="w-3.5 h-3.5 text-indigo-400" />
                <span>順位表 ➔</span>
              </button>
            </div>

            <div className="space-y-2">
              {notableLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg">⚡️</span>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>{log.user_name || 'ライバル'}</span>
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                          {log.earned_points >= 1000 ? '🎰 10倍超激レア！' : log.earned_points >= 300 ? '🔥 成果達成！' : '⚡️ 突破！'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 truncate mt-0.5">
                        「{log.title_or_menu}」を達成し大量ポイント獲得！
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono font-black text-amber-400">
                      +{log.earned_points.toLocaleString()} pt
                    </div>
                    <div className="text-[10px] text-amber-300/80 font-mono font-bold">
                      {formatRelativeTime(log.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

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
