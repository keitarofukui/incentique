# 機能設計仕様書: ダッシュボード活動成果の可視化（獲得内訳円グラフ・種目別集計・ご褒美獲得・失効履歴）

- 作成日時: 2026-11-18 15:31
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 7038506
- 上流 Artifact: docs/investigation-report.md（対象コミット: 7038506）

## 0. 確定済みの前提（上流から引き継ぎ・再実測しない / §2-5）
| 事実 | 根拠 |
| :--- | :--- |
| `App.tsx:L174` は `/api/action-logs?limit=500` のため全期間集計はバックエンド SQL が必須 | [EV-1]（upstream: investigation-report.md） |
| 失効ログは `action_logs` に `earned_points < 0`（`%失効%`）で記録されている | [EV-4]（upstream: investigation-report.md） |
| ご褒美獲得履歴は `wish_items` に `is_approved = 1` で記録されている | [EV-5]（upstream: investigation-report.md） |

- トラック: ミドル（既存 API レスポンス拡張＋UI コンポーネント刷新 / §2-6）
- トラック自己照合: §12 の変更対象パス = `src/backend/index.ts`, `src/frontend/types.ts`, `src/frontend/components/ActivityInsightsCard.tsx`, `src/frontend/components/Dashboard.tsx`

## 1. 概要・目的
ダッシュボードの「主な活動成果」を、単なる直近ログ羅列から**「自分がやってきたことの客観的可視化と次のアクションへの誘導」**へ刷新する。

## 2. 機能要件 / 非機能要件
1. **📊 獲得ポイント内訳（ドーナツ円グラフ）**: 全期間の承認済み獲得ポイントを 6 グループ（クイズ/勉強、運動、家事、インプット、食事、ボーナス）で集計し SVG ドーナツグラフと割合を表示。最も割合が低いカテゴリ等から次のアクションへ誘導する。
2. **🏅 種目・活動別累計回数**: 運動・家事・インプット・食事ごとに「何を何回やったか（回数・獲得 pt）」を多い順に表示する。
3. **🎁 獲得したご褒美履歴**: `wish_items` から承認済みの交換履歴（タイトル・消費 pt・日時）を表示する。
4. **⚠️ ポイント失効履歴**: `action_logs` から失効イベント（日時・理由・失効 pt）を表示し、今後の失効防止アクションへ誘導する。
5. **🕒 直近タイムライン**: 従来の直近 5 件表示もタブ切替で維持する。

## 3. データフロー全経路
### [EV-1] `GET /api/users/:id/summary` 呼び出し箇所の確認
$ grep -rn "/summary" src/
src/frontend/App.tsx:143:      const res = await fetch(`/api/users/${userId}/summary`);
src/backend/index.ts:540:app.get('/api/users/:id/summary', async (c) => {

### 変更後経路
1. `GET /api/users/:id/summary` (`src/backend/index.ts:L540-644`) 内で、以下の 4 クエリ（すべて `WHERE user_id = ?`・カラム列挙）を追加実行し、TS 型（camelCase）へ変換して `summary.insights` を返却する。
   - `categoryBreakdown`: `SELECT category, COUNT(*) as cnt, COALESCE(SUM(earned_points), 0) as pts FROM action_logs WHERE user_id = ? AND status = 'approved' AND earned_points > 0 GROUP BY category` ➔ 6 グループ（`quiz`: `quiz`/`study`, `training`: `training`, `housework`: `housework`, `input`: `input_book`/`input_manga`/`input_movie`/`input_drama`, `meal`: `eat_rice`/`eat_meat`, `bonus`: `bonus`/`parent_adjustment`）へ合算。`points > 0` の項目を `points DESC` で返却（0pt グループは除外し、フロント側で全 6 グループとの差分を見て未実施・最小割合のアクションを提案）。
   - `topActivities`: `SELECT category, title_or_menu, COUNT(*) as cnt, COALESCE(SUM(earned_points), 0) as pts FROM action_logs WHERE user_id = ? AND status = 'approved' AND earned_points > 0 AND category IN ('training', 'housework', 'input_book', 'input_manga', 'input_movie', 'input_drama', 'eat_rice', 'eat_meat') GROUP BY category, title_or_menu ORDER BY cnt DESC LIMIT 30` ➔ `{ category, title: r.title_or_menu, count: Number(r.cnt), points: Number(r.pts) }`
   - `claimedWishes`: `SELECT id, title, required_points, approved_points, item_type, COALESCE(approved_at, created_at) as approved_at FROM wish_items WHERE user_id = ? AND is_approved = 1 ORDER BY COALESCE(approved_at, created_at) DESC LIMIT 20` ➔ `{ id, title, points: Number(r.approved_points ?? r.required_points) || 0, itemType: r.item_type || 'goods', approvedAt: r.approved_at }`
   - `penaltyHistory`: `SELECT id, title_or_menu, review_text, earned_points, created_at FROM action_logs WHERE user_id = ? AND earned_points < 0 AND (title_or_menu LIKE '%失効%' OR review_text LIKE '%失効%') ORDER BY created_at DESC LIMIT 20` ➔ `{ id, title: r.title_or_menu, reason: r.review_text || '', points: Number(r.earned_points) || 0, createdAt: r.created_at }`
2. `Dashboard.tsx` が `userSummary?.insights` を `ActivityInsightsCard` へ渡し、4 タブで可視化する。

## 4. 🛡️ 機密フィールド台帳と漏洩遮断設計（G-7）
| フィールド | 機密度 | 既存の露出経路（実測） | 遮断策（具体実装） |
| :--- | :--- | :--- | :--- |
| `insights.*` | 低（本人の活動実績のみ） | `GET /api/users/:id/summary` (`src/backend/index.ts:L540`) | 全クエリで `WHERE user_id = ?` を強制し、`SELECT *` を禁止（必要カラムのみ列挙）。保護者メモ（`parent_comment`）やメールは含めない。 |

## 5. 🗄️ DB マイグレーション DDL（G-4）
新規マイグレーションなし（既存の `action_logs` と `wish_items` テーブルを参照）。

## 6. API 契約（`/api/users/:id/summary` レスポンス拡張）
| メソッド & パス | リクエスト | 成功レスポンス (200) | エラーレスポンス |
| :--- | :--- | :--- | :--- |
| `GET /api/users/:id/summary` | パスパラメータ `id` | `{ success: true, summary: UserSummary }`（`insights` フィールドを追加） | `404 User not found` / `500 { success: false, error }` |

### TypeScript `interface` 全文（`src/frontend/types.ts`）
```ts
export interface InsightCategoryItem {
  group: 'quiz' | 'training' | 'housework' | 'input' | 'meal' | 'bonus';
  label: string;
  points: number;
  count: number;
}

export interface InsightActivityItem {
  category: string;
  title: string;
  count: number;
  points: number;
}

export interface InsightClaimedWish {
  id: string;
  title: string;
  points: number;
  itemType: string;
  approvedAt: string;
}

export interface InsightPenaltyItem {
  id: string;
  title: string;
  reason: string;
  points: number;
  createdAt: string;
}

export interface UserInsights {
  categoryBreakdown: InsightCategoryItem[];
  topActivities: InsightActivityItem[];
  claimedWishes: InsightClaimedWish[];
  penaltyHistory: InsightPenaltyItem[];
}
```
`UserSummary` に `insights?: UserInsights;` を追加する。

## 7. 🙈 エラーハンドリング仕様（G-5・5 状態の表）
| 状態 | `GET /api/users/:id/summary` (`App.tsx:L141-153` `fetchUserSummary`) |
| :--- | :--- |
| **成功 (200)** | `userSummary.insights` をセットし、円グラフ・種目別・ご褒美/失効を描画 |
| **4xx / 5xx** | `if (!res.ok)` の `else` 分岐で `console.error('[USER_SUMMARY] failed', res.status, await res.text())` を記録し、`userSummary` は上書きせず空状態ガイドを表示（成功扱いしない） |
| **ネットワーク断 / タイムアウト** | `catch` で `console.error('[USER_SUMMARY] network error', err)` を記録し、空状態ガイドを表示 |

## 8. 🏛️ アーキテクチャ選定と却下案（G-8）
- **円グラフ描画**: 自前の **軽量 SVG ドーナツチャート**（`stroke-dasharray` / `stroke-dashoffset`）を採用。理由: バンドルサイズ増大（既に 511KB）を防ぎ、テーマカラーと完全一致させるため。却下案: 重厚な外部チャートライブラリ追加（不要なバンドル肥大化）。
- **全期間集計の配置**: バックエンド `GET /api/users/:id/summary` に統合。理由: 1 回の既存通信で完結し、フロント側の `limit=500` 欠落を防げるため。

## 9. 🧪 受け入れ基準（検証コマンド付き）
1. `curl -i -s "https://quest-habit-app.keitaro-fukui.workers.dev/api/users/<id>/summary"` が HTTP 200 を返し、`summary.insights.categoryBreakdown`, `topActivities`, `claimedWishes`, `penaltyHistory` がすべて配列で返ること。
2. `npx tsc --noEmit && npm run build` が 0 error で通ること。

## 10. 📋 前提条件・ブロッカー
なし。

## 11. UI / コンポーネント設計
- **重複点検**: `PersonalStreakCard` は「今日の達成・連続日数」、`DailyChart` は「日別推移」を担当しており、全期間の「獲得内訳円グラフ」「種目別累計回数」「交換ご褒美」「失効履歴」は新規領域。
- `ActivityInsightsCard.tsx`:
  - ヘッダー: 既存の `Dashboard.tsx:L155-166` の「🧠 クイズ累積正解: N問」バッジと「全ログ・絞り込み表示 →」リンクを引き継ぐ。
  - 4 タブ: `📊 獲得内訳` / `🏅 種目別` / `🎁 ご褒美・失効` / `🕒 直近ログ`
  - 配色: `quiz` (`#22d3ee` cyan), `training` (`#f97316` orange), `housework` (`#10b981` emerald), `input` (`#a855f7` purple), `meal` (`#eab308` yellow), `bonus` (`#ec4899` pink)
  - 次アクション誘導ボタン: `onNavigate('quiz' | 'training' | 'housework' | 'input_book' | 'eat_rice' | 'wishlist' | 'action-logs')` を接続（`App.tsx:L475-515` のタブ名に完全一致）。

## 12. 実装タスクチェックリスト（依存順・1 タスク 1 コミット・完了条件付き）
- [x] T1: `src/frontend/types.ts`, `src/backend/index.ts`（`GET /api/users/:id/summary` の `insights` 集計追加）実装 / 完了条件: `npx tsc --noEmit` 0 error
  → 実装: `src/frontend/types.ts:L160-215`, `src/backend/index.ts:L624-715` 実装完了。`tsc 0 error`。
- [ ] T2: `src/frontend/App.tsx`（`fetchUserSummary` の `else` エラーログ追加）, `src/frontend/components/ActivityInsightsCard.tsx`, `src/frontend/components/Dashboard.tsx` 実装 / 完了条件: `npx tsc --noEmit && npm run build` 0 error

## 13. 未確認事項（E-4）
なし。

## 14. 品質ゲート実行結果（G-11）
$ /Users/fukuikeitaro/antigravity-agents/scripts/verify.sh design
========================================================
 verify.sh  role=design  base=HEAD  repo=game
 HEAD=7038506  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）

## 15. 改訂履歴（差分改訂 / §2-5）
| 版 | 指摘 # | 変更したセクション | 1 行要約 |
| :--- | :--- | :--- | :--- |
| 1.0 | - | 初版作成 | 初版作成 |
| 1.1 | DR-1〜6 | §3, §7, §11, §12 | `App.tsx:L143` 訂正・`else`エラーログ追加、SQL→camelCase変換仕様、6グループマッピング、`input_book`/`eat_rice`遷移名修正 |
