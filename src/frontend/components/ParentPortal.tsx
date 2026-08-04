import React, { useState, useEffect } from 'react';
import { User, WishItem, PointRule, ActionLog } from '../types';
import { ShieldCheck, CheckCircle2, Gift, Settings, Save, Trash2, Dumbbell, Plus, Mail, RefreshCw, ExternalLink, ShoppingCart } from 'lucide-react';
import { formatLogDateTime } from '../dateUtils';

interface ParentPortalProps {
  users: User[];
  wishItems: WishItem[];
  onRefresh: () => void;
  onNavigate?: (tab: string) => void;
}

export const ParentPortal: React.FC<ParentPortalProps> = ({
  users,
  wishItems,
  onRefresh,
  onNavigate,
}) => {
  const claimedWishes = wishItems.filter((item) => item.is_claimed && !item.is_approved);

  const [pointRules, setPointRules] = useState<PointRule[]>([
    { category: 'input_book', title: '📖 読書インプット', points: 300, description: '本を1冊読んで感想を提出（自己申告）' },
    { category: 'input_movie', title: '🎬 映画インプット', points: 120, description: '映画を観てレビューを提出（自己申告）' },
    { category: 'input_manga', title: '💬 漫画インプット', points: 50, description: '漫画を読んで感想メモを提出（自己申告）' },
    { category: 'study_quiz', title: '🧠 クイズ1問正解', points: 1, description: '4択クイズ正解時の獲得ポイント' },
    { category: 'bonus_300pt', title: '🎉 1日300pt突破ボーナス', points: 200, description: 'ボーナス・ガチャ倍率を除いた1日の素点が300ptを超えた時の単発ボーナス（0で無効化）' },
    { category: 'bonus_500pt', title: '🔥 1日500pt突破ボーナス', points: 300, description: 'ボーナス・ガチャ倍率を除いた1日の素点が500ptを超えた時の単発ボーナス（0で無効化）' },
    { category: 'bonus_1000pt', title: '🤯 1日1000pt突破ボーナス', points: 500, description: 'ボーナス・ガチャ倍率を除いた1日の素点が1000ptを超えた時の単発ボーナス（0で無効化）' },
  ]);

  const [editingPoints, setEditingPoints] = useState<{ [category: string]: number }>({});
  const [saveSuccess, setSaveSuccess] = useState<string>('');

  const [parentPinInput, setParentPinInput] = useState<string>('');
  const [parentPinSaveSuccess, setParentPinSaveSuccess] = useState<string>('');

  const [notificationEmail, setNotificationEmail] = useState<string>('');
  const [emailSaveSuccess, setEmailSaveSuccess] = useState<string>('');

  const [allLogs, setAllLogs] = useState<ActionLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(true);
  const [selectedUserIdFilter, setSelectedUserIdFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // サブタブ管理 ('requests_logs' | 'users_training' | 'point_rules' | 'settings')
  const [activeSubTab, setActiveSubTab] = useState<'requests_logs' | 'users_training' | 'point_rules' | 'settings'>('requests_logs');

  const handleSaveParentPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentPinInput || parentPinInput.length !== 4 || !/^\d{4}$/.test(parentPinInput)) {
      alert('4桁の数字（例: 1234）を入力してください');
      return;
    }
    try {
      const res = await fetch('/api/parent/set-pin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPin: parentPinInput }),
      });
      const data = await res.json();
      if (data.success) {
        setParentPinSaveSuccess('保護者用PINコードを更新しました！');
        setParentPinInput('');
        setTimeout(() => setParentPinSaveSuccess(''), 4000);
      } else {
        alert(data.error || 'PINの変更に失敗しました');
      }
    } catch (err) {
      alert('通信エラーが発生しました');
    }
  };

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings && data.settings.notification_email) {
          setNotificationEmail(data.settings.notification_email);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveNotificationEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'notification_email', value: notificationEmail.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailSaveSuccess('通知用メールアドレスを保存しました！');
        setTimeout(() => setEmailSaveSuccess(''), 4000);
      }
    } catch (err) {
      alert('メールアドレスの保存に失敗しました');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string, currentPoints: number) => {
    if (!window.confirm(`「${userName}」さん（所持ポイント: ${currentPoints}pt）のアカウントを削除しますか？\n※関連する活動履歴や欲しいものリストもすべて削除されます。`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert(`「${userName}」さんのアカウントを削除しました。`);
        onRefresh();
      } else {
        alert(data.error || 'ユーザーの削除に失敗しました');
      }
    } catch (err) {
      alert('通信エラーが発生しました');
    }
  };

  const DEFAULT_RULES: PointRule[] = [
    { category: 'input_book', title: '📖 読書インプット', points: 300, description: '本を1冊読んで感想を提出（自己申告）' },
    { category: 'input_movie', title: '🎬 映画インプット', points: 120, description: '映画を観てレビューを提出（自己申告）' },
    { category: 'input_manga', title: '💬 漫画インプット', points: 50, description: '漫画を読んで感想メモを提出（自己申告）' },
    { category: 'study_quiz', title: '🧠 クイズ1問正解', points: 1, description: '4択クイズ正解時の獲得ポイント' },
    { category: 'bonus_300pt', title: '🎉 1日300pt突破ボーナス', points: 200, description: 'ボーナス・ガチャ倍率を除いた1日の素点が300ptを超えた時の単発ボーナス（0で無効化）' },
    { category: 'bonus_500pt', title: '🔥 1日500pt突破ボーナス', points: 300, description: 'ボーナス・ガチャ倍率を除いた1日の素点が500ptを超えた時の単発ボーナス（0で無効化）' },
    { category: 'bonus_1000pt', title: '🤯 1日1000pt突破ボーナス', points: 500, description: 'ボーナス・ガチャ倍率を除いた1日の素点が1000ptを超えた時の単発ボーナス（0で無効化）' },
  ];

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/point-rules');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.rules) {
          const apiRulesMap = new Map<string, PointRule>();
          data.rules.forEach((r: PointRule) => {
            if (r.category !== 'training') {
              apiRulesMap.set(r.category, r);
            }
          });

          // DEFAULT_RULES に記載されたカテゴリでマージ
          const mergedRules = DEFAULT_RULES.map((defRule) => {
            const apiRule = apiRulesMap.get(defRule.category);
            return apiRule ? { ...defRule, points: apiRule.points } : defRule;
          });

          // APIにのみ存在する新カテゴリも追加
          apiRulesMap.forEach((rule, cat) => {
            if (!mergedRules.some((r) => r.category === cat)) {
              mergedRules.push(rule);
            }
          });

          setPointRules(mergedRules);
          const initialMap: { [cat: string]: number } = {};
          mergedRules.forEach((r: PointRule) => {
            initialMap[r.category] = r.points;
          });
          setEditingPoints(initialMap);
        }
      }
    } catch (err) {
      console.warn('Point rules fetch fallback to local state');
    }
  };

  const fetchAllLogs = async (page: number = 1, filterUserId: string = selectedUserIdFilter) => {
    setLoadingLogs(true);
    try {
      const url = new URL(window.location.origin + '/api/action-logs');
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', '50');
      if (filterUserId && filterUserId !== 'all') {
        url.searchParams.append('user_id', filterUserId);
      }

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.logs) {
          setAllLogs(data.logs);
          if (data.pagination) {
            setCurrentPage(data.pagination.page);
            setTotalPages(data.pagination.totalPages);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchRules();
    fetchAllLogs(1, 'all');
  }, []);

  const handleFilterChange = (newUserId: string) => {
    setSelectedUserIdFilter(newUserId);
    fetchAllLogs(1, newUserId);
  };

  const handlePointChange = (category: string, newPoints: number) => {
    setEditingPoints((prev) => ({ ...prev, [category]: newPoints }));
  };

  const handleSaveRule = async (category: string) => {
    const pts = editingPoints[category];
    if (pts === undefined) return;

    try {
      const res = await fetch('/api/point-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, points: pts })
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(`「${category}」のポイントを ${pts}pt に更新しました！`);
        setTimeout(() => setSaveSuccess(''), 3000);
        fetchRules();
      }
    } catch (err) {
      setSaveSuccess(`「${category}」のポイントを更新しました（ローカル反映）`);
      setTimeout(() => setSaveSuccess(''), 3000);
    }
  };

  const handleApproveWish = async (wishId: string, title: string, points: number) => {
    // ポイントの引き落としは取り消せない操作なので、削除と同じく確認を挟む。
    if (!window.confirm(
      `「${title}」を渡したものとして承認しますか？\n\n${points.toLocaleString()} pt が引き落とされます。この操作は取り消せません。`
    )) return;

    try {
      const res = await fetch(`/api/wish-items/${wishId}/approve`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) onRefresh();
      else alert(data.error || 'ポイントの引き落としに失敗しました');
    } catch (err) {
      alert('通信エラーが発生しました');
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!window.confirm('この履歴を削除してもよろしいですか？\n※承認済みの場合は獲得したポイントも減算されます。')) {
      return;
    }
    try {
      const res = await fetch(`/api/action-logs/${logId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        // 全ユーザーポイントや履歴の再取得
        onRefresh();
        fetchAllLogs(currentPage, selectedUserIdFilter);
      } else {
        alert(data.error || '削除に失敗しました');
      }
    } catch (err) {
      alert('通信エラーが発生しました');
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    onRefresh();
    await fetchAllLogs(currentPage, selectedUserIdFilter);
    fetchRules();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-amber-400 flex items-center gap-2">
              <ShieldCheck className="w-7 h-7" />
              <span>管理者コントロールポータル</span>
            </h2>
            <button
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all shrink-0 active:scale-95 shadow-sm"
              title="全データを再読み込み"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
              <span>{isRefreshing ? '更新中...' : 'データを再読み込み'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            申請の承認、アクション履歴管理、ユーザー・運動メニューのマスター設定を行えます。
          </p>
        </div>

        {/* Quick User summary badge */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          {users.map((u) => (
            <div key={u.id} className="bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 shrink-0">
              <span className="text-xs">{u.avatar || '⚡'}</span>
              <span className="text-xs font-bold text-white">{u.name}</span>
              <span className="text-xs font-mono font-black text-amber-400">{u.current_points.toLocaleString()}pt</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveSubTab('requests_logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all whitespace-nowrap relative ${
            activeSubTab === 'requests_logs'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-glow-gold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>🎁 リクエスト & 履歴</span>
          {claimedWishes.length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-bounce">
              {claimedWishes.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('users_training')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all whitespace-nowrap ${
            activeSubTab === 'users_training'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-glow-gold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          <span>👥 ユーザー & 運動管理</span>
        </button>

        <button
          onClick={() => setActiveSubTab('point_rules')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all whitespace-nowrap ${
            activeSubTab === 'point_rules'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-glow-gold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>⚙️ ポイント獲得ルール</span>
        </button>

        <button
          onClick={() => setActiveSubTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all whitespace-nowrap ${
            activeSubTab === 'settings'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-glow-gold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>🛡 保護者設定</span>
        </button>
      </div>

      {/* Tab 1: Requests & Action Logs */}
      {activeSubTab === 'requests_logs' && (
        <div className="space-y-8 animate-fade-in">
          {/* Pending Wish Claims */}
          <div className="space-y-4">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-400" />
              <span>🎁 お子様からの交換リクエスト（物品手渡し ＆ ポイント引き落とし）</span>
            </h3>

            {claimedWishes.length === 0 ? (
              <div className="glass-card p-6 rounded-2xl text-center text-xs text-slate-400">
                現在、承認・手渡し待ちのご褒美交換リクエストはありません。
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {claimedWishes.map((item) => {
                  const isCash = item.item_type === 'cash';
                  const cashAmount = Math.floor(item.required_points * 0.7);

                  // URL抽出ロジック（product_url, title, image_urlから抽出）
                  let buyUrl: string | null = null;
                  if (item.product_url && /^https?:\/\//.test(item.product_url.trim())) {
                    buyUrl = item.product_url.trim();
                  } else if (item.image_url && /^https?:\/\//.test(item.image_url.trim()) && !item.image_url.includes('unsplash.com')) {
                    buyUrl = item.image_url.trim();
                  } else if (item.title) {
                    const match = item.title.match(/https?:\/\/[^\s]+/);
                    if (match) buyUrl = match[0];
                  }

                  const hasValidImage = item.image_url && !item.image_url.includes('unsplash.com');

                  return (
                    <div key={item.id} className={`glass-card p-5 rounded-2xl border ${isCash ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-amber-500/40'} space-y-3 shadow-xl`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                              {item.user_name || 'お子様'}からのリクエスト
                            </span>
                            {isCash && (
                              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40">
                                💵 現金還元 (7掛け)
                              </span>
                            )}
                          </div>
                          <h4 className="text-base font-bold text-white leading-snug">{item.title}</h4>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-base font-black text-amber-400 font-mono block">
                            {item.required_points.toLocaleString()} pt
                          </span>
                          {isCash && (
                            <span className="text-xs font-black text-emerald-400 font-mono">
                              (¥{cashAmount.toLocaleString()}円)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Image Preview & Direct Purchase Link */}
                      {!isCash && (
                        <div className="space-y-2 pt-1">
                          {hasValidImage && (
                            <div className="relative h-32 rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                              <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                              {buyUrl && (
                                <a
                                  href={buyUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="absolute inset-0 bg-slate-950/40 hover:bg-slate-950/20 transition-all flex items-center justify-center text-white font-bold text-xs gap-1.5 group"
                                >
                                  <span className="bg-slate-900/90 px-3 py-1.5 rounded-xl border border-amber-400/50 flex items-center gap-1.5 shadow-lg group-hover:scale-105 transition-transform">
                                    <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
                                    <span>商品ページを見る</span>
                                    <ExternalLink className="w-3 h-3 text-amber-400" />
                                  </span>
                                </a>
                              )}
                            </div>
                          )}

                          {buyUrl && (
                            <a
                              href={buyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-glow-cyan"
                            >
                              <ShoppingCart className="w-4 h-4 text-cyan-400" />
                              <span>🛒 Amazon / 購入ページを開く（直接購入）</span>
                              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                            </a>
                          )}
                        </div>
                      )}

                      {isCash && (
                        <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between font-medium">
                          <span>手渡す現金（70%還元）:</span>
                          <span className="text-sm font-black font-mono text-emerald-400">¥ {cashAmount.toLocaleString()} 円</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-800 space-y-2">
                        <p className="text-[10px] text-amber-300 leading-relaxed">
                          ※実生活で{isCash ? `お小遣い (${cashAmount.toLocaleString()}円)` : '商品'}を手渡した後にボタンを押してください。押すと <strong>{item.user_name || 'お子様'}</strong> の所持ポイントから <strong>-{item.required_points.toLocaleString()} pt</strong> が引き落とされます。
                        </p>
                        <button
                          onClick={() => handleApproveWish(item.id, item.title, item.required_points)}
                          className={`w-full py-2.5 rounded-xl text-slate-950 font-black text-xs hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-lg ${
                            isCash
                              ? 'bg-gradient-to-r from-emerald-400 to-teal-300 shadow-emerald-950'
                              : 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-glow-gold'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {isCash
                              ? `💵 現金 ${cashAmount.toLocaleString()}円を渡した！pt引き落とし (-${item.required_points.toLocaleString()} pt)`
                              : `🎁 物品を渡した！ポイントを引き落とす (-${item.required_points.toLocaleString()} pt)`
                            }
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* All Users Action Logs */}
          <div className="glass-card p-6 rounded-3xl border border-indigo-500/30 space-y-4 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                <span>📝 全員のアクション履歴 (管理・削除)</span>
              </h3>

              {/* User Filter & Refresh */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold">絞り込み:</span>
                <select
                  value={selectedUserIdFilter}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-indigo-400"
                >
                  <option value="all">👥 全員を表示</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.avatar || '⚡'} {u.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => fetchAllLogs(currentPage, selectedUserIdFilter)}
                  disabled={loadingLogs}
                  className="p-1.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-indigo-400 text-indigo-300 transition-all"
                  title="履歴を再読み込み"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin text-indigo-400' : ''}`} />
                </button>
              </div>
            </div>

            {loadingLogs ? (
              <div className="text-center py-4 text-xs text-slate-400">読み込み中...</div>
            ) : (
              (() => {
                if (allLogs.length === 0) {
                  return <div className="text-center py-4 text-xs text-slate-400">該当するアクション履歴はありません。</div>;
                }

                return (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                          <tr className="border-b border-slate-700/50 text-[10px] text-slate-400">
                            <th className="pb-2 font-medium">日時</th>
                            <th className="pb-2 font-medium">ユーザー</th>
                            <th className="pb-2 font-medium">カテゴリー / 内容</th>
                            <th className="pb-2 font-medium text-right">獲得ポイント</th>
                            <th className="pb-2 font-medium text-center">操作</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs">
                          {allLogs.map((log) => {
                            const categoryLabels: { [k: string]: string } = {
                              quiz: '🧠 クイズ',
                              study: '📚 学習',
                              input_book: '📖 読書',
                              input_movie: '🎬 映画',
                              input_manga: '💬 漫画',
                              training: '🏋️‍♂️ 運動',
                            };
                            const catLabel = categoryLabels[log.category] || log.category;

                            return (
                              <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                <td className="py-2.5 text-slate-400 font-mono text-[11px]">
                                  {formatLogDateTime(log.created_at)}
                                </td>
                                <td className="py-2.5 text-white font-bold">{log.user_name || 'ユーザー'}</td>
                                <td className="py-2.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                      {catLabel}
                                    </span>
                                    {log.title_or_menu && (
                                      <span className="text-white font-medium">{log.title_or_menu}</span>
                                    )}
                                  </div>
                                  {log.review_text && (
                                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{log.review_text}</p>
                                  )}
                                </td>
                                <td className="py-2.5 text-right font-mono font-black text-emerald-400">
                                  +{log.earned_points}
                                </td>
                                <td className="py-2.5 text-center">
                                  <button
                                    onClick={() => handleDeleteLog(log.id)}
                                    className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                                    title="この履歴を削除"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-4 pt-2">
                        <button
                          onClick={() => fetchAllLogs(currentPage - 1)}
                          disabled={currentPage === 1}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            currentPage === 1
                              ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                              : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                          }`}
                        >
                          前へ
                        </button>
                        <span className="text-xs text-slate-400 font-mono">
                          {currentPage} / {totalPages} ページ
                        </span>
                        <button
                          onClick={() => fetchAllLogs(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            currentPage === totalPages
                              ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                              : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                          }`}
                        >
                          次へ
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Users & Training Management */}
      {activeSubTab === 'users_training' && (
        <div className="space-y-8 animate-fade-in">
          {/* User Overview */}
          <div className="space-y-3">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>👥 登録アカウント一覧（削除・管理）</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {users.map((user) => (
                <div key={user.id} className="glass-card p-5 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold text-white flex items-center gap-2">
                      <span>{user.avatar || '⚡'}</span>
                      <span>{user.name}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {user.grade_level === 'high_3' ? '高校レベル' : user.grade_level === 'junior_1' ? '中学レベル' : '一般・その他'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(user.id, user.name, user.current_points)}
                        className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all"
                        title="ユーザーアカウントを削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-amber-400 font-mono">
                    {user.current_points.toLocaleString()} <span className="text-xs text-slate-400">pt</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Training Menu Master Maintenance Widget */}
          <TrainingMenuManager />
        </div>
      )}

      {/* Tab 3: Point Rules */}
      {activeSubTab === 'point_rules' && (
        <div className="animate-fade-in">
          {/* Point Rules Management Section */}
          <div className="glass-card p-6 rounded-3xl border border-amber-500/30 space-y-4 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-black text-white">⚙️ ポイント獲得ルールの設定・変更</h3>
              </div>
              <div className="flex items-center gap-3">
                {onNavigate && (
                  <button
                    onClick={() => onNavigate('streak_bonus_info')}
                    className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <span>🔥 連続ボーナス制度の解説ページ</span>
                  </button>
                )}
              </div>
            </div>

            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold animate-in fade-in">
                {saveSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pointRules.map((rule) => {
                const currentEdit = editingPoints[rule.category] ?? rule.points;
                const isBonus = rule.category.startsWith('bonus_');

                return (
                  <div
                    key={rule.category}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                      isBonus
                        ? 'bg-purple-950/30 border-purple-500/40 shadow-sm'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-white flex items-center gap-1.5">
                        <span>{rule.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{rule.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        step={10}
                        min={0}
                        value={currentEdit}
                        onChange={(e) => handlePointChange(rule.category, Number(e.target.value))}
                        className="w-24 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-amber-400 font-mono font-bold text-right focus:outline-none focus:border-amber-400"
                      />
                      <span className="text-xs font-bold text-slate-400">pt</span>
                      <button
                        onClick={() => handleSaveRule(rule.category)}
                        className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition-all"
                        title="設定を保存"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Parent Settings */}
      {activeSubTab === 'settings' && (
        <div className="space-y-6 animate-fade-in">
          {/* Email Notification Settings Card */}
          <div className="glass-card p-6 rounded-3xl space-y-4 border border-cyan-500/30 bg-slate-900/60 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-cyan-400" />
                  <span>📧 ご褒美交換リクエストの保護者メール通知設定</span>
                </h3>
                <p className="text-xs text-slate-400">
                  お子様が「🎁 これと交換したい！親にリクエスト」を提出した際、通知メールを受け取るメールアドレスを登録できます。
                </p>
              </div>
            </div>

            {emailSaveSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-300">
                ✅ {emailSaveSuccess}
              </div>
            )}

            <form onSubmit={handleSaveNotificationEmail} className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="email"
                  required
                  placeholder="例: parent@example.com"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs hover:opacity-90 transition-all shrink-0 shadow-glow-cyan"
                >
                  保存する
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                ※メールアドレスを登録しておくと、お子様がポイント到達後にリクエストした瞬間、即座にメールでお知らせが届きます。
              </p>
            </form>
          </div>

          {/* Parent Security PIN Settings Card */}
          <div className="glass-card p-6 rounded-3xl space-y-4 border border-amber-500/30 bg-slate-900/60 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <span>🛡 保護者管理者用 4桁PINコードの設定・変更</span>
                </h3>
                <p className="text-xs text-slate-400">
                  管理者モードに入る際に入力するセキュリティPINコードを設定・変更できます。（初期値: <strong className="text-amber-400 font-mono">1234</strong>）
                </p>
              </div>
            </div>

            {parentPinSaveSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-300">
                ✅ {parentPinSaveSuccess}
              </div>
            )}

            <form onSubmit={handleSaveParentPin} className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="password"
                  maxLength={4}
                  placeholder="新しい4桁PIN (例: 5678)"
                  value={parentPinInput}
                  onChange={(e) => setParentPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full sm:w-64 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs hover:opacity-90 transition-all shrink-0 shadow-glow-gold"
                >
                  PINを変更する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

const TrainingMenuManager: React.FC = () => {
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newMenuName, setNewMenuName] = useState<string>('');
  const [newMenuPts, setNewMenuPts] = useState<number>(50);
  const [newVideoUrl, setNewVideoUrl] = useState<string>('');
  const [msg, setMsg] = useState<string>('');

  const fetchMenus = () => {
    setLoading(true);
    fetch('/api/training-menus')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.menus) {
          setMenus(data.menus);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenuName.trim()) return;

    try {
      const res = await fetch('/api/training-menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuName: newMenuName.trim(),
          defaultPoints: newMenuPts,
          videoUrl: newVideoUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.menus) {
        setMenus(data.menus);
        setNewMenuName('');
        setNewVideoUrl('');
        setNewMenuPts(50);
        setMsg('新しい運動メニューを追加しました！');
        setTimeout(() => setMsg(''), 3000);
      }
    } catch (err) {
      alert('メニューの追加に失敗しました');
    }
  };

  const handleDeleteMenu = async (menuId: string, name: string) => {
    if (!window.confirm(`「${name}」を削除しますか？`)) return;

    try {
      const res = await fetch(`/api/training-menus/${menuId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success && data.menus) {
        setMenus(data.menus);
        setMsg(`「${name}」を削除しました`);
        setTimeout(() => setMsg(''), 3000);
      }
    } catch (err) {
      alert('削除に失敗しました');
    }
  };

  const [savedMenuId, setSavedMenuId] = useState<string | null>(null);

  const handleUpdateMenu = async (menu: any) => {
    try {
      const res = await fetch(`/api/training-menus/${menu.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuName: menu.menu_name,
          defaultPoints: Number(menu.default_points || 50),
          videoUrl: menu.video_url || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.menus) {
        setMenus(data.menus);
        setSavedMenuId(menu.id);
        setMsg(`「${menu.menu_name}」の設定を更新しました！`);
        setTimeout(() => setSavedMenuId(null), 3000);
        setTimeout(() => setMsg(''), 3000);
      }
    } catch (err) {
      alert('更新に失敗しました');
    }
  };

  return (
    <div className="glass-card p-6 rounded-3xl border border-emerald-500/40 space-y-5 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-emerald-400" />
            <span>🏋️‍♂️ 運動メニュー・ポイント設定マスター管理</span>
          </h3>
          <p className="text-xs text-slate-400">
            子どもたちが選択する運動メニューの編集、ポイント設定、動画URLの追加・削除ができます。
          </p>
        </div>
        {msg && (
          <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 rounded-full animate-bounce">
            {msg}
          </span>
        )}
      </div>

      {/* Add New Menu Form */}
      <form onSubmit={handleAddMenu} className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
        <h4 className="text-xs font-black text-emerald-400 flex items-center gap-1">
          <Plus className="w-4 h-4" />
          <span>新規メニューの追加</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input
            type="text"
            required
            placeholder="メニュー名 (例: 体幹プランク)"
            value={newMenuName}
            onChange={(e) => setNewMenuName(e.target.value)}
            className="sm:col-span-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
          />
          <input
            type="number"
            required
            min={10}
            step={5}
            placeholder="基準ポイント (例: 50)"
            value={newMenuPts}
            onChange={(e) => setNewMenuPts(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-emerald-400"
          />
          <button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl py-2 transition-all flex items-center justify-center gap-1 shadow-md shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>追加する</span>
          </button>
        </div>
        <input
          type="url"
          placeholder="YouTube URL (任意: 例 https://youtu.be/...)"
          value={newVideoUrl}
          onChange={(e) => setNewVideoUrl(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
        />
      </form>

      {/* Menu List */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-xs text-slate-400 py-4 text-center">読み込み中...</p>
        ) : menus.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">登録されている運動メニューはありません。</p>
        ) : (
          menus.map((m) => (
            <div key={m.id} className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={m.menu_name}
                  onChange={(e) =>
                    setMenus((prev) =>
                      prev.map((item) => (item.id === m.id ? { ...item, menu_name: e.target.value } : item))
                    )
                  }
                  className="sm:col-span-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-400"
                />

                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400">基準:</span>
                  <input
                    type="number"
                    step={5}
                    value={m.default_points}
                    onChange={(e) =>
                      setMenus((prev) =>
                        prev.map((item) => (item.id === m.id ? { ...item, default_points: Number(e.target.value) } : item))
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-emerald-400"
                  />
                  <span className="text-xs text-amber-400 font-bold">pt</span>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleUpdateMenu(m)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                      savedMenuId === m.id
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-lg shadow-emerald-500/30 scale-105'
                        : 'bg-slate-800 border-slate-700 hover:border-emerald-400 text-slate-200 hover:text-white'
                    }`}
                  >
                    {savedMenuId === m.id ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                        <span>保存完了！</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5 text-emerald-400" />
                        <span>保存</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDeleteMenu(m.id, m.menu_name)}
                    className="p-1.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="このメニューを削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <input
                type="url"
                placeholder="YouTube URL"
                value={m.video_url || ''}
                onChange={(e) =>
                  setMenus((prev) =>
                    prev.map((item) => (item.id === m.id ? { ...item, video_url: e.target.value } : item))
                  )
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-400 font-mono"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
