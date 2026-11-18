import React, { useState, useEffect } from 'react';
import { User, QuizQuestion } from '../types';
import { Brain, CheckCircle2, XCircle, Award, RefreshCw, ChevronRight, Zap, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';

import { GachaResult } from './LuckyGachaModal';
import { API_ROUTES } from '../../shared/apiRoutes';
import { TrafficSignSvg } from './TrafficSignSvg';
import { MockExamView } from './MockExamView';

interface QuizQuestProps {
  currentUser: User | null;
  onPointsUpdate: (newPoints: number) => void;
  onGachaResult?: (result: GachaResult) => void;
}

export const QuizQuest: React.FC<QuizQuestProps> = ({ currentUser, onPointsUpdate, onGachaResult }) => {
  const [quizMode, setQuizMode] = useState<'school' | 'driving' | 'mock'>('school');
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
  const [isFoulAnswer, setIsFoulAnswer] = useState<boolean>(false);
  const [foulMessage, setFoulMessage] = useState<string>('');

  if (!currentUser) return null;

  const isHighSchoolUser = (currentUser.grade_level || '').startsWith('high');

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'english': return '英語';
      case 'math': return '数学';
      case 'science': return '理科';
      case 'social_studies': return '社会';
      case 'japanese': return '国語';
      case 'music': return '音楽';
      case 'art': return '美術';
      case 'pe': return '保健体育';
      case 'tech_home': return '技術・家庭';
      case 'general_knowledge': return '小論文・教養';
      case 'anime_manga': return '🍿 箸休めアニメ';
      case 'driving_all': return '全免許分野';
      case 'driving_karimen': return '仮免学科';
      case 'driving_honmen': return '本免学科';
      case 'driving_hazard': return '危険予測';
      case 'driving_aptitude': return '適性検査';
      default: return cat;
    }
  };

  const getGradeLabel = (g: string) => {
    switch (g) {
      case 'junior_1': return '中1全体';
      case 'junior_1_early': return '中1前期';
      case 'junior_1_early_mid': return '中1前期中間';
      case 'junior_1_early_final': return '中1前期期末';
      case 'junior_1_late': return '中1後期';
      case 'junior_1_late_mid': return '中1後期中間';
      case 'junior_1_late_final': return '中1後期期末';
      case 'junior_2_early': return '中2前期';
      case 'junior_2_late': return '中2後期';
      case 'junior_3_early': return '中3前期';
      case 'junior_3_late': return '中3後期';
      case 'high_3': return '高校';
      case 'all': return '全学年';
      default: return g;
    }
  };

  const fetchQuizzes = async () => {
    setLoading(true);
    setNextBatchBuffer(null);
    try {
      let url = `${API_ROUTES.QUIZZES}?grade_level=${gradeLevelFilter}`;
      if (category !== 'all') {
        url += `&category=${category}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        console.error('[QUIZZES] fetch failed', res.status);
        setQuizzes([]);
        setTotalCount(0);
        return;
      }
      const data = await res.json();

      if (data.success && data.quizzes) {
        setQuizzes(data.quizzes);
        setTotalCount(data.totalCount !== undefined ? data.totalCount : data.quizzes.length);
        setCurrentIndex(0);
      } else {
        setQuizzes([]);
        setTotalCount(0);
      }
    } catch (err: unknown) {
      console.error('[QUIZZES] fetch error', err);
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
      let url = `${API_ROUTES.QUIZZES}?grade_level=${gradeLevelFilter}`;
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
    if (quizMode === 'mock') return;
    setNextBatchBuffer(null);
    fetchQuizzes();
  }, [gradeLevelFilter, category, currentUser.id, quizMode]);

  const switchMode = (mode: 'school' | 'driving' | 'mock') => {
    setQuizMode(mode);
    setIsAnswered(false);
    setSelectedOption(null);
    if (mode === 'driving') setCategory('driving_all');
    if (mode === 'school') setCategory('all');
  };

  const handleSelectOption = async (index: number) => {
    if (isAnswered || isFetchingNextBatch) return;

    setSelectedOption(index);
    setIsAnswered(true);
    setIsFoulAnswer(false);
    setFoulMessage('');

    const currentQuiz = quizzes[currentIndex];
    const correct = currentQuiz.correct_index === index;
    setIsCorrect(correct);

    if (correct) {
      try {
        const res = await fetch(API_ROUTES.QUIZZES_ANSWER, {
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
          if (data.isFoul) {
            setIsFoulAnswer(true);
            setFoulMessage(data.message || '高校生は中学生クイズではポイントを獲得できません（反則）');
            // 反則時はポイント加算なし・ストリークも継続しない
            setStreak(0);
          } else {
            setSessionPoints((prev) => prev + 1);
            setStreak((prev) => prev + 1);

            confetti({
              particleCount: 35,
              spread: 60,
              origin: { y: 0.6 }
            });

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
          }
        }
      } catch (err) {
        console.error('Quiz answer error', err);
      }
    } else {
      setStreak(0);
    }
  };

  const handleNext = async () => {
    if (isFetchingNextBatch) return;

    setIsAnswered(false);
    setSelectedOption(null);
    setIsFoulAnswer(false);
    setFoulMessage('');

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
    <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4">

      {/* Header Banner & Total Questions Count Badge */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 px-3.5 py-2.5 rounded-2xl border border-cyan-500/30">
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-1.5">
            <Brain className="w-5 h-5 text-cyber-neonCyan shrink-0" />
            <span>チャレンジクイズ (1正解=1pt)</span>
          </h2>
          <div className="flex items-center gap-1.5 bg-cyan-500/10 px-2.5 py-1 rounded-xl border border-cyan-500/30 text-cyan-300 shrink-0 text-xs font-black font-mono">
            全 <span className="text-cyber-neonCyan">{totalCount}</span> 問
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
          {[
            { id: 'school' as const, label: '📚 教科学習' },
            { id: 'driving' as const, label: '🚗 自動車学校' },
            { id: 'mock' as const, label: '📝 模擬試験' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => switchMode(m.id)}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${
                quizMode === m.id
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-glow-cyan'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Filter Controls (Grade & Category) */}
        {quizMode !== 'mock' && (
        <div className="space-y-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
          {/* Grade Level Selector (Top Row - School mode only) */}
          {quizMode === 'school' && (
          <div 
            className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 no-swipe"
            onTouchStart={(e) => e.stopPropagation()}
          >
            {[
              { id: 'all', label: '全学年' },
              { id: 'junior_1', label: '中1全体' },
              { id: 'junior_1_early_mid', label: '中1前期中間' },
              { id: 'junior_1_early_final', label: '中1前期期末' },
              { id: 'junior_1_late_mid', label: '中1後期中間' },
              { id: 'junior_1_late_final', label: '中1後期期末' },
              { id: 'junior_1_early', label: '中1前期' },
              { id: 'junior_1_late', label: '中1後期' },
              { id: 'junior_2_early', label: '中2前期' },
              { id: 'junior_2_late', label: '中2後期' },
              { id: 'junior_3_early', label: '中3前期' },
              { id: 'junior_3_late', label: '中3後期' },
              { id: 'high_3', label: '高校' },
            ]
              .filter((g) => !(isHighSchoolUser && g.id.startsWith('junior')))
              .map((g) => (
              <button
                key={g.id}
                onClick={() => setGradeLevelFilter(g.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  gradeLevelFilter === g.id
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-glow-cyan'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          )}

          {/* Subject Categories (Bottom Row) */}
          <div 
            className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 no-swipe"
            onTouchStart={(e) => e.stopPropagation()}
          >
            {(quizMode === 'driving'
              ? [
                  { id: 'driving_all', label: '全免許分野' },
                  { id: 'driving_karimen', label: '仮免学科' },
                  { id: 'driving_honmen', label: '本免学科' },
                  { id: 'driving_hazard', label: '危険予測' },
                  { id: 'driving_aptitude', label: '適性検査' },
                ]
              : [
                  { id: 'all', label: '全教科' },
                  { id: 'general_knowledge', label: '小論文・教養' },
                  { id: 'english', label: '英語' },
                  { id: 'math', label: '数学' },
                  { id: 'science', label: '理科' },
                  { id: 'social_studies', label: '社会' },
                  { id: 'japanese', label: '国語' },
                  { id: 'music', label: '🎵音楽' },
                  { id: 'art', label: '🎨美術' },
                  { id: 'pe', label: '🏃保健体育' },
                  { id: 'tech_home', label: '🛠️技術家庭' },
                ]
            ).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
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
        )}
      </div>

      {quizMode === 'mock' ? (
        <MockExamView currentUser={currentUser} onPointsUpdate={onPointsUpdate} />
      ) : (
      <>

      {/* Session Earned Bar */}
      <div className="flex items-center justify-between bg-slate-950/60 px-3.5 py-2 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <div className="text-xs text-slate-300">
            獲得: <strong className="text-amber-400 font-mono text-sm font-black">+{sessionPoints} pt</strong>
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
            選択された【{getGradeLabel(gradeLevelFilter)}】×【{getCategoryLabel(category)}】に該当する問題は現在プールにありません。
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
        <div className="glass-card p-4 sm:p-6 rounded-2xl space-y-4 border border-cyber-border shadow-xl relative">
          
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2.5">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-cyber-neonCyan font-bold tracking-wider">
              {getCategoryLabel(currentQuiz.category)}
            </span>
            <span className="text-slate-400 font-mono text-xs">
              #{currentIndex + 1} / {quizzes.length}
            </span>
          </div>

          <div className="space-y-2.5">
            {currentQuiz.image_key && <TrafficSignSvg imageKey={currentQuiz.image_key} />}
            <h3 className="text-base sm:text-xl font-black text-white leading-snug">
              {currentQuiz.question_text}
            </h3>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-2">
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
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between text-sm transition-all ${buttonStyle}`}
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
                isFoulAnswer
                  ? 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                  : isCorrect
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/80 border-red-500/40 text-red-300'
              }`}>
                <div className="flex items-center gap-3">
                  {isFoulAnswer ? (
                    <>
                      <XCircle className="w-7 h-7 text-amber-400 shrink-0" />
                      <div>
                        <div className="font-extrabold text-base text-amber-400">⚠️ 反則判定！ (ポイント +0 pt)</div>
                        <div className="text-xs text-amber-200">{foulMessage}</div>
                      </div>
                    </>
                  ) : isCorrect ? (
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

              {/* Explanation Box */}
              {currentQuiz.explanation && (
                <div className="p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/30 text-xs sm:text-sm text-cyan-100 leading-relaxed">
                  <span className="font-black text-cyber-neonCyan mr-1.5">💡 解説:</span>
                  {currentQuiz.explanation}
                </div>
              )}

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
      </>
      )}

    </div>
  );
};
