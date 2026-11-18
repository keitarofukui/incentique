import React, { useState } from 'react';
import { InsightCategoryItem, UserSummary } from '../types';
import { PieChart, Trophy, Gift, AlertTriangle, ArrowRight } from 'lucide-react';
import { formatLogDateTime } from '../dateUtils';

interface ActivityInsightsCardProps {
  userSummary?: UserSummary | null;
  quizSuccessCount: number;
  onNavigate: (tab: string) => void;
}

const GROUP_STYLES: Record<string, { color: string; dot: string; tab: string; cta: string }> = {
  quiz: { color: '#22d3ee', dot: 'bg-cyan-400', tab: 'quiz', cta: 'クイズに挑戦する' },
  training: { color: '#f97316', dot: 'bg-orange-400', tab: 'training', cta: '運動を記録する' },
  housework: { color: '#10b981', dot: 'bg-emerald-400', tab: 'housework', cta: '家事を手伝う' },
  input: { color: '#a855f7', dot: 'bg-purple-400', tab: 'input_book', cta: '読書・映画を記録' },
  meal: { color: '#eab308', dot: 'bg-yellow-400', tab: 'eat_rice', cta: '食事を記録する' },
  bonus: { color: '#ec4899', dot: 'bg-pink-400', tab: 'quiz', cta: 'ボーナスを狙う' },
};

const ACTION_CANDIDATES: Array<{ group: InsightCategoryItem['group']; label: string; tab: string }> = [
  { group: 'training', label: '運動', tab: 'training' },
  { group: 'housework', label: '家事', tab: 'housework' },
  { group: 'input', label: 'インプット', tab: 'input_book' },
  { group: 'quiz', label: 'クイズ・勉強', tab: 'quiz' },
  { group: 'meal', label: '食事', tab: 'eat_rice' },
];

export const ActivityInsightsCard: React.FC<ActivityInsightsCardProps> = ({
  userSummary,
  quizSuccessCount,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'breakdown' | 'activities' | 'outcomes'>('breakdown');
  const [activityFilter, setActivityFilter] = useState<string>('all');

  const insights = userSummary?.insights;
  const breakdown = insights?.categoryBreakdown || [];
  const topActivities = insights?.topActivities || [];
  const claimedWishes = insights?.claimedWishes || [];
  const penaltyHistory = insights?.penaltyHistory || [];

  const totalBreakdownPts = breakdown.reduce((sum, item) => sum + item.points, 0);

  // 次へのアクション提案（0pt の活動があれば優先、なければ最小割合の活動）
  const pointMap = new Map(breakdown.map((b) => [b.group, b.points]));
  const nextSuggestion = [...ACTION_CANDIDATES].sort(
    (a, b) => (pointMap.get(a.group) || 0) - (pointMap.get(b.group) || 0)
  )[0];

  const filteredActivities = topActivities.filter((a) => {
    if (activityFilter === 'all') return true;
    if (activityFilter === 'input') return a.category.startsWith('input_');
    if (activityFilter === 'meal') return a.category.startsWith('eat_');
    return a.category === activityFilter;
  });

  const totalSpentWishes = claimedWishes.reduce((sum, w) => sum + w.points, 0);
  const totalLostPoints = penaltyHistory.reduce((sum, p) => sum + Math.abs(p.points), 0);

  // SVG ドーナツ計算 (r=40, 周長 ≈ 251.327)
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  return (
    <div className="glass-card p-4 sm:p-5 rounded-2xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-cyber-neonCyan" />
            <span>活動インサイト（全期間）</span>
          </h3>
          {quizSuccessCount > 0 && (
            <span className="text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2.5 py-0.5 rounded-full">
              🧠 クイズ累積正解: {quizSuccessCount}問
            </span>
          )}
        </div>
        <button
          onClick={() => onNavigate('action-logs')}
          className="text-xs font-bold text-cyber-neonCyan hover:underline self-start sm:self-auto"
        >
          履歴タブで全ログを見る →
        </button>
      </div>

      {/* タブ切替 */}
      <div className="grid grid-cols-3 gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
        {[
          { id: 'breakdown' as const, label: '📊 獲得内訳' },
          { id: 'activities' as const, label: '🏅 種目別回数' },
          { id: 'outcomes' as const, label: '🎁 ご褒美・失効' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`py-2 px-2 rounded-lg text-xs font-black transition-all ${
              activeTab === t.id
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-glow-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 1. 獲得内訳ドーナツ円グラフ */}
      {activeTab === 'breakdown' && (
        <div className="space-y-4">
          {breakdown.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              まだ獲得ポイントの記録がありません。まずはクイズや運動に挑戦してみよう！
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="flex justify-center">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-label="獲得ポイント内訳円グラフ">
                    <circle cx="50" cy="50" r={radius} fill="none" stroke="#1e293b" strokeWidth="14" />
                    {breakdown.map((item) => {
                      const ratio = totalBreakdownPts > 0 ? item.points / totalBreakdownPts : 0;
                      const dash = ratio * circumference;
                      const offset = cumulativeOffset;
                      cumulativeOffset += dash;
                      const strokeColor = GROUP_STYLES[item.group]?.color || '#64748b';
                      return (
                        <circle
                          key={item.group}
                          cx="50"
                          cy="50"
                          r={radius}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth="14"
                          strokeDasharray={`${dash} ${circumference - dash}`}
                          strokeDashoffset={-offset}
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] text-slate-400 font-bold">累計獲得</span>
                    <span className="text-base font-black text-white font-mono">
                      {totalBreakdownPts.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-amber-400 font-bold">pt</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {breakdown.map((item) => {
                  const pct = totalBreakdownPts > 0 ? Math.round((item.points / totalBreakdownPts) * 100) : 0;
                  const style = GROUP_STYLES[item.group];
                  return (
                    <button
                      key={item.group}
                      onClick={() => style && onNavigate(style.tab)}
                      className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 text-xs transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${style?.dot || 'bg-slate-400'}`} />
                        <span className="font-bold text-slate-200">{item.label}</span>
                        <span className="text-[11px] text-slate-400">({item.count}回)</span>
                      </div>
                      <div className="font-mono font-bold text-white">
                        {item.points.toLocaleString()}pt <span className="text-cyan-300">({pct}%)</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {nextSuggestion && (
            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between gap-3">
              <div className="text-xs text-cyan-100">
                <span className="font-black text-cyan-300">💡 次のアクション:</span>{' '}
                {(pointMap.get(nextSuggestion.group) || 0) === 0
                  ? `まだ「${nextSuggestion.label}」の記録がありません。バランスよくポイントを伸ばそう！`
                  : `「${nextSuggestion.label}」の割合が少なめです。伸ばしてバランスアップしよう！`}
              </div>
              <button
                onClick={() => onNavigate(nextSuggestion.tab)}
                className="px-3 py-1.5 rounded-lg bg-cyber-neonCyan text-slate-950 font-black text-xs shrink-0 flex items-center gap-1"
              >
                <span>やる</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. 種目別累計回数 */}
      {activeTab === 'activities' && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {[
              { id: 'all', label: 'すべて' },
              { id: 'training', label: '💪 運動' },
              { id: 'housework', label: '🧹 家事' },
              { id: 'input', label: '📚 インプット' },
              { id: 'meal', label: '🍚 食事' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActivityFilter(f.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                  activityFilter === f.id
                    ? 'bg-cyan-500 text-slate-950 font-black'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredActivities.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <p className="text-xs text-slate-400">該当する種目の記録がまだありません。</p>
              <button
                onClick={() => onNavigate(activityFilter === 'housework' ? 'housework' : activityFilter === 'input' ? 'input_book' : 'training')}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-cyan-300 text-xs font-bold"
              >
                記録をつけに行く →
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredActivities.map((act, idx) => (
                <div
                  key={`${act.category}-${act.title}`}
                  className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center font-mono font-black text-amber-400 shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-white truncate">{act.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-black">
                      {act.count}回
                    </span>
                    <span className="text-amber-400 font-bold">+{act.points.toLocaleString()}pt</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. 獲得したご褒美 & 失効履歴 */}
      {activeTab === 'outcomes' && (
        <div className="space-y-4">
          {/* ご褒美交換履歴 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                <Gift className="w-4 h-4" />
                <span>獲得したご褒美（計 {claimedWishes.length}件 / {totalSpentWishes.toLocaleString()}pt）</span>
              </h4>
              <button onClick={() => onNavigate('wishlist')} className="text-[11px] text-cyan-300 font-bold hover:underline">
                交換所へ →
              </button>
            </div>
            {claimedWishes.length === 0 ? (
              <p className="text-xs text-slate-400 p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                まだ交換で獲得したご褒美はありません。ポイントを貯めて交換所に挑戦しよう！
              </p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {claimedWishes.map((w) => (
                  <div key={w.id} className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{w.title}</div>
                      <div className="text-[10px] text-slate-400">{formatLogDateTime(w.approvedAt)}</div>
                    </div>
                    <span className="font-mono font-bold text-emerald-300 shrink-0">-{w.points.toLocaleString()} pt</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 失効履歴 */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>失効してしまった記録（計 {penaltyHistory.length}回 / -{totalLostPoints.toLocaleString()}pt）</span>
              </h4>
            </div>
            {penaltyHistory.length === 0 ? (
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300 font-bold">
                🎉 これまでポイント失効はゼロです！この調子で毎日1pt以上キープしよう！
              </div>
            ) : (
              <div className="space-y-2">
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {penaltyHistory.map((p) => (
                    <div key={p.id} className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/30 flex items-start justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <div className="font-bold text-rose-200">{p.title}</div>
                        <div className="text-[10px] text-slate-400">{formatLogDateTime(p.createdAt)}</div>
                      </div>
                      <span className="font-mono font-black text-rose-400 shrink-0">{p.points.toLocaleString()} pt</span>
                    </div>
                  ))}
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-amber-500/30 flex items-center justify-between gap-2 text-xs">
                  <span className="text-amber-200">💡 1日1pt（クイズ1問正解など）で失効タイマーをリセットできます！</span>
                  <button
                    onClick={() => onNavigate('quiz')}
                    className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-black shrink-0"
                  >
                    クイズで防ぐ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
