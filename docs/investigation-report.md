# 調査報告レポート: ダッシュボード活動成果の可視化（獲得内訳円グラフ・種目別集計・ご褒美獲得・失効履歴）

- 作成日時: 2026-11-18 15:30
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 7038506
- トラック: ミドル

## 1. 結論サマリー
- 依頼内容: ホーム画面のダッシュボード「主な活動成果」を、直近ログの羅列から「自分の行動を客観視し次のアクションにつながる可視化（獲得ポイント内訳円グラフ・種目別累計回数・交換獲得履歴・失効日時と理由）」へ刷新する。
- 【実測】現状構造（1 行断定）: `Dashboard.tsx:L175` は直近 500 件までしか読み込まない `actionLogs` の先頭 5 件を表示しているのみで、全期間の種目別集計・円グラフ・ご褒美獲得履歴・失効履歴の可視化が存在しない [EV-1] [EV-3]。
- 【実測】修正すべき箇所: `src/backend/index.ts:L540-644`（`GET /api/users/:id/summary`）、`src/frontend/types.ts:L160-189`、`src/frontend/components/ActivityInsightsCard.tsx`（新規）、`src/frontend/components/Dashboard.tsx:L147-203`
- トラック: ミドル（既存テーブルの集計クエリ追加＋UI コンポーネント刷新 / §2-6）

## 1-1. 確定済みの前提（下流は再実測しない / §2-5）
| 事実 | 根拠 | 重い実測か |
| :--- | :--- | :--- |
| `App.tsx:L174` は `/api/action-logs?limit=500` のみ取得しており、全期間集計はバックエンド SQL が必須 | [EV-1] | - |
| `action_logs` には `quiz`(3,834), `training`(355), `housework`(37) 等が蓄積され、失効ログは `earned_points < 0` で記録されている | [EV-2], [EV-4] | はい |
| `wish_items` に承認済みご褒美（`is_approved = 1`, `approved_points`, `approved_at`）が記録されている | [EV-5] | はい |

## 2. 実測エビデンス
### [EV-1] フロントエンドの `/api/action-logs` 取得上限
$ grep -rn "/api/action-logs" src/
src/frontend/App.tsx:174:        fetch('/api/action-logs?limit=500')
…(中略: 計 14 件)
- 【実測】フロント保持ログは直近 500 件上限のため、全期間の種目別・カテゴリ別集計はバックエンドで行う必要がある [EV-1]。

### [EV-2] remote D1 `action_logs` カテゴリ分布
$ npx wrangler d1 execute quest-db --remote --command "SELECT category, COUNT(*) as cnt FROM action_logs WHERE status = 'approved' GROUP BY category;"
│ bonus             │ 217  │
│ housework         │ 37   │
│ input_manga       │ 47   │
│ input_movie       │ 50   │
│ quiz              │ 3834 │
│ training          │ 355  │
…(中略: 計 11 カテゴリ)
- 【実測】全カテゴリで 4,600 件超の承認済み実績が蓄積されている [EV-2]。

### [EV-3] `Dashboard.tsx` 現在の主な活動成果表示
$ sed -n '174,176p' src/frontend/components/Dashboard.tsx
```tsx
          <div className="space-y-3">
            {userMajorLogs.slice(0, 5).map((log) => (
```
- 【実測】`userMajorLogs`（クイズ除外）の先頭 5 件を羅列するのみである [EV-3]。

### [EV-4] remote D1 失効ログの実態
$ npx wrangler d1 execute quest-db --remote --command "SELECT category, title_or_menu, earned_points, created_at FROM action_logs WHERE earned_points < 0 ORDER BY created_at DESC LIMIT 5;"
│ parent_adjustment │ ⚠️ 3日連続未活動によるポイント失効 (-2689pt)  │ -2689 │ 2026-11-05 22:27:41 │
│ parent_adjustment │ ⚠️ 3日連続未活動によるポイント失効 (-11421pt) │ -11421│ 2026-10-10 21:46:43 │
│ parent_adjustment │ ⚠️ 10日連続未活動による全ポイント失効 (-6pt)  │ -6    │ 2026-09-27 22:17:51 │
- 【実測】失効イベントは `action_logs` に `earned_points < 0` かつ `created_at` 付きで保存されている [EV-4]。

### [EV-5] remote D1 交換獲得済みご褒美の実態
$ npx wrangler d1 execute quest-db --remote --command "SELECT title, required_points, approved_points, is_approved, is_claimed, approved_at FROM wish_items WHERE is_approved = 1 OR is_claimed = 1 ORDER BY approved_at DESC LIMIT 5;"
│ 課金                  │ 3300 │ 3300 │ 1 │ 1 │ 2026-10-30 10:30:03 │
│ お土産代              │ 2600 │ 2600 │ 1 │ 1 │ 2026-10-24 10:44:52 │
- 【実測】利用して獲得した商品は `wish_items` の `is_approved = 1` レコードから抽出可能である [EV-5]。

### [EV-6] ビルド・型チェック実測
$ npx tsc --noEmit && npm run build
✓ 1609 modules transformed.
✓ built in 1.46s
- 【実測】現行の型チェックおよびビルドはエラー 0 である [EV-6]。

## 3. 該当コードの直接引用
`src/backend/index.ts:L624-640`
```ts
    return c.json({
      success: true,
      summary: {
        totalPoints: currentPoints,
        lifetimeEarnedPoints,
        spentPoints,
        todayEarnedPoints: todayResult?.total || 0,
        quizTotalCount: quizResult?.total || 0,
        todayCategories,
        inactiveDays,
        penaltyWarning: ...
      }
    });
```
- 【実測】`GET /api/users/:id/summary` は累計獲得・使用ポイントを返すが、カテゴリ内訳・種目別回数・交換リスト・失効リストを返していない（`src/backend/index.ts:L624-640`）。

## 4. 根本原因（なぜなぜ）
- Why1: ダッシュボードで「何にどれだけ頑張ったか」「何を獲得したか」「いつ失効したか」が見えない ← [EV-3]
- Why2: フロントが直近 500 件の明細しか持たず、`summary` API も数値合計しか返していない ← [EV-1], `src/backend/index.ts:L624-640`

## 5. 影響範囲（全数）
- 検索コマンド: `grep -rn "/api/action-logs" src/` → ヒット 14 件、および改修対象 4 ファイル:
| ファイル | 該当箇所 | 影響内容 |
| :--- | :--- | :--- |
| `src/backend/index.ts` | `L540-644` | `summary.insights`（カテゴリ内訳・種目ランキング・獲得ご褒美・失効履歴）追加 |
| `src/frontend/types.ts` | `L160-189` | `UserSummary` に `insights?: UserInsights` 追加 |
| `src/frontend/components/ActivityInsightsCard.tsx` | 新規 | SVG ドーナツ円グラフ・種目別回数・ご褒美＆失効履歴・直近ログ切替・次アクション誘導 UI |
| `src/frontend/components/Dashboard.tsx` | `L147-203` | `ActivityInsightsCard` への置換 |

## 6. 二次被害リスク候補（G-7）
| リスク経路 | 実測ヒット箇所 | 想定被害 |
| :--- | :--- | :--- |
| 他ユーザーの明細・失効・ご褒美情報の混入 | `src/backend/index.ts:L542` (`WHERE user_id = ?`) | 必ず `userId` で絞り込み、個人情報（メールアドレス等）や保護者の管理メモは返却しない。 |

## 7. 否定された仮説（E-5・必須）
| 立てた仮説 | 検証コマンド | 棄却の根拠 |
| :--- | :--- | :--- |
| フロント側の `actionLogs` 配列を集計すれば全期間の種目別回数が出せる | `grep -rn "/api/action-logs" src/` [EV-1] | `App.tsx:L174` が `limit=500` のため過去の運動・クイズデータが欠落する。 |

## 8. 未確認事項（E-4）
| 未確認項目 | 確認手段 | ブロッカー理由 |
| :--- | :--- | :--- |
| なし | - | - |

## 9. 推奨アクション（方向性のみ・実装しない）
1. `GET /api/users/:id/summary` に `insights`（`categoryBreakdown`, `topActivities`, `claimedWishes`, `penaltyHistory`）を追加する。
2. `ActivityInsightsCard.tsx` で、①獲得ポイント内訳ドーナツ円グラフ（SVG＋次アクション提案）、②種目別累計回数ランキング（運動/家事/インプット）、③獲得ご褒美＆ポイント失効履歴、④直近タイムラインをタブ切替で提供する。

## 10. 品質ゲート実行結果（G-11）
$ /Users/fukuikeitaro/antigravity-agents/scripts/verify.sh investigate
========================================================
 verify.sh  role=investigate  base=HEAD  repo=game
 HEAD=7038506  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
[PASS] gate-coverage      実測 6 件 / カテゴリ網羅 4/4
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）
