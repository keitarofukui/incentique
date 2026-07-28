import React, { useState } from 'react';
import { Sparkles, Bot, Check, AlertCircle, RefreshCw } from 'lucide-react';

export const AiQuizGenerator: React.FC = () => {
  const [gradeLevel, setGradeLevel] = useState<'high_3' | 'junior_1'>('high_3');
  const [category, setCategory] = useState<string>('english');
  const [count, setCount] = useState<number>(5);
  const [topic, setTopic] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<{ success: boolean; count?: number; message?: string } | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/quizzes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gradeLevel,
          category,
          count,
          topic: topic.trim() || undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        setResult({
          success: true,
          count: data.count,
          message: `Gemini APIによって問題が${data.count}問自動生成され、D1データベースへ保存されました！`
        });
      } else {
        setResult({
          success: false,
          message: data.error || '自動生成に失敗しました。'
        });
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || '通信エラーが発生しました。'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-6 border border-purple-500/30">
      
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <span>Gemini AI クイズ自動一括生成スタジオ</span>
            <span className="text-[10px] bg-purple-500/30 text-purple-300 font-mono px-2 py-0.5 rounded-full border border-purple-400/40">
              gemini-2.5-flash
            </span>
          </h3>
          <p className="text-xs text-slate-400">非同期バッチ処理で学科・ラグビー規則の4択問題をAIが自動作成！</p>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Grade Target */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-300">対象学年</label>
          <select
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value as any)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400"
          >
            <option value="high_3">高校3年生（大学受験・共通テスト）</option>
            <option value="junior_1">中学1年生（定期テスト・基礎）</option>
          </select>
        </div>

        {/* Category */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-300">科目・カテゴリ</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400"
          >
            <option value="english">英語（単語・文法）</option>
            <option value="social_studies">社会（歴史・地理・公民）</option>
            <option value="science">理科（物理・化学・生物・地学）</option>
          </select>
        </div>

        {/* Question Count */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-300">生成問数</label>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-purple-400"
          >
            <option value={3}>3 問</option>
            <option value={5}>5 問</option>
            <option value={10}>10 問</option>
          </select>
        </div>

        {/* Topic Prompt */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-300">指定テーマ・詳細（任意）</label>
          <input
            type="text"
            placeholder="例: 名誉革命, スクラムの反則ルール, 最頻出英単語"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400"
          />
        </div>

        <div className="md:col-span-2 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyber-neonCyan text-white font-black text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-glow-purple"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Gemini API が問題を自動作成中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span>AIで問題を一括生成してデータベースに追加する</span>
              </>
            )}
          </button>
        </div>

      </form>

      {/* Result Alert */}
      {result && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
          result.success ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-red-950/40 border-red-500/40 text-red-300'
        }`}>
          {result.success ? (
            <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="font-bold text-sm mb-0.5">{result.success ? 'AI生成完了！' : '生成エラー'}</div>
            <div>{result.message}</div>
          </div>
        </div>
      )}

    </div>
  );
};
