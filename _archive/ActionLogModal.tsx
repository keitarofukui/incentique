import React, { useState, useEffect } from 'react';
import { User, TrainingMenu } from '../types';
import { BookOpen, Film, Dumbbell, BookMarked, X, Send, Sparkles, Plus, Play, ExternalLink } from 'lucide-react';

interface ActionLogModalProps {
  currentUser: User | null;
  initialCategory?: 'input_book' | 'input_manga' | 'input_movie' | 'training';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ActionLogModal: React.FC<ActionLogModalProps> = ({
  currentUser,
  initialCategory,
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !currentUser) return null;

  const [category, setCategory] = useState<'input_book' | 'input_manga' | 'input_movie' | 'training'>(
    initialCategory || 'training'
  );
  const [titleOrMenu, setTitleOrMenu] = useState<string>('HIIT トレーニング');
  const [selectedMenu, setSelectedMenu] = useState<TrainingMenu | null>(null);
  const [reviewText, setReviewText] = useState<string>('');
  const [rulePoints, setRulePoints] = useState<{ [cat: string]: number }>({
    input_book: 300,
    input_movie: 120,
    input_manga: 50,
    training: 50,
  });

  const defaultMenus: TrainingMenu[] = [
    { id: 'menu_hiit', menu_name: 'HIIT トレーニング', default_points: 50, video_url: 'https://youtu.be/VFywKvvNuWE?si=_BKuQ94p88T8i26q' },
    { id: 'menu_plank', menu_name: 'プランク トレーニング', default_points: 50, video_url: 'https://youtu.be/4scc_lxw6L8?si=BtuMJBGMZF9OvqO4' },
    { id: 'menu_pushup', menu_name: '腕立て トレーニング', default_points: 50, video_url: 'https://youtu.be/kUNR0pDlOok?si=RPgNQsqO17vWCBnB' },
  ];

  const [trainingMenus, setTrainingMenus] = useState<TrainingMenu[]>(defaultMenus);

  // Sync category when modal opens from dedicated card
  useEffect(() => {
    if (initialCategory) {
      setCategory(initialCategory);
    }
  }, [isOpen, initialCategory]);

  // New menu creation form state
  const [showAddMenu, setShowAddMenu] = useState<boolean>(false);
  const [newMenuName, setNewMenuName] = useState<string>('');
  const [newMenuPoints, setNewMenuPoints] = useState<number>(50);
  const [newVideoUrl, setNewVideoUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

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

    fetch('/api/training-menus')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.menus && data.menus.length > 0) {
          setTrainingMenus(data.menus);
          setSelectedMenu(data.menus[0]);
          setTitleOrMenu(data.menus[0].menu_name);
        } else {
          setTrainingMenus(defaultMenus);
          setSelectedMenu(defaultMenus[0]);
          setTitleOrMenu(defaultMenus[0].menu_name);
        }
      })
      .catch(() => {
        setTrainingMenus(defaultMenus);
        setSelectedMenu(defaultMenus[0]);
        setTitleOrMenu(defaultMenus[0].menu_name);
      });
  }, [isOpen]);

  const getCategoryPoints = () => {
    if (category === 'training' && selectedMenu) {
      return selectedMenu.default_points || rulePoints.training || 50;
    }
    return rulePoints[category] || 50;
  };

  // Convert any YouTube link (youtu.be or youtube.com/watch) to embed iframe URL
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

  const handleSelectTrainingMenu = (menu: TrainingMenu) => {
    setSelectedMenu(menu);
    setTitleOrMenu(menu.menu_name);
  };

  const handleAddTrainingMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenuName.trim()) return;

    try {
      const res = await fetch('/api/training-menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuName: newMenuName.trim(),
          defaultPoints: newMenuPoints || 50,
          videoUrl: newVideoUrl.trim() || undefined
        })
      });
      const data = await res.json();
      if (data.success && data.menus) {
        setTrainingMenus(data.menus);
        const created = data.menus.find((m: TrainingMenu) => m.menu_name === newMenuName.trim()) || data.menus[data.menus.length - 1];
        handleSelectTrainingMenu(created);
      } else {
        const custom: TrainingMenu = {
          id: 'm_' + Date.now(),
          menu_name: newMenuName.trim(),
          default_points: newMenuPoints || 50,
          video_url: newVideoUrl.trim() || undefined
        };
        setTrainingMenus((prev) => [...prev, custom]);
        handleSelectTrainingMenu(custom);
      }
      setNewMenuName('');
      setNewVideoUrl('');
      setShowAddMenu(false);
    } catch (err) {
      const custom: TrainingMenu = {
        id: 'm_' + Date.now(),
        menu_name: newMenuName.trim(),
        default_points: newMenuPoints || 50,
        video_url: newVideoUrl.trim() || undefined
      };
      setTrainingMenus((prev) => [...prev, custom]);
      handleSelectTrainingMenu(custom);
      setNewMenuName('');
      setNewVideoUrl('');
      setShowAddMenu(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleOrMenu.trim()) return;

    setLoading(true);
    const earnedPoints = getCategoryPoints();

    try {
      const res = await fetch('/api/action-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          category,
          titleOrMenu,
          reviewText,
          earnedPoints
        })
      });

      const data = await res.json();
      if (data.success) {
        setReviewText('');
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Failed to submit log', err);
    } finally {
      setLoading(false);
    }
  };

  const embedUrl = selectedMenu ? getYouTubeEmbedUrl(selectedMenu.video_url) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="glass-card w-full max-w-xl rounded-3xl p-6 border border-slate-700 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto scrollbar-thin animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 sticky top-0 bg-slate-950/60 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyber-neonCyan" />
            <h3 className="text-lg font-black text-white">行動・インプットポイント申請</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Category Selector Buttons */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-300">活動カテゴリー</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCategory('training')}
                className={`p-3 rounded-xl border text-left text-xs font-bold flex items-center gap-2 transition-all ${
                  category === 'training'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <Dumbbell className="w-4 h-4 text-emerald-400" />
                <span>トレーニング</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('input_book')}
                className={`p-3 rounded-xl border text-left text-xs font-bold flex items-center gap-2 transition-all ${
                  category === 'input_book'
                    ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span>読書</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('input_movie')}
                className={`p-3 rounded-xl border text-left text-xs font-bold flex items-center gap-2 transition-all ${
                  category === 'input_movie'
                    ? 'bg-blue-500/20 border-blue-400 text-blue-300'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <Film className="w-4 h-4 text-blue-400" />
                <span>映画</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('input_manga')}
                className={`p-3 rounded-xl border text-left text-xs font-bold flex items-center gap-2 transition-all ${
                  category === 'input_manga'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <BookMarked className="w-4 h-4 text-amber-400" />
                <span>漫画</span>
              </button>
            </div>
          </div>

          {/* TRAINING CATEGORY VIEW */}
          {category === 'training' && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-200">トレーニングメニューを選択</label>
                <button
                  type="button"
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="text-xs text-cyber-neonCyan hover:underline flex items-center gap-1 font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ 新しいYouTubeメニューを追加</span>
                </button>
              </div>

              {/* Add Custom Training Menu Form */}
              {showAddMenu && (
                <div className="p-4 bg-slate-900 rounded-2xl border border-cyber-neonCyan/40 space-y-3">
                  <h4 className="text-xs font-black text-cyber-neonCyan">新しい動画トレーニングの追加</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="メニュー名 (例: 腹筋10分コース)"
                      value={newMenuName}
                      onChange={(e) => setNewMenuName(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-neonCyan"
                    />
                    <input
                      type="number"
                      placeholder="ポイント (デフォルト: 50pt)"
                      value={newMenuPoints}
                      onChange={(e) => setNewMenuPoints(Number(e.target.value))}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyber-neonCyan"
                    />
                  </div>
                  <input
                    type="url"
                    placeholder="YouTube URL (例: https://youtu.be/...)"
                    value={newVideoUrl}
                    onChange={(e) => setNewVideoUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-neonCyan"
                  />
                  <button
                    type="button"
                    onClick={handleAddTrainingMenu}
                    className="w-full py-2 bg-cyber-neonCyan text-slate-950 font-black text-xs rounded-xl"
                  >
                    メニューを登録する
                  </button>
                </div>
              )}

              {/* Training Menu Cards Carousel / Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {trainingMenus.map((menu) => {
                  const isSelected = selectedMenu?.id === menu.id || titleOrMenu === menu.menu_name;

                  return (
                    <div
                      key={menu.id}
                      onClick={() => handleSelectTrainingMenu(menu)}
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
                        {menu.video_url && (
                          <span className="text-[10px] bg-red-500/20 text-red-400 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Play className="w-2.5 h-2.5 fill-red-400" /> 動画付
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-bold leading-snug">{menu.menu_name}</div>
                    </div>
                  );
                })}
              </div>

              {/* Embedded YouTube Video Player */}
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
                  <span>YouTubeでトレーニングを開く:</span>
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

            </div>
          )}

          {/* NON-TRAINING CATEGORIES (Reading, Movie, Manga) */}
          {category !== 'training' && (
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-300">作品タイトル / 本の題名</label>
              <input
                type="text"
                required
                value={titleOrMenu}
                onChange={(e) => setTitleOrMenu(e.target.value)}
                placeholder="例: 作品名や本の題名を入力..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyber-neonCyan"
              />
            </div>
          )}

          {/* Review text */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-300">
              {category === 'training' ? '自己評価・今日の振り返りコメント' : '感想・学んだことレビュー'}
            </label>
            <textarea
              rows={2}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="意識したポイントや感想を入力して親にアピールしよう！"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyber-neonCyan"
            ></textarea>
          </div>

          {/* Points summary & Submit */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between sticky bottom-0 bg-slate-950/80 backdrop-blur-md">
            <div className="text-xs text-slate-400">
              申請ポイント: <span className="text-base font-black text-amber-400 font-mono">+{getCategoryPoints()} pt</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? '送信中...' : 'トレーニング完了・親に申請する'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
