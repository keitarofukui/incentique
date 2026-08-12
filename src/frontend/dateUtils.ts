/**
 * Date helpers for action_logs.created_at.
 *
 * The backend writes created_at with SQLite datetime('now'), which is **UTC**
 * and has no timezone suffix ('2026-07-28 11:23:45'). Older rows may only have
 * a date part ('2026-07-28').
 *
 * `new Date('2026-07-28 11:23:45')` would parse that as *local* time, and
 * `new Date().toISOString().slice(0, 10)` returns the *UTC* date — mixing the
 * two makes "today" start at 09:00 JST instead of midnight. Always go through
 * these helpers so a log is bucketed into the day the user actually lived it.
 */

/** Parse a SQLite UTC timestamp into a Date, or null when unparseable. */
export const parseLogDate = (raw?: string): Date | null => {
  if (!raw) return null;

  let parseable = raw;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(raw)) {
    parseable = raw.slice(0, 19).replace(' ', 'T') + 'Z';
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    // Date-only rows have no time to convert; treat as local midnight so they
    // stay on their own day instead of shifting to the previous one.
    parseable = raw + 'T00:00:00';
  }

  const d = new Date(parseable);
  return isNaN(d.getTime()) ? null : d;
};

/** 'YYYY-MM-DD' in the viewer's timezone (JST for this family). */
export const toLocalDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** 'YYYY-MM' in the viewer's timezone. */
export const toLocalMonthStr = (d: Date): string => toLocalDateStr(d).slice(0, 7);

/** Local date of a log ('YYYY-MM-DD'), or '' when it has no usable date. */
export const logLocalDateStr = (raw?: string): string => {
  const d = parseLogDate(raw);
  return d ? toLocalDateStr(d) : '';
};

/** Today in the viewer's timezone ('YYYY-MM-DD'). */
export const todayLocalDateStr = (): string => toLocalDateStr(new Date());

/** This month in the viewer's timezone ('YYYY-MM'). */
export const currentLocalMonthStr = (): string => toLocalMonthStr(new Date());

/**
 * Log timestamp for display: 'M/D HH:MM' (or 'M/D' for date-only rows).
 * Pass withYear for the archive view.
 */
export const formatLogDateTime = (raw?: string, withYear = false): string => {
  const d = parseLogDate(raw);
  if (!d) return raw || '';

  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const datePart = withYear ? `${d.getFullYear()}/${m}/${day}` : `${m}/${day}`;

  if (!raw || !raw.includes(':')) return datePart;

  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${datePart} ${h}:${min}`;
};

/** Relative time label ('3分前' / '昨日' / '2日前'). */
export const formatRelativeTime = (raw?: string): string => {
  const d = parseLogDate(raw);
  if (!d) return '直近';

  const diffMinutes = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMinutes < 1) return 'たった今';
  if (diffMinutes < 60) return `${diffMinutes}分前`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffHours < 48) return '昨日';
  return `${Math.floor(diffHours / 24)}日前`;
};

/**
 * 「朝4時区切り」の論理日付。バックエンドの getLogicalDate() と同じ境界。
 * 連続記録とボリュームボーナスはこの単位で判定されるので、それらを表示する画面は
 * カレンダー日ではなくこちらを使う（深夜0〜4時に数字が食い違わないように）。
 */
export const toLogicalDateStr = (d: Date): string =>
  toLocalDateStr(new Date(d.getTime() - 4 * 60 * 60 * 1000));

/** ログの論理日付（'YYYY-MM-DD'）。日付が読めなければ ''。 */
export const logLogicalDateStr = (raw?: string): string => {
  const d = parseLogDate(raw);
  return d ? toLogicalDateStr(d) : '';
};

/** 今日の論理日付（朝4時区切り） */
export const todayLogicalDateStr = (): string => toLogicalDateStr(new Date());

/**
 * 指定された論理日付文字列（YYYY-MM-DD）と今日の論理日付との日数差を返す。
 * 未設定またはフォーマット不正の場合は Infinity を返す。
 */
export const getLogicalDaysDiff = (dateStr?: string): number => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return Infinity;
  const todayStr = todayLogicalDateStr();
  const tToday = new Date(todayStr).getTime();
  const tTarget = new Date(dateStr).getTime();
  if (isNaN(tToday) || isNaN(tTarget)) return Infinity;
  const diffTime = tToday - tTarget;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

