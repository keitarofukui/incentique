import React, { useRef, useEffect } from 'react';
import { User } from '../types';
import { Sparkles, Trophy, LogOut, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  isParentMode: boolean;
  onLogout: () => void;
  onToggleParentMode: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenTrainingModal: () => void;
  onOpenInputReviewModal: (type?: 'input_book' | 'input_movie' | 'input_manga') => void;
  onOpenEatRiceModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  isParentMode,
  onLogout,
  onToggleParentMode,
  activeTab,
  setActiveTab,
  onOpenTrainingModal,
  onOpenInputReviewModal,
  onOpenEatRiceModal,
}) => {
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the active header button into view whenever activeTab changes
  useEffect(() => {
    if (activeTab === 'dashboard' && containerRef.current) {
      containerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    } else if (activeTab === 'rivals' && containerRef.current) {
      containerRef.current.scrollTo({ left: containerRef.current.scrollWidth, behavior: 'smooth' });
    } else if (activeBtnRef.current) {
      activeBtnRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeTab]);

  return (
    <header className="bg-slate-950/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* App Title & Parent Mode Switcher.
            min-w-0 + flex-1 lets this group shrink (and the title truncate) so it
            can never grow into the points badge on a narrow screen. */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2 cursor-pointer group min-w-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyber-neonCyan to-cyber-neonPurple flex items-center justify-center shadow-glow-cyan group-hover:scale-105 transition-transform shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
            </div>
            <span className="font-mono font-black text-base sm:text-xl tracking-wide sm:tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyber-neonCyan via-white to-cyber-neonPurple truncate">
              INCENTIQUE
            </span>
          </div>

          <button
            onClick={onToggleParentMode}
            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
              isParentMode
                ? 'bg-amber-500 text-slate-950 shadow-glow-gold animate-pulse'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
            title={isParentMode ? '保護者モードを終了' : '保護者モードに切り替え'}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            {/* In parent mode the points badge is hidden, so there is room for the
                label even on mobile — and the active state is worth spelling out. */}
            <span className={isParentMode ? 'whitespace-nowrap' : 'hidden sm:inline whitespace-nowrap'}>
              {isParentMode ? '保護者モード中' : '保護者切り替え'}
            </span>
          </button>
        </div>

        {/* User Points Badge & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
          {currentUser && !isParentMode && (
            <div
              onClick={() => setActiveTab('wishlist')}
              className="glass-card px-2.5 sm:px-3 py-1.5 rounded-2xl border border-amber-500/40 flex items-center gap-1.5 sm:gap-2 cursor-pointer hover:border-amber-400 transition-all shadow-glow-gold shrink-0"
            >
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
              {/* Single compact line on mobile; the "ポイント" caption only appears
                  once there is width for it */}
              <div className="flex flex-col">
                <span className="hidden sm:block text-[10px] text-slate-400 font-bold leading-none">ポイント</span>
                <span className="text-sm sm:text-base font-black font-mono text-amber-400 leading-tight whitespace-nowrap">
                  {currentUser.current_points.toLocaleString()}<span className="text-[10px] font-normal ml-0.5">pt</span>
                </span>
              </div>
            </div>
          )}

          <button
            onClick={onLogout}
            className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shrink-0"
            title="ログアウト"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ログアウト</span>
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Navigation Action Bar (Hidden in Parent Mode) */}
      {!isParentMode && (
        <div className="bg-slate-900/90 border-t border-slate-800/80 px-2 sm:px-4">
          <div ref={containerRef} className="max-w-7xl mx-auto flex items-center gap-1.5 overflow-x-auto py-2 scrollbar-none">
            
            <button
              ref={activeTab === 'dashboard' ? activeBtnRef : null}
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'dashboard'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-md font-black ring-2 ring-slate-600'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📊 ホーム
            </button>

            <button
              ref={activeTab === 'quiz' ? activeBtnRef : null}
              onClick={() => setActiveTab('quiz')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 shrink-0 ${
                activeTab === 'quiz'
                  ? 'bg-cyan-500 text-slate-950 border-2 border-cyan-300 shadow-glow-cyan font-black'
                  : 'text-cyan-300 hover:text-white bg-cyan-950/60 border border-cyan-500/40'
              }`}
            >
              <span>🧠 クイズ</span>
            </button>

            <button
              ref={activeTab === 'input_book' ? activeBtnRef : null}
              onClick={() => onOpenInputReviewModal('input_book')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 shrink-0 ${
                activeTab === 'input_book'
                  ? 'bg-purple-500 text-white border-2 border-purple-300 shadow-glow-purple font-black'
                  : 'text-purple-300 hover:text-white bg-purple-950/60 border border-purple-500/40'
              }`}
            >
              <span>📚 読書・映画</span>
            </button>

            <button
              ref={activeTab === 'training' ? activeBtnRef : null}
              onClick={onOpenTrainingModal}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 shrink-0 ${
                activeTab === 'training'
                  ? 'bg-emerald-500 text-slate-950 border-2 border-emerald-300 shadow-glow-emerald font-black'
                  : 'text-emerald-300 hover:text-white bg-emerald-950/60 border border-emerald-500/40'
              }`}
            >
              <span>🏋️‍♂️ 運動</span>
            </button>

            {onOpenEatRiceModal && (
              <button
                ref={activeTab === 'eat_rice' ? activeBtnRef : null}
                onClick={onOpenEatRiceModal}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 shrink-0 ${
                  activeTab === 'eat_rice'
                    ? 'bg-amber-500 text-slate-950 border-2 border-amber-300 shadow-glow-gold font-black'
                    : 'text-amber-300 hover:text-white bg-amber-950/60 border border-amber-500/40'
                }`}
              >
                <span>🍚🥩 食べて稼ぐ</span>
              </button>
            )}

            <button
              ref={activeTab === 'action-logs' ? activeBtnRef : null}
              onClick={() => setActiveTab('action-logs')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'action-logs'
                  ? 'bg-slate-800 text-white border border-slate-600 font-black ring-2 ring-slate-600'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📅 履歴
            </button>

            <button
              ref={activeTab === 'wishlist' ? activeBtnRef : null}
              onClick={() => setActiveTab('wishlist')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'wishlist'
                  ? 'bg-amber-500/30 text-amber-300 border-2 border-amber-400 shadow-glow-gold font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🎁 交換所
            </button>

            <button
              ref={activeTab === 'rivals' ? activeBtnRef : null}
              onClick={() => setActiveTab('rivals')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'rivals'
                  ? 'bg-cyber-neonCyan/30 text-cyber-neonCyan border-2 border-cyber-neonCyan shadow-glow-cyan font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ⚔️ ライバル
            </button>

          </div>
        </div>
      )}
    </header>
  );
};
