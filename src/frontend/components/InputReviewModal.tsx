import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { BookOpen, Film, BookMarked, Send, AlertCircle } from 'lucide-react';

import { GachaResult } from './LuckyGachaModal';
import { SuccessToast } from './SuccessToast';

interface InputReviewModalProps {
  currentUser: User | null;
  initialType?: 'input_book' | 'input_movie' | 'input_manga';
  onSuccess: () => void;
  onGachaResult?: (result: GachaResult) => void;
}

export const InputReviewModal: React.FC<InputReviewModalProps> = ({
  currentUser,
  initialType = 'input_book',
  onSuccess,
  onGachaResult,
}) => {
  if (!currentUser) return null;

  const [category, setCategory] = useState<'input_book' | 'input_movie' | 'input_manga'>(initialType);
  const [title, setTitle] = useState<string>('');
  const [reviewText, setReviewText] = useState<string>('');
  const [rulePoints, setRulePoints] = useState<{ [cat: string]: number }>({
    input_book: 300,
    input_movie: 120,
    input_manga: 50,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    if (initialType) {
      setCategory(initialType);
    }
  }, [initialType]);

  useEffect(() => {
    fetch('/api/point-rules')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.rules) {
          const map: { [cat: string]: number } = {};
          data.rules.forEach((r: any) => { map[r.category] = r.points; });
          setRulePoints((prev) => ({ ...prev, ...map }));
        }
      })
      .catch(() => {});
  }, []);

  const handleCategoryChange = (newCat: 'input_book' | 'input_movie' | 'input_manga') => {
    setCategory(newCat);
    setTitle('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const getPoints = () => {
    return rulePoints[category] || (category === 'input_book' ? 300 : category === 'input_movie' ? 120 : 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (loading || !title.trim()) {
      setErrorMsg('タイトルを入力してください');
      return;
    }

    setLoading(true);
    const earnedPoints = getPoints();
    const actionTitle = title.trim();

    try {
      const res = await fetch('/api/action-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          category,
          titleOrMenu: actionTitle,
          reviewText: reviewText.trim() || undefined,
          earnedPoints,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Reset form for continuous input
        setTitle('');
        setReviewText('');
        onSuccess();

        // Show success toast
        const pts = data.finalEarnedPoints || earnedPoints;
        setSuccessMsg(`✅「${actionTitle}」を登録しました！(+${pts}pt)`);
        setTimeout(() => setSuccessMsg(''), 4000);

        if (data.multiplier && data.multiplier > 1 && onGachaResult) {
          onGachaResult({
            basePoints: data.basePoints || earnedPoints,
            multiplier: data.multiplier,
            finalEarnedPoints: data.finalEarnedPoints || earnedPoints * data.multiplier,
            bonusTier: data.bonusTier,
            bonusLabel: data.bonusLabel,
            actionTitle: actionTitle,
          });
        }
      } else {
        setErrorMsg(data.error || '記録の保存に失敗しました');
      }
    } catch (err) {
      console.error('Failed to submit review log', err);
      setErrorMsg('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="glass-card w-full rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-glow-purple">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">📚 読書・映画・漫画 インプット報告</h3>
              <p className="text-xs text-slate-400 mt-0.5">読んだ本や観た映画の気付きを提出してポイントを獲得！</p>
            </div>
          </div>
        </div>

        {/* Summer Break Campaign Mini Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/60 to-purple-950/60 border border-amber-500/30 flex items-center gap-3 text-xs text-amber-300">
          <span className="text-2xl animate-bounce">☀️</span>
          <div>
            <span className="font-black text-amber-200">【☀️夏休み確率UP中】</span> 読書・映画・漫画インプットでもガチャボーナス（2倍・3倍・10倍）の当選確率が <strong className="font-mono underline text-amber-200 text-sm">通常の2倍</strong> に大幅UP中！
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Category Tabs */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-300">ジャンルを選択</label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => handleCategoryChange('input_book')}
                className={`p-3.5 rounded-2xl border text-center text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  category === 'input_book'
                    ? 'bg-purple-500/25 border-purple-400 text-purple-200 shadow-glow-purple font-black'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <BookOpen className="w-6 h-6 text-purple-400" />
                <span>読書 (+300pt)</span>
              </button>

              <button
                type="button"
                onClick={() => handleCategoryChange('input_movie')}
                className={`p-3.5 rounded-2xl border text-center text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  category === 'input_movie'
                    ? 'bg-blue-500/25 border-blue-400 text-blue-200 shadow-glow-cyan font-black'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Film className="w-6 h-6 text-blue-400" />
                <span>映画 (+120pt)</span>
              </button>

              <button
                type="button"
                onClick={() => handleCategoryChange('input_manga')}
                className={`p-3.5 rounded-2xl border text-center text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  category === 'input_manga'
                    ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-glow-gold font-black'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <BookMarked className="w-6 h-6 text-amber-400" />
                <span>漫画 (+50pt)</span>
              </button>
            </div>
          </div>

          {/* Title Input Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-300">
              {category === 'input_book' ? '本のタイトル' : category === 'input_movie' ? '映画・ドキュメンタリー名' : '漫画の題名'}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                category === 'input_book'
                  ? '例: 『思考の整理学』'
                  : category === 'input_movie'
                  ? '例: 『トップガン マーヴェリック』'
                  : '例: 『ONE PIECE 第1巻』'
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-400 no-swipe"
            />
          </div>

          {/* Review text field */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-300">
              感想メモ・学んだことレビュー
            </label>
            <textarea
              rows={4}
              required
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="面白かったシーンや学んだ感想を書いて親にアピールしよう！"
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-400 no-swipe"
            ></textarea>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-400">
              獲得基本ポイント: <span className="text-lg font-black text-amber-400 font-mono">+{getPoints()} pt</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black text-sm hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? '獲得処理中...' : `📚 感想を記録して +${getPoints()}pt 獲得！`}</span>
            </button>
          </div>

        </form>

      </div>

      <SuccessToast message={successMsg} />
    </div>
  );
};
