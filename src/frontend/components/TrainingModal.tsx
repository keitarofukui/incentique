import React, { useState, useEffect } from 'react';
import { User, TrainingMenu } from '../types';
import { Dumbbell, Send, Plus, Play, ExternalLink, Sparkles, Trash2 } from 'lucide-react';

import { GachaResult } from './LuckyGachaModal';
import { SuccessToast } from './SuccessToast';

interface TrainingModalProps {
  currentUser: User | null;
  onSuccess: () => void;
  onGachaResult?: (result: GachaResult) => void;
}

export const TrainingModal: React.FC<TrainingModalProps> = ({
  currentUser,
  onSuccess,
  onGachaResult,
}) => {
  if (!currentUser) return null;

  const defaultMenus: TrainingMenu[] = [
    { id: 'menu_hiit', menu_name: '🔥 HIIT 全身トレーニング', default_points: 100, video_url: 'https://youtu.be/VFywKvvNuWE?si=_BKuQ94p88T8i26q' },
    { id: 'menu_plank', menu_name: '🧘 体幹プランク', default_points: 50, video_url: 'https://youtu.be/4scc_lxw6L8?si=BtuMJBGMZF9OvqO4' },
    { id: 'menu_pushup', menu_name: '💪 腕立て・自重トレーニング', default_points: 60, video_url: 'https://youtu.be/kUNR0pDlOok?si=RPgNQsqO17vWCBnB' },
  ];

  const [trainingMenus, setTrainingMenus] = useState<TrainingMenu[]>(defaultMenus);
  const [selectedMenu, setSelectedMenu] = useState<TrainingMenu>(defaultMenus[0]);
  const [earnedPoints, setEarnedPoints] = useState<number>(100);
  const [reviewText, setReviewText] = useState<string>('');
  
  // Custom training creation state
  const [showAddMenu, setShowAddMenu] = useState<boolean>(false);
  const [newMenuName, setNewMenuName] = useState<string>('');
  const [newMenuPoints, setNewMenuPoints] = useState<number>(50);
  const [newVideoUrl, setNewVideoUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    fetch('/api/training-menus')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.menus && data.menus.length > 0) {
          setTrainingMenus(data.menus);
          setSelectedMenu(data.menus[0]);
          setEarnedPoints(data.menus[0].default_points || 50);
        } else {
          setTrainingMenus(defaultMenus);
          setSelectedMenu(defaultMenus[0]);
          setEarnedPoints(defaultMenus[0].default_points || 50);
        }
      })
      .catch(() => {
        setTrainingMenus(defaultMenus);
        setSelectedMenu(defaultMenus[0]);
        setEarnedPoints(defaultMenus[0].default_points || 50);
      });
  }, []);

  const handleSelectMenu = (menu: TrainingMenu) => {
    setSelectedMenu(menu);
    setEarnedPoints(menu.default_points || 50);
  };

  const getYouTubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    let videoId = '';

    if (url.includes('youtu.be/')) {
      const parts = url.split('youtu.be/')[1];
      videoId = parts.split('?')[0];
    } else if (url.includes('watch?v=')) {
      const parts = url.split('watch?v=')[1];
      videoId = parts.split('&')[0];
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  const handleAddTrainingMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenuName.trim()) return;

    const pointsToSet = newMenuPoints || 50;
    const urlToSet = newVideoUrl.trim() || undefined;

    try {
      const res = await fetch('/api/training-menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuName: newMenuName.trim(),
          defaultPoints: pointsToSet,
          videoUrl: urlToSet
        })
      });
      const data = await res.json();
      if (data.success && data.menus) {
        setTrainingMenus(data.menus);
        const created = data.menus.find((m: TrainingMenu) => m.menu_name === newMenuName.trim()) || data.menus[data.menus.length - 1];
        handleSelectMenu(created);
      } else {
        const custom: TrainingMenu = {
          id: 'm_' + Date.now(),
          menu_name: newMenuName.trim(),
          default_points: pointsToSet,
          video_url: urlToSet
        };
        setTrainingMenus((prev) => [...prev, custom]);
        handleSelectMenu(custom);
      }
    } catch (err) {
      const custom: TrainingMenu = {
        id: 'm_' + Date.now(),
        menu_name: newMenuName.trim(),
        default_points: pointsToSet,
        video_url: urlToSet
      };
      setTrainingMenus((prev) => [...prev, custom]);
      handleSelectMenu(custom);
    } finally {
      setNewMenuName('');
      setNewVideoUrl('');
      setNewMenuPoints(50);
      setShowAddMenu(false);
    }
  };

  const handleDeleteTrainingMenu = async (e: React.MouseEvent, menuId: string) => {
    e.stopPropagation();
    if (!window.confirm('この運動メニューを削除しますか？')) return;

    try {
      const res = await fetch(`/api/training-menus/${menuId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success && data.menus) {
        setTrainingMenus(data.menus);
        if (selectedMenu?.id === menuId && data.menus.length > 0) {
          handleSelectMenu(data.menus[0]);
        }
      } else {
        setTrainingMenus((prev) => prev.filter((m) => m.id !== menuId));
      }
    } catch (err) {
      setTrainingMenus((prev) => prev.filter((m) => m.id !== menuId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !selectedMenu) return;

    setLoading(true);
    setSuccessMsg('');
    const finalPoints = earnedPoints || selectedMenu.default_points || 50;

    try {
      const res = await fetch('/api/action-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          category: 'training',
          titleOrMenu: selectedMenu.menu_name,
          reviewText,
          earnedPoints
        })
      });

      const data = await res.json();
      if (data.success) {
        // Reset form to its initial state for continuous input
        // (keep the selected menu, but drop any manual point adjustment)
        setReviewText('');
        setEarnedPoints(selectedMenu.default_points || 50);
        setShowAddMenu(false);
        setNewMenuName('');
        setNewVideoUrl('');
        setNewMenuPoints(50);
        onSuccess();

        // Show success toast
        const pts = data.finalEarnedPoints || finalPoints;
        setSuccessMsg(`✅「${selectedMenu.menu_name}」を記録しました！(+${pts}pt)`);
        setTimeout(() => setSuccessMsg(''), 4000);

        if (data.multiplier && data.multiplier > 1 && onGachaResult) {
          onGachaResult({
            basePoints: data.basePoints,
            multiplier: data.multiplier,
            finalEarnedPoints: data.finalEarnedPoints,
            bonusTier: data.bonusTier,
            bonusLabel: data.bonusLabel,
            actionTitle: selectedMenu.menu_name,
          });
        }
      }
    } catch (err) {
      console.error('Failed to submit training log', err);
    } finally {
      setLoading(false);
    }
  };

  const embedUrl = selectedMenu ? getYouTubeEmbedUrl(selectedMenu.video_url) : null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="glass-card w-full rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-glow-emerald">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">🏋️‍♂️ トレーニング成果報告</h3>
              <p className="text-xs text-slate-400 mt-0.5">動画を見ながら運動を実践してポイントを獲得しよう！</p>
            </div>
          </div>
        </div>

        {/* Summer Break Campaign Mini Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/60 to-emerald-950/60 border border-amber-500/30 flex items-center gap-3 text-xs text-amber-300">
          <span className="text-2xl animate-bounce">☀️</span>
          <div>
            <span className="font-black text-amber-200">【☀️夏休み確率UP中】</span> 運動報告でもガチャボーナス（2倍・3倍・10倍）の当選確率が <strong className="font-mono underline text-amber-200 text-sm">通常の2倍</strong> に大幅UP中！
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Menu Header & Add Custom Menu Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-extrabold text-slate-200 flex items-center gap-1.5">
              <span>メニューを選択</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono font-bold">
                +{selectedMenu?.default_points || 50} pt
              </span>
            </label>
            <button
              type="button"
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="px-3 py-1.5 rounded-xl bg-cyber-neonCyan/10 border border-cyber-neonCyan/30 text-cyber-neonCyan hover:bg-cyber-neonCyan/20 text-xs font-bold flex items-center gap-1 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ メニューを追加</span>
            </button>
          </div>

          {/* Form to Add New Custom Menu */}
          {showAddMenu && (
            <div className="p-4 bg-slate-900/90 rounded-2xl border border-cyber-neonCyan/50 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-cyber-neonCyan flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyber-neonCyan" />
                  <span>新しいトレーニングメニューの追加</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddMenu(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  キャンセル
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  placeholder="メニュー名 (例: 腹筋10分コース)"
                  value={newMenuName}
                  onChange={(e) => setNewMenuName(e.target.value)}
                  className="sm:col-span-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-neonCyan"
                />
                <input
                  type="number"
                  placeholder="ポイント (例: 50)"
                  value={newMenuPoints}
                  onChange={(e) => setNewMenuPoints(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyber-neonCyan"
                />
              </div>

              <input
                type="url"
                placeholder="YouTube URL (任意: 例 https://youtu.be/...)"
                value={newVideoUrl}
                onChange={(e) => setNewVideoUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-neonCyan"
              />

              <button
                type="button"
                onClick={handleAddTrainingMenu}
                className="w-full py-2 bg-cyber-neonCyan text-slate-950 font-black text-xs rounded-xl hover:opacity-90 transition-all shadow-md shadow-cyber-neonCyan/20"
              >
                このメニューを追加・選択する
              </button>
            </div>
          )}

          {/* Training Menu Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {trainingMenus.map((menu) => {
              const isSelected = selectedMenu?.id === menu.id;

              return (
                <div
                  key={menu.id}
                  onClick={() => handleSelectMenu(menu)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                    isSelected
                      ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-lg shadow-emerald-500/20 scale-102'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                      +{menu.default_points || 50} pt
                    </span>
                    <div className="flex items-center gap-1">
                      {menu.video_url && (
                        <span className="text-[10px] bg-red-500/20 text-red-400 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Play className="w-2.5 h-2.5 fill-red-400" /> 動画
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteTrainingMenu(e, menu.id)}
                        className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="このメニューを削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs font-bold leading-snug">{menu.menu_name}</div>
                </div>
              );
            })}
          </div>

          {/* Embedded YouTube Player */}
          {selectedMenu && embedUrl ? (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                <span className="flex items-center gap-1.5 text-red-400">
                  <Play className="w-4 h-4 fill-red-500 text-red-500" />
                  <span>動画を見ながらその場でトレーニング！</span>
                </span>
                <a
                  href={selectedMenu.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <span>YouTubeで開く</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-700 bg-black shadow-2xl">
                <iframe
                  src={embedUrl}
                  title={selectedMenu.menu_name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                ></iframe>
              </div>
            </div>
          ) : selectedMenu && selectedMenu.video_url ? (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <span>YouTubeリンク:</span>
              <a
                href={selectedMenu.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-400 font-bold underline flex items-center gap-1"
              >
                <span>{selectedMenu.video_url}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : null}

          {/* Points Adjustment & Comment */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1 sm:col-span-1">
              <label className="text-xs font-bold text-amber-300 flex items-center gap-1">
                <span>獲得ポイント (pt)</span>
              </label>
              <input
                type="number"
                required
                min={10}
                max={1000}
                step={5}
                value={earnedPoints}
                onChange={(e) => setEarnedPoints(Number(e.target.value))}
                className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-2 text-sm font-black font-mono text-amber-400 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-extrabold text-slate-300">
                振り返りコメント (任意)
              </label>
              <input
                type="text"
                placeholder="例: 2セット完走！限界まで追い込んだ"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Submit CTA Button */}
          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-sm hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? '獲得処理中...' : `🏋️‍♂️ やりきったので +${earnedPoints}pt 獲得！`}</span>
            </button>
          </div>
        </form>
      </div>

      <SuccessToast message={successMsg} />
    </div>
  );
};
