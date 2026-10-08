import React from 'react';
import { User, ActionLog } from '../types';
import { Trophy, Flame, Swords, Zap } from 'lucide-react';

interface RivalBoardProps {
  users: User[];
  currentUser: User | null;
  actionLogs: ActionLog[];
}

export const RivalBoard: React.FC<RivalBoardProps> = ({ users, currentUser, actionLogs }) => {
  if (!currentUser) return null;

  // Sort users by current_points descending
  const sortedRivals = [...users].sort((a, b) => b.current_points - a.current_points);
  const userRankIndex = sortedRivals.findIndex((u) => u.id === currentUser.id);

  // Find leader and person ahead
  const leader = sortedRivals.length > 0 ? sortedRivals[0] : null;
  const isLeader = userRankIndex === 0;
  const isSecond = userRankIndex === 1;
  const personAhead = userRankIndex > 0 ? sortedRivals[userRankIndex - 1] : null;
  const gapToAhead = personAhead ? personAhead.current_points - currentUser.current_points : 0;
  const gapToLeader = leader && !isLeader ? leader.current_points - currentUser.current_points : 0;

  // Find active streakers (users with current_streak_days >= 2)
  const activeStreakers = [...users]
    .filter((u) => (u.current_streak_days || 0) >= 2)
    .sort((a, b) => (b.current_streak_days || 0) - (a.current_streak_days || 0));

  const topStreaker = activeStreakers.length > 0 ? activeStreakers[0] : null;
  const otherStreakers = activeStreakers.slice(1);

  return (
    <div className="glass-card p-4 sm:p-6 md:p-8 rounded-3xl space-y-5 sm:space-y-6 border border-cyber-border">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Swords className="w-6 h-6 text-cyber-neonCyan" />
            <span>ライバルの状況・ランキング</span>
          </h3>
          <p className="text-xs text-slate-400">お互いのポイント獲得状況を高め合おう！</p>
        </div>

        {isLeader ? (
          <div className="bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-amber-300 flex items-center gap-2 shadow-glow-gold">
            <Trophy className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>あなたが現在ランキング 1 位です！👑</span>
          </div>
        ) : isSecond && personAhead ? (
          <div className="bg-red-500/10 border border-red-500/30 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-red-300 flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-400 animate-bounce shrink-0" />
            <span>首位の<span className="inline-block whitespace-nowrap">【{personAhead.name}】</span>まで あと <strong className="text-amber-400 font-mono text-sm">{gapToAhead.toLocaleString()} pt</strong>！</span>
          </div>
        ) : personAhead ? (
          <div className="bg-red-500/10 border border-red-500/30 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-red-300 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-red-400 animate-bounce shrink-0" />
              <span>次の順位（{userRankIndex}位）の<span className="inline-block whitespace-nowrap">【{personAhead.name}】</span>まで あと <strong className="text-amber-400 font-mono text-sm">{gapToAhead.toLocaleString()} pt</strong>！</span>
            </div>
            {leader && leader.id !== personAhead.id && (
              <span className="text-[0.6875rem] text-slate-400 font-normal">
                （首位<span className="inline-block whitespace-nowrap">【{leader.name}】</span>まで あと {gapToLeader.toLocaleString()} pt）
              </span>
            )}
          </div>
        ) : null}
      </div>

      {/* 🚀 すごい記録更新中速報バナー */}
      {topStreaker && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-red-500/15 border border-amber-500/40 rounded-2xl p-3.5 sm:p-4 shadow-glow-gold relative overflow-hidden">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-xl shrink-0 animate-pulse">
                🔥
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/25 px-2 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
                    <span>注目の記録更新中！</span>
                  </span>
                  <span className="text-xs font-bold text-slate-200">
                    【{topStreaker.name}】が連続記録を猛烈更新中！
                  </span>
                </div>
                <div className="text-sm sm:text-base font-black text-white mt-1 flex items-center gap-2 flex-wrap">
                  <span className="text-amber-400 font-mono text-base sm:text-lg">
                    🔥 {topStreaker.current_streak_days}日連続達成
                  </span>
                  {(topStreaker.current_100pt_streak_days || 0) >= 2 ? (
                    <span className="text-xs font-bold text-fuchsia-300 bg-fuchsia-500/20 border border-fuchsia-500/40 px-2 py-0.5 rounded-full font-mono">
                      👑 神ストリーク {topStreaker.current_100pt_streak_days}日連続
                    </span>
                  ) : (topStreaker.current_50pt_streak_days || 0) >= 2 ? (
                    <span className="text-xs font-bold text-orange-300 bg-orange-500/20 border border-orange-500/40 px-2 py-0.5 rounded-full font-mono">
                      💥 100pt以上 {topStreaker.current_50pt_streak_days}日連続
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {otherStreakers.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-amber-500/20 flex items-center gap-2 flex-wrap text-xs text-slate-300">
              <span className="text-slate-400 text-[11px] font-medium shrink-0">こちらも継続中:</span>
              {otherStreakers.map((os) => (
                <span
                  key={os.id}
                  className="bg-slate-900/80 border border-slate-700/80 px-2 py-0.5 rounded-lg text-[11px] font-bold text-slate-200 flex items-center gap-1"
                >
                  <span>{os.avatar || '⚡'}</span>
                  <span>{os.name}</span>
                  <span className="text-amber-400 font-mono font-black">{os.current_streak_days}日</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Cards */}
      <div className="space-y-3">
        {sortedRivals.map((user, idx) => {
          const isMe = user.id === currentUser.id;
          const rank = idx + 1;
          const rankBadge = rank === 1 ? '🥇 1位' : rank === 2 ? '🥈 2位' : `${rank}位`;
          const rankBg = rank === 1 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : rank === 2 ? 'bg-slate-700/50 text-slate-200 border-slate-600' : 'bg-slate-800/40 text-slate-400 border-slate-700';

          // Count approved actions for this user
          const userApprovedLogs = actionLogs.filter((l) => l.user_id === user.id && l.status === 'approved');

          return (
            <div
              key={user.id}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 ${
                isMe
                  ? 'bg-slate-900/95 border-cyber-neonCyan/60 shadow-glow-cyan'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Top Row on Mobile: Rank + Avatar + Name + YOU */}
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                {/* Rank Badge */}
                <div className={`px-2 py-1 rounded-xl text-xs font-black font-mono border shrink-0 text-center min-w-[46px] sm:min-w-[52px] ${rankBg}`}>
                  {rankBadge}
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-lg sm:text-xl border border-slate-700 shrink-0">
                  {user.avatar || '⚡'}
                </div>

                {/* Name & YOU badge */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="text-sm sm:text-base font-black text-white whitespace-nowrap">
                    {user.name}
                  </span>
                  {isMe && (
                    <span className="text-[9px] bg-cyber-neonCyan/20 text-cyber-neonCyan font-black px-1.5 py-0.5 rounded-full border border-cyber-neonCyan/30 shrink-0 whitespace-nowrap">
                      YOU
                    </span>
                  )}
                </div>

                {/* Desktop-only Sub Info (Achievements) */}
                <div className="hidden sm:block text-[11px] text-slate-400 font-medium pl-2 border-l border-slate-800/80 shrink-0">
                  達成: <strong className="text-slate-200 font-mono">{userApprovedLogs.length}</strong> 回
                </div>
              </div>

              {/* Bottom Row on Mobile / Right Column on Desktop */}
              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-slate-800/50 sm:border-t-0 shrink-0">
                {/* Mobile-only Sub Info (Achievements) */}
                <div className="sm:hidden text-xs text-slate-400 font-medium flex items-center gap-1">
                  <span>クリア達成:</span>
                  <strong className="text-slate-200 font-mono font-bold">{userApprovedLogs.length}</strong>
                  <span>回</span>
                </div>

                {/* Points */}
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 font-medium leading-none block sm:inline sm:mr-2">所持ポイント</span>
                  <span className="text-base sm:text-lg font-black text-amber-400 font-mono leading-none whitespace-nowrap">
                    {user.current_points.toLocaleString()} <span className="text-xs text-amber-300 font-normal">pt</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
