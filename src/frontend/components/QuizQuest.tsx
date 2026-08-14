import React, { useState, useEffect } from 'react';
import { User, QuizQuestion } from '../types';
import { Brain, CheckCircle2, XCircle, Award, RefreshCw, ChevronRight, Zap, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';

import { GachaResult } from './LuckyGachaModal';

interface QuizQuestProps {
  currentUser: User | null;
  onPointsUpdate: (newPoints: number) => void;
  onGachaResult?: (result: GachaResult) => void;
}

export const QuizQuest: React.FC<QuizQuestProps> = ({ currentUser, onPointsUpdate, onGachaResult }) => {
  const [gradeLevelFilter, setGradeLevelFilter] = useState<string>(currentUser?.grade_level || 'all');
  const [category, setCategory] = useState<string>('all');
  const [quizzes, setQuizzes] = useState<QuizQuestion[]>([]);
  const [nextBatchBuffer, setNextBatchBuffer] = useState<QuizQuestion[] | null>(null);
  const [isPrefetching, setIsPrefetching] = useState<boolean>(false);
  const [isFetchingNextBatch, setIsFetchingNextBatch] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [sessionPoints, setSessionPoints] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  if (!currentUser) return null;

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'english': return '英語';
      case 'math': return '数学';
      case 'science': return '理科';
      case 'social_studies': return '社会';
      case 'japanese': return '国語';
      case 'anime_manga': return '🍿 箸休めアニメ';
      default: return cat;
    }
  };

  const fetchQuizzes = async () => {
    setLoading(true);
    setNextBatchBuffer(null);
    try {
      let url = `/api/quizzes?grade_level=${gradeLevelFilter}`;
      if (category !== 'all') {
        url += `&category=${category}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.success && data.quizzes) {
        setQuizzes(data.quizzes);
        setTotalCount(data.totalCount !== undefined ? data.totalCount : data.quizzes.length);
        setCurrentIndex(0);
      } else {
        setQuizzes([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Quiz fetch error', err);
      setQuizzes([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const prefetchNextBatch = async () => {
    if (isPrefetching) return;
    setIsPrefetching(true);
    try {
      let url = `/api/quizzes?grade_level=${gradeLevelFilter}`;
      if (category !== 'all') {
        url += `&category=${category}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.quizzes && data.quizzes.length > 0) {
        setNextBatchBuffer(data.quizzes);
      }
    } catch (err) {
      console.error('Prefetch error', err);
    } finally {
      setIsPrefetching(false);
    }
  };

  useEffect(() => {
    setNextBatchBuffer(null);
    fetchQuizzes();
  }, [gradeLevelFilter, category, currentUser.id]);

  const handleSelectOption = async (index: number) => {
    if (isAnswered || isFetchingNextBatch) return;

    setSelectedOption(index);
    setIsAnswered(true);

    const currentQuiz = quizzes[currentIndex];
    const correct = currentQuiz.correct_index === index;
    setIsCorrect(correct);

    if (correct) {
      setSessionPoints((prev) => prev + 1);
      setStreak((prev) => prev + 1);

      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.6 }
      });

      try {
        const res = await fetch('/api/quizzes/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            questionId: currentQuiz.id,
            selectedIndex: index
          })
        });
        const data = await res.json();
        if (data.success) {
          onPointsUpdate(data.newTotalPoints);

          // The optimistic +1 above ignores the gacha multiplier — top up the difference
          const actualPoints = Number(data.pointsEarned) || 1;
          if (actualPoints > 1) {
            setSessionPoints((prev) => prev + (actualPoints - 1));
          }

          if (data.multiplier && data.multiplier > 1 && onGachaResult) {
            onGachaResult({
              basePoints: data.basePoints || 1,
              multiplier: data.multiplier,
              finalEarnedPoints: data.pointsEarned || data.multiplier,
              bonusTier: data.bonusTier,
              bonusLabel: data.bonusLabel,
              actionTitle: 'クイズ正解',
              fromQuiz: true,
            });
          }
        } else {
          onPointsUpdate(currentUser.current_points + 1);
        }
      } catch (err) {
        onPointsUpdate(currentUser.current_points + 1);
      }
    } else {
      setStreak(0);
    }
  };

  const handleNext = async () => {
    if (isFetchingNextBatch) return;

    setIsAnswered(false);
    setSelectedOption(null);

    if (currentIndex + 1 < quizzes.length) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);

      // 残り5問以下でバッファがなければ事前プレフェッチを発火
      if (nextIdx >= quizzes.length - 5 && !nextBatchBuffer && !isPrefetching) {
        prefetchNextBatch();
      }
    } else {
      // 1バッチ（48問）完走時
      if (nextBatchBuffer && nextBatchBuffer.length > 0) {
        setQuizzes(nextBatchBuffer);
        setNextBatchBuffer(null);
        setCurrentIndex(0);
      } else {
        setIsFetchingNextBatch(true);
        try {
          await fetchQuizzes();
        } finally {
          setIsFetchingNextBatch(false);
        }
      }
    }
  };

  const currentQuiz = quizzes[currentIndex];

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Summer Break Campaign Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-yellow-500/20 border border-amber-500/40 flex items-center justify-between gap-3 shadow-glow-gold">
        <div className="flex items-center gap-3">
          <span className="text-2xl animate-bounce">☀️</span>
          <div>
            <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
              <span>【夏休み限定企画】全アクション対象！ガチャボーナス確率 2倍キャンペーン開催中！🍧</span>
            </div>
            <p className="text-[11px] text-slate-300">
              8月31日まで、<strong className="text-amber-300 font-bold">全てのポイント獲得（クイズ・読書・映画・運動など）</strong>でラッキーガチャボーナス（2倍・3倍・10倍）発生確率が <strong className="text-amber-300 font-bold">2倍（当選率60%）</strong> に超大幅アップ中！
            </p>
          </div>
        </div>
      </div>

      {/* Header Banner & Total Questions Count Badge */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 p-5 rounded-3xl border border-cyan-500/30">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Brain className="w-7 h-7 text-cyber-neonCyan" />
                <span>5教科チャレンジクイズ (1正解 = 1pt)</span>
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              登録済みの大量クイズからランダム無限出題！解くほど知識とポイントが貯まる！
            </p>
          </div>

          <div className="flex items-center gap-2 bg-cyan-500/10 px-4 py-2 rounded-2xl border border-cyan-500/30 text-cyan-300 shrink-0">
            <Award className="w-5 h-5 text-cyan-400" />
            <div className="text-right">
              <div className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider">現在プールされている問題数</div>
              <div className="text-xl font-black text-white font-mono">
                全 <span className="text-cyber-neonCyan">{totalCount}</span> 問
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls (Grade & Category) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
          {/* Grade Level Selector */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-slate-400 mr-1.5 shrink-0">対象学年:</span>
            {[
              { id: 'all', label: '全学年' },
              { id: 'junior_1', label: '🎒 中1レベル(前半)' },
              { id: 'high_3', label: '🎓 高校レベル(高1〜2)' },
            ].map((g) => (
              <button
                key={g.id}
                onClick={() => setGradeLevelFilter(g.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  gradeLevelFilter === g.id
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-glow-cyan'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Subject Categories */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
            <span className="text-xs font-bold text-slate-400 mr-1.5 shrink-0">教科:</span>
            {[
              { id: 'all', label: '全教科・ランダム' },
              { id: 'english', label: '英語' },
              { id: 'math', label: '数学' },
              { id: 'science', label: '理科' },
              { id: 'social_studies', label: '社会' },
              { id: 'japanese', label: '国語' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  category === cat.id
                    ? 'bg-cyber-neonCyan text-slate-950 shadow-glow-cyan font-black'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Session Earned Bar */}
      <div className="flex items-center justify-between bg-slate-950/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-amber-400" />
          <div className="text-xs text-slate-300">
            今回のセッション獲得: <strong className="text-amber-400 font-mono text-base font-black">+{sessionPoints} pt</strong>
          </div>
        </div>

        {streak > 1 && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-black animate-pulse">
            <Flame className="w-4 h-4 fill-red-500 text-red-500" />
            <span>{streak}問 連続正解中！</span>
          </div>
        )}
      </div>

      {/* Quiz Card */}
      {loading ? (
        <div className="glass-card p-12 rounded-3xl text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-cyber-neonCyan animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-300">クイズを読み込み中...</p>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="glass-card p-10 rounded-3xl text-center space-y-4 border border-slate-800">
          <Brain className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">該当するクイズが見つかりませんでした</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            選択された【{gradeLevelFilter === 'all' ? '全学年' : gradeLevelFilter === 'junior_1' ? '中1レベル' : '高校レベル'}】×【{getCategoryLabel(category)}】に該当する問題は現在プールにありません。
          </p>
          <button
            onClick={() => {
              setGradeLevelFilter('all');
              setCategory('all');
            }}
            className="px-5 py-2.5 rounded-xl bg-cyber-neonCyan text-slate-950 font-black text-xs hover:opacity-90 transition-all shadow-glow-cyan"
          >
            条件を全学年・全教科にリセットする
          </button>
        </div>
      ) : currentQuiz ? (
        <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-6 border border-cyber-border shadow-2xl relative">
          
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-4">
            <span className="px-3 py-1 rounded-full bg-slate-800 text-cyber-neonCyan font-bold uppercase tracking-wider">
              {getCategoryLabel(currentQuiz.category)}
            </span>
            <span className="text-slate-400 font-mono text-xs">
              ランダム連続問題 #{currentIndex + 1} / {quizzes.length}
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-white leading-snug">
              {currentQuiz.question_text}
            </h3>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-3.5 pt-2">
            {currentQuiz.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrectOpt = currentQuiz.correct_index === idx;

              let buttonStyle = 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-700/80 text-slate-200';
              if (isAnswered) {
                if (isCorrectOpt) {
                  buttonStyle = 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold shadow-lg shadow-emerald-500/20';
                } else if (isSelected && !isCorrectOpt) {
                  buttonStyle = 'bg-red-500/20 border-red-500 text-red-300 font-bold';
                } else {
                  buttonStyle = 'bg-slate-900/40 border-slate-800/60 opacity-40';
                }
              }

              return (
                <button
                  key={idx}
                  disabled={isAnswered}
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between text-sm sm:text-base transition-all ${buttonStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-slate-800 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                      {['A', 'B', 'C', 'D'][idx]}
                    </span>
                    <span>{opt}</span>
                  </div>

                  {isAnswered && isCorrectOpt && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  {isAnswered && isSelected && !isCorrectOpt && (
                    <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Feedback & Next Button */}
          {isAnswered && (
            <>
              {/* Inline Feedback */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                isCorrect ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300' : 'bg-red-950/80 border-red-500/40 text-red-300'
              }`}>
                <div className="flex items-center gap-3">
                  {isCorrect ? (
                    <>
                      <Award className="w-7 h-7 text-emerald-400 animate-bounce shrink-0" />
                      <div>
                        <div className="font-extrabold text-base text-emerald-400">正解！ +1 pt GET！</div>
                        <div className="text-xs text-emerald-300">ナイス回答！この調子でどんどん解こう！</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-7 h-7 text-red-400 shrink-0" />
                      <div>
                        <div className="font-extrabold text-base text-red-400">残念！不正解</div>
                        <div className="text-xs text-red-300">正解は [{['A', 'B', 'C', 'D'][currentQuiz.correct_index]}] {currentQuiz.options[currentQuiz.correct_index]} です。</div>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={handleNext}
                  className="hidden sm:flex px-5 py-2.5 rounded-xl bg-cyber-neonCyan text-slate-950 font-black text-xs hover:bg-cyan-300 transition-all items-center gap-1 shadow-glow-cyan shrink-0"
                >
                  <span>次のランダム問題へ</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Fixed Bottom Bar for Mobile (Always visible without scrolling!) */}
              <div className="fixed bottom-3 left-3 right-3 z-40 max-w-xl mx-auto sm:hidden animate-in slide-in-from-bottom duration-200">
                <button
                  onClick={handleNext}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-cyber-neonCyan to-cyan-400 text-slate-950 font-black text-sm shadow-2xl flex items-center justify-center gap-2 border border-cyan-200/50 shadow-glow-cyan active:scale-98"
                >
                  <span>{isCorrect ? '⭕️ 正解！次の問題へ ➔' : '❌ 次の問題へ ➔'}</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </>
          )}

        </div>
      ) : (
        <div className="glass-card p-12 rounded-3xl text-center space-y-4">
          <RefreshCw className="w-10 h-10 text-cyber-neonCyan animate-spin mx-auto" />
          <h3 className="text-lg font-bold text-white">新しいクイズ問題を取得中...</h3>
          <button
            onClick={fetchQuizzes}
            className="px-6 py-2.5 rounded-xl bg-cyber-neonCyan text-slate-950 font-bold text-xs"
          >
            再読み込みする
          </button>
        </div>
      )}

    </div>
  );
};
