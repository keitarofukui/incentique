import React, { useEffect, useState } from 'react';
import { WishItem } from '../types';
import { Undo2, X, AlertCircle } from 'lucide-react';

interface ReturnWishModalProps {
  item: WishItem | null;
  /** 対象の子どもの現在の所持ポイント。不足額を文面に添えるために使う */
  availablePoints: number;
  onClose: () => void;
  onReturned: () => void;
}

/** よくある差し戻し理由。毎回打ち込まずに済むように置いてある */
const PRESETS = [
  'ポイントが足りないので、もう少し貯めてから出してね',
  '実際の値段のほうが高かったので、ポイントを増やして出し直してね',
  '今は買えないので、また今度お願い',
  '同じものが家にあるので、別のものにしよう',
];

/**
 * 交換リクエストの差し戻し。
 * 申請時点ではポイントを引いていないので、返却は不要で申請状態を戻すだけ。
 * ただし理由が分からないと子どもは同じものを出し直すので、コメントを必須にしている。
 */
export const ReturnWishModal: React.FC<ReturnWishModalProps> = ({
  item,
  availablePoints,
  onClose,
  onReturned,
}) => {
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (item) {
      setComment('');
      setErrorMsg('');
    }
  }, [item]);

  if (!item) return null;

  const shortfall = item.required_points - availablePoints;

  const handleReturn = async () => {
    const trimmed = comment.trim();
    if (!trimmed) {
      setErrorMsg('差し戻す理由を入力してください');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/wish-items/${item.id}/return`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: trimmed }),
      });
      const data = await res.json();
      if (data.success) {
        onReturned();
        onClose();
      } else {
        setErrorMsg(data.error || '差し戻しに失敗しました');
      }
    } catch (err) {
      setErrorMsg('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="glass-card w-full max-w-md rounded-3xl p-5 sm:p-6 border border-rose-500/40 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto scrollbar-none">

        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Undo2 className="w-5 h-5 text-rose-400" />
            <span>リクエストを差し戻す</span>
          </h3>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="text-[10px] font-bold text-slate-400">
            {item.user_name ? `${item.user_name} さんのリクエスト` : 'リクエスト内容'}
          </div>
          <div className="text-sm font-bold text-white break-words">{item.title}</div>
          <div className="text-[11px] text-slate-400 font-mono">
            申請 {item.required_points.toLocaleString()} pt ／ 所持 {availablePoints.toLocaleString()} pt
            {shortfall > 0 && (
              <span className="text-rose-300"> ／ {shortfall.toLocaleString()} pt 不足</span>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-extrabold text-slate-200">差し戻す理由（子どもに表示されます）</label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => { setComment(e.target.value); setErrorMsg(''); }}
            placeholder="例: 実際の値段が高かったので、あと500pt貯めてから出し直してね"
            className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-400"
          />

          <div className="flex flex-wrap gap-1.5 pt-1">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => { setComment(preset); setErrorMsg(''); }}
                className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-[10px] font-bold text-slate-300 hover:border-rose-400 hover:text-white transition-all text-left"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-bold">{errorMsg}</span>
          </div>
        )}

        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-[11px] text-slate-300">
          ポイントは引かれていないので、返却は発生しません。項目は交換所に残るので、
          子どもはコメントを読んでから出し直せます。
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white">
            キャンセル
          </button>
          <button
            onClick={handleReturn}
            disabled={loading || !comment.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 text-white font-black text-xs hover:opacity-90 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Undo2 className="w-4 h-4" />
            <span>{loading ? '処理中...' : 'コメントを付けて差し戻す'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
