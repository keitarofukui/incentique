import React, { useState, useMemo } from 'react';
import { ActionLog } from '../types';
import { TrendingUp, Flame, Calendar } from 'lucide-react';
import { logLocalDateStr, toLocalDateStr } from '../dateUtils';

interface DailyChartProps {
  actionLogs: ActionLog[];
  userId: string;
}

export const DailyChart: React.FC<DailyChartProps> = ({ actionLogs, userId }) => {
  const [chartPeriod, setChartPeriod] = useState<number>(7); // 7, 30, 90

  // Filter approved logs for current user
  const userLogs = useMemo(() => {
    return actionLogs.filter(
      (log) => log.user_id === userId && log.status === 'approved'
    );
  }, [actionLogs, userId]);

  // Generate N days dates array [YYYY-MM-DD]
  const days = useMemo(() => {
    const arr: { dateStr: string; label: string; quiz: number; input: number; training: number; total: number }[] = [];
    const now = new Date();

    for (let i = chartPeriod - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = toLocalDateStr(d);
      // 7 days: "M/D", 30 & 90 days: "M/D" (sampled or every day)
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      arr.push({ dateStr, label, quiz: 0, input: 0, training: 0, total: 0 });
    }

    userLogs.forEach((log) => {
      const logDateStr = logLocalDateStr(log.created_at);
      const dayObj = arr.find((d) => d.dateStr === logDateStr);

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

    return arr;
  }, [chartPeriod, userLogs]);

  const maxPoints = Math.max(...days.map((d) => d.total), 10);
  const totalPeriodPoints = days.reduce((sum, d) => sum + d.total, 0);
  const avgDailyPoints = Math.round(totalPeriodPoints / chartPeriod);

  // Sampling for 30 / 90 days UI density
  const visibleDays = useMemo(() => {
    if (chartPeriod === 7) return days;
    if (chartPeriod === 30) {
      // Show every 2nd or 3rd day label for clarity
      return days;
    }
    // 90 days: show every day as a bar, tick label every 10 days
    return days;
  }, [days, chartPeriod]);

  // Calculate current active streak (consecutive days with points > 0)
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].total > 0) {
      streak++;
    } else if (i === days.length - 1) {
      continue;
    } else {
      break;
    }
  }

  return (
    <div className="glass-card p-6 rounded-3xl border border-cyan-500/30 space-y-6 shadow-2xl relative overflow-hidden transition-all duration-300">
      {/* Background glow */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      {/* Header Summary Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            <TrendingUp className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-black text-white">過去{chartPeriod}日間の獲得ポイント推移</h3>
              {streak > 0 && chartPeriod === 7 && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/40 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400 fill-amber-400 animate-bounce" />
                  {streak}日連続達成中！
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">期間を切り替えて努力の軌跡と伸びを分析しよう！</p>
          </div>
        </div>

        {/* 期間切替ネオントグル ＆ Stats */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          {/* Period Selector Tabs */}
          <div className="flex bg-slate-950/90 p-1 rounded-2xl border border-cyan-500/30 text-xs font-bold shadow-inner">
            {[7, 30, 90].map((period) => (
              <button
                key={period}
                onClick={() => setChartPeriod(period)}
                className={`px-3 py-1.5 rounded-xl transition-all duration-300 flex items-center gap-1 ${
                  chartPeriod === period
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-lg shadow-cyan-500/30 scale-105'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{period}日間</span>
              </button>
            ))}
          </div>

          {/* Quick Stats Pills */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-900/90 px-3 py-1 rounded-xl border border-slate-800 text-center min-w-[80px]">
              <span className="text-[9px] text-slate-400 block font-semibold">{chartPeriod}日合計</span>
              <span className="text-xs font-black text-amber-400 font-mono transition-all duration-500">
                +{totalPeriodPoints.toLocaleString()} pt
              </span>
            </div>
            <div className="bg-slate-900/90 px-3 py-1 rounded-xl border border-slate-800 text-center min-w-[80px]">
              <span className="text-[9px] text-slate-400 block font-semibold">1日平均</span>
              <span className="text-xs font-black text-cyan-300 font-mono transition-all duration-500">
                +{avgDailyPoints.toLocaleString()} pt
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Legend */}
      <div className="flex items-center justify-end gap-4 text-xs font-bold">
        <div className="flex items-center gap-1.5 text-cyan-300">
          <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-glow-cyan" />
          <span>🧠 クイズ</span>
        </div>
        <div className="flex items-center gap-1.5 text-indigo-300">
          <span className="w-3 h-3 rounded-full bg-indigo-400" />
          <span>📖 読書/入力</span>
        </div>
        <div className="flex items-center gap-1.5 text-rose-300">
          <span className="w-3 h-3 rounded-full bg-rose-400" />
          <span>💪 運動</span>
        </div>
      </div>

      {/* 棒グラフ本体（滑らかな高さ・幅アニメーション） */}
      <div className="pt-2">
        <div className="h-48 flex items-end gap-1 sm:gap-2 border-b border-slate-800 pb-2 px-1 relative">
          {visibleDays.map((d, index) => {
            const heightPercent = maxPoints > 0 ? (d.total / maxPoints) * 100 : 0;
            const quizPercent = d.total > 0 ? (d.quiz / d.total) * 100 : 0;
            const inputPercent = d.total > 0 ? (d.input / d.total) * 100 : 0;
            const trainingPercent = d.total > 0 ? (d.training / d.total) * 100 : 0;

            const showTickLabel =
              chartPeriod === 7
                ? true
                : chartPeriod === 30
                ? index % 5 === 0 || index === visibleDays.length - 1
                : index % 15 === 0 || index === visibleDays.length - 1;

            return (
              <div key={d.dateStr} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                {/* Tooltip on Hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -top-12 bg-slate-950 border border-cyan-500/50 text-white text-[10px] font-mono px-2 py-1 rounded-lg pointer-events-none z-20 shadow-xl whitespace-nowrap">
                  <div className="font-bold text-cyan-300">{d.dateStr}</div>
                  <div>合計: +{d.total} pt</div>
                </div>

                {/* Animated Stacked Bar */}
                <div
                  className="w-full rounded-t-lg overflow-hidden flex flex-col justify-end transition-all duration-500 ease-out group-hover:brightness-125"
                  style={{
                    height: `${Math.max(heightPercent, d.total > 0 ? 6 : 0)}%`,
                    minHeight: d.total > 0 ? '6px' : '0px',
                  }}
                >
                  {trainingPercent > 0 && (
                    <div
                      className="w-full bg-rose-500 transition-all duration-500"
                      style={{ height: `${trainingPercent}%` }}
                    />
                  )}
                  {inputPercent > 0 && (
                    <div
                      className="w-full bg-indigo-500 transition-all duration-500"
                      style={{ height: `${inputPercent}%` }}
                    />
                  )}
                  {quizPercent > 0 && (
                    <div
                      className="w-full bg-cyan-400 transition-all duration-500"
                      style={{ height: `${quizPercent}%` }}
                    />
                  )}
                </div>

                {/* Date Label */}
                <span className={`text-[9px] text-slate-500 font-mono mt-2 truncate ${showTickLabel ? 'opacity-100' : 'opacity-0 sm:opacity-50'}`}>
                  {showTickLabel ? d.label : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
