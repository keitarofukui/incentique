import React, { useState, useMemo } from 'react';
import { ActionLog, DailyStatItem } from '../types';
import { TrendingUp, Flame, Calendar } from 'lucide-react';
import { logLocalDateStr, toLocalDateStr } from '../dateUtils';

interface DailyChartProps {
  actionLogs: ActionLog[];
  userId: string;
  dailyStats?: DailyStatItem[];
}

export const DailyChart: React.FC<DailyChartProps> = ({ actionLogs, userId, dailyStats }) => {
  const [chartPeriod, setChartPeriod] = useState<number>(7); // 7, 30, 90
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Filter approved logs for current user (fallback)
  const userLogs = useMemo(() => {
    return actionLogs.filter(
      (log) => log.user_id === userId && log.status === 'approved'
    );
  }, [actionLogs, userId]);

  // Generate N days dates array [YYYY-MM-DD] with 5-category breakdown
  const days = useMemo(() => {
    const arr: {
      dateStr: string;
      label: string;
      quiz: number;
      input: number;
      training: number;
      meal: number;
      bonus: number;
      total: number;
    }[] = [];
    const now = new Date();

    for (let i = chartPeriod - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = toLocalDateStr(d);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      arr.push({ dateStr, label, quiz: 0, input: 0, training: 0, meal: 0, bonus: 0, total: 0 });
    }

    if (dailyStats && dailyStats.length > 0) {
      dailyStats.forEach((stat) => {
        const dayObj = arr.find((d) => d.dateStr === stat.dateStr);
        if (dayObj) {
          dayObj.quiz = stat.quiz;
          dayObj.input = stat.input;
          dayObj.training = stat.training;
          dayObj.meal = stat.meal;
          dayObj.bonus = stat.bonus;
          dayObj.total = stat.total;
        }
      });
    } else {
      userLogs.forEach((log) => {
        const logDateStr = logLocalDateStr(log.created_at);
        const dayObj = arr.find((d) => d.dateStr === logDateStr);

        if (dayObj) {
          const pts = Number(log.earned_points || 0);
          const cat = log.category || '';
          if (cat === 'quiz' || cat === 'study') {
            dayObj.quiz += pts;
          } else if (cat.startsWith('input_')) {
            dayObj.input += pts;
          } else if (cat === 'training') {
            dayObj.training += pts;
          } else if (cat === 'eat_rice' || cat === 'eat_meat') {
            dayObj.meal += pts;
          } else {
            // 'bonus' and any other reward points
            dayObj.bonus += pts;
          }
          dayObj.total += pts;
        }
      });
    }

    return arr;
  }, [userLogs, dailyStats, chartPeriod]);

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

  // Smooth 5-Layer Stacked Area Chart SVG Path Generator
  const chartHeight = 175;
  const chartWidth = 800;
  const topPadding = 15;
  const bottomPadding = 10;
  const usableHeight = chartHeight - topPadding - bottomPadding;

  // Calculate stacked Y coordinates for each day
  // Layer 0: quiz (cyan)
  // Layer 1: input (purple)
  // Layer 2: training (emerald)
  // Layer 3: meal (amber)
  // Layer 4: bonus (rose)
  const stackedPoints = useMemo(() => {
    if (days.length === 0) return [];
    const stepX = chartWidth / Math.max(days.length - 1, 1);

    return days.map((d, index) => {
      const x = index * stepX;
      
      const hQuiz = (d.quiz / maxPoints) * usableHeight;
      const hInput = (d.input / maxPoints) * usableHeight;
      const hTraining = (d.training / maxPoints) * usableHeight;
      const hMeal = (d.meal / maxPoints) * usableHeight;
      const hBonus = (d.bonus / maxPoints) * usableHeight;

      const yBase = chartHeight - bottomPadding;
      const yQuiz = yBase - hQuiz;
      const yInput = yQuiz - hInput;
      const yTraining = yInput - hTraining;
      const yMeal = yTraining - hMeal;
      const yBonus = yMeal - hBonus; // Top-most Y for total

      return {
        x,
        yBase,
        yQuiz,
        yInput,
        yTraining,
        yMeal,
        yBonus,
        data: d,
      };
    });
  }, [days, maxPoints, usableHeight]);

  // Helper function to build smooth Bezier curve for an array of (x, y) coordinates
  const buildBezierPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  // Build SVG path for a stacked area layer defined by upper Y and lower Y values
  const buildStackedAreaD = (
    upperKey: 'yQuiz' | 'yInput' | 'yTraining' | 'yMeal' | 'yBonus',
    lowerKey: 'yBase' | 'yQuiz' | 'yInput' | 'yTraining' | 'yMeal'
  ) => {
    if (stackedPoints.length < 2) return '';

    const upperPts = stackedPoints.map((p) => ({ x: p.x, y: p[upperKey] }));
    const lowerPts = stackedPoints.map((p) => ({ x: p.x, y: p[lowerKey] })).reverse();

    const forwardPath = buildBezierPath(upperPts);
    let reversePath = '';
    for (let i = 0; i < lowerPts.length - 1; i++) {
      const p0 = lowerPts[i];
      const p1 = lowerPts[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      reversePath += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    return `${forwardPath} L ${lowerPts[0].x} ${lowerPts[0].y}${reversePath} Z`;
  };

  const pathQuiz = useMemo(() => buildStackedAreaD('yQuiz', 'yBase'), [stackedPoints]);
  const pathInput = useMemo(() => buildStackedAreaD('yInput', 'yQuiz'), [stackedPoints]);
  const pathTraining = useMemo(() => buildStackedAreaD('yTraining', 'yInput'), [stackedPoints]);
  const pathMeal = useMemo(() => buildStackedAreaD('yMeal', 'yTraining'), [stackedPoints]);
  const pathBonus = useMemo(() => buildStackedAreaD('yBonus', 'yMeal'), [stackedPoints]);

  // Overall top line path
  const lineTopPath = useMemo(() => {
    if (stackedPoints.length < 2) return '';
    return buildBezierPath(stackedPoints.map((p) => ({ x: p.x, y: p.yBonus })));
  }, [stackedPoints]);

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
            <p className="text-xs text-slate-400">「食事」と「ボーナス」を完全分離！どの分野をどれだけ頑張ったか一目でわかる</p>
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

      {/* 5-Category Legend Bar */}
      <div className="flex items-center justify-end gap-2 sm:gap-3 text-xs font-bold text-slate-300 flex-wrap pt-1">
        <div className="flex items-center gap-1.5 bg-cyan-950/40 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl border border-cyan-500/30">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block shadow-glow-cyan" />
          <span className="text-cyan-300">🧠 クイズ</span>
        </div>
        <div className="flex items-center gap-1.5 bg-purple-950/40 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl border border-purple-500/30">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block shadow-glow-purple" />
          <span className="text-purple-300">📚 インプット</span>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-950/40 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl border border-emerald-500/30">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-glow-emerald" />
          <span className="text-emerald-300">🏋️ 運動</span>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-950/40 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl border border-amber-500/30">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-glow-gold" />
          <span className="text-amber-300">🍚 食事</span>
        </div>
        <div className="flex items-center gap-1.5 bg-rose-950/40 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl border border-rose-500/30">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block shadow-glow-rose" />
          <span className="text-rose-300">🎁 ボーナス</span>
        </div>
      </div>

      {/* 5-Layer Menu-Matched Stacked Animated Area Chart */}
      <div className="pt-2 relative">
        <div className="h-48 w-full relative">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-full overflow-visible transition-all duration-500 ease-out"
            preserveAspectRatio="none"
          >
            <defs>
              {/* Quiz Gradient (Cyan) */}
              <linearGradient id="gradQuiz" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.45" />
              </linearGradient>
              {/* Input Gradient (Purple) */}
              <linearGradient id="gradInput" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c084fc" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.45" />
              </linearGradient>
              {/* Training Gradient (Emerald) */}
              <linearGradient id="gradTraining" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.45" />
              </linearGradient>
              {/* Meal Gradient (Amber) */}
              <linearGradient id="gradMeal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.45" />
              </linearGradient>
              {/* Bonus Gradient (Rose) */}
              <linearGradient id="gradBonus" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#be123c" stopOpacity="0.45" />
              </linearGradient>

              {/* Glowing Line Gradient */}
              <linearGradient id="lineTopGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="25%" stopColor="#c084fc" />
                <stop offset="50%" stopColor="#34d399" />
                <stop offset="75%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f43f5e" />
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

            {/* Layer 0: Quiz Stacked Area (Cyan) */}
            <path
              d={pathQuiz}
              fill="url(#gradQuiz)"
              className="transition-all duration-500 ease-out opacity-90 hover:opacity-100"
            />

            {/* Layer 1: Input Stacked Area (Purple) */}
            <path
              d={pathInput}
              fill="url(#gradInput)"
              className="transition-all duration-500 ease-out opacity-90 hover:opacity-100"
            />

            {/* Layer 2: Training Stacked Area (Emerald) */}
            <path
              d={pathTraining}
              fill="url(#gradTraining)"
              className="transition-all duration-500 ease-out opacity-90 hover:opacity-100"
            />

            {/* Layer 3: Meal Stacked Area (Amber) */}
            <path
              d={pathMeal}
              fill="url(#gradMeal)"
              className="transition-all duration-500 ease-out opacity-90 hover:opacity-100"
            />

            {/* Layer 4: Bonus Stacked Area (Rose) */}
            <path
              d={pathBonus}
              fill="url(#gradBonus)"
              className="transition-all duration-500 ease-out opacity-90 hover:opacity-100"
            />

            {/* Top Outline Glowing Line */}
            <path
              d={lineTopPath}
              fill="none"
              stroke="url(#lineTopGrad)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-500 ease-out drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]"
            />

            {/* Interactive Data Points Circle */}
            {stackedPoints.map((pt, idx) => (
              <g key={pt.data.dateStr} className="cursor-pointer group">
                <circle
                  cx={pt.x}
                  cy={pt.yBonus}
                  r={hoverIndex === idx ? '6' : '3.5'}
                  fill={pt.data.total > 0 ? '#ffffff' : '#334155'}
                  stroke="#0f172a"
                  strokeWidth="2"
                  className="transition-all duration-300"
                  onMouseEnter={() => setHoverIndex(idx)}
                  onMouseLeave={() => setHoverIndex(null)}
                />
              </g>
            ))}
          </svg>

          {/* Detailed Hover Tooltip Overlay with 5-Category Breakdown */}
          {hoverIndex !== null && stackedPoints[hoverIndex] && (
            <div
              className="absolute -top-20 bg-slate-950/95 border border-cyan-500/60 text-white text-[10px] font-mono p-2.5 rounded-2xl shadow-2xl pointer-events-none z-30 transform -translate-x-1/2 transition-all duration-200 min-w-[145px]"
              style={{
                left: `${Math.max(10, Math.min(90, (stackedPoints[hoverIndex].x / chartWidth) * 100))}%`,
              }}
            >
              <div className="font-bold text-cyan-300 text-xs border-b border-slate-800 pb-1 mb-1 text-center">
                📅 {stackedPoints[hoverIndex].data.dateStr}
              </div>

              <div className="space-y-0.5">
                {stackedPoints[hoverIndex].data.quiz > 0 && (
                  <div className="flex justify-between items-center text-cyan-300">
                    <span>🧠 クイズ:</span>
                    <span className="font-bold">+{stackedPoints[hoverIndex].data.quiz} pt</span>
                  </div>
                )}
                {stackedPoints[hoverIndex].data.input > 0 && (
                  <div className="flex justify-between items-center text-purple-300">
                    <span>📚 インプット:</span>
                    <span className="font-bold">+{stackedPoints[hoverIndex].data.input} pt</span>
                  </div>
                )}
                {stackedPoints[hoverIndex].data.training > 0 && (
                  <div className="flex justify-between items-center text-emerald-300">
                    <span>🏋️ 運動:</span>
                    <span className="font-bold">+{stackedPoints[hoverIndex].data.training} pt</span>
                  </div>
                )}
                {stackedPoints[hoverIndex].data.meal > 0 && (
                  <div className="flex justify-between items-center text-amber-300">
                    <span>🍚 食事:</span>
                    <span className="font-bold">+{stackedPoints[hoverIndex].data.meal} pt</span>
                  </div>
                )}
                {stackedPoints[hoverIndex].data.bonus > 0 && (
                  <div className="flex justify-between items-center text-rose-300">
                    <span>🎁 ボーナス:</span>
                    <span className="font-bold">+{stackedPoints[hoverIndex].data.bonus} pt</span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-1 mt-1 font-black text-amber-400 flex justify-between items-center text-xs">
                <span>合計:</span>
                <span>+{stackedPoints[hoverIndex].data.total} pt</span>
              </div>
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
