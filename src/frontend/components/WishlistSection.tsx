import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { User, WishItem } from '../types';
import { ApproveWishModal } from './ApproveWishModal';
import { Gift, Plus, CheckCircle2, Clock, Sparkles, AlertCircle, ShoppingCart, Banknote, Coins, ExternalLink, Undo2 } from 'lucide-react';
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
  // 承認は引き落とし額を入力させるためモーダルで行う
  const [approvingItem, setApprovingItem] = useState<WishItem | null>(null);
  const [itemType, setItemType] = useState<'goods' | 'cash'>('goods');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newPointsStr, setNewPointsStr] = useState<string>('');
  const [cashAmountStr, setCashAmountStr] = useState<string>('');
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [newProductUrl, setNewProductUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  if (!currentUser && !isParentMode) return null;

  const newPoints = Number(newPointsStr) || 0;
  const cashAmount = Number(cashAmountStr) || 0;
  // 浮動小数点数誤差（700 / 0.7 = 1000.0000000000001 -> 1001pt）を防止するため (cashAmount * 10) / 7 で算出
  const requiredPointsForCash = cashAmount > 0 ? Math.ceil((cashAmount * 10) / 7) : 0;

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

    const targetUser = currentUser ? currentUser : users[0];
    const availablePoints = targetUser ? targetUser.current_points : 0;

    let finalPoints = 0;
    let finalTitle = '';

    if (itemType === 'cash') {
      if (!cashAmountStr || cashAmount <= 0) {
        alert('換金希望金額を入力してください。');
        return;
      }
      finalPoints = requiredPointsForCash;
      finalTitle = `現金還元 (${cashAmount.toLocaleString()}円)`;

      const maxCashForUser = Math.floor(availablePoints * 0.7);
      if (!isParentMode && finalPoints > availablePoints) {
        alert(`所持ポイント（${availablePoints.toLocaleString()} pt）で換金できるのは最大 ${maxCashForUser.toLocaleString()} 円までです。`);
        return;
      }
    } else {
      if (!newPointsStr || newPoints <= 0) {
        alert('交換ポイントを入力してください。');
        return;
      }
      finalPoints = newPoints;
      finalTitle = newTitle.trim();

      if (!finalTitle) {
        alert('商品・報酬タイトルを入力してください。');
        return;
      }

      if (!isParentMode && finalPoints > availablePoints) {
        alert(`所持ポイント（${availablePoints.toLocaleString()} pt）を超えて設定することはできません。`);
        return;
      }
    }

    const targetUserId = targetUser?.id;
    if (!targetUserId) {
      alert('登録先のユーザーが見つかりません。先にユーザーを登録してください。');
      return;
    }

    // 子どもが登録できるのは所持ポイント以内のものだけ（上のバリデーション）なので、
    // 登録した時点で必ず申請可能。二段階に分ける意味が無く、押し忘れの原因になるため
    // 確認したうえで登録と同時に申請まで済ませる。
    // 保護者モードは所持ポイントを超える「貯金目標」も登録できるので従来どおり登録のみ。
    const requestNow = !isParentMode;

    if (requestNow) {
      const lines = [
        'この内容で交換をリクエストしますか？',
        '',
        `【${itemType === 'cash' ? '現金還元' : '欲しいもの'}】${finalTitle}`,
        `必要ポイント: ${finalPoints.toLocaleString()} pt`,
      ];
      if (itemType === 'cash') {
        lines.push(`受取現金金額: ¥${cashAmount.toLocaleString()}（7掛け還元）`);
      }
      lines.push(
        `残りポイント: ${availablePoints.toLocaleString()} → ${(availablePoints - finalPoints).toLocaleString()} pt`,
        '',
        '※ポイントが引かれるのは、保護者が実際に手渡したあとです。'
      );
      if (!window.confirm(lines.join('\n'))) return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/wish-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUserId,
          title: finalTitle,
          imageUrl: itemType === 'cash' ? undefined : (newImageUrl || undefined),
          productUrl: itemType === 'cash' ? undefined : (newProductUrl.trim() || undefined),
          requiredPoints: finalPoints,
          itemType: itemType,
        })
      });
      const data = await res.json();

      if (!data.success || !data.id) {
        alert(data.error || '登録に失敗しました。もう一度お試しください。');
        return;
      }

      if (requestNow) {
        // 登録に続けて申請まで通す。ここで失敗しても項目は残るので、
        // 一覧のリクエストボタンから出し直せる。
        try {
          const claimRes = await fetch(`/api/wish-items/${data.id}/claim`, { method: 'PUT' });
          const claimData = await claimRes.json();
          if (claimData.success) {
            confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
          } else {
            alert('登録はできましたが、リクエストの送信に失敗しました。一覧の「親にリクエスト」から送ってください。');
          }
        } catch (_) {
          alert('登録はできましたが、リクエストの送信に失敗しました。一覧の「親にリクエスト」から送ってください。');
        }
      }

      setNewTitle('');
      setNewPointsStr('');
      setCashAmountStr('');
      setNewImageUrl('');
      setNewProductUrl('');
      setItemType('goods');
      setShowAddModal(false);
      onRefresh();
    } catch (err) {
      console.error('Add wish error', err);
      alert('通信エラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  const userCurrentPoints = currentUser ? currentUser.current_points : (users[0]?.current_points || 0);
  const maxCash = Math.floor(userCurrentPoints * 0.7);
  const effectiveRequiredPoints = itemType === 'cash' ? requiredPointsForCash : newPoints;
  const isPointsExceeded = !isParentMode && effectiveRequiredPoints > userCurrentPoints;

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
            貯めたポイントで欲しいご褒美物品やお小遣い（現金還元）をリクエストしよう！登録すると、そのまま保護者へのリクエストになります。
          </p>
        </div>

        <button
          onClick={() => {
            setNewPointsStr('');
            setShowAddModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs hover:bg-amber-500/30 transition-all flex items-center gap-1.5 self-start sm:self-auto shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>🎁 欲しいもの / 現金還元リクエスト</span>
        </button>
      </div>

      {/* Point Exchange Flow Explanation Banner */}
      <div className="glass-card p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-slate-900 to-indigo-950/20 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-black text-amber-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>🔄 ご褒美交換・ポイント引き落としのルール</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">
            💵 現金還元は「7掛け (70%還元)」でお小遣い化！
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] flex items-center justify-center shrink-0 border border-amber-500/40">1</span>
            <div>
              <div className="font-bold text-white">1. 交換申請</div>
              <div className="text-[11px] text-slate-400">物品（100%換算）または現金還元（70%換算）を選択して申請。</div>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px] flex items-center justify-center shrink-0 border border-cyan-500/40">2</span>
            <div>
              <div className="font-bold text-white">2. 親の確認・手渡し</div>
              <div className="text-[11px] text-slate-400 font-semibold">保護者が現物またはお小遣い（70%分の現金）を手渡します。</div>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] flex items-center justify-center shrink-0 border border-emerald-500/40">3</span>
            <div>
              <div className="font-bold text-white">3. ポイント減算 ＆ 確定</div>
              <div className="text-[11px] text-slate-400">承認ボタンを押すとptが自動引き落とし（減算）完了！</div>
            </div>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {displayWishItems.length === 0 ? (
        <div className="glass-card p-8 rounded-3xl border border-slate-800 text-center space-y-3">
          <Gift className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="text-sm font-bold text-slate-300">リクエストされている欲しいもの（ご褒美）はまだありません。</div>
          <p className="text-xs text-slate-500">右上ボタンから、物品やお小遣い（現金還元）を自由に登録しましょう！</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayWishItems.map((item) => {
            const targetUser = users.find((u) => u.id === item.user_id) || (currentUser?.id === item.user_id ? currentUser : null);
            const currentPoints = targetUser ? targetUser.current_points : (currentUser?.current_points || 0);
            const progress = Math.min(100, Math.round((currentPoints / item.required_points) * 100));
            const canClaim = currentPoints >= item.required_points;
            const isCash = item.item_type === 'cash';
            const cashAmount = Math.floor(item.required_points * 0.7);

            return (
              <div
                key={item.id}
                className="glass-card rounded-3xl overflow-hidden border border-slate-800 flex flex-col justify-between group hover:border-amber-500/40 transition-all shadow-xl"
              >
                {/* Image Header */}
                <div className="relative h-48 bg-slate-900 overflow-hidden">
                  <img
                    src={item.image_url || (isCash ? 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop' : 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop')}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>

                  <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                    <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-amber-500/40 font-mono font-black text-amber-400 text-xs shadow-glow-gold">
                      {item.required_points.toLocaleString()} pt
                    </div>
                    {isCash && (
                      <div className="bg-emerald-950/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-emerald-500/50 text-[10px] font-black text-emerald-300 flex items-center gap-1 shadow-lg">
                        <Banknote className="w-3 h-3 text-emerald-400" />
                        <span>70%還元: {cashAmount.toLocaleString()}円</span>
                      </div>
                    )}
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
                    <div className="flex items-center gap-2">
                      {isCash ? (
                        <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-md text-[10px] font-bold flex items-center gap-1 shrink-0">
                          <Banknote className="w-3 h-3" /> 現金還元 (7掛け)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-md text-[10px] font-bold flex items-center gap-1 shrink-0">
                          <Gift className="w-3 h-3" /> 物品ご褒美
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-white leading-snug">
                      {item.title}
                    </h3>

                    {/* 購入ページへの導線。承認済みの品も一覧には残るので、
                        保護者ポータルの承認待ちリストから消えた後もここから辿れる。 */}
                    {item.product_url && (
                      <a
                        href={item.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/20 border border-orange-500/50 text-orange-200 text-xs font-black hover:bg-orange-500/30 transition-all"
                      >
                        <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                        <span>🛒 購入ページを開く</span>
                        <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                      </a>
                    )}

                    {isCash && (
                      <div className="p-2 bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 font-medium flex items-center justify-between">
                        <span>受取現金金額:</span>
                        <span className="font-black text-emerald-400 font-mono text-sm">¥ {cashAmount.toLocaleString()} 円</span>
                      </div>
                    )}

                    {/* 差し戻しコメント。理由が分からないと同じものを出し直すだけになる */}
                    {!item.is_approved && !item.is_claimed && item.parent_comment && (
                      <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 space-y-1">
                        <div className="text-[10px] font-black text-rose-300 flex items-center gap-1">
                          <Undo2 className="w-3 h-3" />
                          <span>保護者から差し戻されました</span>
                        </div>
                        <p className="text-xs text-rose-100 font-bold leading-relaxed break-words">
                          「{item.parent_comment}」
                        </p>
                        <p className="text-[10px] text-rose-300/70">
                          内容を見直して、もう一度リクエストできます
                        </p>
                      </div>
                    )}

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
                        <CheckCircle2 className="w-4 h-4" /> {isCash ? `💵 現金 ${cashAmount.toLocaleString()}円 還元完了！` : '🎁 物品受け取り ＆ ポイント消費完了！'}
                      </div>
                    ) : isParentMode ? (
                      <div className="space-y-2">
                        {item.is_claimed ? (
                          <button
                            onClick={() => setApprovingItem(item)}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-glow-gold"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>
                              {isCash
                                ? `💵 現金 ${cashAmount.toLocaleString()}円を渡した！(-${item.required_points.toLocaleString()} pt)`
                                : `🎁 物品を渡した！ポイント引き落とし (-${item.required_points.toLocaleString()} pt)`
                              }
                            </span>
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
                          <Clock className="w-4 h-4 animate-spin" /> {isCash ? `💵 親のお金手渡し待ち (${cashAmount.toLocaleString()}円)` : '📦 親の調達・手渡し待ち'}
                        </div>
                        <p className="text-[10px] text-slate-400 text-center">※保護者が現金・物品を手渡した時にポイントを引き落とします</p>
                      </div>
                    ) : canClaim ? (
                      <div className="space-y-1">
                        <button
                          onClick={() => handleClaim(item)}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-glow-gold"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span>{isCash ? `💵 現金 ${cashAmount.toLocaleString()}円と交換申請！` : '🎁 これと交換したい！親にリクエスト'}</span>
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
      {showAddModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="glass-card w-full max-w-md rounded-3xl p-5 sm:p-6 border border-slate-700 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-400" />
              <span>ご褒美・お小遣い交換リクエストの登録</span>
            </h3>

            <form onSubmit={handleAddItem} className="space-y-4">
              {/* Type Switcher */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">交換タイプを選択</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setItemType('goods')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      itemType === 'goods'
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-glow-gold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Gift className="w-4 h-4 text-amber-400" />
                    <span>🎁 物品・ご褒美 (100%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setItemType('cash')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      itemType === 'cash'
                        ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-lg'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-400" />
                    <span>💵 現金還元 (7掛け)</span>
                  </button>
                </div>
              </div>

              {itemType === 'cash' ? (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 space-y-1">
                  <div className="font-bold flex items-center gap-1 text-emerald-400">
                    <Coins className="w-4 h-4" />
                    <span>7掛け（70%還元）現金交換ルール</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    所持ポイントを現金（お小遣い）に還元できます。ポイント数の <strong>70% (7掛け)</strong> の現金が手渡されます。
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>ご褒美リクエストのルール</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    貯めたポイントで買いたい商品やご褒美と、必要な希望ポイントを登録できます。ポイント達成後に親へリクエストを送ることができます！
                  </p>
                </div>
              )}

              {/* Goods: Title Input */}
              {itemType === 'goods' && (
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
              )}

              {/* Cash: Amount Input & Point Reverse-Calculation / Goods: Point Input */}
              {itemType === 'cash' ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-slate-300">換金希望金額 (円)</label>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-mono">
                        所持: <strong className="text-amber-400 font-bold">{userCurrentPoints.toLocaleString()} pt</strong>
                        <span className="text-[10px] text-emerald-400 ml-1">
                          (最大 {maxCash.toLocaleString()} 円換金可)
                        </span>
                      </span>
                      {!isParentMode && maxCash > 0 && (
                        <button
                          type="button"
                          onClick={() => setCashAmountStr(String(maxCash))}
                          className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black hover:bg-emerald-500/30 transition-all shrink-0"
                        >
                          全額換金
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-emerald-400 font-black text-sm select-none">¥</span>
                    <input
                      type="number"
                      placeholder="例: 700"
                      step={10}
                      min={1}
                      max={!isParentMode ? maxCash : undefined}
                      value={cashAmountStr}
                      onChange={(e) => setCashAmountStr(e.target.value)}
                      className={`w-full bg-slate-900 border rounded-xl pl-8 pr-4 py-2 text-sm text-white font-mono focus:outline-none ${
                        isPointsExceeded ? 'border-red-500 focus:border-red-400' : 'border-slate-700 focus:border-emerald-400'
                      }`}
                    />
                  </div>

                  {cashAmount > 0 && (
                    <div className="p-3 bg-slate-900 border border-emerald-500/40 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-bold">💵 必要ポイント (7掛け還元):</span>
                        <span className="text-base font-black text-amber-400 font-mono">
                          {requiredPointsForCash.toLocaleString()} pt
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono pt-1.5 border-t border-slate-800">
                        <span>交換後残りポイント:</span>
                        <span className={userCurrentPoints - requiredPointsForCash < 0 ? 'text-red-400 font-bold' : 'text-slate-300'}>
                          {(userCurrentPoints - requiredPointsForCash).toLocaleString()} pt
                        </span>
                      </div>
                    </div>
                  )}

                  {isPointsExceeded && (
                    <p className="text-[11px] font-bold text-red-400 flex items-center gap-1 mt-1">
                      ⚠️ 所持ポイント（{userCurrentPoints.toLocaleString()} pt）で換金できるのは最大 {maxCash.toLocaleString()} 円までです。
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-slate-300">交換ポイント (pt)</label>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-mono">
                        所持: <strong className="text-amber-400 font-bold">{userCurrentPoints.toLocaleString()} pt</strong>
                      </span>
                      {!isParentMode && userCurrentPoints > 0 && (
                        <button
                          type="button"
                          onClick={() => setNewPointsStr(String(userCurrentPoints))}
                          className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black hover:bg-amber-500/30 transition-all"
                        >
                          全額
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="number"
                    placeholder="例: 1000"
                    step={1}
                    min={1}
                    max={!isParentMode ? userCurrentPoints : undefined}
                    value={newPointsStr}
                    onChange={(e) => setNewPointsStr(e.target.value)}
                    className={`w-full bg-slate-900 border rounded-xl px-4 py-2 text-sm text-white font-mono focus:outline-none ${
                      isPointsExceeded ? 'border-red-500 focus:border-red-400' : 'border-slate-700 focus:border-amber-400'
                    }`}
                  />
                  {isPointsExceeded && (
                    <p className="text-[11px] font-bold text-red-400 flex items-center gap-1 mt-1">
                      ⚠️ 所持ポイント（{userCurrentPoints.toLocaleString()} pt）を超えて入力することはできません。
                    </p>
                  )}
                </div>
              )}

              {/* Product URL Input & Image URL Input: Only shown for Goods */}
              {itemType === 'goods' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">🛒 Amazon / 商品購入ページURL (任意)</label>
                    <input
                      type="url"
                      placeholder="https://www.amazon.co.jp/dp/..."
                      value={newProductUrl}
                      onChange={(e) => setNewProductUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                    <p className="text-[10px] text-slate-400">※Amazonなどの商品URLを入力すると、親の画面で直接購入ページが開けるボタンが付きます！</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">商品画像URL (任意)</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                    <p className="text-[10px] text-slate-400">※Webサイトの商品画像直リンクを入力するとカードに画像が表示されます。</p>
                  </div>
                </>
              )}

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
                  disabled={loading || isPointsExceeded || !newPointsStr || newPoints <= 0}
                  className={`px-5 py-2 rounded-xl text-xs font-black transition-all shadow-lg ${
                    isPointsExceeded || !newPointsStr || newPoints <= 0
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  }`}
                >
                  {isParentMode ? '追加する' : '交換をリクエストする'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <ApproveWishModal
        item={approvingItem}
        availablePoints={
          approvingItem
            ? (users.find((u) => u.id === approvingItem.user_id)?.current_points
               ?? (currentUser?.id === approvingItem.user_id ? currentUser.current_points : 0))
            : 0
        }
        onClose={() => setApprovingItem(null)}
        onApproved={onRefresh}
      />

    </div>
  );
};
