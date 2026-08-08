# 機能設計仕様書: ユーザー連続日数カラムの API SELECT クエリ追加 & データ疎通修正

## 1. 概要・目的
バックエンド API (`GET /api/users`, `GET /api/rivals`) の SQL SELECT クエリで `current_streak_days` 等の連続日数カラムが選択対象から漏れていたため、「りょうたろう」をはじめとする全ユーザーの連続日数が画面上で `0日` と表示されてしまう不具合を修正する。

---

## 2. 変更仕様 (`src/backend/index.ts`)

### バックエンド API エンドポイントの SQL クエリ修正
以下の 3 つのエンドポイントの SQL クエリを拡張し、DBに蓄積された連続日数・判定日付カラムを返却するように修正：

1. **`GET /api/users`**:
   ```sql
   SELECT id, name, grade_level, avatar, current_points,
          last_action_date, current_streak_days,
          last_50pt_date, current_50pt_streak_days,
          last_100pt_date, current_100pt_streak_days
   FROM users
   ORDER BY created_at ASC
   ```
2. **`GET /api/users/:id`**:
   ```sql
   SELECT id, name, grade_level, avatar, current_points,
          last_action_date, current_streak_days,
          last_50pt_date, current_50pt_streak_days,
          last_100pt_date, current_100pt_streak_days
   FROM users WHERE id = ?
   ```
3. **`GET /api/rivals`**:
   ```sql
   SELECT id, name, grade_level, avatar, current_points,
          last_action_date, current_streak_days,
          last_50pt_date, current_50pt_streak_days,
          last_100pt_date, current_100pt_streak_days
   FROM users
   ORDER BY current_points DESC
   ```

---

## 3. 実装タスクチェックリスト

- [x] **タスク1: `src/backend/index.ts` の `GET /api/users` 等のエンドポイント SQL クエリに連続日数カラムを追加**
- [x] **タスク2: フロントエンドでの連続日数疎通確認とビジュアルチェック**
- [x] **タスク3: ビルド・型チェック (`npm run typecheck && npm run build`) による動作検証**
