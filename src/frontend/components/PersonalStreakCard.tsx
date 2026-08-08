import React, { useState, useEffect, useMemo } from 'react';
import { User, ActionLog } from '../types';
import { Flame, CheckCircle2, ArrowRight, Zap } from 'lucide-react';
import { logLogicalDateStr, todayLogicalDateStr } from '../dateUtils';

interface PersonalStreakCardProps {
  currentUser: User;
  actionLogs: ActionLog[];
  onNavigate: (tab: string) => void;
}

const DEFAULT_STREAK_MILESTONES = [2, 3, 4, 5, 6, 7, 10, 14, 21, 30, 50, 100, 150, 200, 250, 300, 365];

export const PersonalStreakCard: React.FC<PersonalStreakCardProps> = ({
  currentUser,
  actionLogs,
  onNavigate,
}) => {
  const [rulePoints, setRulePoints] = useState<{ [cat: string]: number }>({});
  const [ruleDescriptions, setRuleDescriptions] = useState<{ [cat: string]: string }>({});

  useEffect(() => {
    fetch('/api/point-rules')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.rules) {
          const map: { [cat: string]: number } = {};
          const descMap: { [cat: string]: string } = {};
          data.rules.forEach((r: any) => {
            map[r.category] = r.points;
            if (r.description) descMap[r.category] = r.description;
          });
          setRulePoints(map);
          setRuleDescriptions(descMap);
        }
      })
      .catch(() => {});
  }, []);

  const dynamicMilestones = useMemo(() => {
    const str = ruleDescriptions.streak_milestones || '2,3,4,5,6,7,10,14,21,30,50,100,150,200,250,300,365';
    const parsed = str.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n) && n > 0);
    return parsed.length > 0 ? parsed : DEFAULT_STREAK_MILESTONES;
  }, [ruleDescriptions.streak_milestones]);

  const dailyMultiplier = Number.isFinite(rulePoints.streak_daily_multiplier) ? rulePoints.streak_daily_multiplier : 10;
  const midThreshold = Number.isFinite(rulePoints.streak_mid_threshold) ? rulePoints.streak_mid_threshold : 100;
  const godThreshold = Number.isFinite(rulePoints.streak_god_threshold) ? rulePoints.streak_god_threshold : 250;

  const todayStr = todayLogicalDateStr();

  // 本日の獲得素点・記録件数を集計
  const { todayBase, todayCount } = useMemo(() => {
    let baseSum = 0;
    let count = 0;

    actionLogs.forEach((log) => {
      if (log.user_id !== currentUser.id || log.status === 'rejected') return;
      const day = logLogicalDateStr(log.created_at);
      if (day !== todayStr) return;

      if (log.category !== 'bonus') {
        const base = Number(log.base_points ?? log.earned_points) || 0;
        baseSum += base;
        count += 1;
      }
    });

    return { todayBase: baseSum, todayCount: count };
  }, [actionLogs, currentUser.id, todayStr]);

  const doneToday = todayCount > 0;

  // DB確定の連続日数（過的な設定変更に影響されない実績値）
  const streakDaily = currentUser.current_streak_days || 0;
  const streakMid = currentUser.current_50pt_streak_days || 0;
  const streakGod = currentUser.current_100pt_streak_days || 0;

  const streakIfRecorded = doneToday ? streakDaily : streakDaily + 1;
  const reachedMilestone = !doneToday && dynamicMilestones.includes(streakIfRecorded) ? streakIfRecorded : undefined;
  const upcomingMilestone = dynamicMilestones.find((m) => m > streakIfRecorded);

  return (
    <div className="glass-card p-5 sm:p-6 rounded-3xl border-2 border-orange-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/60 space-y-5 shadow-2xl relative overflow-hidden">
      {/* Background glow decoration */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/20 to-rose-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0 shadow-lg">
            <Flame className="w-7 h-7 text-orange-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-white tracking-tight">🔥 きみの連続記録 & 今日の目標</h2>
              <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                doneToday
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-glow-emerald'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
              }`}>
                {doneToday ? '✅ 今日は記録済み' : '❌ 今日は未記録'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              毎日コツコツ続けてご褒美ボーナスをゲットしよう！
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate('streak_bonus_info')}
            className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold transition-all flex items-center gap-1"
          >
            <span>ルール解説</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3段階ストリーク常時表示カード */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* ① デイリー連続 */}
        <div className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-2 transition-all ${
          doneToday ? 'bg-indigo-950/50 border-indigo-500/40 shadow-md' : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-black text-indigo-300 flex items-center gap-1">
              <span>🔥 デイリー</span>
              <span className="text-[10px] font-normal text-slate-400">(1pt+)</span>
            </span>
            <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-lg ${
              streakDaily > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
            }`}>
              {streakDaily}日連続
            </span>
          </div>
          <div className="text-xs">
            {doneToday ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>本日クリア！</span>
              </span>
            ) : (
              <span className="text-amber-300 font-bold">
                今日あと <span className="font-mono text-white font-black">1pt</span>
              </span>
            )}
          </div>
        </div>

        {/* ② 中級連続 */}
        <div className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-2 transition-all ${
          todayBase >= midThreshold ? 'bg-rose-950/50 border-rose-500/40 shadow-md' : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-black text-rose-300 flex items-center gap-1">
              <span>💥 中級</span>
              <span className="text-[10px] font-normal text-slate-400">({midThreshold}pt+)</span>
            </span>
            <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-lg ${
              streakMid > 0 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-slate-800 text-slate-400'
            }`}>
              {streakMid}日連続
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="text-xs">
              {todayBase >= midThreshold ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>本日達成！</span>
                </span>
              ) : (
                <span className="text-slate-300">
                  素点あと <span className="font-mono text-rose-300 font-black">{(midThreshold - todayBase).toLocaleString()}pt</span>
                </span>
              )}
            </div>
            {todayBase < midThreshold && (
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (todayBase / midThreshold) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* ③ 神連続 */}
        <div className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-2 transition-all ${
          todayBase >= godThreshold ? 'bg-amber-950/50 border-amber-500/40 shadow-md' : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-black text-amber-300 flex items-center gap-1">
              <span>👑 神</span>
              <span className="text-[10px] font-normal text-slate-400">({godThreshold}pt+)</span>
            </span>
            <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-lg ${
              streakGod > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
            }`}>
              {streakGod}日連続
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="text-xs">
              {todayBase >= godThreshold ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>本日達成！</span>
                </span>
              ) : (
                <span className="text-slate-300">
                  素点あと <span className="font-mono text-amber-300 font-black">{(godThreshold - todayBase).toLocaleString()}pt</span>
                </span>
              )}
            </div>
            {todayBase < godThreshold && (
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (todayBase / godThreshold) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 今日の行動・リスク・ネクストアクションバー */}
      {!doneToday ? (
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-start gap-2 text-xs">
            <span className="text-emerald-400 font-black shrink-0">記録すれば</span>
            <span className="text-slate-200">
              → <strong className="text-white">{streakIfRecorded}日連続</strong>
              {reachedMilestone ? (
                <> 達成！ <strong className="text-emerald-300 font-mono">+{(reachedMilestone * dailyMultiplier).toLocaleString()}pt</strong></>
              ) : upcomingMilestone ? (
                <span className="text-slate-400">（次の節目 {upcomingMilestone}日まであと{upcomingMilestone - streakIfRecorded}日 → +{(upcomingMilestone * dailyMultiplier).toLocaleString()}pt）</span>
              ) : null}
            </span>
          </div>

          {streakDaily >= 1 && (
            <div className="flex items-start gap-2 text-xs">
              <span className="text-rose-400 font-black shrink-0">しなければ</span>
              <span className="text-rose-200">
                → <strong className="text-rose-100">0日に戻る</strong>
                <span className="text-rose-300/80">（積み上げた{streakDaily}日が消滅）</span>
              </span>
            </div>
          )}

          <button
            onClick={() => onNavigate('quiz')}
            className="w-full mt-1.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-black text-xs hover:brightness-110 transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            <Zap className="w-4 h-4" />
            <span>クイズ1問正解で今日の記録を即確保する ➔</span>
          </button>
        </div>
      ) : (
        <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs font-bold text-emerald-300 flex items-center justify-between gap-2">
          <span>🎉 本日の日常アクション記録完了！連続記録継続中！</span>
          {upcomingMilestone && (
            <span className="text-slate-400 font-normal text-[11px] shrink-0">
              次の節目 {upcomingMilestone}日目まであと{upcomingMilestone - streakDaily}日
            </span>
          )}
        </div>
      )}
    </div>
  );
};
