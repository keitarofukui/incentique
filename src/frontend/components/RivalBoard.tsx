import React from 'react';
import { User, ActionLog } from '../types';
import { Trophy, Flame, Swords } from 'lucide-react';

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

  // Find leader or person ahead
  const personAhead = userRankIndex > 0 ? sortedRivals[userRankIndex - 1] : null;
  const gapToAhead = personAhead ? personAhead.current_points - currentUser.current_points : 0;

  return (
    <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-6 border border-cyber-border">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Swords className="w-6 h-6 text-cyber-neonCyan" />
            <span>ライバルの状況・ランキング</span>
          </h3>
          <p className="text-xs text-slate-400">お互いのポイント獲得状況を高め合おう！</p>
        </div>

        {personAhead ? (
          <div className="bg-red-500/10 border border-red-500/30 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-red-300 flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-400 animate-bounce" />
            <span>首位の【{personAhead.name}】まで あと <strong className="text-amber-400 font-mono text-sm">{gapToAhead.toLocaleString()} pt</strong>！</span>
          </div>
        ) : (
          <div className="bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-amber-300 flex items-center gap-2 shadow-glow-gold">
            <Trophy className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>あなたが現在ランキング 1 位です！👑</span>
          </div>
        )}
      </div>

      {/* Leaderboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedRivals.map((user, idx) => {
          const isMe = user.id === currentUser.id;
          const rank = idx + 1;
          const rankBadge = rank === 1 ? '🥇 1位' : rank === 2 ? '🥈 2位' : `${rank}位`;

          // Count approved actions for this user
          const userApprovedLogs = actionLogs.filter((l) => l.user_id === user.id && l.status === 'approved');

          return (
            <div
              key={user.id}
              className={`p-5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                isMe
                  ? 'bg-slate-900/90 border-cyber-neonCyan/60 shadow-glow-cyan'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-2xl border border-slate-700 shrink-0">
                  {user.avatar || '⚡'}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-amber-400 font-mono">{rankBadge}</span>
                    <span className="text-sm font-bold text-white">{user.name}</span>
                    {isMe && (
                      <span className="text-xs bg-cyber-neonCyan/20 text-cyber-neonCyan font-bold px-2 py-0.5 rounded-full border border-cyber-neonCyan/30">
                        YOU
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span>クリア達成数: <strong className="text-slate-200">{userApprovedLogs.length} 回</strong></span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs text-slate-400">所持pt</div>
                <div className="text-xl font-black text-amber-400 font-mono">
                  {user.current_points.toLocaleString()} <span className="text-xs text-amber-300">pt</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
