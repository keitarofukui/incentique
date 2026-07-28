import React, { useState, useMemo } from 'react';
import { User, ActionLog } from '../types';
import { Utensils, AlertCircle, Drumstick } from 'lucide-react';
import { GachaResult } from './LuckyGachaModal';
import { SuccessToast } from './SuccessToast';
import { logLocalDateStr, todayLocalDateStr, currentLocalMonthStr } from '../dateUtils';

// Plain name per carb type. The log title appends 「約Ng」 itself, so these
// labels must NOT carry a gram count — otherwise a slider tweak leaves a stale
// amount behind ("白飯 200g / 約350g").
const CARB_NAMES: { [key: string]: string } = {
  rice: '白飯',
  noodle: 'ラーメン/うどん',
  pasta: 'パスタ',
  bread: '食パン・惣菜パン',
};

// Default amount per carb type — also used to reset the form after a log is saved
const CARB_DEFAULTS: { [key: string]: { grams: number; label: string } } = {
  rice: { grams: 200, label: '白飯 普通' },
  noodle: { grams: 200, label: 'ラーメン/うどん 1玉' },
  pasta: { grams: 250, label: 'パスタ 1人前' },
  bread: { grams: 160, label: '食パン・惣菜パン 2個' },
};

const MEAT_DEFAULT = { grams: 150, label: '唐揚げ 5個' };

// Point return rate per 100g. The server recalculates with the same rates in
// POST /api/action-logs — keep both sides in sync or the preview will lie.
const MEAL_RATES = {
  rice: (isJunior: boolean) => (isJunior ? 10 : 3),
  meat: (isJunior: boolean) => (isJunior ? 15 : 4.5),
};

interface EatRiceModalProps {
  currentUser: User | null;
  actionLogs: ActionLog[];
  onSuccess: () => void;
  onGachaResult?: (result: GachaResult) => void;
}

export const EatRiceModal: React.FC<EatRiceModalProps> = ({
  currentUser,
  actionLogs,
  onSuccess,
  onGachaResult,
}) => {
  if (!currentUser) return null;

  const [activeSubTab, setActiveSubTab] = useState<'rice' | 'meat'>('rice');
  const [carbType, setCarbType] = useState<'rice' | 'noodle' | 'pasta' | 'bread'>('rice');
  const [riceGrams, setRiceGrams] = useState<number>(CARB_DEFAULTS.rice.grams);
  const [carbMenuTitle, setCarbMenuTitle] = useState<string>(CARB_DEFAULTS.rice.label);
  const [meatGrams, setMeatGrams] = useState<number>(MEAT_DEFAULT.grams);
  const [meatMenuTitle, setMeatMenuTitle] = useState<string>(MEAT_DEFAULT.label);
  const [memo, setMemo] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const isJunior = currentUser.grade_level.startsWith('junior');
  const isHigh = currentUser.grade_level.startsWith('high');

  // Meat gets a 1.5x rate bonus for the protein.
  // These must stay in sync with the server-side recalculation in
  // POST /api/action-logs (src/backend/index.ts) — that is the value actually awarded.
  const riceRatePercent = MEAL_RATES.rice(isJunior);
  const meatRatePercent = MEAL_RATES.meat(isJunior);

  const currentRatePercent = activeSubTab === 'rice' ? riceRatePercent : meatRatePercent;
  const currentGrams = activeSubTab === 'rice' ? riceGrams : meatGrams;

  // Today and Monthly totals for both Rice and Meat (local/JST days, not UTC)
  const todayStr = todayLocalDateStr();
  const monthStr = currentLocalMonthStr();

  const stats = useMemo(() => {
    let rTodayG = 0, rTodayC = 0, rMonthG = 0;
    let mTodayG = 0, mTodayC = 0, mMonthG = 0;

    actionLogs.forEach((log) => {
      if (log.user_id !== currentUser.id) return;
      const logDate = logLocalDateStr(log.created_at);
      const match = log.title_or_menu.match(/(\d+)g/);
      const gVal = match ? parseInt(match[1], 10) : 0;

      if (log.category === 'eat_rice') {
        if (logDate === todayStr) {
          rTodayG += gVal;
          rTodayC += 1;
        }
        if (logDate.startsWith(monthStr)) {
          rMonthG += gVal;
        }
      } else if (log.category === 'eat_meat') {
        if (logDate === todayStr) {
          mTodayG += gVal;
          mTodayC += 1;
        }
        if (logDate.startsWith(monthStr)) {
          mMonthG += gVal;
        }
      }
    });

    return {
      riceTodayGrams: rTodayG,
      riceTodayCount: rTodayC,
      riceMonthGrams: rMonthG,
      meatTodayGrams: mTodayG,
      meatTodayCount: mTodayC,
      meatMonthGrams: mMonthG,
    };
  }, [actionLogs, currentUser.id, todayStr, monthStr]);

  const maxSingleLimit = 1000;

  // Calculated earned points before multiplier
  const calculatedPoints = Math.floor((currentGrams * currentRatePercent) / 100);

  const handleRiceGramChange = (val: number, titleLabel?: string) => {
    setErrorMsg('');
    if (isNaN(val)) {
      setRiceGrams(0);
      return;
    }
    setRiceGrams(val);
    if (titleLabel) setCarbMenuTitle(titleLabel);
  };

  const handleMeatGramChange = (val: number, label: string) => {
    setErrorMsg('');
    if (isNaN(val)) {
      setMeatGrams(0);
      return;
    }
    setMeatGrams(val);
    setMeatMenuTitle(label);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (currentGrams <= 0) {
      setErrorMsg('1g以上の量を入力してください');
      return;
    }

    if (currentGrams > maxSingleLimit) {
      setErrorMsg(`1回の登録上限は ${maxSingleLimit}g (1kg) までです`);
      return;
    }

    setLoading(true);

    try {
      const category = activeSubTab === 'rice' ? 'eat_rice' : 'eat_meat';
      const title =
        activeSubTab === 'rice'
          ? `🍚 主食（${carbMenuTitle || '炭水化物'} / 約${riceGrams}g）完食！`
          : `🥩 お肉（${meatMenuTitle} / 約${meatGrams}g）完食！`;

      const res = await fetch('/api/action-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          category: category,
          titleOrMenu: title,
          reviewText: memo
            ? `【メモ】${memo}`
            : activeSubTab === 'rice'
            ? `主食（${carbMenuTitle}）を食べてエネルギー補給しました！`
            : `お肉（${meatMenuTitle}）を食べてタンパク質を補給しました！`,
          grams: currentGrams,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Reset form to its initial state for continuous input
        // (keep the selected 主食/お肉 tab and carb type, reset the amounts)
        setMemo('');
        const carbPreset = CARB_DEFAULTS[carbType] || CARB_DEFAULTS.rice;
        setRiceGrams(carbPreset.grams);
        setCarbMenuTitle(carbPreset.label);
        setMeatGrams(MEAT_DEFAULT.grams);
        setMeatMenuTitle(MEAT_DEFAULT.label);
        onSuccess();

        // Show success toast
        const pts = data.finalEarnedPoints || calculatedPoints;
        setSuccessMsg(`✅「${title}」を記録しました！(+${pts}pt)`);
        setTimeout(() => setSuccessMsg(''), 4000);

        if (data.multiplier && data.multiplier > 1 && onGachaResult) {
          onGachaResult({
            basePoints: data.basePoints || calculatedPoints,
            multiplier: data.multiplier,
            finalEarnedPoints: data.finalEarnedPoints || calculatedPoints * data.multiplier,
            bonusTier: data.bonusTier,
            bonusLabel: data.bonusLabel,
            actionTitle: title,
          });
        }
      } else {
        setErrorMsg(data.error || '送信に失敗しました');
      }
    } catch (err) {
      setErrorMsg('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="glass-card w-full rounded-3xl p-6 sm:p-8 border border-amber-500/40 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-glow-gold">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <span>🍚🥩 食べて稼ぐ！食事記録</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">主食（炭水化物）とお肉（タンパク質）をバランスよく摂って強い身体を作ろう！</p>
            </div>
          </div>
        </div>

        {/* Sub-Tabs Selector (Rice vs Meat) */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('rice');
              setErrorMsg('');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'rice'
                ? 'bg-amber-500 text-slate-950 shadow-glow-gold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🍚 主食（炭水化物）</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('meat');
              setErrorMsg('');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'meat'
                ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-glow-purple'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Drumstick className="w-4 h-4 text-rose-300" />
            <span>🥩 お肉（1.5倍ボーナス！）</span>
          </button>
        </div>

        {/* Today's Consumed Meal Stats Badge */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-rose-950/60 border border-amber-500/40 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-bounce">{activeSubTab === 'rice' ? '🍚' : '🥩'}</span>
            <div>
              <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <span>本日の食べる実績</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                🍚 主食: <strong className="text-amber-300 font-mono">{stats.riceTodayGrams}g</strong> ({stats.riceTodayCount}回)
                <span className="mx-1.5 text-slate-600">|</span>
                🥩 お肉: <strong className="text-rose-300 font-mono">{stats.meatTodayGrams}g</strong> ({stats.meatTodayCount}回)
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-black font-mono text-amber-400">
              {activeSubTab === 'rice' ? stats.riceTodayGrams : stats.meatTodayGrams} <span className="text-xs font-bold text-amber-300">g</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              今月累計: {((activeSubTab === 'rice' ? stats.riceMonthGrams : stats.meatMonthGrams) / 1000).toFixed(1)}kg
            </div>
          </div>
        </div>

        {/* Grade & Rate Info Banner */}
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">🎒</span>
            <span className="font-bold text-slate-200">
              {currentUser.name}さん（{isJunior ? '中学生' : isHigh ? '高校生' : '一般'}）
            </span>
          </div>
          <div className={`font-mono font-black text-sm px-3 py-1 rounded-xl border ${
            activeSubTab === 'meat'
              ? 'text-rose-300 bg-rose-500/20 border-rose-500/40 shadow-glow-purple animate-pulse'
              : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
          }`}>
            {activeSubTab === 'meat' ? '🔥 肉ボーナス ' : ''}還元率 {currentRatePercent}% ({isJunior ? `${currentGrams}g ➔ ${calculatedPoints}pt` : `${currentGrams}g ➔ ${calculatedPoints}pt`})
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {activeSubTab === 'rice' ? (
            /* Carbs Mode Input (Rice, Noodle, Pasta, Bread) */
            <div className="space-y-3.5">
              <label className="text-xs font-bold text-amber-300 block flex items-center justify-between">
                <span>🍚 食べた主食（炭水化物）の種類を選択</span>
                <span className="text-[10px] text-slate-400 font-normal">タップで自動グラム換算！</span>
              </label>

              {/* Carb Category Selector Buttons */}
              <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                {[
                  { id: 'rice', label: '🍚 お米' },
                  { id: 'noodle', label: '🍜 麺類' },
                  { id: 'pasta', label: '🍝 パスタ' },
                  { id: 'bread', label: '🍞 パン' },
                ].map((typeItem) => (
                  <button
                    key={typeItem.id}
                    type="button"
                    onClick={() => {
                      setCarbType(typeItem.id as any);
                      const preset = CARB_DEFAULTS[typeItem.id];
                      handleRiceGramChange(preset.grams, preset.label);
                    }}
                    className={`py-1.5 text-xs font-black rounded-xl transition-all ${
                      carbType === typeItem.id
                        ? 'bg-amber-500 text-slate-950 shadow-glow-gold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {typeItem.label}
                  </button>
                ))}
              </div>

              {/* Presets per Carb Type */}
              {carbType === 'rice' && (
                <div className="space-y-1.5 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                  <div className="text-[11px] font-bold text-amber-300">🍚 白飯・丼もの</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: '🍚 軽め', val: 150 },
                      { label: '🍚 普通', val: 200 },
                      { label: '🍚 大盛り', val: 300 },
                      { label: '🍚 どんぶり', val: 400 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => handleRiceGramChange(preset.val, `白飯 ${preset.label.replace('🍚 ', '')}`)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border ${
                          riceGrams === preset.val
                            ? 'bg-amber-500/30 text-amber-200 border-amber-400 font-black shadow-glow-gold'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        <div>{preset.label}</div>
                        <div className="text-[10px] opacity-80 font-mono">{preset.val}g</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {carbType === 'noodle' && (
                <div className="space-y-1.5 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                  <div className="text-[11px] font-bold text-cyan-300">🍜 ラーメン / うどん / そば (1玉=約200g)</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: '0.5玉', val: 100 },
                      { label: '1玉', val: 200 },
                      { label: '1.5玉', val: 300 },
                      { label: '2玉/大盛', val: 400 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => handleRiceGramChange(preset.val, `ラーメン/うどん ${preset.label}`)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border ${
                          riceGrams === preset.val
                            ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 font-black shadow-glow-cyan'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        <div>{preset.label}</div>
                        <div className="text-[10px] opacity-80 font-mono">{preset.val}g</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {carbType === 'pasta' && (
                <div className="space-y-1.5 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                  <div className="text-[11px] font-bold text-rose-300">🍝 パスタ / スパゲティ</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: '軽め', val: 150 },
                      { label: '1人前', val: 250 },
                      { label: '大盛り', val: 350 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => handleRiceGramChange(preset.val, `パスタ ${preset.label}`)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border ${
                          riceGrams === preset.val
                            ? 'bg-rose-500/30 text-rose-200 border-rose-400 font-black shadow-glow-purple'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        <div>{preset.label}</div>
                        <div className="text-[10px] opacity-80 font-mono">{preset.val}g</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {carbType === 'bread' && (
                <div className="space-y-1.5 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                  <div className="text-[11px] font-bold text-yellow-300">🍞 食パン / 惣菜パン (1個=約80g)</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: '1個/枚', val: 80 },
                      { label: '2個/枚', val: 160 },
                      { label: '3個/枚', val: 240 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => handleRiceGramChange(preset.val, `食パン・惣菜パン ${preset.label}`)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border ${
                          riceGrams === preset.val
                            ? 'bg-yellow-500/30 text-yellow-200 border-yellow-400 font-black shadow-glow-gold'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        <div>{preset.label}</div>
                        <div className="text-[10px] opacity-80 font-mono">{preset.val}g</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Slider & Custom Input for Rice */}
              <div className="space-y-2 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">✏️ 自由入力・スライダー</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={riceGrams || ''}
                      onChange={(e) => handleRiceGramChange(parseInt(e.target.value, 10), CARB_NAMES[carbType])}
                      className="w-20 bg-slate-900 border border-amber-500/40 rounded-xl px-2.5 py-1 text-right font-mono font-bold text-amber-400 text-sm focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs font-bold text-amber-400">g</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={50}
                  max={800}
                  step={10}
                  value={riceGrams}
                  onChange={(e) => handleRiceGramChange(parseInt(e.target.value, 10), CARB_NAMES[carbType])}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          ) : (
            /* Meat Mode Input */
            <div className="space-y-3.5">
              <label className="text-xs font-bold text-rose-300 block flex items-center justify-between">
                <span>🥩 食べたお肉のメニュー・個数・枚数を選択</span>
                <span className="text-[10px] text-slate-400 font-normal">タップで自動グラム換算！</span>
              </label>

              {/* Preset Meat Presets Grid */}
              <div className="space-y-2.5">
                
                {/* 1. 唐揚げ (30g/個) */}
                <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 space-y-1.5">
                  <div className="text-[11px] font-bold text-amber-300 flex items-center justify-between">
                    <span>🍗 唐揚げ (1個あたり 約30g)</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { count: 2, g: 60 },
                      { count: 3, g: 90 },
                      { count: 4, g: 120 },
                      { count: 5, g: 150 },
                    ].map((item) => (
                      <button
                        key={item.count}
                        type="button"
                        onClick={() => handleMeatGramChange(item.g, `唐揚げ ${item.count}個`)}
                        className={`py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          meatGrams === item.g && meatMenuTitle.includes('唐揚げ')
                            ? 'bg-rose-500/30 text-rose-200 border-rose-400 font-black shadow-glow-purple'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {item.count}個 ({item.g}g)
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. 生姜焼き (40g/枚) */}
                <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 space-y-1.5">
                  <div className="text-[11px] font-bold text-rose-300 flex items-center justify-between">
                    <span>🥩 豚の生姜焼き (1枚あたり 約40g)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { count: 2, g: 80 },
                      { count: 3, g: 120 },
                      { count: 4, g: 160 },
                    ].map((item) => (
                      <button
                        key={item.count}
                        type="button"
                        onClick={() => handleMeatGramChange(item.g, `生姜焼き ${item.count}枚`)}
                        className={`py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          meatGrams === item.g && meatMenuTitle.includes('生姜焼き')
                            ? 'bg-rose-500/30 text-rose-200 border-rose-400 font-black shadow-glow-purple'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {item.count}枚 ({item.g}g)
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. 鶏ステーキ/チキンソテー (200g/枚) */}
                <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 space-y-1.5">
                  <div className="text-[11px] font-bold text-emerald-300 flex items-center justify-between">
                    <span>🍖 鶏ステーキ / チキンソテー (1枚あたり 約200g)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: '0.5枚', g: 100 },
                      { label: '1枚', g: 200 },
                      { label: '1.5枚', g: 300 },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleMeatGramChange(item.g, `鶏ステーキ ${item.label}`)}
                        className={`py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          meatGrams === item.g && meatMenuTitle.includes('鶏ステーキ')
                            ? 'bg-rose-500/30 text-rose-200 border-rose-400 font-black shadow-glow-purple'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {item.label} ({item.g}g)
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. 豚・牛ステーキ / ハンバーグ (150g/枚) */}
                <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 space-y-1.5">
                  <div className="text-[11px] font-bold text-cyan-300 flex items-center justify-between">
                    <span>🥩 豚・牛ステーキ / ハンバーグ (1枚あたり 約150g)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: '0.5枚', g: 75 },
                      { label: '1枚', g: 150 },
                      { label: '1.5枚', g: 225 },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleMeatGramChange(item.g, `ステーキ/ハンバーグ ${item.label}`)}
                        className={`py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          meatGrams === item.g && meatMenuTitle.includes('ステーキ/ハンバーグ')
                            ? 'bg-rose-500/30 text-rose-200 border-rose-400 font-black shadow-glow-purple'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {item.label} ({item.g}g)
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Meat Gram Input */}
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-bold">✏️ その他の肉・自由入力</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={meatGrams || ''}
                      onChange={(e) => handleMeatGramChange(parseInt(e.target.value, 10), 'お肉メニュー')}
                      className="w-20 bg-slate-900 border border-rose-500/40 rounded-xl px-2.5 py-1 text-right font-mono font-bold text-rose-300 text-sm focus:outline-none focus:border-rose-400"
                    />
                    <span className="text-xs font-bold text-rose-400">g</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Optional Memo */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 block">
              📝 おかずメモ（任意）
            </label>
            <input
              type="text"
              placeholder={activeSubTab === 'rice' ? "例: 焼肉丼にして食べた！" : "例: 自作のチキン南蛮！"}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || currentGrams <= 0 || currentGrams > maxSingleLimit}
            className={`w-full py-3.5 rounded-2xl font-black text-sm transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              activeSubTab === 'meat'
                ? 'text-white bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 hover:brightness-110 shadow-rose-500/30'
                : 'text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:brightness-110 shadow-amber-500/30'
            }`}
          >
            {loading ? (
              <span>送信中...</span>
            ) : (
              <>
                <Utensils className="w-4 h-4" />
                <span>
                  {activeSubTab === 'rice' ? `お米 ${riceGrams}g` : `🥩 ${meatMenuTitle} (約${meatGrams}g)`} の獲得ポイント (+{calculatedPoints}pt) を提出！
                </span>
              </>
            )}
          </button>
        </form>

      </div>

      <SuccessToast message={successMsg} />
    </div>
  );
};
