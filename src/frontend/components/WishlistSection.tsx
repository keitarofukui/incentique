import React, { useState } from 'react';
import { User, WishItem } from '../types';
import { Gift, Plus, CheckCircle2, Clock, Sparkles, AlertCircle, ShoppingCart } from 'lucide-react';
import confetti from 'canvas-confetti';

interface WishlistSectionProps {
  currentUser: User | null;
  isParentMode?: boolean;
  users?: User[];
  wishItems: WishItem[];
  onRefresh: () => void;
}

export const WishlistSection: React.FC<WishlistSectionProps> = ({
  currentUser,
  isParentMode = false,
  users = [],
  wishItems,
  onRefresh,
}) => {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newPoints, setNewPoints] = useState<number>(3000);
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  if (!currentUser && !isParentMode) return null;

  // Parent mode sees every child's list; a child sees only their own
  const displayWishItems = isParentMode
    ? wishItems
    : wishItems.filter((item) => currentUser && item.user_id === currentUser.id);

  const handleClaim = async (item: WishItem) => {
    if (!currentUser || currentUser.current_points < item.required_points) return;

    try {
      const res = await fetch(`/api/wish-items/${item.id}/claim`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (data.success) {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
        onRefresh();
      }
    } catch (err) {
      console.error('Claim error', err);
    }
  };

  const handleApproveWish = async (wishId: string) => {
    try {
      const res = await fetch(`/api/wish-items/${wishId}/approve`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) onRefresh();
    } catch (err) {
      console.error('Approve wish error', err);
    }
  };

  const handleDeleteWish = async (wishId: string) => {
    if (!window.confirm('このリクエスト項目を削除しますか？')) return;
    try {
      const res = await fetch(`/api/wish-items/${wishId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) onRefresh();
    } catch (err) {
      console.error('Delete wish error', err);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // In parent mode with no child selected, fall back to the first user rather
    // than posting an empty userId (which the API would reject silently).
    const targetUserId = currentUser ? currentUser.id : users[0]?.id;
    if (!targetUserId) {
      alert('登録先のユーザーが見つかりません。先にユーザーを登録してください。');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/wish-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUserId,
          title: newTitle,
          imageUrl: newImageUrl || undefined,
          requiredPoints: newPoints
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewTitle('');
        setNewImageUrl('');
        setShowAddModal(false);
        onRefresh();
      }
    } catch (err) {
      console.error('Add wish error', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Gift className="w-7 h-7 text-amber-400" />
            <span>交換所</span>
          </h2>
          <p className="text-xs text-slate-400">
            自分で貯めたポイントで買いたい物品やお小遣いをリクエスト登録しよう！
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs hover:bg-amber-500/30 transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>🎁 欲しいものをリクエスト</span>
        </button>
      </div>

      {/* Point Exchange Flow Explanation Banner */}
      <div className="glass-card p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-slate-900 to-indigo-950/20 space-y-3">
        <div className="flex items-center gap-2 text-xs font-black text-amber-300">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>🔄 ご褒美交換・ポイント引き落としの流れ</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] flex items-center justify-center shrink-0 border border-amber-500/40">1</span>
            <div>
              <div className="font-bold text-white">1. 交換申請</div>
              <div className="text-[11px] text-slate-400">必要ptに達したら「ポイント交換を申請する」をタップ。</div>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px] flex items-center justify-center shrink-0 border border-cyan-500/40">2</span>
            <div>
              <div className="font-bold text-white">2. 親の承認</div>
              <div className="text-[11px] text-slate-400 font-semibold">保護者が管理者モードで申請を確認・承認します。</div>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] flex items-center justify-center shrink-0 border border-emerald-500/40">3</span>
            <div>
              <div className="font-bold text-white">3. ポイント減算 ＆ 確定</div>
              <div className="text-[11px] text-slate-400">承認ボタンを押すとptが自動引き落とし（減算）されご褒美確定！</div>
            </div>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {displayWishItems.length === 0 ? (
        <div className="glass-card p-8 rounded-3xl border border-slate-800 text-center space-y-3">
          <Gift className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="text-sm font-bold text-slate-300">リクエストされている欲しいもの（ご褒美）はまだありません。</div>
          <p className="text-xs text-slate-500">右上「🎁 欲しいものをリクエスト」ボタンから、ポイントと交換したい物品やお小遣いを自由に登録しましょう！</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayWishItems.map((item) => {
            const targetUser = users.find((u) => u.id === item.user_id) || (currentUser?.id === item.user_id ? currentUser : null);
            const currentPoints = targetUser ? targetUser.current_points : (currentUser?.current_points || 0);
            const progress = Math.min(100, Math.round((currentPoints / item.required_points) * 100));
            const canClaim = currentPoints >= item.required_points;

            return (
              <div
                key={item.id}
                className="glass-card rounded-3xl overflow-hidden border border-slate-800 flex flex-col justify-between group hover:border-amber-500/40 transition-all shadow-xl"
              >
                {/* Image Header */}
                <div className="relative h-48 bg-slate-900 overflow-hidden">
                  <img
                    src={item.image_url || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop'}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>

                  <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-amber-500/40 font-mono font-black text-amber-400 text-xs shadow-glow-gold">
                    {item.required_points.toLocaleString()} pt
                  </div>

                  {targetUser && (
                    <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-700 text-xs font-bold text-slate-200">
                      {targetUser.avatar || '⚡'} {targetUser.name}
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white leading-snug">
                      {item.title}
                    </h3>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-400 font-mono">
                        <span>達成度</span>
                        <span>{progress}% ({currentPoints.toLocaleString()} / {item.required_points.toLocaleString()} pt)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Claim / Status Actions */}
                  <div className="pt-2 space-y-1.5">
                    {item.is_approved ? (
                      <div className="w-full py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-center font-extrabold text-xs flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> 🎁 物品受け取り ＆ ポイント消費完了！
                      </div>
                    ) : isParentMode ? (
                      <div className="space-y-2">
                        {item.is_claimed ? (
                          <button
                            onClick={() => handleApproveWish(item.id)}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-glow-gold"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>🎁 物品を渡した！ポイント引き落とし (-{item.required_points.toLocaleString()} pt)</span>
                          </button>
                        ) : (
                          <div className="w-full py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-center font-bold text-xs">
                            ポイント未到達（{progress}%）
                          </div>
                        )}
                        <button
                          onClick={() => handleDeleteWish(item.id)}
                          className="w-full py-1 text-[11px] text-slate-500 hover:text-red-400 transition-colors text-center"
                        >
                          この項目を削除
                        </button>
                      </div>
                    ) : item.is_claimed ? (
                      <div className="space-y-1">
                        <div className="w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-center font-extrabold text-xs flex items-center justify-center gap-1.5">
                          <Clock className="w-4 h-4 animate-spin" /> 📦 親の調達・手渡し待ち
                        </div>
                        <p className="text-[10px] text-slate-400 text-center">※現物を手渡された時に親がポイントを引き落とします</p>
                      </div>
                    ) : canClaim ? (
                      <div className="space-y-1">
                        <button
                          onClick={() => handleClaim(item)}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-glow-gold"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span>🎁 これと交換したい！親にリクエスト</span>
                        </button>
                        <p className="text-[10px] text-slate-400 text-center">※手渡し時に {item.required_points.toLocaleString()} pt が引き落とされます</p>
                      </div>
                    ) : (
                      <div className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-center font-bold text-xs flex items-center justify-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        <span>あと {(item.required_points - currentPoints).toLocaleString()} pt で交換可能</span>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Wish Target Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-card w-full max-w-md rounded-3xl p-6 border border-slate-700 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-400" />
              <span>欲しいものをリクエスト・登録</span>
            </h3>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>ご褒美リクエストのルール</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  貯めたポイントで買いたい商品やご褒美と、必要な希望ポイントを登録できます。ポイント達成後に親へリクエストを送ることができます！
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">商品・報酬タイトル</label>
                <input
                  type="text"
                  required
                  placeholder="例: PS5ゲームソフト / ラグビースパイク"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">必要ポイント (pt)</label>
                <input
                  type="number"
                  required
                  step={50}
                  min={50}
                  value={newPoints}
                  onChange={(e) => setNewPoints(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">画像URL (任意)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition-all"
                >
                  追加する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
