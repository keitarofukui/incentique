import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface SuccessToastProps {
  message: string;
}

/**
 * Floating toast pinned to the bottom of the viewport.
 * The submit buttons sit at the bottom of these long forms, so an in-card
 * banner scrolls out of sight — this stays visible wherever the user is.
 * Fully click-through (pointer-events-none) so it can never block the submit
 * button underneath it while it is fading out.
 */
export const SuccessToast: React.FC<SuccessToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[45] flex justify-center px-4 pb-5 pointer-events-none">
      <div className="toast-enter w-full max-w-md rounded-2xl border border-emerald-400/60 bg-emerald-950/95 px-4 py-3.5 shadow-2xl shadow-emerald-500/30 backdrop-blur-md flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold leading-snug text-emerald-200 break-words">{message}</p>
          <p className="mt-1 text-[10px] font-bold text-emerald-400/80">
            画面をリセットしました。そのまま次の記録を入力できます！
          </p>
        </div>
      </div>
    </div>
  );
};
