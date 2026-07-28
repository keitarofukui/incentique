import React from 'react';
import { ActionLog } from '../types';
import { TrendingUp, Flame } from 'lucide-react';
import { logLocalDateStr, toLocalDateStr } from '../dateUtils';

interface DailyChartProps {
  actionLogs: ActionLog[];
  userId: string;
}

export const DailyChart: React.FC<DailyChartProps> = ({ actionLogs, userId }) => {
  // Filter approved logs for current user
  const userLogs = actionLogs.filter(
    (log) => log.user_id === userId && log.status === 'approved'
  );

  // Generate last 7 days dates array [YYYY-MM-DD]
  const days: { dateStr: string; label: string; quiz: number; input: number; training: number; total: number }[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    // Bucket key and label must both be local dates, or logs land in the wrong bar
    const dateStr = toLocalDateStr(d);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    days.push({ dateStr, label, quiz: 0, input: 0, training: 0, total: 0 });
  }

  // Populate points into date buckets (created_at is UTC — convert to local first)
  userLogs.forEach((log) => {
    const logDateStr = logLocalDateStr(log.created_at);
    const dayObj = days.find((d) => d.dateStr === logDateStr);

    if (dayObj) {
      const pts = Number(log.earned_points || 0);
      if (log.category === 'quiz' || log.category === 'study') {
        dayObj.quiz += pts;
      } else if (log.category.startsWith('input_')) {
        dayObj.input += pts;
      } else if (log.category === 'training') {
        dayObj.training += pts;
      } else {
        dayObj.quiz += pts;
      }
      dayObj.total += pts;
    }
  });

  const maxPoints = Math.max(...days.map((d) => d.total), 10);
  const totalWeeklyPoints = days.reduce((sum, d) => sum + d.total, 0);
  const avgDailyPoints = Math.round(totalWeeklyPoints / 7);

  // Calculate current active streak (consecutive days with points > 0)
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].total > 0) {
      streak++;
    } else if (i === days.length - 1) {
      // If today has 0 pts yet, check yesterday
      continue;
    } else {
      break;
    }
  }

  return (
    <div className="glass-card p-6 rounded-3xl border border-cyan-500/30 space-y-6 shadow-2xl relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      {/* Header Summary Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <TrendingUp className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white">直近7日間の獲得ポイント推移</h3>
              {streak > 0 && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/40 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400 fill-amber-400 animate-bounce" />
                  {streak}日連続達成中！
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">日別の頑張りが一目で分かる！コツコツ継続してグラフを伸ばそう</p>
          </div>
        </div>

        {/* Quick Stats Pills */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block font-semibold">7日間合計</span>
            <span className="text-sm font-black text-amber-400 font-mono">+{totalWeeklyPoints} pt</span>
          </div>
          <div className="bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block font-semibold">1日平均</span>
            <span className="text-sm font-black text-cyan-300 font-mono">+{avgDailyPoints} pt/日</span>
          </div>
        </div>
      </div>

      {/* Category Legend */}
      <div className="flex items-center justify-end gap-4 text-xs font-bold">
        <div className="flex items-center gap-1.5 text-cyan-300">
          <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-glow-cyan" />
          <span>🧠 クイズ</span>
        </div>
        <div className="flex items-center gap-1.5 text-purple-300">
          <span className="w-3 h-3 rounded-full bg-purple-500" />
          <span>📚 読書・映画</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-300">
          <span className="w-3 h-3 rounded-full bg-emerald-400" />
          <span>🏋️ 運動</span>
        </div>
      </div>

      {/* Bar Chart Visualization Area */}
      <div className="h-56 pt-6 pb-2 px-2 flex items-end justify-between gap-2 sm:gap-4 bg-slate-950/60 rounded-2xl border border-slate-800/80">
        {days.map((day, idx) => {
          const heightPercent = Math.max(8, Math.min(100, Math.round((day.total / maxPoints) * 100)));
          const isToday = idx === days.length - 1;

          // Proportions for stacked segments
          const quizPercent = day.total > 0 ? (day.quiz / day.total) * 100 : 0;
          const inputPercent = day.total > 0 ? (day.input / day.total) * 100 : 0;
          const trainingPercent = day.total > 0 ? (day.training / day.total) * 100 : 0;

          return (
            <div key={day.dateStr} className="flex-1 flex flex-col items-center h-full justify-end group relative">
              {/* Hover Tooltip Card */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-20 z-20 bg-slate-900 border border-cyan-500/50 p-2.5 rounded-xl text-[10px] text-slate-200 shadow-2xl whitespace-nowrap pointer-events-none space-y-0.5">
                <div className="font-bold text-white border-b border-slate-700 pb-1 mb-1">{day.label} の獲得</div>
                <div className="text-cyan-300">🧠 クイズ: +{day.quiz} pt</div>
                <div className="text-purple-300">📚 読書・映画: +{day.input} pt</div>
                <div className="text-emerald-300">🏋️ 運動: +{day.training} pt</div>
                <div className="font-mono font-black text-amber-400 pt-1 border-t border-slate-800">
                  合計: +{day.total} pt
                </div>
              </div>

              {/* Point Badge above bar */}
              <span className={`text-[11px] font-mono font-black mb-1.5 ${
                day.total > 0 ? 'text-amber-400' : 'text-slate-600'
              }`}>
                {day.total > 0 ? `+${day.total}` : '0'}
              </span>

              {/* Stacked Bar Container */}
              <div
                className="w-full max-w-[40px] rounded-t-xl overflow-hidden flex flex-col justify-end transition-all duration-500 relative group-hover:scale-105"
                style={{ height: `${heightPercent}%` }}
              >
                {day.total === 0 ? (
                  <div className="w-full h-full bg-slate-800/40 rounded-t-xl border-t border-slate-700/50" />
                ) : (
                  <>
                    {day.training > 0 && (
                      <div
                        className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all"
                        style={{ height: `${trainingPercent}%` }}
                        title={`運動: +${day.training}pt`}
                      />
                    )}
                    {day.input > 0 && (
                      <div
                        className="w-full bg-gradient-to-t from-purple-600 to-purple-400 transition-all"
                        style={{ height: `${inputPercent}%` }}
                        title={`読書・映画: +${day.input}pt`}
                      />
                    )}
                    {day.quiz > 0 && (
                      <div
                        className="w-full bg-gradient-to-t from-cyan-600 to-cyber-neonCyan transition-all shadow-glow-cyan"
                        style={{ height: `${quizPercent}%` }}
                        title={`クイズ: +${day.quiz}pt`}
                      />
                    )}
                  </>
                )}
              </div>

              {/* Day Label */}
              <div className="mt-2 text-center">
                <span className={`text-xs font-mono font-bold block ${
                  isToday ? 'text-cyber-neonCyan font-black' : 'text-slate-400'
                }`}>
                  {day.label}
                </span>
                {isToday && (
                  <span className="text-[9px] bg-cyan-500/20 text-cyan-300 font-extrabold px-1.5 py-0.2 rounded-full border border-cyan-500/40">
                    本日
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
