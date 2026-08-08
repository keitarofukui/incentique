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
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

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

  // Calculate current active streak
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

  // Smooth Area Chart SVG Path Generator
  const chartHeight = 160;
  const chartWidth = 800;

  const points = useMemo(() => {
    if (days.length === 0) return [];
    const stepX = chartWidth / Math.max(days.length - 1, 1);
    return days.map((d, index) => {
      const x = index * stepX;
      const y = chartHeight - (d.total / maxPoints) * (chartHeight - 20) - 10;
      return { x, y, data: d };
    });
  }, [days, maxPoints]);

  // Cubic Bezier curve path string generator
  const areaPathD = useMemo(() => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    // Close area to bottom
    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    d += ` L ${lastX} ${chartHeight} L ${firstX} ${chartHeight} Z`;
    return d;
  }, [points]);

  const linePathD = useMemo(() => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  }, [points]);

  return (
    <div className="glass-card p-6 rounded-3xl border border-cyan-500/30 space-y-6 shadow-2xl relative overflow-hidden transition-all duration-500">
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
            <p className="text-xs text-slate-400">期間を切り替えるとグラフが滑らかに動く！努力の軌跡を分析しよう</p>
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

      {/* ニュルっと動くネオングラデーション積み上げ面グラフ (Smoothed Animated Area Chart) */}
      <div className="pt-2 relative">
        <div className="h-44 w-full relative">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-full overflow-visible transition-all duration-500 ease-out"
            preserveAspectRatio="none"
          >
            <defs>
              {/* Animated Area Gradient */}
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
                <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
              </linearGradient>
              {/* Glowing Line Gradient */}
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
            </defs>

            {/* Background Grid Lines */}
            {[0.25, 0.5, 0.75].map((ratio, i) => (
              <line
                key={i}
                x1="0"
                y1={chartHeight * ratio}
                x2={chartWidth}
                y2={chartHeight * ratio}
                stroke="#1e293b"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            ))}

            {/* Smooth Fill Area (Animated D path) */}
            <path
              d={areaPathD}
              fill="url(#areaGradient)"
              className="transition-all duration-500 ease-out"
            />

            {/* Smooth Glowing Line Path */}
            <path
              d={linePathD}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-500 ease-out drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
            />

            {/* Interactive Data Points Circle */}
            {points.map((pt, idx) => (
              <g key={pt.data.dateStr} className="cursor-pointer group">
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={hoverIndex === idx ? '6' : '3.5'}
                  fill={pt.data.total > 0 ? '#38bdf8' : '#334155'}
                  stroke="#0f172a"
                  strokeWidth="2"
                  className="transition-all duration-300"
                  onMouseEnter={() => setHoverIndex(idx)}
                  onMouseLeave={() => setHoverIndex(null)}
                />
              </g>
            ))}
          </svg>

          {/* Hover Tooltip Overlay */}
          {hoverIndex !== null && points[hoverIndex] && (
            <div
              className="absolute -top-10 bg-slate-950/90 border border-cyan-500/60 text-white text-[10px] font-mono px-2.5 py-1 rounded-xl shadow-2xl pointer-events-none z-30 transform -translate-x-1/2 transition-all duration-200"
              style={{
                left: `${(points[hoverIndex].x / chartWidth) * 100}%`,
              }}
            >
              <div className="font-bold text-cyan-300">{points[hoverIndex].data.dateStr}</div>
              <div className="font-black text-amber-400">+{points[hoverIndex].data.total} pt</div>
            </div>
          )}
        </div>

        {/* X-Axis Dates Labels Row */}
        <div className="flex justify-between border-t border-slate-800 pt-2 px-1 text-[9px] text-slate-500 font-mono">
          {days.map((d, idx) => {
            const showLabel =
              chartPeriod === 7
                ? true
                : chartPeriod === 30
                ? idx % 5 === 0 || idx === days.length - 1
                : idx % 15 === 0 || idx === days.length - 1;

            return (
              <span key={d.dateStr} className={`${showLabel ? 'opacity-100' : 'opacity-0'}`}>
                {showLabel ? d.label : ''}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
