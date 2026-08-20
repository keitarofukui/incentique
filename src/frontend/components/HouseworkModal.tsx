import React, { useState, useEffect } from 'react';
import { User, HouseworkMenu } from '../types';
import { Sparkles, Send, CheckCircle2 } from 'lucide-react';
import { GachaResult } from './LuckyGachaModal';
import { SuccessToast } from './SuccessToast';

interface HouseworkModalProps {
  currentUser: User | null;
  onSuccess: () => void;
  onGachaResult?: (result: GachaResult) => void;
}

export const HouseworkModal: React.FC<HouseworkModalProps> = ({
  currentUser,
  onSuccess,
  onGachaResult,
}) => {
  if (!currentUser) return null;

  const defaultMenus: HouseworkMenu[] = [
    { id: 'hw_laundry_hang', menu_name: '洗濯物を干す', default_points: 30, icon: '🧺', description: '洗濯物を干す作業を行う' },
    { id: 'hw_laundry_fold', menu_name: '洗濯物を畳む', default_points: 30, icon: '👕', description: '畳んでたたんで収納する' },
    { id: 'hw_cook_one', menu_name: 'ご飯を作る（1品）', default_points: 30, icon: '🍳', description: '料理を1品作る' },
    { id: 'hw_plan_menu', menu_name: '献立を考える', default_points: 20, icon: '💡', description: '1日または1食の献立を提案する' },
    { id: 'hw_trash', menu_name: 'ゴミを捨てる', default_points: 10, icon: '🗑️', description: '家中のゴミを集めて集積所へ出す' },
  ];

  const [houseworkMenus, setHouseworkMenus] = useState<HouseworkMenu[]>(defaultMenus);
  const [selectedMenu, setSelectedMenu] = useState<HouseworkMenu>(defaultMenus[0]);
  const [earnedPoints, setEarnedPoints] = useState<number>(30);
  const [reviewText, setReviewText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    fetch('/api/housework-menus')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.menus && data.menus.length > 0) {
          setHouseworkMenus(data.menus);
          setSelectedMenu(data.menus[0]);
          setEarnedPoints(data.menus[0].default_points || 30);
        } else {
          setHouseworkMenus(defaultMenus);
          setSelectedMenu(defaultMenus[0]);
          setEarnedPoints(defaultMenus[0].default_points || 30);
        }
      })
      .catch(() => {
        setHouseworkMenus(defaultMenus);
        setSelectedMenu(defaultMenus[0]);
        setEarnedPoints(defaultMenus[0].default_points || 30);
      });
  }, []);

  const handleSelectMenu = (menu: HouseworkMenu) => {
    setSelectedMenu(menu);
    setEarnedPoints(menu.default_points || 30);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMenu) return;

    setLoading(true);

    try {
      const res = await fetch('/api/action-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          category: 'housework',
          titleOrMenu: `${selectedMenu.icon || '🧹'} ${selectedMenu.menu_name}`,
          reviewText: reviewText.trim() || undefined,
          earnedPoints: earnedPoints,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccessMsg(`「${selectedMenu.menu_name}」のお手伝いを記録しました！`);
        setReviewText('');

        if (data.multiplier && data.multiplier > 1 && onGachaResult) {
          onGachaResult({
            multiplier: data.multiplier,
            bonusTier: data.bonusTier,
            bonusLabel: data.bonusLabel,
            basePoints: data.basePoints,
            finalPoints: data.finalEarnedPoints,
            menuTitle: selectedMenu.menu_name,
          });
        }

        setTimeout(() => {
          onSuccess();
        }, 1200);
      } else {
        alert('送信に失敗しました: ' + (data.error || 'エラーが発生しました'));
      }
    } catch (err: any) {
      alert('送信に失敗しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8 animate-fade-in">
      <SuccessToast message={successMsg} onClose={() => setSuccessMsg('')} />

      {/* ヘッダーカード */}
      <div className="glass-card p-6 rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-slate-900/90 to-transparent space-y-4 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-3 border-b border-amber-500/30 pb-3">
          <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-500/40 text-amber-300 text-xl shrink-0">
            🧹
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              家事で稼ぐ <span className="text-xs text-amber-400 font-bold bg-amber-500/20 px-2 py-0.5 rounded-full">お手伝い</span>
            </h2>
            <p className="text-xs text-slate-400">
              家事をしたらメニューを選んで「ポイントGET」を押しちゃおう！
            </p>
          </div>
        </div>

        {/* 家事メニュー選択グリッド */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-300">
            やり遂げた家事メニューを選択
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {houseworkMenus.map((menu) => {
              const isSelected = selectedMenu?.id === menu.id;
              return (
                <button
                  key={menu.id}
                  type="button"
                  onClick={() => handleSelectMenu(menu)}
                  className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between space-y-2 ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/20 text-white shadow-lg shadow-amber-500/10 ring-2 ring-amber-400/50'
                      : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <span className="text-xl">{menu.icon || '🧹'}</span>
                      <span className="line-clamp-1">{menu.menu_name}</span>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-400">基本獲得</span>
                    <span className="text-xs font-black text-amber-400 font-mono">
                      +{menu.default_points} pt
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* アクション提出フォーム */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* コメント入力 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              ひとこと感想・メモ <span className="text-slate-500 text-[10px]">(任意)</span>
            </label>
            <textarea
              rows={2}
              placeholder="例: たたんだ服をたたんでタンスにしまった！綺麗になった！"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-all resize-none"
            />
          </div>

          {/* 獲得ポイント確認＆送信ボタン */}
          <div className="bg-slate-950/90 p-4 rounded-2xl border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold">今回獲得できる基本素点</div>
                <div className="text-xl font-black text-amber-400 font-mono">
                  {earnedPoints} <span className="text-xs text-slate-300">pt</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedMenu}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-2xl text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? '送信中...' : '家事を報告してポイントGET！'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
