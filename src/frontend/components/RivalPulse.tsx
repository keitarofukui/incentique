import React, { useEffect, useMemo, useState } from 'react';
import { User, ActionLog } from '../types';
import { Flame, Swords, Crown, AlertTriangle, Sunrise } from 'lucide-react';
import { logLocalDateStr, todayLocalDateStr, toLocalDateStr } from '../dateUtils';

interface RivalPulseProps {
  users: User[];
  currentUser: User;
  actionLogs: ActionLog[];
  onNavigate: (tab: string) => void;
}

const DEFAULT_RULE_POINTS: { [cat: string]: number } = {
  input_book: 300,
  input_movie: 120,
  input_manga: 50,
  study_quiz: 1,
};

/** 'YYYY-MM-DD' shifted back by n local days. */
const daysBefore = (dateStr: string, n = 1): string => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() - n);
  return toLocalDateStr(d);
};

interface WeekTally {
  training: number;
  input: number;
  quiz: number;
  grams: number;
}

interface Row {
  user: User;
  todayPoints: number;
  todayCount: number;
  streak: number;
  week: WeekTally;
}

/**
 * Concrete way to close a points gap, phrased with the point values the parent
 * actually configured — "330pt差" alone doesn't tell a kid what to do.
 */
const describeCatchUp = (gap: number, pts: { [cat: string]: number }): string => {
  if (gap <= 0) return '';
  const parts: string[] = [];
  let rest = gap;

  const steps: { cat: string; label: string; unit: string }[] = [
    { cat: 'input_book', label: '読書', unit: '冊' },
    { cat: 'input_movie', label: '映画', unit: '本' },
    { cat: 'input_manga', label: '漫画', unit: '冊' },
  ];

  for (const step of steps) {
    if (parts.length >= 2) break;
    const value = pts[step.cat];
    if (!value || value <= 0) continue;
    const n = Math.floor(rest / value);
    if (n < 1) continue;
    parts.push(`${step.label}${n}${step.unit}(+${(n * value).toLocaleString()}pt)`);
    rest -= n * value;
  }

  if (rest > 0) {
    const quizValue = pts.study_quiz > 0 ? pts.study_quiz : 1;
    parts.push(`クイズ${Math.ceil(rest / quizValue).toLocaleString()}問`);
  }

  return parts.join(' ＋ ');
};

export const RivalPulse: React.FC<RivalPulseProps> = ({
  users,
  currentUser,
  actionLogs,
  onNavigate,
}) => {
  const [rulePoints, setRulePoints] = useState<{ [cat: string]: number }>(DEFAULT_RULE_POINTS);

  useEffect(() => {
    fetch('/api/point-rules')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.rules) {
          const map: { [cat: string]: number } = {};
          data.rules.forEach((r: any) => { map[r.category] = r.points; });
          setRulePoints((prev) => ({ ...prev, ...map }));
        }
      })
      .catch(() => {});
  }, []);

  const todayStr = todayLocalDateStr();

  const rows = useMemo<Row[]>(() => {
    const weekStart = daysBefore(todayStr, 6);

    const acc = new Map<string, { todayPoints: number; todayCount: number; days: Set<string>; week: WeekTally }>();
    users.forEach((u) => {
      acc.set(u.id, { todayPoints: 0, todayCount: 0, days: new Set(), week: { training: 0, input: 0, quiz: 0, grams: 0 } });
    });

    actionLogs.forEach((log) => {
      if (log.status === 'rejected') return;
      const entry = acc.get(log.user_id);
      if (!entry) return;

      const day = logLocalDateStr(log.created_at);
      if (!day) return;
      entry.days.add(day);

      if (day === todayStr) {
        entry.todayPoints += Number(log.earned_points) || 0;
        entry.todayCount += 1;
      }

      // 'YYYY-MM-DD' strings compare correctly with >=
      if (day >= weekStart) {
        const cat = log.category || '';
        if (cat === 'training') entry.week.training += 1;
        else if (cat.startsWith('input_')) entry.week.input += 1;
        else if (cat === 'quiz') entry.week.quiz += 1;
        else if (cat === 'eat_rice' || cat === 'eat_meat') {
          // Grams live in the title ("… / 約300g）完食！"), same as the meal screen
          const match = log.title_or_menu.match(/(\d+)\s*g/);
          entry.week.grams += match ? parseInt(match[1], 10) : 0;
        }
      }
    });

    // A streak survives a today with no activity yet — it only breaks once the
    // day is over, which is what makes the "途切れるぞ" warning meaningful.
    const streakOf = (days: Set<string>): number => {
      let cursor = days.has(todayStr) ? todayStr : daysBefore(todayStr);
      if (!days.has(cursor)) return 0;
      let n = 0;
      while (days.has(cursor)) {
        n += 1;
        cursor = daysBefore(cursor);
      }
      return n;
    };

    return users
      .map((user) => {
        const entry = acc.get(user.id)!;
        return {
          user,
          todayPoints: entry.todayPoints,
          todayCount: entry.todayCount,
          streak: streakOf(entry.days),
          week: entry.week,
        };
      })
      .sort((a, b) => b.todayPoints - a.todayPoints || b.streak - a.streak);
  }, [users, actionLogs, todayStr]);

  if (rows.length === 0) return null;

  const me = rows.find((r) => r.user.id === currentUser.id);
  const leader = rows[0];
  const maxToday = Math.max(leader.todayPoints, 1);
  const nobodyMoved = rows.every((r) => r.todayCount === 0);

  const iAmLeading = !!me && leader.user.id === me.user.id && me.todayPoints > 0;
  const runnerUp = rows.find((r) => r.user.id !== leader.user.id);
  const gap = me ? leader.todayPoints - me.todayPoints : 0;
  const catchUp = describeCatchUp(gap, rulePoints);
  const streakAtRisk = !!me && me.streak >= 2 && me.todayCount === 0;

  const champions = [
    { key: 'training' as const, icon: '🏋️', title: '運動王', unit: '回', format: (v: number) => `${v}回` },
    { key: 'input' as const, icon: '📚', title: 'インプット王', unit: '作品', format: (v: number) => `${v}作品` },
    { key: 'quiz' as const, icon: '🧠', title: 'クイズ王', unit: '問', format: (v: number) => `${v}問` },
    { key: 'grams' as const, icon: '🍚', title: 'もぐもぐ王', unit: 'g', format: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}kg` : `${v}g`) },
  ]
    .map((c) => {
      const ranked = [...rows].filter((r) => r.week[c.key] > 0).sort((a, b) => b.week[c.key] - a.week[c.key]);
      return ranked.length > 0 ? { ...c, holder: ranked[0] } : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <div className="glass-card p-5 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 shadow-2xl space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Swords className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-amber-300">⚔️ 今日の勝負</h3>
            <p className="text-[11px] text-slate-400 truncate">
              毎日0ptスタート。今日やった分だけが今日の順位になる！
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

      {/* Today's standings */}
      <div className="space-y-2">
        {rows.map((row, idx) => {
          const isMe = row.user.id === currentUser.id;
          const widthPercent = Math.max(row.todayPoints > 0 ? 6 : 0, Math.round((row.todayPoints / maxToday) * 100));

          return (
            <div
              key={row.user.id}
              className={`p-3 rounded-2xl border ${
                isMe
                  ? 'bg-slate-950 border-cyber-neonCyan/50 shadow-glow-cyan'
                  : 'bg-slate-950/70 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg shrink-0">{row.user.avatar || '⚡'}</span>
                  <span className={`text-xs font-black truncate ${isMe ? 'text-cyber-neonCyan' : 'text-white'}`}>
                    {row.user.name}
                  </span>
                  {idx === 0 && row.todayPoints > 0 && (
                    <span className="text-[10px] shrink-0">👑</span>
                  )}
                  {row.streak >= 2 && (
                    <span className="text-[10px] font-bold text-orange-300 bg-orange-500/10 border border-orange-500/30 px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                      🔥{row.streak}日連続
                    </span>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-mono font-black text-amber-400">
                    {row.todayPoints.toLocaleString()}
                    <span className="text-[10px] font-normal ml-0.5">pt</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono ml-1.5">{row.todayCount}件</span>
                </div>
              </div>

              <div className="mt-1.5 h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isMe ? 'bg-gradient-to-r from-cyan-500 to-cyber-neonCyan' : 'bg-gradient-to-r from-amber-600 to-amber-400'
                  }`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Call to action — the line that should actually move them */}
      {streakAtRisk ? (
        <div className="p-3 rounded-2xl bg-red-950/70 border border-red-500/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
            <p className="text-xs font-bold text-red-200">
              今日はまだ0件。このままだと <strong className="text-red-100">{me!.streak}日連続</strong> が途切れます
            </p>
          </div>
          <button
            onClick={() => onNavigate('quiz')}
            className="px-3 py-1.5 rounded-xl bg-red-500 text-white font-black text-xs hover:brightness-110 transition-all shrink-0 whitespace-nowrap"
          >
            記録する ➔
          </button>
        </div>
      ) : nobodyMoved ? (
        <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Sunrise className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-xs font-bold text-slate-200">今日はまだ誰も動いていない。一番乗りしよう</p>
          </div>
          <button
            onClick={() => onNavigate('quiz')}
            className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:brightness-110 transition-all shrink-0 whitespace-nowrap"
          >
            先手を取る ➔
          </button>
        </div>
      ) : iAmLeading ? (
        <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 flex items-center gap-2">
          <Crown className="w-4 h-4 text-emerald-300 shrink-0" />
          <p className="text-xs font-bold text-emerald-200">
            今日はあなたがトップ！
            {runnerUp && runnerUp.todayPoints > 0 && (
              <> <strong className="text-emerald-100">{runnerUp.user.name}</strong> が {(me!.todayPoints - runnerUp.todayPoints).toLocaleString()}pt差で追ってきている — 逃げ切れ</>
            )}
          </p>
        </div>
      ) : me && gap > 0 ? (
        <div className="p-3 rounded-2xl bg-amber-950/50 border border-amber-500/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Flame className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
            <p className="text-xs font-bold text-amber-200 min-w-0">
              <strong className="text-amber-100">{leader.user.name}</strong> に {gap.toLocaleString()}pt差
              {catchUp && <span className="text-slate-300 font-normal"> — {catchUp} で逆転</span>}
            </p>
          </div>
          <button
            onClick={() => onNavigate('input_book')}
            className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:brightness-110 transition-all shrink-0 whitespace-nowrap"
          >
            追い上げる ➔
          </button>
        </div>
      ) : null}

      {/* Weekly champions — everyone can hold a crown somewhere */}
      {champions.length > 0 && (
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <h4 className="text-[11px] font-black text-amber-300">今週のチャンピオン（直近7日）</h4>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {champions.map((c) => {
              const isMe = c.holder.user.id === currentUser.id;
              return (
                <div
                  key={c.key}
                  className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 ${
                    isMe
                      ? 'bg-cyber-neonCyan/10 border-cyber-neonCyan/40'
                      : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm shrink-0">{c.icon}</span>
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400 font-bold leading-none">{c.title}</div>
                      <div className={`text-xs font-black truncate ${isMe ? 'text-cyber-neonCyan' : 'text-white'}`}>
                        {c.holder.user.name}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-black text-amber-400 shrink-0">
                    {c.format(c.holder.week[c.key])}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
