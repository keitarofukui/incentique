import React, { useState } from 'react';
import { ActionLog, User } from '../types';
import {
  Calendar as CalendarIcon,
  BookOpen,
  Search,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { formatLogDateTime, logLocalDateStr, currentLocalMonthStr } from '../dateUtils';

interface ReflectionViewProps {
  currentUser: User | null;
  actionLogs: ActionLog[];
  onDeleteLog: (id: string) => void;
}

export const ReflectionView: React.FC<ReflectionViewProps> = ({
  currentUser,
  actionLogs = [],
  onDeleteLog,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => currentLocalMonthStr());

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const safeLogs = Array.isArray(actionLogs) ? actionLogs : [];

  // Filter logs for target user (if currentUser is specified, else all approved logs) sorted newest-first
  const userLogs = safeLogs
    .filter((log) => {
      if (!log || log.status !== 'approved') return false;
      if (currentUser && log.user_id !== currentUser.id) return false;
      return true;
    })
    .sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (timeA !== timeB && !isNaN(timeA) && !isNaN(timeB)) {
        return timeB - timeA;
      }
      return (b.id || '').localeCompare(a.id || '');
    });

  // Available months in user logs + current month (local/JST months, not UTC)
  const currentMonthStr = currentLocalMonthStr();
  const monthSet = new Set<string>([currentMonthStr]);
  userLogs.forEach((log) => {
    const ym = logLocalDateStr(log?.created_at).slice(0, 7);
    if (ym) monthSet.add(ym);
  });
  const availableMonths = Array.from(monthSet).sort().reverse();

  // Logs for selected month
  const monthLogs = userLogs.filter((log) => {
    if (!log || !log.created_at) return true;
    return logLocalDateStr(log.created_at).startsWith(selectedMonth);
  });

  // Calculate monthly stats
  const totalMonthPoints = monthLogs.reduce((sum, log) => sum + Number(log.earned_points || 0), 0);
  const bookLogs = monthLogs.filter((l) => (l.category || '') === 'input_book');
  const movieLogs = monthLogs.filter((l) => (l.category || '') === 'input_movie');
  const trainingLogs = monthLogs.filter((l) => (l.category || '') === 'training');
  const eatRiceLogs = monthLogs.filter((l) => (l.category || '') === 'eat_rice');
  const eatMeatLogs = monthLogs.filter((l) => (l.category || '') === 'eat_meat');
  const quizLogs = monthLogs.filter((l) => (l.category || '') === 'quiz' || (l.category || '') === 'study');

  // Filtered list for display
  const displayLogs = monthLogs.filter((log) => {
    if (!log) return false;
    const cat = log.category || '';
    const title = log.title_or_menu || '';
    const review = log.review_text || '';

    if (categoryFilter === 'input' && !cat.startsWith('input_')) return false;
    if (categoryFilter === 'training' && cat !== 'training') return false;
    if (categoryFilter === 'eat_rice' && cat !== 'eat_rice' && cat !== 'eat_meat') return false;
    if (categoryFilter === 'quiz' && cat !== 'quiz' && cat !== 'study') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        title.toLowerCase().includes(q) ||
        review.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Bookshelf items (all book & movie reviews ever submitted)
  const allBookshelfLogs = userLogs.filter((l) => (l.category || '').startsWith('input_'));

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 p-6 rounded-3xl border border-purple-500/30 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-300 shadow-glow-purple">
            <CalendarIcon className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <span>📅 過去の振り返り・成長アーカイブ</span>
            </h2>
            <p className="text-xs text-slate-300">
              月ごとの頑張り・読んだ本の感想・筋トレの軌跡をいつでもプレイバック！
            </p>
          </div>
        </div>

        {/* Month Selector Dropdown */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-2 rounded-2xl border border-slate-800 self-start sm:self-auto">
          <span className="text-xs font-bold text-slate-400 pl-2">対象月:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-900 border border-purple-500/40 text-purple-300 font-mono font-bold text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-400"
          >
            {(availableMonths.length > 0 ? availableMonths : [currentMonthStr]).map((m) => (
              <option key={m} value={m}>
                {(m || '').replace('-', '年')}月
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Monthly Achievements KPI Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-transparent space-y-1">
          <span className="text-[10px] font-extrabold text-amber-300 uppercase tracking-wider block">
            今月の獲得ポイント
          </span>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
            +{totalMonthPoints.toLocaleString()} <span className="text-xs">pt</span>
          </div>
          <span className="text-[10px] text-slate-400 block">累計頑張り成果</span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-500/10 to-transparent space-y-1">
          <span className="text-[10px] font-extrabold text-purple-300 uppercase tracking-wider block">
            読書・映画の達成
          </span>
          <div className="text-2xl sm:text-3xl font-black text-purple-300 font-mono">
            {bookLogs.length + movieLogs.length} <span className="text-xs">作品</span>
          </div>
          <span className="text-[10px] text-slate-400 block">
            (本: {bookLogs.length}冊 / 映画: {movieLogs.length}本)
          </span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-500/10 to-transparent space-y-1">
          <span className="text-[10px] font-extrabold text-cyan-300 uppercase tracking-wider block">
            クイズ正解数
          </span>
          <div className="text-2xl sm:text-3xl font-black text-cyan-300 font-mono">
            {quizLogs.length} <span className="text-xs">問</span>
          </div>
          <span className="text-[10px] text-slate-400 block">全5教科知識の完全マスター</span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-transparent space-y-1">
          <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider block">
            運動実施回数
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono">
            {trainingLogs.length} <span className="text-xs">回</span>
          </div>
          <span className="text-[10px] text-slate-400 block">体力の継続強化</span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-yellow-500/30 bg-gradient-to-b from-yellow-500/10 to-transparent space-y-1">
          <span className="text-[10px] font-extrabold text-yellow-300 uppercase tracking-wider block">
            食事完食回数
          </span>
          <div className="text-2xl sm:text-3xl font-black text-yellow-300 font-mono">
            {eatRiceLogs.length + eatMeatLogs.length} <span className="text-xs">回</span>
          </div>
          <span className="text-[10px] text-slate-400 block">
            (米: {eatRiceLogs.length}回 / 肉: {eatMeatLogs.length}回)
          </span>
        </div>
      </div>

      {/* Special Feature: Digital Bookshelf & Media Review Shelf */}
      {allBookshelfLogs.length > 0 && (
        <div className="glass-card p-6 rounded-3xl border border-purple-500/30 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-400" />
              <span>📚 読書・映画のデジタル書棚（感想アーカイブ）</span>
            </h3>
            <span className="text-xs font-bold text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/40">
              全 {allBookshelfLogs.length} 作品の記録
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allBookshelfLogs.map((item) => (
              <div
                key={item.id || Math.random().toString()}
                className="bg-slate-900/80 p-4 rounded-2xl border border-purple-500/20 hover:border-purple-500/50 transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full uppercase">
                    {item.category === 'input_book' ? '📖 読書' : item.category === 'input_movie' ? '🎬 映画' : item.category === 'input_drama' ? '📺 ドラマ' : '💬 漫画'}
                  </span>
                  <span className="text-xs font-mono font-black text-amber-400">+{item.earned_points || 0} pt</span>
                </div>

                <h4 className="text-sm font-black text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                  {item.title_or_menu || '無題'}
                </h4>

                {item.review_text && (
                  <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800 italic line-clamp-3 leading-relaxed">
                    "{item.review_text}"
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                  <span>記録日: {formatLogDateTime(item.created_at, true)}</span>
                  <button
                    onClick={() => onDeleteLog(item.id)}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                    title="削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Activity Log Timeline with Search & Filters */}
      <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-cyan-400" />
            <span>【{(selectedMonth || '').replace('-', '年')}月】全活動履歴タイムライン</span>
          </h3>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="タイトルや感想で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl pl-9 pr-4 py-1.5 focus:outline-none focus:border-cyan-400 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-bold text-slate-400 shrink-0">絞り込み:</span>
          {[
            { id: 'all', label: 'すべて表示' },
            { id: 'input', label: '📚 読書・映画・ドラマ' },
            { id: 'training', label: '🏋️‍♂️ 運動' },
            { id: 'eat_rice', label: '🍚🥩 食事' },
            { id: 'quiz', label: '🧠 クイズ' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setCategoryFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                categoryFilter === f.id
                  ? 'bg-cyber-neonCyan text-slate-950 shadow-glow-cyan'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Timeline Log List */}
        <div className="space-y-3">
          {displayLogs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              該当する活動履歴が見つかりませんでした。対象月や絞り込みを変更してみてください。
            </p>
          ) : (
            displayLogs.map((log) => (
              <div
                key={log.id}
                className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:border-slate-700 transition-all"
              >
                <div className="space-y-1.5 flex-1 min-w-0 w-full">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-white break-words">{log.title_or_menu}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full uppercase font-mono shrink-0 mt-0.5">
                      {log.category === 'input_book'
                        ? '読書'
                        : log.category === 'input_movie'
                        ? '映画'
                        : log.category === 'input_drama'
                        ? 'ドラマ'
                        : log.category === 'input_manga'
                        ? '漫画'
                        : log.category === 'training'
                        ? 'トレーニング'
                        : log.category === 'eat_rice'
                        ? '🍚 お米'
                        : log.category === 'eat_meat'
                        ? '🥩 お肉'
                        : 'クイズ'}
                    </span>
                  </div>
                  {log.review_text && (
                    <p className="text-xs text-slate-300 italic line-clamp-3">"{log.review_text}"</p>
                  )}
                  <div className="text-[10px] text-slate-400 font-mono">
                    実施日時: {formatLogDateTime(log.created_at, true)}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 border-t border-slate-800/50 sm:border-0 pt-3 sm:pt-0 mt-1 sm:mt-0">
                  <span className="text-base font-black text-amber-400 font-mono">
                    +{log.earned_points} pt
                  </span>
                  {/* アイコンだけだと二重登録に気づいても消し方が分からないので、
                      文字を添えて押せると分かるようにしておく */}
                  <button
                    onClick={() => onDeleteLog(log.id)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-700 text-slate-400 text-[11px] font-bold hover:text-red-300 hover:border-red-500/50 hover:bg-red-500/10 transition-colors flex items-center gap-1 shrink-0"
                    title="誤登録を取り消して削除します（獲得ポイントも減算されます）"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>取り消し</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
