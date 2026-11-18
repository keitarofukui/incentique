import React, { useState, useEffect, useRef } from 'react';
import { MockExamQuestion, MockSubmitResponse, User } from '../types';
import { API_ROUTES } from '../../shared/apiRoutes';
import { TrafficSignSvg } from './TrafficSignSvg';
import { Clock, CheckCircle2, XCircle, Award, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MockExamViewProps {
  currentUser: User;
  onPointsUpdate: (newPoints: number) => void;
}

export const MockExamView: React.FC<MockExamViewProps> = ({ currentUser, onPointsUpdate }) => {
  const [phase, setPhase] = useState<'select' | 'running' | 'result'>('select');
  const [examType, setExamType] = useState<'karimen' | 'honmen'>('karimen');
  const [questions, setQuestions] = useState<MockExamQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [result, setResult] = useState<MockSubmitResponse | null>(null);
  const submittedRef = useRef<boolean>(false);

  useEffect(() => {
    if (phase !== 'running') return;
    if (secondsLeft <= 0) {
      if (!submittedRef.current && questions.length > 0) {
        void handleSubmitExam();
      }
      return;
    }
    const timer = setInterval(() => setSecondsLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [phase, secondsLeft, questions.length]);

  const startExam = async (type: 'karimen' | 'honmen') => {
    setLoading(true);
    setErrorMsg('');
    setExamType(type);
    submittedRef.current = false;
    try {
      const res = await fetch(`${API_ROUTES.QUIZZES_MOCK}?examType=${type}`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error('[QUIZZES_MOCK] failed', res.status, body);
        setErrorMsg(`模擬試験の取得に失敗しました (${res.status}): ${body}`);
        return;
      }
      const data = await res.json();
      if (!data.success || !Array.isArray(data.questions) || data.questions.length === 0) {
        setErrorMsg(data.error || '問題データを取得できませんでした');
        return;
      }
      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(null));
      setCurrentIdx(0);
      setSecondsLeft((data.timeLimitMinutes || (type === 'karimen' ? 30 : 50)) * 60);
      setResult(null);
      setPhase('running');
    } catch (err) {
      console.error('[QUIZZES_MOCK] network error', err);
      setErrorMsg('通信に失敗しました。再試行してください。');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitExam = async () => {
    if (submitting || submittedRef.current) return;
    setSubmitting(true);
    submittedRef.current = true;
    setErrorMsg('');
    try {
      const payload = {
        userId: currentUser.id,
        examType,
        answers: questions.map((q, idx) => ({
          questionId: q.id,
          selectedIndex: answers[idx] ?? null,
        })),
      };
      const res = await fetch(API_ROUTES.QUIZZES_MOCK_SUBMIT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error('[QUIZZES_MOCK_SUBMIT] failed', res.status, body);
        setErrorMsg(`採点送信に失敗しました (${res.status}): ${body}`);
        submittedRef.current = false;
        return;
      }
      const data: MockSubmitResponse = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || '採点処理に失敗しました');
        submittedRef.current = false;
        return;
      }
      setResult(data);
      setPhase('result');
      if (data.pointsEarned > 0) {
        onPointsUpdate(data.newTotalPoints);
      }
      if (data.passed) {
        confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
      }
    } catch (err) {
      console.error('[QUIZZES_MOCK_SUBMIT] network error', err);
      setErrorMsg('通信に失敗しました。再試行してください。');
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (phase === 'select') {
    return (
      <div className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              type: 'karimen' as const,
              badge: '第一段階',
              badgeClass: 'bg-cyan-500/20 text-cyan-300',
              meta: '30分 / 50問',
              title: '仮免学科 模擬試験',
              desc: '文章問題50問（1問2点）。90点（45問正解）以上で合格！毎回ランダムで異なる問題セットを出題します。',
              btnClass: 'from-cyan-500 to-blue-600',
              btnText: '仮免模試スタート (完了+10pt / 合格さらに+50pt)',
            },
            {
              type: 'honmen' as const,
              badge: '第二段階',
              badgeClass: 'bg-amber-500/20 text-amber-300',
              meta: '50分 / 95問',
              title: '本免学科 模擬試験',
              desc: '文章90問（各1点）＋危険予測イラスト5問（各2点）。90点以上で合格！本番と同じ配点・時間で毎回新規出題。',
              btnClass: 'from-amber-500 to-orange-600',
              btnText: '本免模試スタート (完了+20pt / 合格さらに+100pt)',
            },
          ].map((item) => (
            <div key={item.type} className="glass-card p-5 rounded-3xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${item.badgeClass}`}>{item.badge}</span>
                <span className="text-xs text-slate-400">{item.meta}</span>
              </div>
              <h3 className="text-lg font-black text-white">{item.title}</h3>
              <p className="text-xs text-slate-400">{item.desc}</p>
              <button
                disabled={loading}
                onClick={() => startExam(item.type)}
                className={`w-full py-3 rounded-xl bg-gradient-to-r ${item.btnClass} text-white font-black text-sm hover:opacity-90 disabled:opacity-50`}
              >
                {loading && examType === item.type ? '問題セット作成中...' : item.btnText}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'result' && result) {
    const wrongItems = questions
      .map((q, idx) => ({ q, idx, selected: answers[idx] }))
      .filter((item) => item.selected !== item.q.correct_index);

    return (
      <div className="space-y-4">
        <div className={`glass-card p-6 rounded-3xl border text-center space-y-3 ${result.passed ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-rose-500/50 bg-rose-950/20'}`}>
          <div className="flex justify-center">
            {result.passed ? <Award className="w-12 h-12 text-emerald-400" /> : <XCircle className="w-12 h-12 text-rose-400" />}
          </div>
          <div className={`text-2xl font-black ${result.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
            {result.passed ? '🎉 合格ライン突破！' : '😢 不合格（合格ライン 90点）'}
          </div>
          <div className="text-4xl font-black text-white font-mono">
            {result.score} <span className="text-lg text-slate-400">/ 100点</span>
          </div>
          <div className="text-xs text-slate-300">
            正答数: {result.correctCount} / {result.totalCount}問 ・ 獲得ポイント: +{result.pointsEarned} pt
          </div>
          <div className="flex gap-2 justify-center pt-2">
            <button onClick={() => setPhase('select')} className="px-5 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs">
              模試選択に戻る
            </button>
            <button onClick={() => startExam(examType)} className="px-5 py-2.5 rounded-xl bg-cyber-neonCyan text-slate-950 font-black text-xs flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> 別の問題セットで再挑戦
            </button>
          </div>
        </div>

        {wrongItems.length > 0 && (
          <div className="glass-card p-5 rounded-3xl border border-slate-800 space-y-3">
            <h4 className="font-black text-sm text-rose-300">間違えた・未回答の問題 ({wrongItems.length}問) 振り返り</h4>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {wrongItems.map(({ q, idx, selected }) => (
                <div key={q.id} className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                  <div className="font-bold text-white">Q{idx + 1}. {q.question_text}</div>
                  {q.image_key && <TrafficSignSvg imageKey={q.image_key} />}
                  <div className="text-slate-400">
                    あなたの回答: {selected !== null ? q.options[selected] : '未回答'} / <span className="text-emerald-400 font-bold">正解: {q.options[q.correct_index]}</span>
                  </div>
                  {q.explanation && <div className="p-2.5 rounded-xl bg-slate-950 text-cyan-200 border border-cyan-900/40">💡 {q.explanation}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const answeredCount = answers.filter((a) => a !== null).length;

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs">{errorMsg}</div>
      )}
      <div className="glass-card p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-mono font-bold text-amber-400">
          <Clock className="w-4 h-4" />
          <span>残り {formatTime(secondsLeft)}</span>
        </div>
        <div className="text-slate-300 font-bold">回答済 {answeredCount} / {questions.length}問</div>
        <button
          disabled={submitting}
          onClick={handleSubmitExam}
          className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-black hover:bg-emerald-400 disabled:opacity-50"
        >
          {submitting ? '採点中...' : '採点する'}
        </button>
      </div>

      {currentQ && (
        <div className="glass-card p-5 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-cyan-300 font-bold">
              Q{currentIdx + 1} / {questions.length}（{currentQ.points}点）
            </span>
            <button onClick={() => setPhase('select')} className="text-slate-500 hover:text-white">中断して戻る</button>
          </div>
          {currentQ.image_key && <TrafficSignSvg imageKey={currentQ.image_key} />}
          <h3 className="text-lg font-black text-white leading-snug">{currentQ.question_text}</h3>
          <div className="grid grid-cols-1 gap-2.5">
            {currentQ.options.map((opt, idx) => {
              const selected = answers[currentIdx] === idx;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    const next = [...answers];
                    next[currentIdx] = idx;
                    setAnswers(next);
                  }}
                  className={`p-3.5 rounded-2xl border text-left text-sm flex items-center gap-3 transition-all ${
                    selected
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                      : 'bg-slate-900/80 border-slate-700/80 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-mono shrink-0">
                    {['A', 'B', 'C', 'D'][idx]}
                  </span>
                  <span>{opt}</span>
                  {selected && <CheckCircle2 className="w-4 h-4 text-cyan-400 ml-auto shrink-0" />}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between pt-2">
            <button
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold disabled:opacity-30 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> 前の問題
            </button>
            <button
              disabled={currentIdx >= questions.length - 1}
              onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
              className="px-4 py-2 rounded-xl bg-cyber-neonCyan text-slate-950 text-xs font-black disabled:opacity-30 flex items-center gap-1"
            >
              次の問題 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
        {questions.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIdx(idx)}
            className={`w-7 h-7 rounded-lg text-[11px] font-mono font-bold ${
              idx === currentIdx
                ? 'bg-cyber-neonCyan text-slate-950'
                : answers[idx] !== null
                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {idx + 1}
          </button>
        ))}
      </div>
    </div>
  );
};
