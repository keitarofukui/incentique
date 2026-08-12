# 設計仕様書: 連続記録（ストリーク）の失効判定・動的補正機能

## 1. 概要
ユーザーのアクティビティが途絶えた（前日以前に最後の記録があり、昨日も本日も未記録）場合に、ダッシュボード等の画面表示において過大に過去の連続記録日数（最大値・最終値）が表示される問題を解決するため、論理日付ベースの失効判定処理を追加する。

---

## 2. 修正方針・設計

### ① 日付ユーティリティの拡張 (`src/frontend/dateUtils.ts`)
対象日付文字列（`YYYY-MM-DD`）と今日の論理日付（`todayLogicalDateStr()`）との間の論理日数差を求める `getLogicalDaysDiff(dateStr?: string)` 関数を追加する。

```typescript
/**
 * 指定された日付文字列（YYYY-MM-DD）と今日の論理日付（朝4時区切り）との日数差を返す。
 * 未設定またはフォーマット不正の場合は Infinity を返す。
 */
export const getLogicalDaysDiff = (dateStr?: string): number => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return Infinity;
  const todayStr = todayLogicalDateStr();
  const tToday = new Date(todayStr).getTime();
  const tTarget = new Date(dateStr).getTime();
  const diffTime = tToday - tTarget;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};
```

### ② ダッシュボード（PersonalStreakCard.tsx）での動的補正
`currentUser` の各種最終活動日（`last_action_date`, `last_50pt_date`, `last_100pt_date`）と今日の論理日付との差分 `diff` を判定し、連動数値を補正する。

| ストリーク種別 | 判定対象カラム | 有効条件 | 無効（途切れ）時の補正値 |
| :--- | :--- | :--- | :--- |
| デイリーストリーク | `last_action_date` | `diff <= 1`（今日または昨日） | `0` 日 |
| 中級ストリーク | `last_50pt_date` | `diff <= 1`（今日または昨日） | `0` 日 |
| 神ストリーク | `last_100pt_date` | `diff <= 1`（今日または昨日） | `0` 日 |

#### 記録時予測数値の計算調整
- `doneToday`（今日記録済み）の場合: `streakIfRecorded = streakDaily`
- `!doneToday`（今日未記録）の場合:
  - 連続が継続中（`diff <= 1`）：`streakIfRecorded = streakDaily + 1`
  - 連続が途切れている（`diff > 1`）：`streakIfRecorded = 1`

---

## 3. タスク分解チェックリスト (製造・テスト用)

- [x] **Task 1: `src/frontend/dateUtils.ts` に `getLogicalDaysDiff` を実装**
  - 単体テスト/動作確認ができるように関数をエクスポート。
- [x] **Task 2: `src/frontend/components/PersonalStreakCard.tsx` の表示ロジック修正**
  - `getLogicalDaysDiff` を用いて `streakDaily`, `streakMid`, `streakGod` の失効判定（`diff > 1` で `0` 日）を適用。
  - 「記録すれば N日連続」および「しなければ 0日に戻る」のメッセージ表示条件を更新。
- [x] **Task 3: ビルド確認 & 影響確認**
  - `npm run build` でTypeScript/Viteビルドエラーが0件であることを確認。
- [x] **Task 4: テスト & レビュー**
  - コードレビューおよび動作検証を実施。



