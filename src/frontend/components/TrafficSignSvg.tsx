import React from 'react';

interface TrafficSignSvgProps {
  imageKey: string;
}

const HAZARD_SCENES: Record<string, { title: string; sub: string; bg: string; badge: string }> = {
  hazard_residential_ball: { title: '住宅街・駐車車両の陰', sub: 'ボールの飛び出し＋歩行者', bg: '#1e293b', badge: '🏘️ 昼間・見通し悪' },
  hazard_intersection_bike: { title: '交差点 右折待ち', sub: '対向大型車の陰＋横断歩道', bg: '#1e293b', badge: '🚦 青信号・右折' },
  hazard_night_rain: { title: '夜間・雨天の交差点', sub: '対向車ライト＋暗い服の歩行者', bg: '#0f172a', badge: '🌧️ 夜間・雨天' },
  hazard_highway_merge: { title: '高速道路 合流部', sub: '加速車線の車＋前方の減速', bg: '#1e293b', badge: '🛣️ 高速・80km/h' },
  hazard_school_bus: { title: '停車中の通学バス側方', sub: 'バス前後の陰からの横断', bg: '#1e293b', badge: '🚌 バス停付近' },
  hazard_bicycle_overtake: { title: '生活道路(30km/h) 自転車追越し', sub: '自転車のふらつき＋対向車', bg: '#1e293b', badge: '🚲 側方間隔注意' },
};

const WARN_SYMBOLS: Record<string, string> = {
  sign_warn_cross: '✚',
  sign_warn_t: '┳',
  sign_warn_rail: '🚂',
  sign_warn_school: '🚸',
  sign_warn_slippery: '〰️',
};

/** 道路標識・危険予測イラストを軽量 SVG で描画する */
export const TrafficSignSvg: React.FC<TrafficSignSvgProps> = ({ imageKey }) => {
  const renderSign = () => {
    if (imageKey === 'sign_stop') {
      return (
        <svg viewBox="0 0 120 110" className="w-24 h-24" aria-label="一時停止標識">
          <polygon points="10,12 110,12 60,98" fill="#dc2626" stroke="#ffffff" strokeWidth="4" strokeLinejoin="round" />
          <text x="60" y="42" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="bold">止まれ</text>
          <text x="60" y="60" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">STOP</text>
        </svg>
      );
    }
    if (imageKey === 'sign_slow') {
      return (
        <svg viewBox="0 0 120 110" className="w-24 h-24" aria-label="徐行標識">
          <polygon points="10,12 110,12 60,98" fill="#ffffff" stroke="#dc2626" strokeWidth="8" strokeLinejoin="round" />
          <text x="60" y="44" textAnchor="middle" fill="#1d4ed8" fontSize="16" fontWeight="bold">徐行</text>
        </svg>
      );
    }
    if (imageKey === 'sign_no_entry') {
      return (
        <svg viewBox="0 0 100 100" className="w-24 h-24" aria-label="車両進入禁止標識">
          <circle cx="50" cy="50" r="44" fill="#dc2626" stroke="#ffffff" strokeWidth="3" />
          <rect x="18" y="41" width="64" height="18" rx="2" fill="#ffffff" />
        </svg>
      );
    }
    if (imageKey === 'sign_no_thoroughfare' || imageKey === 'sign_no_cars') {
      return (
        <svg viewBox="0 0 100 100" className="w-24 h-24" aria-label={imageKey === 'sign_no_cars' ? '車両通行止め標識' : '通行止め標識'}>
          <circle cx="50" cy="50" r="42" fill="#ffffff" stroke="#dc2626" strokeWidth="10" />
          <line x1="22" y1="22" x2="78" y2="78" stroke="#dc2626" strokeWidth="10" />
          {imageKey === 'sign_no_thoroughfare' && <line x1="78" y1="22" x2="22" y2="78" stroke="#dc2626" strokeWidth="10" />}
        </svg>
      );
    }
    if (imageKey === 'sign_no_parking' || imageKey === 'sign_no_park_only') {
      return (
        <svg viewBox="0 0 100 100" className="w-24 h-24" aria-label={imageKey === 'sign_no_parking' ? '駐停車禁止標識' : '駐車禁止標識'}>
          <circle cx="50" cy="50" r="42" fill="#1d4ed8" stroke="#dc2626" strokeWidth="10" />
          <line x1="23" y1="23" x2="77" y2="77" stroke="#dc2626" strokeWidth="9" />
          {imageKey === 'sign_no_parking' && <line x1="77" y1="23" x2="23" y2="77" stroke="#dc2626" strokeWidth="9" />}
        </svg>
      );
    }
    if (imageKey.startsWith('sign_speed_')) {
      const num = imageKey.split('_')[2];
      return (
        <svg viewBox="0 0 100 100" className="w-24 h-24" aria-label={`最高速度${num}キロ標識`}>
          <circle cx="50" cy="50" r="42" fill="#ffffff" stroke="#dc2626" strokeWidth="10" />
          <text x="50" y="62" textAnchor="middle" fill="#1d4ed8" fontSize="34" fontWeight="900">{num}</text>
        </svg>
      );
    }
    if (imageKey === 'sign_one_way' || imageKey === 'sign_designated_dir') {
      return (
        <svg viewBox="0 0 100 100" className="w-24 h-24" aria-label={imageKey === 'sign_one_way' ? '一方通行標識' : '指定方向外進行禁止標識'}>
          {imageKey === 'sign_one_way' ? (
            <rect x="12" y="12" width="76" height="76" rx="6" fill="#1d4ed8" stroke="#ffffff" strokeWidth="3" />
          ) : (
            <circle cx="50" cy="50" r="44" fill="#1d4ed8" stroke="#ffffff" strokeWidth="3" />
          )}
          <polygon points="50,20 70,46 57,46 57,80 43,80 43,46 30,46" fill="#ffffff" />
        </svg>
      );
    }
    if (imageKey === 'sign_crosswalk') {
      return (
        <svg viewBox="0 0 100 100" className="w-24 h-24" aria-label="横断歩道標識">
          <polygon points="50,8 90,38 90,90 10,90 10,38" fill="#1d4ed8" stroke="#ffffff" strokeWidth="3" />
          <polygon points="50,20 78,42 78,80 22,80 22,42" fill="#ffffff" />
          <circle cx="50" cy="40" r="6" fill="#1d4ed8" />
          <path d="M50,47 L50,63 M50,51 L38,59 M50,51 L62,59 M50,63 L40,76 M50,63 L60,76" stroke="#1d4ed8" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    }
    if (imageKey === 'sign_priority') {
      return (
        <svg viewBox="0 0 100 100" className="w-24 h-24" aria-label="優先道路標識">
          <polygon points="50,6 94,50 50,94 6,50" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
          <polygon points="50,20 80,50 50,80 20,50" fill="#facc15" stroke="#1e293b" strokeWidth="2" />
        </svg>
      );
    }
    if (WARN_SYMBOLS[imageKey]) {
      return (
        <svg viewBox="0 0 100 100" className="w-24 h-24" aria-label="警戒標識">
          <polygon points="50,6 94,50 50,94 6,50" fill="#facc15" stroke="#111827" strokeWidth="4" strokeLinejoin="round" />
          <text x="50" y="60" textAnchor="middle" fill="#111827" fontSize="28" fontWeight="bold">{WARN_SYMBOLS[imageKey]}</text>
        </svg>
      );
    }
    const info = HAZARD_SCENES[imageKey];
    if (info) {
      return (
        <svg viewBox="0 0 320 130" className="w-full max-w-sm h-32 rounded-xl border border-slate-700" aria-label={info.title}>
          <rect width="320" height="130" fill={info.bg} />
          <rect x="0" y="75" width="320" height="55" fill="#334155" />
          <line x1="0" y1="102" x2="320" y2="102" stroke="#94a3b8" strokeWidth="2" strokeDasharray="10 8" />
          <rect x="12" y="10" width="130" height="22" rx="6" fill="#0ea5e9" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="1" />
          <text x="77" y="25" textAnchor="middle" fill="#7dd3fc" fontSize="11" fontWeight="bold">{info.badge}</text>
          <rect x="30" y="80" width="60" height="28" rx="6" fill="#22d3ee" />
          <text x="60" y="98" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="bold">自車</text>
          <rect x="185" y="55" width="95" height="32" rx="6" fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="1.5" />
          <text x="232" y="75" textAnchor="middle" fill="#fcd34d" fontSize="11" fontWeight="bold">⚠️ 危険ポイント</text>
          <text x="160" y="48" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="bold">{info.title}</text>
          <text x="160" y="122" textAnchor="middle" fill="#cbd5e1" fontSize="10">{info.sub}</text>
        </svg>
      );
    }
    return null;
  };

  const content = renderSign();
  if (!content) return null;
  return (
    <div className="flex justify-center items-center py-3 px-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
      {content}
    </div>
  );
};
