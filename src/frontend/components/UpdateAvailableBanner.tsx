import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * デプロイしたのに端末に反映されない問題への対処。
 *
 * これはSPAなので、一度読み込んだページはタブを開いたままだと永久に古いJSで
 * 動き続ける（画面遷移では index.html を取り直さない）。Service Worker は
 * 使っていないため、更新に気づく手段が「ユーザーが自分でリロードする」しか
 * 無かった。
 *
 * そこで index.html を取り直してアセット名（ビルドごとにハッシュが変わる）を
 * 今読み込んでいるものと比べ、違っていれば更新バナーを出す。
 * スマホでは「アプリに戻ってきた瞬間」が一番自然な確認タイミングなので、
 * visibilitychange を主なきっかけにしている。
 */

const MIN_CHECK_INTERVAL_MS = 60_000;

/** 今このページが読み込んでいるエントリJSのファイル名 */
const currentAssetName = (): string | null => {
  const el = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]');
  if (!el) return null;
  return el.src.split('/').pop() || null;
};

export const UpdateAvailableBanner: React.FC = () => {
  const [updateReady, setUpdateReady] = useState(false);
  const lastCheckedRef = useRef<number>(0);
  const currentRef = useRef<string | null>(null);

  if (currentRef.current === null) {
    currentRef.current = currentAssetName();
  }

  const check = useCallback(async () => {
    const current = currentRef.current;
    if (!current || updateReady) return;

    const now = Date.now();
    if (now - lastCheckedRef.current < MIN_CHECK_INTERVAL_MS) return;
    lastCheckedRef.current = now;

    try {
      // キャッシュを介さずに index.html だけ取り直す（軽量）
      const res = await fetch(`/?_v=${now}`, { cache: 'no-store' });
      if (!res.ok) return;
      const html = await res.text();
      const match = html.match(/assets\/(index-[A-Za-z0-9_-]+\.js)/);
      if (match && match[1] !== current) {
        setUpdateReady(true);
      }
    } catch (_) {
      // オフライン等は黙って諦める。次の復帰時にまた見る
    }
  }, [updateReady]);

  useEffect(() => {
    check();

    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [check]);

  if (!updateReady) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-5 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-cyber-neonCyan/60 bg-slate-950/95 px-4 py-3 shadow-2xl shadow-cyan-500/20 backdrop-blur-md flex items-center gap-3">
        <RefreshCw className="w-5 h-5 shrink-0 text-cyber-neonCyan" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-white">新しいバージョンがあります</p>
          <p className="text-[10px] text-slate-400">タップすると最新の画面に更新されます</p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="shrink-0 rounded-xl bg-cyber-neonCyan px-4 py-2 text-xs font-black text-slate-950 transition-all hover:brightness-110"
        >
          更新する
        </button>
      </div>
    </div>
  );
};
