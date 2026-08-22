import React, { useEffect, useMemo, useState } from 'react';
import { User, ActionLog } from '../types';
import { todayLogicalDateStr, logLogicalDateStr } from '../dateUtils';
import { Target, CheckCircle2 } from 'lucide-react';

interface AllCategoryCardProps {
  currentUser: User;
  actionLogs: ActionLog[];
  onNavigate: (tab: string) => void;
}

const CATEGORY_GROUPS = [
  {
    key: 'quiz' as const,
    label: 'クイズ',
    icon: '🧠',
    tab: 'quiz',
    colorStyle: {
      done: 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-glow-cyan',
      pending: 'bg-slate-950/80 border-slate-800 hover:border-cyan-400',
      activeText: 'text-cyan-300',
    },
    match: (c: string) => c === 'quiz' || c === 'study',
  },
  {
    key: 'input' as const,
    label: 'インプット',
    icon: '📚',
    tab: 'input_book',
    colorStyle: {
      done: 'bg-purple-500/15 border-purple-500/50 text-purple-300 shadow-glow-purple',
      pending: 'bg-slate-950/80 border-slate-800 hover:border-purple-400',
      activeText: 'text-purple-300',
    },
    match: (c: string) => c.startsWith('input_'),
  },
  {
    key: 'training' as const,
    label: '運動',
    icon: '🏋️',
    tab: 'training',
    colorStyle: {
      done: 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-glow-emerald',
      pending: 'bg-slate-950/80 border-slate-800 hover:border-emerald-400',
      activeText: 'text-emerald-300',
    },
    match: (c: string) => c === 'training',
  },
  {
    key: 'housework' as const,
    label: '家事',
    icon: '🧹',
    tab: 'housework',
    colorStyle: {
      done: 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-glow-gold',
      pending: 'bg-slate-950/80 border-slate-800 hover:border-amber-400',
      activeText: 'text-amber-300',
    },
    match: (c: string) => c === 'housework',
  },
  {
    key: 'meal' as const,
    label: '食事',
    icon: '🍚',
    tab: 'eat_rice',
    colorStyle: {
      done: 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-glow-gold',
      pending: 'bg-slate-950/80 border-slate-800 hover:border-amber-400',
      activeText: 'text-amber-300',
    },
    match: (c: string) => c === 'eat_rice' || c === 'eat_meat',
  },
];

const ALL_CATEGORY_DEFAULT_POINTS = 100;

export const AllCategoryCard: React.FC<AllCategoryCardProps> = ({
  currentUser,
  actionLogs,
  onNavigate,
}) => {
  const [allCategoryPoints, setAllCategoryPoints] = useState<number>(ALL_CATEGORY_DEFAULT_POINTS);

  useEffect(() => {
    fetch('/api/point-rules')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.rules) {
          const rule = data.rules.find((r: any) => r.category === 'bonus_all_category');
          if (rule && Number.isFinite(rule.points)) {
            setAllCategoryPoints(rule.points);
          }
        }
      })
      .catch(() => {});
  }, []);

  const todayStr = todayLogicalDateStr();

  // 本日のユーザーの記録されたカテゴリを抽出
  const todayCategories = useMemo(() => {
    const categories: { [key: string]: boolean } = {};
    actionLogs.forEach((log) => {
      if (log.user_id !== currentUser.id || log.status === 'rejected' || log.category === 'bonus') return;
      const day = logLogicalDateStr(log.created_at);
      if (day === todayStr) {
        const group = CATEGORY_GROUPS.find((g) => g.match(log.category || ''));
        if (group) categories[group.key] = true;
      }
    });
    return categories;
  }, [actionLogs, currentUser.id, todayStr]);

  const allCategoryAwarded = currentUser.last_all_category_date === todayStr;
  const missingCategories = CATEGORY_GROUPS.filter((g) => !todayCategories[g.key]);

  if (allCategoryPoints <= 0) return null;

  return (
    <div
      className={`glass-card p-5 rounded-3xl border space-y-3 transition-all duration-300 shadow-xl ${
        allCategoryAwarded || missingCategories.length === 0
          ? 'bg-gradient-to-r from-emerald-950/60 via-slate-900 to-emerald-950/60 border-emerald-500/50 shadow-emerald-500/10'
          : 'bg-gradient-to-r from-indigo-950/50 via-slate-900 to-indigo-950/50 border-indigo-500/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Target className="w-4 h-4 text-indigo-300" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-1.5">
              🎯 全カテゴリ制覇ボーナス
            </h4>
            <p className="text-xs text-slate-400">メニューと連動した5カテゴリを今日1回ずつ達成してボーナスゲット！</p>
          </div>
        </div>
        <span className="text-xs font-mono font-black text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1 rounded-xl">
          +{allCategoryPoints.toLocaleString()} pt
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {CATEGORY_GROUPS.map((g) => {
          const done = !!todayCategories[g.key];
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => !done && onNavigate(g.tab)}
              disabled={done}
              className={`p-2 rounded-2xl border text-center transition-all ${
                done
                  ? `${g.colorStyle.done} cursor-default`
                  : `${g.colorStyle.pending} cursor-pointer`
              }`}
            >
              <div className="text-lg sm:text-xl leading-none">{g.icon}</div>
              <div className={`text-xs sm:text-xs font-bold mt-1 ${done ? g.colorStyle.activeText : 'text-slate-200'}`}>
                {g.label}
              </div>
              <div className="mt-1 flex items-center justify-center">
                {done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <span className="text-xs sm:text-xs text-slate-500 font-bold px-1 py-0.5 rounded-full bg-slate-900">未</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-1 text-center">
        {allCategoryAwarded ? (
          <p className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> 今日は全カテゴリ制覇完了！ +{allCategoryPoints.toLocaleString()}pt 獲得済み
          </p>
        ) : missingCategories.length === 0 ? (
          <p className="text-xs font-bold text-emerald-300">
            🎉 5つ揃いました！次の行動記録で +{allCategoryPoints.toLocaleString()}pt が付与されます！
          </p>
        ) : missingCategories.length === 1 ? (
          <p className="text-xs font-bold text-indigo-200">
            🔥 あと <strong className="text-amber-300">「{missingCategories[0].label}」</strong> だけ！
            1件実施で +{allCategoryPoints.toLocaleString()}pt
          </p>
        ) : (
          <p className="text-xs text-slate-300">
            残り{missingCategories.length}カテゴリ（{missingCategories.map((g) => g.label).join('・')}）。
            今日中にそれぞれ1回ずつクリアしよう！
          </p>
        )}
      </div>
    </div>
  );
};
