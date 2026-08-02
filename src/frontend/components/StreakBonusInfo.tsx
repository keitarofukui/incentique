import React from 'react';
import { Flame, Star, Zap, TrendingUp, Calendar, CheckCircle2, ArrowRight } from 'lucide-react';

interface Props {
  onNavigate: (tab: string) => void;
}

export const StreakBonusInfo: React.FC<Props> = ({ onNavigate }) => {
  return (
    <div className="space-y-6 sm:space-y-8 pb-12 animate-fade-in pt-4 px-2">
      
      {/* Header Area */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-10 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 border border-purple-500/30 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-rose-500/20 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-500/20 to-orange-500/20 border border-rose-500/30 text-rose-300 text-sm font-black tracking-wide uppercase shadow-glow-rose">
            <Flame className="w-4 h-4" />
            <span>NEW FEATURE</span>
          </div>
          
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-fuchsia-300 to-indigo-300 leading-tight">
            継続は力なり！<br className="sm:hidden" />連続記録ボーナス
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed">
            毎日コツコツ続けることで、獲得ポイントがどんどん増えていく新システムが実装されました。
            毎日の積み重ねをボーナスポイントで応援します！
          </p>
        </div>
      </div>

      {/* Main Contents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 通常ストリーク */}
        <div className="glass-card p-6 rounded-3xl border-2 border-indigo-500/30 bg-gradient-to-b from-indigo-900/40 to-transparent space-y-5">
          <div className="flex items-center gap-3 border-b border-indigo-500/30 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/50 shadow-glow-indigo shrink-0">
              <Calendar className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">🔥 デイリー連続ボーナス</h3>
              <p className="text-xs text-indigo-300 font-bold">1日1アクションでもOK！</p>
            </div>
          </div>
          
          <p className="text-sm text-slate-300 leading-relaxed">
            クイズ、読書、運動、食事など、<strong className="text-indigo-300">何でも良いので1日に1回以上記録</strong>するだけで連続日数がカウントされます。
            節目の日数に到達すると、ボーナスポイントを獲得できます！
          </p>
          
          <div className="bg-slate-900/60 rounded-2xl p-4 border border-indigo-500/20 space-y-3">
            <div className="text-xs font-bold text-slate-400 text-center mb-2">ボーナス計算式</div>
            <div className="flex items-center justify-center gap-3 text-2xl font-black font-mono">
              <span className="text-white">日数</span>
              <span className="text-indigo-400">×</span>
              <span className="text-amber-400">10 pt</span>
            </div>
            
            <ul className="text-xs text-slate-300 space-y-2 pt-2 border-t border-slate-700/50">
              <li className="flex justify-between items-center"><span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-400"/>3日連続</span> <span className="font-mono font-bold text-amber-400">+30 pt</span></li>
              <li className="flex justify-between items-center"><span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-400"/>10日連続</span> <span className="font-mono font-bold text-amber-400">+100 pt</span></li>
              <li className="flex justify-between items-center"><span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-400"/>50日連続</span> <span className="font-mono font-bold text-amber-400">+500 pt</span></li>
              <li className="flex justify-between items-center text-indigo-300"><span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-400"/>100日連続</span> <span className="font-mono font-bold text-amber-400">+1,000 pt</span></li>
            </ul>
          </div>
        </div>

        {/* 50pt超えストリーク */}
        <div className="glass-card p-6 rounded-3xl border-2 border-rose-500/30 bg-gradient-to-b from-rose-900/40 to-transparent space-y-5 relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-rose-500 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase shadow-glow-rose rotate-12">
            Super Bonus!
          </div>
          <div className="flex items-center gap-3 border-b border-rose-500/30 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center border border-rose-500/50 shadow-glow-rose shrink-0">
              <TrendingUp className="w-6 h-6 text-rose-300" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">💥 50pt超え 連続ボーナス</h3>
              <p className="text-xs text-rose-300 font-bold">本気で頑張る人への特大ボーナス！</p>
            </div>
          </div>
          
          <p className="text-sm text-slate-300 leading-relaxed">
            1日の合計獲得ポイントが<strong className="text-rose-300">50pt以上</strong>に達した日が連続すると、デイリーボーナスとは<strong className="text-rose-300 underline">別枠で</strong>さらに強力な超ボーナスが発動します！
          </p>
          
          <div className="bg-slate-900/60 rounded-2xl p-4 border border-rose-500/20 space-y-3">
            <div className="text-xs font-bold text-slate-400 text-center mb-2">ボーナス計算式</div>
            <div className="flex items-center justify-center gap-3 text-2xl font-black font-mono">
              <span className="text-white">日数</span>
              <span className="text-rose-400">×</span>
              <span className="text-amber-400">30 pt</span>
            </div>
            
            <ul className="text-xs text-slate-300 space-y-2 pt-2 border-t border-slate-700/50">
              <li className="flex justify-between items-center"><span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-rose-400"/>3日連続</span> <span className="font-mono font-bold text-amber-400">+90 pt</span></li>
              <li className="flex justify-between items-center"><span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-rose-400"/>10日連続</span> <span className="font-mono font-bold text-amber-400">+300 pt</span></li>
              <li className="flex justify-between items-center"><span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-rose-400"/>50日連続</span> <span className="font-mono font-bold text-amber-400">+1,500 pt</span></li>
              <li className="flex justify-between items-center text-rose-300"><span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-rose-400"/>100日連続</span> <span className="font-mono font-bold text-amber-400">+3,000 pt</span></li>
            </ul>
          </div>
        </div>

        {/* 200pt超えストリーク */}
        <div className="glass-card p-6 rounded-3xl border-2 border-amber-500/30 bg-gradient-to-b from-amber-900/40 to-transparent space-y-5 md:col-span-2 relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-amber-500 text-slate-900 text-[10px] font-black px-2 py-1 rounded-full uppercase shadow-glow-gold rotate-12">
            Legendary!
          </div>
          <div className="flex items-center gap-3 border-b border-amber-500/30 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/50 shadow-glow-gold shrink-0">
              <Star className="w-6 h-6 text-amber-300 fill-amber-300" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">👑 200pt超え 神ボーナス</h3>
              <p className="text-xs text-amber-300 font-bold">限界を超えた勇者への最強ボーナス！</p>
            </div>
          </div>
          
          <p className="text-sm text-slate-300 leading-relaxed">
            1日の合計獲得ポイントが<strong className="text-amber-300">200pt以上</strong>に達した日が連続すると、デイリー・50ptボーナスに加えて<strong className="text-amber-300 underline">さらに究極の神ボーナス</strong>が発動します！
          </p>
          
          <div className="bg-slate-900/60 rounded-2xl p-4 border border-amber-500/20 space-y-3">
            <div className="text-xs font-bold text-slate-400 text-center mb-2">ボーナス計算式</div>
            <div className="flex items-center justify-center gap-3 text-2xl font-black font-mono">
              <span className="text-white">日数</span>
              <span className="text-amber-400">×</span>
              <span className="text-amber-400">100 pt</span>
            </div>
            
            <ul className="text-xs text-slate-300 space-y-2 pt-2 border-t border-slate-700/50">
              <li className="flex justify-between items-center"><span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-amber-400"/>3日連続</span> <span className="font-mono font-bold text-amber-400">+300 pt</span></li>
              <li className="flex justify-between items-center"><span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-amber-400"/>10日連続</span> <span className="font-mono font-bold text-amber-400">+1,000 pt</span></li>
              <li className="flex justify-between items-center"><span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-amber-400"/>50日連続</span> <span className="font-mono font-bold text-amber-400">+5,000 pt</span></li>
              <li className="flex justify-between items-center text-amber-300"><span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-amber-400"/>100日連続</span> <span className="font-mono font-bold text-amber-400">+10,000 pt</span></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Rules & Notes */}
      <div className="glass-card p-6 rounded-3xl border border-slate-700/50 space-y-4">
        <h4 className="text-sm font-black text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          知っておくべきルール
        </h4>
        <div className="space-y-2 text-xs sm:text-sm text-slate-300">
          <div className="flex gap-2">
            <span className="text-amber-400 font-bold shrink-0">1.</span>
            <p><strong className="text-white">1日の区切りは「朝4:00」です。</strong>深夜0時を過ぎても、朝3:59までの記録は「前日」としてカウントされるので安心です。</p>
          </div>
          <div className="flex gap-2">
            <span className="text-amber-400 font-bold shrink-0">2.</span>
            <p>ボーナスの節目となる日数は <strong className="font-mono text-indigo-300 bg-indigo-500/10 px-1 rounded">3, 5, 10, 20, 30, 50, 100, 150, 200, 250, 300, 365</strong> 日です。節目に到達した瞬間に自動でポイントが付与されます。</p>
          </div>
          <div className="flex gap-2">
            <span className="text-amber-400 font-bold shrink-0">3.</span>
            <p>「🔥デイリー」「💥50pt超え」「👑200pt超え」の条件を全て満たした節目の日は、<strong>3種類のボーナスをトリプルで獲得</strong>できます！</p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={() => onNavigate('dashboard')}
          className="group relative px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-black hover:brightness-110 transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-2 border border-indigo-400/50"
        >
          <span>ダッシュボードに戻って記録を始める</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

    </div>
  );
};
