import React from 'react';
import { User } from '../types';
import { Trophy, ShieldCheck, UserPlus, LogIn } from 'lucide-react';

interface LoginSelectScreenProps {
  users: User[];
  onSelectUser: (user: User) => void;
  onToggleParentMode: () => void;
  onOpenRegisterModal: () => void;
}

export const LoginSelectScreen: React.FC<LoginSelectScreenProps> = ({
  users,
  onSelectUser,
  onToggleParentMode,
  onOpenRegisterModal,
}) => {
  return (
    <div className="min-h-screen bg-cyber-dark text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      
      {/* Background Glow Elements */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-cyber-neonCyan/10 blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-1/4 right-10 w-80 h-80 rounded-full bg-cyber-neonPurple/10 blur-3xl pointer-events-none"></div>

      <div className="max-w-4xl mx-auto w-full my-auto space-y-8 relative z-10 py-8">
        
        {/* App Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyber-neonCyan to-cyber-neonPurple p-0.5 shadow-glow-cyan">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Trophy className="w-9 h-9 text-cyber-neonCyan" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-wider uppercase gradient-text-cyan font-mono">
            INCENTI QUEST
          </h1>
        </div>

        {/* User Selection Box */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-700 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-black text-white flex items-center justify-center gap-2">
              <LogIn className="w-5 h-5 text-cyber-neonCyan" />
              <span>誰としてログインしますか？</span>
            </h2>
            <p className="text-xs text-slate-400">自分のプロフィールを選択すると、ワンタップで即座にスタートできます。</p>
          </div>

          {users.length === 0 ? (
            <div className="py-8 text-center space-y-4">
              <p className="text-sm text-slate-400">まだユーザーが登録されていません。</p>
              <button
                onClick={onOpenRegisterModal}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyber-neonCyan to-indigo-600 text-slate-950 font-black text-sm hover:opacity-90 transition-all shadow-glow-cyan inline-flex items-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                <span>新規ユーザーを登録してスタート！</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => onSelectUser(user)}
                  className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-800 hover:border-cyber-neonCyan/60 cursor-pointer text-center space-y-3 group transition-all transform hover:-translate-y-1"
                >
                  <div className="text-5xl group-hover:scale-110 transition-transform">
                    {user.avatar || '⚡'}
                  </div>

                  <div className="space-y-0.5">
                    <h3 className="text-lg font-black text-white group-hover:text-cyber-neonCyan transition-colors">
                      {user.name}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      学年: {user.grade_level === 'high_3' ? '高3' : user.grade_level === 'junior_1' ? '中1' : 'その他'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span>所持pt</span>
                    <span className="font-mono font-black text-amber-400">
                      {user.current_points.toLocaleString()} pt
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Additional Actions (Add User / Parent Mode) */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={onOpenRegisterModal}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <UserPlus className="w-4 h-4 text-cyber-neonCyan" />
              <span>+ 新しいユーザーを追加登録</span>
            </button>

            <button
              onClick={onToggleParentMode}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>⚙️ 管理者モード</span>
            </button>
          </div>

        </div>

      </div>

      <footer className="text-center text-xs text-slate-500 py-4">
        QUEST HABIT &copy; Cloudflare Workers &amp; D1 Autonomous System
      </footer>
    </div>
  );
};
