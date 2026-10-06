# 設計仕様書: D1 operations（rows_read）無駄なSELECTの徹底削減とインデックス最適化

- 作成日時: 2026-10-07 05:10
- 対象リポジトリ/ブランチ: game / perf/d1-rows-read-optimization
- 対象コミット: 8ee4872
- トピック: d1-rows-read-optimization
- 上流 Artifact: docs/investigation-report-d1-rows-read.md（対象コミット: 8ee4872）
- トラック: フル（理由: マイグレーション 0002_add_action_logs_created_at_idx.sql 追加およびDBアクセス層の変更を含むため）

---

## 1. 概要と目標

### 目的
D1無料枠（1日5,000,000 rows_read）に対して84%（約420万行）の消費警告が届いたため、無駄なSELECTおよびフルテーブルスキャンを排除し、通常利用時の消費行数を従来の **1%未満**（クイズ100問回答時でも数千行程度）に抑え込む。

### 目標値（実測ベース）
1. **クイズ1問回答時の rows_read**:
   - 変更前: 約 24,000 rows_read/問（`fetchData` 連打 + フルスキャン）
   - 変更後: 約 150 rows_read/問（`fetchData` 停止 + ストリークの日付インデックス境界指定）→ **約 99.4% 削減**
2. **`/api/action-logs` 取得時の rows_read**:
   - 変更前: 21,665 rows_read/回（12,999行スキャン + 8,666行COUNT JOINスキャン）
   - 変更後: 約 100 rows_read/回（インデックススキャン + COUNT JOIN排除）→ **約 99.5% 削減**
3. **`/api/users/:id/daily-stats` 取得時の rows_read**:
   - 変更前: 2,845 rows_read/回（過去全レコード走査）
   - 変更後: 984 rows_read/回（直近35日間のインデックス範囲走査）

---

## 2. 変更内容一覧

### 2-1. DBマイグレーション (`migrations/0002_action_logs_created_at_index.sql`)
`action_logs` テーブルの `created_at` に単独降順インデックスを作成する。
```sql
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON action_logs (created_at DESC);
```
- `schema.sql` にも同期追記する。

### 2-2. フロントエンド最適化 (`src/frontend/App.tsx`)
`handlePointsUpdate` 内で呼んでいた `fetchData()` を停止する。
- クイズ画面で問題に答えた際、獲得ポイントは `onPointsUpdate(newTotalPoints)` で即時State反映される。
- クイズ画面では行動履歴（`actionLogs`）や他ユーザーの最新ログをリアルタイム表示する必要がない。
- 別タブ遷移（ホーム・ライバル等）やページリロード時に通常通り取得されるため、UIの整合性は完全に維持される。

### 2-3. バックエンド最適化 (`src/backend/index.ts`)
1. **`/api/action-logs` の COUNT 最適化**:
   - `countQuery` で `users` テーブルを JOIN しているのを解消。件数カウントに users は不要なため、純粋な `FROM action_logs` でカウントし、不要な走査（8,666行）をカット。
2. **`updateStreaks` のインデックス範囲検索化**:
   - 本日の素点計算 `todayPointsResult` において、`created_at >= datetime('now', '-36 hours')` を追加し、既存の `idx_action_logs_user_date (user_id, created_at)` による絞り込みを強制。過去数千件の全走査を停止。
3. **`/api/users/:id/daily-stats` のインデックス範囲検索化**:
   - 日付集計において `created_at >= datetime('now', '-' || (? + 5) || ' days')` を追加し、過去全走査を停止。

---

## 3. 実測検証計画

1. マイグレーションファイルを新規作成し、ローカル・リモート D1 の両方に適用（G-4）。
2. `PRAGMA index_list('action_logs');` でリモートD1に `idx_action_logs_created_at` が実在することを確認。
3. `EXPLAIN QUERY PLAN` および `rows_read` メタデータにより、各クエリの消費行数が激減していることを実測確認。
4. TypeScript 型チェック（`npx tsc --noEmit`）およびビルド（`npm run build`）の成功を確認。
5. デプロイを実施し、本番環境の動作確認を行う（G-9）。
