import React, { useEffect, useState } from 'react';
import { WishItem } from '../types';
import { CheckCircle2, X, AlertCircle, Banknote, Gift } from 'lucide-react';

interface ApproveWishModalProps {
  item: WishItem | null;
  /** 対象の子どもの現在の所持ポイント。不足を事前に知らせるために使う */
  availablePoints: number;
  onClose: () => void;
  onApproved: () => void;
}

/**
 * ご褒美交換の承認ダイアログ。
 * 申請額と実際の購入額はずれることがあるので、引き落とすポイントを保護者が
 * その場で入力できるようにしてある。既定値は申請額。
 */
export const ApproveWishModal: React.FC<ApproveWishModalProps> = ({
  item,
  availablePoints,
  onClose,
  onApproved,
}) => {
  const [pointsStr, setPointsStr] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (item) {
      setPointsStr(String(item.required_points));
      setErrorMsg('');
    }
  }, [item]);

  if (!item) return null;

  const isCash = item.item_type === 'cash';
  const points = Number(pointsStr);
  const valid = pointsStr !== '' && Number.isFinite(points) && points >= 0;
  const insufficient = valid && points > availablePoints;
  const diff = valid ? points - item.required_points : 0;

  const handleApprove = async () => {
    if (!valid) {
      setErrorMsg('引き落とすポイントを0以上の数値で入力してください');
      return;
    }
    if (insufficient) {
      setErrorMsg(`所持ポイント（${availablePoints.toLocaleString()}pt）を超えています`);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/wish-items/${item.id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: Math.floor(points) }),
      });
      const data = await res.json();
      if (data.success) {
        onApproved();
        onClose();
      } else {
        setErrorMsg(data.error || '承認に失敗しました');
      }
    } catch (err) {
      setErrorMsg('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="glass-card w-full max-w-md rounded-3xl p-5 sm:p-6 border border-amber-500/40 shadow-2xl space-y-4">

        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            {isCash ? <Banknote className="w-5 h-5 text-emerald-400" /> : <Gift className="w-5 h-5 text-amber-400" />}
            <span>交換を承認する</span>
          </h3>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="text-xs font-bold text-slate-400">
            {item.user_name ? `${item.user_name} さんのリクエスト` : 'リクエスト内容'}
          </div>
          <div className="text-sm font-bold text-white break-words">{item.title}</div>
          <div className="text-xs text-slate-400 font-mono">
            申請ポイント: {item.required_points.toLocaleString()} pt ／ 所持: {availablePoints.toLocaleString()} pt
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-extrabold text-slate-200">
            実際に引き落とすポイント
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={10}
              value={pointsStr}
              onChange={(e) => { setPointsStr(e.target.value); setErrorMsg(''); }}
              className="w-full bg-slate-950 border border-amber-500/50 rounded-2xl px-4 py-2.5 text-lg font-black font-mono text-amber-400 focus:outline-none focus:border-amber-400"
            />
            <span className="text-sm font-bold text-amber-400 shrink-0">pt</span>
          </div>
          <p className="text-xs text-slate-400">
            ※実際の購入額に合わせて増減できます。申請額のままでよければそのまま承認してください。
          </p>

          {valid && diff !== 0 && (
            <p className={`text-xs font-bold ${diff > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
              申請額より {Math.abs(diff).toLocaleString()}pt {diff > 0 ? '多く引きます' : '少なく引きます'}
            </p>
          )}
          {isCash && valid && (
            <p className="text-xs font-bold text-emerald-300">
              💵 現金還元（7掛け）: ¥{Math.floor(points * 0.7).toLocaleString()} 円
            </p>
          )}
        </div>

        {(errorMsg || insufficient) && (
          <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-bold">
              {errorMsg || `所持ポイント（${availablePoints.toLocaleString()}pt）を超えています`}
            </span>
          </div>
        )}

        <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 font-bold">
          承認すると {valid ? Math.floor(points).toLocaleString() : '—'} pt が引き落とされます。この操作は取り消せません。
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
          >
            キャンセル
          </button>
          <button
            onClick={handleApprove}
            disabled={loading || !valid || insufficient}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs hover:opacity-90 transition-all flex items-center gap-1.5 shadow-glow-gold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{loading ? '処理中...' : '渡した！引き落とす'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
