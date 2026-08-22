import React, { useState, useEffect, useMemo } from 'react';
import { User, ActionLog, UserSummary } from '../types';
import { Flame, CheckCircle2, ArrowRight, Zap } from 'lucide-react';
import { logLogicalDateStr, todayLogicalDateStr, getLogicalDaysDiff } from '../dateUtils';

interface PersonalStreakCardProps {
  currentUser: User;
  actionLogs: ActionLog[];
  userSummary?: UserSummary | null;
  onNavigate: (tab: string) => void;
}

const DEFAULT_STREAK_MILESTONES = [2, 3, 4, 5, 6, 7, 10, 14, 21, 30, 50, 100, 150, 200, 250, 300, 365];

export const PersonalStreakCard: React.FC<PersonalStreakCardProps> = ({
  currentUser,
  actionLogs,
  userSummary,
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
  const midMultiplier = Number.isFinite(rulePoints.streak_mid_multiplier) ? rulePoints.streak_mid_multiplier : 30;
  const godThreshold = Number.isFinite(rulePoints.streak_god_threshold) ? rulePoints.streak_god_threshold : 250;
  const godMultiplier = Number.isFinite(rulePoints.streak_god_multiplier) ? rulePoints.streak_god_multiplier : 100;

  const todayStr = todayLogicalDateStr();

  // 本日の獲得素点・ボーナス・記録件数・カテゴリ達成を判定
  const { todayBase, todayBonus, todayTotal, todayCount, categoryStatus } = useMemo(() => {
    let baseSum = 0;
    let bonusSum = 0;
    let count = 0;
    const catMap: { [key: string]: boolean } = {
      quiz: false,
      training: false,
      housework: false,
      eat_rice: false,
      input: false,
    };

    if (userSummary && userSummary.todayCategories) {
      catMap.quiz = !!userSummary.todayCategories.quiz || !!userSummary.todayCategories.study;
      catMap.training = !!userSummary.todayCategories.training;
      catMap.housework = !!userSummary.todayCategories.housework;
      catMap.eat_rice = !!userSummary.todayCategories.eat_rice || !!userSummary.todayCategories.eat_meat;
      catMap.input = !!userSummary.todayCategories.input_book || !!userSummary.todayCategories.input_manga || !!userSummary.todayCategories.input_movie;
    }

    actionLogs.forEach((log) => {
      if (log.user_id !== currentUser.id || log.status === 'rejected') return;
      const day = logLogicalDateStr(log.created_at);
      if (day !== todayStr) return;

      const earned = Number(log.earned_points || 0);
      const cat = log.category || '';

      if (cat === 'bonus') {
        bonusSum += earned;
      } else {
        const base = Number(log.base_points ?? log.earned_points) || 0;
        baseSum += base;
        bonusSum += Math.max(0, earned - base);
        count += 1;

        if (!userSummary) {
          if (cat === 'quiz' || cat === 'study') catMap.quiz = true;
          if (cat === 'training') catMap.training = true;
          if (cat === 'housework') catMap.housework = true;
          if (cat === 'eat_rice' || cat === 'eat_meat') catMap.eat_rice = true;
          if (cat.startsWith('input_')) catMap.input = true;
        }
      }
    });

    if (userSummary && userSummary.todayEarnedPoints > 0 && count === 0) {
      count = 1;
    }

    return {
      todayBase: baseSum,
      todayBonus: bonusSum,
      todayTotal: baseSum + bonusSum,
      todayCount: count,
      categoryStatus: catMap,
    };
  }, [actionLogs, userSummary, currentUser.id, todayStr]);

  const doneToday = todayCount > 0;

  const categories = [
    { key: 'quiz', label: 'クイズ/勉強', icon: '🧠', done: categoryStatus.quiz },
    { key: 'input', label: 'インプット', icon: '📖', done: categoryStatus.input },
    { key: 'training', label: '運動', icon: '💪', done: categoryStatus.training },
    { key: 'housework', label: '家事', icon: '🧹', done: categoryStatus.housework },
    { key: 'eat_rice', label: '食事/水分', icon: '🍚', done: categoryStatus.eat_rice },
  ];

  const completedCategoriesCount = categories.filter((c) => c.done).length;
  const allCategoryAwarded = completedCategoriesCount === 5;
  const missingCategories = categories.filter((c) => !c.done);

  // DB確定の連続日数（最終活動日から2日以上経過している場合は失効して0日として動的補正）
  const diffDaily = getLogicalDaysDiff(currentUser.last_action_date);
  const diffMid = getLogicalDaysDiff(currentUser.last_50pt_date);
  const diffGod = getLogicalDaysDiff(currentUser.last_100pt_date);

  const rawStreakDaily = currentUser.current_streak_days || 0;
  const rawStreakMid = currentUser.current_50pt_streak_days || 0;
  const rawStreakGod = currentUser.current_100pt_streak_days || 0;

  // 最終活動日が今日または昨日（diff <= 1）であれば有効。diff >= 2 であれば失効（0日）
  const streakDaily = diffDaily <= 1 ? rawStreakDaily : 0;
  const streakMid = diffMid <= 1 ? rawStreakMid : 0;
  const streakGod = diffGod <= 1 ? rawStreakGod : 0;

  const streakIfRecorded = doneToday ? streakDaily : (diffDaily <= 1 ? streakDaily + 1 : 1);
  const streakMidIfRecorded = todayBase >= midThreshold ? streakMid : (diffMid <= 1 ? streakMid + 1 : 1);
  const streakGodIfRecorded = todayBase >= godThreshold ? streakGod : (diffGod <= 1 ? streakGod + 1 : 1);


  const dailyBonusPayout = streakIfRecorded * dailyMultiplier;
  const midBonusPayout = streakMidIfRecorded * midMultiplier;
  const godBonusPayout = streakGodIfRecorded * godMultiplier;

  const reachedMilestone = !doneToday && dynamicMilestones.includes(streakIfRecorded) ? streakIfRecorded : undefined;
  const upcomingMilestone = dynamicMilestones.find((m) => m > streakIfRecorded);

  // これまでの累計獲得pt。交換承認で減る current_points とは別指標で、
  // 「これまでどれくらい稼いだか」を示す（サーバ側で action_logs から集計）。
  //
  // summary 未取得（500 / 通信断 / 初回ロード中）のときは 0 へフォールバックせず
  // バー自体を出さない。累計 0pt の表示は事実と異なるうえ、「今まで何も稼げて
  // いない」という最も強い逆モチベーションになるため。
  const lifetimeEarned = typeof userSummary?.lifetimeEarnedPoints === 'number' ? userSummary.lifetimeEarnedPoints : undefined;
  const lifetimeSpent = typeof userSummary?.spentPoints === 'number' ? userSummary.spentPoints : undefined;
  const lifetimeBalance = typeof userSummary?.totalPoints === 'number' ? userSummary.totalPoints : undefined;
  // 3 値すべてが同一レスポンス由来なので、揃って揃わないときは表示しない。
  // こうしておけば「累計 - 使った = 使える」が画面上で必ず成立する。
  const hasLifetime = lifetimeEarned !== undefined && lifetimeSpent !== undefined && lifetimeBalance !== undefined;

  // 節目の到達表示（大きい方を優先）。演出は既存クラスのみで、新規アニメは足さない。
  const lifetimeMilestone = lifetimeEarned !== undefined
    ? [100000, 50000, 10000].find((m) => lifetimeEarned >= m)
    : undefined;

  return (
    <div className="glass-card p-5 sm:p-6 rounded-3xl border-2 border-orange-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/60 space-y-5 shadow-2xl relative overflow-hidden">
      {/* Background glow decoration */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />

      {/* 👑 TOP STATUS BAR: 本日の成果サマリー (素点 / ボーナス / 本日合計pt) */}
      <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <span className="text-xs font-black text-slate-300">本日の獲得成果サマリー</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
          <div className="px-3 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
            <span className="text-xs font-semibold text-slate-400 block">⚡ 実力素点</span>
            <span className="text-xs font-mono font-black text-cyan-300">+{todayBase.toLocaleString()} pt</span>
          </div>
          <div className="px-3 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
            <span className="text-xs font-semibold text-slate-400 block">🎁 ボーナス等</span>
            <span className="text-xs font-mono font-black text-purple-300">+{todayBonus.toLocaleString()} pt</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-center shadow-md">
            <span className="text-xs font-bold text-amber-300 block">🏆 本日獲得合計</span>
            <span className="text-sm font-mono font-black text-amber-300">+{todayTotal.toLocaleString()} pt</span>
          </div>
        </div>
      </div>

      {/* 🏆 これまでの累計獲得: 本日バーが「今日」、こちらが「これまで」。
          時間軸が違うので同じバーに混ぜず、上下に並べて対比させる */}
      {hasLifetime && (
        <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="text-lg">🏆</span>
            <span className="text-xs font-black text-slate-300">これまでの累計獲得</span>
            {lifetimeMilestone !== undefined && (
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 whitespace-nowrap">
                🎖️ {(lifetimeMilestone / 10000).toLocaleString()}万pt達成
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
            <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-center shadow-glow-gold">
              <span className="text-xs font-bold text-amber-300 block">💰 累計獲得</span>
              <span className="text-lg font-mono font-black text-amber-300 leading-tight whitespace-nowrap">
                {lifetimeEarned.toLocaleString()} pt
              </span>
            </div>
            <div className="px-3 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-xs font-semibold text-slate-400 block">🎁 交換に使った</span>
              <span className="text-xs font-mono font-black text-slate-300 whitespace-nowrap">
                {lifetimeSpent.toLocaleString()} pt
              </span>
            </div>
            <div className="px-3 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-xs font-semibold text-slate-400 block">👛 いま使える</span>
              <span className="text-xs font-mono font-black text-amber-400 whitespace-nowrap">
                {lifetimeBalance.toLocaleString()} pt
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500/20 to-rose-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0 shadow-lg">
            <Flame className="w-6 h-6 text-orange-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-white tracking-tight">📊 ダッシュボード</h2>
              <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                doneToday
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-glow-emerald'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
              }`}>
                {doneToday ? '✅ 今日は記録済み' : '❌ 今日は未記録'}
              </span>
            </div>
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

      {/* 3段階ストリーク常時表示カード (今日達成で +◯pt 獲得表示つき) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* ① デイリー連続 */}
        <div className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-2.5 transition-all ${
          doneToday ? 'bg-indigo-950/50 border-indigo-500/40 shadow-md' : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-black text-indigo-300 flex items-center gap-1">
              <span>🔥 デイリー</span>
              <span className="text-xs font-normal text-slate-400">(1pt+)</span>
            </span>
            <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-lg ${
              streakDaily > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
            }`}>
              {streakDaily}日連続
            </span>
          </div>
          <div className="space-y-1">
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
            {/* 今日達成したら何ptもらえるか */}
            <div className="p-1.5 rounded-lg bg-indigo-950/80 border border-indigo-500/30 text-xs font-bold text-indigo-200 flex items-center justify-between">
              <span>獲得ボーナス:</span>
              <span className="font-mono font-black text-amber-300">+{dailyBonusPayout} pt</span>
            </div>
          </div>
        </div>

        {/* ② 中級連続 */}
        <div className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-2.5 transition-all ${
          todayBase >= midThreshold ? 'bg-rose-950/50 border-rose-500/40 shadow-md' : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-black text-rose-300 flex items-center gap-1">
              <span>💥 中級</span>
              <span className="text-xs font-normal text-slate-400">({midThreshold}pt+)</span>
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
            {/* 今日達成したら何ptもらえるか */}
            <div className="p-1.5 rounded-lg bg-rose-950/80 border border-rose-500/30 text-xs font-bold text-rose-200 flex items-center justify-between">
              <span>達成時ボーナス:</span>
              <span className="font-mono font-black text-amber-300">+{midBonusPayout} pt</span>
            </div>
          </div>
        </div>

        {/* ③ 神連続 */}
        <div className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-2.5 transition-all ${
          todayBase >= godThreshold ? 'bg-amber-950/50 border-amber-500/40 shadow-md' : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-black text-amber-300 flex items-center gap-1">
              <span>👑 神</span>
              <span className="text-xs font-normal text-slate-400">({godThreshold}pt+)</span>
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
            {/* 今日達成したら何ptもらえるか */}
            <div className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-500/30 text-xs font-bold text-amber-200 flex items-center justify-between">
              <span>達成時ボーナス:</span>
              <span className="font-mono font-black text-amber-300">+{godBonusPayout} pt</span>
            </div>
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
            <span className="text-slate-400 font-normal text-xs shrink-0">
              次の節目 {upcomingMilestone}日目まであと{upcomingMilestone - streakDaily}日
            </span>
          )}
        </div>
      )}

      {/* 全カテゴリ制覇ウィジェット（5カテゴリの達成チェック。件数は categories から導出し、
          カテゴリを増減しても表記がズレないようにする） */}
      <div className={`p-3.5 rounded-2xl border space-y-2.5 transition-all ${
        allCategoryAwarded ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-base">👑</span>
            <span className="text-xs font-black text-white">本日の全カテゴリ制覇進捗</span>
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
            allCategoryAwarded
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
          }`}>
            {allCategoryAwarded ? '🏆 本日制覇完了！' : `達成: ${completedCategoriesCount} / ${categories.length} カテゴリ`}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {categories.map((c) => (
            <div
              key={c.key}
              className={`p-2 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
                c.done
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
              }`}
            >
              <span className="text-sm">{c.icon}</span>
              <span className="truncate">{c.label}</span>
              <span className="ml-auto text-xs">{c.done ? '✅' : '⚪'}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {allCategoryAwarded ? (
            <span className="text-emerald-300 font-bold">✨ すばらしい！本日全{categories.length}カテゴリを達成し、制覇ボーナスを獲得しました！</span>
          ) : (
            <>
              残りを埋めると全制覇ボーナス！ あと{' '}
              <strong className="text-amber-300">
                {missingCategories.map((c) => `【${c.label}】`).join('・')}
              </strong>{' '}
              を記録しよう！
            </>
          )}
        </p>
      </div>
    </div>
  );
};
